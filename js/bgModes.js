/**
 * 背景 mode 单一登记（纯数据，无 Three / DOM）
 *
 * - stageKey → 默认 mid/boss mode
 * - 版面绘卷 plate 路径（P6 绘卷系统）：`assets/bg/scene/<stage>.avif`
 * - 外围舞台底材路径：`assets/bg/backdrop/<stage>.avif`
 * - 已知 mode 列表（测试 / playfield 校验）
 *
 * 新增一面的操作：本文件补 mode 与两张路径 + `js/bg/scenes/` 补场景数据。
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
  // EX 正式 mode 为 ex_*（与 A 线共用章节结构，素材独立）
  EX: ['ex_mid', 'ex_boss'],
};

/** stage → 版面绘卷 plate（900×1200 AVIF，见 docs/level-background-redesign.md §5） */
const SCENE_PLATE = {
  s1: 'assets/bg/scene/s1.avif',
  s2: 'assets/bg/scene/s2.avif',
  s3: 'assets/bg/scene/s3.avif',
  patrol: 'assets/bg/scene/patrol.avif',
  a4: 'assets/bg/scene/a4.avif',
  a5: 'assets/bg/scene/a5.avif',
  a6: 'assets/bg/scene/a6.avif',
  b4: 'assets/bg/scene/b4.avif',
  b5: 'assets/bg/scene/b5.avif',
  b6: 'assets/bg/scene/b6.avif',
  ex: 'assets/bg/scene/ex.avif',
};

/** stage → 外围舞台底材（1600×1000 AVIF） */
const STAGE_PLATE = {
  s1: 'assets/bg/backdrop/s1.avif',
  s2: 'assets/bg/backdrop/s2.avif',
  s3: 'assets/bg/backdrop/s3.avif',
  patrol: 'assets/bg/backdrop/patrol.avif',
  a4: 'assets/bg/backdrop/a4.avif',
  a5: 'assets/bg/backdrop/a5.avif',
  a6: 'assets/bg/backdrop/a6.avif',
  b4: 'assets/bg/backdrop/b4.avif',
  b5: 'assets/bg/backdrop/b5.avif',
  b6: 'assets/bg/backdrop/b6.avif',
  ex: 'assets/bg/backdrop/ex.avif',
};

/** mode → 版面 plate 路径（mid/boss 同图，观感差异由场景数据升级） */
export const PLAYFIELD_BG_TEX = {
  s1_mid: SCENE_PLATE.s1,
  s1_boss: SCENE_PLATE.s1,
  s2_mid: SCENE_PLATE.s2,
  s2_boss: SCENE_PLATE.s2,
  s3_mid: SCENE_PLATE.s3,
  s3_boss: SCENE_PLATE.s3,
  patrol: SCENE_PLATE.patrol,
  a4_mid: SCENE_PLATE.a4,
  a4_boss: SCENE_PLATE.a4,
  a5_mid: SCENE_PLATE.a5,
  a5_boss: SCENE_PLATE.a5,
  a6_mid: SCENE_PLATE.a6,
  a6_boss: SCENE_PLATE.a6,
  b4_mid: SCENE_PLATE.b4,
  b4_boss: SCENE_PLATE.b4,
  b5_mid: SCENE_PLATE.b5,
  b5_boss: SCENE_PLATE.b5,
  b6_mid: SCENE_PLATE.b6,
  b6_boss: SCENE_PLATE.b6,
  ex_mid: SCENE_PLATE.ex,
  ex_boss: SCENE_PLATE.ex,
};

/** mode → 外围舞台底材路径 */
export const STAGE_BACKDROP = {
  s1_mid: STAGE_PLATE.s1,
  s1_boss: STAGE_PLATE.s1,
  s2_mid: STAGE_PLATE.s2,
  s2_boss: STAGE_PLATE.s2,
  s3_mid: STAGE_PLATE.s3,
  s3_boss: STAGE_PLATE.s3,
  patrol: STAGE_PLATE.patrol,
  a4_mid: STAGE_PLATE.a4,
  a4_boss: STAGE_PLATE.a4,
  a5_mid: STAGE_PLATE.a5,
  a5_boss: STAGE_PLATE.a5,
  a6_mid: STAGE_PLATE.a6,
  a6_boss: STAGE_PLATE.a6,
  b4_mid: STAGE_PLATE.b4,
  b4_boss: STAGE_PLATE.b4,
  b5_mid: STAGE_PLATE.b5,
  b5_boss: STAGE_PLATE.b5,
  b6_mid: STAGE_PLATE.b6,
  b6_boss: STAGE_PLATE.b6,
  ex_mid: STAGE_PLATE.ex,
  ex_boss: STAGE_PLATE.ex,
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

/** mode → 外围底材路径（未知回落 s1） */
export function backdropFor(mode) {
  return STAGE_BACKDROP[mode] || STAGE_BACKDROP.s1_mid;
}
