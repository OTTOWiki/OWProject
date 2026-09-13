import { test, expect } from '@playwright/test';
import { waitForGameReady } from './helpers.js';

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
    document.body.innerHTML = '<canvas id="fixture-canvas" width="450" height="600"></canvas>';
    const canvas = document.getElementById('fixture-canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '100px';
    canvas.style.top = '40px';
    canvas.style.width = '225px';
    canvas.style.height = '300px';
    const { Input } = await import(`${parent.location.origin}/js/input.js`);
    const input = new Input();
    input.bindCanvas(canvas, () => ({ x: 225, y: 300 }));
    window.__touchFixture = { canvas, input };
  });
  return frame;
}

async function touch(frame, type, points, changed = points) {
  await frame.evaluate(({ type: eventType, points: pointData, changed: changedData }) => {
    const { canvas } = window.__touchFixture;
    const makeTouch = ({ id, x, y }) => new Touch({
      identifier: id,
      target: canvas,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      pageX: x,
      pageY: y,
    });
    canvas.dispatchEvent(new TouchEvent(eventType, {
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

test('主触点独占手势，缩放映射与越界钳制保持稳定', async ({ page }) => {
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
    return { snapshot: input.snapshot(), touchActive: input.touchActive };
  });
  expect(mapped.touchActive).toBe(true);
  expect(mapped.snapshot.a).toBe(true);
  expect(mapped.snapshot.v).toEqual([345, 396]);

  await touch(frame, 'touchend', [{ id: 1, x: 205, y: 140 }], [{ id: 2, x: 300, y: 150 }]);
  const afterSecondaryEnd = await frame.evaluate(() => window.__touchFixture.input.snapshot());
  expect(afterSecondaryEnd.a).toBe(true);
  expect(afterSecondaryEnd.v).toEqual([345, 396]);

  await touch(frame, 'touchmove', [{ id: 1, x: 600, y: -100 }], [{ id: 1, x: 600, y: -100 }]);
  const clamped = await frame.evaluate(() => window.__touchFixture.input.snapshot());
  expect(clamped.v).toEqual([450, 0]);
  await touch(frame, 'touchend', [], [{ id: 1, x: 600, y: -100 }]);
  const released = await frame.evaluate(() => window.__touchFixture.input.snapshot());
  expect(released.a).toBe(false);
  expect(released.v).toBeNull();
  expect(released.t).toBeNull();

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

test('真实游戏暂停按钮不重复消费，下一次独立点击立即恢复', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('[data-action="practice"]').click();
  await page.locator('[data-action="practice-start"]').click();
  await page.locator('.player-card').first().click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  const pause = page.locator('#btn-pause');
  await pause.click();
  await expect(page.locator('#game-overlay')).not.toHaveClass(/hidden/);
  await pause.click();
  await expect(page.locator('#game-overlay')).toHaveClass(/hidden/);
  await pause.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#game-overlay')).not.toHaveClass(/hidden/);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.locator('#game-overlay')).not.toHaveClass(/hidden/);
});