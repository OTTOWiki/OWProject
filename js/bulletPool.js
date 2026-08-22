/**
 * 子弹对象池：acquire / release，降低密弹时 new + GC。
 * 上限防无限涨；超限直接 new。
 */
import { Bullet } from './entities.js';
import { createPool } from './pool.js';

const MAX_POOL = 4096;

const pool = createPool({
  create: (opts) => new Bullet(opts),
  max: MAX_POOL,
  onRelease(b) {
    b.onSplit = null;
    b.owner = null;
    b._hitIds = null;
  },
});

/** @param {object} opts Bullet 构造参数 */
export const acquireBullet = (opts) => pool.acquire(opts);
/** @param {object|null|undefined} b */
export const releaseBullet = (b) => pool.release(b);
/** 清空列表并全部归还池 */
export const releaseBulletList = (arr) => pool.releaseList(arr);
/** 仅移除 dead 并归还（swap-remove，O(n)） */
export const purgeDeadBullets = (arr) => pool.purgeDead(arr);
export const bulletPoolStats = () => pool.stats();
