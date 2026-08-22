/**
 * Debug 模式（仅开发/自测）
 *
 * 控制台：
 *   owDebug()              开启并打开面板
 *   owDebug(false)         关闭
 *   owDebug.help()         说明
 *   owDebug.set({ … })     改选项
 *   owDebug.jump(id)       跳章节 id
 *   owDebug.kill()         清敌+清弹并章成功
 *   owDebug.clear()        仅清弹
 *
 * 游戏中：F8 开关面板 · F9 循环加速
 *
 * 面板 UI：Tweakpane（首次开启时 CDN 动态 import，正常游玩零请求）
 */

import { BALANCE, LOGICAL_W, LOGICAL_H } from './config.js';
import { fullScreenClear } from './patterns.js';

/** @type {import('./game.js').Game | null} */
let gameRef = null;

const state = {
  enabled: false,
  panelOpen: false,
  lockLives: false,
  lockBombs: false,
  invincible: false,
  autoEdit: false,
  skipDialogue: false,
  /** 逻辑时间倍率：1 = 正常 */
  timeScale: 1,
  showOverlay: true,
};

/** 跳章输入（与 state 分离，避免污染 flag） */
const jumpParams = { chapterId: 1 };

const TIME_STEPS = [1, 1.5, 2, 3, 5, 8];

const TIME_SCALE_OPTIONS = {
  '1×': 1,
  '1.5×': 1.5,
  '2×': 2,
  '3×': 3,
  '5×': 5,
  '8×': 8,
};

/** bare 名走 index.html importmap；失败时回退直链 CDN */
const TWEAKPANE_SPEC = 'tweakpane';
const TWEAKPANE_CDN = 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.js';

function clampScale(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(16, Math.max(0.25, n));
}

export function getDebugState() {
  return state;
}

export function isDebugEnabled() {
  return state.enabled;
}

/** 主循环用：未开启时恒为 1 */
export function getDebugTimeScale() {
  return state.enabled ? state.timeScale : 1;
}

export function debugBlocksHit() {
  return state.enabled && state.invincible;
}

export function debugLocksLives() {
  return state.enabled && state.lockLives;
}

export function debugLocksBombs() {
  return state.enabled && state.lockBombs;
}

export function debugAutoEdit() {
  return state.enabled && state.autoEdit;
}

export function debugSkipDialogue() {
  return state.enabled && state.skipDialogue;
}

export function debugShowOverlay() {
  return state.enabled && state.showOverlay;
}

/* ---------- Game 绑定 ---------- */

export function installDebug(game) {
  gameRef = game;
  ensureHud();
  bindHotkeys();
  exposeConsoleApi();
}

function g() {
  return gameRef;
}

/* ---------- 作弊 / 工具动作 ---------- */

function applyLocksAfterFrame() {
  const game = g();
  if (!state.enabled || !game?.player) return;
  const p = game.player;
  if (state.lockLives) {
    const floor = Math.max(0, BALANCE.startLives);
    if (p.lives < floor) p.lives = floor;
  }
  if (state.lockBombs) {
    const floor = Math.max(0, BALANCE.startBombs);
    if (p.bombs < floor) p.bombs = floor;
  }
  if (state.autoEdit) {
    p.edit = BALANCE.editMax;
  }
  if (state.invincible) {
    if (p.arbitration > 0) p.arbitration = 0;
  }
}

/** 供 game 每帧调用 */
export function debugTick() {
  if (!state.enabled) return;
  applyLocksAfterFrame();
  refreshHudLine();
}

export function debugClearBullets() {
  const game = g();
  if (!game?.running) return false;
  fullScreenClear(game);
  return true;
}

export function debugKillEnemies({ finish = false } = {}) {
  const game = g();
  if (!game?.running) return false;
  for (const e of game.enemies) {
    if (e.dead) continue;
    e.hp = 0;
    e.dead = true;
    e.fireOnDeath?.(game);
  }
  fullScreenClear(game);
  if (finish && !game.chapterDone) {
    game._finishChapter(true);
  }
  return true;
}

export function debugAddLife(n = 1) {
  const game = g();
  if (!game?.player) return false;
  game.player.lives = Math.min(BALANCE.maxLives, game.player.lives + n);
  return true;
}

