/**
 * 碰撞几何
 */
import { distPointSeg, bulletDistToPlayer } from '../js/collision.js';
import { test, assertClose } from './assert.js';

test('distPointSeg：点在线段上 / 垂足 / 端点外', () => {
  assertClose(distPointSeg(5, 0, 0, 0, 10, 0), 0);
  assertClose(distPointSeg(5, 3, 0, 0, 10, 0), 3);
  assertClose(distPointSeg(-2, 0, 0, 0, 10, 0), 2);
  assertClose(distPointSeg(12, 0, 0, 0, 10, 0), 2);
});

test('bulletDistToPlayer：圆弹与激光', () => {
  const p = { x: 100, y: 100 };
  const dot = { type: 'dot', x: 103, y: 104 };
  assertClose(bulletDistToPlayer(dot, p), 5);

  const laser = {
    type: 'laser', x: 0, y: 100, angle: 0, laserLen: 200,
  };
  assertClose(bulletDistToPlayer(laser, p), 0);
});
