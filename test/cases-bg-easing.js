/**
 * P3：背景缓动（TH20 math.cpp 32 条）。
 * 只测纯函数/插值器，不 import Three。
 */
import { ease, Interpolation } from '../js/backgrounds/easing.js';
import { test, assert, assertEqual, assertClose } from './assert.js';

test('ease：普通 mode 端点 0/1，常量 mode 15/16', () => {
  const modes = [0, 1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 7, 8, 17];
  for (const mode of modes) {
    assertClose(ease(mode, 0, 1), 0, `mode ${mode} 起点`);
    assertClose(ease(mode, 1, 1), 1, `mode ${mode} 终点`);
  }
  assertClose(ease(15, 0.3, 1), 0);
  assertClose(ease(16, 0.3, 1), 1);
  assertClose(ease(1, 0.5, 0), 1, 'duration=0 直接取 1');
});

test('ease：常用 mode 在 0..1 内且单调递增', () => {
  // 22–31 是 shifted-quadratic 的“回拉/过冲”族，不保证单调，只锁端点。
  for (const mode of [1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 18, 19, 20, 21]) {
    let prev = -1;
    for (let i = 0; i <= 40; i += 1) {
      const v = ease(mode, i / 40, 1);
      assert(v >= -1e-9 && v <= 1 + 1e-9, `mode ${mode} 越界 ${v}`);
      assert(v >= prev - 1e-9, `mode ${mode} 非单调`);
      prev = v;
    }
  }
});

test('Interpolation：普通 mode 端点与中点', () => {
  const p = new Interpolation({ mode: 0, start: 10, end: 20, duration: 1 });
  assertClose(p.sample(0.5), 15);
  assertClose(p.sample(0.5), 20, '到期取 end');
  assertEqual(p.done, true);
  assertClose(p.sample(1), 20, '结束后保持 end');
});

test('Interpolation：duration=0 立即取 end；mode7/17 取 start', () => {
  assertClose(new Interpolation({ mode: 0, start: 2, end: 8, duration: 0 }).sample(0), 8);
  assertClose(new Interpolation({ mode: 7, start: 2, end: 8, duration: 0 }).sample(0), 2);
  assertClose(new Interpolation({ mode: 17, start: 2, end: 8, duration: 0 }).sample(0), 2);
});

test('Interpolation：mode7 每帧累加 end，mode17 累加 tangentEnd', () => {
  const a = new Interpolation({ mode: 7, start: 0, end: 1, duration: 10 });
  assertClose(a.sample(1), 1);
  assertClose(a.sample(1), 2);

  const b = new Interpolation({ mode: 17, start: 0, end: 1, tangentEnd: 0, duration: 10 });
  assertClose(b.sample(1), 0);
  assertClose(b.sample(1), 1);
  assertClose(b.sample(1), 3);
});

test('Interpolation：mode8 Hermite 端点与中点', () => {
  const p = new Interpolation({ mode: 8, start: 0, end: 1, duration: 1 });
  assertClose(p.sample(0.5), 0.5);
  assertClose(p.sample(0.5), 1);
});

test('Interpolation：reset 恢复起点与未完成状态', () => {
  const p = new Interpolation({ mode: 0, start: 0, end: 1, duration: 1 });
  p.sample(1);
  p.reset({ start: 4, end: 6, duration: 2 });
  assertEqual(p.done, false);
  assertClose(p.current, 4);
  assertClose(p.sample(1), 5);
});
