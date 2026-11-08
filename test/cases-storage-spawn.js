/**
 * storage clamp / spawnScale
 */
import { FPS_LIMIT_MIN, FPS_LIMIT_CAP, FPS_SLIDER_UNLIMITED, STORAGE_KEYS } from '../js/config.js';
import {
  normalizeFpsLimit, fpsLimitToSlider, sliderToFpsLimit,
  writeStored, onStorageError, saveSettings, saveNomissProgress, loadHiscore,
} from '../js/storage.js';
import { applyEnemyDifficulty, applyEnemyBulletDifficulty } from '../js/spawnScale.js';
import { test, assert, assertEqual } from './assert.js';

test('applyEnemyDifficulty：HP 倍率且只缩放一次', () => {
  const e = { hp: 100, maxHp: 100 };
  applyEnemyDifficulty(e, 2, 0.5);
  assertEqual(e.hp, 200);
  assertEqual(e.maxHp, 200);
  assertEqual(e._fireMul, 0.5);
  assert(e._diffScaled);
  applyEnemyDifficulty(e, 3, 0.1);
  assertEqual(e.hp, 200);
});

test('applyEnemyBulletDifficulty：仅敌弹乘速', () => {
  const enemy = { from: 'enemy', vx: 1, vy: 2, speed: 3 };
  applyEnemyBulletDifficulty(enemy, 2);
  assertEqual(enemy.vx, 2);
  assertEqual(enemy.vy, 4);
  assertEqual(enemy.speed, 6);
  applyEnemyBulletDifficulty(enemy, 2);
  assertEqual(enemy.speed, 6);

  const player = { from: 'player', vx: 1, vy: 0, speed: 15 };
  applyEnemyBulletDifficulty(player, 2);
  assertEqual(player.speed, 15);
});

test('normalizeFpsLimit / 滑条 round-trip（0=无限制，有限 24–240）', () => {
  assertEqual(normalizeFpsLimit(0), 0);
  assertEqual(normalizeFpsLimit('unlimited'), 0);
  assertEqual(normalizeFpsLimit(60), 60);
  assertEqual(normalizeFpsLimit(10), FPS_LIMIT_MIN);
  assertEqual(normalizeFpsLimit(999), FPS_LIMIT_CAP);
  assertEqual(sliderToFpsLimit(FPS_SLIDER_UNLIMITED), 0);
  assertEqual(sliderToFpsLimit(0), 0);
  assertEqual(fpsLimitToSlider(0), FPS_SLIDER_UNLIMITED);
  assertEqual(fpsLimitToSlider(60), 60);
  for (const v of [24, 30, 60, 120, 240]) {
    assertEqual(fpsLimitToSlider(sliderToFpsLimit(v)), v);
  }
});

/** 临时替换 localStorage；restore 保证不污染其他用例 */
function withStorage(overrides, fn) {
  const real = globalThis.localStorage;
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    ...overrides,
  };
  try {
    return fn(map);
  } finally {
    if (real === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = real;
  }
}

test('写失败可感知：writeStored 返回 false 并通知，save 不抛', () => {
  const seen = [];
  const off = onStorageError((key) => seen.push(key));
  try {
    withStorage({
      setItem: () => { throw new Error('QuotaExceeded'); },
      removeItem: () => { throw new Error('QuotaExceeded'); },
    }, () => {
      assertEqual(writeStored(STORAGE_KEYS.settings, '{}'), false);
      const next = saveSettings({ musicVolume: 0.4 });
      assertEqual(next.musicVolume, 0.4, 'save 仍返回归一化后的设置');
      saveNomissProgress(3);
    });
  } finally {
    off();
  }
  assert(seen.includes(STORAGE_KEYS.settings), 'settings 写失败上报');
  assert(seen.includes(STORAGE_KEYS.nomissProgress), 'nomiss 写失败上报');
});

test('读失败兜底：loadHiscore 返回 0 而不抛', () => {
  withStorage({ getItem: () => { throw new Error('SecurityError'); } }, () => {
    assertEqual(loadHiscore(), 0);
  });
});

test('写成功：writeStored 返回 true 且不通知', () => {
  const seen = [];
  const off = onStorageError((key) => seen.push(key));
  try {
    withStorage({}, (map) => {
      assertEqual(writeStored(STORAGE_KEYS.hiscore, '42'), true);
      assertEqual(map.get(STORAGE_KEYS.hiscore), '42');
    });
  } finally {
    off();
  }
  assertEqual(seen.length, 0);
});
