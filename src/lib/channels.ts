import type { Catalog, Channel, StreamSource, StreamStatus } from '../types/catalog';

/** Lower number = more likely to play. Used for sorting and fallback order. */
const STATUS_RANK: Record<StreamStatus, number> = {
  verified: 0,
  'recently-available': 1,
  unknown: 2,
  'geo-restricted': 3,
  'playback-restricted': 4,
  'temporarily-unavailable': 5,
  'auth-required': 6,
  removed: 9,
};

export function statusRank(status: StreamStatus): number {
  return STATUS_RANK[status] ?? 5;
}

export function isAvailable(channel: Channel): boolean {
  return channel.status === 'verified' || channel.status === 'recently-available';
}

/**
 * Orders a channel's approved sources for playback: playable source types before
 * provider links, primary first, then by last known status. Removed sources are dropped.
 */
export function playbackOrder(sources: StreamSource[]): StreamSource[] {
  const typeRank = (source: StreamSource) => (source.type === 'provider' ? 1 : 0);
  return sources
    .filter((source) => source.status !== 'removed')
    .map((source, index) => ({ source, index }))
    .sort(
      (a, b) =>
        typeRank(a.source) - typeRank(b.source) ||
        Number(Boolean(b.source.isPrimary)) - Number(Boolean(a.source.isPrimary)) ||
        statusRank(a.source.status) - statusRank(b.source.status) ||
        a.index - b.index,
    )
    .map((entry) => entry.source);
}

export function categoryLabel(category: string): string {
  return category.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function relatedChannels(channel: Channel, channels: Channel[], limit = 12): Channel[] {
  return channels
    .filter((candidate) => candidate.id !== channel.id)
    .map((candidate) => {
      let score = 0;
      if (candidate.country === channel.country) score += 3;
      if (candidate.language === channel.language) score += 1;
      score += candidate.categories.filter((category) => channel.categories.includes(category)).length * 2;
      score += (candidate.sports ?? []).filter((sport) => (channel.sports ?? []).includes(sport)).length;
      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        statusRank(a.candidate.status) - statusRank(b.candidate.status) ||
        a.candidate.name.localeCompare(b.candidate.name),
    )
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

export type SortKey = 'name-asc' | 'name-desc' | 'recent' | 'status';

export function sortChannels(channels: Channel[], sort: SortKey): Channel[] {
  const list = [...channels];
  switch (sort) {
    case 'name-desc':
      return list.sort((a, b) => b.name.localeCompare(a.name));
    case 'recent':
      return list.sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.name.localeCompare(b.name));
    case 'status':
      return list.sort((a, b) => statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name));
    case 'name-asc':
    default:
      return list.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export interface ChannelFilters {
  country?: string | null;
  language?: string | null;
  category?: string | null;
  status?: string | null;
  sport?: string | null;
  favoritesOnly?: boolean;
  favoriteIds?: string[];
}

export function filterChannels(channels: Channel[], filters: ChannelFilters): Channel[] {
  const favorites = filters.favoritesOnly ? new Set(filters.favoriteIds ?? []) : null;
  return channels.filter((channel) => {
    if (filters.country && channel.country !== filters.country) return false;
    if (filters.language && channel.language !== filters.language) return false;
    if (filters.category && !channel.categories.includes(filters.category)) return false;
    if (filters.sport && !(channel.sports ?? []).includes(filters.sport)) return false;
    if (filters.status === 'available' && !isAvailable(channel)) return false;
    if (filters.status && filters.status !== 'available' && channel.status !== filters.status) return false;
    if (favorites && !favorites.has(channel.id)) return false;
    return true;
  });
}

export function languageOptions(channels: Channel[]): { code: string; name: string; count: number }[] {
  const map = new Map<string, { code: string; name: string; count: number }>();
  for (const channel of channels) {
    const entry = map.get(channel.language) ?? { code: channel.language, name: channel.languageName, count: 0 };
    entry.count += 1;
    map.set(channel.language, entry);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function channelById(catalog: Catalog | undefined): Map<string, Channel> {
  return new Map((catalog?.channels ?? []).map((channel) => [channel.id, channel]));
}

export function countryFlag(catalog: Catalog | undefined, code: string): string {
  return catalog?.countries.find((country) => country.code === code)?.flag ?? '🌐';
}

export function countrySlug(catalog: Catalog | undefined, code: string): string | null {
  return catalog?.countries.find((country) => country.code === code)?.slug ?? null;
}

export function repoUrl(): string {
  return (import.meta.env.VITE_REPO_URL || 'https://github.com/worldstream-tv/worldstream-tv').replace(/\/$/, '');
}

export function reportIssueUrl(channel?: Channel, kind: 'broken' | 'copyright' = 'broken'): string {
  const title =
    kind === 'copyright'
      ? `Copyright / removal request${channel ? `: ${channel.name}` : ''}`
      : `Stream report${channel ? `: ${channel.name}` : ''}`;
  const body = channel
    ? `Channel: ${channel.name}\nChannel ID: ${channel.id}\nCountry: ${channel.countryName}\n\nDetails:\n`
    : 'Details:\n';
  const params = new URLSearchParams({ title, body, labels: kind === 'copyright' ? 'copyright' : 'stream-report' });
  return `${repoUrl()}/issues/new?${params.toString()}`;
}
