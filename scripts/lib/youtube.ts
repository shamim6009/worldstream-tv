/**
 * Helpers for detecting whether a YouTube channel is live right now.
 *
 * YouTube stopped emitting the `"isLiveNow":true` flag that older versions of
 * `validate-streams.ts` relied on. Requiring both `isLiveNow` and
 * `isLiveContent` therefore made every YouTube source look offline, which
 * silently marked all 20 YouTube-backed channels (every Bangladeshi channel
 * among them) as `unknown`. The live flag now lives in `videoDetails.isLive`.
 */

export interface YouTubeLiveProbe {
  /** The channel is broadcasting live right now. */
  live: boolean;
  /** A scheduled/upcoming broadcast was found instead of a live one. */
  upcoming: boolean;
  /** The video ID YouTube resolved the `/live` URL to, when one was found. */
  videoId: string | null;
}

const VIDEO_ID_FROM_URL = /[?&]v=([\w-]{11})/;
const VIDEO_ID_FROM_BODY = /"videoId":"([\w-]{11})"/;

/** Characters inspected after `"videoDetails":{` — `isLive` sits near the start. */
const VIDEO_DETAILS_WINDOW = 2500;

/** Extracts the resolved video ID from a `/live` redirect URL or the page body. */
export function extractVideoId(url: string, body: string): string | null {
  const fromUrl = url.match(VIDEO_ID_FROM_URL)?.[1];
  if (fromUrl) return fromUrl;
  return body.match(VIDEO_ID_FROM_BODY)?.[1] ?? null;
}

/**
 * Detects the live state from a YouTube watch/channel page body.
 *
 * Primary signal is `videoDetails.isLive`. The legacy `"isLiveNow":true` flag is
 * still honoured so cached or older responses keep working.
 */
export function detectYouTubeLive(body: string, finalUrl = ''): YouTubeLiveProbe {
  const videoId = extractVideoId(finalUrl, body);

  const detailsIndex = body.indexOf('"videoDetails":{');
  const details =
    detailsIndex >= 0 ? body.slice(detailsIndex, detailsIndex + VIDEO_DETAILS_WINDOW) : '';

  const live = /"isLive":true/.test(details) || /"isLiveNow":true/.test(body);
  if (live) return { live: true, upcoming: false, videoId };

  const upcoming =
    /"isUpcoming":true/.test(body) ||
    /"isLive":false/.test(details) ||
    /"isLiveNow":false/.test(body);

  return { live: false, upcoming, videoId };
}
