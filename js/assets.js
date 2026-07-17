/**
 * 东方风格美术资源（原创立绘，非 Team Shanghai Alice 官方素材）
 */

export const PORTRAIT_PATHS = {
  饮泉思源: 'assets/portraits/yinquan.jpg',
  誓约沙玛: 'assets/portraits/shama.jpg',
  爱丽丝: 'assets/portraits/alice.jpg',
  Icebin: 'assets/portraits/icebin.jpg',
  '大宗关不是·互然雏': 'assets/portraits/dazong.jpg',
  大宗关: 'assets/portraits/dazong.jpg',
  '全域巡查姬·404': 'assets/portraits/patrol.jpg',
  巡查姬: 'assets/portraits/patrol.jpg',
};

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
    'assets/ui/title_banner.jpg',
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

/** @returns {string|null} 立绘路径 */
export function portraitFor(name) {
  return PORTRAIT_PATHS[name] || null;
}

export function getTitleBanner() {
  return loadImage('assets/ui/title_banner.jpg');
}

export function getAssetPaths() {
  return [
    ...new Set(Object.values(PORTRAIT_PATHS)),
    'assets/ui/title_banner.jpg',
  ];
}
