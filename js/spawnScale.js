/**
 * 难度缩放（纯函数）：供 Game.spawnEnemy / spawnBullet 与测试共用。
 * 与旧 Array.push 钩子语义对齐。
 */

/** @param {object} e 敌机 */
export function applyEnemyDifficulty(e, enemyHpMul = 1, fireIntervalMul = 1) {
  if (!e || e._diffScaled) return e;
  const hpMul = enemyHpMul ?? 1;
  e.hp = Math.max(1, Math.floor(e.hp * hpMul));
  e.maxHp = Math.max(1, Math.floor((e.maxHp ?? e.hp) * hpMul));
  e._fireMul = fireIntervalMul ?? 1;
  e._diffScaled = true;
  return e;
}

/** @param {object} b 子弹（仅 from==='enemy' 缩放） */
export function applyEnemyBulletDifficulty(b, bulletSpeedMul = 1) {
  if (!b || b.from !== 'enemy' || b._diffScaled) return b;
  const m = bulletSpeedMul ?? 1;
  b.vx = (b.vx || 0) * m;
  b.vy = (b.vy || 0) * m;
  if (b.speed) b.speed *= m;
  b._diffScaled = true;
  return b;
}
