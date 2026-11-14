import { test, expect } from '@playwright/test';
import { waitForGameReady, cleanStorage } from './helpers.js';

test.use({ hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 } });

async function startPractice(page) {
  await page.locator('#main-menu-nav [data-action="practice"]').click();
  await page.locator('#screen-practice [data-action="practice-start"]').click();
  await page.locator('#screen-player-select .player-card').first().click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  await expect(page.locator('#ui-player-name')).not.toHaveText('—');
  await page.waitForTimeout(400);
}

async function gameApi(page) {
  const cdp = await page.context().newCDPSession(page);
  const prototype = await cdp.send('Runtime.evaluate', {
    expression: "import('/js/game.js').then(module => module.Game.prototype)",
    awaitPromise: true,
  });
  const instances = await cdp.send('Runtime.queryObjects', {
    prototypeObjectId: prototype.result.objectId, objectGroup: 'mobile-game',
  });
  const call = async (fn, args = [], { awaitPromise = false } = {}) => {
    const res = await cdp.send('Runtime.callFunctionOn', {
      objectId: instances.objects.objectId,
      functionDeclaration: `function(...args) { if (this.length !== 1) throw new Error('Expected one live game'); return (${fn}).apply(this[0], args); }`,
      arguments: args.map((value) => ({ value })),
      returnByValue: true,
      awaitPromise,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result.value;
  };
  const close = async () => {
    await cdp.send('Runtime.releaseObjectGroup', { objectGroup: 'mobile-game' });
    await cdp.detach();
  };
  return { call, close };
}

test('竖屏显示旋转引导，横屏后恢复；对局中旋转会先暂停', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#rotate-gate')).toBeVisible();
  await expect(page.locator('#rotate-title')).toHaveText('请横屏游玩');
  await expect(page.locator('#app')).toHaveJSProperty('inert', true);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#rotate-gate')).toBeHidden();
  await expect(page.locator('#app')).toHaveJSProperty('inert', false);
  await waitForGameReady(page);
  await cleanStorage(page);
  await startPractice(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#rotate-gate')).toBeVisible();
  await expect(page.locator('#game-overlay')).not.toHaveClass(/hidden/);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#rotate-gate')).toBeHidden();
  await expect(page.locator('#game-overlay')).not.toHaveClass(/hidden/);
  await page.locator('#game-overlay [data-overlay="resume"]').click();
  await expect(page.locator('#game-overlay')).toHaveClass(/hidden/);
});

test('横屏版面、完整不可滚动 HUD、HUD 下方四键与暂停菜单尺寸', async ({ page }) => {
  await page.goto('/');
  await waitForGameReady(page);
  await cleanStorage(page);
  await startPractice(page);

  const viewport = page.viewportSize();
  const canvas = await page.locator('#playfield').boundingBox();
  expect(canvas.width / canvas.height).toBeCloseTo(0.75, 2);
  expect(canvas.height).toBeGreaterThanOrEqual(viewport.height * 0.8);

  const panel = await page.locator('.panel-right').boundingBox();
  const controls = await page.locator('.touch-controls').boundingBox();
  expect(panel.x).toBeGreaterThanOrEqual(canvas.x + canvas.width - 1);
  expect(panel.x + panel.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(controls.y).toBeGreaterThanOrEqual(panel.y + panel.height - 1);
  expect(controls.y + controls.height).toBeLessThanOrEqual(viewport.height + 1);

  const panelState = await page.evaluate(() => {
    const right = document.querySelector('.panel-right');
    const score = document.querySelector('.score-panel');
    const screen = document.getElementById('screen-game');
    return {
      rightScrollH: right.scrollHeight,
      rightClientH: right.clientHeight,
      scoreScrollH: score.scrollHeight,
      scoreClientH: score.clientHeight,
      screenScrollTop: screen.scrollTop,
      screenOverflow: getComputedStyle(screen).overflow,
    };
  });
  expect(panelState.rightScrollH).toBeLessThanOrEqual(panelState.rightClientH + 1);
  expect(panelState.scoreScrollH).toBeLessThanOrEqual(panelState.scoreClientH + 1);
  expect(panelState.screenScrollTop).toBe(0);
  await expect(page.locator('#ui-details')).toHaveJSProperty('open', true);
  for (const sel of ['#ui-difficulty', '#ui-score-compact', '#ui-lives', '#ui-bombs', '#ui-edit',
    '#ui-unstable', '#ui-tendency', '#ui-hiscore', '#ui-player-name', '#ui-chapter', '#ui-bonus']) {
    await expect(page.locator(sel)).toBeVisible();
  }

  const buttons = page.locator('.touch-controls .touch-btn');
  await expect(buttons).toHaveCount(4);
  for (const id of ['btn-slow', 'btn-item', 'btn-bomb', 'btn-pause']) {
    const box = await page.locator(`#${id}`).boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  }

  await page.locator('#btn-pause').click();
  await expect(page.locator('#game-overlay')).not.toHaveClass(/hidden/);
  const overlay = await page.evaluate(() => {
    const panel = document.querySelector('.game-overlay-panel');
    const r = panel.getBoundingClientRect();
    return {
      position: getComputedStyle(document.getElementById('game-overlay')).position,
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
      scrollH: panel.scrollHeight,
      clientH: panel.clientHeight,
    };
  });
  expect(overlay.position).toBe('fixed');
  expect(overlay.rect.width).toBeGreaterThanOrEqual(300);
  expect(overlay.rect.height).toBeLessThanOrEqual(viewport.height);
  expect(overlay.scrollH).toBeLessThanOrEqual(overlay.clientH + 1);
  for (const id of ['resume', 'save-replay', 'settings', 'menu']) {
    await expect(page.locator(`.game-overlay-actions [data-overlay="${id}"]`)).toBeVisible();
  }
});

test('全屏触屏拖动、低速键与关闭限速后的作弊标记', async ({ page }) => {
  await page.goto('/');
  await waitForGameReady(page);
  await cleanStorage(page);
  await startPractice(page);
  const { call, close } = await gameApi(page);
  const cdp = await page.context().newCDPSession(page);
  try {
    const before = await call(`function() {
      return { x: this.player.x, y: this.player.y, limit: this.realInput.touchSpeedLimit };
    }`);
    expect(before.limit).toBe(true);
    const panel = await page.locator('.panel-right').boundingBox();
    const tx = panel.x + 14;
    const ty = Math.min(panel.y + panel.height * 0.7, panel.y + panel.height - 22);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: tx, y: ty, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: tx + 48, y: ty + 28, id: 1 }],
    });
    await page.waitForTimeout(250);
    const drag = await call(`function() {
      return { x: this.player.x, y: this.player.y, active: this.realInput.touchActive,
        vm: this.realInput.virtualMove, cheat: this._mobileCheat };
    }`);
    expect(drag.active).toBe(true);
    expect(Math.hypot(drag.x - before.x, drag.y - before.y)).toBeGreaterThan(1);
    expect(drag.cheat).toBe(false);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    await page.locator('#btn-slow').dispatchEvent('pointerdown', {
      pointerId: 9, pointerType: 'touch', button: 0,
    });
    const slowDown = await call(`function() {
      return { slow: this.realInput.slowHeld(), pressed: document.getElementById('btn-slow').getAttribute('aria-pressed') };
    }`);
    expect(slowDown.slow).toBe(true);
    expect(slowDown.pressed).toBe('true');
    await page.locator('#btn-slow').dispatchEvent('pointerup', { pointerId: 9, pointerType: 'touch' });
    const slowUp = await call(`function() { return this.realInput.slowHeld(); }`);
    expect(slowUp).toBe(false);

    await call(`function() {
      this.realInput.touchSpeedLimit = false;
      this.realInput.resetMobileCheat();
      this._mobileCheat = false;
      return true;
    }`);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: tx, y: ty, id: 2 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: tx + 36, y: ty + 20, id: 2 }],
    });
    await page.waitForTimeout(250);
    const cheat = await call(`function() {
      return { input: this.realInput.mobileCheat, run: this._mobileCheat };
    }`);
    expect(cheat.input).toBe(true);
    expect(cheat.run).toBe(true);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

    const saved = await call(`function() { return this._saveReplay({ partial: true }); }`, [], { awaitPromise: true });
    expect(saved.ok).toBe(true);
    const meta = await page.evaluate(() => JSON.parse(localStorage.getItem('gunwei_replays_index'))?.[0]);
    expect(meta.cheat).toBe(true);
  } finally {
    await close();
    await cdp.detach();
  }
});

