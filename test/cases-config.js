/**
 * 配置 / 难度 / 版本 / startMode
 */
import {
  LOGICAL_W, LOGICAL_H, BALANCE, DIFFICULTIES, DIFFICULTY_ORDER,
  getDifficulty, calcLetterBonus, letterStageMul, nextExtendThreshold,
  PLAYER_DEFS, DEFAULT_SETTINGS, PLAYER_BULLET_OPACITY_MIN,
} from '../js/config.js';
import {
  VERSION, VERSION_NAME, VERSION_LABEL, GIT_HASH,
  formatVersionLabel, normalizeGitHash,
} from '../js/version.js';
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
    assert(d.bulletSpeed > 0 && d.bulletCount > 0, `${id} mul invalid`);
    assert(d.fireInterval > 0 && d.spawnMul > 0, `${id} rhythm invalid`);
  }
  const n = getDifficulty('normal');
  assertEqual(n.bulletSpeed, 1);
  assertEqual(n.bulletCount, 1);
  assertEqual(n.scoreMul, 1);
  assertEqual(n.fireInterval, 1);
  assertEqual(n.spawnMul, 1);
});

test('extra 难度与 lunatic 战斗参数同源且文案独立', () => {
  const l = getDifficulty('lunatic');
  const e = getDifficulty('extra');
  assertEqual(e.id, 'extra');
  assertEqual(e.bulletSpeed, l.bulletSpeed);
  assertEqual(e.fireInterval, l.fireInterval);
  assertEqual(e.spawnMul, l.spawnMul);
  assertEqual(e.bulletCount, l.bulletCount);
  assertEqual(e.grazeMul, l.grazeMul);
  assertEqual(e.scoreMul, l.scoreMul);
  assert(e.name !== l.name, 'extra 应有独立 UI 名');
  assert(e.rank === 'EXTRA');
  assert(!DIFFICULTY_ORDER.includes('extra'), 'Story 难度列表不含 extra');
});

test('资源与决死窗在 BALANCE 统一，不按难度配置', () => {
  assertEqual(BALANCE.startLives, 4);
  assertEqual(BALANCE.startBombs, 4);
  assertEqual(BALANCE.deathBombWindow, 0.28);
  assertEqual(BALANCE.resource.missBombFloor, 3);
  assertEqual(BALANCE.resource.midbossDrop, true);
  assertEqual(BALANCE.resource.letterNmnbBombChance, 0.55);
  for (const id of Object.keys(DIFFICULTIES)) {
    const d = DIFFICULTIES[id];
    assert(d.startLives === undefined, `${id} should not set startLives`);
    assert(d.enemyHp === undefined, `${id} should not set enemyHp`);
    assert(d.playerAtk === undefined, `${id} should not set playerAtk`);
    assert(d.deathBombWindow === undefined, `${id} should not set deathBombWindow`);
    assert(d.missBombFloor === undefined, `${id} should not set missBombFloor`);
    assert(d.midbossDrop === undefined, `${id} should not set midbossDrop`);
    assert(d.letterNmnbBombChance === undefined, `${id} should not set letterNmnb`);
  }
});

test('未知难度回退 Normal', () => {
  assertEqual(getDifficulty('nope').id, 'normal');
  assertEqual(getDifficulty(undefined).id, 'normal');
});

test('Easy 比 Lunatic 更宽松（速/发数）', () => {
  const e = getDifficulty('easy');
  const l = getDifficulty('lunatic');
  assert(e.bulletSpeed < l.bulletSpeed);
  assert(e.bulletCount < l.bulletCount);
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
  assertEqual(BALANCE.score.clearBullet, 100);
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

test('VERSION 为自然数构建号；VERSION_LABEL 有 hash 则带后缀否则仅 vX.Y.Z', () => {
  assert(Number.isInteger(VERSION) && VERSION > 0, `VERSION=${VERSION}`);
  assert(/^\d+\.\d+\.\d+$/.test(VERSION_NAME), `VERSION_NAME=${VERSION_NAME}`);
  assert(typeof GIT_HASH === 'string', `GIT_HASH type`);
  assertEqual(VERSION_LABEL, formatVersionLabel(VERSION_NAME, GIT_HASH));
  const h = normalizeGitHash(GIT_HASH);
  if (h) {
    assertEqual(VERSION_LABEL, `v${VERSION_NAME}.${h}`);
  } else {
    assertEqual(VERSION_LABEL, `v${VERSION_NAME}`);
  }
  assertEqual(formatVersionLabel('1.2.3', ''), 'v1.2.3');
  assertEqual(formatVersionLabel('1.2.3', 'abcDEF0'), 'v1.2.3.abcdef0');
  assertEqual(normalizeGitHash(''), '');
  assertEqual(normalizeGitHash('  '), '');
  assertEqual(normalizeGitHash('not-a-hash'), '');
});

test('stageSelectStartMode：EX→extra，其余→stage', () => {
  assertEqual(stageSelectStartMode('EX'), 'extra');
  assertEqual(stageSelectStartMode('1'), 'stage');
  assertEqual(stageSelectStartMode('A4'), 'stage');
  assertEqual(stageSelectStartMode('patrol'), 'stage');
});

test('Extra 难度仅 extra', () => {
  assert(isExtraRestrictedMode('extra'));
  assert(!isExtraRestrictedMode('stage'));
  assert(!isExtraRestrictedMode('story'));
  const ids = extraDifficultyIds(DIFFICULTY_ORDER);
  assertEqual(ids.length, 1);
  assert(ids.includes('extra'));
});
