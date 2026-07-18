/**
 * 用例：配置 / 章节表 / 弹幕工具 / 碰撞几何 / 版本号
 * 只测可 import 的纯逻辑，不启动 Game 主循环。
 */
import {
  LOGICAL_W, LOGICAL_H, BALANCE, DIFFICULTIES, DIFFICULTY_ORDER,
  getDifficulty, calcLetterBonus, letterStageMul, nextExtendThreshold,
  PLAYER_DEFS, DEFAULT_SETTINGS, PLAYER_BULLET_OPACITY_MIN,
  FPS_LIMIT_MIN, FPS_LIMIT_CAP, FPS_SLIDER_UNLIMITED,
} from '../js/config.js';
import {
  scaleBulletCount, aimAngle, oddAim, evenAim, ring, fan,
} from '../js/patterns.js';
import { distPointSeg, bulletDistToPlayer } from '../js/collision.js';
import { buildChapterList, stageIntroFor, stageSelectEntries } from '../js/stages/index.js';
import { getDialogues } from '../js/dialogue.js';
import {
  normalizeFpsLimit, fpsLimitToSlider, sliderToFpsLimit,
} from '../js/storage.js';
import { VERSION, VERSION_LABEL } from '../js/version.js';
import { test, assert, assertEqual, assertClose } from './assert.js';

/* ========== config ========== */

test('逻辑分辨率固定 450×600', () => {
  assertEqual(LOGICAL_W, 450);
  assertEqual(LOGICAL_H, 600);
});

test('四个难度齐全且 Normal 倍率为 1', () => {
  assertEqual(DIFFICULTY_ORDER.length, 4);
  for (const id of DIFFICULTY_ORDER) {
    const d = getDifficulty(id);
    assert(d && d.id === id, `missing difficulty ${id}`);
    assert(d.enemyHp > 0 && d.bulletSpeed > 0, `${id} mul invalid`);
    assert(d.startLives >= 0 && d.startBombs >= 0, `${id} resources`);
  }
  const n = getDifficulty('normal');
  assertEqual(n.enemyHp, 1);
  assertEqual(n.bulletSpeed, 1);
  assertEqual(n.bulletCount, 1);
  assertEqual(n.scoreMul, 1);
});

test('未知难度回退 Normal', () => {
  assertEqual(getDifficulty('nope').id, 'normal');
  assertEqual(getDifficulty(undefined).id, 'normal');
});

test('Easy 比 Lunatic 更宽松（血/速/发数）', () => {
  const e = getDifficulty('easy');
  const l = getDifficulty('lunatic');
  assert(e.enemyHp < l.enemyHp);
  assert(e.bulletSpeed < l.bulletSpeed);
  assert(e.bulletCount < l.bulletCount);
  assert(e.startLives >= l.startLives);
  assert(e.deathBombWindow > l.deathBombWindow);
});

test('BALANCE 关键字段存在', () => {
  assert(BALANCE.chapterPerfectMul === 1.05);
  assert(BALANCE.editMax === 100);
  assert(BALANCE.tendencyThreshold > 0);
  assert(BALANCE.score.letterBonus > 0);
  assert(BALANCE.resource?.extendThresholds?.length > 0);
  // 自机射击 / 消弹得分（patterns 经 BALANCE 读取，数值锁死）
  assertEqual(BALANCE.playerShotDamage, 2.8);
  assertEqual(BALANCE.playerOptionDamage, 1.35);
  assertEqual(BALANCE.playerShotSpeed, 15);
  assertEqual(BALANCE.score.clearBullet, 10);
});

test('Letter 红利：满时高、超时 0（floor=0）', () => {
  const full = calcLetterBonus('1', 40, 40);
  const half = calcLetterBonus('1', 20, 40);
  const zero = calcLetterBonus('1', 0, 40);
  const bad = calcLetterBonus('1', 10, 0);
  assert(full > 0, 'full bonus');
  assertEqual(full, Math.floor(BALANCE.score.letterBonus * letterStageMul('1')));
  assertEqual(half, Math.floor(full * 0.5));
  assertEqual(zero, 0);
  assertEqual(bad, 0);
  assert(letterStageMul('A6') > letterStageMul('1'), 'later stages pay more');
});

test('Extend 阈值随次数递增', () => {
  const t0 = nextExtendThreshold(0);
  const t1 = nextExtendThreshold(1);
  const tFar = nextExtendThreshold(20);
  assert(t0 > 0 && t1 >= t0);
  assert(tFar > t1);
});

