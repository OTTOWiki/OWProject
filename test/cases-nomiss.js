/**
 * Nomiss 无伤模式：
 * - 章节进度存档校验（load/saveNomissProgress）
 * - miss() 的 nomiss 分支：不扣残机、自动重开当前章（还原 Unstable + BGM 回带）
 * - 相关常量 / localStatsText
 */
import { BALANCE, STORAGE_KEYS } from '../js/config.js';
import {
  loadNomissProgress, saveNomissProgress,
} from '../js/storage.js';
import { miss } from '../js/gameCombat.js';
import { startChapter } from '../js/chapterFlow.js';
import { wrapMusicPos } from '../js/audio.js';
import { localStatsText } from '../js/gameOverlay.js';
import { isExtraRestrictedMode } from '../js/startMode.js';
import { createMockGame } from './mockGame.js';
import { test, assert, assertEqual } from './assert.js';

// Node 无 localStorage：装内存 shim（浏览器 / bun 已有则跳过）
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

test('Nomiss：STORAGE_KEYS / BALANCE 相关字段存在', () => {
  assertEqual(STORAGE_KEYS.nomissProgress, 'gunwei_nomiss_progress');
  assertEqual(BALANCE.startLives, 4);
  assertEqual(BALANCE.startBombs, 4);
  // Nomiss 走 story 同款路径：不受 Extra 难度限制（startMode 无需按 mode 特判）
  assert(!isExtraRestrictedMode('nomiss'));
});

test('saveNomissProgress / loadNomissProgress：整数往返、非法丢弃、null 清除', () => {
  localStorage.removeItem(STORAGE_KEYS.nomissProgress);
  assertEqual(loadNomissProgress(), null);

  saveNomissProgress(7);
  assertEqual(loadNomissProgress(), 7);

  // 非整数 / 负数 / 0 丢弃（不动旧进度）
  saveNomissProgress(3.5);
  assertEqual(loadNomissProgress(), 7);
  saveNomissProgress(-2);
  assertEqual(loadNomissProgress(), 7);
  saveNomissProgress(0);
  assertEqual(loadNomissProgress(), 7);

  // null / undefined 清除
  saveNomissProgress(null);
  assertEqual(loadNomissProgress(), null);
  saveNomissProgress(undefined);
  assertEqual(loadNomissProgress(), null);
});

test('loadNomissProgress：坏数据返回 null', () => {
  localStorage.setItem(STORAGE_KEYS.nomissProgress, '{oops');
  assertEqual(loadNomissProgress(), null);
  localStorage.setItem(STORAGE_KEYS.nomissProgress, '{"nextChapterId": 0}');
  assertEqual(loadNomissProgress(), null);
  localStorage.setItem(STORAGE_KEYS.nomissProgress, '{"nextChapterId": "x"}');
  assertEqual(loadNomissProgress(), null);
  localStorage.setItem(STORAGE_KEYS.nomissProgress, '{"nextChapterId": -5}');
  assertEqual(loadNomissProgress(), null);
  localStorage.removeItem(STORAGE_KEYS.nomissProgress);
});

test('miss()：nomiss 分支不扣残机、自动重开当前章（Unstable 还原 + BGM 回带）', () => {
  const ch = {
    id: 3, stageKey: '1', kind: 'mid', name: '测试章', unstable: true,
    music: null, letter: null,
    build() {},
  };
  const g = createMockGame();
  g.mode = 'nomiss';
  g.replaying = false;
  g.chapters = [ch];
  g.chapterIndex = 0;
  g.score = 0;
  g.hiscore = 0;
  g.totalTendency = 0;
  g.diff = { rank: 'NORMAL', name: '白银', color: '#4ade80' };
  g.state = 'playing';
  g.audio = {
    _sfxCalls: [],
    _seeked: null,
    currentId: 's1_mid',
    sfx(t) { this._sfxCalls.push(t); },
    playTrack() {},
    seekMusic(pos) { this._seeked = pos; },
    musicPosition() { return 12.5; }, // 章首记录到的进章位置
  };
  g.playBg = { setMode() {} };
  g.el = {
    flash: { textContent: '', classList: { add() {}, remove() {} } },
    stageLabel: { textContent: '' },
    letterBanner: { classList: { add() {}, remove() {}, contains: () => true } },
  };
  g.player.resetPos = () => {};
  g.player.invuln = 0;
  const livesBefore = g.player.lives;
  g._nomissBgmPos = 12.5;
  const fx = { id: 'atk_up', label: '攻击力+8%', atkMul: 1.08, scoreMul: 1, compMul: 1 };
  g._nomissSnapshot = { unstableFx: fx };
  g.nextUnstableFx = null;

  miss(g);

  // 未扣残机、未置 chapterMiss、给了重生无敌
  assertEqual(g.player.lives, livesBefore);
  assert(!g.chapterMiss);
  assertEqual(g.player.invuln, 1.5);
  // startChapter 已执行（lastStageKey 记录、chapterTime 重置）
  assertEqual(g.lastStageKey, '1');
  assertEqual(g.chapterTime, 0);
  // Unstable 还原为本单开头那次（startChapter 经 nextUnstableFx 采用并消费）
  assert(g.unstableFx === fx);
  assertEqual(g.nextUnstableFx, null);
  // BGM 回带 + 死亡音效 + flash 提示
  assertEqual(g.audio._seeked, 12.5);
  assert(g.audio._sfxCalls.includes('dead'));
  assertEqual(g.el.flash.textContent, '无伤重开');
  // 重开后 startChapter 重新记录进章位置（同曲续播 → 仍是 12.5，而非受击时刻位置）
  assertEqual(g._nomissBgmPos, 12.5);
});

