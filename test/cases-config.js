/**
 * 配置 / 难度 / 版本 / startMode
 */
import {
  LOGICAL_W, LOGICAL_H, BALANCE, DIFFICULTIES, DIFFICULTY_ORDER,
  getDifficulty, calcLetterBonus, letterStageMul, nextExtendThreshold,
  PLAYER_DEFS, DEFAULT_SETTINGS, PLAYER_BULLET_OPACITY_MIN,
} from '../js/config.js';
import { VERSION, VERSION_LABEL } from '../js/version.js';
import {
  stageSelectStartMode, isExtraRestrictedMode, extraDifficultyIds,
} from '../js/startMode.js';
import { test, assert, assertEqual } from './assert.js';

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

test('VERSION 为 SemVer，VERSION_LABEL 带 v 前缀', () => {
  assert(/^\d+\.\d+\.\d+/.test(VERSION), `VERSION=${VERSION}`);
  assertEqual(VERSION_LABEL, `v${VERSION}`);
});

test('stageSelectStartMode：EX→extra，其余→stage', () => {
  assertEqual(stageSelectStartMode('EX'), 'extra');
  assertEqual(stageSelectStartMode('1'), 'stage');
  assertEqual(stageSelectStartMode('A4'), 'stage');
  assertEqual(stageSelectStartMode('patrol'), 'stage');
});

test('Extra 难度仅 Hard/Lunatic', () => {
  assert(isExtraRestrictedMode('extra'));
  assert(!isExtraRestrictedMode('stage'));
  assert(!isExtraRestrictedMode('story'));
  const ids = extraDifficultyIds(DIFFICULTY_ORDER);
  assertEqual(ids.length, 2);
  assert(ids.includes('hard') && ids.includes('lunatic'));
});
