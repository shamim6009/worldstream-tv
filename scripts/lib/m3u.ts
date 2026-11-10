export interface M3UEntry {
  name: string;
  url: string;
  tvgId: string | null;
  tvgName: string | null;
  logo: string | null;
  group: string | null;
  language: string | null;
  country: string | null;
  quality: string | null;
  duration: number;
  line: number;
  extra: Record<string, string>;
}

const ATTRIBUTE_RE = /([A-Za-z0-9_-]+)="([^"]*)"/g;

export function parseAttributes(input: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of input.matchAll(ATTRIBUTE_RE)) {
    const key = match[1];
    const value = match[2];
    if (key && value !== undefined) result[key.toLowerCase()] = value;
  }
  return result;
}

/**
 * Parses an extended M3U playlist. Tolerant of BOMs, CRLF, comments, missing
 * metadata and `#EXTVLCOPT` lines. Never executes anything from the playlist.
 */
export function parseM3U(text: string): M3UEntry[] {
  const cleaned = text.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/);
  const entries: M3UEntry[] = [];
  let pending: { attrs: Record<string, string>; name: string; line: number; extra: Record<string, string> } | null =
    null;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? '';
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const commaIndex = findNameComma(line);
      const meta = commaIndex === -1 ? line.slice(8) : line.slice(8, commaIndex);
      const name = commaIndex === -1 ? '' : line.slice(commaIndex + 1).trim();
      pending = { attrs: parseAttributes(meta), name, line: index + 1, extra: {} };
      continue;
    }

    if (line.startsWith('#EXTVLCOPT:') && pending) {
      const option = line.slice('#EXTVLCOPT:'.length);
      const [key, ...rest] = option.split('=');
      if (key) pending.extra[key.trim().toLowerCase()] = rest.join('=').trim();
      continue;
    }

    if (line.startsWith('#')) continue;

    if (!pending) {
      if (/^https?:\/\//i.test(line)) {
        entries.push({
          name: '',
          url: line,
          tvgId: null,
          tvgName: null,
          logo: null,
          group: null,
          language: null,
          country: null,
          quality: null,
          duration: -1,
          line: index + 1,
          extra: {},
        });
      }
      continue;
    }

    const durationRaw = (pending.attrs['tvg-duration'] ?? '-1').replace(/[^\d.-]/g, '');
    const parsedDuration = Number.parseFloat(durationRaw);
    entries.push({
      name: pending.name || pending.attrs['tvg-name'] || '',
      url: line,
      tvgId: pending.attrs['tvg-id'] ?? null,
      tvgName: pending.attrs['tvg-name'] ?? null,
      logo: pending.attrs['tvg-logo'] ?? null,
      group: pending.attrs['group-title'] ?? null,
      language: pending.attrs['tvg-language'] ?? null,
      country: pending.attrs['tvg-country'] ?? null,
      quality: pending.attrs['tvg-quality'] ?? null,
      duration: Number.isFinite(parsedDuration) ? parsedDuration : -1,
      line: pending.line,
      extra: pending.extra,
    });
    pending = null;
  }

  return entries.filter((entry) => entry.url.length > 0);
}

function findNameComma(line: string): number {
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    if (char === ',' && !inQuotes) return i;
  }
  return -1;
}

export interface QualityInfo {
  quality: string | null;
  isHd: boolean;
}

export function extractQuality(name: string): QualityInfo {
  const lower = name.toLowerCase();
  const resolution = lower.match(/\b(2160p|1440p|1080p|720p|576p|540p|480p|360p|240p)\b/);
  if (resolution?.[1]) {
    const quality = resolution[1];
    return { quality, isHd: /^(2160|1440|1080|720)p$/.test(quality) };
  }
  if (/\b(uhd|4k)\b/.test(lower)) return { quality: '2160p', isHd: true };
  if (/\bfhd\b/.test(lower)) return { quality: '1080p', isHd: true };
  if (/\bhd\b/.test(lower)) return { quality: '720p', isHd: true };
  if (/\bsd\b/.test(lower)) return { quality: '480p', isHd: false };
  return { quality: null, isHd: false };
}
