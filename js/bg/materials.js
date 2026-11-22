/**
 * 背景素材注册与染色缓存。
 *
 * 两类素材：
 * - tile：不透明可平铺底纹（金箔/和纸/墨晕），运行时以 multiply 染色；
 * - 透明 strip：灰度 + alpha 的剪影/雾/云/浪/枝，染色保留 alpha 形状。
 *
 * 素材文件由 tools/bg-assets/build-assets.sh 处理并记录来源（assets/NOTICE.md）。
 * 设计说明：docs/level-background-redesign.md §5。
 */

/** @type {Record<string, {path: string, tile: boolean}>} */
export const MATERIALS = {
  gold: { path: 'assets/bg/mat/gold.avif', tile: true },
  washi: { path: 'assets/bg/mat/washi.avif', tile: true },
  ink: { path: 'assets/bg/mat/ink.avif', tile: true },
  wave: { path: 'assets/bg/mat/wave.avif', tile: false },
  mist: { path: 'assets/bg/mat/mist.avif', tile: false },
  cloud: { path: 'assets/bg/mat/cloud.avif', tile: false },
  grass: { path: 'assets/bg/mat/grass.avif', tile: false },
  plum: { path: 'assets/bg/mat/plum.avif', tile: false },
};

export const MATERIAL_NAMES = Object.keys(MATERIALS);

/** @type {Map<string, {img: HTMLImageElement|null, promise: Promise<HTMLImageElement|null>|null}>} */
const states = new Map();
/** @type {Map<string, HTMLCanvasElement>} */
const tintCache = new Map();
const TINT_CACHE_MAX = 96;

function canUseDom() {
  return typeof document !== 'undefined' && typeof Image !== 'undefined';
}

/**
 * 载入单张素材；失败 resolve null（不抛）。
 * @param {string} name
 * @returns {Promise<HTMLImageElement|null>}
 */
export function loadMaterial(name) {
  const meta = MATERIALS[name];
  if (!meta) return Promise.resolve(null);
  let st = states.get(name);
  if (st) return st.promise;
  st = { img: null, promise: null };
  if (!canUseDom()) {
    st.promise = Promise.resolve(null);
    states.set(name, st);
    return st.promise;
  }
  st.promise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      st.img = img;
      resolve(img);
    };
    img.onerror = () => {
      st.img = null;
      resolve(null);
    };
    img.src = meta.path;
  });
  states.set(name, st);
  return st.promise;
}

/** 预载全部素材（启动期，小文件） */
export function preloadMaterials() {
  return Promise.all(MATERIAL_NAMES.map((n) => loadMaterial(n)));
}

/** 同步取已就绪素材；未就绪返回 null（原子必须容忍 null） */
export function getMaterialImage(name) {
  return states.get(name)?.img || null;
}

/** 清空染色缓存（场景切换/释放时调用） */
export function clearMaterialTintCache() {
  tintCache.clear();
}

/**
 * 取染色后的素材。
 * - tile：不透明底纹填色后 multiply 原图（保留纹理）；
 * - strip：先填色再 multiply 灰度原图，透明区保持透明（保留 alpha 形状）。
 * 结果按 name|color|alpha 缓存，返回 canvas；素材未就绪返回 null。
 *
 * @param {string} name
 * @param {string} color CSS 颜色
 * @param {number} [alpha]
 * @returns {HTMLCanvasElement|null}
 */
export function getTintedMaterial(name, color, alpha = 1) {
  const img = getMaterialImage(name);
  if (!img || !canUseDom() || typeof color !== 'string') return null;
  const key = `${name}|${color}|${alpha}`;
  const hit = tintCache.get(key);
  if (hit) return hit;
  if (tintCache.size >= TINT_CACHE_MAX) tintCache.clear();
  const w = Math.max(1, img.naturalWidth || img.width);
  const h = Math.max(1, img.naturalHeight || img.height);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'multiply';
  g.globalAlpha = Math.max(0, Math.min(1, alpha));
  g.drawImage(img, 0, 0, w, h);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  tintCache.set(key, c);
  return c;
}
