/**
 * 加载界面落花。
 *
 * 只在右下“少女祈祷中”加载角的局部盒子里播放：
 * - 一层 512×1024 无缝纹理，用 CSS transform 持续下落；
 * - JS 只设置轨道高度（两个 tile）并用 WAAPI 改 playbackRate；
 * - 即使 getAnimations 不可用，CSS 动画仍以 1× 播放；
 * - prefers-reduced-motion 下不创建/不调速，静态纹理保留。
 *
 * 纹理来源见 assets/NOTICE.md（CC0）。
 */

const TILE_ASPECT = 1024 / 512; // tile 高 = 2 × 盒宽

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
 * 初始化右下加载角里的落花。
 * @param {Document|HTMLElement} [root]
 * @returns {{
 *   setProgress(pct: number): void,
 *   setPaused(paused: boolean): void,
 *   cancel(): void,
 *   readonly animationCount: number,
 * } | null}
 */
export function initLoadingPetals(root = document) {
  if (!root || typeof root.querySelector !== 'function') return null;
  const box = root.querySelector('.load-petals');
  const track = root.querySelector('.load-petals-track');
  if (!box || !track) return null;

  const state = {
    progress: 0,
    paused: false,
    anim: null,
    cancelled: false,
    reduced: prefersReducedMotion(),
  };

  const measure = () => {
    const width = box.getBoundingClientRect().width || box.clientWidth || 0;
    if (!(width > 0)) return;
    // 轨道放两个 tile；CSS keyframe 的 -50% 正好移动一个 tile 高度。
    track.style.height = `${width * TILE_ASPECT * 2}px`;
  };

  const attach = () => {
    if (state.cancelled || state.reduced) return;
    if (typeof track.getAnimations !== 'function') return;
    const animations = track.getAnimations();
    state.anim = animations.find((anim) => anim.animationName === 'petalsFall')
      || animations[0]
      || null;
    if (!state.anim) return;
    state.anim.playbackRate = petalPlaybackRate(state.progress);
    if (state.paused) state.anim.pause();
  };

  measure();
  attach();
  if (!state.anim && !state.reduced && typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      if (!state.cancelled) attach();
    });
  }

  const onResize = () => {
    if (!state.cancelled) measure();
  };
  if (typeof window !== 'undefined') window.addEventListener('resize', onResize);

  return {
    setProgress(pct) {
      const n = Number(pct);
      state.progress = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
      if (state.anim) state.anim.playbackRate = petalPlaybackRate(state.progress);
    },
    setPaused(paused) {
      state.paused = !!paused;
      if (!state.anim) return;
      if (state.paused) state.anim.pause();
      else state.anim.play();
    },
    cancel() {
      if (state.cancelled) return;
      state.cancelled = true;
      if (typeof window !== 'undefined') window.removeEventListener('resize', onResize);
      state.anim?.cancel();
      state.anim = null;
    },
    get animationCount() {
      return state.anim ? 1 : 0;
    },
  };
}
