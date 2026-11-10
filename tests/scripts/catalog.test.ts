import { buildCatalog } from '../../scripts/lib/catalog-build';

/** Integrity checks over the real generated catalog. */
describe('generated catalog', () => {
  const catalog = buildCatalog(process.cwd(), 'https://example.test');

  it('has channels, countries and categories', () => {
    expect(catalog.channels.length).toBeGreaterThan(0);
    expect(catalog.stats.totalChannels).toBe(catalog.channels.length);
  });

  it('has unique channel ids and slugs', () => {
    expect(new Set(catalog.channels.map((channel) => channel.id)).size).toBe(catalog.channels.length);
    expect(new Set(catalog.channels.map((channel) => channel.slug)).size).toBe(catalog.channels.length);
  });

  it('has no duplicate stream URLs', () => {
    const urls = catalog.channels.flatMap((channel) => channel.sources.map((source) => source.url));
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('only publishes https sources with documented authorization', () => {
    for (const channel of catalog.channels) {
      expect(channel.sources.length).toBeGreaterThan(0);
      for (const source of channel.sources) {
        expect(source.url.startsWith('https://')).toBe(true);
        expect(source.authorization).not.toBe('user-supplied');
      }
    }
  });

  it('never marks a never-checked source as verified', () => {
    for (const channel of catalog.channels) {
      for (const source of channel.sources) {
        if (!source.lastCheckedAt) expect(source.status).not.toBe('verified');
      }
    }
  });

  it('counts match the channels that reference each country and category', () => {
    for (const country of catalog.countries) {
      expect(country.channelCount).toBe(catalog.channels.filter((channel) => channel.country === country.code).length);
    }
    for (const category of catalog.categories) {
      expect(category.channelCount).toBe(catalog.channels.filter((channel) => channel.categories.includes(category.id)).length);
    }
  });

  it('includes Bangladesh channels', () => {
    expect(catalog.channels.some((channel) => channel.country === 'BD')).toBe(true);
  });
});
