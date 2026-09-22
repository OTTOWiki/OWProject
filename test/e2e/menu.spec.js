import { test, expect } from '@playwright/test';
import { waitForGameReady } from './helpers.js';

test('Story 开局：模式 → 难度 → 自机 → 游戏', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await waitForGameReady(page);

  await page.locator('#main-menu-nav [data-action="start"]').click();
  await expect(page.locator('#screen-mode-select')).toHaveClass(/active/);
  const modes = page.locator('#mode-list .mode-btn');
  await expect(modes).toHaveCount(2);
  await expect(modes.nth(0)).toHaveAttribute('data-mode', 'story');
  await expect(modes.nth(1)).toHaveAttribute('data-mode', 'nomiss');
  for (const mode of [modes.nth(0), modes.nth(1)]) {
    await expect(mode.locator('.mode-name')).not.toBeEmpty();
    await expect(mode.locator('.mode-rank')).not.toBeEmpty();
    await expect(mode.locator('.mode-desc')).not.toBeEmpty();
  }

  await modes.nth(0).click();
  await expect(page.locator('#screen-difficulty')).toHaveClass(/active/);
  await page.locator('.diff-btn[data-diff="normal"]').click();
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/);
  await page.locator('#screen-player-select .player-card').first().click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  await expect(page.locator('#ui-mode-nomiss')).toBeHidden();
});

test('模式与难度返回保留选择，确认转场取消不延迟开局', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('#main-menu-nav [data-action="start"]').click();
  await expect(page.locator('#screen-mode-select')).toHaveClass(/active/);

  await page.locator('#mode-list .mode-btn[data-mode="nomiss"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-mode-select')).toHaveClass(/active/);
  await expect(page.locator('#mode-list .mode-btn[data-mode="nomiss"]')).toHaveClass(/selected/);
  await page.waitForTimeout(850);
  await expect(page.locator('#screen-game')).not.toHaveClass(/active/);

  await page.locator('#mode-list .mode-btn[data-mode="nomiss"]').click();
  await expect(page.locator('#screen-difficulty')).toHaveClass(/active/);
  await page.locator('.diff-btn[data-diff="hard"]').click();
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-difficulty')).toHaveClass(/active/);
  await expect(page.locator('.diff-btn[data-diff="hard"]')).toHaveClass(/selected/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-mode-select')).toHaveClass(/active/);
  await expect(page.locator('#mode-list .mode-btn[data-mode="nomiss"]')).toHaveClass(/selected/);
});

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

test('入场时按住 Z 后鼠标开局，重复按键可推进游戏对话', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('#main-menu-nav [data-action="manual"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-menu')).toHaveClass(/menu-entering/);
  await page.keyboard.down('z');
  try {
    await expect(page.locator('#screen-menu')).not.toHaveClass(/menu-entering/);
    await page.locator('#main-menu-nav [data-action="extra-start"]').click();
    await expect(page.locator('#screen-difficulty')).toHaveClass(/active/);
    await page.locator('#diff-list button').first().click();
    await expect(page.locator('#screen-player-select')).toHaveClass(/active/);
    await page.locator('#screen-player-select .player-card').first().click();
    await expect(page.locator('#screen-game')).toHaveClass(/active/);
    await page.evaluate(() => window.owDebug.set({ timeScale: 8, showOverlay: false }));
    const dialogue = page.locator('#dialogue-text');
    await expect(page.locator('#dialogue-box')).not.toHaveClass(/hidden/);
    await expect.poll(() => dialogue.textContent()).toBeTruthy();
    const firstLine = await dialogue.textContent();
    // Keep Z held; dispatch through the focused element and real window listeners.
    await page.evaluate(() => {
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'z', code: 'KeyZ', repeat: true, bubbles: true, cancelable: true,
      }));
    });
    await expect.poll(() => dialogue.textContent()).not.toBe(firstLine);
  } finally {
    await page.keyboard.up('z');
  }
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
