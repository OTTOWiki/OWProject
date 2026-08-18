/**
 * 可复现伪随机（录像回放确定性基础）。
 * mulberry32：32 位种子 → [0,1) 均匀分布，返回与 Math.random 同区间。
 */

export function createRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 生成一个 32 位随机种子（真实随机，用于新录像） */
export function randomSeed() {
  return (Math.random() * 0xffffffff) >>> 0;
}

/** 模块加载时捕获的真实 Math.random（不受 withSeededRng 的全局替换影响） */
const REAL_RANDOM = Math.random.bind(Math);

/**
 * 在 fn 执行期间把 Math.random 临时换回真实随机，finally 恢复当前值。
 * 用于装饰性随机（Three 背景场景构建等），避免其消费种子流、破坏回放确定性。
 */
export function withRealRandom(fn) {
  const cur = Math.random;
  Math.random = REAL_RANDOM;
  try {
    return fn();
  } finally {
    Math.random = cur;
  }
}

/**
 * 在 fn 执行期间把 Math.random 临时替换为 next（返回 [0,1)），finally 恢复。
 * 用于逻辑块内覆盖游戏性随机；装饰性随机（背景/音效）留在逻辑块外，不消费种子流。
 */
export function withSeededRng(fn, next) {
  const orig = Math.random;
  Math.random = next;
  try {
    return fn();
  } finally {
    Math.random = orig;
  }
}
