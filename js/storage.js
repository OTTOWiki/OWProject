import {
  DEFAULT_KEYS, DEFAULT_SETTINGS, STORAGE_KEYS,
  PLAYER_BULLET_OPACITY_MIN, FPS_LIMIT_MIN, FPS_LIMIT_CAP, FPS_SLIDER_UNLIMITED,
} from './config.js';

export function loadKeys() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.keys);
    if (!raw) return { ...DEFAULT_KEYS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_KEYS, ...parsed };
  } catch {
    return { ...DEFAULT_KEYS };
  }
}

export function saveKeys(keys) {
  localStorage.setItem(STORAGE_KEYS.keys, JSON.stringify(keys));
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
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      musicVolume: clamp01(parsed.musicVolume, DEFAULT_SETTINGS.musicVolume),
      playerBulletOpacity: clampBulletOpacity(
        parsed.playerBulletOpacity,
        DEFAULT_SETTINGS.playerBulletOpacity,
      ),
      shotToggle: !!parsed.shotToggle,
      fpsLimit: normalizeFpsLimit(parsed.fpsLimit, DEFAULT_SETTINGS.fpsLimit),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  const next = {
    musicVolume: clamp01(settings.musicVolume, DEFAULT_SETTINGS.musicVolume),
    playerBulletOpacity: clampBulletOpacity(
      settings.playerBulletOpacity,
      DEFAULT_SETTINGS.playerBulletOpacity,
    ),
    shotToggle: !!settings.shotToggle,
    fpsLimit: normalizeFpsLimit(settings.fpsLimit, DEFAULT_SETTINGS.fpsLimit),
  };
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(next));
  return next;
}

export function loadHiscore() {
  return Number(localStorage.getItem(STORAGE_KEYS.hiscore) || 0) || 0;
}

export function saveHiscore(score) {
  const cur = loadHiscore();
  if (score > cur) {
    localStorage.setItem(STORAGE_KEYS.hiscore, String(Math.floor(score)));
    return true;
  }
  return false;
}

/** 进度记录（Stage Select 不门禁；见 AGENTS.md）。损坏数据时回落默认 */
export function loadUnlocked() {
  const fallback = { stage: 1, routes: { A: false, B: false } };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.unlocked);
    if (!raw) return { ...fallback, routes: { ...fallback.routes } };
    const u = JSON.parse(raw);
    const stage = Number(u?.stage);
    const routes = u?.routes && typeof u.routes === 'object' ? u.routes : {};
    return {
      stage: Number.isFinite(stage) && stage >= 1 ? stage : 1,
      routes: {
        A: !!routes.A,
        B: !!routes.B,
      },
    };
  } catch {
    return { ...fallback, routes: { ...fallback.routes } };
  }
}

export function unlockStage(stage) {
  try {
    const u = loadUnlocked();
    if (stage > u.stage) {
      u.stage = stage;
      localStorage.setItem(STORAGE_KEYS.unlocked, JSON.stringify(u));
    }
  } catch { /* ignore quota / private mode */ }
}

export function unlockRoute(route) {
  try {
    const u = loadUnlocked();
    if (route === 'A' || route === 'B') u.routes[route] = true;
    if (u.stage < 4) u.stage = 4;
    localStorage.setItem(STORAGE_KEYS.unlocked, JSON.stringify(u));
  } catch { /* ignore quota / private mode */ }
}

/** 练习模式上次选择（章节 id + 难度）；损坏/缺失回落 null */
export function loadPracticePrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.practice);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || !Number.isInteger(p.chapter)) return null;
    return {
      chapter: p.chapter,
      diff: typeof p.diff === 'string' ? p.diff : null,
    };
  } catch {
    return null;
  }
}

export function savePracticePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEYS.practice, JSON.stringify({
      chapter: Number(prefs.chapter),
      diff: prefs.diff || null,
    }));
  } catch { /* ignore quota / private mode */ }
}
