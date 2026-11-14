import { test, expect } from '@playwright/test';
import { waitForGameReady } from './helpers.js';

test.use({ hasTouch: true, viewport: { width: 844, height: 390 } });

async function makeInputFixture(page) {
  await page.goto('/');
  const frameAttached = page.waitForEvent('frameattached');
  await page.evaluate(() => {
    const frame = document.createElement('iframe');
    frame.title = 'touch input fixture';
    frame.src = 'about:blank';
    document.body.append(frame);
  });
  const frame = await frameAttached;
  await frame.waitForLoadState('domcontentloaded');
  await frame.evaluate(async () => {
    document.body.style.margin = '0';
    document.body.innerHTML = '<div id="fixture-surface"><canvas id="fixture-canvas" width="450" height="600"></canvas><button type="button" id="fixture-button">button</button></div>';
    const surface = document.getElementById('fixture-surface');
    surface.style.position = 'fixed';
    surface.style.inset = '0';
    const canvas = document.getElementById('fixture-canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '100px';
    canvas.style.top = '40px';
    canvas.style.width = '225px';
    canvas.style.height = '300px';
    const button = document.getElementById('fixture-button');
    button.style.position = 'absolute';
    button.style.left = '600px';
    button.style.top = '400px';
    const { Input } = await import(`${parent.location.origin}/js/input.js`);
    const input = new Input();
    input.bindCanvas(canvas, () => ({ x: 225, y: 300 }), surface);
    window.__touchFixture = { canvas, surface, button, input };
  });
  return frame;
}

async function touch(frame, type, points, changed = points) {
  await frame.evaluate(({ type: eventType, points: pointData, changed: changedData }) => {
    const { surface } = window.__touchFixture;
    const makeTouch = ({ id, x, y }) => new Touch({
      identifier: id,
      target: surface,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      pageX: x,
      pageY: y,
    });
    surface.dispatchEvent(new TouchEvent(eventType, {
      bubbles: true,
      cancelable: true,
      touches: pointData.map(makeTouch),
      targetTouches: pointData.map(makeTouch),
      changedTouches: changedData.map(makeTouch),
    }));
  }, { type, points, changed });
}

test('触控取消释放射击与位移，且取消不产生轻点', async ({ page }) => {
  const frame = await makeInputFixture(page);

  await touch(frame, 'touchstart', [{ id: 7, x: 155, y: 100 }]);
  await touch(frame, 'touchmove', [{ id: 7, x: 160, y: 104 }]);
  await touch(frame, 'touchcancel', [], [{ id: 7, x: 160, y: 104 }]);

  const state = await frame.evaluate(() => {
    const { input } = window.__touchFixture;
    return {
      snapshot: input.snapshot(),
      shotHeld: input.shotHeld(),
      moveAxis: input.moveAxis(),
    };
  });
  expect(state.snapshot.a).toBe(false);
  expect(state.snapshot.v).toBeNull();
  expect(state.snapshot.t).toBeNull();
  expect(state.shotHeld).toBe(false);
  expect(state.moveAxis).toEqual({ x: 0, y: 0 });
});

test('隐藏与失焦释放键盘和触控持有状态', async ({ page }) => {
  const frame = await makeInputFixture(page);

  await frame.evaluate(() => {
    const { input } = window.__touchFixture;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
    return input.snapshot().d.includes('ArrowLeft');
  });
  await touch(frame, 'touchstart', [{ id: 11, x: 160, y: 120 }]);
  await touch(frame, 'touchmove', [{ id: 11, x: 190, y: 150 }]);

  await frame.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  const hiddenState = await frame.evaluate(() => {
    const { input } = window.__touchFixture;
    return { snapshot: input.snapshot(), shotHeld: input.shotHeld(), moveAxis: input.moveAxis() };
  });
  expect(hiddenState.snapshot.d).toEqual([]);
  expect(hiddenState.snapshot.p).toEqual([]);
  expect(hiddenState.snapshot.a).toBe(false);
  expect(hiddenState.snapshot.v).toBeNull();
  expect(hiddenState.snapshot.t).toBeNull();
  expect(hiddenState.shotHeld).toBe(false);
  expect(hiddenState.moveAxis).toEqual({ x: 0, y: 0 });

  await touch(frame, 'touchstart', [{ id: 12, x: 160, y: 120 }]);
  await frame.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true }));
    window.dispatchEvent(new Event('blur'));
  });

  const blurState = await frame.evaluate(() => {
    const { input } = window.__touchFixture;
    return { snapshot: input.snapshot(), shotHeld: input.shotHeld(), moveAxis: input.moveAxis() };
  });
  expect(blurState.snapshot.d).toEqual([]);
  expect(blurState.snapshot.p).toEqual([]);
  expect(blurState.snapshot.a).toBe(false);
  expect(blurState.snapshot.v).toBeNull();
  expect(blurState.snapshot.t).toBeNull();
  expect(blurState.shotHeld).toBe(false);
  expect(blurState.moveAxis).toEqual({ x: 0, y: 0 });
});