test('wrapMusicPos：循环回绕纯函数（NaN/非正 dur 返回 null）', () => {
  assertEqual(wrapMusicPos(12.5, 0, 200), 12.5);
  assertEqual(wrapMusicPos(212.5, 0, 200), 12.5, '过一个 loop 回绕');
  assertEqual(wrapMusicPos(212.5, 100, 200), 112.5);
  assertEqual(wrapMusicPos(0, 0, 200), 0);
  assertEqual(wrapMusicPos(-1, 0, 200), 199, '负偏移回绕到末尾');
  assertEqual(wrapMusicPos(12.5, 0, 0), null, 'dur≤0 → null');
  assertEqual(wrapMusicPos(NaN, 0, 200), null);
  assertEqual(wrapMusicPos(12.5, NaN, 200), null);
  assertEqual(wrapMusicPos(Infinity, 0, 200), null);
});

/** Nomiss 章开头的轻量 game mock（够 startChapter 跑通；与 miss() 用例同构） */
function nomissStartChapterMock(ch) {
  const g = createMockGame();
  g.mode = 'nomiss';
  g.replaying = false;
  g.chapters = [ch];
  g.chapterIndex = 0;
  g.score = 0;
  g.hiscore = 0;
  g.totalTendency = 0;
  g.diff = { rank: 'NORMAL', name: '白银', color: '#4ade80' };
  g.state = 'playing';
  g.playBg = { setMode() {} };
  g.el = {
    flash: { textContent: '', classList: { add() {}, remove() {} } },
    stageLabel: { textContent: '' },
    letterBanner: { classList: { add() {}, remove() {}, contains: () => true } },
  };
  g.player.resetPos = () => {};
  g._nomissSnapshot = null;
  g.nextUnstableFx = null;
  return g;
}

test('startChapter（Nomiss）：同曲续播 → 章首一次性记录当前续播位置为回带目标', () => {
  const ch = { id: 9, stageKey: '1', kind: 'mid', name: '章', unstable: false, music: null, letter: null, build() {} };
  const g = nomissStartChapterMock(ch);
  g.audio = {
    currentId: 's1_mid',            // 同曲续播（playTrack early-return）
    musicPosition: () => 37.25,
    playTrack() {},
    sfx() {},
  };
  startChapter(g);
  assertEqual(g._nomissBgmPos, 37.25, '回带目标 = 进章位置（当前续播位置）');
});

test('startChapter（Nomiss）：换曲/未开播 → 回带目标 0（新曲从头）', () => {
  const ch = { id: 10, stageKey: '2', kind: 'mid', name: '章', unstable: false, music: null, letter: null, build() {} };
  const g = nomissStartChapterMock(ch);
  g.audio = {
    currentId: null,                // 新曲尚未开播（playTrack 异步加载中）
    musicPosition: () => 99,
    playTrack() {},
    sfx() {},
  };
  startChapter(g);
  assertEqual(g._nomissBgmPos, 0, '换曲未开播 → 0，绝不取旧曲位置');
});

test('startChapter（非 Nomiss）：不写 _nomissBgmPos', () => {
  const ch = { id: 11, stageKey: '1', kind: 'mid', name: '章', unstable: false, music: null, letter: null, build() {} };
  const g = nomissStartChapterMock(ch);
  g.mode = 'story';
  g._nomissBgmPos = 42;
  g.audio = {
    currentId: 's1_mid',
    musicPosition: () => 7,
    playTrack() {},
    sfx() {},
  };
  startChapter(g);
  assertEqual(g._nomissBgmPos, 42, '非 nomiss 不动回带位置');
});

test('localStatsText：统计两行简版（容错缺失字段）', () => {
  const two = localStatsText({
    graze: 12, kills: 30, items: 8, bombs: 2, misses: 1, nmnb: 3, maxCombo: 45, time: 90,
  });
  assertEqual(two.split('\n').length, 2);
  assert(two.includes('擦弹 12'));
  assert(two.includes('击破 30'));
  assert(two.includes('道具 8'));
  assert(two.includes('Bomb 2'));
  assert(two.includes('Miss 1'));
  assert(two.includes('NMNB 3'));
  assert(two.includes('最大连击 45'));
  assert(two.includes('用时 1:30'));
  // 空 / 缺失字段不抛
  assert(localStatsText(undefined).length > 0);
  assert(localStatsText({}).length > 0);
});
