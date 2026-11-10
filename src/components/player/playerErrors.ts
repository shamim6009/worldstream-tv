export type PlaybackErrorKind =
  | 'network'
  | 'forbidden'
  | 'not-found'
  | 'cors'
  | 'media'
  | 'mixed-content'
  | 'unsupported'
  | 'unknown';

export interface PlaybackError {
  kind: PlaybackErrorKind;
  message: string;
  /** Whether trying the same source again might help. */
  retryable: boolean;
}

const MESSAGES: Record<PlaybackErrorKind, string> = {
  network: 'The stream is not responding right now. The broadcaster may be offline or between programmes.',
  forbidden:
    'The provider refused this connection (HTTP 403). The stream is likely limited to certain countries or networks.',
  'not-found': 'The provider no longer serves this stream address (HTTP 404). It may have moved or been retired.',
  cors: 'The provider does not allow playback from other websites (browser CORS policy). Use the official page instead.',
  media: 'The video data could not be decoded by this browser.',
  'mixed-content':
    'This stream uses plain HTTP, which browsers block on secure (HTTPS) pages. It may only work in a player app on your local network.',
  unsupported: 'This browser cannot play HLS video. Try a recent version of Chrome, Edge, Firefox or Safari.',
  unknown: 'This stream could not be played in the browser.',
};

export function playbackError(kind: PlaybackErrorKind, retryable = false): PlaybackError {
  return { kind, message: MESSAGES[kind], retryable };
}

/** Maps an HTTP status from a manifest/segment request to a playback error. */
export function classifyHttpStatus(code: number | undefined): PlaybackError {
  if (code === 403 || code === 401 || code === 451) return playbackError('forbidden');
  if (code === 404 || code === 410) return playbackError('not-found');
  // hls.js reports 0 when the request was blocked before a response was readable (CORS, DNS, offline).
  if (code === 0) return playbackError('cors');
  if (code && code >= 500) return playbackError('network', true);
  return playbackError('network', true);
}

export function isMixedContent(url: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:' && url.startsWith('http:');
}
