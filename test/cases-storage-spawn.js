/**
 * storage clamp / spawnScale
 */
import {
  FPS_LIMIT_MIN, FPS_LIMIT_CAP, FPS_SLIDER_UNLIMITED,
} from '../js/config.js';
import {
  normalizeFpsLimit, fpsLimitToSlider, sliderToFpsLimit,
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
  for (const v of [24, 30, 60, 144, 240]) {
    assertEqual(fpsLimitToSlider(sliderToFpsLimit(v)), v);
  }
});
