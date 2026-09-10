import { test, expect } from '@playwright/test';
import { waitForGameReady } from './helpers.js';

test('返回主菜单的确认只跳过演出，下一次确认进入记住的入口', async ({ page }) => {
  await page.goto('/');
  await waitForGameReady(page);
  await expect(page.locator('#load-screen')).toHaveCount(0);
  await page.locator('#main-menu-nav [data-action="manual"]').click();
  await expect(page.locator('#screen-manual')).toHaveClass(/active/);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  await expect(page.locator('#screen-menu')).toHaveClass(/active/);
  await page.keyboard.press('Enter');
  await expect(page.locator('#screen-manual')).toHaveClass(/active/);
});

test('返回按住和键位捕获取消不泄漏到主菜单', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('#main-menu-nav [data-action="settings"]').click();
  await page.locator('.key-row[data-bind="shot"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-settings')).toHaveClass(/active/);
  await expect(page.locator('.key-row.listening')).toHaveCount(0);
  await page.keyboard.down('Escape');
  await page.keyboard.down('Escape');
  await expect(page.locator('#screen-menu')).toHaveClass(/active/);
  await page.keyboard.up('Escape');
  await page.locator('#main-menu-nav [data-action="manual"]').click();
  await expect(page.locator('#screen-manual')).toHaveClass(/active/);
});

test('指针跳过未产生click时不吞下一次键盘确认', async ({ page }) => {
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('#main-menu-nav [data-action="manual"]').click();
  await page.keyboard.press('Escape');
  await page.mouse.move(20, 20);
  await page.mouse.down();
  await page.keyboard.press('Enter');
  await expect(page.locator('#screen-manual')).toHaveClass(/active/);
  await page.mouse.up();
});
