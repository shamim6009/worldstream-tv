import type { Authorization, SourceType } from '../../src/types/catalog';

/** Minimal shape needed for validation; mirrors ApprovedChannelSeed in catalog-build.ts. */
export interface ApprovedChannelLike {
  id?: unknown;
  name?: unknown;
  country?: unknown;
  language?: unknown;
  categories?: unknown;
  provider?: unknown;
  description?: unknown;
  authorization?: unknown;
  authorizationNote?: unknown;
  officialWatchUrl?: unknown;
  sources?: unknown;
}

export interface Blocklist {
  hosts: string[];
  urls: string[];
}

export const PUBLIC_AUTHORIZATIONS: Authorization[] = [
  'official-broadcaster',
  'public-broadcaster',
  'official-fast',
  'official-youtube',
  'provider-embed',
];

const SOURCE_TYPES: SourceType[] = ['hls', 'youtube', 'provider'];
const ID_RE = /^[a-z0-9][a-z0-9-]{1,80}$/;

const isNonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

function httpsUrl(value: unknown): URL | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

/** True when a URL's host (or a parent domain) or exact URL prefix is blocklisted. */
export function isBlocked(raw: string, blocklist: Blocklist | undefined): boolean {
  if (!blocklist) return false;
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return true;
  }
  if (blocklist.hosts.some((entry) => host === entry.toLowerCase() || host.endsWith(`.${entry.toLowerCase()}`))) {
    return true;
  }
  return blocklist.urls.some((prefix) => raw.startsWith(prefix));
}

/**
 * Validates one approved channel entry. Approved streams must be HTTPS, carry a
 * documented authorization, and use known categories. Returns human-readable errors.
 */
export function validateApprovedChannel(
  channel: ApprovedChannelLike,
  categoryIds: Set<string>,
  blocklist?: Blocklist,
): string[] {
  const label = typeof channel.id === 'string' ? channel.id : String(channel.name ?? '<unnamed>');
  const errors: string[] = [];
  const err = (message: string) => errors.push(`${label}: ${message}`);

  if (typeof channel.id !== 'string' || !ID_RE.test(channel.id)) err('id must be lowercase kebab-case');
  if (!isNonEmpty(channel.name)) err('name is required');
  if (typeof channel.country !== 'string' || !/^[A-Z]{2}$/.test(channel.country)) err('country must be an ISO 3166-1 alpha-2 code');
  if (typeof channel.language !== 'string' || !/^[a-z]{2,3}$/.test(channel.language)) err('language must be an ISO 639 code');
  if (!isNonEmpty(channel.provider)) err('provider is required');
  if (!isNonEmpty(channel.description)) err('description is required');
  if (!isNonEmpty(channel.authorizationNote)) err('authorizationNote must document why the stream is authorized');
  if (!PUBLIC_AUTHORIZATIONS.includes(channel.authorization as Authorization)) {
    err(`authorization must be one of ${PUBLIC_AUTHORIZATIONS.join(', ')}`);
  }
  if (channel.officialWatchUrl != null && channel.officialWatchUrl !== '' && !httpsUrl(channel.officialWatchUrl)) {
    err('officialWatchUrl must be an https URL');
  }

  if (!Array.isArray(channel.categories) || channel.categories.length === 0) {
    err('at least one category is required');
  } else {
    for (const category of channel.categories) {
      if (typeof category !== 'string' || !categoryIds.has(category)) err(`unknown category "${String(category)}"`);
    }
  }

  if (!Array.isArray(channel.sources) || channel.sources.length === 0) {
    err('at least one source is required');
    return errors;
  }
  const seen = new Set<string>();
  for (const [index, raw] of channel.sources.entries()) {
    const source = (raw ?? {}) as Record<string, unknown>;
    const where = `source[${index}]`;
    if (typeof source.id !== 'string' || !ID_RE.test(source.id)) err(`${where}.id must be kebab-case`);
    else if (seen.has(source.id)) err(`${where}.id "${source.id}" is duplicated`);
    else seen.add(source.id);
    if (!SOURCE_TYPES.includes(source.type as SourceType)) err(`${where}.type must be hls, youtube or provider`);
    const url = httpsUrl(source.url);
    if (!url) err(`${where}.url must be an https URL without credentials`);
    else if (isBlocked(url.toString(), blocklist)) err(`${where}.url is on the blocklist in data/sources.json`);
    if (source.type === 'youtube' && url && !/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(url.hostname)) {
      err(`${where} is type youtube but not a youtube.com URL`);
    }
    if (!isNonEmpty(source.provider)) err(`${where}.provider is required`);
    if (!PUBLIC_AUTHORIZATIONS.includes(source.authorization as Authorization)) err(`${where}.authorization is invalid`);
  }
  return errors;
}
