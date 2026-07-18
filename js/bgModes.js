/**
 * 背景 mode 推导（纯数据，无 Three 依赖；Node 测试可 import）
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
  EX: ['a5_mid', 'a6_boss'],
};

export function bgModeFor(stageKey, isBoss) {
  const p = BG_MODE_BY_STAGE[stageKey] || BG_MODE_BY_STAGE[1];
  return isBoss ? p[1] : p[0];
}
