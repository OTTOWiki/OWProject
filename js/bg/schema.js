/**
 * 关卡背景场景 schema（P6 绘卷系统）。
 * 纯 JS：无 DOM / Canvas 副作用，node 可直接测试。
 *
 * 场景数据由 `js/bg/scenes/<stage>.js` 导出（mid/boss 两份）+ 专属原子表；
 * 共享原子与渲染器分别见 `atoms.js` / `renderer.js`。
 * 设计说明：docs/level-background-redesign.md。
 */
import { PARTICLE_KINDS } from './particles.js';

/** 11 个 stage key（与 bgModes.BG_MODE_BY_STAGE 同源） */
export const STAGE_KEYS = ['s1', 's2', 's3', 'patrol', 'a4', 'a5', 'a6', 'b4', 'b5', 'b6', 'ex'];

/** fx 缺省值；0 = 关闭 */
export const FX_DEFAULTS = {
  vignette: 0.42,
  bottomFade: 0.55,
  topFade: 0.3,
  scanlines: 0,
  glitch: 0,
};

/** plate 绘制缺省值：sway 为漂移振幅（px），static canvas 预留 32px 余量 */
export const PLATE_DEFAULTS = {
  scale: 1.06,
  swayX: 7,
  swayY: 9,
  wash: null,
  tint: null,
};

const isStr = (v) => typeof v === 'string' && v.length > 0;
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** 补全缺省值，返回新对象（不修改入参） */
export function sceneDefaults(scene) {
  return {
    ...scene,
    plate: { ...PLATE_DEFAULTS, ...(scene.plate || {}) },
    layers: Array.isArray(scene.layers) ? scene.layers : [],
    particles: Array.isArray(scene.particles) ? scene.particles : [],
    fx: { ...FX_DEFAULTS, ...(scene.fx || {}) },
  };
}

/**
 * 校验一份场景数据。
 * @param {string} mode 期望的 mode 键
 * @param {object} scene 场景数据
 * @param {Set<string>} atomNames 可用原子名（共享 + 该场景专属）
 * @returns {string[]} 错误列表；[] = 合法
 */
export function validateScene(mode, scene, atomNames) {
  const errs = [];
  if (!scene || typeof scene !== 'object') return [`${mode}: scene 不是对象`];
  if (scene.mode !== mode) errs.push(`${mode}: scene.mode=${scene.mode}`);
  if (!STAGE_KEYS.includes(scene.stage)) errs.push(`${mode}: 非法 stage=${scene.stage}`);
  if (!scene.palette || !Array.isArray(scene.palette.sky) || !scene.palette.sky.every(isStr)) {
    errs.push(`${mode}: palette.sky 必须是 2 个颜色字符串`);
  }
  if (scene.palette && scene.palette.sky && scene.palette.sky.length !== 2) {
    errs.push(`${mode}: palette.sky 长度必须为 2`);
  }
  const layers = scene.layers;
  if (!Array.isArray(layers) || layers.length === 0) {
    errs.push(`${mode}: layers 不能为空`);
  } else {
    layers.forEach((l, i) => {
      if (!l || !isStr(l.atom)) errs.push(`${mode}: layers[${i}].atom 非法`);
      else if (!atomNames.has(l.atom)) errs.push(`${mode}: 未知原子 "${l.atom}"`);
      if (l && l.animate !== undefined && typeof l.animate !== 'boolean') {
        errs.push(`${mode}: layers[${i}].animate 必须是 boolean`);
      }
    });
  }
  const ps = scene.particles || [];
  if (!Array.isArray(ps)) {
    errs.push(`${mode}: particles 必须是数组`);
  } else {
    ps.forEach((p, i) => {
      if (!p || !PARTICLE_KINDS.has(p.kind)) errs.push(`${mode}: particles[${i}] 未知 kind=${p?.kind}`);
      if (p && (!Number.isInteger(p.count) || p.count < 0 || p.count > 60)) {
        errs.push(`${mode}: particles[${i}].count 必须是 0..60 的整数`);
      }
    });
  }
  const fx = scene.fx;
  if (fx) {
    for (const [k, max] of Object.entries({
      vignette: 1, bottomFade: 1, topFade: 1, scanlines: 1, glitch: 1,
    })) {
      if (fx[k] !== undefined && (!isNum(fx[k]) || fx[k] < 0 || fx[k] > max)) {
        errs.push(`${mode}: fx.${k} 必须是 0..${max} 的数字`);
      }
    }
  }
  if (scene.plate) {
    for (const [k, max] of Object.entries({ scale: 1.5, swayX: 24, swayY: 24 })) {
      if (scene.plate[k] !== undefined && (!isNum(scene.plate[k]) || scene.plate[k] < 0 || scene.plate[k] > max)) {
        errs.push(`${mode}: plate.${k} 必须是 0..${max} 的数字`);
      }
    }
  }
  return errs;
}
