export type Region =
  | 'Asia'
  | 'Europe'
  | 'Africa'
  | 'North America'
  | 'South America'
  | 'Oceania'
  | 'Middle East';

export type StreamStatus =
  | 'verified'
  | 'recently-available'
  | 'temporarily-unavailable'
  | 'playback-restricted'
  | 'geo-restricted'
  | 'auth-required'
  | 'unknown'
  | 'removed';

export type SourceType = 'hls' | 'youtube' | 'provider';

export type Authorization =
  | 'official-broadcaster'
  | 'public-broadcaster'
  | 'official-fast'
  | 'official-youtube'
  | 'provider-embed'
  | 'user-supplied';

export interface StreamSource {
  id: string;
  type: SourceType;
  /** HLS manifest URL, YouTube live URL, or provider watch URL. */
  url: string;
  provider: string;
  label?: string;
  quality?: string;
  authorization: Authorization;
  authorizationNote?: string;
  status: StreamStatus;
  lastCheckedAt?: string;
  httpStatus?: number | null;
  cors?: boolean | null;
  error?: string | null;
  isPrimary?: boolean;
  regionNote?: string;
}

export interface Channel {
  id: string;
  slug: string;
  name: string;
  altNames?: string[];
  country: string;
  countryName: string;
  language: string;
  languageName: string;
  categories: string[];
  sports?: string[];
  logo?: string | null;
  description: string;
  quality?: string | null;
  isHd?: boolean;
  provider: string;
  sources: StreamSource[];
  status: StreamStatus;
  featured?: boolean;
  region: Region;
  epgId?: string;
  officialWatchUrl?: string;
  addedAt: string;
  updatedAt: string;
  verifiedAt?: string;
  authorization: Authorization;
  notes?: string;
}

export interface CatalogCountry {
  code: string;
  name: string;
  slug: string;
  flag: string;
  region: Region;
  channelCount: number;
}

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  channelCount: number;
}

export interface Catalog {
  version: number;
  generatedAt: string;
  siteUrl: string;
  channels: Channel[];
  countries: CatalogCountry[];
  categories: CatalogCategory[];
  stats: {
    totalChannels: number;
    verifiedChannels: number;
    countries: number;
    categories: number;
    sources: number;
  };
}

export interface EpgProgram {
  start: string;
  stop: string;
  title: string;
  description?: string;
  category?: string;
}

export interface EpgData {
  generatedAt: string;
  timezone: string;
  channels: Record<string, EpgProgram[]>;
}

export interface SportsEvent {
  id: string;
  title: string;
  sport: string;
  competition: string;
  startTime: string;
  endTime: string;
  region: string;
  provider: string;
  watchUrl: string;
  channelIds: string[];
  verifiedAt: string;
  source: string;
  note?: string;
  /** Present on auto-synced fixtures; absent on hand-curated events. */
  status?: 'scheduled' | 'live' | 'finished';
  homeTeam?: string;
  awayTeam?: string;
  /** Cricket scores can be "187/6", so scores stay strings. */
  homeScore?: string | null;
  awayScore?: string | null;
  /** Where the data came from, so the card can link to it. */
  sourceUrl?: string;
}

export interface SportsEventData {
  generatedAt: string;
  events: SportsEvent[];
}

export interface LocalPlaylistChannel {
  id: string;
  name: string;
  url: string;
  logo: string | null;
  group: string | null;
  importedAt: string;
  playlistName: string;
}

export interface SearchableChannel {
  channel: Channel;
  haystack: string;
  tokens: string[];
}
