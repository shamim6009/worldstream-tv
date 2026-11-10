import type { EpgProgram } from '../../src/types/catalog';

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function firstTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  return match?.[1] ? stripTags(match[1]) : '';
}

export function parseXmltvDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const match = raw
    .trim()
    .match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, zone] = match;
  if (!year || !month || !day || !hour || !minute) return null;
  const utc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? '0'),
  );
  let offsetMinutes = 0;
  if (zone) {
    const sign = zone.startsWith('-') ? -1 : 1;
    const hours = Number(zone.slice(1, 3));
    const minutes = Number(zone.slice(3, 5));
    offsetMinutes = sign * (hours * 60 + minutes);
  }
  const date = new Date(utc - offsetMinutes * 60_000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export interface ParsedXmltv {
  channelIds: string[];
  channels: Record<string, EpgProgram[]>;
  programmeCount: number;
}

export function parseXmltv(xml: string): ParsedXmltv {
  const channels: Record<string, EpgProgram[]> = {};
  const channelIds = new Set<string>();
  const programmes = xml.match(/<programme\b[\s\S]*?<\/programme>/gi) ?? [];

  for (const block of programmes) {
    const openTag = block.match(/<programme\b([^>]*)>/i)?.[1] ?? '';
    const attrs = new Map<string, string>();
    for (const match of openTag.matchAll(/([A-Za-z0-9:_-]+)\s*=\s*"([^"]*)"/g)) {
      const key = match[1];
      const value = match[2];
      if (key && value !== undefined) attrs.set(key.toLowerCase(), value);
    }
    const channelId = attrs.get('channel')?.trim();
    const start = parseXmltvDate(attrs.get('start'));
    const stop = parseXmltvDate(attrs.get('stop'));
    const title = firstTag(block, 'title');
    if (!channelId || !start || !stop || !title) continue;

    const program: EpgProgram = {
      start,
      stop,
      title,
      description: firstTag(block, 'desc') || undefined,
      category: firstTag(block, 'category') || undefined,
    };
    channelIds.add(channelId);
    const list = channels[channelId] ?? [];
    list.push(program);
    channels[channelId] = list;
  }

  for (const [channelId, list] of Object.entries(channels)) {
    channels[channelId] = list
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 2000);
  }

  return {
    channelIds: [...channelIds].sort(),
    channels,
    programmeCount: programmes.length,
  };
}
