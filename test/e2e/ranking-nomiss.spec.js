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

test('Nomiss：难度前入口续接已保存章节，暂停无录像且结算不进榜', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('gunwei_nomiss_progress', JSON.stringify({ nextChapterId: 7 }));
  });

  await page.locator('button[data-action="start"]').click();
  await expect(page.locator('#screen-mode-select')).toHaveClass(/active/);
  await page.locator('#mode-list .mode-btn[data-mode="nomiss"]').click();
  await expect(page.locator('#screen-difficulty')).toHaveClass(/active/);
  await page.locator('.diff-btn[data-diff="normal"]').click();
  await expect(page.locator('#screen-player-select')).toHaveClass(/active/);
  await page.locator('#screen-player-select .player-card[data-player="yinquan"]').click();
  await expect(page.locator('#screen-game')).toHaveClass(/active/);
  await expect(page.locator('#ui-mode-nomiss')).toBeVisible();
  await expect(page.locator('#ui-chapter')).toHaveText(/^2-1 /);

  await page.keyboard.press('Escape');
  await expect(page.locator('#game-overlay')).not.toHaveClass(/hidden/);
  await expect(page.locator('#overlay-actions [data-overlay="save-replay"]')).not.toBeVisible();
  await page.locator('#overlay-actions [data-overlay="settle"]').click();
  await page.locator('#overlay-actions [data-overlay="confirm-yes"]').click();
  await expect(page.locator('#overlay-title')).toHaveText('Nomiss 结算');
  await expect(page.locator('#score-ranking')).toHaveClass(/hidden/);
});
