import { test, expect } from '@playwright/test';
import { waitForGameReady, cleanStorage } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await waitForGameReady(page);
  await cleanStorage(page);
});

test('排行榜：A线 / EX+续 标签渲染', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('gunwei_ranking', JSON.stringify({
      easy: [
        {
          score: 123456, name: 'TST', playerName: '饮泉思源', playerId: 'yinquan',
          difficultyId: 'easy', mode: 'story', route: 'A', cleared: false,
          continued: false, stageReached: 'Stage 1', date: Date.now(),
        },
        {
          score: 99999, name: 'TST', playerName: '誓约沙玛', playerId: 'shama',
          difficultyId: 'easy', mode: 'extra', route: 'EX', cleared: true,
          continued: true, stageReached: 'EX', date: Date.now() - 1000,
        },
      ],
    }));
  });

  await page.locator('button[data-action="ranking"]').click();
  await expect(page.locator('#screen-ranking')).toHaveClass(/active/);

  const routes = page.locator('#ranking-list .ranking-route');
  await expect(routes).toHaveCount(2);
  await expect(routes.nth(0)).toHaveText('A线');
  await expect(routes.nth(1)).toHaveText(/EX/);
  await expect(routes.nth(1).locator('.rk-badge')).toHaveText('续');
});

test('Nomiss 结算：两行短统计输出', async ({ page }) => {
  await page.locator('button[data-action="start"]').click();
  await expect(page.locator('#screen-difficulty')).toHaveClass(/active/);
  await page.locator('.diff-btn[data-diff="normal"]').click();
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/);

  const nomiss = page.locator('#player-nomiss');
  await nomiss.check();
  await page.locator('.player-card[data-player="yinquan"]').click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);

  await page.keyboard.press('Escape');
  await expect(page.locator('#game-overlay')).not.toHaveClass(/hidden/);
  await page.locator('#overlay-actions [data-overlay="settle"]').click();

  await expect(page.locator('#overlay-title')).toHaveText('Nomiss 结算');
  const body = page.locator('#overlay-body');
  await expect(body).toContainText('擦弹 0 · 击破 0 · 道具 0');
  await expect(body).toContainText('Bomb 0 · Miss 0 · NMNB 0 · 最大连击 0 · 用时');
});
