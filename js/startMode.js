/**
 * 开局 mode 策略（纯函数，UI 与测试共用）
 * - story / practice / stage / extra / nomiss
 */

/** Stage Select 条目 id → Game.start mode */
export function stageSelectStartMode(stageSelectId) {
  return String(stageSelectId) === 'EX' ? 'extra' : 'stage';
}

/** 该开局是否走 Extra 专用难度（仅 extra 模式） */
export function isExtraRestrictedMode(mode) {
  return mode === 'extra';
}

/** Extra 可用难度 id 列表（独立于常规 DIFFICULTY_ORDER） */
export function extraDifficultyIds() {
  return ['extra'];
}
