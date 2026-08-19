/**
 * Three.js 多 CDN 回退动态加载（无 vendor / 无构建步骤）。
 *
 * 背景：用户设备拉取 jsdelivr 的 three 模块失败 → 左侧印象场景不显示且无可见提示。
 * 方案：顺序尝试 jsdelivr → unpkg → esm.sh，首个 import 成功即固化；
 * 全部失败抛聚合错误，由 main.js 显示可重试占位并展示原因（无需控制台）。
 *
 * 既有代码 `THREE.Xxx` 写法零改动：静态 `import * as THREE from 'three'`
 * 改为 `import { THREE } from './threeLoader.js'`（懒解析代理，setThree 后即生效）。
 */

const THREE_MIRRORS = [
  'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js',
  'https://unpkg.com/three@0.185.0/build/three.module.js',
  'https://esm.sh/three@0.185.0/build/three.module.js',
];

/** 当前已加载的 three 模块命名空间（未加载为 null） */
let _three = null;

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
 * 依次 import 各镜像，首个成功即 setThree 并返回模块；
 * 全部失败抛 Error，message 聚合各镜像原因（便于用户回报区分网络/WebGL）。
 */
export async function loadThreeModule() {
  const errors = [];
  for (const url of THREE_MIRRORS) {
    try {
      const mod = await import(url);
      setThree(mod);
      return mod;
    } catch (err) {
      errors.push(`${url}: ${String(err?.message || err)}`);
    }
  }
  throw new Error(`three load failed: ${errors.join(' | ')}`);
}
