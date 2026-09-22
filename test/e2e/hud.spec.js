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
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  await page.evaluate(() => owDebug.set({ invincible: true, skipDialogue: true, timeScale: 8, showOverlay: false }));
  await page.keyboard.down('ArrowLeft');
  try {
    await expect(page.locator('#ui-chapter-tendency')).toContainText(/本章 A -[1-9]/);
    await expect(page.locator('#ui-tendency')).toHaveText('中立 0.0%');
  } finally {
    await page.keyboard.up('ArrowLeft');
  }
});
test('Practice portrait HUD stays reachable at tablet width', async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.locator('#main-menu-nav [data-action="practice"]').click();
  await page.locator('#practice-diffs [data-diff="hard"]').click();
  await page.locator('#screen-practice [data-action="practice-start"]').click();
  await page.locator('#screen-player-select .player-card').first().click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  const viewport = page.viewportSize();
  const panel = await page.locator('.panel-right').boundingBox();
  const canvas = await page.locator('#playfield').boundingBox();
  expect(canvas.width).toBeGreaterThanOrEqual(viewport.width - 24);
  expect(canvas.width / canvas.height).toBeCloseTo(0.75, 2);
  expect(panel.y).toBeGreaterThanOrEqual(canvas.y + canvas.height);
  expect(panel.x).toBeGreaterThanOrEqual(0);
  expect(panel.x + panel.width).toBeLessThanOrEqual(viewport.width);
  await page.locator('#btn-bomb').scrollIntoViewIfNeeded();
  await expect(page.locator('#btn-bomb')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('#ui-difficulty')).toContainText('HARD');
  await expect(page.locator('#ui-difficulty')).toHaveCSS('text-decoration-color', 'rgb(251, 191, 36)');
  await expect(page.locator('#ui-difficulty')).not.toHaveCSS('color', 'rgb(251, 191, 36)');
});

test('HUD details follows desktop/mobile disclosure across resize', async ({ page }) => {
  await page.locator('#main-menu-nav [data-action="practice"]').click();
  await page.locator('#screen-practice [data-action="practice-start"]').click();
  await page.locator('#screen-player-select .player-card').first().click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  const details = page.locator('#ui-details');
  await expect(details).toHaveJSProperty('open', true);
  await expect(page.locator('#ui-hiscore')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(details).toHaveJSProperty('open', false);
  await expect(page.locator('#ui-hiscore')).toBeHidden();
  await details.locator('summary').click();
  await expect(page.locator('#ui-hiscore')).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(details).toHaveJSProperty('open', true);
  await expect(page.locator('#ui-hiscore')).toBeVisible();
});

test('手机画布按可用宽度显示，HUD 与操作区在其下方', async ({ page }) => {
  for (const { width, height } of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await waitForGameReady(page);
    await cleanStorage(page);
    await page.locator('#main-menu-nav [data-action="practice"]').click();
    await page.locator('#screen-practice [data-action="practice-start"]').click();
    await page.locator('#screen-player-select .player-card').first().click();
    await expect(page.locator('#screen-game')).toHaveClass(/active/);
    const canvas = await page.locator('#playfield').boundingBox();
    const panel = await page.locator('.panel-right').boundingBox();
    expect(canvas.width).toBeGreaterThanOrEqual(width - 24);
    expect(canvas.width).toBeLessThanOrEqual(width);
    expect(canvas.width / canvas.height).toBeCloseTo(0.75, 2);
    await expect(page.locator('#playfield')).toHaveJSProperty('width', 450);
    await expect(page.locator('#playfield')).toHaveJSProperty('height', 600);
    expect(panel.y).toBeGreaterThan(canvas.y + canvas.height - 1);
    if (width === 320) {
      expect(await page.locator('#screen-game').evaluate((el) => el.scrollHeight)).toBeGreaterThan(height);
    }
    for (const id of ['btn-item', 'btn-bomb', 'btn-pause']) {
      const button = page.locator(`#${id}`);
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeInViewport({ ratio: 1 });
      const bounds = await button.boundingBox();
      expect(bounds.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test('手机画布优先布局支持真实手指滚动访问下方 HUD', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('#main-menu-nav [data-action="practice"]').click();
  await page.locator('#screen-practice [data-action="practice-start"]').click();
  await page.locator('#screen-player-select .player-card').first().click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  const scroller = page.locator('#screen-game');
  const before = await scroller.evaluate(el => el.scrollTop);
  const panel = await page.locator('.panel-right').boundingBox();
  // Start on the HUD, outside the canvas whose touch gestures move the player.
  const x = panel.x + 10;
  const y = Math.min(panel.y + 32, 548);
  const cdp = await page.context().newCDPSession(page);
  let touching = false;
  try {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x, y, id: 1 }],
    });
    touching = true;
    for (let step = 1; step <= 6; step++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x, y: y - step * 48, id: 1 }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    touching = false;
    await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(before);
    await expect(page.locator('#btn-pause')).toBeInViewport({ ratio: 1 });
  } finally {
    if (touching) await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await cdp.detach();
  }
});

test('竖屏增加宽度不会在原970px断点缩小画布', async ({ page }) => {
  await page.locator('[data-action="practice"]').click();
  await page.locator('[data-action="practice-start"]').click();
  await page.locator('.player-card').first().click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  let previousWidth = 0;
  for (const width of [970, 971, 1024]) {
    await page.setViewportSize({ width, height: 1366 });
    await page.locator('#screen-game').evaluate(el => { el.scrollTop = 0; });
    const canvas = await page.locator('#playfield').boundingBox();
    const hud = await page.locator('.panel-right').boundingBox();
    expect(canvas.width).toBeGreaterThanOrEqual(width - 24);
    expect(canvas.width).toBeGreaterThanOrEqual(previousWidth);
    expect(canvas.width / canvas.height).toBeCloseTo(0.75, 2);
    expect(hud.y).toBeGreaterThanOrEqual(canvas.y + canvas.height);
    await expect(page.locator('#ui-details')).toHaveJSProperty('open', false);
    await page.locator('#btn-pause').scrollIntoViewIfNeeded();
    await expect(page.locator('#btn-pause')).toBeInViewport({ ratio: 1 });
    previousWidth = canvas.width;
  }
});
