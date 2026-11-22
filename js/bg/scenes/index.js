/**
 * 场景聚合：11 个 stage 模块 × mid/boss。
 * 每模块导出 { mid, boss, atoms }；SCENES2D 供渲染器按 mode 取用。
 * 设计说明：docs/level-background-redesign.md §3.2。
 */
import * as s1 from './s1.js';
import * as s2 from './s2.js';
import * as s3 from './s3.js';
import * as patrol from './patrol.js';
import * as a4 from './a4.js';
import * as a5 from './a5.js';
import * as a6 from './a6.js';
import * as b4 from './b4.js';
import * as b5 from './b5.js';
import * as b6 from './b6.js';
import * as ex from './ex.js';

/** @type {Record<string, object>} */
const MODULES = {
  s1, s2, s3, patrol, a4, a5, a6, b4, b5, b6, ex,
};

/** @type {Record<string, object>} */
export const SCENES2D = {};
/** @type {Record<string, Record<string, Function>>} */
export const SCENE_ATOMS = {};

for (const [stage, mod] of Object.entries(MODULES)) {
  if (mod.mid) SCENES2D[mod.mid.mode] = mod.mid;
  if (mod.boss) SCENES2D[mod.boss.mode] = mod.boss;
  SCENE_ATOMS[stage] = mod.atoms || {};
}

/** @param {string} mode */
export function sceneFor(mode) {
  return SCENES2D[mode] || SCENES2D.s1_mid;
}

/** @param {string} mode */
export function atomsFor(mode) {
  const scene = SCENES2D[mode] || SCENES2D.s1_mid;
  return SCENE_ATOMS[scene?.stage] || {};
}
