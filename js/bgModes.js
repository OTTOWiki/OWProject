/**
 * 背景 mode 单一登记（纯数据，无 Three / DOM）
 * - stageKey → 默认 mid/boss mode
 * - 版面贴图路径
 * - 已知 mode 列表（测试 / playfield 校验）
 */

/** stageKey → [midMode, bossMode] */
export const BG_MODE_BY_STAGE = {
  1: ['s1_mid', 's1_boss'],
  2: ['s2_mid', 's2_boss'],
  3: ['s3_mid', 's3_boss'],
  patrol: ['patrol', 'patrol'],
  A4: ['a4_mid', 'a4_boss'],
  A5: ['a5_mid', 'a5_boss'],
  A6: ['a6_mid', 'a6_boss'],
  B4: ['b4_mid', 'b4_boss'],
  B5: ['b5_mid', 'b5_boss'],
  B6: ['b6_mid', 'b6_boss'],
  // EX 正式 mode 为 ex_*（贴图可复用 A 线资源）
  EX: ['ex_mid', 'ex_boss'],
};

/** 版面伪 3D 背景贴图（mode → path） */
export const PLAYFIELD_BG_TEX = {
  s1_mid: 'assets/bg/tex_s1_mid.avif',
  s1_boss: 'assets/bg/tex_s1_boss.avif',
  s2_mid: 'assets/bg/tex_s2_mid.avif',
  s2_boss: 'assets/bg/tex_s2_boss.avif',
  s3_mid: 'assets/bg/tex_s3_mid.avif',
  s3_boss: 'assets/bg/tex_s3_boss.avif',
  patrol: 'assets/bg/tex_patrol.avif',
  a4_mid: 'assets/bg/tex_a4_mid.avif',
  a4_boss: 'assets/bg/tex_a4_boss.avif',
  a5_mid: 'assets/bg/tex_a5_mid.avif',
  a5_boss: 'assets/bg/tex_a5_boss.avif',
  a6_mid: 'assets/bg/tex_a6_mid.avif',
  a6_boss: 'assets/bg/tex_a6_boss.avif',
  b4_mid: 'assets/bg/tex_b4_mid.avif',
  b4_boss: 'assets/bg/tex_b4_boss.avif',
  b5_mid: 'assets/bg/tex_b5_mid.avif',
  b5_boss: 'assets/bg/tex_b5_boss.avif',
  b6_mid: 'assets/bg/tex_b6_mid.avif',
  b6_boss: 'assets/bg/tex_b6_boss.avif',
  ex_mid: 'assets/bg/tex_a5_mid.avif',
  ex_boss: 'assets/bg/tex_a6_boss.avif',
};

/** 全部已知 mode id（含 EX 专用） */
export function getAllBgModes() {
  return Object.keys(PLAYFIELD_BG_TEX);
}

export function isKnownBgMode(mode) {
  return Object.prototype.hasOwnProperty.call(PLAYFIELD_BG_TEX, mode);
}

export function bgModeFor(stageKey, isBoss) {
  const p = BG_MODE_BY_STAGE[stageKey] || BG_MODE_BY_STAGE[1];
  return isBoss ? p[1] : p[0];
}

/**
 * 规范化 mode：未知则回落 s1_mid
 * @param {string} mode
 */
export function resolveBgMode(mode) {
  if (mode && isKnownBgMode(mode)) return mode;
  return 's1_mid';
}
