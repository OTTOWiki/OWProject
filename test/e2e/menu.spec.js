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
test('模式左右键选择使用有符号 180 度步进', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('#main-menu-nav [data-action="start"]').click();

  const modeScreen = page.locator('#screen-mode-select');
  const story = page.locator('#mode-list .mode-btn[data-mode="story"]');
  const nomiss = page.locator('#mode-list .mode-btn[data-mode="nomiss"]');
  await expect(modeScreen).toHaveClass(/active/);
  await expect(story).toHaveClass(/selected/);
  await expect(modeScreen).toHaveCSS('--mode-band-angle', '0deg');

  await page.keyboard.press('ArrowRight');
  await expect(nomiss).toHaveClass(/selected/);
  await expect(modeScreen).toHaveCSS('--mode-band-angle', '180deg');

  await page.keyboard.press('ArrowLeft');
  await expect(story).toHaveClass(/selected/);
  await expect(modeScreen).toHaveCSS('--mode-band-angle', '0deg');
});

test('转场中返回从当前画面连续重定向，反向不重置或排队', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('#main-menu-nav [data-action="start"]').click();
  await page.locator('#mode-list .mode-btn[data-mode="nomiss"]').click();

  const modeScreen = page.locator('#screen-mode-select');
  const difficultyScreen = page.locator('#screen-difficulty');
  await page.waitForFunction(() => {
    const screen = document.querySelector('#screen-difficulty');
    return screen?.classList.contains('selection-arriving')
      && document.querySelector('.selection-transition-band')
      && [...(screen?.getAnimations({ subtree: true }) || [])]
        .some((a) => Number(a.effect?.getComputedTiming().duration) === 760);
  });

  const continuity = await page.evaluate(() => {
    const read = () => {
      const band = document.querySelector('.selection-transition-band');
      const target = document.querySelector('#screen-difficulty .diff-btn.selected');
      const rect = (el) => {
        const r = el?.getBoundingClientRect();
        return r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
      };
      return {
        band: rect(band),
        target: rect(target),
        animationCount: band?.getAnimations().length ?? 0,
      };
    };
    const before = read();
    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', code: 'Escape', bubbles: true, cancelable: true,
    }));
    const after = read();
    return { before, after };
  });
  expect(continuity.after.target).not.toBeNull();
  for (const key of ['left', 'top', 'width', 'height']) {
    expect(Math.abs(continuity.after.band[key] - continuity.before.band[key])).toBeLessThan(3);
    expect(Math.abs(continuity.after.target[key] - continuity.before.target[key])).toBeLessThan(3);
  }
  expect(continuity.after.animationCount).toBeGreaterThan(0);
  await expect(modeScreen).toHaveClass(/active/, { timeout: 2000 });
  await expect(difficultyScreen).not.toHaveClass(/active/);
});

