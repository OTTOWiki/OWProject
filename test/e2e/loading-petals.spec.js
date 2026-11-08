import { test, expect } from '@playwright/test';
import { waitForGameReady } from './helpers.js';

async function holdAudio(page) {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route('**/*.ogg', async (route) => {
    await gate;
    await route.continue();
  });
  return release;
}

test('加载落花：局部单轨动画随真实进度存在，完成后随加载层移除', async ({ page }) => {
  const release = await holdAudio(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.load-petals-track')).toHaveCount(1);

  await expect.poll(() => page.evaluate(() => (
    document.querySelector('.load-petals-track').getAnimations().length
  ))).toBe(1);

  const overlay = await page.evaluate(() => {
    const track = document.querySelector('.load-petals-track');
    const anim = track.getAnimations()[0];
    const matrix = new DOMMatrix(getComputedStyle(track).transform);
    return {
      zPetals: Number(getComputedStyle(document.querySelector('.load-petals')).zIndex),
      zCorner: Number(getComputedStyle(document.querySelector('.load-corner')).zIndex),
      duration: getComputedStyle(track).animationDuration,
      y: matrix.m42,
      rate: anim.playbackRate,
    };
  });
  expect(overlay.rate).toBeGreaterThan(0);
  expect(overlay.duration).toBe('8s');
  expect(overlay.zPetals).toBeGreaterThan(overlay.zCorner);

  await page.waitForTimeout(250);
  const movedY = await page.evaluate(() => (
    new DOMMatrix(getComputedStyle(document.querySelector('.load-petals-track')).transform).m42
  ));
  expect(movedY).toBeGreaterThan(overlay.y);

  release();
  await waitForGameReady(page);
  await expect(page.locator('#load-screen')).toHaveCount(0);
});

test('加载落花：减少动态效果时不创建 WAAPI 动画，静态纹理仍存在', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const release = await holdAudio(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.load-petals-track')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => (
    document.querySelector('.load-petals-track').getAnimations().length
  ))).toBe(0);
  release();
});

test('加载落花：可恢复失败时暂停，继续按钮仍可用', async ({ page }) => {
  await page.route('**/*.ogg', (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('#load-continue').waitFor({ state: 'visible', timeout: 60000 });

  const state = await page.evaluate(() => (
    document.querySelector('.load-petals-track').getAnimations()[0]?.playState ?? 'none'
  ));
  expect(state).toBe('paused');

  await page.locator('#load-continue').click();
  await expect(page.locator('#load-screen')).toHaveCount(0);
});

test('加载落花：矮屏 / 手机横屏仍保持黑带居中、少女祈祷中在右下', async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 600 });
  const release = await holdAudio(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const readLayout = () => page.evaluate(() => {
    const band = document.querySelector('.load-band').getBoundingClientRect();
    const corner = document.querySelector('.load-corner').getBoundingClientRect();
    const petals = document.querySelector('.load-petals').getBoundingClientRect();
    return {
      vw: window.innerWidth,
      vh: window.innerHeight,
      bandCenter: band.top + band.height / 2,
      bandBottom: band.bottom,
      cornerLeft: corner.left,
      cornerRight: window.innerWidth - corner.right,
      cornerBottom: window.innerHeight - corner.bottom,
      cornerTop: corner.top,
      petalsWidth: petals.width,
      petalsTop: petals.top,
      petalsRight: window.innerWidth - petals.right,
      petalsBottom: window.innerHeight - petals.bottom,
    };
  });

  const desktop = await readLayout();
  expect(Math.abs(desktop.bandCenter - desktop.vh / 2)).toBeLessThanOrEqual(1);
  expect(desktop.cornerRight).toBeLessThanOrEqual(30);
  expect(desktop.cornerBottom).toBeLessThanOrEqual(30);
  expect(desktop.petalsTop).toBeGreaterThan(desktop.vh / 2);

  // iPhone SE 一类的手机横屏：宽度 ≤720，必须仍走紧凑横屏，而不是大字号移动布局。
  await page.setViewportSize({ width: 667, height: 375 });
  await page.waitForTimeout(250);
  const mobile = await readLayout();
  expect(Math.abs(mobile.bandCenter - mobile.vh / 2)).toBeLessThanOrEqual(1);
  expect(mobile.cornerLeft).toBeGreaterThan(mobile.vw * 0.5);
  expect(mobile.cornerTop).toBeGreaterThanOrEqual(mobile.bandBottom - 1);
  expect(mobile.cornerRight).toBeLessThanOrEqual(30);
  expect(mobile.cornerBottom).toBeLessThanOrEqual(30);
  expect(mobile.petalsWidth).toBeLessThanOrEqual(340);
  expect(mobile.petalsTop).toBeGreaterThan(mobile.vh * 0.5);
  expect(mobile.petalsRight).toBeLessThanOrEqual(30);
  expect(mobile.petalsBottom).toBeLessThanOrEqual(30);

  release();
});
