/**
 * 背景主题 ↔ 2D 原子守卫（P1）。
 *
 * 目的：新增 mode/theme 时，kind/sil 不能悄悄落进未知分支。
 * `code` / `split` 目前走通用碑形（颜色在 _drawProps 覆盖），显式登记为通用分支。
 */
import { MODE_THEME } from '../js/playfieldBgThemes.js';
import { drawSilhouette, drawPillar, hexPath } from '../js/backgrounds/atoms2d.js';
import { test, assert, assertEqual } from './assert.js';

const PILLAR_EXPLICIT = new Set([
  'obelisk', 'fire', 'hex', 'crystal', 'gear', 'warn', 'neon',
  'mist', 'spike', 'candy', 'dual',
]);
const PILLAR_GENERIC = new Set(['code', 'split']);
const SILHOUETTES = new Set([
  'blocks', 'gears', 'hex', 'split', 'poly', 'bars',
  'spires', 'orbs', 'rings', 'wheel', 'street', 'towers',
]);

test('背景主题：每个 kind/sil 都有绘制归属', () => {
  const modes = Object.keys(MODE_THEME);
  assert(modes.length >= 21, '21 个 mode 都应有序主题');
  for (const mode of modes) {
    const th = MODE_THEME[mode];
    assert(
      PILLAR_EXPLICIT.has(th.kind) || PILLAR_GENERIC.has(th.kind),
      `${mode}: 未登记的侧柱 kind "${th.kind}"`,
    );
    assert(SILHOUETTES.has(th.sil), `${mode}: 未登记的剪影 sil "${th.sil}"`);
  }
});

test('背景原子：导出函数可用于 21 mode', () => {
  assertEqual(typeof drawSilhouette, 'function');
  assertEqual(typeof drawPillar, 'function');
  assertEqual(typeof hexPath, 'function');
});
