/**
 * 泛型对象池（bullet / item / particle 三处共用）。
 * - acquire：优先取池中对象并 reset(...args)，否则 create(...args)
 * - release：置 dead + onRelease 清理，未满则回池
 * - releaseList / purgeDead：列表级归还
 * - stats：池占用统计（测试/调试）
 */
export function createPool({ create, max, onRelease }) {
  const pool = [];

  function acquire(...args) {
    const obj = pool.length > 0 ? pool.pop() : null;
    if (obj) {
      obj._pooled = false;
      obj.reset(...args);
      return obj;
    }
    return create(...args);
  }

  function release(obj) {
    if (!obj || obj._pooled) return;
    obj.dead = true;
    if (onRelease) onRelease(obj);
    if (pool.length < max) {
      obj._pooled = true;
      pool.push(obj);
    }
  }

  function releaseList(arr) {
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) release(arr[i]);
    arr.length = 0;
  }

  function purgeDead(arr) {
    if (!arr) return;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const obj = arr[i];
      if (obj.dead) {
        release(obj);
      } else {
        arr[w++] = obj;
      }
    }
    arr.length = w;
  }

  function stats() {
    return { pooled: pool.length, max };
  }

  return { acquire, release, releaseList, purgeDead, stats };
}