test('主触点独占手势，摇杆方向映射保持稳定', async ({ page }) => {
  const frame = await makeInputFixture(page);

  await touch(frame, 'touchstart', [{ id: 1, x: 155, y: 100 }]);
  await touch(frame, 'touchstart', [
    { id: 1, x: 155, y: 100 },
    { id: 2, x: 300, y: 150 },
  ], [{ id: 2, x: 300, y: 150 }]);
  await touch(frame, 'touchmove', [
    { id: 1, x: 205, y: 140 },
    { id: 2, x: 300, y: 150 },
  ], [{ id: 1, x: 205, y: 140 }]);

  const mapped = await frame.evaluate(() => {
    const { input } = window.__touchFixture;
    return { snapshot: input.snapshot(), touchActive: input.touchActive, axis: input.moveAxis() };
  });
  expect(mapped.touchActive).toBe(true);
  expect(mapped.snapshot.a).toBe(true);
  expect(mapped.snapshot.v).toBeNull();
  expect(mapped.snapshot.m).toEqual(expect.arrayContaining(['ArrowRight', 'ArrowDown']));
  expect(mapped.axis.x).toBeCloseTo(Math.SQRT1_2, 6);
  expect(mapped.axis.y).toBeCloseTo(Math.SQRT1_2, 6);

  await touch(frame, 'touchend', [{ id: 1, x: 205, y: 140 }], [{ id: 2, x: 300, y: 150 }]);
  const afterSecondaryEnd = await frame.evaluate(() => ({
    snapshot: window.__touchFixture.input.snapshot(),
    axis: window.__touchFixture.input.moveAxis(),
  }));
  expect(afterSecondaryEnd.snapshot.a).toBe(true);
  expect(afterSecondaryEnd.snapshot.v).toBeNull();
  expect(afterSecondaryEnd.axis.x).toBeCloseTo(Math.SQRT1_2, 6);
  expect(afterSecondaryEnd.axis.y).toBeCloseTo(Math.SQRT1_2, 6);

  await touch(frame, 'touchmove', [{ id: 1, x: 600, y: -100 }], [{ id: 1, x: 600, y: -100 }]);
  const far = await frame.evaluate(() => ({
    snapshot: window.__touchFixture.input.snapshot(),
    axis: window.__touchFixture.input.moveAxis(),
  }));
  expect(far.snapshot.v).toBeNull();
  expect(far.axis.x).toBeCloseTo(Math.SQRT1_2, 6);
  expect(far.axis.y).toBeCloseTo(-Math.SQRT1_2, 6);
  await frame.evaluate(() => window.__touchFixture.input.endFrame());
  const afterBlock = await frame.evaluate(() => ({
    snapshot: window.__touchFixture.input.snapshot(),
    axis: window.__touchFixture.input.moveAxis(),
  }));
  expect(afterBlock.snapshot.m).toEqual([]);
  expect(afterBlock.axis).toEqual({ x: 0, y: 0 });
  await touch(frame, 'touchend', [], [{ id: 1, x: 600, y: -100 }]);
  const released = await frame.evaluate(() => ({
    snapshot: window.__touchFixture.input.snapshot(),
    axis: window.__touchFixture.input.moveAxis(),
  }));
  expect(released.snapshot.a).toBe(false);
  expect(released.snapshot.v).toBeNull();
  expect(released.snapshot.t).toBeNull();
  expect(released.snapshot.m).toEqual([]);
  expect(released.axis).toEqual({ x: 0, y: 0 });

  await touch(frame, 'touchstart', [{ id: 3, x: 155, y: 100 }]);
  await touch(frame, 'touchmove', [{ id: 3, x: 205, y: 100 }], [{ id: 3, x: 205, y: 100 }]);
  await touch(frame, 'touchmove', [{ id: 3, x: 155, y: 100 }], [{ id: 3, x: 155, y: 100 }]);
  await touch(frame, 'touchend', [], [{ id: 3, x: 155, y: 100 }]);
  const reversed = await frame.evaluate(() => window.__touchFixture.input.snapshot());
  expect(reversed.t).toBeNull();
});
test('Item 与 Bomb 的一次指针按下只产生一个动作边沿并正确释放视觉状态', async ({ page }) => {
  const frame = await makeInputFixture(page);
  await frame.evaluate(() => {
    const { input } = window.__touchFixture;
    const item = document.createElement('button');
    const bomb = document.createElement('button');
    item.id = 'item';
    bomb.id = 'bomb';
    document.body.append(item, bomb);
    input.bindTouchButtons(item, bomb);
    window.__touchFixture.item = item;
    window.__touchFixture.bomb = bomb;
  });

  await frame.evaluate(() => {
    const { item } = window.__touchFixture;
    item.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId: 41, pointerType: 'touch',
    }));
  });
  const firstItemPress = await frame.evaluate(() => {
    const { input, item } = window.__touchFixture;
    return { snapshot: input.snapshot(), active: item.classList.contains('active') };
  });
  expect(firstItemPress.snapshot.i).toBe(true);
  expect(firstItemPress.active).toBe(true);

  await frame.evaluate(() => {
    const { input, item } = window.__touchFixture;
    input.endFrame();
    item.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId: 42, pointerType: 'mouse',
    }));
  });
  const repeatedItemPress = await frame.evaluate(() => {
    const { input, item } = window.__touchFixture;
    return { snapshot: input.snapshot(), active: item.classList.contains('active') };
  });
  expect(repeatedItemPress.snapshot.i).toBe(false);
  expect(repeatedItemPress.active).toBe(true);

  await frame.evaluate(() => {
    const { input, item } = window.__touchFixture;
    item.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, pointerId: 41, pointerType: 'touch',
    }));
    input.endFrame();
    item.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId: 43, pointerType: 'touch',
    }));
  });
  const nextItemPress = await frame.evaluate(() => {
    const { input, item } = window.__touchFixture;
    return { snapshot: input.snapshot(), active: item.classList.contains('active') };
  });
  expect(nextItemPress.snapshot.i).toBe(true);
  expect(nextItemPress.active).toBe(true);

  await frame.evaluate(() => window.dispatchEvent(new Event('blur')));
  const itemBlurred = await frame.evaluate(() => {
    const { input, item } = window.__touchFixture;
    return { snapshot: input.snapshot(), active: item.classList.contains('active') };
  });
  expect(itemBlurred.snapshot.i).toBe(false);
  expect(itemBlurred.active).toBe(false);

  await frame.evaluate(() => {
    const { bomb } = window.__touchFixture;
    bomb.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId: 51, pointerType: 'touch',
    }));
    bomb.dispatchEvent(new PointerEvent('pointercancel', {
      bubbles: true, pointerId: 51, pointerType: 'touch',
    }));
  });
  const bombCancelled = await frame.evaluate(() => {
    const { input, bomb } = window.__touchFixture;
    return { snapshot: input.snapshot(), active: bomb.classList.contains('active') };
  });
  expect(bombCancelled.snapshot.b).toBe(true);
  expect(bombCancelled.active).toBe(false);
});


