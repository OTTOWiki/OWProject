/**
 * H9：菜单按住重复调度器（假计时器，不依赖 DOM/真实时间）。
 */
import { createRepeatScheduler, MENU_REPEAT_DEFAULTS } from '../js/menuRepeat.js';
import { test, assert, assertEqual } from './assert.js';

function fakeTimers() {
  let now = 0;
  let seq = 1;
  const pending = new Map();
  const setTimeout = (fn, ms) => {
    const id = seq++;
    pending.set(id, { at: now + ms, fn });
    return id;
  };
  const clearTimeout = (id) => { pending.delete(id); };
  const advance = (ms) => {
    const target = now + ms;
    for (;;) {
      let next = null;
      for (const [id, entry] of pending) {
        if (entry.at <= target && (!next || entry.at < next.entry.at)) next = { id, entry };
      }
      if (!next) break;
      pending.delete(next.id);
      now = next.entry.at;
      next.entry.fn();
    }
    now = target;
  };
  return { setTimeout, clearTimeout, advance, pendingCount: () => pending.size };
}

test('菜单重复：默认首延迟/间隔', () => {
  assertEqual(MENU_REPEAT_DEFAULTS.firstMs, 350);
  assertEqual(MENU_REPEAT_DEFAULTS.rateMs, 80);
});

test('菜单重复：首延迟前不触发，之后按间隔重复', () => {
  const t = fakeTimers();
  const s = createRepeatScheduler({ ...t, firstMs: 350, rateMs: 80 });
  let n = 0;
  s.start('ArrowDown', () => { n += 1; });
  t.advance(349);
  assertEqual(n, 0, '首延迟内不重复');
  t.advance(1);
  assertEqual(n, 1, '350ms 触发第一次');
  t.advance(79);
  assertEqual(n, 1);
  t.advance(1);
  assertEqual(n, 2, '间隔 80ms 触发第二次');
  s.stop();
  t.advance(500);
  assertEqual(n, 2, 'stop 后不再触发');
});

test('菜单重复：start 换键会取消上一键', () => {
  const t = fakeTimers();
  const s = createRepeatScheduler({ ...t, firstMs: 100, rateMs: 50 });
  const hits = [];
  s.start('ArrowDown', (code) => hits.push(code));
  t.advance(60);
  s.start('ArrowUp', (code) => hits.push(code));
  t.advance(99);
  assertEqual(hits.length, 0);
  t.advance(1);
  assertEqual(hits.join(','), 'ArrowUp');
  assertEqual(s.code, 'ArrowUp');
});
