/**
 * 录像存储：IndexedDB 存帧数据（体积大），localStorage 存轻量索引（列表屏用）。
 * 排行榜与录像完全独立，互不引用。
 */
import { STORAGE_KEYS } from './config.js';
import { parseStored } from './storage.js';

const DB_NAME = 'owproject-replays';
const STORE = 'replays';

function openDb() {
  return new Promise((resolve, reject) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, 1);
    } catch (e) {
      reject(e);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'replayId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    return await fn(store);
  } finally {
    db.close();
  }
}

export function loadReplayIndex() {
  const parsed = parseStored(STORAGE_KEYS.replayIndex);
  return Array.isArray(parsed) ? parsed : [];
}

function saveReplayIndex(list) {
  localStorage.setItem(STORAGE_KEYS.replayIndex, JSON.stringify(list));
}

/** 保存录像（帧数据入 IndexedDB + 索引入 localStorage）。返回索引 meta。 */
export async function saveReplay(replay) {
  await withStore('readwrite', (store) => new Promise((resolve, reject) => {
    const req = store.put(replay);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));

  const meta = {
    replayId: replay.replayId,
    date: replay.date,
    playerId: replay.playerId,
    difficultyId: replay.difficultyId,
    mode: replay.mode,
    route: replay.route,
    cleared: !!(replay.endState && replay.endState.cleared),
    score: (replay.endState && replay.endState.score) || 0,
    stageReached: (replay.endState && replay.endState.stageReached) || '',
    partial: !!replay.partial,
  };
  const list = loadReplayIndex().filter((it) => it.replayId !== meta.replayId);
  list.push(meta);
  list.sort((a, b) => b.date - a.date);

  try {
    saveReplayIndex(list);
  } catch (err) {
    // Rollback IndexedDB on index write failure
    await withStore('readwrite', (store) => new Promise((resolve, reject) => {
      const req = store.delete(replay.replayId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }));
    throw err;
  }

  return meta;
}

export async function loadReplay(replayId) {
  const rec = await withStore('readonly', (store) => new Promise((resolve, reject) => {
    const req = store.get(replayId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  }));
  return rec;
}

export async function deleteReplay(replayId) {
  const original = await loadReplay(replayId);
  await withStore('readwrite', (store) => new Promise((resolve, reject) => {
    const req = store.delete(replayId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
  try {
    saveReplayIndex(loadReplayIndex().filter((it) => it.replayId !== replayId));
  } catch (err) {
    // 索引写失败：把已删的帧记录放回，与 saveReplay 的反向回滚对称，避免半应用
    if (original) {
      await withStore('readwrite', (store) => new Promise((resolve, reject) => {
        const req = store.put(original);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      }));
    }
    throw err;
  }
}
