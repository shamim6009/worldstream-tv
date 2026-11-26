import { parseRss, plainText } from '../../scripts/lib/rss';

const FEED = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"><channel><title>Cricket news from Cricinfo.com</title>
  <item>
    <title><![CDATA[Australia seal series with <b>late</b> collapse]]></title>
    <link>https://www.espncricinfo.com/story/australia-seal-series-1234</link>
    <description><![CDATA[<p>Smith &amp; Cummins shared six wickets.</p>]]></description>
    <pubDate>Sun, 23 Nov 2026 10:15:00 GMT</pubDate>
    <guid>1234</guid>
  </item>
  <item>
    <title>No link here</title>
    <description>Should be dropped</description>
  </item>
</channel></rss>`;

describe('plainText', () => {
  it('strips tags, decodes entities and collapses whitespace', () => {
    expect(plainText('<p>Smith &amp; Cummins&nbsp;shared</p>')).toBe('Smith & Cummins shared');
  });

  it('decodes numeric entities', () => {
    expect(plainText('It&#8217;s over')).toBe('It’s over');
  });
});

describe('parseRss', () => {
  it('reads items with a title, link and summary', () => {
    const items = parseRss(FEED);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'Australia seal series with late collapse',
      link: 'https://www.espncricinfo.com/story/australia-seal-series-1234',
      description: 'Smith & Cummins shared six wickets.',
      guid: '1234',
    });
    expect(items[0]?.publishedAt).toBe('2026-11-23T10:15:00.000Z');
  });

  it('drops an item with no usable link', () => {
    expect(parseRss(FEED).some((item) => item.title === 'No link here')).toBe(false);
  });

  it('caps the summary so articles are never reproduced', () => {
    const long = `<rss><channel><item><title>T</title><link>https://x.test/a</link><description>${'a'.repeat(900)}</description></item></channel></rss>`;
    expect(parseRss(long)[0]?.description.length).toBeLessThanOrEqual(240);
  });

  it('returns an empty list for junk input instead of throwing', () => {
    expect(parseRss('')).toHaveLength(0);
    expect(parseRss('<html><body>not a feed</body></html>')).toHaveLength(0);
  });

  it('keeps a null timestamp when the date is unparseable', () => {
    const bad = `<rss><channel><item><title>T</title><link>https://x.test/a</link><pubDate>not a date</pubDate></item></channel></rss>`;
    expect(parseRss(bad)[0]?.publishedAt).toBeNull();
  });
});
