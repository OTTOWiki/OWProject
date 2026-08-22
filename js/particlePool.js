/**
 * 粒子对象池：acquire / release，降低擦弹/击破时 new + GC。
 */
import { Particle } from './entities.js';
import { createPool } from './pool.js';

const MAX_POOL = 512;

const pool = createPool({
  create: (x, y, color, life = 0.4) => new Particle(x, y, color, life),
  max: MAX_POOL,
  onRelease(pt) {
    pt.grazeFade = false;
    pt.alphaMul = undefined;
  },
});

/** @param {number} x @param {number} y @param {string} color @param {number} [life] */
export const acquireParticle = (x, y, color, life = 0.4) => pool.acquire(x, y, color, life);
/** @param {object|null|undefined} pt */
export const releaseParticle = (pt) => pool.release(pt);
/** 清空列表并全部归还池 */
export const releaseParticleList = (arr) => pool.releaseList(arr);
/** 仅移除 dead 并归还（swap-remove） */
export const purgeDeadParticles = (arr) => pool.purgeDead(arr);
export const particlePoolStats = () => pool.stats();
