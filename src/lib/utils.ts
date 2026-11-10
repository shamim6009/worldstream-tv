export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function normalizeText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en', { notation: value >= 10_000 ? 'compact' : 'standard' }).format(value);
}

export function formatRelative(iso: string | undefined | null): string {
  if (!iso) return 'never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < 60) return formatter.format(seconds, 'second');
  if (abs < 3600) return formatter.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return formatter.format(Math.round(seconds / 3600), 'hour');
  if (abs < 2_592_000) return formatter.format(Math.round(seconds / 86_400), 'day');
  if (abs < 31_536_000) return formatter.format(Math.round(seconds / 2_592_000), 'month');
  return formatter.format(Math.round(seconds / 31_536_000), 'year');
}

export function formatTime(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

export function formatDate(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone,
  }).format(date);
}

export function initials(name: string): string {
  const parts = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'TV';
  if (parts.length === 1) return (parts[0] ?? 'TV').slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

export function absoluteUrl(path = ''): string {
  const base = import.meta.env.BASE_URL || '/';
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.replace(/^\//, '');
  const url = `${origin}${normalizedBase}${normalizedPath}`;
  return url.endsWith('/') ? url : url;
}

export function safeExternal(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export interface StatusMeta {
  label: string;
  shortLabel: string;
  description: string;
  badge: string;
  dot: string;
}

const STATUS_META: Record<string, StatusMeta> = {
  verified: {
    label: 'Verified',
    shortLabel: 'Verified',
    description: 'The source responded with a valid manifest and browser CORS headers at the last check.',
    badge: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    dot: 'bg-emerald-400',
  },
  'recently-available': {
    label: 'Recently available',
    shortLabel: 'Recent',
    description: 'The source worked recently but has not been checked in the latest run.',
    badge: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
    dot: 'bg-sky-400',
  },
  'temporarily-unavailable': {
    label: 'Temporarily unavailable',
    shortLabel: 'Offline',
    description: 'The last check could not reach a valid manifest. The broadcaster may be between broadcasts.',
    badge: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    dot: 'bg-amber-400',
  },
  'playback-restricted': {
    label: 'Browser-restricted',
    shortLabel: 'Restricted',
    description: 'The stream responds but cannot be embedded in a browser, usually due to CORS or embedding policy.',
    badge: 'border-orange-400/30 bg-orange-400/10 text-orange-300',
    dot: 'bg-orange-400',
  },
  'geo-restricted': {
    label: 'Region-limited',
    shortLabel: 'Region',
    description: 'The broadcaster limits this stream to specific countries.',
    badge: 'border-violet-400/30 bg-violet-400/10 text-violet-300',
    dot: 'bg-violet-400',
  },
  'auth-required': {
    label: 'Sign-in required',
    shortLabel: 'Sign-in',
    description: 'The provider requires an account or authentication to watch.',
    badge: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
    dot: 'bg-rose-400',
  },
  unknown: {
    label: 'Not yet checked',
    shortLabel: 'Unchecked',
    description: 'No automated status check has been recorded for this source yet.',
    badge: 'border-slate-400/30 bg-slate-400/10 text-slate-300',
    dot: 'bg-slate-400',
  },
  removed: {
    label: 'Removed',
    shortLabel: 'Removed',
    description: 'The source returned a permanent failure and has likely been removed by the provider.',
    badge: 'border-red-400/30 bg-red-400/10 text-red-300',
    dot: 'bg-red-400',
  },
};

export function statusMeta(status: string): StatusMeta {
  return STATUS_META[status] ?? STATUS_META.unknown!;
}

export function authorizationLabel(authorization: string): string {
  const labels: Record<string, string> = {
    'official-broadcaster': 'Official broadcaster stream',
    'public-broadcaster': 'Public broadcaster stream',
    'official-fast': 'Publisher-operated FAST channel',
    'official-youtube': 'Official YouTube channel',
    'provider-embed': 'Official provider page',
    'user-supplied': 'User-supplied local playlist',
  };
  return labels[authorization] ?? authorization;
}

export function sourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    hls: 'HLS',
    youtube: 'YouTube',
    provider: 'Provider',
  };
  return labels[type] ?? type.toUpperCase();
}

export function qualityLabel(quality: string | null | undefined): string {
  if (!quality) return 'Auto';
  return quality.toUpperCase();
}

export function isNow(start: string, stop: string): boolean {
  const now = Date.now();
  const from = new Date(start).getTime();
  const to = new Date(stop).getTime();
  return Number.isFinite(from) && Number.isFinite(to) && now >= from && now < to;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

/** Compact countdown label, e.g. "2d 4h 10m" or "12m 05s". */
export function countdown(ms: number): string {
  if (ms <= 0) return 'Starting';
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}
