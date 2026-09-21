/**
 * 暂停 / 结果叠加层（从 Game 抽出，行为与原先一致）
 * @param {import('./game.js').Game} game
 */
import { BALANCE } from './config.js';
import { startChapter } from './chapterFlow.js';
import { saveHiscore, saveNomissProgress } from './storage.js';
import { formatRunStatsShort } from './runStats.js';

export function bindOverlayClicks(game) {
  if (game._overlayBound) return;
  game._overlayBound = true;
  game.el.overlayActions?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-overlay]');
    if (!btn || !game.overlayMode) return;
    requestOverlayAction(game, btn.dataset.overlay);
  });
}

export function overlayButtons(game) {
  return [...(game.el.overlayActions?.querySelectorAll('[data-overlay]') || [])]
    .filter((b) => !b.classList.contains('hidden'));
}

export function highlightOverlay(game) {
  const btns = overlayButtons(game);
  const previous = btns.find(button => button.classList.contains('selected'));
  btns.forEach((button, index) => {
    const selected = index === game.overlayActionIndex;
    button.classList.toggle('selected', selected);
    button.classList.toggle('selection-change', selected && !!previous && previous !== button && !game._overlayTransition);
  });
}

const CONFIRM_ACTIONS = new Set(['menu', 'retry', 'settle', 'continue']);

async function transitionOverlay(game, update) {
  if (game._overlayTransition) return;
  const token = {};
  game._overlayTransition = token;
  const setDisabled = value => {
    game.el.overlayActions?.querySelectorAll('[data-overlay]').forEach(button => { button.disabled = value; });
  };
  setDisabled(true);
  const panel = game.el.overlay?.querySelector('.game-overlay-panel');
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const animate = async (frames, duration) => {
    if (!panel?.animate || reduced) return;
    const animation = panel.animate(frames, { duration, easing: 'cubic-bezier(.22,.8,.25,1)', fill: 'forwards' });
    try { await animation.finished; } catch { /* A detached panel may cancel the animation. */ }
    return animation;
  };
  try {
    const outgoing = await animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(-24px)' }], 150);
    if (game._overlayTransition !== token || !game.overlayMode) {
      outgoing?.cancel();
      return;
    }
    update();
    outgoing?.cancel();
    if (game.overlayMode && game._overlayTransition === token) {
      const incoming = await animate([{ opacity: 0, transform: 'translateX(32px)' }, { opacity: 1, transform: 'translateX(0)' }], 240);
      incoming?.cancel();
    }
  } finally {
    if (game._overlayTransition === token) game._overlayTransition = null;
    if (!game._overlayTransition) setDisabled(false);
  }
}

function restoreOverlay(game) {
  const pending = game._overlayConfirm;
  if (!pending) return;
  game._overlayConfirm = null;
  showOverlay(game, pending.view);
  game.overlayActionIndex = pending.index;
  highlightOverlay(game);
}

function requestOverlayAction(game, action) {
  if (game._overlayTransition || !game.overlayMode) return;
  if (game._overlayConfirm) {
    if (action !== 'confirm-yes' && action !== 'confirm-no') return;
    const pending = game._overlayConfirm;
    void transitionOverlay(game, () => {
      restoreOverlay(game);
      if (action === 'confirm-yes') runOverlayAction(game, pending.action);
    });
    return;
  }
  if (!overlayButtons(game).some(button => button.dataset.overlay === action)) return;
  if (!CONFIRM_ACTIONS.has(action)) {
    runOverlayAction(game, action);
    return;
  }
  const view = game._overlayView;
  const index = overlayButtons(game).findIndex(button => button.dataset.overlay === action);
  const label = overlayButtons(game).find(button => button.dataset.overlay === action)?.textContent;
  void transitionOverlay(game, () => {
    showOverlay(game, { mode: view.mode, title: `确认${label}？`, body: '', actions: ['confirm-yes', 'confirm-no'], hint: 'Esc 返回 · ↑↓ 选择 · Z / Enter 确认' });
    game._overlayConfirm = { action, view, index };
    game.overlayActionIndex = 1;
    game.el.overlay?.classList.add('mode-confirm');
    highlightOverlay(game);
  });
}

