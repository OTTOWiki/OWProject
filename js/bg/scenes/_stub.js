/**
 * 场景 stub 工厂 + 11 面调色板（供正式场景实现/回退共用）。
 * 正式场景由 `js/bg/scenes/<stage>.js` 覆盖；本文件只保证「系统未完成/素材缺失」时
 * 每个 mode 仍有合法场景、可渲染、有该面主色身份。
 * 设计说明：docs/level-background-redesign.md §4。
 */
import { sceneDefaults } from '../schema.js';

/** 每面主色（mid；boss 用 boss 覆盖）。字段供原子与场景自由取用。 */
export const STAGE_PALETTES = {
  s1: {
    sky: ['#06120c', '#122a1c'],
    ink: '#040a07',
    accent: '#7ee2a8',
    accent2: '#d9c27a',
    seal: '#c2463f',
    glow: '#cfd8c0',
    fog: '#8fbfa0',
    boss: {
      sky: ['#160a12', '#301226'],
      ink: '#0a0407',
      accent: '#f9a8d4',
      accent2: '#67e8f9',
      glow: '#e8cfe0',
      fog: '#b48a9e',
    },
  },
  s2: {
    sky: ['#050e1c', '#0f2d45'],
    ink: '#030810',
    accent: '#7cc7f0',
    accent2: '#d7ecff',
    seal: '#e05555',
    glow: '#bfe6ff',
    fog: '#8fb6cc',
    boss: {
      sky: ['#081726', '#123e5c'],
      ink: '#040b14',
      accent: '#9fd8ff',
      accent2: '#ffffff',
      glow: '#d8f2ff',
      fog: '#a8c8d8',
    },
  },
  s3: {
    sky: ['#0b0f14', '#1c2230'],
    ink: '#06070a',
    accent: '#8aa0b5',
    accent2: '#d97a2e',
    seal: '#c8542f',
    glow: '#e8c06a',
    fog: '#7e8a99',
    boss: {
      sky: ['#120d12', '#2c1c22'],
      ink: '#070408',
      accent: '#a8c0d8',
      accent2: '#ff9b45',
      glow: '#ffcf8a',
      fog: '#9a8a92',
    },
  },
  patrol: {
    sky: ['#170406', '#3a0810'],
    ink: '#080203',
    accent: '#ff3b4e',
    accent2: '#ffb199',
    seal: '#ffd166',
    glow: '#ff6b6b',
    fog: '#b86a70',
  },
  a4: {
    sky: ['#1a1206', '#3a2a0c'],
    ink: '#0c0803',
    accent: '#e3b64d',
    accent2: '#c8542f',
    seal: '#f3e2b6',
    glow: '#ffdf9a',
    fog: '#b89a5a',
    boss: {
      sky: ['#241406', '#4a2a0a'],
      ink: '#0e0802',
      accent: '#ffcf66',
      accent2: '#ff7a3d',
      glow: '#ffe8b0',
      fog: '#c8a462',
    },
  },
  a5: {
    sky: ['#0a1626', '#2a0f1e'],
    ink: '#05070c',
    accent: '#6f9fd8',
    accent2: '#e89ab8',
    seal: '#f2e8ec',
    glow: '#b8d0f0',
    fog: '#8a90b0',
    boss: {
      sky: ['#0e1a30', '#341226'],
      ink: '#06060e',
      accent: '#8fc0ff',
      accent2: '#ffb0d0',
      glow: '#e0d0ff',
      fog: '#a89ac0',
    },
  },
  a6: {
    sky: ['#1e0e16', '#3a1c26'],
    ink: '#0c0508',
    accent: '#f2a6c0',
    accent2: '#9fe0c8',
    seal: '#8a4a3a',
    glow: '#e8cf9a',
    fog: '#c090a0',
    boss: {
      sky: ['#2a0e18', '#4a1c2a'],
      ink: '#100508',
      accent: '#ffb8d0',
      accent2: '#ffd890',
      glow: '#ffe0c0',
      fog: '#d0a0b0',
    },
  },
  b4: {
    sky: ['#140406', '#380810'],
    ink: '#070103',
    accent: '#c0263a',
    accent2: '#ff6b35',
    seal: '#d9c8b0',
    glow: '#ff8a5a',
    fog: '#a05a62',
    boss: {
      sky: ['#1c0408', '#480a12'],
      ink: '#0a0103',
      accent: '#ff2f45',
      accent2: '#ffa040',
      glow: '#ffb080',
      fog: '#c06a72',
    },
  },
  b5: {
    sky: ['#0a1020', '#1e1826'],
    ink: '#04060c',
    accent: '#ff8a3d',
    accent2: '#54d6d0',
    seal: '#ffb15c',
    glow: '#ffc78a',
    fog: '#8a7a7a',
    boss: {
      sky: ['#0c1226', '#241a30'],
      ink: '#05060e',
      accent: '#ffa050',
      accent2: '#6ff0e8',
      glow: '#ffd0a0',
      fog: '#9a8a88',
    },
  },
  b6: {
    sky: ['#0a1006', '#1a2a08'],
    ink: '#040702',
    accent: '#7fb52e',
    accent2: '#cfe8a0',
    seal: '#6a5a30',
    glow: '#b8e060',
    fog: '#8aa05a',
    boss: {
      sky: ['#0e1604', '#24380a'],
      ink: '#050802',
      accent: '#a0e030',
      accent2: '#f0ffc0',
      glow: '#d0ff80',
      fog: '#a0c060',
    },
  },
  ex: {
    sky: ['#0a040c', '#2a0a2e'],
    ink: '#05020a',
    accent: '#d94fd0',
    accent2: '#5ad4e0',
    seal: '#b04ad0',
    glow: '#f0a0ff',
    fog: '#a06aa0',
    boss: {
      sky: ['#10040e', '#3a0c34'],
      ink: '#06020a',
      accent: '#ff5ad0',
      accent2: '#7ae0ff',
      glow: '#ffb0ff',
      fog: '#c080c0',
    },
  },
};

/**
 * stub 场景：合法、可渲染、有该面主色；正式场景实现前占位。
 * @param {string} stage
 * @param {string} mode
 * @param {object} [overrides]
 */
export function stubScene(stage, mode, overrides = {}) {
  const base = STAGE_PALETTES[stage];
  const boss = /_boss$/.test(mode);
  const palette = boss ? { ...base, ...(base.boss || {}) } : base;
  return sceneDefaults({
    mode,
    stage,
    palette,
    plate: {},
    layers: [
      { atom: 'glow', params: { x: 0.5, y: 0.24, r: 0.68, color: palette.glow, alpha: 0.12 } },
      { atom: 'fogBank', params: { y: 0.62, h: 0.18, color: palette.fog, alpha: 0.16, speed: 5 } },
      { atom: 'frameBranches', params: { side: 'left', color: palette.ink, alpha: 0.5 } },
      { atom: 'grassReeds', params: { color: palette.ink, alpha: 0.6 } },
    ],
    particles: [
      { kind: 'spark', count: 10, colors: [palette.accent, palette.accent2] },
    ],
    fx: { vignette: 0.46, bottomFade: 0.55, topFade: 0.3 },
    ...overrides,
  });
}
