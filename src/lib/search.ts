import type { Channel } from '../types/catalog';
import { normalizeText } from './utils';

function channelHaystack(channel: Channel): string {
  return normalizeText(
    [
      channel.name,
      ...(channel.altNames ?? []),
      channel.countryName,
      channel.languageName,
      channel.provider,
      ...channel.categories,
      ...(channel.sports ?? []),
      channel.description,
    ].join(' '),
  );
}

function scoreChannel(channel: Channel, query: string, tokens: string[]): number {
  const name = normalizeText(channel.name);
  const alt = (channel.altNames ?? []).map(normalizeText);
  const haystack = channelHaystack(channel);

  if (name === query) return 1000;
  if (name.startsWith(query)) return 800;
  if (alt.some((entry) => entry === query)) return 750;
  if (alt.some((entry) => entry.startsWith(query))) return 650;
  if (name.includes(query)) return 600;
  if (alt.some((entry) => entry.includes(query))) return 500;

  let score = 0;
  for (const token of tokens) {
    if (name.includes(token)) score += 80;
    else if (alt.some((entry) => entry.includes(token))) score += 50;
    else if (haystack.includes(token)) score += 20;
    else return 0;
  }
  return score;
}

export function searchChannels(channels: Channel[], query: string): Channel[] {
  const normalized = normalizeText(query);
  if (!normalized) return channels;
  const tokens = normalized.split(/\s+/).filter(Boolean);
  return channels
    .map((channel) => ({ channel, score: scoreChannel(channel, normalized, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.channel.name.localeCompare(b.channel.name))
    .map((entry) => entry.channel);
}

export function groupByCountry(channels: Channel[]): Map<string, Channel[]> {
  const groups = new Map<string, Channel[]>();
  for (const channel of channels) {
    const list = groups.get(channel.country) ?? [];
    list.push(channel);
    groups.set(channel.country, list);
  }
  return groups;
}
