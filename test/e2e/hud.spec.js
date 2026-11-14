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
  await expect(page.locator('#screen-practice')).toHaveJSProperty('inert', false);

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
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('#main-menu-nav [data-action="practice"]').click();
  await page.locator('#screen-practice [data-action="practice-start"]').click();
  await page.locator('#screen-player-select .player-card').first().click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  await expect(page.locator('#screen-game')).toHaveJSProperty('inert', false);
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
  await expect(page.locator('#screen-practice')).toHaveJSProperty('inert', false);
  await page.locator('#practice-unstable').uncheck();
  await page.locator('[data-action="practice-start"]').click();
  await page.locator('.player-card').first().click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  await expect(page.locator('#screen-game')).toHaveJSProperty('inert', false);
  await page.evaluate(() => owDebug.set({ invincible: true, skipDialogue: true, timeScale: 8, showOverlay: false }));
  await page.keyboard.down('ArrowLeft');
  try {
    await expect(page.locator('#ui-chapter-tendency')).toContainText(/本章 A -[1-9]/);
    await expect(page.locator('#ui-tendency')).toHaveText('中立 0.0%');
  } finally {
    await page.keyboard.up('ArrowLeft');
  }
});
async function startPracticeForLayout(page) {
  await page.locator('#main-menu-nav [data-action="practice"]').click();
  await page.locator('#screen-practice [data-action="practice-start"]').click();
  await page.locator('#screen-player-select .player-card').first().click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  await expect(page.locator('#ui-player-name')).not.toHaveText('—');
  await page.waitForTimeout(400);
}

async function assertLandscapeHudComplete(page, width, height) {
  const canvas = await page.locator('#playfield').boundingBox();
  expect(canvas.width / canvas.height).toBeCloseTo(0.75, 2);
  expect(canvas.height).toBeGreaterThanOrEqual(height * 0.8);

  const panel = await page.locator('.panel-right').boundingBox();
  expect(panel.x).toBeGreaterThanOrEqual(canvas.x + canvas.width - 1);
  expect(panel.x + panel.width).toBeLessThanOrEqual(width + 1);
  expect(panel.y).toBeGreaterThanOrEqual(0);
  expect(panel.y + panel.height).toBeLessThanOrEqual(height + 1);

  const geometry = await page.evaluate(() => {
    const right = document.querySelector('.panel-right');
    const panelEl = document.querySelector('.score-panel');
    const r = right.getBoundingClientRect();
    return {
      scrollH: right.scrollHeight,
      clientH: right.clientHeight,
      panelScrollH: panelEl.scrollHeight,
      panelClientH: panelEl.clientHeight,
      panelRect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
      screenScrollTop: document.getElementById('screen-game').scrollTop,
    };
  });
  expect(geometry.scrollH).toBeLessThanOrEqual(geometry.clientH + 1);
  expect(geometry.panelScrollH).toBeLessThanOrEqual(geometry.panelClientH + 1);
  expect(geometry.screenScrollTop).toBe(0);

  for (const sel of ['#ui-difficulty', '#ui-score-compact', '#ui-lives', '#ui-bombs', '#ui-edit',
    '#ui-unstable', '#ui-tendency', '#ui-hiscore', '#ui-player-name', '#ui-chapter', '#ui-bonus']) {
    const box = await page.locator(sel).boundingBox();
    expect(box, `${sel} should render`).not.toBeNull();
    expect(box.y).toBeGreaterThanOrEqual(geometry.panelRect.top - 1);
    expect(box.y + box.height).toBeLessThanOrEqual(geometry.panelRect.bottom + 1);
  }
  await expect(page.locator('#ui-details')).toHaveJSProperty('open', true);
  expect(width / height).toBeGreaterThan(1);
}

test('手机横屏右侧 HUD 不滚动且完整显示（667×375）', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto('/');
  await waitForGameReady(page);
  await cleanStorage(page);
  await startPracticeForLayout(page);
  await assertLandscapeHudComplete(page, 667, 375);
});

test('手机横屏右侧 HUD 不滚动且完整显示（568×320）', async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.goto('/');
  await waitForGameReady(page);
  await cleanStorage(page);
  await startPracticeForLayout(page);
  await assertLandscapeHudComplete(page, 568, 320);
});

test('HUD details 在桌面与短横屏都保持展开，不再依赖窄屏折叠', async ({ page }) => {
  await page.locator('#main-menu-nav [data-action="practice"]').click();
  await page.locator('#screen-practice [data-action="practice-start"]').click();
  await page.locator('#screen-player-select .player-card').first().click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  const details = page.locator('#ui-details');
  await expect(details).toHaveJSProperty('open', true);
  await expect(page.locator('#ui-hiscore')).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(details).toHaveJSProperty('open', true);
  await expect(page.locator('#ui-hiscore')).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(details).toHaveJSProperty('open', true);
  await expect(page.locator('#ui-hiscore')).toBeVisible();
});

test('Letter 卡在版面内右上角，Combo/倾向读数保留在版面内', async ({ page }) => {
  await page.locator('#main-menu-nav [data-action="practice"]').click();
  await page.locator('#screen-practice [data-action="practice-start"]').click();
  await page.locator('#screen-player-select .player-card').first().click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);

  await page.evaluate(() => {
    const banner = document.getElementById('letter-banner');
    banner.classList.remove('hidden');
    document.getElementById('letter-name').textContent = '零散的草稿';
    document.getElementById('letter-remain').textContent = 'LETTER 7/12 · 剩余 2';
    document.getElementById('letter-timer').textContent = 'TIME 18.4';
  });
  await expect(page.locator('.letter-track')).toHaveCount(0);
  const inPlayfield = await page.locator('#letter-banner').evaluate((el) => !!el.closest('.playfield-wrap'));
  expect(inPlayfield).toBe(true);

  const field = await page.locator('.playfield-wrap').boundingBox();
  const letter = await page.locator('#letter-banner').boundingBox();
  expect(letter.x).toBeGreaterThanOrEqual(field.x);
  expect(letter.y).toBeGreaterThanOrEqual(field.y);
  expect(letter.x + letter.width).toBeLessThanOrEqual(field.x + field.width + 1);
  expect(letter.y + letter.height).toBeLessThanOrEqual(field.y + field.height + 1);
  await expect(page.locator('#letter-banner')).toBeVisible();
});
