import { detectYouTubeLive, extractVideoId } from '../../scripts/lib/youtube';

/** Minimal slice of a YouTube channel page, shaped like the real payload. */
function page(overrides: { details?: string; extra?: string } = {}): string {
  const details = overrides.details ?? '"videoId":"1na8me3DYKM","title":"SOMOY TV LIVE","lengthSeconds":"0","isLive":true';
  return `<!DOCTYPE html><html><head></head><body><script>var ytInitialPlayerResponse = {"videoDetails":{${details}},"microformat":{"playerMicroformatRenderer":{}}};</script>${overrides.extra ?? ''}</body></html>`;
}

describe('extractVideoId', () => {
  it('reads the id from a resolved watch URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=1na8me3DYKM', '')).toBe('1na8me3DYKM');
  });

  it('falls back to the page body', () => {
    expect(extractVideoId('https://www.youtube.com/channel/UCx/live', page())).toBe('1na8me3DYKM');
  });

  it('returns null when no id is present', () => {
    expect(extractVideoId('https://www.youtube.com/channel/UCx/live', '<html></html>')).toBeNull();
  });
});

describe('detectYouTubeLive', () => {
  it('detects a live broadcast from videoDetails.isLive (current YouTube markup)', () => {
    expect(detectYouTubeLive(page()).live).toBe(true);
  });

  it('detects a live broadcast from the legacy isLiveNow flag', () => {
    const body = page({ details: '"videoId":"aaaaaaaaaaa","isLive":false' });
    const legacy = `${body}"isLiveNow":true`;
    expect(detectYouTubeLive(legacy).live).toBe(true);
  });

  it('does not treat a static channel with isLiveContent as live', () => {
    // Regression: the old checker required isLiveNow AND isLiveContent, so every
    // channel failed. isLiveContent alone must still not count as live.
    const body = page({ details: '"videoId":"q6fgVVmdpgY","isLive":false,"isLiveContent":true' });
    expect(detectYouTubeLive(body).live).toBe(false);
  });

  it('does not treat an offline channel as live', () => {
    const body = page({ details: '"videoId":"q6fgVVmdpgY","title":"Latest upload","isLive":false' });
    const result = detectYouTubeLive(body);
    expect(result.live).toBe(false);
    expect(result.upcoming).toBe(true);
  });

  it('flags an upcoming broadcast', () => {
    const body = page({ details: '"videoId":"bbbbbbbbbbb","isLive":false' }) + '"isUpcoming":true';
    const result = detectYouTubeLive(body);
    expect(result.live).toBe(false);
    expect(result.upcoming).toBe(true);
  });

  it('returns not-live for an empty body without throwing', () => {
    expect(detectYouTubeLive('', '')).toEqual({ live: false, upcoming: false, videoId: null });
  });

  it('ignores an isLive flag that sits outside the videoDetails window', () => {
    const padding = `"pad":"${'a'.repeat(3000)}"`;
    const body = page({ details: `"videoId":"ccccccccccc","isLive":false,${padding}` });
    expect(detectYouTubeLive(body).live).toBe(false);
  });
});