test('全屏任意位置（版面外/HUD）拖动都能移动，控件自身不吞成移动手势', async ({ page }) => {
  const frame = await makeInputFixture(page);

  await touch(frame, 'touchstart', [{ id: 21, x: 20, y: 20 }]);
  await touch(frame, 'touchmove', [{ id: 21, x: 60, y: 40 }]);
  const outside = await frame.evaluate(() => ({
    snapshot: window.__touchFixture.input.snapshot(),
    axis: window.__touchFixture.input.moveAxis(),
  }));
  expect(outside.snapshot.v).toBeNull();
  expect(outside.snapshot.m).toEqual(expect.arrayContaining(['ArrowRight', 'ArrowDown']));
  expect(outside.axis.x).toBeCloseTo(Math.SQRT1_2, 6);
  expect(outside.axis.y).toBeCloseTo(Math.SQRT1_2, 6);

  await frame.evaluate(() => {
    const { button } = window.__touchFixture;
    const makeTouch = () => new Touch({
      identifier: 22, target: button, clientX: 610, clientY: 410,
      screenX: 610, screenY: 410, pageX: 610, pageY: 410,
    });
    button.dispatchEvent(new TouchEvent('touchstart', {
      bubbles: true, cancelable: true,
      touches: [makeTouch()], targetTouches: [makeTouch()], changedTouches: [makeTouch()],
    }));
  });
  const control = await frame.evaluate(() => ({
    snapshot: window.__touchFixture.input.snapshot(),
    axis: window.__touchFixture.input.moveAxis(),
  }));
  expect(control.snapshot.v).toBeNull();
  expect(control.snapshot.m).toEqual(expect.arrayContaining(['ArrowRight', 'ArrowDown']));
  expect(control.axis.x).toBeCloseTo(Math.SQRT1_2, 6);
  expect(control.axis.y).toBeCloseTo(Math.SQRT1_2, 6);
  await touch(frame, 'touchend', [], [{ id: 21, x: 60, y: 40 }]);
});


