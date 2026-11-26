/**
 * Collects cricket and football headlines for the sports page.
 *
 * Cricket comes from ESPNcricinfo's public RSS feed, football from ESPN's
 * scoreboard-adjacent news endpoint. Both are pulled in CI, never in the
 * browser, and we store only a headline, a trimmed summary and the outbound
 * link — the publisher keeps the article and the traffic.
 *
 * Usage: npm run sync:news
 */
import fs from 'node:fs';
import path from 'node:path';
import type { SportsNewsData, SportsNewsItem } from '../src/types/catalog';
import { parseRss } from './lib/rss';

const root = process.cwd();
const OUT = path.join(root, 'data', 'sports-news.json');

const CRICINFO_RSS = 'https://www.cricinfo.com/rss/content/story/feeds/0.xml';
const ESPN_NEWS = (sport: string, league: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/news?limit=8`;

const UA = 'worldstream-tv/1.0 (+https://github.com/shamim6009/worldstream-tv)';

/** Keeps the newest N items per sport. */
const PER_SPORT = 8;

function slugId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function fetchCricketNews(): Promise<SportsNewsItem[]> {
  const response = await fetch(CRICINFO_RSS, {
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`cricinfo RSS HTTP ${response.status}`);

  return parseRss(await response.text()).map((item) => ({
    id: `cricket-${slugId(item.guid ?? item.link)}`,
    title: item.title,
    summary: item.description,
    url: item.link,
    publishedAt: item.publishedAt,
    sport: 'cricket' as const,
    source: 'ESPNcricinfo',
  }));
}

interface EspnArticle {
  headline?: string;
  description?: string;
  published?: string;
  links?: { web?: { href?: string } };
}

async function fetchEspnNews(
  league: string,
  sport: 'soccer' | 'cricket',
  source: string,
  sportKey: 'football' | 'cricket',
): Promise<SportsNewsItem[]> {
  const response = await fetch(ESPN_NEWS(sport, league), {
    headers: { 'user-agent': UA, accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`ESPN ${sport}/${league} HTTP ${response.status}`);
  const body = (await response.json()) as { articles?: EspnArticle[] };

  return (body.articles ?? []).flatMap((article) => {
    const url = article.links?.web?.href;
    const title = article.headline?.trim();
    if (!title || !url || !/^https:\/\//.test(url)) return [];
    return [
      {
        id: `${sportKey}-${slugId(url)}`,
        title,
        summary: (article.description ?? '').trim().slice(0, 240),
        url,
        publishedAt: article.published && Number.isFinite(Date.parse(article.published)) ? new Date(article.published).toISOString() : null,
        sport: sportKey,
        source,
      } satisfies SportsNewsItem,
    ];
  });
}

function newestFirst(items: SportsNewsItem[]): SportsNewsItem[] {
  return items.sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
}

function trimPerSport(items: SportsNewsItem[]): SportsNewsItem[] {
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  const out: SportsNewsItem[] = [];
  for (const item of newestFirst(items)) {
    const key = item.title.toLowerCase();
    if (seen.has(key)) continue;
    const used = counts.get(item.sport) ?? 0;
    if (used >= PER_SPORT) continue;
    seen.add(key);
    counts.set(item.sport, used + 1);
    out.push(item);
  }
  return out;
}

async function main(): Promise<void> {
  const results = await Promise.allSettled([
    fetchCricketNews(),
    fetchEspnNews('8039', 'cricket', 'ESPN', 'cricket'),
    fetchEspnNews('eng.1', 'soccer', 'ESPN', 'football'),
    fetchEspnNews('uefa.champions', 'soccer', 'ESPN', 'football'),
  ]);

  const items: SportsNewsItem[] = [];
  let failed = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') items.push(...result.value);
    else {
      failed += 1;
      console.warn(`[news] source skipped: ${result.reason instanceof Error ? result.reason.message : result.reason}`);
    }
  }

  if (items.length === 0) {
    // Keep the previous feed rather than publishing an empty page.
    console.error('[news] every source failed, leaving data/sports-news.json untouched');
    process.exitCode = 1;
    return;
  }

  const output: SportsNewsData = {
    generatedAt: new Date().toISOString(),
    note: 'Headlines and links only, collected from publisher RSS/API feeds. Articles stay with their publisher.',
    items: trimPerSport(items),
  };
  fs.writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`);
  const cricket = output.items.filter((item) => item.sport === 'cricket').length;
  console.info(
    `[news] wrote data/sports-news.json: ${output.items.length} items ` +
      `(${cricket} cricket, ${output.items.length - cricket} football)` +
      (failed ? `, ${failed} source(s) skipped` : ''),
  );
}

main().catch((error) => {
  console.error('[news] fatal:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
