/**
 * 外围舞台底材切换（`#stage-bg`）。
 * 每面一张 1600×1000 暗色印刷底材；加载失败时保持 `.game-backdrop` 的 battle-print 兜底。
 * 设计说明：docs/level-background-redesign.md §3.4。
 */
import { backdropFor } from '../bgModes.js';

/** @type {Map<string, {img: HTMLImageElement|null, failed: boolean, waiters: Function[]}>} */
const cache = new Map();

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

/**
 * 切换外围底材。
 * @param {string} mode
 * @param {{boss?: boolean}} [opts]
 */
export function applyStageBackdrop(mode, { boss = false } = {}) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('stage-bg');
  if (!el) return;
  const path = backdropFor(mode);
  el.dataset.boss = boss ? '1' : '0';
  if (el.dataset.bgPath === path && el.classList.contains('has-bg')) return;
  el.dataset.bgPath = path;
  const rec = ensure(path);
  const reveal = () => {
    if (el.dataset.bgPath !== path) return;
    el.style.backgroundImage = `url("${path}")`;
    el.classList.add('has-bg');
  };
  if (rec.img) reveal();
  else if (!rec.failed) rec.waiters.push(reveal);
  else el.classList.remove('has-bg');
}