export function debugAddBomb(n = 1) {
  const game = g();
  if (!game?.player) return false;
  game.player.bombs = Math.min(BALANCE.maxBombs, game.player.bombs + n);
  return true;
}

export function debugFillEdit() {
  const game = g();
  if (!game?.player) return false;
  game.player.edit = BALANCE.editMax;
  return true;
}

export function debugJumpChapter(id) {
  const game = g();
  if (!game) return false;
  const cid = Number(id);
  if (!Number.isFinite(cid)) return false;
  if (game.chapterIndexById.get(cid) == null) {
    return false;
  }
  const route = game.routeChoice;
  const opts = {
    playerId: game.playerId || 'yinquan',
    startChapter: cid,
    mode: game.mode || 'stage',
    difficulty: game.difficultyId || 'normal',
    singleChapter: false,
    unstable: game.practiceUnstable !== false,
  };
  game.ui?.showGame?.();
  game.start(opts);
  if (route) game.routeChoice = route;
  return true;
}

/** 局内软跳：不重置分数/资源，只换章（更适合连打 EX）。不跑路线 skip，精确落点。 */
export function debugSoftJumpChapter(id) {
  const game = g();
  if (!game?.running) {
    return debugJumpChapter(id);
  }
  const cid = Number(id);
  if (game.chapterIndexById.get(cid) == null) {
    return false;
  }
  game._cancelAdvance?.();
  game.chapterDone = false;
  game.chapterIndex = game._indexForChapterId(cid);
  game._startChapter();
  return true;
}

export function debugNextChapter() {
  const game = g();
  if (!game?.running) return false;
  game._cancelAdvance?.();
  game.chapterDone = false;
  game.chapterIndex += 1;
  if (game.chapterIndex >= game.chapters.length) {
    game._gameClear();
    return true;
  }
  game._startChapter();
  return true;
}

export function debugSkipTransit() {
  const game = g();
  if (!game?.stageTransit) return false;
  game.stageTransit.t = game.stageTransit.duration;
  return true;
}

export function debugChooseRoute(route) {
  const game = g();
  if (!game) return false;
  if (game.state === 'routeSelect') {
    game._chooseRoute(route);
    return true;
  }
  game.routeChoice = route === 'B' ? 'B' : 'A';
  return true;
}

export function debugSkipDialogueNow() {
  const game = g();
  if (!game || game.state !== 'dialogue') return false;
  game.dialogueIdx = (game.dialogueQueue?.length || 0);
  game._showDialogueLine();
  return true;
}

/* ---------- Tweakpane 面板（懒加载） ---------- */

/** @type {import('tweakpane').Pane | null} */
let pane = null;
/** @type {Promise<import('tweakpane').Pane> | null} */
let paneLoad = null;
let hudEl = null;

function ensureHud() {
  if (hudEl || typeof document === 'undefined') return hudEl;
  hudEl = document.createElement('div');
  hudEl.id = 'debug-hud';
  hudEl.className = 'debug-hud hidden';
  document.body.appendChild(hudEl);
  return hudEl;
}

/**
 * 首次调用才拉 Tweakpane CDN。
 * @returns {Promise<import('tweakpane').Pane | null>}
 */
async function ensurePane() {
  if (pane) return pane;
  if (typeof document === 'undefined') return null;
  if (paneLoad) return paneLoad;

  paneLoad = (async () => {
    let Pane;
    try {
      let mod;
      try {
        mod = await import(TWEAKPANE_SPEC);
      } catch {
        mod = await import(TWEAKPANE_CDN);
      }
      Pane = mod.Pane;
    } catch (e) {
      console.warn('[debug] Tweakpane load failed', e);
      paneLoad = null;
      return null;
    }
    if (!Pane) {
      console.warn('[debug] Tweakpane.Pane missing');
      paneLoad = null;
      return null;
    }

    const p = new Pane({
      title: 'OW Debug · F8/F9',
      expanded: true,
    });
    p.element.id = 'debug-panel';
    Object.assign(p.element.style, {
      position: 'fixed',
      top: '12px',
      right: '12px',
      zIndex: '10050',
      width: 'min(300px, calc(100vw - 24px))',
      maxHeight: 'calc(100vh - 24px)',
      overflow: 'auto',
    });

    // 避免点面板时触屏/键盘冒泡进游戏
    p.element.addEventListener('pointerdown', (e) => e.stopPropagation());
    p.element.addEventListener('keydown', (e) => e.stopPropagation());
    p.element.addEventListener('keyup', (e) => e.stopPropagation());
    p.element.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });

    buildPane(p);
    pane = p;
    applyPaneVisibility();
    return p;
  })();

  return paneLoad;
}