test('排行榜与录像列表展示「作弊」标签', async ({ page }) => {
  await page.goto('/');
  await waitForGameReady(page);
  await cleanStorage(page);
  await page.evaluate(() => {
    localStorage.setItem('gunwei_ranking', JSON.stringify({
      easy: [{
        score: 1234, name: 'TST', playerName: '饮泉思源', playerId: 'yinquan',
        difficultyId: 'easy', mode: 'story', route: 'A', cleared: false,
        continued: false, cheat: true, stageReached: 'Stage 1', duration: 42, date: Date.now(),
      }],
    }));
    localStorage.setItem('gunwei_replays_index', JSON.stringify([{
      replayId: 'rtest', date: Date.now(), playerId: 'yinquan', difficultyId: 'easy',
      mode: 'story', route: 'A', cleared: false, score: 1234, stageReached: 'Stage 1',
      letters: [], partial: false, cheat: true,
    }]));
  });

  await page.locator('#main-menu-nav [data-action="ranking"]').click();
  await expect(page.locator('#screen-ranking')).toHaveClass(/active/);
  await expect(page.locator('#ranking-list .rk-badge.cheat')).toHaveText('作弊');
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-menu')).toHaveClass(/active/);
  await expect(page.locator('#screen-menu')).not.toHaveClass(/menu-entering/);
  await page.waitForTimeout(300);

  await page.locator('#main-menu-nav [data-action="replay"]').click();
  await expect(page.locator('#screen-replay')).toHaveClass(/active/);
  await expect(page.locator('#replay-list .replay-tag.cheat')).toHaveText('作弊');
});
