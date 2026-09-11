import { test, expect } from '@playwright/test';
import { waitForGameReady, cleanStorage } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await waitForGameReady(page);
  await cleanStorage(page);
});

test('Practice 起始残机 13 在 HUD 中保留完整数值并溢出显示', async ({ page }) => {
  await page.locator('#main-menu-nav [data-action="practice"]').click();
  await expect(page.locator('#screen-practice')).toHaveClass(/active/);

  await page.locator('#practice-lives').fill('13');
  await page.locator('#screen-practice [data-action="practice-start"]').click();
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/);

  await page.locator('#screen-player-select .player-card').first().click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);

  const lives = page.locator('#ui-lives');
  await expect(lives.locator('.resource-count')).toHaveText('13');
  await expect(lives.locator('.resource-cell')).toHaveCount(8);
  await expect(lives.locator('.resource-cell.filled')).toHaveCount(8);
  await expect(lives).toContainText('+5');
  await expect(page.locator('#ui-mode')).toContainText('Practice');
});

test('压缩得分保留整数尾零，并提供完整的长分数', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#main-menu-nav [data-action="practice"]').click();
  await page.locator('#screen-practice [data-action="practice-start"]').click();
  await page.locator('#screen-player-select .player-card').first().click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  const cdp = await page.context().newCDPSession(page);
  try {
    // Inspect the existing game through DevTools; no runtime hook or second Game.
    const prototype = await cdp.send('Runtime.evaluate', {
      expression: "import('/js/game.js').then(module => module.Game.prototype)",
      awaitPromise: true,
    });
    const instances = await cdp.send('Runtime.queryObjects', {
      prototypeObjectId: prototype.result.objectId, objectGroup: 'hud-score',
    });
    for (const [score, compact] of [[1000, '1K'], [100000, '100K'], [1000000000, '1B'], [9876543210987, '9.88T']]) {
      const result = await cdp.send('Runtime.callFunctionOn', {
        objectId: instances.objects.objectId,
        functionDeclaration: 'function(score) { if (this.length !== 1) throw new Error("Expected one live game"); this[0].score = score; }',
        arguments: [{ value: score }],
      });
      expect(result.exceptionDetails).toBeUndefined();
      await expect(page.locator('#ui-score-compact')).toHaveText(compact);
      await expect(page.locator('#ui-score-compact')).toHaveAttribute('title', String(score));
      await expect(page.locator('#ui-score')).toHaveText(String(score));
    }
    await page.locator('#ui-details summary').click();
    await expect(page.locator('#ui-score-details')).toBeVisible();
    await expect(page.locator('#ui-score-details')).toHaveText('9876543210987');
    await expect(page.locator('#ui-player-name')).toBeVisible();
    await expect(page.locator('#ui-chapter')).toBeVisible();
  } finally {
    await cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'hud-score' });
    await cdp.detach();
  }
});

test('章内移动倾向实时显示，累计倾向保留独立含义', async ({ page }) => {
  await page.locator('[data-action="practice"]').click();
  await page.locator('#practice-unstable').uncheck();
  await page.locator('[data-action="practice-start"]').click();
  await page.locator('.player-card').first().click();
  await page.evaluate(() => owDebug.set({ invincible: true, skipDialogue: true, timeScale: 8, showOverlay: false }));
  await page.keyboard.down('ArrowLeft');
  try {
    await expect(page.locator('#ui-chapter-tendency')).toContainText(/本章 A -[1-9]/);
    await expect(page.locator('#ui-tendency')).toHaveText('中立 0.0%');
  } finally {
    await page.keyboard.up('ArrowLeft');
  }
});
