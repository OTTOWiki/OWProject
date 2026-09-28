import { test, expect } from '@playwright/test';
import { waitForGameReady } from './helpers.js';

async function finishSelectionAnimations(page) {
  await page.evaluate(async () => {
    for (let i = 0; i < 8; i += 1) {
      document.getAnimations().forEach((animation) => animation.finish());
      await new Promise(requestAnimationFrame);
    }
  });
}

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

test('game start failure stops initialized game and restores usable player screen', async ({ page }) => {
  const unhandledRejections = [];
  page.on('pageerror', (error) => unhandledRejections.push(error.message));
  await page.addInitScript(() => {
    window.addEventListener('unhandledrejection', (event) => {
      window.__unhandledRejections ||= [];
      window.__unhandledRejections.push(String(event.reason?.message || event.reason));
    });
  });
  await page.route('**/js/main.js', async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const construction = 'game = new Game({ canvas, input, audio, background, ui });';
    if (!source.includes(construction)) throw new Error('Game construction hook not found');
    await route.fulfill({
      response,
      body: source.replace(construction, `${construction}\n    const realStart = game.start.bind(game);\n    window.__testGame = game;\n    window.__startAttempts = 0;\n    game.start = (...args) => { window.__startAttempts += 1; realStart(...args); game.running = true; throw new Error('injected start failure'); };`),
    });
  });

  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('[data-action="start"]').click();
  await expect(page.locator('#screen-mode-select')).toHaveClass(/active/);
  await page.locator('#mode-list .mode-btn[data-mode="story"]').click();
  await finishSelectionAnimations(page);
  await expect(page.locator('#screen-difficulty')).toHaveClass(/active/);
  await page.locator('#diff-list .diff-btn[data-diff="normal"]').click();
  await finishSelectionAnimations(page);
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/);
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/);
  await page.locator('.player-card[data-player="yinquan"]').click();

  await expect(page.locator('#screen-player-select')).toHaveClass(/active/);
  await expect(page.locator('#screen-game')).not.toHaveClass(/active/);
  await expect.poll(() => page.evaluate(() => window.__testGame?.player != null)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__testGame?.running)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__startAttempts)).toBe(1);
  await expect(page.locator('.scene-curtain')).toHaveCount(0);
  expect(await page.evaluate(() => window.__unhandledRejections || [])).toEqual([]);
  expect(unhandledRejections).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-difficulty')).toHaveClass(/active/);
  await finishSelectionAnimations(page);
  await page.locator('#diff-list .diff-btn[data-diff="normal"]').click();
  await finishSelectionAnimations(page);
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/);
  await page.locator('.player-card[data-player="yinquan"]').click();
  await page.locator('.player-card[data-player="yinquan"]').click();
  await expect.poll(() => page.evaluate(() => window.__startAttempts)).toBe(2);
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/);
  await expect.poll(() => page.evaluate(() => window.__testGame?.running)).toBe(false);
  expect(await page.evaluate(() => window.__unhandledRejections || [])).toEqual([]);
  expect(unhandledRejections).toEqual([]);
});

test('reduced-motion game start failure restores the source screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    window.addEventListener('unhandledrejection', (event) => {
      window.__unhandledRejections ||= [];
      window.__unhandledRejections.push(String(event.reason?.message || event.reason));
    });
  });
  await page.route('**/js/main.js', async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const construction = 'game = new Game({ canvas, input, audio, background, ui });';
    if (!source.includes(construction)) throw new Error('Game construction hook not found');
    await route.fulfill({
      response,
      body: source.replace(construction, `${construction}\n    const realStart = game.start.bind(game);\n    window.__testGame = game;\n    game.start = (...args) => { realStart(...args); game.running = true; throw new Error('injected start failure'); };`),
    });
  });

  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('[data-action="start"]').click();
  await page.locator('#mode-list .mode-btn[data-mode="story"]').click();
  await expect(page.locator('#screen-difficulty')).toHaveClass(/active/);
  await finishSelectionAnimations(page);
  await page.locator('#diff-list .diff-btn[data-diff="normal"]').click();
  await finishSelectionAnimations(page);
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/);
  await page.locator('.player-card[data-player="yinquan"]').click();
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/);
  await expect(page.locator('#screen-game')).not.toHaveClass(/active/);
  await expect.poll(() => page.evaluate(() => window.__testGame?.running)).toBe(false);
  expect(await page.evaluate(() => window.__unhandledRejections || [])).toEqual([]);
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
