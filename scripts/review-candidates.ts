/**
 * Triages raw playlist candidates into review tiers.
 *
 * `sync:catalog` imports thousands of entries per playlist and every one is
 * `publish: false` on purpose: a playlist listing is not evidence that the
 * rights holder publishes the stream for free. Reviewing 10k rows by hand is
 * not practical, so this script ranks candidates by how likely the stream is
 * the broadcaster's own official endpoint:
 *
 *   tier 1 `official-domain`  stream host is the channel's own website domain
 *   tier 2 `official-fast`    hosted on a known free ad-supported platform
 *   tier 3 `official-youtube` a YouTube source (uploader still needs checking)
 *   tier 4 `review`           everything else, e.g. IP-based restreams
 *
 * Output is advisory only. Nothing here publishes anything; an operator still
 * confirms rights and adds the channel to data/approved-channels.json by hand.
 *
 * Usage: npm run review:candidates
 */
import fs from 'node:fs';
import path from 'node:path';

interface Candidate {
  name: string;
  key: string;
  slug: string;
  tvgId: string | null;
  country: string | null;
  language: string | null;
  group: string | null;
  logo: string | null;
  quality: string | null;
  urls: string[];
  sources: string[];
}

interface CandidateFile {
  candidates: Candidate[];
}

interface ApiChannel {
  id: string;
  name: string;
  country: string | null;
  categories: string[];
  website: string | null;
  owners: { name: string; website: string | null }[];
}

type Tier = 'official-domain' | 'official-fast' | 'official-youtube' | 'review';

const root = process.cwd();
const CANDIDATES = path.join(root, 'data', 'candidates.json');
const API_CHANNELS = 'https://iptv-org.github.io/api/channels.json';
const CACHE = path.join(root, 'node_modules', '.cache', 'iptv-org-channels.json');

/** Free, ad-supported platforms that carry licensed FAST feeds. */
const FAST_HOSTS = [
  'pluto.tv',
  'jmp2.uk', // Samsung TV Plus / Rakuten aggregator mirrors
  'plex.tv',
  'tubitv.com',
  'xumo.tv',
  'samsungtvplus.com',
  'lgchannels.com',
];

/** Second-level labels that are really part of the public suffix. */
const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'co.jp', 'or.jp', 'ne.jp', 'co.in', 'net.in',
  'org.in', 'co.kr', 'or.kr', 'com.au', 'net.au', 'org.au', 'com.br', 'com.tr', 'com.cn',
  'com.bd', 'com.pk', 'com.np', 'com.sa', 'com.eg', 'co.za', 'com.my', 'com.sg', 'com.hk',
  'co.id', 'com.ar', 'com.mx', 'com.co', 'com.pe', 'com.tw', 'co.th', 'com.vn', 'com.ua',
]);

function rootDomain(hostname: string): string {
  const clean = hostname.toLowerCase().replace(/^www\./, '');
  const parts = clean.split('.');
  if (parts.length <= 2) return clean;
  const lastTwo = parts.slice(-2).join('.');
  if (MULTI_PART_SUFFIXES.has(lastTwo) && parts.length >= 3) return parts.slice(-3).join('.');
  return lastTwo;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isIp(host: string): boolean {
  return /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':');
}

/** Normalises an iptv-org channel id (`bbc-news.uk@SD` -> `bbc-news.uk`). */
function baseId(tvgId: string): string {
  return tvgId.split('@')[0]?.trim() ?? tvgId;
}

async function loadApiChannels(): Promise<Map<string, ApiChannel>> {
  let raw: string;
  if (fs.existsSync(CACHE)) {
    raw = fs.readFileSync(CACHE, 'utf8');
  } else {
    console.info(`[review] fetching ${API_CHANNELS}`);
    const response = await fetch(API_CHANNELS);
    if (!response.ok) throw new Error(`iptv-org API returned HTTP ${response.status}`);
    raw = await response.text();
    fs.mkdirSync(path.dirname(CACHE), { recursive: true });
    fs.writeFileSync(CACHE, raw);
  }
  const list = JSON.parse(raw) as ApiChannel[];
  return new Map(list.map((channel) => [channel.id.toLowerCase(), channel]));
}