/** @param {import('tweakpane').Pane} p */
function buildPane(p) {
  const cheat = p.addFolder({ title: '作弊', expanded: true });
  cheat.addBinding(state, 'lockLives', { label: '锁残机' });
  cheat.addBinding(state, 'lockBombs', { label: '锁 Bomb' });
  cheat.addBinding(state, 'invincible', { label: '不受伤' });
  cheat.addBinding(state, 'autoEdit', { label: 'Edit 常满' });
  cheat.addBinding(state, 'skipDialogue', { label: '跳过对话' });
  cheat.addBinding(state, 'showOverlay', { label: '版面信息' });

  p.addBinding(state, 'timeScale', {
    label: '整体加速',
    options: TIME_SCALE_OPTIONS,
  });

  const tools = p.addFolder({ title: '局内工具', expanded: true });
  const btn = (title, fn) => {
    tools.addButton({ title }).on('click', fn);
  };
  btn('清弹', () => debugClearBullets());
  btn('清敌', () => debugKillEnemies({ finish: false }));
  btn('通关本章', () => debugKillEnemies({ finish: true }));
  btn('+残', () => debugAddLife(1));
  btn('+B', () => debugAddBomb(1));
  btn('满 Edit', () => debugFillEdit());
  btn('下一章', () => debugNextChapter());
  btn('跳过场', () => debugSkipTransit());
  btn('跳对话', () => debugSkipDialogueNow());
  btn('路线 A', () => debugChooseRoute('A'));
  btn('路线 B', () => debugChooseRoute('B'));

  tools.addBinding(jumpParams, 'chapterId', {
    label: '章节 id',
    step: 1,
  });
  btn('硬跳（重开）', () => debugJumpChapter(jumpParams.chapterId));
  btn('软跳（保资源）', () => debugSoftJumpChapter(jumpParams.chapterId));

  p.addButton({ title: '关闭 Debug 模式' }).on('click', () => {
    setDebugEnabled(false);
  });
}

function applyPaneVisibility() {
  if (!pane) return;
  const show = state.enabled && state.panelOpen;
  pane.hidden = !show;
  // 部分版本用 element 更稳
  pane.element.style.display = show ? '' : 'none';
}

function refreshPaneBindings() {
  try {
    pane?.refresh?.();
  } catch (_) {
    /* ignore */
  }
}

function syncPanel() {
  ensureHud();
  applyPaneVisibility();
  refreshPaneBindings();
  if (!state.enabled || !state.showOverlay) {
    hudEl?.classList.add('hidden');
  }
}

function refreshHudLine() {
  ensureHud();
  if (!hudEl || !state.enabled || !state.showOverlay) {
    hudEl?.classList.add('hidden');
    return;
  }
  const game = g();
  if (!game?.running) {
    hudEl.classList.add('hidden');
    return;
  }
  const ch = game.chapters?.[game.chapterIndex];
  const p = game.player;
  const eb = game.enemyBullets?.length ?? 0;
  const en = game.enemies?.filter((e) => !e.dead).length ?? 0;
  hudEl.classList.remove('hidden');
  hudEl.textContent = [
    `DBG ${state.timeScale}×`,
    ch ? `ch#${ch.id} ${ch.name}` : 'ch?',
    `L${p?.lives ?? 0} B${p?.bombs ?? 0}`,
    `en ${en} bul ${eb}`,
    state.invincible ? 'GOD' : '',
    state.lockLives ? '∞L' : '',
    state.lockBombs ? '∞B' : '',
  ].filter(Boolean).join(' · ');
}

/* ---------- 开关 / 热键 / 控制台 ---------- */

