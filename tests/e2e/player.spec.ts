import { expect, test } from '@playwright/test';
import { AJE_BACKUP, AJE_PRIMARY, failStream, isolate, serveFixtureStream } from './helpers';

test.describe('player', () => {
  test('plays an HLS stream (local fixture)', async ({ page }) => {
    await isolate(page);
    const h264 = await page.evaluate(() =>
      typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E,mp4a.40.2"'),
    );
    test.skip(!h264, 'This browser build has no H.264/AAC support; run with PW_CHANNEL=chrome or msedge.');

    await serveFixtureStream(page, AJE_PRIMARY);
    await page.goto('/channel/al-jazeera-english');
    const video = page.getByTestId('hls-player').locator('video');
    await expect
      .poll(async () => video.evaluate((element: HTMLVideoElement) => element.readyState), { timeout: 15_000 })
      .toBeGreaterThanOrEqual(2);
    await expect(page.getByRole('button', { name: /fullscreen/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /mute/i })).toBeVisible();
  });

  test('falls back to the backup source, then explains the failure', async ({ page }) => {
    await isolate(page);
    await failStream(page, AJE_PRIMARY, 404);
    await failStream(page, AJE_BACKUP, 403);
    await page.goto('/channel/al-jazeera-english');

    await expect(page.getByText(/Switched to backup source/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('alert')).toContainText(/refused this connection|403/, { timeout: 15_000 });
    await expect(page.getByText('None of the approved sources could be played from your connection.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Watch on/ })).toHaveAttribute('href', /aljazeera\.com/);
  });

  test('keyboard shortcut M toggles mute', async ({ page }) => {
    await isolate(page);
    await failStream(page, AJE_PRIMARY, 503);
    await page.goto('/channel/al-jazeera-english');
    const video = page.getByTestId('hls-player').locator('video');
    const before = await video.evaluate((element: HTMLVideoElement) => element.muted);
    await page.locator('body').press('m');
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.muted)).toBe(!before);
  });
});