test('触屏位移按帧读取：轻推只走方向，低速只由低速键触发', async ({ page }) => {
  const frame = await makeInputFixture(page);
  await touch(frame, 'touchstart', [{ id: 31, x: 155, y: 100 }]);
  await touch(frame, 'touchmove', [{ id: 31, x: 160, y: 100 }]);
  const light = await frame.evaluate(() => ({
    snapshot: window.__touchFixture.input.snapshot(),
    axis: window.__touchFixture.input.moveAxis(),
    slow: window.__touchFixture.input.slowHeld(),
  }));
  expect(light.snapshot.m).toEqual(['ArrowRight']);
  expect(light.axis.x).toBe(1);
  expect(light.slow).toBe(false);
  expect(light.snapshot.sl).toBe(false);

  await frame.evaluate(() => window.__touchFixture.input.endFrame());
  const stopped = await frame.evaluate(() => ({
    snapshot: window.__touchFixture.input.snapshot(),
    axis: window.__touchFixture.input.moveAxis(),
    slow: window.__touchFixture.input.slowHeld(),
  }));
  expect(stopped.snapshot.m).toEqual([]);
  expect(stopped.axis).toEqual({ x: 0, y: 0 });
  expect(stopped.slow).toBe(false);

  await touch(frame, 'touchend', [], [{ id: 31, x: 160, y: 100 }]);
  await touch(frame, 'touchstart', [{ id: 32, x: 155, y: 100 }]);
  await touch(frame, 'touchmove', [{ id: 32, x: 156, y: 100 }]);
  const underDeadzone = await frame.evaluate(() => window.__touchFixture.input.snapshot());
  expect(underDeadzone.m).toEqual([]);
  await touch(frame, 'touchend', [], [{ id: 32, x: 156, y: 100 }]);
});

test('触屏低速键按住/释放，且限速关闭时拖动写入作弊标记', async ({ page }) => {
  const frame = await makeInputFixture(page);
  await frame.evaluate(() => {
    const { input } = window.__touchFixture;
    const slow = document.createElement('button');
    slow.id = 'slow';
    document.body.append(slow);
    input.bindSlowButton(slow);
    window.__touchFixture.slow = slow;
    input.applySettings({ shotToggle: false, mobileSpeedLimit: false });
    input.resetMobileCheat();
  });
  await frame.evaluate(() => window.__touchFixture.slow.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true, cancelable: true, pointerId: 71, pointerType: 'touch',
  })));
  const held = await frame.evaluate(() => ({
    snap: window.__touchFixture.input.snapshot(),
    held: window.__touchFixture.input.slowHeld(),
    pressed: window.__touchFixture.slow.getAttribute('aria-pressed'),
  }));
  expect(held.held).toBe(true);
  expect(held.snap.sl).toBe(true);
  expect(held.pressed).toBe('true');

  await touch(frame, 'touchstart', [{ id: 23, x: 120, y: 80 }]);
  await touch(frame, 'touchmove', [{ id: 23, x: 180, y: 120 }]);
  const cheat = await frame.evaluate(() => ({
    cheat: window.__touchFixture.input.mobileCheat,
    tl: window.__touchFixture.input.snapshot().tl,
  }));
  expect(cheat.cheat).toBe(true);
  expect(cheat.tl).toBe(false);

  await frame.evaluate(() => window.__touchFixture.slow.dispatchEvent(new PointerEvent('pointerup', {
    bubbles: true, pointerId: 71, pointerType: 'touch',
  })));
  const released = await frame.evaluate(() => ({
    held: window.__touchFixture.input.slowHeld(),
    pressed: window.__touchFixture.slow.getAttribute('aria-pressed'),
  }));
  expect(released.held).toBe(false);
  expect(released.pressed).toBe('false');
});

test('真实游戏暂停按钮不重复消费，下一次独立点击立即恢复', async ({ page }) => {
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('[data-action="practice"]').click();
  await page.locator('[data-action="practice-start"]').click();
  await page.locator('.player-card').first().click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  await expect(page.locator('#screen-game')).toHaveJSProperty('inert', false);
  await page.waitForTimeout(2000);
  const pause = page.locator('#btn-pause');
  await pause.click();
  await expect(page.locator('#game-overlay')).not.toHaveClass(/hidden/);
  await page.locator('#game-overlay [data-overlay="resume"]').click();
  await expect(page.locator('#game-overlay')).toHaveClass(/hidden/);
  await pause.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#game-overlay')).not.toHaveClass(/hidden/);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.locator('#game-overlay')).not.toHaveClass(/hidden/);
});