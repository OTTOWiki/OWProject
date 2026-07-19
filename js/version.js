/**
 * 版本约定
 * - VERSION：纯自然数构建号（pre-commit 每次提交自动 +1，勿手改）
 * - VERSION_NAME：展示用 x.y.z（如 0.4.1）
 * - GIT_HASH：来自 js/git-hash.js（仓库为空；CF 部署构建时注入短哈希）
 * - VERSION_LABEL：有合法 hash → `v{NAME}.{hash}`，否则 `v{NAME}`
 *
 * 见 AGENTS.md「版本号与发版流程」与 tools/inject-deploy-hash.mjs
 */
import { DEPLOY_GIT_HASH } from './git-hash.js';

export const VERSION = 74;

/** 展示用语义版本段（无 v 前缀），如 0.4.1 */
export const VERSION_NAME = '0.4.1';

/** 规范化：仅保留可展示的短哈希 */
export function normalizeGitHash(h) {
  if (h == null) return '';
  const s = String(h).trim();
  if (!s) return '';
  if (!/^[0-9a-f]{7,40}$/i.test(s)) return '';
  return s.slice(0, 7).toLowerCase();
}

/**
 * 当前有效短哈希（空 = 不显示 hash 段）
 * 仓库内 git-hash.js 恒为空；CF Pages 构建注入后有值
 */
export const GIT_HASH = normalizeGitHash(DEPLOY_GIT_HASH);

/**
 * 组装版本名
 * @param {string} [name]
 * @param {string} [hash]
 */
export function formatVersionLabel(name = VERSION_NAME, hash = GIT_HASH) {
  const n = name || '0.0.0';
  const h = normalizeGitHash(hash);
  return h ? `v${n}.${h}` : `v${n}`;
}

/** 界面版本名，如 v0.4.1 或 v0.4.1.a1b2c3d */
export const VERSION_LABEL = formatVersionLabel(VERSION_NAME, GIT_HASH);

/** 将版本名写入页面上所有 [data-app-version] 节点 */
export function applyVersionToDom(root = document) {
  // 悬停 title：版本名 + 构建号（VERSION_LABEL 在有部署 hash 时已含短哈希）
  const tip = `${VERSION_LABEL} · build ${VERSION}`;
  root.querySelectorAll('[data-app-version]').forEach((el) => {
    el.textContent = VERSION_LABEL;
    el.title = tip;
    el.setAttribute('aria-label', tip);
  });
}
