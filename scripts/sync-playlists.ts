import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { probeUrl } from './lib/http';
import { parseM3U } from './lib/m3u';
import { normalizeEntries, type NormalizedChannelDraft } from './lib/normalize';
import { isPrivateAddress } from './lib/ssrf';
import { isBlocked, type Blocklist } from './lib/validate-approved';

interface PlaylistSource {
  id: string;
  name: string;
  url: string;
  country: string | null;
  enabled: boolean;
  publish: boolean;
  maxEntries: number;
  license: string;
  homepage: string;
}

interface SourcesFile {
  playlists: PlaylistSource[];
  blocklist?: Partial<Blocklist>;
}

interface Candidate extends NormalizedChannelDraft {
  sourcePlaylists: string[];
  reviewStatus: 'pending';
  publish: false;
}

interface PlaylistReport {
  id: string;
  name: string;
  url: string;
  publish: false;
  fetchedAt: string;
  entryCount: number;
  candidateCount: number;
  error: string | null;
  license: string;
  homepage: string;
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

const only = args.get('only')?.trim() || null;
const dryRun = args.has('dry-run');

function isSafeCandidateUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (url.username || url.password) return false;
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return false;
    }
    if (net.isIP(hostname) && isPrivateAddress(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

async function fetchPlaylist(source: PlaylistSource): Promise<{
  entries: ReturnType<typeof parseM3U>;
  error: string | null;
}> {
  const probe = await probeUrl(source.url, {
    timeoutMs: 30_000,
    maxBytes: 8 * 1024 * 1024,
  });
  if (!probe.ok) return { entries: [], error: probe.error ?? `HTTP ${probe.status}` };
  const entries = parseM3U(probe.body).slice(0, source.maxEntries);
  return { entries, error: null };
}

async function main(): Promise<void> {
  const sources = JSON.parse(
    fs.readFileSync(path.join(root, 'data', 'sources.json'), 'utf8'),
  ) as SourcesFile;
  const blocklist: Blocklist = { hosts: sources.blocklist?.hosts ?? [], urls: sources.blocklist?.urls ?? [] };
  const playlists = sources.playlists.filter(
    (playlist) => playlist.enabled && (!only || playlist.id === only),
  );

  if (playlists.length === 0) {
    console.warn('[sync] no enabled playlists matched');
    return;
  }

  const byKey = new Map<string, Candidate>();
  const reports: PlaylistReport[] = [];
  let failed = 0;

  for (const playlist of playlists) {
    console.info(`[sync] fetching ${playlist.name} (${playlist.url})`);
    const { entries, error } = await fetchPlaylist(playlist);
    if (error) {
      failed += 1;
      console.warn(`[sync] ${playlist.id}: ${error}`);
    }
    const safeEntries = entries.filter(
      (entry) => isSafeCandidateUrl(entry.url) && !isBlocked(entry.url, blocklist),
    );
    const drafts = normalizeEntries(safeEntries, playlist.id, playlist.country);
    let added = 0;

    for (const draft of drafts) {
      const existing = byKey.get(draft.key);
      if (existing) {
        for (const url of draft.urls) {
          if (!existing.urls.includes(url)) existing.urls.push(url);
        }
        for (const sourceId of draft.sources) {
          if (!existing.sources.includes(sourceId)) existing.sources.push(sourceId);
        }
        if (!existing.logo && draft.logo) existing.logo = draft.logo;
        if (!existing.language && draft.language) existing.language = draft.language;
        if (!existing.quality && draft.quality) {
          existing.quality = draft.quality;
          existing.isHd = draft.isHd;
        }
        continue;
      }
      byKey.set(draft.key, {
        ...draft,
        sourcePlaylists: [playlist.id],
        reviewStatus: 'pending',
        publish: false,
      });
      added += 1;
    }

    reports.push({
      id: playlist.id,
      name: playlist.name,
      url: playlist.url,
      publish: false,
      fetchedAt: new Date().toISOString(),
      entryCount: entries.length,
      candidateCount: added,
      error,
      license: playlist.license,
      homepage: playlist.homepage,
    });
    console.info(
      `[sync] ${playlist.id}: ${entries.length} entries, ${safeEntries.length} safe, ${added} new candidates`,
    );
  }

  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    note:
      'Candidate-only import from community playlists. Nothing in this file is published. ' +
      'Review each stream and add an approved entry to data/approved-channels.json with documented authorization.',
    playlists: reports,
    candidates: [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name)),
  };

  if (dryRun) {
    console.info('[sync] dry run, not writing data/candidates.json');
  } else {
    fs.writeFileSync(path.join(root, 'data', 'candidates.json'), `${JSON.stringify(output, null, 2)}\n`);
    console.info(
      `[sync] wrote data/candidates.json with ${output.candidates.length} candidates (all publish:false)`,
    );
  }

  if (failed === playlists.length) {
    console.error('[sync] every playlist failed; candidates file may be incomplete');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[sync] fatal:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