function tierFor(candidate: Candidate, meta: ApiChannel | undefined): { tier: Tier; reason: string } {
  const websiteHost = meta?.website ? hostOf(meta.website) : null;
  const websiteDomain = websiteHost ? rootDomain(websiteHost) : null;
  const ownerDomains = new Set(
    (meta?.owners ?? [])
      .map((owner) => (owner.website ? hostOf(owner.website) : null))
      .filter((host): host is string => Boolean(host))
      .map(rootDomain),
  );

  for (const url of candidate.urls) {
    const host = hostOf(url);
    if (!host || isIp(host)) continue;
    const domain = rootDomain(host);
    if (websiteDomain && domain === websiteDomain) {
      return { tier: 'official-domain', reason: `stream host ${domain} matches the channel website` };
    }
    if (ownerDomains.has(domain)) {
      return { tier: 'official-domain', reason: `stream host ${domain} matches the owner's website` };
    }
  }

  for (const url of candidate.urls) {
    const host = hostOf(url);
    if (!host) continue;
    if (FAST_HOSTS.some((fast) => host === fast || host.endsWith(`.${fast}`))) {
      return { tier: 'official-fast', reason: `hosted on ${rootDomain(host)}` };
    }
  }

  if (candidate.urls.some((url) => hostOf(url)?.endsWith('youtube.com'))) {
    return { tier: 'official-youtube', reason: 'YouTube source; uploader must be verified' };
  }

  const first = candidate.urls.map((url) => hostOf(url)).find((host) => host && !isIp(host));
  return { tier: 'review', reason: first ? `unverified host ${first}` : 'IP-based or unknown host' };
}

async function main(): Promise<void> {
  if (!fs.existsSync(CANDIDATES)) {
    console.error('[review] data/candidates.json is missing. Run `npm run sync:catalog` first.');
    process.exitCode = 1;
    return;
  }

  const file = JSON.parse(fs.readFileSync(CANDIDATES, 'utf8')) as CandidateFile;
  const api = await loadApiChannels();

  const buckets: Record<Tier, { candidate: Candidate; reason: string }[]> = {
    'official-domain': [],
    'official-fast': [],
    'official-youtube': [],
    review: [],
  };

  for (const candidate of file.candidates) {
    const meta = candidate.tvgId ? api.get(baseId(candidate.tvgId).toLowerCase()) : undefined;
    const { tier, reason } = tierFor(candidate, meta);
    buckets[tier].push({ candidate, reason });
  }

  const total = file.candidates.length;
  console.info(`[review] ${total} candidates triaged`);
  for (const [tier, rows] of Object.entries(buckets)) {
    console.info(`[review]   ${tier}: ${rows.length}`);
  }

  const lines: string[] = [
    '# Candidate review queue',
    '',
    'Generated by `npm run review:candidates`. Advisory only — nothing here is published.',
    '',
    'Approving a row still requires confirming that the rights holder publishes the stream for free',
    '(see `docs/ADMIN.md`), then adding an entry to `data/approved-channels.json` and running',
    '`npm run validate:streams -- --only=<id>`.',
    '',
    `Total candidates: **${total}**`,
    '',
    '| Tier | Count | Meaning |',
    '| --- | --- | --- |',
    `| 1 official-domain | ${buckets['official-domain'].length} | stream host matches the channel's own website — strongest signal |`,
    `| 2 official-fast | ${buckets['official-fast'].length} | hosted on a known FAST platform |`,
    `| 3 official-youtube | ${buckets['official-youtube'].length} | YouTube source, uploader unverified |`,
    `| 4 review | ${buckets.review.length} | restreams, IP hosts, unknown CDNs |`,
    '',
  ];

  for (const tier of ['official-domain', 'official-fast', 'official-youtube'] as Tier[]) {
    lines.push(`## Tier: ${tier}`, '');
    const rows = buckets[tier];
    if (rows.length === 0) {
      lines.push('_none_', '');
      continue;
    }
    lines.push('| Channel | Country | URL | Why |', '| --- | --- | --- | --- |');
    for (const { candidate, reason } of rows.slice(0, 200)) {
      const url = candidate.urls[0] ?? '';
      lines.push(`| ${candidate.name.replace(/\|/g, '/')} | ${candidate.country ?? '—'} | ${url} | ${reason} |`);
    }
    if (rows.length > 200) lines.push(`| … | | | ${rows.length - 200} more |`);
    lines.push('');
  }

  fs.writeFileSync(path.join(root, 'data', 'candidates-review.md'), `${lines.join('\n')}\n`);
  fs.writeFileSync(
    path.join(root, 'data', 'candidates-shortlist.json'),
    `${JSON.stringify(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        note: 'Advisory shortlist produced by review-candidates.ts. Not published. Verify rights before approving.',
        tiers: Object.fromEntries(
          Object.entries(buckets).map(([tier, rows]) => [
            tier,
            rows.map(({ candidate, reason }) => ({
              name: candidate.name,
              key: candidate.key,
              tvgId: candidate.tvgId,
              country: candidate.country,
              language: candidate.language,
              group: candidate.group,
              logo: candidate.logo,
              quality: candidate.quality,
              urls: candidate.urls,
              reason,
            })),
          ]),
        ),
      },
      null,
      2,
    )}\n`,
  );
  console.info('[review] wrote data/candidates-review.md and data/candidates-shortlist.json');
}

main().catch((error) => {
  console.error('[review] fatal:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
