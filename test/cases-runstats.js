/**
 * runStats 格式化 / Combo 得分 / 练习最佳存储
 */
import { BALANCE, STORAGE_KEYS } from '../js/config.js';
import { formatRunTime, formatRunStats } from '../js/runStats.js';
import { addScore } from '../js/gameCombat.js';
import { loadPracticeBest, savePracticeBest } from '../js/storage.js';
import { pickComboAnchor } from '../js/gameDraw.js';
import { test, assert, assertEqual } from './assert.js';

// Node/bun 无 localStorage：注入最小内存实现，测写读路径；浏览器用原生
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

test('formatRunTime：mm:ss 分钟补零', () => {
  assertEqual(formatRunTime(0), '00:00');
  assertEqual(formatRunTime(59), '00:59');
  assertEqual(formatRunTime(60), '01:00');
  assertEqual(formatRunTime(272), '04:32');
  assertEqual(formatRunTime(3600 + 61), '61:01');
  assertEqual(formatRunTime(-5), '00:00');
  assertEqual(formatRunTime(undefined), '00:00');
});

test('formatRunStats：基本输出（取整 + 决死括号）', () => {
  const lines = formatRunStats({
    graze: 12.9, kills: 3, items: 7,
    bombs: 2, deathbombs: 1, misses: 1, nmnb: 4,
    maxCombo: 33, time: 272,
  });
  assertEqual(lines[0], '擦弹 12 · 击破 3 · 道具 7');
  assertEqual(lines[1], 'Bomb 2（含决死 1） · Miss 1 · NMNB 4 章');
  assertEqual(lines[2], '最大连击 33 · 用时 04:32');
});

test('formatRunStats：无决死不加括号；空 stats 兜底', () => {
  const lines = formatRunStats({ bombs: 2, misses: 0, nmnb: 0, maxCombo: 0, time: 0 });
  assertEqual(lines[1], 'Bomb 2 · Miss 0 · NMNB 0 章');
  const empty = formatRunStats(null);
  assertEqual(empty[0], '擦弹 0 · 击破 0 · 道具 0');
  assertEqual(empty[1], 'Bomb 0 · Miss 0 · NMNB 0 章');
});

test('addScore：combo 倍率只乘实时得分（combo=0 与现状一致）', () => {
  const mkGame = () => ({
    score: 0, chapterScore: 0, baseScore: 0,
    scoreMul: 1, diffScoreMul: 1, combo: 0, extendCount: 0,
    hiscore: 0,
    player: { lives: 2 },
    audio: { sfx() {} },
    el: { flash: { classList: { add() {}, remove() {} }, textContent: '' } },
  });

  // combo=0：与无 combo 时代完全一致
  const g0 = mkGame();
  addScore(g0, 1000);
  assertEqual(g0.score, 1000);
  assertEqual(g0.baseScore, 1000);

  // combo=10 → ×1.10；baseScore 不含 combo（不影响 Extend 阈值）
  const g1 = mkGame();
  g1.combo = 10;
  addScore(g1, 1000);
  assertEqual(g1.score, 1100);
  assertEqual(g1.baseScore, 1000);
  assertEqual(g1.hiscore, 1100);

  // raw（scoreMul）→ diffScoreMul → combo 依次相乘
  const g2 = mkGame();
  g2.combo = 5;
  g2.scoreMul = 0.5;    // raw = 500
  g2.diffScoreMul = 2;
  addScore(g2, 1000);   // 500 * 2 * 1.05 = 1050
  assertEqual(g2.score, 1050);
  assertEqual(g2.baseScore, 500);
});

test('loadPracticeBest / savePracticeBest：round-trip 与覆盖写', () => {
  localStorage.removeItem(STORAGE_KEYS.practiceBest);
  savePracticeBest(5, 'normal', { score: 12345, perfect: true });
  savePracticeBest(5, 'hard', { score: 999, perfect: false });
  savePracticeBest(129, 'normal', { score: 88888, perfect: true });

  const best = loadPracticeBest();
  assertEqual(best[5].normal.score, 12345);
  assert(best[5].normal.perfect);
  assertEqual(best[5].hard.score, 999);
  assert(!best[5].hard.perfect);
  assertEqual(best[129].normal.score, 88888);
  assert(typeof best[5].normal.date === 'number');

  // 覆盖写（同章同难度）
  savePracticeBest(5, 'normal', { score: 20000, perfect: false });
  const after = loadPracticeBest();
  assertEqual(after[5].normal.score, 20000);
  assert(!after[5].normal.perfect);
  assertEqual(after[5].hard.score, 999); // 其他难度不受影响
});

test('loadPracticeBest：坏数据丢弃 / 非法 JSON 回落 {}', () => {
  localStorage.setItem(STORAGE_KEYS.practiceBest, JSON.stringify({
    'abc': { normal: { score: 1, perfect: true } },   // chapterId 非数字
    6: { normal: { score: 'x', perfect: true } },      // score 非有限
    7: { normal: { score: 1, perfect: 'yes' } },       // perfect 非布尔
    8: { normal: { score: 42, perfect: false } },      // 合法
    9: null,                                            // 整组非法
  }));
  const best = loadPracticeBest();
  assertEqual(Object.keys(best).length, 1);
  assertEqual(best[8].normal.score, 42);

  localStorage.setItem(STORAGE_KEYS.practiceBest, '{oops');
  assertEqual(Object.keys(loadPracticeBest()).length, 0);
});

test('BALANCE.combo / BALANCE.continue 字段存在', () => {
  assertEqual(BALANCE.combo.perPercent, 0.01);
  assertEqual(BALANCE.combo.window, 3);
  assertEqual(BALANCE.combo.display.blinkSec, 0.133);
  assertEqual(BALANCE.combo.display.alpha, 0.8);
  assertEqual(BALANCE.combo.display.evadeDist, 100);
  assertEqual(BALANCE.continue.max, 2);
  assertEqual(BALANCE.continue.lives, 2);
  assertEqual(BALANCE.continue.bombs, 2);
});

test('pickComboAnchor：自机在右上锚点 → 返回 left（避让到左上）', () => {
  const a = pickComboAnchor(450 * 0.75, 600 * 0.25, 450, 600, 100);
  assertEqual(a.x, 450 * 0.25);
  assertEqual(a.y, 600 * 0.25);
});

test('pickComboAnchor：自机在左上锚点 → 返回 right（默认右上）', () => {
  const a = pickComboAnchor(450 * 0.25, 600 * 0.25, 450, 600, 100);
  assertEqual(a.x, 450 * 0.75);
  assertEqual(a.y, 600 * 0.25);
});

test('pickComboAnchor：自机在底部（远离两锚点）→ 返回 right', () => {
  const a = pickComboAnchor(225, 500, 450, 600, 100);
  assertEqual(a.x, 450 * 0.75);
  assertEqual(a.y, 600 * 0.25);
});

test('pickComboAnchor：自机在两锚点正中（距离均 ≥ dist）→ 返回 right', () => {
  // 正中 (225,150) 距两锚点各 112.5；dist=100 时两者均 ≥100 → 默认右上
  const a = pickComboAnchor(225, 150, 450, 600, 100);
  assertEqual(a.x, 450 * 0.75);
  assertEqual(a.y, 600 * 0.25);
  // dist=150 时右上 <150 → 避让到 left（dist 参数控制生效）
  const b = pickComboAnchor(225, 150, 450, 600, 150);
  assertEqual(b.x, 450 * 0.25);
  assertEqual(b.y, 600 * 0.25);
});
