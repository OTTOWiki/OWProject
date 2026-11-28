/**
 * 续关流程（PR-stats）：Game Over 统一先过成绩排行；续关后分数清零。
 * - runOverlayAction 'continue'：分数/baseScore 清零（hiscore 保留）、
 *   次数-1、不再录制、恢复 2 残 2B 重开本章
 * - 守卫：回放 / 非结果叠加层 / 次数用尽 / practice / nomiss 一律 no-op
 */
import { BALANCE } from '../js/config.js';
import { runOverlayAction, openPause } from '../js/gameOverlay.js';
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

/* ========== 审计修复回归（#3 / #38 / #39） ========== */

/** 带最小 DOM 替身的叠加层 game mock（showOverlay/hideOverlay 不读真实文档） */
function overlayGame(over = {}) {
  const g = createMockGame();
  g.replaying = false;
  g.overlayMode = null;
  g.paused = false;
  g.state = 'playing';
  g.mode = 'story';
  g.el = {
    overlay: null,
    overlayActions: null,
    overlayTitle: null,
    overlayBody: null,
    overlayHint: { textContent: '' },
  };
  Object.assign(g, over);
  return g;
}

/** 用内存 Map 替代 localStorage，返回句柄便于断言写盘结果 */
function withMemoryStorage(fn) {
  const had = 'localStorage' in globalThis;
  const prev = globalThis.localStorage;
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
  };
  return Promise.resolve()
    .then(() => fn(mem))
    .finally(() => {
      if (had) globalThis.localStorage = prev; else delete globalThis.localStorage;
    });
}

test('#3 回放中触屏/键盘暂停入口不打开暂停层；非回放仍可暂停', () => {
  const replay = overlayGame({ replaying: true });
  openPause(replay);
  assertEqual(replay.paused, false, '回放中不进入暂停');
  assertEqual(replay.overlayMode, null, '回放中不显示暂停层');

  const normal = overlayGame();
  openPause(normal);
  assertEqual(normal.paused, true);
  assertEqual(normal.overlayMode, 'pause');
});

test('#39 练习结算“再试一次”沿用本局起始残机', async () => {
  const g = overlayGame({
    mode: 'practice',
    overlayMode: 'result',
    _startLives: 1,
    resultPayload: { retryChapter: 3, difficulty: 'normal' },
    chapters: [{ id: 3, name: '测试章' }],
    chapterIndex: 0,
  });
  g.player.lives = 1;
  g.practiceUnstable = false;
  g.singleChapter = false;
  let started = null;
  g.start = (opts) => { started = opts; };
  runOverlayAction(g, 'retry');
  await Promise.resolve();
  assert(started, '应重开对局');
  assertEqual(started.lives, 1, '练习自定义残机不能被回落为默认 4');
  assertEqual(started.mode, 'practice');
});

test('#39 暂停中“重开本章”仍沿用当前残机', async () => {
  const g = overlayGame({
    mode: 'story',
    overlayMode: 'pause',
    chapters: [{ id: 2, name: '测试章' }],
    chapterIndex: 0,
  });
  g.player.lives = 3;
  g.practiceUnstable = true;
  g.singleChapter = false;
  let started = null;
  g.start = (opts) => { started = opts; };
  runOverlayAction(g, 'retry');
  await Promise.resolve();
  assert(started);
  assertEqual(started.lives, 3);
});

test('#38 结局对话中退出：暂存入榜成绩在 menu 分支落盘，不丢失', () => withMemoryStorage(async (mem) => {
  const g = overlayGame();
  g.overlayMode = 'pause';
  g.ui = { showMenu() {}, showReplayScreen() {} };
  let stopped = 0;
  g.stop = () => { stopped += 1; };
  g._rankingResult = {
    qualifies: true,
    difficultyId: 'normal',
    entry: {
      score: 123456,
      name: '饮泉思',
      playerName: '饮泉思源',
      playerId: 'yinquan',
      difficultyId: 'normal',
      mode: 'story',
      route: 'A',
      cleared: true,
      stageReached: 'Stage 3',
      duration: 60,
      date: 1,
    },
    rank: 0,
  };
  runOverlayAction(g, 'menu');
  await Promise.resolve();
  assertEqual(stopped, 1, '应正常停止对局');
  assertEqual(g._rankingResult, null, '落盘后清标记');
  const ranking = JSON.parse(mem.get('gunwei_ranking'));
  assertEqual(ranking.normal.length, 1, '成绩应写入排行榜');
  assertEqual(ranking.normal[0].score, 123456);
  assertEqual(ranking.normal[0].cleared, true);
  assertEqual(mem.get('gunwei_ranking_name'), '饮泉思', '同时记住昵称');

  // 再执行一次 menu 不会重复写盘（_rankingResult 已处理）
  g.overlayMode = 'pause';
  runOverlayAction(g, 'menu');
  await Promise.resolve();
  assertEqual(JSON.parse(mem.get('gunwei_ranking')).normal.length, 1, '不得重复入榜');
}));

test('#38 未入榜成绩退出不写盘', () => withMemoryStorage(async (mem) => {
  const g = overlayGame();
  g.overlayMode = 'pause';
  g.ui = { showMenu() {}, showReplayScreen() {} };
  g.stop = () => {};
  g._rankingResult = { qualifies: false };
  runOverlayAction(g, 'menu');
  await Promise.resolve();
  assertEqual(mem.has('gunwei_ranking'), false, '未入榜不应写排行榜');
}));
