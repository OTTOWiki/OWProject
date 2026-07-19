/**
 * 子弹对象池：acquire / release，降低密弹时 new + GC。
 * 上限防无限涨；超限直接 new。
 */
import { Bullet } from './entities.js';

const pool = [];
const MAX_POOL = 4096;

/** @param {object} opts Bullet 构造参数 */
export function acquireBullet(opts) {
  const b = pool.length > 0 ? pool.pop() : null;
  if (b) {
    b.reset(opts);
    return b;
  }
  return new Bullet(opts);
}

/** @param {object|null|undefined} b */
export function releaseBullet(b) {
  if (!b) return;
  b.onSplit = null;
  b.owner = null;
  b._hitIds = null;
  b.dead = true;
  if (pool.length < MAX_POOL) pool.push(b);
}

/** 清空列表并全部归还池 */
export function releaseBulletList(arr) {
  if (!arr) return;
  for (let i = 0; i < arr.length; i++) releaseBullet(arr[i]);
  arr.length = 0;
}

/** 仅移除 dead 并归还（swap-remove，O(n)） */
export function purgeDeadBullets(arr) {
  if (!arr) return;
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    const b = arr[i];
    if (b.dead) {
      releaseBullet(b);
    } else {
      arr[w++] = b;
    }
  }
  arr.length = w;
}

export function bulletPoolStats() {
  return { pooled: pool.length, max: MAX_POOL };
}
