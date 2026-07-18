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
 * 本版本对应 git 短哈希（与打 tag 的 commit 一致）
 * 提交后若与真实 HEAD 不一致，应更新后 amend 再打 tag
 */
export const GIT_HASH = '67f68e5';

/** 界面版本名，如 v0.4.0.a1b2c3d */
export const VERSION_LABEL = `v${VERSION_NAME}.${GIT_HASH}`;

/** 将版本名写入页面上所有 [data-app-version] 节点 */
export function applyVersionToDom(root = document) {
  root.querySelectorAll('[data-app-version]').forEach((el) => {
    el.textContent = VERSION_LABEL;
    el.title = `build ${VERSION}`;
  });
}
