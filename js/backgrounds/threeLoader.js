/**
 * Three.js 多 CDN 回退动态加载（无 vendor / 无构建步骤）。
 *
 * 背景：用户设备拉取 jsdelivr 的 three 模块失败 → 左侧印象场景不显示且无可见提示。
 * 方案：顺序尝试 jsdelivr → unpkg → esm.sh，先可中止预检下载再 import，首个成功即固化；
 * 全部失败抛聚合错误，由 main.js 显示可重试占位并展示原因（无需控制台）。
 *
 * 既有代码 `THREE.Xxx` 写法零改动：静态 three 导入改为经 threeLoader 懒代理（setThree 后即生效）。
 */

const THREE_MIRRORS = [
  'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js',
  'https://unpkg.com/three@0.185.0/build/three.module.js',
  'https://esm.sh/three@0.185.0/build/three.module.js',
];

/** 当前已加载的 three 模块命名空间（未加载为 null） */
let _three = null;
/** 进行中的加载（并发调用复用同一份，避免求值出多个 Three 实例） */
let _loading = null;
const MIRROR_TIMEOUT_MS = 15000;

/** 固化加载结果（loadThreeModule 内部调用；测试可直接注入假模块） */
export function setThree(mod) {
  _three = mod;
}

export function getThree() {
  return _three;
}

/**
 * 懒解析代理：访问 THREE.Xxx 时实时从 getThree() 取，setThree 之后即生效。
 * 未加载时返回 undefined（既有代码在构造期才用，届时 loadThreeModule 已完成）。
 */
export const THREE = new Proxy({}, {
  get: (_t, k) => {
    const m = getThree();
    return m ? m[k] : undefined;
  },
});

/** 供测试：镜像列表（顺序即回退顺序） */
export function threeMirrors() {
  return THREE_MIRRORS.slice();
}

/**
 * 模块源码里的相对依赖（如 three.module.js → './three.core.js'）。
 * 用于预检下载，避免只预检主文件却漏掉兄弟文件；导出仅供测试。
 * @param {string} src
 * @param {string} baseUrl
 */
export function relativeModuleDeps(src, baseUrl) {
  const deps = new Set();
  for (const m of src.matchAll(/\bfrom\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
    try { deps.add(new URL(m[1], baseUrl).href); } catch (err) { /* ignore bad specifier */ }
  }
  return [...deps];
}

/** 递归下载模块与其相对依赖（可中止）；网络失败直接抛，不进入 import。 */
async function preflightModule(url, signal) {
  const seen = new Set();
  const queue = [url];
  while (queue.length) {
    const target = queue.shift();
    if (seen.has(target)) continue;
    seen.add(target);
    const res = await fetch(target, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    for (const dep of relativeModuleDeps(text, target)) {
      if (!seen.has(dep)) queue.push(dep);
    }
  }
}

/**
 * 先在可中止窗口内预检下载模块（含相对依赖），再直接 import(url)。
 * 直接 import 本身无法超时取消，被放弃的 import 仍会在后台求值 → 慢网下
 * 同时驻留多份 Three（实机日志出现过 Multiple instances of Three.js 警告）。
 * 预检成功后 import 只命中 HTTP 缓存做求值，不再有“超时后仍在跑”的加载。
 */
async function importModule(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    await preflightModule(url, controller.signal);
  } finally {
    clearTimeout(timer);
  }
  return import(url);
}

/**
 * 依次尝试各镜像，首个成功即 setThree 并返回模块；
 * 已加载/加载中时直接复用，失败后才允许重试（重试按钮）。
 * 全部失败抛 Error，message 聚合各镜像原因（便于用户回报区分网络/WebGL）。
 */
export async function loadThreeModule() {
  if (_three) return _three;
  if (_loading) return _loading;
  _loading = (async () => {
    const errors = [];
    for (const url of THREE_MIRRORS) {
      try {
        const mod = await importModule(url, MIRROR_TIMEOUT_MS);
        setThree(mod);
        return mod;
      } catch (err) {
        errors.push(`${url}: ${String(err?.message || err)}`);
      }
    }
    throw new Error(`three load failed: ${errors.join(' | ')}`);
  })();
  try {
    return await _loading;
  } finally {
    if (!_three) _loading = null; // 全部失败：清掉进行中缓存，允许重试
  }
}