test('自机定义与设置默认值合法', () => {
  assert(PLAYER_DEFS.yinquan && PLAYER_DEFS.shama);
  assert(DEFAULT_SETTINGS.playerBulletOpacity >= PLAYER_BULLET_OPACITY_MIN);
  assert(DEFAULT_SETTINGS.musicVolume >= 0 && DEFAULT_SETTINGS.musicVolume <= 1);
});

/* ========== patterns ========== */

test('scaleBulletCount：mul=1 原样', () => {
  assertEqual(scaleBulletCount({ bulletCountMul: 1 }, 5), 5);
  assertEqual(scaleBulletCount({}, 3), 3);
});

test('scaleBulletCount：odd/even 保持奇偶', () => {
  const hard = { bulletCountMul: 1.25 };
  const easy = { bulletCountMul: 0.65 };
  const oddH = scaleBulletCount(hard, 3, 'odd');
  const evenH = scaleBulletCount(hard, 4, 'even');
  const oddE = scaleBulletCount(easy, 3, 'odd');
  const evenE = scaleBulletCount(easy, 4, 'even');
  assert(oddH % 2 === 1, `odd hard ${oddH}`);
  assert(evenH % 2 === 0 && evenH >= 2, `even hard ${evenH}`);
  assert(oddE % 2 === 1, `odd easy ${oddE}`);
  assert(evenE % 2 === 0 && evenE >= 2, `even easy ${evenE}`);
});

test('aimAngle / oddAim / evenAim / ring / fan 形状', () => {
  const from = { x: 0, y: 0 };
  const to = { x: 1, y: 0 };
  assertClose(aimAngle(from, to), 0);

  const playerUp = { x: 0, y: -10 };
  const base = aimAngle(from, playerUp); // ≈ -π/2

  const odds = oddAim(from, playerUp, 3, 0.2);
  assertEqual(odds.length, 3);
  // 中心路对准自机
  assertClose(odds[1], base, 1e-9);
  assertClose(odds[0], base - 0.2, 1e-9);
  assertClose(odds[2], base + 0.2, 1e-9);

  // 偶数路：半步偏移，无弹正对 base；相邻间隔 = spread
  const evens = evenAim(from, playerUp, 4, 0.2);
  assertEqual(evens.length, 4);
  assertClose(evens[0], base - 0.3, 1e-9);
  assertClose(evens[1], base - 0.1, 1e-9);
  assertClose(evens[2], base + 0.1, 1e-9);
  assertClose(evens[3], base + 0.3, 1e-9);
  for (const a of evens) {
    assert(Math.abs(a - base) > 1e-9, 'evenAim must not fire dead-on at player');
  }
  // 与公式一致：oddAim(4) 与 evenAim(4) 相同（锁死当前行为）
  const odds4 = oddAim(from, playerUp, 4, 0.2);
  assertEqual(odds4.length, 4);
  for (let i = 0; i < 4; i++) assertClose(odds4[i], evens[i], 1e-9);

  const r = ring(8, 0);
  assertEqual(r.length, 8);
  assertClose(r[0], 0);
  assertClose(r[4], Math.PI, 1e-9);

  const f = fan(0, 5, 0.1);
  assertEqual(f.length, 5);
  assertClose(f[2], 0);
});

/* ========== collision ========== */

test('distPointSeg：点在线段上 / 垂足 / 端点外', () => {
  assertClose(distPointSeg(5, 0, 0, 0, 10, 0), 0);
  assertClose(distPointSeg(5, 3, 0, 0, 10, 0), 3);
  assertClose(distPointSeg(-2, 0, 0, 0, 10, 0), 2);
  assertClose(distPointSeg(12, 0, 0, 0, 10, 0), 2);
});

test('bulletDistToPlayer：圆弹与激光', () => {
  const p = { x: 100, y: 100 };
  const dot = { type: 'dot', x: 103, y: 104 };
  assertClose(bulletDistToPlayer(dot, p), 5);

  // 水平激光从 (0,100) 向右长 200，自机在 (50,100) → 距离 0
  const laser = {
    type: 'laser', x: 0, y: 100, angle: 0, laserLen: 200,
  };
  assertClose(bulletDistToPlayer(laser, p), 0);
});

/* ========== stages ========== */

