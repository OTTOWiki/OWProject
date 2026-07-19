/**
 * 断言 / 用例注册
 * - Node CLI：桥接 node:test + node:assert/strict（由 Node 跑完并设 exit code）
 * - 浏览器：零依赖 suite + runAll（/test/ 结果页）
 */

/** @typedef {{ name: string, fn: () => void | Promise<void> }} TestCase */

const isNode = typeof process !== 'undefined' && !!process.versions?.node;

/** @type {((name: string, fn: () => void | Promise<void>) => void) | null} */
let nodeTest = null;
/** @type {typeof import('node:assert/strict') | null} */
let nodeAssert = null;

if (isNode) {
  const nt = await import('node:test');
  nodeTest = nt.default;
  nodeAssert = await import('node:assert/strict');
}

/** @type {TestCase[]} */
const suite = [];

export function test(name, fn) {
  if (nodeTest) {
    nodeTest(name, async () => {
      await fn();
    });
    return;
  }
  suite.push({ name, fn });
}

export function assert(cond, message = 'assertion failed') {
  if (nodeAssert) {
    nodeAssert.ok(cond, message);
    return;
  }
  if (!cond) throw new Error(message);
}

export function assertEqual(actual, expected, message) {
  if (nodeAssert) {
    if (message) nodeAssert.equal(actual, expected, message);
    else nodeAssert.equal(actual, expected);
    return;
  }
  if (actual !== expected) {
    throw new Error(
      message
        || `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

export function assertClose(actual, expected, eps = 1e-6, message) {
  if (typeof actual !== 'number' || Math.abs(actual - expected) > eps) {
    const msg = message
      || `expected ≈ ${expected} (±${eps}), got ${actual}`;
    if (nodeAssert) nodeAssert.fail(msg);
    else throw new Error(msg);
  }
}

export function assertThrows(fn, message = 'expected throw') {
  if (nodeAssert) {
    nodeAssert.throws(fn, message);
    return;
  }
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) throw new Error(message);
}

/**
 * 浏览器结果页用。Node CLI 勿调用（用例已交给 node:test）。
 * @param {{ onStart?: (t: TestCase) => void, onPass?: (t: TestCase, ms: number) => void, onFail?: (t: TestCase, err: Error, ms: number) => void }} [hooks]
 */
export async function runAll(hooks = {}) {
  if (nodeTest) {
    throw new Error('runAll is browser-only; Node CLI uses node:test via import of cases');
  }

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
