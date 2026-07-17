/**
 * 零依赖迷你断言 / 用例收集（浏览器）
 */

/** @typedef {{ name: string, fn: () => void | Promise<void> }} TestCase */

/** @type {TestCase[]} */
const suite = [];

export function test(name, fn) {
  suite.push({ name, fn });
}

export function assert(cond, message = 'assertion failed') {
  if (!cond) throw new Error(message);
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      message
        || `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

export function assertClose(actual, expected, eps = 1e-6, message) {
  if (typeof actual !== 'number' || Math.abs(actual - expected) > eps) {
    throw new Error(
      message
        || `expected ≈ ${expected} (±${eps}), got ${actual}`,
    );
  }
}

export function assertThrows(fn, message = 'expected throw') {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) throw new Error(message);
}

/**
 * @param {{ onStart?: (t: TestCase) => void, onPass?: (t: TestCase, ms: number) => void, onFail?: (t: TestCase, err: Error, ms: number) => void }} [hooks]
 */
export async function runAll(hooks = {}) {
  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const t of suite) {
    hooks.onStart?.(t);
    const t0 = performance.now();
    try {
      await t.fn();
      const ms = performance.now() - t0;
      passed++;
      hooks.onPass?.(t, ms);
    } catch (e) {
      const ms = performance.now() - t0;
      failed++;
      const err = e instanceof Error ? e : new Error(String(e));
      failures.push({ name: t.name, error: err });
      hooks.onFail?.(t, err, ms);
    }
  }

  return {
    total: suite.length,
    passed,
    failed,
    failures,
  };
}
