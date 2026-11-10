import fs from 'node:fs';
import path from 'node:path';
import type { StreamStatus } from '../src/types/catalog';
import { loadApproved } from './lib/catalog-build';
import { probeUrl, validateManifest } from './lib/http';
import {
  isTransientFailure,
  readStatusFile,
  reconcileWithPrevious,
  type SourceStatusRecord,
  type StreamStatusFile,
} from './lib/status';

interface CheckResult {
  record: SourceStatusRecord;
  detail: string;
}

const root = process.cwd();
const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, '').split('=');
      return [key ?? '', rest.join('=')];
    }),
);

const concurrency = Math.max(1, Math.min(24, Number(args.get('concurrency') ?? 6) || 6));
const only = args.get('only')?.trim() || null;
const dryRun = args.has('dry-run');

function httpStatusToStatus(httpStatus: number | null): StreamStatus {
  if (httpStatus === 401) return 'auth-required';
  if (httpStatus === 451) return 'geo-restricted';
  if (httpStatus === 403) return 'playback-restricted';
  if (httpStatus === 404 || httpStatus === 410) return 'removed';
  return 'temporarily-unavailable';
}

function extractChannelId(url: string): string | null {
  const match = url.match(/youtube\.com\/channel\/(UC[\w-]{20,})/i);
  return match?.[1] ?? null;
}

function extractVideoId(url: string, body: string): string | null {
  const fromUrl = url.match(/[?&]v=([\w-]{11})/)?.[1];
  if (fromUrl) return fromUrl;
  const fromBody = body.match(/"videoId":"([\w-]{11})"/)?.[1];
  return fromBody ?? null;
}

async function checkYouTube(
  channelId: string,
  channelName: string,
  sourceId: string,
  channelKey: string,
): Promise<CheckResult> {
  const checkedAt = new Date().toISOString();
  const url = `https://www.youtube.com/channel/${channelId}/live`;
  const probe = await probeUrl(url, {
    timeoutMs: 20_000,
    maxBytes: 3_000_000,
    headers: { 'accept-language': 'en-US,en;q=0.9' },
  });
  const videoId = extractVideoId(probe.finalUrl, probe.body);
  const isLive =
    Boolean(videoId) &&
    /"isLiveNow":true/.test(probe.body) &&
    /"isLiveContent":true/.test(probe.body);

  let status: StreamStatus = 'unknown';
  let error: string | null = null;
  if (!probe.ok) {
    status = httpStatusToStatus(probe.status);
    error = probe.error ?? `HTTP ${probe.status}`;
  } else if (isLive) {
    status = 'verified';
  } else {
    error = 'No live stream was detected at check time. The broadcaster may be offline or between broadcasts.';
  }

  const detail = isLive
    ? `${channelName}: YouTube live ${videoId}`
    : `${channelName}: YouTube live not detected (${probe.status ?? 'network'})`;
  return {
    record: {
      channelId: channelKey,
      sourceId,
      status,
      httpStatus: probe.status,
      cors: null,
      error,
      checkedAt,
      finalUrl: probe.finalUrl,
    },
    detail,
  };
}

