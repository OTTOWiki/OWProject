/**
 * 对局统计：纯格式化函数（不依赖 DOM / Game 实例）。
 * stats 结构见 Game.start()：{ graze, kills, bombs, deathbombs, misses, nmnb, items, maxCombo, time }
 */

/** 秒 → mm:ss（分钟补零），如 04:32；非法/负数按 0 处理 */
export function formatRunTime(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * stats → 展示行数组（<pre> 用，每行一条）。
 * 数值展示统一取整。
 * @param {object|null} stats
 * @returns {string[]}
 */
export function formatRunStats(stats) {
  const s = stats || {};
  const bombPart = (s.deathbombs > 0)
    ? `Bomb ${Math.round(s.bombs ?? 0)}（含决死 ${Math.round(s.deathbombs)}）`
    : `Bomb ${Math.round(s.bombs ?? 0)}`;
  return [
    `擦弹 ${Math.floor(s.graze ?? 0)} · 击破 ${Math.floor(s.kills ?? 0)} · 道具 ${Math.floor(s.items ?? 0)}`,
    `${bombPart} · Miss ${Math.round(s.misses ?? 0)} · NMNB ${Math.round(s.nmnb ?? 0)} 章`,
    `最大连击 ${Math.round(s.maxCombo ?? 0)} · 用时 ${formatRunTime(s.time)}`,
  ];
}
