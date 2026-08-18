/**
 * Letter 收取记录：文案纯函数 + storage 读写 round-trip
 * （node / bun 测试环境无 localStorage，用例内挂临时内存 mock，用完恢复）
 */
import { STORAGE_KEYS } from '../js/config.js';
import {
  loadLetterRate, recordLetterTry, recordLetterCapture, letterRateText,
} from '../js/storage.js';
import { test, assert, assertEqual } from './assert.js';

/**
 * 临时内存 localStorage：withStorage(初始内容, fn)，
 * 结束后恢复原值（含「原本不存在」的情况），不污染同进程其它用例。
 */
function withStorage(data, fn) {
  const prev = globalThis.localStorage;
  const store = new Map(Object.entries(data));
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
  try {
    return fn();
  } finally {
    globalThis.localStorage = prev;
  }
}

test('letterRateText：无记录 / 收率文案', () => {
  assertEqual(letterRateText(0, 0), '暂无收取记录');
  assertEqual(letterRateText(-1, 0), '暂无收取记录');
  assertEqual(letterRateText(5, 3), '成功 3 / 尝试 5 = 60%');
  assertEqual(letterRateText(2, 1), '成功 1 / 尝试 2 = 50%');
  assertEqual(letterRateText(3, 1), '成功 1 / 尝试 3 = 33%');
});

test('loadLetterRate：缺失 / 坏 JSON 返回 {}', () => {
  withStorage({}, () => {
    assertEqual(Object.keys(loadLetterRate()).length, 0);
  });
  withStorage({ [STORAGE_KEYS.letterRate]: 'not json{' }, () => {
    assertEqual(Object.keys(loadLetterRate()).length, 0);
  });
});

test('loadLetterRate：校验丢弃坏数据，保留合法项', () => {
  const raw = JSON.stringify({
    '5': { tries: 3, captures: 2 },          // 合法
    '129': { tries: 1, captures: 0 },        // 合法
    '1': { tries: 1 },                        // 缺字段 → 丢
    '2': { tries: -1, captures: 0 },          // 负数 → 丢
    '3': { tries: 'a', captures: 0 },         // 非数字 → 丢
    '4': { tries: 1.5, captures: 0 },         // 非整数 → 丢
    '6': { tries: 1, captures: null },        // 缺字段 → 丢
    'abc': { tries: 1, captures: 0 },         // 非数字键 → 丢
  });
  const rate = withStorage({ [STORAGE_KEYS.letterRate]: raw }, () => loadLetterRate());
  assertEqual(rate['5'].tries, 3);
  assertEqual(rate['5'].captures, 2);
  assertEqual(rate['129'].tries, 1);
  assertEqual(rate['129'].captures, 0);
  assertEqual(Object.keys(rate).length, 2);
});

test('recordLetterTry / recordLetterCapture：round-trip 持久化', () => {
  withStorage({}, () => {
    recordLetterTry('129');
    recordLetterTry(129); // 数字入参 → 同一数字字符串键
    recordLetterCapture('129');
    recordLetterCapture('129');

    const rate = loadLetterRate();
    assertEqual(rate['129'].tries, 2);
    assertEqual(rate['129'].captures, 2);

    // 未计过的章节：记录写入后 tries 从 1 起
    recordLetterTry('5');
    assertEqual(loadLetterRate()['5'].tries, 1);
    assertEqual(loadLetterRate()['5'].captures, 0);

    // 确实写回了 localStorage
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.letterRate));
    assertEqual(stored['129'].tries, 2);
    assertEqual(stored['129'].captures, 2);
    assertEqual(stored['5'].tries, 1);
    assertEqual(stored['5'].captures, 0);
  });
});

test('loadLetterRate：数组等非对象根 → {}', () => {
  withStorage({ [STORAGE_KEYS.letterRate]: '[1,2]' }, () => {
    assertEqual(Object.keys(loadLetterRate()).length, 0);
  });
});

test('storage 无 localStorage 环境：loadLetterRate 不抛', () => {
  const prev = globalThis.localStorage;
  try {
    delete globalThis.localStorage;
    assertEqual(Object.keys(loadLetterRate()).length, 0);
  } finally {
    globalThis.localStorage = prev;
  }
});
