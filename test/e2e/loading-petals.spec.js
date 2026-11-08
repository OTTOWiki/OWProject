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

test('加载落花：两层 WAAPI 动画随真实进度存在，完成后随加载层移除', async ({ page }) => {
  const release = await holdAudio(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.load-petals-layer')).toHaveCount(2);

  await expect.poll(() => page.evaluate(() => (
    [...document.querySelectorAll('.load-petals-layer')].map((layer) => layer.getAnimations().length)
  ))).toEqual([1, 1]);

  const rates = await page.evaluate(() => (
    [...document.querySelectorAll('.load-petals-layer')].map((layer) => layer.getAnimations()[0].playbackRate)
  ));
  expect(rates).toHaveLength(2);
  expect(rates.every((rate) => rate > 0)).toBe(true);

  release();
  await waitForGameReady(page);
  await expect(page.locator('#load-screen')).toHaveCount(0);
});

test('加载落花：减少动态效果时不创建 WAAPI 动画，静态纹理仍存在', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const release = await holdAudio(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.load-petals-layer')).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => (
    [...document.querySelectorAll('.load-petals-layer')].every((layer) => layer.getAnimations().length === 0)
  ))).toBe(true);
  release();
});

test('加载落花：可恢复失败时暂停，继续按钮仍可用', async ({ page }) => {
  await page.route('**/*.ogg', (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('#load-continue').waitFor({ state: 'visible', timeout: 60000 });

  const states = await page.evaluate(() => (
    [...document.querySelectorAll('.load-petals-layer')].map((layer) => (
      layer.getAnimations()[0]?.playState ?? 'none'
    ))
  ));
  expect(states).toEqual(['paused', 'paused']);

  await page.locator('#load-continue').click();
  await expect(page.locator('#load-screen')).toHaveCount(0);
});
