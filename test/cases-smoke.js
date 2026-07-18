/**
 * B：mock Game 冒烟
 * - 每章 build 不抛错
 * - boss/midboss 应挂 bossRef（或 build 后场上有 boss 型）
 * - mid 若注册 waveFn，固定步长 tick 不抛错
 */
import { buildChapterList } from '../js/stages/index.js';
import { createMockGame } from './mockGame.js';
import { test, assert } from './assert.js';

test('全章节 build(mockGame) 不抛错', () => {
  const list = buildChapterList();
  const errors = [];
  for (const ch of list) {
    const g = createMockGame();
    try {
      ch.build(g);
    } catch (e) {
      errors.push(`#${ch.id} ${ch.name}: ${e?.message || e}`);
    }
  }
  assert(errors.length === 0, errors.slice(0, 8).join('\n') + (errors.length > 8 ? `\n…+${errors.length - 8}` : ''));
});

test('boss / midboss 章 build 后有 bossRef 或 boss 实体', () => {
  const list = buildChapterList().filter((c) => c.kind === 'boss' || c.kind === 'midboss');
  const bad = [];
  for (const ch of list) {
    const g = createMockGame();
    try {
      ch.build(g);
    } catch (e) {
      bad.push(`#${ch.id} build threw: ${e?.message || e}`);
      continue;
    }
    const hasRef = !!g.bossRef;
    const hasBossType = g.enemies.some((e) => e.type === 'boss' || e.type === 'elite');
    // midboss 常用 elite + bossRef；本尊 boss 用 type boss
    if (!hasRef && !hasBossType) {
      bad.push(`#${ch.id} ${ch.name}: no bossRef and no boss/elite enemy`);
    }
  }
  assert(bad.length === 0, bad.slice(0, 10).join('\n'));
});

test('mid 章 waveFn 固定步长 tick 不抛错', () => {
  const list = buildChapterList().filter((c) => c.kind === 'mid');
  const errors = [];
  let withWave = 0;
  for (const ch of list) {
    const g = createMockGame();
    try {
      ch.build(g);
      if (typeof g.waveFn === 'function') {
        withWave++;
        g.tickWaves(90, 1 / 60);
      }
    } catch (e) {
      errors.push(`#${ch.id} ${ch.name}: ${e?.message || e}`);
    }
  }
  assert(withWave > 10, `expected many mid waveFns, got ${withWave}`);
  assert(errors.length === 0, errors.slice(0, 8).join('\n'));
});

test('mock spawnEnemy 应用难度 HP 倍率', () => {
  const g = createMockGame({ enemyHpMul: 2, fireIntervalMul: 0.5 });
  // 最小敌机形
  g.spawnEnemy({ hp: 100, maxHp: 100, type: 'mob', x: 0, y: 0 });
  assert(g.enemies.length === 1);
  assert(g.enemies[0].hp === 200);
  assert(g.enemies[0]._fireMul === 0.5);
});

test('mock spawnBullet 敌弹乘速、自机不乘', () => {
  const g = createMockGame({ bulletSpeedMul: 2 });
  g.spawnBullet({ from: 'enemy', vx: 1, vy: 0, speed: 2 });
  g.spawnBullet({ from: 'player', vx: 0, vy: -1, speed: 15 });
  assert(g.bullets[0].speed === 4);
  assert(g.bullets[1].speed === 15);
});
