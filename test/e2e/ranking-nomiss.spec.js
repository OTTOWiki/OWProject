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

test('自机选择两名角色与练习结算：移除 Nomiss 入口和返回按钮', async ({ page }) => {
  await page.locator('button[data-action="practice"]').click();
  await expect(page.locator('#screen-practice')).toHaveClass(/active/);
  await page.locator('#screen-practice [data-action="practice-start"]').click();
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/);

  await expect(page.locator('#screen-player-select .player-card')).toHaveCount(2);
  await expect(page.locator('#player-nomiss')).toHaveCount(0);
  await expect(page.locator('#player-nomiss-row')).toHaveCount(0);
  await expect(page.locator('#screen-player-select [data-action="back-diff"]')).toHaveCount(0);

  await page.locator('.player-card[data-player="yinquan"]').click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  await page.evaluate(() => {
    owDebug.set({ invincible: true, lockLives: true, lockBombs: true, skipDialogue: true, timeScale: 8 });
    owDebug.kill();
  });

  await expect(page.locator('#overlay-title')).toHaveText('练习结束', { timeout: 10000 });
  const body = page.locator('#overlay-body');
  await expect(body).toBeVisible();
  await expect(body).toContainText('难度：');
  await expect(body).toContainText('章节：');
  await expect(body).toContainText('得分：');
  await expect(body).toContainText('擦弹');
  await expect(body).toContainText('Bomb');
  await expect(body).toContainText('用时');
});