test('转场带的最后关键帧对齐真实终点几何与角度', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('#main-menu-nav [data-action="start"]').click();
  await page.locator('#mode-list .mode-btn[data-mode="nomiss"]').click();
  await page.waitForFunction(() => document.querySelector('#screen-difficulty.selection-arriving')
    && document.querySelector('.selection-transition-band'));

  const endpoint = await page.evaluate(() => {
    const band = document.querySelector('.selection-transition-band');
    const target = document.querySelector('#screen-difficulty .difficulty-focus-band');
    const paint = band?.querySelector(':scope > div');
    const outerAnimation = [...(band?.getAnimations() || [])]
      .find((a) => Number(a.effect?.getComputedTiming().duration) === 760);
    const paintAnimation = [...(paint?.getAnimations() || [])]
      .find((a) => Number(a.effect?.getComputedTiming().duration) === 760);
    if (!band || !target || !paint || !outerAnimation || !paintAnimation) return null;
    outerAnimation.currentTime = Number(outerAnimation.effect.getComputedTiming().duration);
    paintAnimation.currentTime = Number(paintAnimation.effect.getComputedTiming().duration);
    const bandRect = paint.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const angle = parseFloat(getComputedStyle(paint).rotate);
    const targetMatrix = new DOMMatrixReadOnly(getComputedStyle(target).transform);
    const targetAngle = Math.atan2(targetMatrix.b, targetMatrix.a) * 180 / Math.PI;
    return {
      band: {
        left: bandRect.left + bandRect.width / 2,
        top: bandRect.top + bandRect.height / 2,
        width: bandRect.width,
        height: bandRect.height,
        angle,
      },
      target: {
        left: targetRect.left + targetRect.width / 2,
        top: targetRect.top + targetRect.height / 2,
        width: targetRect.width,
        height: targetRect.height,
        angle: targetAngle,
      },
    };
  });
  expect(endpoint).not.toBeNull();
  for (const key of ['left', 'top', 'width', 'height']) {
    expect(Math.abs(endpoint.band[key] - endpoint.target[key])).toBeLessThan(1.5);
  }
  const angleDelta = ((endpoint.band.angle - endpoint.target.angle + 540) % 360) - 180;
  expect(Math.abs(angleDelta)).toBeLessThan(1.5);
});

test('初始反向转场确认中断并回到玩家画面，其他键不反转', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('#main-menu-nav [data-action="start"]').click();
  await page.locator('#mode-list .mode-btn[data-mode="nomiss"]').click();
  await page.locator('.diff-btn[data-diff="normal"]').click();
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/, { timeout: 2000 });
  await expect(page.locator('#screen-player-select')).not.toHaveClass(/selection-arriving/);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const screen = document.querySelector('#screen-difficulty');
    return screen?.classList.contains('selection-arriving')
      && document.querySelector('.selection-transition-band');
  });
  const transition = page.locator('.selection-transition-band');
  const readBandDirection = () => page.evaluate(() => {
    const band = document.querySelector('.selection-transition-band');
    const player = document.querySelector('#screen-player-select .player-focus-band');
    const difficulty = document.querySelector('#screen-difficulty .difficulty-focus-band');
    const center = (el) => {
      const rect = el?.getBoundingClientRect();
      return rect ? rect.left + rect.width / 2 : null;
    };
    return { band: center(band), player: center(player), difficulty: center(difficulty) };
  });
  const before = await readBandDirection();
  expect(before.band).not.toBeNull();
  expect(before.player).not.toBeNull();
  expect(before.difficulty).not.toBeNull();
  const sameAnimation = await page.evaluate(() => {
    const band = document.querySelector('.selection-transition-band');
    const animation = band.getAnimations()[0];
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', bubbles: true }));
    return band.getAnimations()[0] === animation;
  });
  expect(sameAnimation).toBe(true);
  const afterX = await readBandDirection();
  await page.keyboard.press('z');
  await page.waitForTimeout(180);
  const afterConfirm = await readBandDirection();
  expect(Math.abs(afterConfirm.band - afterX.band)).toBeGreaterThan(2);
  expect(Math.abs(afterConfirm.band - afterConfirm.player))
    .toBeLessThan(Math.abs(afterX.band - afterX.player));
  await expect(transition).toHaveCount(0, { timeout: 2000 });
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/, { timeout: 2000 });
  await expect(page.locator('#screen-difficulty')).not.toHaveClass(/active/);
});

