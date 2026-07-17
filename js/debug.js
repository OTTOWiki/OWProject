/**
 * Debug 模式（仅开发/自测）
 *
 * 控制台：
 *   owDebug()              开启并打开面板
 *   owDebug(false)         关闭
 *   owDebug.help()         说明
 *   owDebug.set({ … })     改选项
 *   owDebug.jump(129)      跳章节 id
 *   owDebug.kill()         清敌+清弹并章成功
 *   owDebug.clear()        仅清弹
 *
 * 游戏中：F8 开关面板 · F9 循环加速
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

const TIME_STEPS = [1, 1.5, 2, 3, 5, 8];

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
  ensurePanel();
  bindHotkeys();
  exposeConsoleApi();
  // 不在启动时打 console 提示；需要说明时用 owDebug.help()
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
    const floor = Math.max(0, game.diff?.startLives ?? 2);
    if (p.lives < floor) p.lives = floor;
  }
  if (state.lockBombs) {
    const floor = Math.max(0, game.diff?.startBombs ?? 3);
    if (p.bombs < floor) p.bombs = floor;
  }
  if (state.autoEdit) {
    p.edit = BALANCE.editMax;
  }
  if (state.invincible) {
    // 保持短无敌，避免仲裁窗卡死；被弹直接不进 _hitPlayer
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
  if (game._pendingAdvance) {
    clearTimeout(game._pendingAdvance);
    game._pendingAdvance = null;
  }
  game.chapterDone = false;
  game.chapterIndex = game._indexForChapterId(cid);
  game._startChapter();
  return true;
}

export function debugNextChapter() {
  const game = g();
  if (!game?.running) return false;
  if (game._pendingAdvance) {
    clearTimeout(game._pendingAdvance);
    game._pendingAdvance = null;
  }
  game.chapterDone = false;
  // Debug：精确 +1，不按路线过滤（方便扫表）
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

/* ---------- 面板 ---------- */

let panelEl = null;
let hudEl = null;

function ensurePanel() {
  if (panelEl) return panelEl;
  if (typeof document === 'undefined') return null;
  panelEl = document.createElement('div');
  panelEl.id = 'debug-panel';
  panelEl.className = 'debug-panel hidden';
  panelEl.innerHTML = `
    <div class="debug-panel-head">
      <strong>OW Debug</strong>
      <span class="debug-panel-sub">F8 面板 · F9 加速</span>
      <button type="button" class="debug-x" data-dbg="close" title="隐藏面板">×</button>
    </div>
    <div class="debug-panel-body">
      <section>
        <h4>作弊</h4>
        <label class="debug-check"><input type="checkbox" data-dbg-flag="lockLives" /> 锁残机</label>
        <label class="debug-check"><input type="checkbox" data-dbg-flag="lockBombs" /> 锁 Bomb</label>
        <label class="debug-check"><input type="checkbox" data-dbg-flag="invincible" /> 不受伤</label>
        <label class="debug-check"><input type="checkbox" data-dbg-flag="autoEdit" /> Edit 常满</label>
        <label class="debug-check"><input type="checkbox" data-dbg-flag="skipDialogue" /> 跳过对话</label>
        <label class="debug-check"><input type="checkbox" data-dbg-flag="showOverlay" /> 版面信息</label>
      </section>
      <section>
        <h4>整体加速 <span id="debug-speed-label">1×</span></h4>
        <input type="range" id="debug-speed" min="0" max="5" step="1" value="0" />
        <div class="debug-speed-marks">1× · 1.5× · 2× · 3× · 5× · 8×</div>
      </section>
      <section>
        <h4>局内工具</h4>
        <div class="debug-btn-row">
          <button type="button" data-dbg="clear">清弹</button>
          <button type="button" data-dbg="kill">清敌</button>
          <button type="button" data-dbg="win">通关本章</button>
        </div>
        <div class="debug-btn-row">
          <button type="button" data-dbg="life">+残</button>
          <button type="button" data-dbg="bomb">+B</button>
          <button type="button" data-dbg="edit">满 Edit</button>
        </div>
        <div class="debug-btn-row">
          <button type="button" data-dbg="next">下一章</button>
          <button type="button" data-dbg="skip-transit">跳过场</button>
          <button type="button" data-dbg="skip-dlg">跳对话</button>
        </div>
        <div class="debug-btn-row">
          <button type="button" data-dbg="route-a">路线 A</button>
          <button type="button" data-dbg="route-b">路线 B</button>
        </div>
        <div class="debug-jump">
          <input type="number" id="debug-chapter-id" placeholder="章节 id" />
          <button type="button" data-dbg="jump">跳转</button>
          <button type="button" data-dbg="soft-jump">软跳</button>
        </div>
        <p class="debug-hint">软跳：保留分数/资源只换章。硬跳：等价 restart 到该章。</p>
      </section>
      <section>
        <button type="button" class="debug-disable" data-dbg="disable">关闭 Debug 模式</button>
      </section>
    </div>
  `;
  document.body.appendChild(panelEl);

  // 避免点面板时触屏/键盘冒泡进游戏
  panelEl.addEventListener('pointerdown', (e) => e.stopPropagation());
  panelEl.addEventListener('keydown', (e) => e.stopPropagation());
  panelEl.addEventListener('keyup', (e) => e.stopPropagation());

  panelEl.addEventListener('change', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.dataset.dbgFlag) {
      const key = t.dataset.dbgFlag;
      if (key in state && key !== 'enabled' && key !== 'panelOpen' && key !== 'timeScale') {
        state[key] = t.checked;
        syncPanel();
      }
    }
  });

  panelEl.querySelector('#debug-speed')?.addEventListener('input', (e) => {
    const i = Number(e.target.value) || 0;
    state.timeScale = TIME_STEPS[i] ?? 1;
    syncPanel();
  });

  panelEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-dbg]');
    if (!btn) return;
    const act = btn.getAttribute('data-dbg');
    runPanelAction(act);
  });

  hudEl = document.createElement('div');
  hudEl.id = 'debug-hud';
  hudEl.className = 'debug-hud hidden';
  document.body.appendChild(hudEl);

  return panelEl;
}

