import { extractQuality, parseM3U } from '../../scripts/lib/m3u';
import { canonicalKey, dedupeByUrl, normalizeEntries, normalizeName, slugify } from '../../scripts/lib/normalize';

const BOM = String.fromCharCode(0xfeff);
const PLAYLIST = `${BOM}#EXTM3U x-tvg-url="https://example.org/guide.xml"
#EXTINF:-1 tvg-id="AlJazeera.qa" tvg-logo="https://example.org/aj.png" group-title="News",Al Jazeera English (1080p)
#EXTVLCOPT:http-user-agent=Mozilla/5.0
https://live.example.org/aje/index.m3u8
#EXTINF:-1 tvg-id="AlJazeera.qa" group-title="News",Al Jazeera English (720p)
https://backup.example.org/aje/index.m3u8
#EXTINF:-1 tvg-country="BD" group-title="Entertainment",Channel i HD
https://bd.example.org/channeli.m3u8\r
# a comment line
#EXTINF:-1,Missing URL entry

#EXTINF:-1 group-title="News",Duplicate URL
https://live.example.org/aje/index.m3u8
`;

describe('parseM3U', () => {
  const entries = parseM3U(PLAYLIST);

  it('extracts name, url and attributes from #EXTINF entries', () => {
    const first = entries[0];
    expect(first?.name).toBe('Al Jazeera English (1080p)');
    expect(first?.url).toBe('https://live.example.org/aje/index.m3u8');
    expect(first?.tvgId).toBe('AlJazeera.qa');
    expect(first?.logo).toBe('https://example.org/aj.png');
    expect(first?.group).toBe('News');
  });

  it('handles BOM, CRLF, comments and VLC option lines', () => {
    const channelI = entries.find((entry) => entry.name === 'Channel i HD');
    expect(channelI?.url).toBe('https://bd.example.org/channeli.m3u8');
    expect(channelI?.country?.toUpperCase()).toBe('BD');
    expect(entries.every((entry) => !entry.url.startsWith('#'))).toBe(true);
  });

  it('returns nothing for an empty or non-playlist body', () => {
    expect(parseM3U('')).toEqual([]);
    expect(parseM3U('<html>not a playlist</html>')).toEqual([]);
  });
});

describe('quality and name normalization', () => {
  it('detects resolution and HD markers', () => {
    expect(extractQuality('News (1080p)')).toEqual({ quality: '1080p', isHd: true });
    expect(extractQuality('Movies HD')).toEqual({ quality: '720p', isHd: true });
    expect(extractQuality('Kids SD')).toEqual({ quality: '480p', isHd: false });
    expect(extractQuality('Plain')).toEqual({ quality: null, isHd: false });
  });

  it('normalizes names for matching', () => {
    expect(normalizeName('Al Jazeera English [Geo-blocked] (1080p)')).toContain('al jazeera english');
    expect(normalizeName('Channel i HD')).toBe('channel i');
    expect(canonicalKey('Channel i HD', 'bd')).toBe(canonicalKey('Channel i', 'BD'));
  });

  it('creates URL-safe slugs', () => {
    expect(slugify('Ekattor TV & News!')).toBe('ekattor-tv-and-news');
    expect(slugify('Télé Québec')).toBe('tele-quebec');
  });
});

describe('normalizeEntries / dedupe', () => {
  const drafts = normalizeEntries(parseM3U(PLAYLIST), 'test', null);

  it('merges entries for the same channel and keeps backup URLs', () => {
    const aje = drafts.find((draft) => draft.tvgId === 'AlJazeera.qa');
    expect(aje).toBeDefined();
    expect(aje?.urls).toEqual([
      'https://live.example.org/aje/index.m3u8',
      'https://backup.example.org/aje/index.m3u8',
    ]);
    expect(drafts.filter((draft) => draft.tvgId === 'AlJazeera.qa')).toHaveLength(1);
  });

  it('removes duplicate URLs across different channel records', () => {
    const deduped = dedupeByUrl(drafts);
    const allUrls = deduped.flatMap((draft) => draft.urls);
    expect(new Set(allUrls).size).toBe(allUrls.length);
  });
});