test('章节表：id 唯一且含故事关键节点 22/24', () => {
  const list = buildChapterList();
  assert(list.length > 30, `too few chapters: ${list.length}`);

  const ids = list.map((c) => c.id);
  assertEqual(new Set(ids).size, ids.length, 'duplicate chapter id');

  const byId = new Map(list.map((c) => [c.id, c]));
  assert(byId.has(22), 'missing chapter 22 (stage3 end / route check)');
  assert(byId.has(24), 'missing chapter 24 (patrol end / route select)');
  assert(byId.has(1), 'missing chapter 1');

  for (const c of list) {
    assert(typeof c.build === 'function', `chapter ${c.id} missing build`);
    assert(c.name && c.kind, `chapter ${c.id} incomplete`);
    assert(['mid', 'midboss', 'boss'].includes(c.kind), `bad kind ${c.kind}`);
  }
});

test('章节 stageKey 覆盖主线与 A/B/EX', () => {
  const keys = new Set(buildChapterList().map((c) => String(c.stageKey)));
  for (const k of ['1', '2', '3', 'patrol', 'A4', 'A5', 'A6', 'B4', 'B5', 'B6', 'EX']) {
    assert(keys.has(k), `missing stageKey ${k}`);
  }
});

test('stageSelectEntries 与 stageIntroFor 可用', () => {
  const entries = stageSelectEntries();
  assert(entries.length >= 10, `stage select entries ${entries.length}`);
  for (const e of entries) {
    assert(e.id && e.label && e.startChapter != null, `bad entry ${JSON.stringify(e)}`);
  }
  assert(stageIntroFor('1')?.label);
  assert(stageIntroFor('A4')?.label);
  assertEqual(stageIntroFor('nope'), null);
});

test('stageSelect startChapter 对齐各 stageKey 首章', () => {
  const list = buildChapterList();
  const firstByKey = new Map();
  for (const c of list) {
    const sk = String(c.stageKey);
    if (!firstByKey.has(sk)) firstByKey.set(sk, c.id);
  }
  for (const e of stageSelectEntries()) {
    const expected = firstByKey.get(String(e.id));
    assert(expected != null, `stageSelect id ${e.id} 无对应章节`);
    assertEqual(e.startChapter, expected, `startChapter for ${e.id}`);
  }
});

test('章节 dialogue / winDialogue / loseDialogue 键均存在于 getDialogues', () => {
  const dialogues = getDialogues('yinquan');
  const list = buildChapterList();
  for (const c of list) {
    for (const field of ['dialogue', 'winDialogue', 'loseDialogue']) {
      const key = c[field];
      if (!key) continue;
      assert(
        Array.isArray(dialogues[key]) && dialogues[key].length > 0,
        `chapter ${c.id} ${field}='${key}' missing or empty`,
      );
    }
  }
});

test('有 letter 的章节必须 letterTime > 0', () => {
  for (const c of buildChapterList()) {
    if (!c.letter) continue;
    assert(
      typeof c.letterTime === 'number' && c.letterTime > 0,
      `chapter ${c.id} has letter but letterTime=${c.letterTime}`,
    );
  }
});

/* ========== storage (pure clamps) ========== */

test('normalizeFpsLimit / 滑条 round-trip', () => {
  assertEqual(normalizeFpsLimit(0), 0);
  assertEqual(normalizeFpsLimit('unlimited'), 0);
  assertEqual(normalizeFpsLimit(60), 60);
  assertEqual(normalizeFpsLimit(10), FPS_LIMIT_MIN);
  assertEqual(normalizeFpsLimit(999), FPS_LIMIT_CAP);
  assertEqual(sliderToFpsLimit(FPS_SLIDER_UNLIMITED), 0);
  assertEqual(sliderToFpsLimit(60), 60);
  assertEqual(fpsLimitToSlider(0), FPS_SLIDER_UNLIMITED);
  assertEqual(fpsLimitToSlider(120), 120);
  // 有限值：slider → limit → slider
  for (const v of [24, 30, 60, 144, 240]) {
    assertEqual(fpsLimitToSlider(sliderToFpsLimit(v)), v);
  }
});

/* ========== version ========== */

test('VERSION 为 SemVer，VERSION_LABEL 带 v 前缀', () => {
  assert(/^\d+\.\d+\.\d+/.test(VERSION), `VERSION=${VERSION}`);
  assertEqual(VERSION_LABEL, `v${VERSION}`);
});
