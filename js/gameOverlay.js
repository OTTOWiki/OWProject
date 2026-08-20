/**
 * 暂停 / 结果叠加层（从 Game 抽出，行为与原先一致）
 * @param {import('./game.js').Game} game
 */
import { BALANCE } from './config.js';
import { startChapter } from './chapterFlow.js';
import { saveHiscore } from './storage.js';

export function bindOverlayClicks(game) {
  if (game._overlayBound) return;
  game._overlayBound = true;
  game.el.overlayActions?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-overlay]');
    if (!btn || !game.overlayMode) return;
    runOverlayAction(game, btn.dataset.overlay);
  });
}

export function overlayButtons(game) {
  return [...(game.el.overlayActions?.querySelectorAll('[data-overlay]') || [])]
    .filter((b) => !b.classList.contains('hidden'));
}

export function highlightOverlay(game) {
  const btns = overlayButtons(game);
  btns.forEach((b, i) => b.classList.toggle('selected', i === game.overlayActionIndex));
}

export function showOverlay(game, { mode, title, body = '', actions, hint }) {
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
    if (id === 'resume') btn.textContent = '继续';
    if (id === 'continue') btn.textContent = '继续';
    if (id === 'settings') btn.textContent = '设置';
    if (id === 'retry') btn.textContent = mode === 'pause' ? '重开本章' : '再试一次';
    if (id === 'menu') btn.textContent = '主菜单';
    if (id === 'save-replay') btn.textContent = mode === 'pause' ? '保存录像' : '保存整局录像';
  }
  highlightOverlay(game);
}

export function hideOverlay(game) {
  game.overlayMode = null;
  game.paused = false;
  game.el.overlay?.classList.add('hidden');
}

export function openPause(game) {
  if (game.overlayMode === 'result' || game.overlayMode === 'pause') return;
  if (game.state !== 'playing' && game.state !== 'dialogue' && game.state !== 'stageTransit') return;
  game.paused = true;
  showOverlay(game, {
    mode: 'pause',
    title: 'PAUSED',
    body: '',
    actions: ['resume', 'save-replay', 'settings', 'retry', 'menu'],
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
    if (game.overlayMode === 'pause') hideOverlay(game);
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

  const btns = overlayButtons(game);

  if (wantPause && game.overlayMode === 'pause') {
    hideOverlay(game);
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
    if (id) runOverlayAction(game, id);
    return true;
  }
  if (game.overlayMode === 'pause' && game.input.justPressed('KeyR')) {
    runOverlayAction(game, 'retry');
    return true;
  }
  if (game.overlayMode === 'pause' && game.input.justPressed('KeyQ')) {
    runOverlayAction(game, 'menu');
    return true;
  }
  return true;
}
