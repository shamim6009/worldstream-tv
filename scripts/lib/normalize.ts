import { extractQuality, type M3UEntry } from './m3u';

export interface NormalizedChannelDraft {
  name: string;
  normalizedName: string;
  key: string;
  slug: string;
  tvgId: string | null;
  country: string | null;
  language: string | null;
  group: string | null;
  logo: string | null;
  quality: string | null;
  isHd: boolean;
  urls: string[];
  sources: string[];
  firstSeenLine: number;
}

const QUALITY_SUFFIXES =
  /\b(2160p|1440p|1080p|720p|576p|540p|480p|360p|240p|uhd|4k|fhd|hd|sd)\b/gi;

const COUNTRY_SUFFIX = /\((?:[A-Za-z .'-]+)\)\s*$/;

export function normalizeName(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\[[^\]]*]/g, ' ')
    .replace(QUALITY_SUFFIXES, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*[-–—|:]\s*$/g, '')
    .trim()
    .toLowerCase();
}

export function displayName(input: string): string {
  return input
    .replace(/\[[^\]]*]/g, ' ')
    .replace(QUALITY_SUFFIXES, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*[-–—|:]\s*$/g, '')
    .trim();
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function canonicalKey(name: string, country: string | null): string {
  const base = normalizeName(name).replace(COUNTRY_SUFFIX, '').trim();
  return `${base}::${(country ?? '').toUpperCase()}`;
}

/**
 * Groups raw playlist entries into normalized channel drafts and removes duplicate
 * URLs while preserving provenance.
 */
export function normalizeEntries(
  entries: M3UEntry[],
  sourceId: string,
  defaultCountry: string | null,
): NormalizedChannelDraft[] {
  const byKey = new Map<string, NormalizedChannelDraft>();

  for (const entry of entries) {
    const name = displayName(entry.name || entry.tvgName || '');
    if (!name) continue;
    const country = (entry.country ?? defaultCountry ?? '').toUpperCase() || null;
    const key = entry.tvgId ? `id::${entry.tvgId.toLowerCase()}` : canonicalKey(name, country);
    const quality = extractQuality(entry.name || entry.tvgName || '');

    const existing = byKey.get(key);
    if (existing) {
      if (!existing.urls.includes(entry.url)) {
        existing.urls.push(entry.url);
        existing.sources.push(sourceId);
      }
      if (!existing.logo && entry.logo) existing.logo = entry.logo;
      if (!existing.tvgId && entry.tvgId) existing.tvgId = entry.tvgId;
      if (!existing.language && entry.language) existing.language = entry.language;
      if (!existing.quality && quality.quality) {
        existing.quality = quality.quality;
        existing.isHd = quality.isHd;
      }
      continue;
    }

    byKey.set(key, {
      name,
      normalizedName: normalizeName(name),
      key,
      slug: slugify(name),
      tvgId: entry.tvgId,
      country,
      language: entry.language,
      group: entry.group,
      logo: entry.logo,
      quality: quality.quality,
      isHd: quality.isHd,
      urls: [entry.url],
      sources: [sourceId],
      firstSeenLine: entry.line,
    });
  }

  const seenUrls = new Set<string>();
  const result: NormalizedChannelDraft[] = [];
  for (const draft of byKey.values()) {
    draft.urls = draft.urls.filter((url) => {
      if (seenUrls.has(url)) return false;
      seenUrls.add(url);
      return true;
    });
    if (draft.urls.length > 0) result.push(draft);
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function dedupeByUrl<T extends { urls: string[] }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const unique = item.urls.filter((url) => !seen.has(url));
    item.urls = unique;
    unique.forEach((url) => seen.add(url));
    return unique.length > 0;
  });
}
