import { test, expect } from '@playwright/test';
import { waitForGameReady, cleanStorage } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await waitForGameReady(page);
  await cleanStorage(page);
});

test('设置持久化：音量改 37% → 写盘 → 刷新后回读', async ({ page }) => {
  await page.locator('button[data-action="settings"]').click();
  await expect(page.locator('#screen-settings')).toHaveClass(/active/);

  const vol = page.locator('#set-music-volume');
  await vol.fill('37');
  await vol.dispatchEvent('input');
  await expect(page.locator('#set-music-volume-val')).toHaveText('37%');

  const stored = await page.evaluate(() => localStorage.getItem('gunwei_settings'));
  expect(stored).toContain('"musicVolume":0.37');

  await page.reload();
  await waitForGameReady(page);
  await page.locator('button[data-action="settings"]').click();
  await expect(page.locator('#set-music-volume')).toHaveValue('37');
  await expect(page.locator('#set-music-volume-val')).toHaveText('37%');
});
