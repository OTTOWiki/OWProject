/**
 * 弹幕工具 / 瞄准几何
 */
import {
  scaleBulletCount, aimAngle, oddAim, evenAim, ring, fan,
} from '../js/patterns.js';
import { Bullet } from '../js/entities.js';
import { test, assert, assertEqual, assertClose } from './assert.js';

test('scaleBulletCount：mul=1 原样', () => {
  assertEqual(scaleBulletCount({ bulletCountMul: 1 }, 5), 5);
  assertEqual(scaleBulletCount({}, 3), 3);
});

test('scaleBulletCount：odd/even 保持奇偶', () => {
  const hard = { bulletCountMul: 1.25 };
  const easy = { bulletCountMul: 0.65 };
  const oddH = scaleBulletCount(hard, 3, 'odd');
  const evenH = scaleBulletCount(hard, 4, 'even');
  const oddE = scaleBulletCount(easy, 3, 'odd');
  const evenE = scaleBulletCount(easy, 4, 'even');
  assert(oddH % 2 === 1, `odd hard ${oddH}`);
  assert(evenH % 2 === 0 && evenH >= 2, `even hard ${evenH}`);
  assert(oddE % 2 === 1, `odd easy ${oddE}`);
  assert(evenE % 2 === 0 && evenE >= 2, `even easy ${evenE}`);
});

test('aimAngle / oddAim / evenAim / ring / fan 形状', () => {
  const from = { x: 0, y: 0 };
  const to = { x: 1, y: 0 };
  assertClose(aimAngle(from, to), 0);

  const playerUp = { x: 0, y: -10 };
  const base = aimAngle(from, playerUp);

  const odds = oddAim(from, playerUp, 3, 0.2);
  assertEqual(odds.length, 3);
  assertClose(odds[1], base, 1e-9);
  assertClose(odds[0], base - 0.2, 1e-9);
  assertClose(odds[2], base + 0.2, 1e-9);

  const evens = evenAim(from, playerUp, 4, 0.2);
  assertEqual(evens.length, 4);
  assertClose(evens[0], base - 0.3, 1e-9);
  assertClose(evens[1], base - 0.1, 1e-9);
  assertClose(evens[2], base + 0.1, 1e-9);
  assertClose(evens[3], base + 0.3, 1e-9);
  for (const a of evens) {
    assert(Math.abs(a - base) > 1e-9, 'evenAim must not fire dead-on at player');
  }
  const odds4 = oddAim(from, playerUp, 4, 0.2);
  assertEqual(odds4.length, 4);
  for (let i = 0; i < 4; i++) assertClose(odds4[i], evens[i], 1e-9);

  const r = ring(8, 0);
  assertEqual(r.length, 8);
  assertClose(r[0], 0);
  assertClose(r[4], Math.PI, 1e-9);

  const f = fan(0, 5, 0.1);
  assertEqual(f.length, 5);
  assertClose(f[2], 0);
});


test('屏外宽限：朝场内飞的雨弹不会第一帧被剔除', () => {
  const b = new Bullet({ x: -100, y: 100, vx: 2, vy: 0, type: 'dot', from: 'enemy' });
  for (let i = 0; i < 3; i++) b.update(1 / 60, null);
  assert(!b.dead, '出生宽限内不剔除');
  for (let i = 0; i < 60 && !b.dead; i++) b.update(1 / 60, null);
  assert(!b.dead, '速度仍指向场内时保留');
});

test('屏外宽限：朝场外飞的弹约 5 帧后才剔除', () => {
  const b = new Bullet({ x: -100, y: 100, vx: -2, vy: 0, type: 'dot', from: 'enemy' });
  b.update(1 / 60, null);
  assert(!b.dead, '第一帧不剔除');
  for (let i = 0; i < 8; i++) b.update(1 / 60, null);
  assert(b.dead, '宽限结束后按原规则剔除');
});

test('屏外宽限：飞出上边界但 vy>0 的追踪弹不剔除', () => {
  const b = new Bullet({
    x: 100, y: -50, vx: 0, vy: 1, type: 'dot', from: 'enemy', homing: 0.2,
  });
  for (let i = 0; i < 30; i++) b.update(1 / 60, { x: 100, y: 100 });
  assert(!b.dead, '回场弹继续存活');
});
