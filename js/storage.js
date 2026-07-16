import { DEFAULT_KEYS, STORAGE_KEYS } from './config.js';

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
