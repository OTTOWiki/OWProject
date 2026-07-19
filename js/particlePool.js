/**
 * 粒子对象池：acquire / release，降低擦弹/击破时 new + GC。
 */
import { Particle } from './entities.js';

const pool = [];
const MAX_POOL = 512;

/** @param {number} x @param {number} y @param {string} color @param {number} [life] */
export function acquireParticle(x, y, color, life = 0.4) {
  const pt = pool.length > 0 ? pool.pop() : null;
  if (pt) {
    pt.reset(x, y, color, life);
    return pt;
  }
  return new Particle(x, y, color, life);
}

/** @param {object|null|undefined} pt */
export function releaseParticle(pt) {
  if (!pt) return;
  pt.dead = true;
  pt.grazeFade = false;
  pt.alphaMul = undefined;
  if (pool.length < MAX_POOL) pool.push(pt);
}

/** 清空列表并全部归还池 */
export function releaseParticleList(arr) {
  if (!arr) return;
  for (let i = 0; i < arr.length; i++) releaseParticle(arr[i]);
  arr.length = 0;
}

/** 仅移除 dead 并归还（swap-remove） */
export function purgeDeadParticles(arr) {
  if (!arr) return;
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    const pt = arr[i];
    if (pt.dead) {
      releaseParticle(pt);
    } else {
      arr[w++] = pt;
    }
  }
  arr.length = w;
}

export function particlePoolStats() {
  return { pooled: pool.length, max: MAX_POOL };
}
