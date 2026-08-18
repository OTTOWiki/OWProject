/**
 * 本地排行榜：纯函数 + localStorage 持久化。
 * 结构：{ [difficultyId]: [entry...] }，每榜按 score 降序、最多 RANKING_LIMIT 条。
 * 与录像完全独立（排行榜不引用 replayId）。
 */
import { STORAGE_KEYS, RANKING_LIMIT } from './config.js';

const MAX_NAME_CHARS = 3;

function clean(s) {
  return Array.from(String(s ?? ''))
    .filter((c) => c.charCodeAt(0) >= 0x20 && c.charCodeAt(0) !== 0x7f)
    .join('')
    .trim();
}

/** 昵称归一化：去控制字符、截断 3 字；空则回落 fallback，再空回落 'PLAYER'。 */
export function normalizeName(name, fallback = '') {
  const n = clean(name);
  if (n) return Array.from(n).slice(0, MAX_NAME_CHARS).join('');
  const f = clean(fallback);
  if (f) return Array.from(f).slice(0, MAX_NAME_CHARS).join('');
  return 'PLAYER';
}

export function loadRanking() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ranking);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveRanking(ranking) {
  try {
    localStorage.setItem(STORAGE_KEYS.ranking, JSON.stringify(ranking));
  } catch { /* 忽略配额/私密模式 */ }
}

/** 该分数是否能进入该难度榜（不足 10 条或高于末位） */
export function qualifies(list, score) {
  if (!Array.isArray(list) || list.length < RANKING_LIMIT) return true;
  return score > (list[list.length - 1]?.score ?? -Infinity);
}

/** 该分数在榜单中的 0-based 名次；不入榜返回 -1 */
export function rankFor(list, score) {
  const arr = Array.isArray(list) ? list : [];
  const last = arr.length ? arr[arr.length - 1].score : -Infinity;
  if (arr.length >= RANKING_LIMIT && score <= last) return -1;
  let pos = 0;
  for (const e of arr) if (e.score > score) pos++;
  return pos;
}

/**
 * 提交条目：插入 → score 降序（同分 date 更早在前）→ 截断 RANKING_LIMIT。
 * 就地修改 ranking；返回 entry 的名次（0-based），未入榜返回 -1。
 */
export function submitEntry(ranking, difficultyId, entry) {
  const list = Array.isArray(ranking[difficultyId]) ? ranking[difficultyId].slice() : [];
  list.push(entry);
  list.sort((a, b) => b.score - a.score || a.date - b.date);
  const trimmed = list.slice(0, RANKING_LIMIT);
  ranking[difficultyId] = trimmed;
  return trimmed.indexOf(entry);
}

/** 上次使用的 3 字昵称（默认回落自机名前 3 字） */
export function loadName(fallbackName) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.rankingName);
    return normalizeName(raw, fallbackName);
  } catch {
    return normalizeName('', fallbackName);
  }
}

/** 保存昵称；空则清除（下次回落自机名） */
export function saveName(name) {
  const n = clean(name);
  try {
    if (n) localStorage.setItem(STORAGE_KEYS.rankingName, normalizeName(n));
    else localStorage.removeItem(STORAGE_KEYS.rankingName);
  } catch { /* 忽略 */ }
}

/**
 * 结算界面「保存」入榜：填入昵称并写盘。
 * @param {{qualifies:boolean, difficultyId:string, entry:object}} result 即 game._rankingResult
 * @param {string} name 玩家输入的昵称
 * @returns {number} 最终名次（0-based），未入榜 -1
 */
export function commitRankingEntry(result, name) {
  if (!result || !result.qualifies || !result.entry) return -1;
  const entry = { ...result.entry, name: normalizeName(name, result.entry.playerName) };
  const ranking = loadRanking();
  const idx = submitEntry(ranking, result.difficultyId, entry);
  saveRanking(ranking);
  saveName(entry.name);
  result.entry = entry;
  result.rank = idx;
  return idx;
}
