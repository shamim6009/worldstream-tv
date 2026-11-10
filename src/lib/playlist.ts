import type { LocalPlaylistChannel } from '../types/catalog';

const ATTRIBUTE_RE = /([A-Za-z0-9_-]+)="([^"]*)"/g;

function hashString(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function parseAttributes(value: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const match of value.matchAll(ATTRIBUTE_RE)) {
    const key = match[1];
    const attributeValue = match[2];
    if (key && attributeValue !== undefined) result[key.toLowerCase()] = attributeValue;
  }
  return result;
}

function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Parses an M3U/M3U8 playlist entirely in the browser. URLs are never fetched by
 * the app during import; they stay in local storage until the user presses play.
 */
export function parseLocalPlaylist(
  text: string,
  playlistName: string,
  limit = 5000,
): LocalPlaylistChannel[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const importedAt = new Date().toISOString();
  const seen = new Set<string>();
  const channels: LocalPlaylistChannel[] = [];
  let pending: { name: string; attrs: Record<string, string> } | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const comma = line.indexOf(',');
      const meta = comma === -1 ? line.slice(8) : line.slice(8, comma);
      const name = comma === -1 ? '' : line.slice(comma + 1).trim();
      pending = { name, attrs: parseAttributes(meta) };
      continue;
    }
    if (line.startsWith('#EXTGRP:')) {
      if (pending) pending.attrs['group-title'] = line.slice(8).trim();
      continue;
    }
    if (line.startsWith('#')) continue;

    const url = safeUrl(line);
    if (!url || seen.has(url)) {
      pending = null;
      continue;
    }
    seen.add(url);
    const name = pending?.name || pending?.attrs['tvg-name'] || `Channel ${channels.length + 1}`;
    channels.push({
      id: `local-${hashString(url)}`,
      name,
      url,
      logo: pending?.attrs['tvg-logo'] ?? null,
      group: pending?.attrs['group-title'] ?? null,
      importedAt,
      playlistName,
    });
    pending = null;
    if (channels.length >= limit) break;
  }

  return channels;
}

export function localPlaylistId(playlistName: string): string {
  return `playlist-${hashString(playlistName.toLowerCase())}`;
}
