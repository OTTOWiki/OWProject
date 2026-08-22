import { test, expect } from '@playwright/test';
import {
  waitForGameReady, cleanStorage, startGame, debugEnemyBulletCount, canvasNonBlank,
} from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await waitForGameReady(page);
  await cleanStorage(page);
});

test('EX 冒烟：敌机/敌弹刷出、分数增长、版面非空白', async ({ page }) => {
  await startGame(page, { chapter: 129, timeScale: 3 });
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  await expect(page.locator('#ui-chapter')).toHaveText(/EX-1/);

  // skipDialogue=true：第一波按 3x 快速刷出
  await expect
    .poll(() => debugEnemyBulletCount(page), { timeout: 15000 })
    .toBeGreaterThan(0);

  await expect
    .poll(async () => Number(await page.locator('#ui-score').textContent()), {
      timeout: 15000,
    })
    .toBeGreaterThan(0);

  expect(await canvasNonBlank(page)).toBe(true);
});

test('暂停/继续：Esc 弹出 PAUSED，再 Esc 恢复', async ({ page }) => {
  await startGame(page, { chapter: 129, timeScale: 3 });
  await expect(page.locator('#screen-game')).toHaveClass(/active/);

  await page.keyboard.press('Escape');
  await expect(page.locator('#game-overlay')).not.toHaveClass(/hidden/);
  await expect(page.locator('#overlay-title')).toHaveText('PAUSED');

  await page.keyboard.press('Escape');
  await expect(page.locator('#game-overlay')).toHaveClass(/hidden/);
});