function runPanelAction(act) {
  switch (act) {
    case 'close':
      state.panelOpen = false;
      syncPanel();
      break;
    case 'disable':
      setDebugEnabled(false);
      break;
    case 'clear':
      debugClearBullets();
      break;
    case 'kill':
      debugKillEnemies({ finish: false });
      break;
    case 'win':
      debugKillEnemies({ finish: true });
      break;
    case 'life':
      debugAddLife(1);
      break;
    case 'bomb':
      debugAddBomb(1);
      break;
    case 'edit':
      debugFillEdit();
      break;
    case 'next':
      debugNextChapter();
      break;
    case 'skip-transit':
      debugSkipTransit();
      break;
    case 'skip-dlg':
      debugSkipDialogueNow();
      break;
    case 'route-a':
      debugChooseRoute('A');
      break;
    case 'route-b':
      debugChooseRoute('B');
      break;
    case 'jump': {
      const id = document.getElementById('debug-chapter-id')?.value;
      debugJumpChapter(id);
      break;
    }
    case 'soft-jump': {
      const id = document.getElementById('debug-chapter-id')?.value;
      debugSoftJumpChapter(id);
      break;
    }
    default:
      break;
  }
}

function speedIndex() {
  const i = TIME_STEPS.indexOf(state.timeScale);
  if (i >= 0) return i;
  // 最近值
  let best = 0;
  let bestD = Infinity;
  TIME_STEPS.forEach((s, idx) => {
    const d = Math.abs(s - state.timeScale);
    if (d < bestD) { bestD = d; best = idx; }
  });
  return best;
}

function syncPanel() {
  const el = ensurePanel();
  if (!el) return;
  if (!state.enabled || !state.panelOpen) {
    el.classList.add('hidden');
  } else {
    el.classList.remove('hidden');
  }
  for (const key of ['lockLives', 'lockBombs', 'invincible', 'autoEdit', 'skipDialogue', 'showOverlay']) {
    const box = el.querySelector(`[data-dbg-flag="${key}"]`);
    if (box) box.checked = !!state[key];
  }
  const range = el.querySelector('#debug-speed');
  if (range) range.value = String(speedIndex());
  const lab = el.querySelector('#debug-speed-label');
  if (lab) lab.textContent = `${state.timeScale}×`;
  if (!state.enabled || !state.showOverlay) {
    hudEl?.classList.add('hidden');
  }
}

function refreshHudLine() {
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
  const eb = game.enemyBullets?.length ?? game.bullets?.filter((b) => b.from === 'enemy' && !b.dead).length ?? 0;
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

/** 画在 canvas 上的角标（可选，HUD DOM 已有） */
export function drawDebugOverlay(ctx) {
  if (!debugShowOverlay()) return;
  const game = g();
  if (!game?.running) return;
  // DOM hud 已显示；此处仅在无 DOM 时兜底，保持轻量
  void ctx;
  void LOGICAL_W;
  void LOGICAL_H;
}

/* ---------- 开关 / 热键 / 控制台 ---------- */

export function setDebugEnabled(on, { openPanel = true } = {}) {
  state.enabled = !!on;
  if (state.enabled) {
    if (openPanel) state.panelOpen = true;
  } else {
    state.panelOpen = false;
    // 关闭时重置加速，避免忘关
    state.timeScale = 1;
  }
  syncPanel();
  return state;
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
    // 输入框内不抢 F 键以外的
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
        syncPanel();
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
  owDebug()                 开启 + 打开面板
  owDebug(false)            关闭
  owDebug.set({ invincible:true, timeScale:3, lockLives:true, lockBombs:true,
                autoEdit:true, skipDialogue:true, showOverlay:true })
  owDebug.jump(129)         硬跳章节 id（重开局到该章）
  owDebug.softJump(100)     软跳（保留分数资源）
  owDebug.next()            下一章
  owDebug.kill()            清敌+清弹+本章成功
  owDebug.clear()           清弹
  owDebug.life() / .bomb() / .edit()
  热键：F8 面板 · F9 循环加速
常见 EX 起点：stageSelect EX startChapter（多为 129）
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
  // 别名
  window.__owDebug = api;
}