export function showOverlay(game, { mode, title, body = '', actions, hint }) {
  game._overlayView = { mode, title, body, actions, hint };
  game._overlayConfirm = null;
  game.el.overlay?.classList.remove('mode-confirm');
  const container = game.el.overlayActions;
  if (container?.ownerDocument && !container.querySelector('[data-overlay="confirm-yes"]')) {
    for (const [action, text, translation] of [['confirm-yes', '是', 'Yes Yes Yes'], ['confirm-no', '否', 'No No No']]) {
      const button = container.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = 'overlay-btn hidden';
      button.dataset.overlay = action;
      const label = container.ownerDocument.createElement('span');
      label.textContent = text;
      const subtitle = container.ownerDocument.createElement('small');
      subtitle.className = 'overlay-confirm-subtitle';
      subtitle.textContent = translation;
      button.append(label, subtitle);
      container.append(button);
    }
  }
  game.overlayMode = mode;
  game.overlayActionIndex = 0;
  game.el.overlay?.classList.remove('hidden');
  game.el.overlay?.classList.toggle('mode-result', mode === 'result');
  game.el.overlay?.classList.toggle('mode-pause', mode === 'pause');
  if (game.el.overlayTitle) game.el.overlayTitle.textContent = title;
  if (game.el.overlayBody) game.el.overlayBody.textContent = body || '';
  if (game.el.overlayHint) game.el.overlayHint.textContent = hint || '';

  const all = [...(game.el.overlayActions?.querySelectorAll('[data-overlay]') || [])];
  const want = new Set(actions);
  for (const btn of all) {
    const id = btn.dataset.overlay;
    const show = want.has(id);
    btn.classList.toggle('hidden', !show);
    btn.classList.remove('selected');
    btn.classList.remove('selection-change');
    btn.disabled = !!game._overlayTransition;
    if (id === 'resume') btn.textContent = '继续';
    if (id === 'settle') btn.textContent = '结算';
    if (id === 'continue') btn.textContent = '继续';
    if (id === 'settings') btn.textContent = '设置';
    if (id === 'retry') btn.textContent = mode === 'pause' ? '重开本章' : '再试一次';
    if (id === 'menu') btn.textContent = '主菜单';
    if (id === 'save-replay') btn.textContent = mode === 'pause' ? '保存录像' : '保存整局录像';
  }
  highlightOverlay(game);
}

export function hideOverlay(game) {
  game._overlayConfirm = null;
  game._overlayTransition = null;
  game.overlayMode = null;
  game.paused = false;
  game.el.overlay?.classList.add('hidden');
}