async function checkSource(
  channelKey: string,
  channelName: string,
  source: { id: string; type: string; url: string },
): Promise<CheckResult> {
  const checkedAt = new Date().toISOString();
  const channelId = extractChannelId(source.url);

  if (source.type === 'youtube' && channelId) {
    return checkYouTube(channelId, channelName, source.id, channelKey);
  }
  if (source.type === 'provider' && channelId) {
    return checkYouTube(channelId, channelName, source.id, channelKey);
  }
  if (source.type === 'provider') {
    const probe = await probeUrl(source.url, { timeoutMs: 15_000, maxBytes: 96_000 });
    const status: StreamStatus = probe.ok ? 'unknown' : httpStatusToStatus(probe.status);
    return {
      record: {
        channelId: channelKey,
        sourceId: source.id,
        status,
        httpStatus: probe.status,
        cors: probe.cors,
        error: probe.ok ? 'Playback happens on the provider site.' : probe.error ?? `HTTP ${probe.status}`,
        checkedAt,
        finalUrl: probe.finalUrl,
      },
      detail: `${channelName}: provider ${probe.status ?? 'network'}`,
    };
  }

  const probe = await probeUrl(source.url, { timeoutMs: 15_000, maxBytes: 512 * 1024 });
  const manifest = validateManifest(probe.body, probe.contentType);
  let status: StreamStatus;
  let error: string | null = null;

  if (!probe.ok) {
    status = httpStatusToStatus(probe.status);
    error = probe.error ?? `HTTP ${probe.status}`;
  } else if (!manifest.valid) {
    status = 'temporarily-unavailable';
    error = manifest.reason ?? 'The response was not a valid HLS manifest.';
  } else if (probe.cors !== true) {
    status = 'playback-restricted';
    error = 'The manifest is valid but it does not send CORS headers, so browsers cannot play it directly.';
  } else {
    status = 'verified';
  }

  return {
    record: {
      channelId: channelKey,
      sourceId: source.id,
      status,
      httpStatus: probe.status,
      cors: probe.cors,
      error,
      checkedAt,
      manifestKind: manifest.kind,
      finalUrl: probe.finalUrl,
    },
    detail: `${channelName}: ${manifest.kind} ${probe.status ?? 'network'}${probe.cors === false ? ' (no CORS)' : ''}`,
  };
}

const MAX_RETRIES = 2;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) continue;
      results[index] = await worker(item, index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

async function main(): Promise<void> {
  const approved = loadApproved(root);
  const existing = readStatusFile(path.join(root, 'data', 'stream-status.json'));
  const work: { channelKey: string; channelName: string; source: { id: string; type: string; url: string } }[] = [];

  for (const channel of approved.channels) {
    if (only && channel.id !== only) continue;
    for (const source of channel.sources) {
      work.push({
        channelKey: channel.id,
        channelName: channel.name,
        source: { id: source.id, type: source.type, url: source.url },
      });
    }
  }

  if (work.length === 0) {
    console.warn('[validate] no sources matched the requested filter');
    return;
  }

  console.info(
    `[validate] checking ${work.length} sources with concurrency ${concurrency}` +
      (only ? ` (channel ${only})` : ''),
  );

  const results = await mapLimit(work, concurrency, async (item, index) => {
    try {
      let result = await checkSource(item.channelKey, item.channelName, item.source);
      // Retry transient failures with exponential backoff (2s, 4s) before recording them.
      for (let attempt = 0; attempt < MAX_RETRIES && isTransientFailure(result.record); attempt += 1) {
        await sleep(2000 * 2 ** attempt);
        result = await checkSource(item.channelKey, item.channelName, item.source);
      }
      result = { ...result, record: reconcileWithPrevious(result.record, existing.sources[item.source.id]) };
      console.info(`[validate] ${index + 1}/${work.length} ${result.detail} -> ${result.record.status}`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[validate] ${index + 1}/${work.length} ${item.channelName}: ${message}`);
      return {
        record: {
          channelId: item.channelKey,
          sourceId: item.source.id,
          status: 'temporarily-unavailable' as StreamStatus,
          httpStatus: null,
          cors: null,
          error: message,
          checkedAt: new Date().toISOString(),
        },
        detail: `${item.channelName}: error`,
      };
    }
  });

  const sources: Record<string, SourceStatusRecord> = only ? { ...existing.sources } : {};
  for (const result of results) {
    sources[result.record.sourceId] = result.record;
  }

  const output: StreamStatusFile = {
    version: 1,
    checkedAt: new Date().toISOString(),
    sources,
  };

  if (dryRun) {
    console.info('[validate] dry run, not writing data/stream-status.json');
  } else {
    fs.writeFileSync(path.join(root, 'data', 'stream-status.json'), `${JSON.stringify(output, null, 2)}\n`);
    console.info('[validate] wrote data/stream-status.json');
  }

  const counts = new Map<string, number>();
  for (const record of Object.values(sources)) {
    counts.set(record.status, (counts.get(record.status) ?? 0) + 1);
  }
  console.info(
    `[validate] ${[...counts.entries()].map(([status, count]) => `${status}=${count}`).join(' ')}`,
  );
}

main().catch((error) => {
  console.error('[validate] fatal:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
