import { test, expect } from '@playwright/test';
import { waitForGameReady, cleanStorage, startGame, exitReplay } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await waitForGameReady(page);
  await cleanStorage(page);
});

test('录像：暂停保存 → 列表 → 播放 → 二次确认删除', async ({ page }) => {
  await startGame(page, { chapter: 129, timeScale: 3 });
  await expect(page.locator('#screen-game')).toHaveClass(/active/);

  // 等一小段游戏进程后暂停保存（保证有录像帧）
  await expect
    .poll(async () => Number(await page.locator('#ui-score').textContent()), {
      timeout: 15000,
    })
    .toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  await expect(page.locator('#game-overlay')).not.toHaveClass(/hidden/);
  await page.locator('#overlay-actions [data-overlay="save-replay"]').click();
  await expect(page.locator('#overlay-hint')).toHaveText('录像已保存', { timeout: 10000 });

  // 回菜单 → 录像列表
  await page.locator('#overlay-actions [data-overlay="menu"]').click();
  await expect(page.locator('#screen-menu')).toHaveClass(/active/);
  await page.locator('button[data-action="replay"]').click();
  await expect(page.locator('#screen-replay')).toHaveClass(/active/);
  await expect(page.locator('#replay-list .replay-row')).toHaveCount(1);

  // 播放：回到游戏屏且从录像起始章开始
  await page.locator('#replay-list .replay-item').click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  await expect(page.locator('#ui-chapter')).toHaveText(/EX-1/);

  // 退出回放 → 删除（二次确认）
  await exitReplay(page);
  const del = page.locator('#replay-list .replay-del').first();
  await del.click();
  await expect(del).toHaveText('再按一次确认删除');
  await del.click();
  await expect(page.locator('#replay-status')).toHaveText(/暂无录像/);
  await expect(page.locator('#replay-list .replay-row')).toHaveCount(0);
});
