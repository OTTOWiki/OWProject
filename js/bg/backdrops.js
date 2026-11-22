/**
 * 外围舞台底材切换（`#stage-bg` + `#stage-bg-next` 双层交叉淡入）。
 * 每面一张 1600×1000 暗色印刷底材；加载失败时保持 `.game-backdrop` 的 battle-print 兜底。
 * 与版面 3D 场景的过渡（stage3d present pass）同时发生，但两者独立降级。
 * 设计说明：docs/level-background-redesign.md §3.4 / §9。
 */
import { backdropFor } from '../bgModes.js';

/** @type {Map<string, {img: HTMLImageElement|null, failed: boolean, waiters: Function[]}>} */
const cache = new Map();

/** 当前在前层的元素（交叉淡入时另一块成为目标层） */
let frontEl = null;
/** 防止快速切面时旧定时器把新底材关掉 */
let switchToken = 0;

function ensure(path) {
  let rec = cache.get(path);
  if (rec) return rec;
  rec = { img: null, failed: false, waiters: [] };
  cache.set(path, rec);
  if (typeof Image === 'undefined') {
    rec.failed = true;
    return rec;
  }
  const img = new Image();
  img.onload = () => {
    rec.img = img;
    const waiters = rec.waiters.splice(0);
    for (const fn of waiters) fn(img);
  };
  img.onerror = () => {
    rec.failed = true;
    rec.waiters.length = 0;
    const el = typeof document !== 'undefined' ? document.getElementById('stage-bg') : null;
    if (el && el.dataset.bgPath === path) el.classList.remove('has-bg');
  };
  img.src = path;
  return rec;
}

/** 预热某 mode 的外围底材（可在转场前调用） */
export function preloadStageBackdrop(mode) {
  ensure(backdropFor(mode));
}

function layers() {
  if (typeof document === 'undefined') return null;
  const a = document.getElementById('stage-bg');
  const b = document.getElementById('stage-bg-next');
  if (!a) return null;
  return b ? [a, b] : [a];
}

function reducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 切换外围底材（双层交叉淡入）。
 * @param {string} mode
 * @param {{boss?: boolean}} [opts]
 */
export function applyStageBackdrop(mode, { boss = false } = {}) {
  const els = layers();
  if (!els) return;
  const path = backdropFor(mode);

  // 相同底材：只更新 boss 滤镜，不重播淡入
  if (frontEl && frontEl.dataset.bgPath === path && frontEl.classList.contains('has-bg')) {
    frontEl.dataset.boss = boss ? '1' : '0';
    return;
  }

  // 目标层：若还没有前层则用 #stage-bg，否则用另一层（交叉淡入）
  let target;
  if (!frontEl || els.length === 1) target = els[0];
  else target = frontEl === els[0] ? els[1] : els[0];
  const prev = frontEl;
  frontEl = target;
  const token = ++switchToken;
  target.dataset.bgPath = path;
  target.dataset.boss = boss ? '1' : '0';
  target.classList.remove('has-bg');

  const reveal = () => {
    if (token !== switchToken) return;
    target.style.backgroundImage = `url("${path}")`;
    // 强制 reflow，确保 opacity 0 → 1 的过渡从下一帧开始（而不是被同帧合并）
    void target.offsetWidth;
    target.classList.add('has-bg');
    if (prev && prev !== target) {
      // 两层同时过渡：旧层淡出（略慢），新层淡入
      prev.classList.remove('has-bg');
      const stale = prev;
      const t = setTimeout(() => {
        if (token !== switchToken) return;
        stale.style.backgroundImage = '';
        stale.dataset.bgPath = '';
      }, 800);
      if (t?.unref) t.unref();
    }
  };

  const rec = ensure(path);
  if (reducedMotion()) {
    if (prev && prev !== target) prev.classList.remove('has-bg');
    if (rec.img) {
      target.style.backgroundImage = `url("${path}")`;
      target.classList.add('has-bg');
    } else if (!rec.failed) {
      rec.waiters.push(() => { target.style.backgroundImage = `url("${path}")`; target.classList.add('has-bg'); });
    } else {
      target.classList.remove('has-bg');
    }
    return;
  }
  if (rec.img) reveal();
  else if (!rec.failed) rec.waiters.push(reveal);
  else {
    target.classList.remove('has-bg');
    // 加载失败：保留上一层可见，避免黑底
    if (prev && prev !== target) prev.classList.add('has-bg');
    frontEl = prev;
  }
}
