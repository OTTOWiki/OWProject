import { test, expect } from '@playwright/test';
import { waitForGameReady, cleanStorage } from './helpers.js';

test.beforeEach(async ({ page }) => {
  page.consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') page.consoleErrors.push(msg.text());
  });
  await page.goto('/');
  await waitForGameReady(page);
  await cleanStorage(page);
});

test('boot：owDebug 就绪、菜单激活、无代码错误', async ({ page }) => {
  await expect(page.locator('#screen-menu')).toHaveClass(/active/);
  await expect(page.locator('#load-screen')).toHaveCount(0);
  const codeErrors = page.consoleErrors.filter((e) => !e.includes('favicon.ico'));
  expect(codeErrors).toEqual([]);
});
