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

  const rate = await page.evaluate(() => (
    document.querySelector('.load-petals-track').getAnimations()[0].playbackRate
  ));
  expect(rate).toBeGreaterThan(0);

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

test('加载落花：矮屏仍保持黑带居中、少女祈祷中在右下', async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 600 });
  const release = await holdAudio(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const layout = await page.evaluate(() => {
    const band = document.querySelector('.load-band').getBoundingClientRect();
    const corner = document.querySelector('.load-corner').getBoundingClientRect();
    const petals = document.querySelector('.load-petals').getBoundingClientRect();
    return {
      bandCenter: band.top + band.height / 2,
      viewportCenter: window.innerHeight / 2,
      cornerRight: window.innerWidth - corner.right,
      cornerBottom: window.innerHeight - corner.bottom,
      petalsTop: petals.top,
      petalsRight: window.innerWidth - petals.right,
      petalsBottom: window.innerHeight - petals.bottom,
    };
  });
  expect(Math.abs(layout.bandCenter - layout.viewportCenter)).toBeLessThanOrEqual(1);
  expect(layout.cornerRight).toBeLessThanOrEqual(30);
  expect(layout.cornerBottom).toBeLessThanOrEqual(30);
  expect(layout.petalsTop).toBeGreaterThan(layout.viewportCenter);
  expect(layout.petalsRight).toBeLessThanOrEqual(30);
  expect(layout.petalsBottom).toBeLessThanOrEqual(30);

  release();
});
