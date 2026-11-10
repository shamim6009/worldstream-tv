import type { Channel, StreamSource } from '../../src/types/catalog';

export function makeSource(overrides: Partial<StreamSource> = {}): StreamSource {
  return {
    id: 'src-1',
    type: 'hls',
    url: 'https://example.org/live.m3u8',
    provider: 'Example',
    authorization: 'official-broadcaster',
    status: 'unknown',
    ...overrides,
  };
}

export function makeChannel(overrides: Partial<Channel> = {}): Channel {
  const id = overrides.id ?? 'example-news';
  return {
    id,
    slug: id,
    name: 'Example News',
    country: 'GB',
    countryName: 'United Kingdom',
    language: 'en',
    languageName: 'English',
    categories: ['news'],
    description: 'Rolling news.',
    provider: 'Example Broadcaster',
    sources: [makeSource({ id: `${id}-s1` })],
    status: 'unknown',
    region: 'Europe',
    addedAt: '2026-11-01',
    updatedAt: '2026-11-01',
    authorization: 'official-broadcaster',
    ...overrides,
  };
}