test('窄屏玩家转场带尺寸匹配当前自机说明文字', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('#main-menu-nav [data-action="start"]').click();
  await page.locator('#mode-list .mode-btn[data-mode="nomiss"]').click();
  await page.locator('.diff-btn[data-diff="normal"]').click();
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/, { timeout: 2000 });
  await expect(page.locator('#screen-player-select')).not.toHaveClass(/selection-arriving/);
  const bounds = await page.evaluate(() => {
    const text = document.querySelector('#screen-player-select .player-card.current-player p');
    const band = document.querySelector('#screen-player-select .player-focus-band');
    const textRect = text?.getBoundingClientRect();
    const bandRect = band?.getBoundingClientRect();
    return textRect && bandRect ? {
      text: { left: textRect.left, top: textRect.top, width: textRect.width, height: textRect.height },
      band: { left: bandRect.left, top: bandRect.top, width: bandRect.width, height: bandRect.height },
    } : null;
  });
  expect(bounds).not.toBeNull();
  for (const key of ['left', 'top', 'width', 'height']) {
    expect(Math.abs(bounds.band[key] - bounds.text[key])).toBeLessThan(1.5);
  }
});
test('Extra 完成自机入场后返回，转场带保持 EX 文案高度', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await waitForGameReady(page);

  await page.locator('#main-menu-nav [data-action="extra-start"]').click();
  const difficulty = page.locator('#screen-difficulty');
  await expect(difficulty).toHaveClass(/active/, { timeout: 2000 });
  await expect(difficulty).not.toHaveClass(/selection-arriving/, { timeout: 2000 });

  const extra = page.locator('#screen-difficulty .diff-btn[data-diff="extra"]');
  await expect(extra).toHaveClass(/selected/);
  await extra.click();
  const player = page.locator('#screen-player-select');
  await expect(player).toHaveClass(/active/, { timeout: 2000 });
  await expect(player).not.toHaveClass(/selection-arriving/, { timeout: 2000 });

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('#screen-difficulty.selection-arriving')
    && document.querySelector('.selection-transition-band')
    && document.querySelector('#screen-difficulty .diff-btn[data-diff="extra"].selected'));

  const endpoint = await page.evaluate(() => {
    const band = document.querySelector('.selection-transition-band');
    const extra = document.querySelector('#screen-difficulty .diff-btn[data-diff="extra"].selected');
    const animation = [...(band?.getAnimations() || [])]
      .find((a) => Number(a.effect?.getComputedTiming().duration) === 760);
    if (!band || !extra || !animation) return null;
    animation.currentTime = Number(animation.effect.getComputedTiming().duration);
    const bandHeight = band.getBoundingClientRect().height;
    const textHeight = extra.getBoundingClientRect().height;
    return { bandHeight, textHeight, expectedHeight: Math.ceil(textHeight) + 24 };
  });
  expect(endpoint).not.toBeNull();
  expect(endpoint.bandHeight).toBeGreaterThan(endpoint.textHeight);
  expect(endpoint.bandHeight).not.toBe(24);
  expect(Math.abs(endpoint.bandHeight - endpoint.expectedHeight)).toBeLessThan(1.5);

  await expect(page.locator('.selection-transition-band')).toHaveCount(0, { timeout: 2000 });
  const settled = await page.evaluate(() => {
    const band = document.querySelector('#screen-difficulty .difficulty-focus-band');
    const extra = document.querySelector('#screen-difficulty .diff-btn[data-diff="extra"].selected');
    if (!band || !extra) return null;
    return {
      bandHeight: Number.parseFloat(getComputedStyle(band).height),
      expectedHeight: Math.ceil(extra.getBoundingClientRect().height) + 24,
    };
  });
  expect(settled).not.toBeNull();
  expect(Math.abs(settled.bandHeight - settled.expectedHeight)).toBeLessThan(1.5);
});

