/**
 * 加载界面落花。
 *
 * 只用一张 512×1024 的纵向无缝纹理 + WAAPI 背景位移：
 * - 不建粒子对象、不起 rAF；
 * - 真实处理进度只改 playbackRate，不重置动画相位；
 * - prefers-reduced-motion 下返回空控制器，CSS 仍显示静态花瓣。
 *
 * 纹理来源见 assets/NOTICE.md（CC0）。
 */

const BASE_DURATION_MS = 18000;
const TILE_W = 512;
const TILE_H = 1024;

/**
 * 把真实加载进度映射为落花播放倍率。
 * 0–15% 慢启动，15–85% 线性加速，85–100% 提前减速。
 * 非法输入按 0 处理。
 * @param {number|string} pct
 * @returns {number}
 */
export function petalPlaybackRate(pct) {
  const n = Number(pct);
  const p = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  if (p < 15) return 0.55 + (p / 15) * 0.25;
  if (p < 85) return 0.8 + ((p - 15) / 70);
  return 1.8 - ((p - 85) / 15) * 0.8;
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 初始化加载层里的两层落花。找不到节点或 API 不支持时返回 null，调用方可直接可选链。
 * @param {Document|HTMLElement} [root]
 * @returns {{
 *   setProgress(pct: number): void,
 *   setPaused(paused: boolean): void,
 *   cancel(): void,
 *   readonly animationCount: number,
 * } | null}
 */
export function initLoadingPetals(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return null;
  const layers = [...root.querySelectorAll('.load-petals-layer')];
  if (!layers.length) return null;

  const state = {
    progress: 0,
    paused: false,
    entries: [],
    reduced: prefersReducedMotion(),
    cancelled: false,
  };
  const canAnimate = !state.reduced
    && typeof window !== 'undefined'
    && typeof Element !== 'undefined'
    && typeof Element.prototype.animate === 'function';

  const tileHeightFor = (layer) => {
    const style = getComputedStyle(layer);
    const scale = Number.parseFloat(style.getPropertyValue('--petal-scale')) || 1;
    const width = layer.getBoundingClientRect().width
      || layer.clientWidth
      || root.clientWidth
      || 0;
    return (TILE_H / TILE_W) * width * scale;
  };

  const build = () => {
    for (const entry of state.entries) entry.anim.cancel();
    state.entries = [];
    if (!canAnimate || state.cancelled) return;
    for (const layer of layers) {
      if (typeof layer.animate !== 'function') continue;
      const tileHeight = tileHeightFor(layer);
      if (!(tileHeight > 0)) continue;
      const speed = Number.parseFloat(layer.dataset.petalSpeed) || 1;
      const anim = layer.animate(
        [
          { backgroundPositionY: '0px' },
          { backgroundPositionY: `-${tileHeight}px` },
        ],
        { duration: BASE_DURATION_MS, iterations: Infinity, easing: 'linear' },
      );
      anim.playbackRate = petalPlaybackRate(state.progress) * speed;
      if (state.paused) anim.pause();
      state.entries.push({ layer, speed, anim });
    }
  };

  const onResize = () => {
    if (!state.cancelled) build();
  };
  if (typeof window !== 'undefined') window.addEventListener('resize', onResize);
  build();

  return {
    setProgress(pct) {
      const n = Number(pct);
      state.progress = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
      for (const entry of state.entries) {
        entry.anim.playbackRate = petalPlaybackRate(state.progress) * entry.speed;
      }
    },
    setPaused(paused) {
      state.paused = !!paused;
      for (const entry of state.entries) {
        if (state.paused) entry.anim.pause();
        else entry.anim.play();
      }
    },
    cancel() {
      if (state.cancelled) return;
      state.cancelled = true;
      if (typeof window !== 'undefined') window.removeEventListener('resize', onResize);
      for (const entry of state.entries) entry.anim.cancel();
      state.entries = [];
    },
    get animationCount() {
      return state.entries.length;
    },
  };
}
