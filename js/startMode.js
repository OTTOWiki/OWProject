/**
 * 开局 mode 策略（纯函数，UI 与测试共用）
 * - story / practice / stage / extra
 */

/** Stage Select 条目 id → Game.start mode */
export function stageSelectStartMode(stageSelectId) {
  return String(stageSelectId) === 'EX' ? 'extra' : 'stage';
}

/** Extra 是否只允许 Hard / Lunatic */
export function isExtraRestrictedMode(mode) {
  return mode === 'extra';
}

/** Extra 可用难度 id 列表（从全量 order 过滤） */
export function extraDifficultyIds(allOrder) {
  return ['extra'];
}
