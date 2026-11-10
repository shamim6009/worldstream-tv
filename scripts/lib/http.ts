export interface HttpProbeOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
  method?: 'GET' | 'HEAD';
}

export interface HttpProbeResult {
  ok: boolean;
  status: number | null;
  finalUrl: string;
  contentType: string | null;
  cors: boolean | null;
  body: string;
  error: string | null;
  redirects: string[];
  elapsedMs: number;
}

import { assertPublicHttpUrl } from './ssrf';

export const DEFAULT_USER_AGENT =
  'WorldStreamTV/1.0 (+https://github.com/worldstream-tv; stream-status-checker)';

export async function probeUrl(
  rawUrl: string,
  options: HttpProbeOptions = {},
  redirects: string[] = [],
): Promise<HttpProbeResult> {
  const started = Date.now();
  const timeoutMs = options.timeoutMs ?? 12_000;
  const maxBytes = options.maxBytes ?? 256 * 1024;
  const maxRedirects = options.maxRedirects ?? 5;

  let url: URL;
  try {
    url = await assertPublicHttpUrl(rawUrl);
  } catch (error) {
    return {
      ok: false,
      status: null,
      finalUrl: rawUrl,
      contentType: null,
      cors: null,
      body: '',
      error: error instanceof Error ? error.message : 'Blocked URL',
      redirects,
      elapsedMs: Date.now() - started,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'user-agent': DEFAULT_USER_AGENT,
        accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, application/dash+xml, text/plain, */*',
        origin: 'https://worldstream.tv',
        ...options.headers,
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        return {
          ok: false,
          status: response.status,
          finalUrl: url.toString(),
          contentType: response.headers.get('content-type'),
          cors: response.headers.has('access-control-allow-origin'),
          body: '',
          error: 'Redirect without Location header',
          redirects,
          elapsedMs: Date.now() - started,
        };
      }
      if (redirects.length >= maxRedirects) {
        return {
          ok: false,
          status: response.status,
          finalUrl: url.toString(),
          contentType: null,
          cors: null,
          body: '',
          error: 'Too many redirects',
          redirects,
          elapsedMs: Date.now() - started,
        };
      }
      const next = new URL(location, url).toString();
      return probeUrl(next, options, [...redirects, next]);
    }

    const contentType = response.headers.get('content-type');
    const corsHeader = response.headers.get('access-control-allow-origin');
    const cors = corsHeader === '*' || (corsHeader?.includes('worldstream') ?? false);

    let body = '';
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let received = 0;
      while (received < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        body += decoder.decode(value, { stream: true });
        if (body.includes('#EXT-X-ENDLIST') && body.length > 2048) break;
      }
      await reader.cancel().catch(() => undefined);
    }

    return {
      ok: response.ok,
      status: response.status,
      finalUrl: url.toString(),
      contentType,
      cors,
      body,
      error: response.ok ? null : `HTTP ${response.status}`,
      redirects,
      elapsedMs: Date.now() - started,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? `Timed out after ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : 'Network error';
    return {
      ok: false,
      status: null,
      finalUrl: url.toString(),
      contentType: null,
      cors: null,
      body: '',
      error: message,
      redirects,
      elapsedMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface ManifestValidation {
  valid: boolean;
  kind: 'hls-master' | 'hls-media' | 'dash' | 'html' | 'unknown';
  variantCount: number;
  reason?: string;
}

export function validateManifest(body: string, contentType: string | null): ManifestValidation {
  const trimmed = body.trimStart();
  const type = (contentType ?? '').toLowerCase();

  if (trimmed.startsWith('#EXTM3U') || type.includes('mpegurl')) {
    if (!trimmed.startsWith('#EXTM3U')) {
      return { valid: false, kind: 'hls-media', variantCount: 0, reason: 'Missing #EXTM3U header' };
    }
    const lines = trimmed.split(/\r?\n/);
    const variants = lines.filter((line) => line.startsWith('#EXT-X-STREAM-INF')).length;
    const segments = lines.filter((line) => line.startsWith('#EXTINF')).length;
    const target = lines.find((line) => line.startsWith('#EXT-X-TARGETDURATION'));
    if (variants > 0) {
      return { valid: true, kind: 'hls-master', variantCount: variants };
    }
    if (segments > 0 || target) {
      return { valid: true, kind: 'hls-media', variantCount: 1 };
    }
    return { valid: false, kind: 'hls-media', variantCount: 0, reason: 'Playlist contains no segments' };
  }

  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<MPD')) {
    return { valid: true, kind: 'dash', variantCount: 0 };
  }
  const head = trimmed.slice(0, 32).toLowerCase();
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) {
    return { valid: false, kind: 'html', variantCount: 0, reason: 'Received an HTML page, not a manifest' };
  }
  return { valid: false, kind: 'unknown', variantCount: 0, reason: 'Unrecognized manifest body' };
}
