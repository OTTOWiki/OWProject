/**
 * 版本约定
 * - VERSION：纯自然数构建号（每次人工提交前 +1；CI stamp 不 +1）
 * - VERSION_NAME：营销/展示用 x.y.z（如 0.4.0）
 * - GIT_HASH：短哈希；文件里为空则界面不显示 hash 段；有值才拼到版本名
 * - VERSION_LABEL：有合法 hash → `v{NAME}.{hash}`，否则 `v{NAME}`
 *
 * CI：Test 成功后由 stamp-version.yml 写入「被测内容提交」短哈希（见 AGENTS.md）
 */
export const VERSION = 67;

/** 展示用语义版本段（无 v 前缀），如 0.4.0 */
export const VERSION_NAME = '0.4.0';

/**
 * 短哈希。空字符串 = 本地/未 stamp，界面不显示 hash 段。
 * 勿手写自指 tip（文件进 tree 会改哈希）；交给 CI 写入触发提交的 short SHA。
 */
export const GIT_HASH = '';

/** 规范化：仅保留可展示的短哈希 */
export function normalizeGitHash(h) {
  if (h == null) return '';
  const s = String(h).trim();
  if (!s) return '';
  // 7–40 位十六进制
  if (!/^[0-9a-f]{7,40}$/i.test(s)) return '';
  return s.slice(0, 7).toLowerCase();
}

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

/** 界面版本名，如 v0.4.0 或 v0.4.0.a1b2c3d */
export const VERSION_LABEL = formatVersionLabel(VERSION_NAME, GIT_HASH);

/** 将版本名写入页面上所有 [data-app-version] 节点 */
export function applyVersionToDom(root = document) {
  root.querySelectorAll('[data-app-version]').forEach((el) => {
    el.textContent = VERSION_LABEL;
    el.title = normalizeGitHash(GIT_HASH)
      ? `build ${VERSION} · ${normalizeGitHash(GIT_HASH)}`
      : `build ${VERSION}`;
  });
}
