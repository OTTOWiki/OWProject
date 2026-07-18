/**
 * 版本约定
 * - VERSION：纯自然数构建号（每次提交前 +1）
 * - VERSION_NAME：营销/展示用 x.y.z（如 0.4.0）
 * - GIT_HASH：该版本对应提交的短哈希
 * - VERSION_LABEL：界面版本名 = `v` + VERSION_NAME + `.` + GIT_HASH
 *
 * 发版：升 VERSION_NAME（若需要）→ 提交前 VERSION++ → 提交 → 写入本 commit 短哈希
 * → 必要时 amend 对齐哈希 → tag 可用 vX.Y.Z 或完整 VERSION_LABEL
 */
export const VERSION = 65;

/** 展示用语义版本段（无 v 前缀），如 0.4.0 */
export const VERSION_NAME = '0.4.0';

/**
 * 本版本主变更提交的短哈希（写入 version.js 会改变 tip 哈希，故无法与「含本文件的 tip」自指）
 * 发版：内容提交后 → 将此处改为该内容提交短哈希 → 再提交一次 stamp（VERSION 可同号）
 */
export const GIT_HASH = '6dd5497';

/** 界面版本名，如 v0.4.0.a1b2c3d */
export const VERSION_LABEL = `v${VERSION_NAME}.${GIT_HASH}`;

/** 将版本名写入页面上所有 [data-app-version] 节点 */
export function applyVersionToDom(root = document) {
  root.querySelectorAll('[data-app-version]').forEach((el) => {
    el.textContent = VERSION_LABEL;
    el.title = `build ${VERSION}`;
  });
}
