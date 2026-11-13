/**
 * 章节展示标签的纯函数（不从 DOM 读取）。
 * 与章标题 banner / 结算条显示的 `Stage N` 文本同源。
 */

/**
 * @param {{ stage?: number|string }|null|undefined} ch
 * @returns {string}
 */
export function chapterStageLabel(ch) {
  if (!ch) return '';
  const s = ch.stage;
  if (typeof s === 'number') return `Stage ${s}`;
  if (s == null) return '';
  return String(s);
}
