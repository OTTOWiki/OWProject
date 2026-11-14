import {
  DEFAULT_KEYS, DEFAULT_SETTINGS, STORAGE_KEYS,
  PLAYER_BULLET_OPACITY_MIN, FPS_LIMIT_MIN, FPS_LIMIT_CAP, FPS_SLIDER_UNLIMITED,
} from './config.js';

/**
 * localStorage JSON 读取：缺失/坏 JSON 返回 undefined；合法 JSON 原样返回（含 null）。
 * 各 loader 只保留自己的 shape 校验，不再重复 try/catch。
 */
export function parseStored(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** 写失败订阅者（main.js 用来显示非阻塞提示） */
const storageErrorListeners = new Set();

/**
 * 订阅本地存储写失败；返回取消函数。
 * 回调参数为出错的 storage key。
 * @param {(key: string) => void} fn
 * @returns {() => void}
 */
export function onStorageError(fn) {
  if (typeof fn !== 'function') return () => {};
  storageErrorListeners.add(fn);
  return () => storageErrorListeners.delete(fn);
}

function notifyStorageError(key) {
  for (const fn of storageErrorListeners) {
    try {
      fn(key);
    } catch (err) {
      console.warn('[storage] error listener failed:', err);
    }
  }
}

/**
 * localStorage 写入：失败（隐私模式 / 配额满）不抛出，返回 false 并通知订阅者。
 * @param {string} key
 * @param {string} raw 已序列化的值
 * @returns {boolean}
 */
export function writeStored(key, raw) {
  try {
    localStorage.setItem(key, raw);
    return true;
  } catch {
    notifyStorageError(key);
    return false;
  }
}

/**
 * localStorage 删除：失败不抛出，返回 false 并通知订阅者。
 * @param {string} key
 * @returns {boolean}
 */
export function removeStored(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    notifyStorageError(key);
    return false;
  }
}

/** 关键键备份后缀：写主键前把上一份内容放到 `<key>_bak` */
const BACKUP_SUFFIX = '_bak';

function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * 写入关键键：先把上一份主键内容写 `<key>_bak`，再覆盖主键。
 * 主键写坏/被截断时，读路径可回落上一份完整快照。
 */
function writeWithBackup(key, raw) {
  const prev = readRaw(key);
  if (prev != null) writeStored(key + BACKUP_SUFFIX, prev);
  return writeStored(key, raw);
}

export function loadKeys() {
  const parsed = parseStored(STORAGE_KEYS.keys);
  if (parsed == null) return { ...DEFAULT_KEYS };
  return { ...DEFAULT_KEYS, ...parsed };
}

export function saveKeys(keys) {
  return writeStored(STORAGE_KEYS.keys, JSON.stringify(keys));
}

function clamp01(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

/** 自机子弹不透明度：默认 30%，硬下限 10% */
function clampBulletOpacity(v, fallback = DEFAULT_SETTINGS.playerBulletOpacity) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(PLAYER_BULLET_OPACITY_MIN, Math.min(1, n));
}

/**
 * 描画帧率上限：0 = 无限制；有限时钳制到 24–240
 * （逻辑固定 60fps，与此项无关）
 */
export function normalizeFpsLimit(v, fallback = DEFAULT_SETTINGS.fpsLimit) {
  if (v == null || v === '' || v === 'unlimited') return 0;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(FPS_LIMIT_MIN, Math.min(FPS_LIMIT_CAP, n));
}

/** 设置值 → 滑条 DOM 值（无限制 = FPS_SLIDER_UNLIMITED） */
export function fpsLimitToSlider(fpsLimit) {
  const n = normalizeFpsLimit(fpsLimit, 0);
  return n <= 0 ? FPS_SLIDER_UNLIMITED : n;
}

/** 滑条 DOM 值 → 设置值（最右 = 0 无限制） */
export function sliderToFpsLimit(sliderVal) {
  const n = Math.round(Number(sliderVal));
  if (!Number.isFinite(n) || n >= FPS_SLIDER_UNLIMITED) return 0;
  if (n <= 0) return 0;
  return Math.max(FPS_LIMIT_MIN, Math.min(FPS_LIMIT_CAP, n));
}

