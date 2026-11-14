/**
 * 移动端移动契约：0.5 摇杆死区缩放 + 8 向键位映射 + 与桌面同速。
 */
import {
  BALANCE, LOGICAL_W, PLAYER_DEFS, TOUCH_DRAG_SCALE, TOUCH_JOYSTICK_DEADZONE,
  TOUCH_JOYSTICK_SLOW_RADIUS, TOUCH_JOYSTICK_UNLIMITED_MUL, TOUCH_SENSITIVITY,
} from '../js/config.js';
import { joystickAxisFromDelta, joystickStateFromDelta, moveAxisFromSeq } from '../js/input.js';
import { Player } from '../js/entities.js';
import { test, assert, assertEqual } from './assert.js';

function touchInput(virtualMove, { slow = false, limit = true, autoShot = false } = {}) {
  return {
    virtualMove,
    touchSpeedLimit: limit,
    autoShot,
    slowHeld: () => slow,
    moveAxis: () => ({ x: 0, y: 0 }),
  };
}

function keyInput(axis, { slow = false, limit = true, autoShot = false } = {}) {
  return {
    virtualMove: null,
    touchSpeedLimit: limit,
    autoShot,
    slowHeld: () => slow,
    moveAxis: () => axis,
  };
}

test('触屏缩放 0.5 是硬约束（旧别名同值）', () => {
  assertEqual(TOUCH_DRAG_SCALE, 0.5);
  assertEqual(TOUCH_SENSITIVITY, 0.5);
  assert(TOUCH_JOYSTICK_DEADZONE > 0);
});

test('摇杆死区：单次位移 ×0.5 后超过死区才映射方向', () => {
  const assertAxis = (dx, dy, x, y) => {
    const a = joystickAxisFromDelta(dx, dy);
    assertEqual(a.x, x);
    assertEqual(a.y, y);
  };
  assertAxis(0, 0, 0, 0);
  assertAxis(TOUCH_JOYSTICK_DEADZONE * 2 - 1, 0, 0, 0);
  assertAxis(TOUCH_JOYSTICK_DEADZONE * 2 + 1, 0, 1, 0);
  assertAxis(-40, -40, -1, -1);
  assertAxis(40, -40, 1, -1);
  assertAxis(-40, 40, -1, 1);
  assertAxis(40, 40, 1, 1);
});

test('摇杆按径向扇区映射，轻推自动低速、推远全速', () => {
  const light = joystickStateFromDelta(10, 0); // ×0.5 = 5
  assertEqual(light.axis.x, 1);
  assertEqual(light.axis.y, 0);
  assertEqual(light.slow, true);
  const heavy = joystickStateFromDelta(40, 0); // ×0.5 = 20
  assertEqual(heavy.slow, false);
  assert(TOUCH_JOYSTICK_SLOW_RADIUS > TOUCH_JOYSTICK_DEADZONE);
  // 略偏上仍走东，明显偏上转东北，避免轴向死区卡住斜向。
  assertEqual(joystickAxisFromDelta(40, 10).y, 0);
  assertEqual(joystickAxisFromDelta(40, -30).y, -1);
});

test('摇杆方向映射为桌面移动键，斜向由移动轴归一化', () => {
  const axis = joystickAxisFromDelta(40, -40);
  const codes = [];
  if (axis.x > 0) codes.push('ArrowRight');
  if (axis.y < 0) codes.push('ArrowUp');
  assertEqual(codes.join(','), 'ArrowRight,ArrowUp');
  const normalized = moveAxisFromSeq(codes);
  assert(Math.abs(normalized.x - Math.SQRT1_2) < 1e-9);
  assert(Math.abs(normalized.y + Math.SQRT1_2) < 1e-9);
});

test('摇杆默认速度与桌面移动键相同，且不会瞬间跨越版面', () => {
  const p = new Player(PLAYER_DEFS.yinquan);
  p.x = 100;
  p.y = 100;
  p.update(1 / 60, keyInput({ x: 1, y: 0 }, { autoShot: true }));
  const step = p.x - 100;
  assert(Math.abs(step - BALANCE.playerSpeed) < 1e-9);
  assert(p.x < 400);
});

test('关闭限速只提升触屏手势的最高速度，并保留作弊标记路径', () => {
  const p = new Player(PLAYER_DEFS.yinquan);
  p.x = 100;
  p.y = 100;
  p.update(1 / 60, keyInput({ x: 1, y: 0 }, { autoShot: true, limit: false }));
  assert(Math.abs((p.x - 100) - BALANCE.playerSpeed * TOUCH_JOYSTICK_UNLIMITED_MUL) < 1e-9);
  assert(TOUCH_JOYSTICK_UNLIMITED_MUL > 1);
});

test('限速关闭但非触屏手势时，键盘移动仍按桌面速度', () => {
  const p = new Player(PLAYER_DEFS.yinquan);
  p.x = 100;
  p.y = 100;
  p.update(1 / 60, keyInput({ x: 1, y: 0 }, { autoShot: false, limit: false }));
  assert(Math.abs((p.x - 100) - BALANCE.playerSpeed) < 1e-9);
});

test('旧录像绝对目标默认按桌面同速跟随，不瞬移', () => {
  const p = new Player(PLAYER_DEFS.yinquan);
  p.x = 100;
  p.y = 100;
  p.update(1 / 60, touchInput({ x: 400, y: 580 }));
  const dist = Math.hypot(p.x - 100, p.y - 100);
  assert(dist > 0, 'should move toward target');
  assert(dist <= BALANCE.playerSpeed + 1e-9, `step ${dist} exceeds desktop speed`);
  assert(p.x < 400 && p.y < 580, 'one frame must not reach a far target');
});

test('旧录像绝对目标在限速关闭时保留直接置位', () => {
  const p = new Player(PLAYER_DEFS.yinquan);
  p.x = 100;
  p.y = 100;
  p.update(1 / 60, touchInput({ x: 400, y: 580 }, { limit: false }));
  assertEqual(p.x, 400);
  assertEqual(p.y, 580);
});

test('旧录像目标与自机位置都被钳制在版面内', () => {
  const p = new Player(PLAYER_DEFS.yinquan);
  p.x = 100;
  p.y = 100;
  p.update(1 / 60, touchInput({ x: -999, y: 9999 }, { limit: false }));
  assertEqual(p.x, 8);
  assertEqual(p.y, 592);
  assert(LOGICAL_W === 450 && p.x <= LOGICAL_W - 8);
});
