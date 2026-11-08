/**
 * P0：背景场景构建 RNG 注入。
 *
 * 验证：
 * - 同一 seed 连跑两次，21 个 mode 的随机调用序列完全一致
 * - 构建期间不触碰全局 Math.random（否则会消费录像种子流）
 *
 * 用 Proxy 生成最小 THREE / canvas 替身；真实几何与 WebGL 不参与。
 */
import { setThree } from '../js/backgrounds/threeLoader.js';
import { StageBackground } from '../js/backgrounds/StageBackground.js';
import { STAGE_BG_BUILDERS } from '../js/backgrounds/builders.js';
import { createRng } from '../js/rng.js';
import { test, assert } from './assert.js';

function auto() {
  const f = function () {};
  return new Proxy(f, {
    get(t, k) {
      if (k === 'then') return undefined;
      if (k === Symbol.toPrimitive) return () => 0;
      if (!(k in t)) t[k] = auto();
      return t[k];
    },
    set(t, k, v) { t[k] = v; return true; },
    apply() { return auto(); },
    construct() { return auto(); },
  });
}

function makeFakeThree() {
  return new Proxy({}, {
    get(t, k) {
      if (!t[k]) t[k] = auto();
      return t[k];
    },
  });
}

test('背景构建：注入 RNG 后 21 mode 确定性且不消费全局 Math.random', () => {
  const hadWindow = typeof globalThis.window !== 'undefined';
  const hadDocument = typeof globalThis.document !== 'undefined';
  if (!hadWindow) {
    globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1 };
  }
  if (!hadDocument) {
    const ctx = { clearRect() {}, fillRect() {}, fillText() {} };
    globalThis.document = {
      createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
    };
  }

  const realRandom = Math.random;
  setThree(makeFakeThree());
  try {
    const canvas = { clientWidth: 300, clientHeight: 500 };
    const modes = Object.keys(STAGE_BG_BUILDERS);
    assert(modes.length > 0, '应存在背景 mode');

    for (const mode of modes) {
      const run = () => {
        const seq = [];
        const base = createRng(0x51ce);
        const bg = new StageBackground(canvas, {
          rand: () => {
            const v = base();
            seq.push(v);
            return v;
          },
        });
        bg.mode = mode;
        bg._rebuild();
        return seq;
      };

      Math.random = () => { throw new Error('build used global Math.random'); };
      let a;
      let b;
      try {
        a = run();
        b = run();
      } finally {
        Math.random = realRandom;
      }

      assert(a.length > 0, `${mode}: 构建应消费注入 RNG`);
      assert(a.join(',') === b.join(','), `${mode}: 同 seed 两次构建序列一致`);
    }
  } finally {
    setThree(null);
    Math.random = realRandom;
    if (!hadWindow) delete globalThis.window;
    if (!hadDocument) delete globalThis.document;
  }
});
