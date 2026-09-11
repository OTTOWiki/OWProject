import { test, expect } from '@playwright/test';
import { waitForGameReady } from './helpers.js';

test('boot 可恢复态：可选音乐失败后 helper 选择继续进入菜单', async ({ page }) => {
  let failedMusicRequest = false;
  await page.route('**/*.ogg', async (route) => {
    if (!failedMusicRequest) {
      failedMusicRequest = true;
      await route.abort();
      return;
    }
    await route.continue();
  });

  await page.goto('/');
  await expect.poll(() => failedMusicRequest).toBe(true);
  await expect(page.locator('#load-status')).toContainText(/音乐加载(?:失败|超时)/);
  await expect(page.locator('#load-continue')).toBeVisible();
  await expect(page.locator('#load-reload')).toBeVisible();

  // waitForGameReady owns the recovery choice; the test must not bypass it.
  await waitForGameReady(page);

  await expect(page.locator('#load-screen')).toHaveCount(0);
  await expect(page.locator('#screen-menu')).toHaveClass(/active/);
  await expect(page.locator('#screen-menu')).not.toHaveClass(/menu-entering/);
  await expect(page.locator('#screen-difficulty')).not.toHaveClass(/active/);
});

test('boot 致命态：核心模块失败时 helper 显式报告 load-status', async ({ page }) => {
  await page.route('**/js/main.js', (route) => route.abort());
  await page.goto('/');

  await expect(page.locator('#load-reload')).toBeVisible();
  await expect(page.locator('#load-continue')).toBeHidden();
  const statusText = (await page.locator('#load-status').textContent()).trim();
  expect(statusText).not.toBe('');

  // Keep the legacy helper's red path bounded without changing the helper's
  // production-facing wait budget.
  page.setDefaultTimeout(2500);
  await expect(waitForGameReady(page)).rejects.toThrow(statusText);
});
