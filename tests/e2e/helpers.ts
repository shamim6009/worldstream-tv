import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';

const FIXTURES = path.join(process.cwd(), 'tests', 'fixtures', 'hls', 'sample');

/**
 * Blocks every non-local request so tests are deterministic and never hit real
 * broadcasters. Returns a list that collects page errors and console errors.
 */
export async function isolate(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // Aborted external requests (logos, fonts) are expected in isolation.
    if (/Failed to load resource|net::ERR_|ERR_FAILED/.test(text)) return;
    errors.push(`console: ${text}`);
  });
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort('blockedbyclient'));
  return errors;
}

/** Serves the local HLS fixture in place of a catalog stream URL. */
export async function serveFixtureStream(page: Page, manifestUrl: string): Promise<void> {
  const base = manifestUrl.slice(0, manifestUrl.lastIndexOf('/') + 1);
  await page.route(`${base}**`, async (route) => {
    const file = route.request().url().slice(base.length).split('?')[0] ?? '';
    const target = file.endsWith('.m3u8') ? 'index.m3u8' : file;
    const full = path.join(FIXTURES, path.basename(target));
    if (!fs.existsSync(full)) return route.fulfill({ status: 404, body: 'not found' });
    await route.fulfill({
      status: 200,
      body: fs.readFileSync(full),
      headers: {
        'content-type': target.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t',
        'access-control-allow-origin': '*',
      },
    });
  });
}

export async function failStream(page: Page, manifestUrl: string, status: number): Promise<void> {
  await page.route(manifestUrl, (route) =>
    route.fulfill({ status, body: 'error', headers: { 'access-control-allow-origin': '*' } }),
  );
}

export const AJE_PRIMARY = 'https://live-hls-apps-aje.getaj.net/AJE/index.m3u8';
export const AJE_BACKUP = 'https://live-hls-apps-aje-fa.getaj.net/AJE/index.m3u8';
