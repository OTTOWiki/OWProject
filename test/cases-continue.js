/**
 * 续关流程（PR-stats）：Game Over 统一先过成绩排行；续关后分数清零。
 * - runOverlayAction 'continue'：分数/baseScore 清零（hiscore 保留）、
 *   次数-1、不再录制、恢复 2 残 2B 重开本章
 * - 守卫：回放 / 非结果叠加层 / 次数用尽 / practice / nomiss 一律 no-op
 */
import { BALANCE } from '../js/config.js';
import { runOverlayAction } from '../js/gameOverlay.js';
import { createMockGame } from './mockGame.js';
import { test, assert, assertEqual } from './assert.js';

/** 处于 Game Over 结果叠加层的轻量 game mock（够 startChapter 跑通） */
function continueResultGame() {
  const ch = { id: 3, stageKey: '1', kind: 'mid', name: '测试章', unstable: false, music: null, letter: null, build() {} };
  const g = createMockGame();
  g.chapters = [ch];
  g.chapterIndex = 0;
  g.mode = 'story';
  g.replaying = false;
  g.state = 'gameover';
  g.overlayMode = 'result';
  g.paused = true;
  g.recording = true;
  g.score = 50000;
  g.baseScore = 30000;
  g.hiscore = 99999; // 全局最高，续关不重置
  g.continuesLeft = 2;
  g.continuesUsed = 0;
  g.combo = 0;
  g.comboTimer = 0;
  g.totalTendency = 0;
  g.diff = { rank: 'NORMAL', name: '白银', color: '#4ade80' };
  g.difficultyId = 'normal';
  g.playerId = 'yinquan';
  g.practiceUnstable = false;
  g.singleChapter = false;
  g.stats = { graze: 0, kills: 0, bombs: 0, deathbombs: 0, misses: 0, nmnb: 0, items: 0, maxCombo: 0, time: 0 };
  g.audio = { playTrack() {}, sfx() {}, stopMusic() {} };
  g.playBg = { setMode() {} };
  g.background = null;
  g.el = {
    overlay: null,
    flash: { textContent: '', classList: { add() {}, remove() {} } },
    stageLabel: { textContent: '' },
    letterBanner: { classList: { add() {}, remove() {}, contains: () => true }, style: {} },
  };
  g.player.resetPos = () => {};
  g.player.lives = 1;
  g.player.bombs = 0;
  return g;
}

test('续关：分数与 baseScore 清零、hiscore 保留、次数/录像/资源正确', () => {
  const g = continueResultGame();
  runOverlayAction(g, 'continue');

  assertEqual(g.score, 0, '续关后分数清零');
  assertEqual(g.baseScore, 0, 'baseScore 清零（Extend 阈值从 0 重新计）');
  assertEqual(g.hiscore, 99999, 'hiscore 保留全局最高');
  assertEqual(g.continuesLeft, 1);
  assertEqual(g.continuesUsed, 1);
  assertEqual(g.recording, false, '续关后不再录制');
  assertEqual(g.overlayMode, null, '叠加层关闭');
  // startChapter 已执行；stage 1 有新面过渡 → state 可为 stageTransit（随后自动进 playing）
  assert(['playing', 'stageTransit'].includes(g.state), `state=${g.state}`);
  assertEqual(g.player.lives, BALANCE.continue.lives);
  assertEqual(g.player.bombs, BALANCE.continue.bombs);
  // startChapter 已执行（重开本章）
  assertEqual(g.chapterTime, 0);
  assertEqual(g.lastStageKey, '1');
});

test('续关守卫：practice / nomiss / 次数用尽 / 回放 一律 no-op', () => {
  for (const mode of ['practice', 'nomiss']) {
    const g = continueResultGame();
    g.mode = mode;
    runOverlayAction(g, 'continue');
    assertEqual(g.score, 50000, `${mode} 不可续关，分数不动`);
    assertEqual(g.continuesLeft, 2, `${mode} 次数不动`);
    assertEqual(g.overlayMode, 'result', `${mode} 叠加层不关`);
  }
  {
    const g = continueResultGame();
    g.continuesLeft = 0;
    runOverlayAction(g, 'continue');
    assertEqual(g.score, 50000, '次数用尽不可续关');
    assertEqual(g.overlayMode, 'result');
  }
  {
    const g = continueResultGame();
    g.replaying = true;
    runOverlayAction(g, 'continue');
    assertEqual(g.score, 50000, '回放不可续关');
    assertEqual(g.continuesLeft, 2);
  }
});

test('续关守卫：非结果叠加层（暂停）不可续关', () => {
  const g = continueResultGame();
  g.overlayMode = 'pause';
  runOverlayAction(g, 'continue');
  assertEqual(g.score, 50000, '暂停叠加层不触发续关');
  assertEqual(g.continuesLeft, 2);
});
