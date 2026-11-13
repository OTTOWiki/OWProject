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

test('存档写入失败：设置页显示非阻塞提示，操作不中断', async ({ page }) => {
  await page.locator('button[data-action="settings"]').click();
  await expect(page.locator('#screen-settings')).toHaveClass(/active/);

  await page.evaluate(() => {
    window.__realSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); };
  });

  const vol = page.locator('#set-music-volume');
  await vol.fill('52');
  await vol.dispatchEvent('input');

  await expect(page.locator('#save-toast')).toBeVisible();
  await expect(page.locator('#save-toast')).toContainText('本地存档写入失败');
  // 写失败不打断表单：读数仍跟随控件
  await expect(page.locator('#set-music-volume-val')).toHaveText('52%');

  await page.evaluate(() => { localStorage.setItem = window.__realSetItem; });
});

test('移动端相对移动限速默认开启，关闭后持久化并在 UI 回读', async ({ page }) => {
  await page.locator('button[data-action="settings"]').click();
  await expect(page.locator('#screen-settings')).toHaveClass(/active/);
  const limit = page.locator('#set-mobile-speed-limit');
  await expect(limit).toBeChecked();
  await expect(page.locator('#set-mobile-speed-limit-val')).toHaveText('开启');
  await expect(page.locator('.settings-note')).toContainText('作弊');

  await limit.uncheck();
  await expect(page.locator('#set-mobile-speed-limit-val')).toHaveText('关闭');
  const stored = await page.evaluate(() => localStorage.getItem('gunwei_settings'));
  expect(stored).toContain('"mobileSpeedLimit":false');

  await page.reload();
  await waitForGameReady(page);
  await page.locator('button[data-action="settings"]').click();
  await expect(page.locator('#set-mobile-speed-limit')).not.toBeChecked();
  await expect(page.locator('#set-mobile-speed-limit-val')).toHaveText('关闭');
});
