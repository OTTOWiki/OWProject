/**
 * 道具对象池：acquire / release，降低掉落时 new + GC。
 */
import { Item } from './entities.js';
import { createPool } from './pool.js';

const MAX_POOL = 256;

const pool = createPool({
  create: (x, y, kind = 'score') => new Item(x, y, kind),
  max: MAX_POOL,
  onRelease(it) {
    it.attract = false;
  },
});

/** @param {number} x @param {number} y @param {string} [kind] */
export const acquireItem = (x, y, kind = 'score') => pool.acquire(x, y, kind);
/** @param {object|null|undefined} it */
export const releaseItem = (it) => pool.release(it);
/** 清空列表并全部归还池 */
export const releaseItemList = (arr) => pool.releaseList(arr);
/** 仅移除 dead 并归还（swap-remove） */
export const purgeDeadItems = (arr) => pool.purgeDead(arr);
export const itemPoolStats = () => pool.stats();
