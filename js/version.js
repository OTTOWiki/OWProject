/**
 * 应用版本号（与 git tag 对齐：v0.1.0 → VERSION = '0.1.0'）
 * 发版时：改此文件 → 提交 → git tag vX.Y.Z → push --tags
 */
export const VERSION = '0.2.1';

/** 界面显示用，如 v0.1.0 */
export const VERSION_LABEL = `v${VERSION}`;

/** 将版本号写入页面上所有 [data-app-version] 节点 */
export function applyVersionToDom(root = document) {
  root.querySelectorAll('[data-app-version]').forEach((el) => {
    el.textContent = VERSION_LABEL;
  });
}