async function resumeOverlay(game) {
  if (game._overlayTransition) return;
  const overlay = game.el.overlay;
  const panel = overlay?.querySelector('.game-overlay-panel');
  const blur = overlay?.querySelector('.game-overlay-blur');
  if (!panel?.animate || !blur?.animate || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    hideOverlay(game);
    return;
  }
  const token = {};
  game._overlayTransition = token;
  const options = { duration: 280, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' };
  const animations = [
    panel.animate([{ opacity: 1, transform: 'translate(0,0)' }, { opacity: 0, transform: 'translate(-10px,12px)' }], options),
    blur.animate([{ backdropFilter: 'blur(3px) saturate(.65)', background: 'rgba(19,13,24,.46)' }, { backdropFilter: 'blur(0) saturate(1)', background: 'rgba(19,13,24,0)' }], options),
  ];
  try { await Promise.all(animations.map(animation => animation.finished)); }
  catch { /* Cancelling an exit must still release its pause state. */ }
  finally {
    if (game._overlayTransition === token) hideOverlay(game);
    animations.forEach(animation => animation.cancel());
  }
}

export function openPause(game) {
  if (game.overlayMode === 'result' || game.overlayMode === 'pause') return;
  if (game.state !== 'playing' && game.state !== 'dialogue' && game.state !== 'stageTransit') return;
  game.paused = true;
  const isNomiss = game.mode === 'nomiss';
  showOverlay(game, {
    mode: 'pause',
    title: 'PAUSED',
    body: '',
    // 常规模式暂停菜单不提供「重开本章」（retry 仅 Nomiss 保留，配合自动重开机制）
    actions: isNomiss
      ? ['resume', 'settle', 'settings', 'retry']
      : ['resume', 'save-replay', 'settings', 'menu'],
    hint: 'Esc/暂停 继续 · ↑↓ 选择 · Z 确认',
  });
}

export function openResult(game, { title, body, retryChapter, actions }) {
  if (game.replaying) {
    game._showReplayEnd();
    return;
  }
  game.paused = true;
  game.state = 'gameover';
  game.resultPayload = {
    retryChapter: retryChapter ?? game.chapters[game.chapterIndex]?.id ?? 1,
    difficulty: game.difficultyId,
  };
  showOverlay(game, {
    mode: 'result',
    title,
    body,
    actions: actions || ['save-replay', 'retry', 'menu'],
    hint: '↑↓ 选择 · Z 确认',
  });
  game.ui?.showGame?.();
}

export function runOverlayAction(game, action) {
  if (!game.overlayMode) return;
  // 续关：Game Over 结算里可继续（限未回放 / 结果叠加层 / 次数未用完 / 非练习与非 Nomiss）
  if (action === 'continue') {
    if (game.replaying || game.overlayMode !== 'result') return;
    if (game.continuesLeft <= 0 || game.mode === 'practice' || game.mode === 'nomiss') return;
    // 续关后分数清零重新开始（hiscore 保留全局最高不重置）
    game.score = 0;
    game.baseScore = 0;
    game.continuesLeft--;
    game.continuesUsed++;
    game.recording = false; // 续关后不再录制录像
    hideOverlay(game);
    game.player.lives = BALANCE.continue.lives;
    game.player.bombs = BALANCE.continue.bombs;
    game.player.resetPos();
    game.state = 'playing';
    startChapter(game);
    return;
  }
  if (action === 'resume') {
    if (game.overlayMode === 'pause') void resumeOverlay(game);
    return;
  }
  if (action === 'settle') {
    // Nomiss 手动结算：仅暂停菜单可用；不开排行榜、不入榜；清空进度（下次从头第 1 章）
    if (game.mode !== 'nomiss' || game.overlayMode !== 'pause') return;
    hideOverlay(game);
    saveNomissProgress(null);
    saveHiscore(game.score);
    const ch = game.chapters[game.chapterIndex];
    openResult(game, {
      title: 'Nomiss 结算',
      body: `难度：${game.diff.rank} ${game.diff.name}\n进度：${ch?.name ?? '—'}\n${formatRunStatsShort(game.stats)}`,
      retryChapter: ch?.id ?? 1,
      actions: ['retry', 'menu'],
    });
    return;
  }
  if (action === 'settings') {
    if (game.overlayMode !== 'pause') return;
    game.overlayMode = null;
    game.el.overlay?.classList.add('hidden');
    game.paused = true;
    game.ui?.openSettingsFromPause?.(() => {
      game.ui.showGame();
      openPause(game);
    });
    return;
  }
  if (action === 'retry') {
    if (game.replaying) return;
    const chId = game.overlayMode === 'result'
      ? (game.resultPayload?.retryChapter ?? game.chapters[game.chapterIndex]?.id)
      : game.chapters[game.chapterIndex]?.id;
    const keepLives = game.overlayMode === 'pause' ? game.player.lives : undefined;
    hideOverlay(game);
    // 延后到微任务，避免在逻辑块（withSeededRng）内重入 start → 打乱新局种子
    queueMicrotask(() => game.start({
      playerId: game.playerId,
      startChapter: chId,
      mode: game.mode,
      lives: keepLives,
      unstable: game.practiceUnstable,
      singleChapter: game.singleChapter,
      difficulty: game.difficultyId,
    }));
    return;
  }
  if (action === 'save-replay') {
    const isPause = game.overlayMode === 'pause';
    game._saveReplay({
      partial: isPause,
      cleared: !isPause && !!game._endCleared,
    }).then((r) => {
      if (game.el.overlayHint) {
        game.el.overlayHint.textContent = r && r.ok ? '录像已保存' : '录像保存失败';
      }
    }).catch(() => {
      if (game.el.overlayHint) game.el.overlayHint.textContent = '录像保存失败';
    });
    return;
  }
  if (action === 'menu') {
    if (!game.replaying) saveHiscore(game.score);
    hideOverlay(game);
    // 延后到微任务，避免在逻辑块内重入 stop
    queueMicrotask(() => {
      game.stop();
      if (game.replaying && game.ui?.showReplayScreen) game.ui.showReplayScreen();
      else game.ui.showMenu();
    });
  }
}

/**
 * 叠加层键盘/暂停导航。
 * @param {boolean} wantPause 调用方已 consumePause 的结果
 * @returns {boolean} 已处理（调用方应 return）
 */
export function handleOverlayInput(game, wantPause) {
  if (!game.overlayMode) return false;
  if (game._overlayTransition) return true;
  if (wantPause && game._overlayConfirm) {
    void transitionOverlay(game, () => restoreOverlay(game));
    return true;
  }

  const btns = overlayButtons(game);

  if (wantPause && game.overlayMode === 'pause') {
    void resumeOverlay(game);
    return true;
  }

  if (
    game.input.justPressed('ArrowDown') || game.input.justPressed('KeyS')
    || game.input.justPressed('ArrowRight') || game.input.justPressed('KeyD')
  ) {
    game.overlayActionIndex = (game.overlayActionIndex + 1) % Math.max(1, btns.length);
    highlightOverlay(game);
    return true;
  }
  if (
    game.input.justPressed('ArrowUp') || game.input.justPressed('KeyW')
    || game.input.justPressed('ArrowLeft') || game.input.justPressed('KeyA')
  ) {
    game.overlayActionIndex = (game.overlayActionIndex - 1 + btns.length) % Math.max(1, btns.length);
    highlightOverlay(game);
    return true;
  }
  if (
    game.input.shotPressed()
    || game.input.justPressed('Enter')
    || game.input.justPressed('Space')
    || game.input.justPressed('KeyZ')
  ) {
    const id = btns[game.overlayActionIndex]?.dataset.overlay;
    if (id) requestOverlayAction(game, id);
    return true;
  }
  if (game.overlayMode === 'pause' && game.mode === 'nomiss' && game.input.justPressed('KeyR')) {
    requestOverlayAction(game, 'retry');
    return true;
  }
  if (game.overlayMode === 'pause' && game.input.justPressed('KeyQ')) {
    requestOverlayAction(game, 'menu');
    return true;
  }
  return true;
}
