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

test('前进转场被打断后从当前视觉位置反向，使用新的快到慢动画', async ({ page }) => {
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
      && [...(screen?.getAnimations({ subtree: true }) || [])]
        .some((a) => a.effect?.target?.matches('.diff-btn.selected')
          && Number(a.effect.getComputedTiming().duration) === 760);
  });

  const before = await page.evaluate(() => {
    const target = document.querySelector('#screen-difficulty .diff-btn.selected');
    const animation = [...(target?.getAnimations() || [])]
      .find((a) => Number(a.effect?.getComputedTiming().duration) === 760);
    if (!target || !animation) return null;
    animation.currentTime = 300;
    animation.pause();
    const rect = target.getBoundingClientRect();
    return { centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2 };
  });
  expect(before).not.toBeNull();

  await page.keyboard.press('Escape');
  const reverse = await page.evaluate(() => {
    const target = document.querySelector('#screen-difficulty .diff-btn.selected');
    const animation = [...(target?.getAnimations() || [])]
      .find((a) => Number(a.effect?.getComputedTiming().duration) === 760);
    if (!target || !animation) return null;
    animation.currentTime = 0;
    animation.pause();
    const rect = target.getBoundingClientRect();
    return {
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      easing: animation.effect.getComputedTiming().easing,
      playbackRate: animation.playbackRate,
    };
  });
  expect(reverse).not.toBeNull();
  expect(Math.hypot(reverse.centerX - before.centerX, reverse.centerY - before.centerY)).toBeLessThan(2);
  expect(reverse.easing).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
  expect(reverse.playbackRate).toBeGreaterThan(0);

  const displacement = await page.evaluate(() => {
    const target = document.querySelector('#screen-difficulty .diff-btn.selected');
    const animation = [...(target?.getAnimations() || [])]
      .find((a) => Number(a.effect?.getComputedTiming().duration) === 760);
    if (!target || !animation) return null;
    const centers = [0, 190, 380, 570].map((time) => {
      animation.currentTime = time;
      animation.pause();
      const rect = target.getBoundingClientRect();
      return rect.left + rect.width / 2;
    });
    animation.play();
    return centers;
  });
  expect(displacement).not.toBeNull();
  const steps = displacement.slice(1).map((x, i) => Math.abs(x - displacement[i]));
  expect(steps[0]).toBeGreaterThan(steps[1]);
  expect(steps[1]).toBeGreaterThan(steps[2]);

  await expect(modeScreen).toHaveClass(/active/, { timeout: 2000 });
  await expect(difficultyScreen).not.toHaveClass(/active/);
  const cleanup = await page.evaluate(() => ({
    bands: document.querySelectorAll('.selection-transition-band').length,
    animations: [...document.querySelectorAll('#screen-difficulty, #screen-mode-select')]
      .reduce((n, screen) => n + screen.getAnimations({ subtree: true }).length, 0),
  }));
  expect(cleanup).toEqual({ bands: 0, animations: 0 });
});

test('反向转场再次被打断可继续前进，反复切换后落在正确页面并清理演出', async ({ page }) => {
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
      && [...(screen?.getAnimations({ subtree: true }) || [])]
        .some((a) => a.effect?.target?.matches('.diff-btn.selected')
          && Number(a.effect.getComputedTiming().duration) === 760);
  });

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => [...(document.querySelector('#screen-difficulty')?.getAnimations({ subtree: true }) || [])]
    .some((a) => a.effect?.target?.matches('.diff-btn.selected')
      && Number(a.effect.getComputedTiming().duration) === 760));

  const before = await page.evaluate(() => {
    const target = document.querySelector('#screen-difficulty .diff-btn.selected');
    const animation = [...(target?.getAnimations() || [])]
      .find((a) => Number(a.effect?.getComputedTiming().duration) === 760);
    if (!target || !animation) return null;
    animation.currentTime = 300;
    animation.pause();
    const rect = target.getBoundingClientRect();
    return { centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2 };
  });
  expect(before).not.toBeNull();

  await page.keyboard.press('Escape');
  const forward = await page.evaluate(() => {
    const target = document.querySelector('#screen-difficulty .diff-btn.selected');
    const animation = [...(target?.getAnimations() || [])]
      .find((a) => Number(a.effect?.getComputedTiming().duration) === 760);
    if (!target || !animation) return null;
    animation.currentTime = 0;
    animation.pause();
    const rect = target.getBoundingClientRect();
    return {
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      easing: animation.effect.getComputedTiming().easing,
      playbackRate: animation.playbackRate,
    };
  });
  expect(forward).not.toBeNull();
  expect(Math.hypot(forward.centerX - before.centerX, forward.centerY - before.centerY)).toBeLessThan(2);
  expect(forward.easing).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
  expect(forward.playbackRate).toBeGreaterThan(0);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(40);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(40);
  await page.keyboard.press('Escape');
  await expect(modeScreen).toHaveClass(/active/, { timeout: 2000 });
  await expect(difficultyScreen).not.toHaveClass(/active/);
  const cleanup = await page.evaluate(() => ({
    bands: document.querySelectorAll('.selection-transition-band').length,
    arriving: document.querySelectorAll('.selection-arriving').length,
    animations: [...document.querySelectorAll('#screen-difficulty, #screen-mode-select')]
      .reduce((n, screen) => n + screen.getAnimations({ subtree: true }).length, 0),
  }));
  expect(cleanup).toEqual({ bands: 0, arriving: 0, animations: 0 });
});

test('玩家返回难度后立绘动画清理，快速反复返回不会卡住', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await waitForGameReady(page);
  await page.locator('#main-menu-nav [data-action="start"]').click();
  await page.locator('#mode-list .mode-btn[data-mode="nomiss"]').click();
  await expect(page.locator('#screen-difficulty')).toHaveClass(/active/);
  await page.locator('.diff-btn[data-diff="normal"]').click();
  await page.waitForFunction(() => {
    const screen = document.querySelector('#screen-player-select');
    return screen?.classList.contains('selection-arriving')
      && [...(screen?.getAnimations({ subtree: true }) || [])]
        .some((a) => a.effect?.target?.matches('.player-portrait')
          && Number(a.effect.getComputedTiming().duration) === 760);
  });
  const playerProgress = await page.evaluate(() => {
    const portrait = document.querySelector('#screen-player-select .player-portrait');
    const animation = [...(portrait?.getAnimations() || [])]
      .find((a) => Number(a.effect?.getComputedTiming().duration) === 760);
    if (!animation) return null;
    animation.currentTime = 320;
    animation.pause();
    animation.play();
    return Number(animation.currentTime);
  });
  expect(playerProgress).toBeCloseTo(320, 3);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);
  await page.keyboard.press('Escape');

  await expect(page.locator('#screen-difficulty')).toHaveClass(/active/, { timeout: 2000 });
  await expect(page.locator('#screen-player-select')).not.toHaveClass(/active/);
  const cleanup = await page.evaluate(() => {
    const portrait = document.querySelector('#screen-player-select .player-portrait');
    return {
      portraitAnimations: portrait?.getAnimations().length ?? 0,
      portraitRect: portrait?.getBoundingClientRect().toJSON() ?? null,
      activeScreens: [...document.querySelectorAll('.screen.active')].map((el) => el.id),
    };
  });
  expect(cleanup.portraitAnimations).toBe(0);
  expect(cleanup.portraitRect?.width).toBe(0);
  expect(cleanup.portraitRect?.height).toBe(0);
  expect(cleanup.activeScreens).toEqual(['screen-difficulty']);
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
