/**
 * 东方风格美术资源（原创立绘，非 Team Shanghai Alice 官方素材）
 *
 * 立绘策略（T18）：
 * - PORTRAIT_PATHS：仅登记**已有真实立绘**的说话人；未登记 → 对话不显示立绘（隐藏，不借图）
 * - PORTRAIT_HIDDEN_OK：明确「无立绘也正常」的说话人（系统/旁白/尚无美术的 Boss 等）
 * - 禁止把 A 角色的路径挂到 B 角色名下（缺图就缺，别顶替）
 */

/** 已有立绘文件的说话人 → 路径 */
export const PORTRAIT_PATHS = {
  饮泉思源: 'assets/portraits/yinquan.avif',
  誓约沙玛: 'assets/portraits/shama.avif',
  爱丽丝: 'assets/portraits/alice.avif',
  Icebin: 'assets/portraits/icebin.avif',
  '大宗关不是·互然雏': 'assets/portraits/dazong.avif',
  大宗关: 'assets/portraits/dazong.avif',
  '全域巡查姬·404': 'assets/portraits/patrol.avif',
  巡查姬: 'assets/portraits/patrol.avif',
};

/**
 * 允许无立绘的说话人（对话时隐藏 portrait，不算遗漏）
 * 新增角色对话时：有图 → 进 PORTRAIT_PATHS；暂无图 → 进本表，勿借他人立绘
 */
export const PORTRAIT_HIDDEN_OK = new Set([
  '系统',
  '旁白',
  '门百梁',
  '一美个',
  '赌人时尚',
  '棍电噢哆',
  '拉斯特神炫',
  'van♂',
  'van♂分身',
  'blkf姉貴',
  '壹隻憂鬱臺灣烏龜blkf',
  '骯髒變態囓齒blkf兄',
  '尋釁兄貴',
]);

const IMG_CACHE = new Map();

export function loadImage(src) {
  if (IMG_CACHE.has(src)) return IMG_CACHE.get(src);
  const img = new Image();
  img.src = src;
  IMG_CACHE.set(src, img);
  return img;
}

export function preloadArtAssets() {
  const list = [
    ...new Set(Object.values(PORTRAIT_PATHS)),
    'assets/ui/title_banner.avif',
  ];
  return Promise.all(list.map((src) => new Promise((resolve) => {
    const img = loadImage(src);
    if (img.complete && img.naturalWidth) resolve(img);
    else {
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    }
  })));
}

/**
 * @param {string} name 对话说话人
 * @returns {string|null} 立绘路径；无则 null（UI 应隐藏图）
 */
export function portraitFor(name) {
  if (!name) return null;
  return PORTRAIT_PATHS[name] || null;
}

/** 是否已登记立绘（与 portraitFor 真值一致，便于测试） */
export function hasPortrait(name) {
  return Object.prototype.hasOwnProperty.call(PORTRAIT_PATHS, name);
}

/**
 * 说话人是否在「可无立绘」白名单或已有立绘
 * @param {string} name
 */
export function isPortraitPolicyOk(name) {
  if (!name) return true;
  return hasPortrait(name) || PORTRAIT_HIDDEN_OK.has(name);
}

export function getTitleBanner() {
  return loadImage('assets/ui/title_banner.avif');
}

export function getAssetPaths() {
  return [
    ...new Set(Object.values(PORTRAIT_PATHS)),
    'assets/ui/title_banner.avif',
  ];
}
