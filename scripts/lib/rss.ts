/**
 * Tiny dependency-free RSS reader.
 *
 * Only used at build time in CI to carry headlines, links and short summaries
 * from an RSS feed into data/sports-news.json. We deliberately store a trimmed
 * description and always link out to the publisher rather than reproducing
 * articles: the feed is a syndication channel, not a content licence.
 */

export interface RssItem {
  title: string;
  link: string;
  description: string;
  publishedAt: string | null;
  guid: string | null;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
  '#8217': '’',
  '#8216': '‘',
  '#8220': '“',
  '#8221': '”',
  '#8211': '–',
  '#8212': '—',
};

/** Decodes the handful of entities news feeds actually emit, then drops tags. */
export function plainText(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&([a-zA-Z0-9#]+);/g, (match, name: string) => ENTITIES[name] ?? match)
    .replace(/\s+/g, ' ')
    .trim();
}

function pick(block: string, tag: string): string {
  const cdata = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i').exec(block);
  if (cdata?.[1] != null) return cdata[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(block);
  return plain?.[1]?.trim() ?? '';
}

/** Parses the <item> elements of an RSS document. Never throws on junk input. */
export function parseRss(xml: string): RssItem[] {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const out: RssItem[] = [];
  for (const block of items) {
    const title = plainText(pick(block, 'title'));
    const link = plainText(pick(block, 'link'));
    if (!title || !/^https?:\/\//.test(link)) continue;
    const publishedRaw = pick(block, 'pubDate') || pick(block, 'dc:date');
    const publishedMs = publishedRaw ? Date.parse(publishedRaw) : Number.NaN;
    out.push({
      title,
      link,
      description: plainText(pick(block, 'description')).slice(0, 240),
      publishedAt: Number.isFinite(publishedMs) ? new Date(publishedMs).toISOString() : null,
      guid: pick(block, 'guid') || null,
    });
  }
  return out;
}
