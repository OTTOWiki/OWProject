import { DEFAULT_KEYS, DEFAULT_SETTINGS, STORAGE_KEYS } from './config.js';

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

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      musicVolume: clamp01(parsed.musicVolume, DEFAULT_SETTINGS.musicVolume),
      playerBulletOpacity: clamp01(parsed.playerBulletOpacity, DEFAULT_SETTINGS.playerBulletOpacity),
      shotToggle: !!parsed.shotToggle,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  const next = {
    musicVolume: clamp01(settings.musicVolume, DEFAULT_SETTINGS.musicVolume),
    playerBulletOpacity: clamp01(settings.playerBulletOpacity, DEFAULT_SETTINGS.playerBulletOpacity),
    shotToggle: !!settings.shotToggle,
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

export function loadUnlocked() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.unlocked);
    if (!raw) return { stage: 1, routes: { A: false, B: false } };
    return JSON.parse(raw);
  } catch {
    return { stage: 1, routes: { A: false, B: false } };
  }
}

export function unlockStage(stage) {
  const u = loadUnlocked();
  if (stage > u.stage) {
    u.stage = stage;
    localStorage.setItem(STORAGE_KEYS.unlocked, JSON.stringify(u));
  }
}

export function unlockRoute(route) {
  const u = loadUnlocked();
  u.routes[route] = true;
  if (u.stage < 4) u.stage = 4;
  localStorage.setItem(STORAGE_KEYS.unlocked, JSON.stringify(u));
}