export function setDebugEnabled(on, { openPanel = true } = {}) {
  state.enabled = !!on;
  if (state.enabled) {
    if (openPanel) state.panelOpen = true;
    // 懒加载面板；不阻塞 API 返回
    void ensurePane().then(() => {
      syncPanel();
    });
  } else {
    state.panelOpen = false;
    state.timeScale = 1;
  }
  syncPanel();
  return state;
}

function speedIndex() {
  const i = TIME_STEPS.indexOf(state.timeScale);
  if (i >= 0) return i;
  let best = 0;
  let bestD = Infinity;
  TIME_STEPS.forEach((s, idx) => {
    const d = Math.abs(s - state.timeScale);
    if (d < bestD) { bestD = d; best = idx; }
  });
  return best;
}

function cycleSpeed() {
  if (!state.enabled) return;
  const i = (speedIndex() + 1) % TIME_STEPS.length;
  state.timeScale = TIME_STEPS[i];
  syncPanel();
}

function bindHotkeys() {
  if (bindHotkeys._done) return;
  if (typeof window === 'undefined') return;
  bindHotkeys._done = true;
  window.addEventListener('keydown', (e) => {
    if (!state.enabled && e.code !== 'F8') return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (e.code === 'F8' || e.code === 'F9') {
        /* still allow */
      } else {
        return;
      }
    }
    if (e.code === 'F8') {
      e.preventDefault();
      if (!state.enabled) {
        setDebugEnabled(true);
      } else {
        state.panelOpen = !state.panelOpen;
        if (state.panelOpen && !pane) {
          void ensurePane().then(() => syncPanel());
        } else {
          syncPanel();
        }
      }
    } else if (e.code === 'F9' && state.enabled) {
      e.preventDefault();
      cycleSpeed();
    }
  });
}

function exposeConsoleApi() {
  if (typeof window === 'undefined') return;
  const api = (on) => {
    if (on === false || on === 0 || on === 'off') {
      return setDebugEnabled(false);
    }
    return setDebugEnabled(true, { openPanel: true });
  };
  api.help = () => {
    console.log(`
OW Debug 用法
  owDebug()                 开启 + 打开面板（首次会拉 Tweakpane CDN）
  owDebug(false)            关闭
  owDebug.set({ invincible:true, timeScale:3, lockLives:true, lockBombs:true,
                autoEdit:true, skipDialogue:true, showOverlay:true })
  owDebug.jump(id)          硬跳章节 id（重开局到该章）
  owDebug.softJump(id)      软跳（保留分数资源）
  owDebug.next()            下一章
  owDebug.kill()            清敌+清弹+本章成功
  owDebug.clear()           清弹
  owDebug.life() / .bomb() / .edit()
  热键：F8 面板 · F9 循环加速
EX 起点：stageSelectEntries 中 id=EX 的 startChapter
`);
  };
  api.set = (opts = {}) => {
    if (!state.enabled) setDebugEnabled(true, { openPanel: false });
    if (opts.lockLives != null) state.lockLives = !!opts.lockLives;
    if (opts.lockBombs != null) state.lockBombs = !!opts.lockBombs;
    if (opts.invincible != null) state.invincible = !!opts.invincible;
    if (opts.autoEdit != null) state.autoEdit = !!opts.autoEdit;
    if (opts.skipDialogue != null) state.skipDialogue = !!opts.skipDialogue;
    if (opts.showOverlay != null) state.showOverlay = !!opts.showOverlay;
    if (opts.timeScale != null) state.timeScale = clampScale(opts.timeScale);
    if (opts.panelOpen != null) state.panelOpen = !!opts.panelOpen;
    if (opts.chapterId != null) {
      const n = Number(opts.chapterId);
      if (Number.isFinite(n)) jumpParams.chapterId = n;
    }
    void ensurePane().then(() => syncPanel());
    syncPanel();
    return { ...state };
  };
  api.state = () => ({ ...state });
  api.jump = (id) => debugJumpChapter(id);
  api.softJump = (id) => debugSoftJumpChapter(id);
  api.next = () => debugNextChapter();
  api.kill = () => debugKillEnemies({ finish: true });
  api.clear = () => debugClearBullets();
  api.life = () => debugAddLife(1);
  api.bomb = () => debugAddBomb(1);
  api.edit = () => debugFillEdit();
  api.route = (r) => debugChooseRoute(r);

  window.owDebug = api;
  window.__owDebug = api;
}
