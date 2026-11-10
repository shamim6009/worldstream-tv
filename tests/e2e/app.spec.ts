import { expect, test } from '@playwright/test';
import { isolate } from './helpers';

test.describe('core pages', () => {
  test('homepage loads without errors', async ({ page }) => {
    const errors = await isolate(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /watch free live tv/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Explore Live TV' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Featured Live Channels' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Bangladesh Channels' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('search returns matching channels', async ({ page }) => {
    await isolate(page);
    await page.goto('/search?q=jamuna');
    await expect(page.getByText(/channels? for “jamuna”/)).toBeVisible();
    await expect(page.getByTestId('channel-grid').getByText('Jamuna TV')).toBeVisible();
  });

  test('search suggestions support keyboard navigation', async ({ page }) => {
    await isolate(page);
    await page.goto('/search');
    const input = page.locator('#global-search');
    await input.fill('somoy');
    await expect(page.getByRole('listbox')).toBeVisible();
    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/channel\/somoy/);
  });

  test('country filter narrows the directory', async ({ page }) => {
    await isolate(page);
    await page.goto('/live-tv');
    const total = await page.getByText(/of \d+ channels/).textContent();
    await page.getByLabel('Country').selectOption('BD');
    await expect(page).toHaveURL(/country=BD/);
    const filtered = await page.getByText(/of \d+ channels/).textContent();
    expect(filtered).not.toEqual(total);
    const cards = page.getByTestId('channel-grid').locator('article');
    await expect(cards.first()).toContainText('Bangladesh');
  });

  test('Bangladesh TV section loads and the legacy URL redirects', async ({ page }) => {
    const errors = await isolate(page);
    await page.goto('/bangladesh');
    await expect(page).toHaveURL(/\/bangladesh-tv/);
    await expect(page.getByRole('heading', { level: 1, name: /bangladeshi live tv/i })).toBeVisible();
    await page.getByRole('button', { name: 'বাংলা' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'বাংলাদেশের লাইভ টিভি' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Bangladesh channel list' }).getByRole('button').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('sports page shows categories and never invents fixtures', async ({ page }) => {
    await isolate(page);
    await page.goto('/sports');
    await expect(page.getByRole('heading', { level: 1, name: 'Free Live Sports' })).toBeVisible();
    await page.getByRole('button', { name: /Cricket/ }).click();
    await expect(page).toHaveURL(/\/sports\/cricket/);
    await expect(page.getByText('No verified events listed')).toBeVisible();
  });

  test('TV guide shows "Schedule unavailable" without guide data', async ({ page }) => {
    await isolate(page);
    await page.goto('/guide');
    await expect(page.getByText('Schedule unavailable.').first()).toBeVisible();
  });

  test('channel navigation works from a card', async ({ page }) => {
    await isolate(page);
    await page.goto('/live-tv');
    const first = page.getByTestId('channel-grid').locator('article a').first();
    const name = (await first.locator('h3').textContent())?.trim() ?? '';
    await first.click();
    await expect(page).toHaveURL(/\/channel\//);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  });

  test('favorites persist after a reload', async ({ page }) => {
    await isolate(page);
    await page.goto('/channel/jamuna-tv');
    await page.getByRole('button', { name: /add jamuna tv to favorites/i }).click();
    await page.reload();
    await page.goto('/favorites');
    await expect(page.getByRole('region', { name: 'Favorite channels' }).getByText('Jamuna TV')).toBeVisible();
  });

  test('theme toggle switches to light mode and persists', async ({ page }) => {
    await isolate(page);
    await page.goto('/');
    await page.getByRole('button', { name: /dark theme/i }).click();
    await expect(page.locator('html')).toHaveClass(/light/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/light/);
  });
});

test.describe('static deployment routes', () => {
  for (const route of ['/live-tv', '/country/bangladesh', '/category/news', '/channel/jamuna-tv', '/bangladesh-tv', '/sports']) {
    test(`prerendered ${route} returns HTML with route metadata`, async ({ request }) => {
      const response = await request.get(route);
      expect(response.status()).toBe(200);
      const html = await response.text();
      expect(html).toContain('<link rel="canonical"');
      expect(html).not.toContain('%VITE_SITE_URL%');
      expect(html).toMatch(/<title>[^<]*WorldStream TV<\/title>|<title>WorldStream TV/);
    });
  }

  test('client-only routes fall back to the app shell', async ({ page }) => {
    await isolate(page);
    await page.goto('/local/does-not-exist');
    await expect(page.getByText('Local channel not found')).toBeVisible();
  });

  test('robots.txt and sitemap.xml are served', async ({ request }) => {
    expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap:');
    expect(await (await request.get('/sitemap.xml')).text()).toContain('/country/bangladesh');
  });
});

test.describe('responsive', () => {
  test('mobile menu opens and navigates @mobile', async ({ page }) => {
    await isolate(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'Live Sports' }).click();
    await expect(page).toHaveURL(/\/sports/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
  });
});
