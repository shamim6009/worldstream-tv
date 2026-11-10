import { filterChannels, playbackOrder, relatedChannels, sortChannels } from '../../src/lib/channels';
import { nowAndNext, programsOnDay } from '../../src/lib/epg';
import { parseLocalPlaylist } from '../../src/lib/playlist';
import { searchChannels } from '../../src/lib/search';
import { countdown, safeExternal } from '../../src/lib/utils';
import { classifyHttpStatus } from '../../src/components/player/playerErrors';
import { makeChannel, makeSource } from './factory';

const channels = [
  makeChannel({ id: 'jamuna-tv', name: 'Jamuna TV', country: 'BD', countryName: 'Bangladesh', language: 'bn', languageName: 'Bengali', status: 'verified', addedAt: '2026-11-05' }),
  makeChannel({ id: 't-sports', name: 'T Sports', country: 'BD', countryName: 'Bangladesh', language: 'bn', languageName: 'Bengali', categories: ['sports'], sports: ['cricket', 'football'] }),
  makeChannel({ id: 'france-24', name: 'France 24 English', country: 'FR', countryName: 'France', altNames: ['F24'], status: 'temporarily-unavailable' }),
  makeChannel({ id: 'nhk-world', name: 'NHK World Japan', country: 'JP', countryName: 'Japan', categories: ['news', 'culture'] }),
];

describe('searchChannels', () => {
  it('ranks exact and prefix name matches first', () => {
    expect(searchChannels(channels, 'jamuna')[0]?.id).toBe('jamuna-tv');
    expect(searchChannels(channels, 'France 24')[0]?.id).toBe('france-24');
  });

  it('matches country, language, sport and alternate names', () => {
    expect(searchChannels(channels, 'bangladesh').map((c) => c.id).sort()).toEqual(['jamuna-tv', 't-sports']);
    expect(searchChannels(channels, 'bengali')).toHaveLength(2);
    expect(searchChannels(channels, 'cricket').map((c) => c.id)).toEqual(['t-sports']);
    expect(searchChannels(channels, 'f24').map((c) => c.id)).toEqual(['france-24']);
  });

  it('requires every token to match and ignores accents/case', () => {
    expect(searchChannels(channels, 'japan sports')).toEqual([]);
    expect(searchChannels(channels, 'NHK wörld')[0]?.id).toBe('nhk-world');
  });

  it('stays fast for thousands of channels', () => {
    const many = Array.from({ length: 5000 }, (_, index) => makeChannel({ id: `c-${index}`, name: `Channel ${index}` }));
    const started = performance.now();
    searchChannels(many, 'channel 42');
    expect(performance.now() - started).toBeLessThan(500);
  });
});

describe('filter / sort / related', () => {
  it('filters by country, category, sport and availability', () => {
    expect(filterChannels(channels, { country: 'BD' })).toHaveLength(2);
    expect(filterChannels(channels, { category: 'culture' }).map((c) => c.id)).toEqual(['nhk-world']);
    expect(filterChannels(channels, { sport: 'football' }).map((c) => c.id)).toEqual(['t-sports']);
    expect(filterChannels(channels, { status: 'available' }).map((c) => c.id)).toEqual(['jamuna-tv']);
    expect(filterChannels(channels, { favoritesOnly: true, favoriteIds: ['nhk-world'] }).map((c) => c.id)).toEqual(['nhk-world']);
  });

  it('sorts alphabetically, by recency and by status', () => {
    expect(sortChannels(channels, 'name-asc')[0]?.name).toBe('France 24 English');
    expect(sortChannels(channels, 'name-desc')[0]?.name).toBe('T Sports');
    expect(sortChannels(channels, 'recent')[0]?.id).toBe('jamuna-tv');
    expect(sortChannels(channels, 'status')[0]?.status).toBe('verified');
  });

  it('suggests related channels from the same country first', () => {
    expect(relatedChannels(channels[0]!, channels)[0]?.country).toBe('BD');
  });
});

