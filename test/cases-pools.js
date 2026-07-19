/**
 * 对象池：acquire / release 身份与 double-release 安全
 */
import {
  acquireBullet, releaseBullet, bulletPoolStats,
} from '../js/bulletPool.js';
import {
  acquireItem, releaseItem, itemPoolStats,
} from '../js/itemPool.js';
import {
  acquireParticle, releaseParticle, particlePoolStats,
} from '../js/particlePool.js';
import { test, assert, assertEqual } from './assert.js';

test('bulletPool：double-release 不重复入池；再 acquire 身份独立', () => {
  const before = bulletPoolStats().pooled;
  const a = acquireBullet({ x: 10, y: 20, type: 'dot', from: 'enemy' });
  assert(a && !a._pooled, 'live bullet not marked pooled');
  a.dead = true;
  releaseBullet(a);
  assert(a._pooled, 'released bullet marked pooled');
  const mid = bulletPoolStats().pooled;
  assertEqual(mid, before + 1, 'first release increases pool by 1');
  releaseBullet(a);
  releaseBullet(a);
  assertEqual(bulletPoolStats().pooled, mid, 'double-release must not grow pool');

  const b = acquireBullet({ x: 1, y: 2, type: 'rice', from: 'enemy', speed: 2 });
  const c = acquireBullet({ x: 3, y: 4, type: 'dot', from: 'player' });
  assert(b !== c, 'two acquires must not share one instance after single release');
  assert(!b._pooled && !c._pooled, 'acquired bullets clear _pooled');
  assertEqual(b.x, 1);
  assertEqual(c.x, 3);
  releaseBullet(b);
  releaseBullet(c);
});

test('itemPool：double-release 不重复入池', () => {
  const before = itemPoolStats().pooled;
  const it = acquireItem(100, 200, 'score');
  releaseItem(it);
  const mid = itemPoolStats().pooled;
  assertEqual(mid, before + 1);
  releaseItem(it);
  assertEqual(itemPoolStats().pooled, mid);
  const it2 = acquireItem(0, 0, 'bomb');
  assert(!it2._pooled);
  assertEqual(it2.kind, 'bomb');
  releaseItem(it2);
});

test('particlePool：double-release 不重复入池', () => {
  const before = particlePoolStats().pooled;
  const pt = acquireParticle(5, 6, '#fff', 0.2);
  releaseParticle(pt);
  const mid = particlePoolStats().pooled;
  assertEqual(mid, before + 1);
  releaseParticle(pt);
  assertEqual(particlePoolStats().pooled, mid);
  const pt2 = acquireParticle(0, 0, '#f00', 0.1);
  assert(!pt2._pooled);
  releaseParticle(pt2);
});
