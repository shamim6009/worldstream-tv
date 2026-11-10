import fs from 'node:fs';
import path from 'node:path';
import type { EpgProgram } from '../src/types/catalog';
import { probeUrl } from './lib/http';
import { parseXmltv } from './lib/xmltv';

interface EpgSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  note?: string;
  channelMap?: Record<string, string>;
}

interface SourcesFile {
  epg: EpgSource[];
}

interface EpgFile {
  generatedAt: string;
  timezone: string;
  note: string;
  channels: Record<string, EpgProgram[]>;
}

const root = process.cwd();
const args = new Set(process.argv.slice(2).filter((arg) => arg.startsWith('--')));
const dryRun = args.has('--dry-run');

async function main(): Promise<void> {
  const sources = JSON.parse(
    fs.readFileSync(path.join(root, 'data', 'sources.json'), 'utf8'),
  ) as SourcesFile;
  const epgPath = path.join(root, 'data', 'epg.json');
  const existing = fs.existsSync(epgPath)
    ? (JSON.parse(fs.readFileSync(epgPath, 'utf8')) as EpgFile)
    : { generatedAt: new Date(0).toISOString(), timezone: 'UTC', note: '', channels: {} };

  const feeds = sources.epg.filter((feed) => feed.enabled && feed.url.trim().length > 0);
  if (feeds.length === 0) {
    const output: EpgFile = {
      generatedAt: new Date().toISOString(),
      timezone: 'UTC',
      note:
        'No authorized XMLTV feed is enabled. Add an allowlisted feed URL to data/sources.json and run npm run sync:epg. ' +
        'The UI shows "Schedule unavailable" instead of inventing programmes.',
      channels: existing.channels ?? {},
    };
    if (!dryRun) fs.writeFileSync(epgPath, `${JSON.stringify(output, null, 2)}\n`);
    console.info('[epg] no enabled feeds; wrote an honest empty guide');
    return;
  }

  const merged: Record<string, EpgProgram[]> = {};
  const reports: string[] = [];
  let totalProgrammes = 0;

  for (const feed of feeds) {
    console.info(`[epg] fetching ${feed.name} (${feed.url})`);
    const probe = await probeUrl(feed.url, { timeoutMs: 30_000, maxBytes: 16 * 1024 * 1024 });
    if (!probe.ok) {
      reports.push(`${feed.id}: ${probe.error ?? `HTTP ${probe.status}`}`);
      console.warn(`[epg] ${feed.id}: ${probe.error ?? `HTTP ${probe.status}`}`);
      continue;
    }
    const parsed = parseXmltv(probe.body);
    totalProgrammes += parsed.programmeCount;
    let mapped = 0;
    for (const [xmltvId, programs] of Object.entries(parsed.channels)) {
      const targetId = feed.channelMap?.[xmltvId] ?? xmltvId;
      const list = merged[targetId] ?? [];
      list.push(...programs);
      merged[targetId] = list;
      mapped += programs.length;
    }
    reports.push(`${feed.id}: ${parsed.channelIds.length} channels, ${mapped} programmes`);
    console.info(`[epg] ${feed.id}: ${parsed.channelIds.length} channels, ${mapped} programmes`);
  }

  if (totalProgrammes === 0) {
    console.warn('[epg] no programmes parsed; keeping the existing guide');
    return;
  }

  for (const [channelId, programs] of Object.entries(merged)) {
    merged[channelId] = programs
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 2000);
  }

  const output: EpgFile = {
    generatedAt: new Date().toISOString(),
    timezone: 'UTC',
    note: `Authorized XMLTV feeds only. ${reports.join('; ')}`,
    channels: merged,
  };

  if (dryRun) {
    console.info('[epg] dry run, not writing data/epg.json');
  } else {
    fs.writeFileSync(epgPath, `${JSON.stringify(output, null, 2)}\n`);
    console.info(
      `[epg] wrote data/epg.json with ${Object.keys(merged).length} channels and ${totalProgrammes} programmes`,
    );
  }
}

main().catch((error) => {
  console.error('[epg] fatal:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