describe('playbackOrder', () => {
  it('puts playable primary sources first, provider links last, and drops removed sources', () => {
    const ordered = playbackOrder([
      makeSource({ id: 'provider', type: 'provider' }),
      makeSource({ id: 'backup', status: 'verified' }),
      makeSource({ id: 'gone', status: 'removed' }),
      makeSource({ id: 'primary', isPrimary: true }),
    ]);
    expect(ordered.map((source) => source.id)).toEqual(['primary', 'backup', 'provider']);
  });
});

describe('parseLocalPlaylist', () => {
  it('parses entries, keeps groups and logos, and drops duplicate URLs', () => {
    const result = parseLocalPlaylist(
      '#EXTM3U\n#EXTINF:-1 tvg-logo="https://x.test/l.png" group-title="BDIX",Local One\nhttp://10.0.0.5/one.m3u8\n#EXTINF:-1,Dup\nhttp://10.0.0.5/one.m3u8\n#EXTINF:-1,Two\n#EXTGRP:Movies\nhttps://isp.example/two.m3u8',
      'My ISP',
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ name: 'Local One', group: 'BDIX', logo: 'https://x.test/l.png', playlistName: 'My ISP' });
    expect(result[1]?.group).toBe('Movies');
  });

  it('rejects non-http(s) URLs such as javascript: and file:', () => {
    const result = parseLocalPlaylist('#EXTM3U\n#EXTINF:-1,Bad\njavascript:alert(1)\n#EXTINF:-1,File\nfile:///etc/passwd', 'x');
    expect(result).toEqual([]);
  });

  it('respects the import limit', () => {
    const body = Array.from({ length: 20 }, (_, index) => `#EXTINF:-1,C${index}\nhttps://x.test/${index}.m3u8`).join('\n');
    expect(parseLocalPlaylist(body, 'x', 5)).toHaveLength(5);
  });
});

describe('EPG helpers', () => {
  const now = Date.parse('2026-11-10T12:30:00Z');
  const programs = [
    { start: '2026-11-10T12:00:00Z', stop: '2026-11-10T13:00:00Z', title: 'Midday' },
    { start: '2026-11-10T13:00:00Z', stop: '2026-11-10T14:00:00Z', title: 'Afternoon' },
    { start: '2026-11-11T09:00:00Z', stop: '2026-11-11T10:00:00Z', title: 'Tomorrow' },
  ];
  it('finds the current and upcoming programmes', () => {
    const { current, upcoming } = nowAndNext(programs, now);
    expect(current?.title).toBe('Midday');
    expect(upcoming.map((p) => p.title)).toEqual(['Afternoon', 'Tomorrow']);
  });
  it('returns nothing when there is no guide data (never invents a schedule)', () => {
    expect(nowAndNext([], now)).toEqual({ current: null, upcoming: [] });
  });
  it('selects programmes overlapping a day', () => {
    expect(programsOnDay(programs, new Date('2026-11-11T00:00:00Z')).map((p) => p.title)).toEqual(['Tomorrow']);
  });
});

describe('utils', () => {
  it('formats countdowns', () => {
    expect(countdown(0)).toBe('Starting');
    expect(countdown(65_000)).toBe('1m 05s');
    expect(countdown(2 * 86_400_000 + 3 * 3_600_000)).toBe('2d 3h 0m');
  });
  it('only allows http(s) external links', () => {
    expect(safeExternal('javascript:alert(1)')).toBeNull();
    expect(safeExternal('https://example.org/x')).toBe('https://example.org/x');
  });
  it('classifies playback HTTP failures', () => {
    expect(classifyHttpStatus(403).kind).toBe('forbidden');
    expect(classifyHttpStatus(404).kind).toBe('not-found');
    expect(classifyHttpStatus(0).kind).toBe('cors');
    expect(classifyHttpStatus(503)).toMatchObject({ kind: 'network', retryable: true });
  });
});