export function loadSettings() {
  const parsed = parseStored(STORAGE_KEYS.settings);
  if (parsed == null) return { ...DEFAULT_SETTINGS };
  return {
    musicVolume: clamp01(parsed.musicVolume, DEFAULT_SETTINGS.musicVolume),
    playerBulletOpacity: clampBulletOpacity(
      parsed.playerBulletOpacity,
      DEFAULT_SETTINGS.playerBulletOpacity,
    ),
    shotToggle: !!parsed.shotToggle,
    mobileSpeedLimit: parsed.mobileSpeedLimit !== false,
    fpsLimit: normalizeFpsLimit(parsed.fpsLimit, DEFAULT_SETTINGS.fpsLimit),
  };
}

export function saveSettings(settings) {
  const next = {
    musicVolume: clamp01(settings.musicVolume, DEFAULT_SETTINGS.musicVolume),
    playerBulletOpacity: clampBulletOpacity(
      settings.playerBulletOpacity,
      DEFAULT_SETTINGS.playerBulletOpacity,
    ),
    shotToggle: !!settings.shotToggle,
    mobileSpeedLimit: settings.mobileSpeedLimit !== false,
    fpsLimit: normalizeFpsLimit(settings.fpsLimit, DEFAULT_SETTINGS.fpsLimit),
  };
  writeStored(STORAGE_KEYS.settings, JSON.stringify(next));
  return next;
}

export function loadHiscore() {
  try {
    return Number(localStorage.getItem(STORAGE_KEYS.hiscore) || 0) || 0;
  } catch {
    return 0;
  }
}

export function saveHiscore(score) {
  const cur = loadHiscore();
  if (score > cur) {
    return writeStored(STORAGE_KEYS.hiscore, String(Math.floor(score)));
  }
  return false;
}

/** 进度记录（Stage Select 不门禁；见 AGENTS.md）。损坏数据时回落默认 */
export function loadUnlocked() {
  const fallback = { stage: 1, routes: { A: false, B: false } };
  for (const key of [STORAGE_KEYS.unlocked, STORAGE_KEYS.unlocked + BACKUP_SUFFIX]) {
    const u = parseStored(key);
    if (u == null || typeof u !== 'object') continue;
    const stage = Number(u.stage);
    if (!Number.isFinite(stage) || stage < 1) continue;
    const routes = u.routes && typeof u.routes === 'object' ? u.routes : {};
    return {
      stage,
      routes: { A: !!routes.A, B: !!routes.B },
    };
  }
  return { ...fallback, routes: { ...fallback.routes } };
}

export function unlockStage(stage) {
  const u = loadUnlocked();
  if (stage > u.stage) {
    u.stage = stage;
    return writeWithBackup(STORAGE_KEYS.unlocked, JSON.stringify(u));
  }
  return false;
}

export function unlockRoute(route) {
  const u = loadUnlocked();
  if (route === 'A' || route === 'B') u.routes[route] = true;
  if (u.stage < 4) u.stage = 4;
  return writeWithBackup(STORAGE_KEYS.unlocked, JSON.stringify(u));
}

/** 练习模式上次选择（章节 id + 难度）；损坏/缺失回落 null */
export function loadPracticePrefs() {
  const p = parseStored(STORAGE_KEYS.practice);
  if (!p || !Number.isInteger(p.chapter)) return null;
  return {
    chapter: p.chapter,
    diff: typeof p.diff === 'string' ? p.diff : null,
  };
}

export function savePracticePrefs(prefs) {
  return writeStored(STORAGE_KEYS.practice, JSON.stringify({
    chapter: Number(prefs.chapter),
    diff: prefs.diff || null,
  }));
}

/**
 * Nomiss 模式章节进度（存 { nextChapterId }）；无/坏数据返回 null。
 * @returns {number|null} 下一章 id（正整数），无进度时 null
 */
export function loadNomissProgress() {
  for (const key of [STORAGE_KEYS.nomissProgress, STORAGE_KEYS.nomissProgress + BACKUP_SUFFIX]) {
    const p = parseStored(key);
    const id = Number(p?.nextChapterId);
    if (Number.isInteger(id) && id > 0) return id;
  }
  return null;
}

/**
 * Nomiss 模式章节进度：id 为正整数 → 存 { nextChapterId: id }；
 * id 为 null/undefined → 清除（通关后从头开始）。
 */
