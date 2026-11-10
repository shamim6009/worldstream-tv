import fs from 'node:fs';
import type { StreamSource, StreamStatus } from '../../src/types/catalog';

export interface SourceStatusRecord {
  channelId: string;
  sourceId: string;
  status: StreamStatus;
  httpStatus: number | null;
  cors: boolean | null;
  error: string | null;
  checkedAt: string;
  manifestKind?: string;
  finalUrl?: string;
  /** Last time this source passed a full check. */
  lastVerifiedAt?: string;
}

export interface StreamStatusFile {
  version: number;
  checkedAt: string;
  sources: Record<string, SourceStatusRecord>;
}

export const EMPTY_STATUS_FILE: StreamStatusFile = {
  version: 1,
  checkedAt: new Date(0).toISOString(),
  sources: {},
};

export function readStatusFile(filePath: string): StreamStatusFile {
  if (!fs.existsSync(filePath)) return EMPTY_STATUS_FILE;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<StreamStatusFile>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.sources !== 'object' || !parsed.sources) {
      return EMPTY_STATUS_FILE;
    }
    return {
      version: parsed.version ?? 1,
      checkedAt: parsed.checkedAt ?? EMPTY_STATUS_FILE.checkedAt,
      sources: parsed.sources,
    };
  } catch {
    return EMPTY_STATUS_FILE;
  }
}

const STATUS_PRIORITY: StreamStatus[] = [
  'verified',
  'recently-available',
  'geo-restricted',
  'auth-required',
  'playback-restricted',
  'temporarily-unavailable',
  'unknown',
  'removed',
];

export function deriveChannelStatus(sources: StreamSource[]): StreamStatus {
  if (sources.length === 0) return 'removed';
  const present = new Set(sources.map((source) => source.status));
  for (const status of STATUS_PRIORITY) {
    if (present.has(status)) return status;
  }
  return 'unknown';
}

export function applyStatuses(
  channelId: string,
  sources: StreamSource[],
  statuses: StreamStatusFile,
): StreamSource[] {
  return sources.map((source) => {
    const record = statuses.sources[source.id];
    if (!record || record.channelId !== channelId) return source;
    return {
      ...source,
      status: record.status,
      lastCheckedAt: record.checkedAt,
      httpStatus: record.httpStatus,
      cors: record.cors,
      error: record.error,
    };
  });
}

export function firstVerifiedAt(sources: StreamSource[]): string | undefined {
  const verified = sources
    .filter((source) => source.status === 'verified' && source.lastCheckedAt)
    .map((source) => source.lastCheckedAt as string)
    .sort();
  return verified[0];
}

/** A source that verified within this window and now fails transiently is "recently available". */
export const RECENT_WINDOW_MS = 48 * 60 * 60 * 1000;

/** True when a failed check is worth retrying (timeouts, network errors, 5xx). */
export function isTransientFailure(record: SourceStatusRecord): boolean {
  return (
    record.status === 'temporarily-unavailable' && (record.httpStatus === null || record.httpStatus >= 500)
  );
}

/**
 * Carries verification history forward. A transient failure shortly after a
 * successful check is reported as "recently-available" instead of offline.
 */
export function reconcileWithPrevious(
  next: SourceStatusRecord,
  previous: SourceStatusRecord | undefined,
  now = Date.now(),
): SourceStatusRecord {
  if (next.status === 'verified') return { ...next, lastVerifiedAt: next.checkedAt };
  const lastVerifiedAt =
    previous?.lastVerifiedAt ?? (previous?.status === 'verified' ? previous.checkedAt : undefined);
  if (!lastVerifiedAt) return next;
  const recent = now - Date.parse(lastVerifiedAt) <= RECENT_WINDOW_MS;
  if (recent && next.status === 'temporarily-unavailable') {
    return { ...next, status: 'recently-available', lastVerifiedAt };
  }
  return { ...next, lastVerifiedAt };
}
