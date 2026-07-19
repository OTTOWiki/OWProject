/**
 * 道具对象池：acquire / release，降低掉落时 new + GC。
 */
import { Item } from './entities.js';

const pool = [];
const MAX_POOL = 256;

/** @param {number} x @param {number} y @param {string} [kind] */
export function acquireItem(x, y, kind = 'score') {
  const it = pool.length > 0 ? pool.pop() : null;
  if (it) {
    it._pooled = false;
    it.reset(x, y, kind);
    return it;
  }
  return new Item(x, y, kind);
}

/** @param {object|null|undefined} it */
export function releaseItem(it) {
  if (!it || it._pooled) return;
  it.dead = true;
  it.attract = false;
  if (pool.length < MAX_POOL) {
    it._pooled = true;
    pool.push(it);
  }
}

/** 清空列表并全部归还池 */
export function releaseItemList(arr) {
  if (!arr) return;
  for (let i = 0; i < arr.length; i++) releaseItem(arr[i]);
  arr.length = 0;
}

/** 仅移除 dead 并归还（swap-remove） */
export function purgeDeadItems(arr) {
  if (!arr) return;
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    const it = arr[i];
    if (it.dead) {
      releaseItem(it);
    } else {
      arr[w++] = it;
    }
  }
  arr.length = w;
}

export function itemPoolStats() {
  return { pooled: pool.length, max: MAX_POOL };
}
