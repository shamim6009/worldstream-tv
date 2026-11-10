import { assertPublicHttpUrl, isPrivateAddress } from '../../scripts/lib/ssrf';
import { isBlocked, validateApprovedChannel } from '../../scripts/lib/validate-approved';

describe('SSRF guard', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.5.4',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fe80::1',
    'fd00::1',
    '::ffff:127.0.0.1',
  ])('treats %s as private', (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('treats %s as public', (address) => {
    expect(isPrivateAddress(address)).toBe(false);
  });

  it.each([
    'http://localhost/playlist.m3u',
    'http://127.0.0.1:8080/x',
    'http://169.254.169.254/latest/meta-data/',
    'http://metadata.google.internal/computeMetadata/v1/',
    'http://[::1]/x',
    'http://router.local/x',
    'file:///etc/passwd',
    'ftp://example.org/list.m3u',
    'https://user:pass@example.org/list.m3u',
    'not a url',
  ])('rejects %s', async (url) => {
    await expect(assertPublicHttpUrl(url)).rejects.toThrow();
  });

  it('accepts a public IP literal without DNS', async () => {
    await expect(assertPublicHttpUrl('https://1.1.1.1/dns-query')).resolves.toBeInstanceOf(URL);
  });
});

describe('blocklist', () => {
  const blocklist = { hosts: ['bad.example'], urls: ['https://cdn.example.org/pirated/'] };
  it('blocks hosts, subdomains and URL prefixes', () => {
    expect(isBlocked('https://bad.example/live.m3u8', blocklist)).toBe(true);
    expect(isBlocked('https://edge.bad.example/live.m3u8', blocklist)).toBe(true);
    expect(isBlocked('https://cdn.example.org/pirated/x.m3u8', blocklist)).toBe(true);
    expect(isBlocked('https://notbad.example/live.m3u8', blocklist)).toBe(false);
    expect(isBlocked('https://cdn.example.org/legit/x.m3u8', blocklist)).toBe(false);
  });
});

describe('approved channel validation', () => {
  const categories = new Set(['news', 'sports']);
  const valid = {
    id: 'example-news',
    name: 'Example News',
    country: 'GB',
    language: 'en',
    categories: ['news'],
    provider: 'Example Broadcaster',
    description: 'Rolling news.',
    authorization: 'public-broadcaster',
    authorizationNote: 'Published free on the broadcaster website.',
    officialWatchUrl: 'https://example.org/live',
    sources: [
      {
        id: 'example-news-s1',
        type: 'hls',
        url: 'https://example.org/live.m3u8',
        provider: 'Example',
        authorization: 'public-broadcaster',
      },
    ],
  };

  it('accepts a complete entry', () => {
    expect(validateApprovedChannel(valid, categories)).toEqual([]);
  });

  it('rejects http sources, unknown categories and missing authorization notes', () => {
    const errors = validateApprovedChannel(
      {
        ...valid,
        categories: ['piracy'],
        authorizationNote: '',
        sources: [{ ...valid.sources[0], url: 'http://example.org/live.m3u8' }],
      },
      categories,
    );
    expect(errors.join('\n')).toMatch(/unknown category/);
    expect(errors.join('\n')).toMatch(/authorizationNote/);
    expect(errors.join('\n')).toMatch(/https URL/);
  });

  it('rejects user-supplied authorization in the public catalog', () => {
    const errors = validateApprovedChannel({ ...valid, authorization: 'user-supplied' }, categories);
    expect(errors.some((error) => error.includes('authorization must be one of'))).toBe(true);
  });

  it('rejects blocklisted sources', () => {
    const errors = validateApprovedChannel(valid, categories, { hosts: ['example.org'], urls: [] });
    expect(errors.some((error) => error.includes('blocklist'))).toBe(true);
  });
});
