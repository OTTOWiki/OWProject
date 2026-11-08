/**
 * 停帧（hit-stop）期间的战斗边沿输入缓冲。
 *
 * - `captureCombatEdges` 每个逻辑块调用：立即翻转单击发射锁存，并累积 X / C 边沿。
 * - 停帧块不跑 `updateCombat`，缓冲会跨块保留；`consumeCombatEdges` 在真正推进
 *   战斗的块取走并清零，保证一次按下只触发一次。
 * - 暂停 / 离开对局用 `clearCombatEdges` 丢弃，避免恢复后误触发。
 *
 * 录制回放不需要额外字段：缓冲由输入边沿派生，回放快照里的 pressed / bombTap /
 * itemTap 会在同一逻辑块重放同样的 capture。
 */

/**
 * @typedef {{ bomb: boolean, item: boolean }} CombatEdges
 */

/** @returns {CombatEdges} */
export function createCombatEdges() {
  return { bomb: false, item: false };
}

/**
 * 每逻辑块记录边沿；停帧块同样调用。
 * @param {CombatEdges} edges
 * @param {{ updateShotToggle(): void, bombPressed(): boolean, itemPressed(): boolean }} input
 */
export function captureCombatEdges(edges, input) {
  input.updateShotToggle();
  if (input.bombPressed()) edges.bomb = true;
  if (input.itemPressed()) edges.item = true;
}

/**
 * 战斗推进块取走缓冲，并清零。
 * @param {CombatEdges} edges
 * @returns {CombatEdges}
 */
export function consumeCombatEdges(edges) {
  const out = { bomb: edges.bomb, item: edges.item };
  edges.bomb = false;
  edges.item = false;
  return out;
}

/**
 * 丢弃未消费的边沿。
 * @param {CombatEdges} edges
 */
export function clearCombatEdges(edges) {
  edges.bomb = false;
  edges.item = false;
}
