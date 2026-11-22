/**
 * 3D 关卡舞台守卫（用户 2026-11-22 方向修正）：
 * - 21 mode 都有 3D builder；
 * - paletteForMode 输出数值色（可直接给 THREE）；
 * - stage3d 模块在 node 下可安全导入（顶层不访问 THREE）；
 * - 3D 场景文件不含 Math.random / Date.now（确定性）。
 */
import { readFileSync } from 'node:fs';
import { SCENES3D } from '../js/bg3d/scenes/index.js';
import { paletteForMode } from '../js/bg3d/stage3d.js';
import { getAllBgModes } from '../js/bgModes.js';
import { test, assert, assertEqual } from './assert.js';

const MODES = getAllBgModes();

test('3D 舞台：21 mode 全部有 builder', () => {
  assertEqual(MODES.length, 21);
  assertEqual(Object.keys(SCENES3D).length, MODES.length, '3D builder 数量');
  for (const mode of MODES) {
    assertEqual(typeof SCENES3D[mode], 'function', `${mode}: 缺 3D builder`);
  }
});

test('3D 舞台：paletteForMode 输出数值色且 boss 可区分', () => {
  for (const mode of MODES) {
    const p = paletteForMode(mode);
    for (const key of ['skyTop', 'skyBot', 'ink', 'accent', 'accent2', 'glow', 'fog', 'ambient']) {
      assertEqual(typeof p[key], 'number', `${mode}.${key}`);
    }
    assert(p.ambient !== 0, `${mode}: ambient 不能纯黑`);
  }
  const midP = paletteForMode('s1_mid');
  const bossP = paletteForMode('s1_boss');
  assert(midP.skyTop !== bossP.skyTop || midP.accent !== bossP.accent, 'boss 调色应有升级');
});

test('3D 场景源码：确定性（无 Math.random / Date.now）', () => {
  const files = [
    's1', 's2', 's3', 'patrol', 'a4', 'a5', 'a6', 'b4', 'b5', 'b6', 'ex', '_stub3d', '_atmo',
  ];
  for (const f of files) {
    const src = readFileSync(new URL(`../js/bg3d/scenes/${f}.js`, import.meta.url), 'utf8');
    assert(!/Math\.random\s*\(/.test(src), `${f}.js 不允许 Math.random`);
    assert(!/Date\.now\s*\(/.test(src), `${f}.js 不允许 Date.now`);
  }
});

test('3D stage3d：模块可在 node 导入（THREE 懒加载）', () => {
  assertEqual(typeof paletteForMode, 'function');
});
