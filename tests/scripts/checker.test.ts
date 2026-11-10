import fs from 'node:fs';
import path from 'node:path';
import { probeUrl, validateManifest } from '../../scripts/lib/http';
import {
  deriveChannelStatus,
  isTransientFailure,
  reconcileWithPrevious,
  type SourceStatusRecord,
} from '../../scripts/lib/status';
import { parseXmltv, parseXmltvDate } from '../../scripts/lib/xmltv';
import type { StreamSource } from '../../src/types/catalog';

const fixtures = path.join(process.cwd(), 'tests', 'fixtures', 'hls');

describe('validateManifest', () => {
  it('recognizes a master playlist', () => {
    const body = fs.readFileSync(path.join(fixtures, 'master.m3u8'), 'utf8');
    expect(validateManifest(body, 'application/vnd.apple.mpegurl')).toMatchObject({ valid: true, kind: 'hls-master', variantCount: 2 });
  });

  it('recognizes a media playlist', () => {
    const body = fs.readFileSync(path.join(fixtures, 'media.m3u8'), 'utf8');
    expect(validateManifest(body, 'application/x-mpegURL')).toMatchObject({ valid: true, kind: 'hls-media' });
  });

  it('does not treat an HTML error page with HTTP 200 as playable', () => {
    expect(validateManifest('<!DOCTYPE html><html><body>Not available</body></html>', 'text/html')).toMatchObject({
      valid: false,
      kind: 'html',
    });
  });

  it('rejects an HLS content-type with a non-HLS body', () => {
    expect(validateManifest('{"error":"forbidden"}', 'application/vnd.apple.mpegurl').valid).toBe(false);
  });

  it('rejects an empty playlist', () => {
    expect(validateManifest('#EXTM3U\n', 'application/vnd.apple.mpegurl').valid).toBe(false);
  });
});

describe('probeUrl failure handling', () => {
  it('returns a structured error for blocked addresses instead of throwing', async () => {
    const result = await probeUrl('http://127.0.0.1/x.m3u8');
    expect(result.ok).toBe(false);
    expect(result.status).toBeNull();
    expect(result.error).toMatch(/Blocked/);
  });
});

function source(status: StreamSource['status']): StreamSource {
  return { id: status, type: 'hls', url: 'https://x', provider: 'x', authorization: 'official-broadcaster', status };
}

describe('deriveChannelStatus', () => {
  it('uses the best source status', () => {
    expect(deriveChannelStatus([source('temporarily-unavailable'), source('verified')])).toBe('verified');
    expect(deriveChannelStatus([source('unknown'), source('temporarily-unavailable')])).not.toBe('verified');
  });

  it('marks a channel with no sources as removed', () => {
    expect(deriveChannelStatus([])).toBe('removed');
  });
});

describe('XMLTV parsing', () => {
  const xml = `<?xml version="1.0"?><tv>
    <programme start="20261110180000 +0000" stop="20261110190000 +0000" channel="Example.uk">
      <title lang="en">Evening News &amp; Weather</title><desc>Headlines.</desc>
    </programme>
    <programme start="20261110170000 +0000" stop="20261110180000 +0000" channel="Example.uk">
      <title>Earlier Show</title>
    </programme>
    <programme start="bad" stop="20261110180000 +0000" channel="Example.uk"><title>Broken</title></programme>
  </tv>`;

  it('parses programmes, decodes entities, sorts and skips invalid rows', () => {
    const parsed = parseXmltv(xml);
    const list = parsed.channels['Example.uk'] ?? [];
    expect(list.map((program) => program.title)).toEqual(['Earlier Show', 'Evening News & Weather']);
    expect(list[1]?.description).toBe('Headlines.');
  });

  it('converts XMLTV timestamps with offsets to ISO', () => {
    expect(parseXmltvDate('20261110180000 +0600')).toBe('2026-11-10T12:00:00.000Z');
  });
});

describe('status history', () => {
  const base: SourceStatusRecord = {
    channelId: 'c',
    sourceId: 's',
    status: 'temporarily-unavailable',
    httpStatus: null,
    cors: null,
    error: 'timeout',
    checkedAt: '2026-11-10T12:00:00.000Z',
  };
  const now = Date.parse('2026-11-10T12:00:00.000Z');

  it('retries only transient failures', () => {
    expect(isTransientFailure(base)).toBe(true);
    expect(isTransientFailure({ ...base, httpStatus: 503 })).toBe(true);
    expect(isTransientFailure({ ...base, status: 'removed', httpStatus: 404 })).toBe(false);
  });

  it('marks a transient failure soon after verification as recently-available', () => {
    const previous = { ...base, status: 'verified' as const, checkedAt: '2026-11-10T06:00:00.000Z' };
    const result = reconcileWithPrevious(base, previous, now);
    expect(result.status).toBe('recently-available');
    expect(result.lastVerifiedAt).toBe('2026-11-10T06:00:00.000Z');
  });

  it('reports offline once the last verification is too old', () => {
    const previous = { ...base, status: 'recently-available' as const, lastVerifiedAt: '2026-11-07T00:00:00.000Z' };
    expect(reconcileWithPrevious(base, previous, now).status).toBe('temporarily-unavailable');
  });

  it('never upgrades a permanent failure', () => {
    const previous = { ...base, status: 'verified' as const };
    expect(reconcileWithPrevious({ ...base, status: 'removed', httpStatus: 404 }, previous, now).status).toBe('removed');
  });
});
