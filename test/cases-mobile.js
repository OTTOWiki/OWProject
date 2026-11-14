/**
 * 移动端移动契约：0.5 硬缩放 + 与桌面同速的触屏跟随。
 */
import {
  BALANCE, LOGICAL_W, PLAYER_DEFS, TOUCH_DRAG_SCALE, TOUCH_SENSITIVITY,
} from '../js/config.js';
import { Player } from '../js/entities.js';
import { test, assert, assertEqual } from './assert.js';

function touchInput(virtualMove, { slow = false, limit = true } = {}) {
  return {
    virtualMove,
    touchSpeedLimit: limit,
    slowHeld: () => slow,
    moveAxis: () => ({ x: 0, y: 0 }),
  };
}

test('触屏缩放 0.5 是硬约束（旧别名同值）', () => {
  assertEqual(TOUCH_DRAG_SCALE, 0.5);
  assertEqual(TOUCH_SENSITIVITY, 0.5);
});

test('触屏相对移动默认按桌面同速跟随，不瞬移', () => {
  const p = new Player(PLAYER_DEFS.yinquan);
  p.x = 100;
  p.y = 100;
  p.update(1 / 60, touchInput({ x: 400, y: 580 }));
  const dist = Math.hypot(p.x - 100, p.y - 100);
  assert(dist > 0, 'should move toward target');
  assert(dist <= BALANCE.playerSpeed + 1e-9, `step ${dist} exceeds desktop speed`);
  assert(p.x < 400 && p.y < 580, 'one frame must not reach a far target');
});

test('触屏低速跟随同样不超低速上限', () => {
  const p = new Player(PLAYER_DEFS.yinquan);
  p.x = 100;
  p.y = 100;
  p.update(1 / 60, touchInput({ x: 400, y: 580 }, { slow: true }));
  const dist = Math.hypot(p.x - 100, p.y - 100);
  assert(dist > 0);
  assert(dist <= BALANCE.playerSlowSpeed + 1e-9, `slow step ${dist} exceeds slow speed`);
});

test('关闭限速时保留直接置位（并会由 Input 置作弊标记）', () => {
  const p = new Player(PLAYER_DEFS.yinquan);
  p.x = 100;
  p.y = 100;
  p.update(1 / 60, touchInput({ x: 400, y: 580 }, { limit: false }));
  assertEqual(p.x, 400);
  assertEqual(p.y, 580);
});

test('触屏目标与自机位置都被钳制在版面内', () => {
  const p = new Player(PLAYER_DEFS.yinquan);
  p.x = 100;
  p.y = 100;
  p.update(1 / 60, touchInput({ x: -999, y: 9999 }, { limit: false }));
  assertEqual(p.x, 8);
  assertEqual(p.y, 592);
  assert(LOGICAL_W === 450 && p.x <= LOGICAL_W - 8);
});