export function saveNomissProgress(id) {
  if (id == null) {
    // 清除进度时连备份一起删，避免读路径把旧进度复活
    removeStored(STORAGE_KEYS.nomissProgress + BACKUP_SUFFIX);
    return removeStored(STORAGE_KEYS.nomissProgress);
  }
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return false; // 非法值丢弃，不动旧进度
  return writeWithBackup(STORAGE_KEYS.nomissProgress, JSON.stringify({ nextChapterId: n }));
}

/**
 * Letter 卡收取记录（{ [chapterId]: { tries, captures } }）
 * 实战与练习共用一份；回放不计数。损坏数据丢弃，解析失败返回 {}。
 */
export function loadLetterRate() {
  const parsed = parseStored(STORAGE_KEYS.letterRate);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const out = {};
  for (const key of Object.keys(parsed)) {
    if (!/^\d+$/.test(key)) continue; // chapterId 须为数字字符串键
    const entry = parsed[key];
    if (!entry || typeof entry !== 'object') continue;
    const { tries, captures } = entry;
    if (!Number.isInteger(tries) || tries < 0) continue;
    if (!Number.isInteger(captures) || captures < 0) continue;
    if (captures > tries) continue; // 丢弃不合法的 captures > tries 项
    out[key] = { tries, captures };
  }
  return out;
}

export function recordLetterTry(chapterId) {
  const rate = loadLetterRate();
  const id = String(chapterId);
  const cur = rate[id] || { tries: 0, captures: 0 };
  rate[id] = { tries: cur.tries + 1, captures: cur.captures };
  return writeStored(STORAGE_KEYS.letterRate, JSON.stringify(rate));
}

export function recordLetterCapture(chapterId) {
  const rate = loadLetterRate();
  const id = String(chapterId);
  const cur = rate[id] || { tries: 0, captures: 0 };
  // 确保 captures 不超过 tries；无记录时成功收取意味至少尝试过 1 次
  const newCaptures = cur.captures + 1;
  const newTries = Math.max(cur.tries, newCaptures);
  rate[id] = { tries: newTries, captures: newCaptures };
  return writeStored(STORAGE_KEYS.letterRate, JSON.stringify(rate));
}

/** Letter 收取率文案；无记录时显示占位 */
export function letterRateText(tries, captures) {
  if (!(tries > 0)) return '暂无收取记录';
  return `成功 ${captures} / 尝试 ${tries} = ${Math.round((captures / tries) * 100)}%`;
}

/**
 * 练习模式各章最佳：{ [chapterId]: { [diffId]: { score, perfect, date } } }
 * 校验：chapterId 数字、diffId 字符串、score 有限数字、perfect 布尔；坏数据丢弃，解析失败返回 {}。
 */
export function loadPracticeBest() {
  const parsed = parseStored(STORAGE_KEYS.practiceBest);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const out = {};
  for (const [chKey, diffs] of Object.entries(parsed)) {
    const chapterId = Number(chKey);
    if (!Number.isInteger(chapterId)) continue;
    if (!diffs || typeof diffs !== 'object' || Array.isArray(diffs)) continue;
    const diffMap = {};
    for (const [diffId, rec] of Object.entries(diffs)) {
      if (typeof diffId !== 'string' || !rec || typeof rec !== 'object') continue;
      const score = Number(rec.score);
      if (!Number.isFinite(score)) continue;
      if (typeof rec.perfect !== 'boolean') continue;
      diffMap[diffId] = {
        score: Math.floor(score),
        perfect: rec.perfect,
        date: Number.isFinite(Number(rec.date)) ? Number(rec.date) : Date.now(),
      };
    }
    if (Object.keys(diffMap).length) out[chapterId] = diffMap;
  }
  return out;
}

/** 写练习各章最佳（覆盖同章同难度）；异常静默 */
export function savePracticeBest(chapterId, diffId, { score, perfect }) {
  const cid = Number(chapterId);
  if (!Number.isInteger(cid)) return false;
  const best = loadPracticeBest();
  const map = best[cid] || (best[cid] = {});
  const newScore = Math.floor(Number(score) || 0);
  const existing = map[diffId];
  if (existing) {
    if (newScore > existing.score) {
      map[diffId] = {
        score: newScore,
        perfect: !!perfect,
        date: Date.now(),
      };
    } else if (newScore === existing.score) {
      existing.perfect = existing.perfect || !!perfect;
    }
  } else {
    map[diffId] = {
      score: newScore,
      perfect: !!perfect,
      date: Date.now(),
    };
  }
  return writeStored(STORAGE_KEYS.practiceBest, JSON.stringify(best));
}