test('难度返回模式时模式文字在转场中段已可见', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('#main-menu-nav [data-action="start"]').click();
  await page.locator('#mode-list .mode-btn[data-mode="nomiss"]').click();
  await expect(page.locator('#screen-difficulty')).toHaveClass(/active/, { timeout: 2000 });
  await expect(page.locator('#screen-difficulty')).not.toHaveClass(/selection-arriving/);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('#screen-mode-select.selection-arriving'));
  await page.waitForTimeout(220);
  const modeText = await page.evaluate(() => {
    const text = document.querySelector('#screen-mode-select .mode-btn.selected .mode-name');
    if (!text) return null;
    const rect = text.getBoundingClientRect();
    const style = getComputedStyle(text);
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const screens = [...document.querySelectorAll('.selection-in-motion')];
    const inertStates = screens.map(el => el.inert);
    screens.forEach(el => { el.inert = false; });
    const stack = document.elementsFromPoint(x, y);
    screens.forEach((el, i) => { el.inert = inertStates[i]; });
    return {
      visible: style.visibility !== 'hidden' && Number.parseFloat(style.opacity) > 0.05,
      inViewport: rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight,
      hit: stack.some((el) => el === text || text.contains(el)),
    };
  });
  expect(modeText).not.toBeNull();
  expect(modeText.visible).toBe(true);
  expect(modeText.inViewport).toBe(true);
  expect(modeText.hit).toBe(true);
});

test('Lunatic 返回时 Easy 难度节点全程保持不可见', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('#main-menu-nav [data-action="start"]').click();
  await page.locator('#mode-list .mode-btn[data-mode="nomiss"]').click();
  await expect(page.locator('#screen-difficulty')).toHaveClass(/active/);
  await expect(page.locator('#screen-difficulty')).not.toHaveClass(/selection-arriving/);

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/);
  await expect(page.locator('#screen-player-select')).not.toHaveClass(/selection-arriving/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-difficulty')).toHaveClass(/active/);
  await expect(page.locator('#screen-difficulty')).not.toHaveClass(/selection-arriving/);

  await page.keyboard.press('Escape');
  const easy = page.locator('#screen-difficulty .diff-btn[data-diff="easy"]');
  await page.waitForFunction(() => {
    const screen = document.querySelector('#screen-difficulty');
    return screen?.classList.contains('active')
      && document.querySelector('#screen-mode-select')?.classList.contains('selection-arriving');
  });
  const departingOpacity = await page.evaluate(() => {
    const easy = document.querySelector('#screen-difficulty .diff-btn[data-diff="easy"]');
    const animation = [...(easy?.getAnimations() || [])].find((a) => a.effect?.getComputedTiming().duration > 0);
    if (!easy || !animation) return null;
    const timing = animation.effect.getComputedTiming();
    animation.currentTime = Number(timing.duration) / 2;
    animation.pause();
    return { opacity: Number.parseFloat(getComputedStyle(easy).opacity), playState: animation.playState };
  });
  expect(departingOpacity).not.toBeNull();
  expect(departingOpacity.opacity).toBeLessThanOrEqual(0.01);
  await page.evaluate(() => document.getAnimations().forEach(a => a.finish()));
  await expect(page.locator('#screen-mode-select')).toHaveClass(/active/);
  await expect(page.locator('#screen-difficulty')).not.toHaveClass(/active/);
  await expect(easy).not.toBeVisible();
});

test('模式与难度返回保留选择，确认转场取消不延迟开局', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('#main-menu-nav [data-action="start"]').click();
  await expect(page.locator('#screen-mode-select')).toHaveClass(/active/);

  await page.locator('#mode-list .mode-btn[data-mode="nomiss"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-mode-select')).toHaveJSProperty('inert', false);
  await expect(page.locator('#mode-list .mode-btn[data-mode="nomiss"]')).toHaveClass(/selected/);
  await page.waitForTimeout(850);
  await expect(page.locator('#screen-game')).not.toHaveClass(/active/);

  await page.locator('#mode-list .mode-btn[data-mode="nomiss"]').click();
  await expect(page.locator('#screen-difficulty')).toHaveJSProperty('inert', false);
  await page.locator('.diff-btn[data-diff="hard"]').click();
  await expect(page.locator('#screen-player-select')).toHaveJSProperty('inert', false);
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-difficulty')).toHaveJSProperty('inert', false);
  await expect(page.locator('.diff-btn[data-diff="hard"]')).toHaveClass(/selected/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#screen-mode-select')).toHaveJSProperty('inert', false);
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
