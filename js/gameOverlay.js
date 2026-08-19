/**
 * 暂停 / 结果叠加层（从 Game 抽出，行为与原先一致）
 * @param {import('./game.js').Game} game
 */
import { saveHiscore, saveNomissProgress } from './storage.js';

/**
 * 对局统计简版两行（本 PR 内建；若后续 runStats.js 统一模块合并则收敛）。
 * game.stats 由并行 PR 提供，此处容错读取（缺失字段按 0）。
 * 行1：擦弹/击破/道具；行2：Bomb/Miss/NMNB/最大连击/用时。
 */
export function localStatsText(stats) {
  const s = stats || {};
  const graze = s.graze ?? 0;
  const kills = s.kills ?? 0;
  const items = s.items ?? 0;
  const bombs = s.bombs ?? 0;
  const misses = s.misses ?? 0;
  const nmnb = s.nmnb ?? 0;
  const combo = s.maxCombo ?? 0;
  const t = Number(s.time);
  const timeStr = Number.isFinite(t) && t > 0
    ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
    : '—';
  return `擦弹 ${graze} · 击破 ${kills} · 道具 ${items}\nBomb ${bombs} · Miss ${misses} · NMNB ${nmnb} · 最大连击 ${combo} · 用时 ${timeStr}`;
}

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
    if (id === 'settle') btn.textContent = '结算';
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
  const isNomiss = game.mode === 'nomiss';
  showOverlay(game, {
    mode: 'pause',
    title: 'PAUSED',
    body: '',
    actions: isNomiss
      ? ['resume', 'settle', 'settings', 'retry']
      : ['resume', 'save-replay', 'settings', 'retry', 'menu'],
    hint: 'Esc/暂停 继续 · ↑↓ 选择 · Z 确认',
  });
}

export function openResult(game, { title, body, retryChapter }) {
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
    actions: ['save-replay', 'retry', 'menu'],
    hint: '↑↓ 选择 · Z 确认',
  });
  game.ui?.showGame?.();
}

export function runOverlayAction(game, action) {
  if (!game.overlayMode) return;
  if (action === 'resume') {
    if (game.overlayMode === 'pause') hideOverlay(game);
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
      body: `难度：${game.diff.rank} ${game.diff.name}\n进度：${ch?.name ?? '—'}\n${localStatsText(game.stats)}`,
      retryChapter: ch?.id ?? 1,
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
