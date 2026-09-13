/**
 * OWProject — 入口
 */
import { Input } from './input.js';
import { AudioEngine, AUDIO_FILE_MAP } from './audio.js';
import { StageBackground } from './backgrounds.js';
import { loadThreeModule } from './backgrounds/threeLoader.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { getAssetPaths, preloadArtAssets } from './assets.js';
import { getSpritePaths, preloadSprites } from './sprites.js';
import { getPlayfieldBgPaths, preloadPlayfieldBg } from './playfieldBg.js';
import { VERSION_LABEL, applyVersionToDom } from './version.js';
import { installDebug } from './debug.js';
import { loadReplay } from './replayStore.js';
import { bindScoreRanking } from './scoreRanking.js';

const canvas = document.getElementById('playfield');
const bgCanvas = document.getElementById('bg3d');
const itemBtn = document.getElementById('btn-item');
const bombBtn = document.getElementById('btn-bomb');
const pauseBtn = document.getElementById('btn-pause');

const elLoad = document.getElementById('load-screen');
const elFill = document.getElementById('load-fill');
const elPct = document.getElementById('load-text');
const elStatus = document.getElementById('load-status');
const elProgress = document.getElementById('load-progress');
const btnReload = document.getElementById('load-reload');
const btnContinue = document.getElementById('load-continue');

let pendingLoaderChoice = null;

function errorText(error, fallback = '未知错误') {
  const text = error?.message || (error == null ? '' : String(error));
  return String(text || fallback).replace(/\s+/g, ' ').trim() || fallback;
}

/**
 * Updates the measurable resource progress indicator.
 * @param {number} pct - Processed-resource percentage, clamped to 0..100.
 */
function setLoadProgress(pct) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  if (elFill) elFill.style.width = `${p}%`;
  if (elPct) elPct.textContent = `${p}%`;
  if (elProgress) elProgress.setAttribute('aria-valuenow', String(p));
}

function setLoadProgressVisible(visible) {
  if (elProgress) elProgress.hidden = !visible;
  if (elPct) elPct.hidden = !visible;
}

function setLoadStatus(text) {
  if (elStatus) elStatus.textContent = text;
  else if (elLoad) elLoad.dataset.status = text;
}

function setRecoveryControls({ reload = false, continueEntry = false } = {}) {
  if (btnReload) btnReload.hidden = !reload;
  if (btnContinue) btnContinue.hidden = !continueEntry;
  elLoad?.setAttribute('aria-busy', String(!reload && !continueEntry));
  if (reload) btnReload?.focus();
}

function bindLoaderControls() {
  if (btnReload && btnReload.dataset.bootReloadBound !== '1'
    && btnReload.dataset.moduleReloadBound !== '1') {
    btnReload.addEventListener('click', () => {
      const resolve = pendingLoaderChoice;
      pendingLoaderChoice = null;
      resolve?.('reload');
      window.location.reload();
    });
    btnReload.dataset.bootReloadBound = '1';
  }
  if (btnContinue && btnContinue.dataset.bootContinueBound !== '1') {
    btnContinue.addEventListener('click', () => {
      const resolve = pendingLoaderChoice;
      if (!resolve) return;
      pendingLoaderChoice = null;
      setRecoveryControls();
      resolve('continue');
    });
    btnContinue.dataset.bootContinueBound = '1';
  }
}

function issueLabel(issue) {
  if (issue.kind === 'three') return '场景背景加载失败，可使用简化背景游玩';
  if (issue.kind === 'cache-timeout') return '部分图像准备超时';
  if (issue.kind === 'cache-failure') return '部分图像不可用';
  if (issue.type === 'audio') return `音乐${issue.status === 'timeout' ? '加载超时' : '加载失败'}`;
  if (issue.type === 'image') return `图片${issue.status === 'timeout' ? '加载超时' : '加载失败'}`;
  return errorText(issue.error || issue.message, '资源不可用');
}

function recoveryMessage(issues) {
  const labels = issues.slice(0, 3).map(issueLabel);
  const more = issues.length > labels.length ? `，另有 ${issues.length - labels.length} 项` : '';
  return `部分资源未能准备完成：${labels.join('；')}${more}。`;
}

/**
 * Waits for the user to choose whether a non-fatal startup issue is acceptable.
 * The game and UI are initialized before this is offered, so Continue is usable.
 */
function waitForLoaderChoice(issues) {
  if (!issues.length) {
    setRecoveryControls();
    return Promise.resolve('continue');
  }
  bindLoaderControls();
  setLoadProgressVisible(false);
  setLoadStatus(`${recoveryMessage(issues)} 可选择“继续进入”或“重新加载”。`);
  if (!btnContinue || !btnReload) {
    console.warn('Loader recovery controls unavailable:', issues);
    return Promise.resolve('continue');
  }
  setRecoveryControls({ reload: true, continueEntry: true });
  return new Promise((resolve) => {
    pendingLoaderChoice = resolve;
  });
}

/**
 * A rejecting timeout wrapper. The timer is cleared for both outcomes; a timeout
 * is observable by callers instead of silently turning an incomplete operation
 * into success.
 */
function withTimeout(promise, ms, label = 'operation') {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      const error = new Error(`${label} timeout`);
      error.code = 'TIMEOUT';
      reject(error);
    }, ms);
    Promise.resolve(promise).then((value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }, (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}

/**
 * Preloads artwork and OGG audio files while updating processed-resource progress.
 * Individual failures are returned as data so the caller can offer recovery after
 * all initialization needed for Continue has completed.
 * @param {import('./audio.js').AudioEngine} [audio] - Audio engine used to decode and cache audio buffers.
 */
async function preloadAll(audio) {
  const imagePaths = [...new Set([
    ...getAssetPaths(),
    ...getSpritePaths(),
    ...getPlayfieldBgPaths(),
  ])];
  const audioFilePaths = [...new Set(Object.values(AUDIO_FILE_MAP).filter(Boolean))];
  const total = imagePaths.length + audioFilePaths.length;
  let processed = 0;
  let loaded = 0;
  let unavailable = 0;
  const failures = [];

  const note = (result) => {
    processed += 1;
    if (result.status === 'loaded') loaded += 1;
    if (result.status === 'unavailable') unavailable += 1;
    if (result.issue) failures.push(result);
    setLoadProgress(total ? (processed / total) * 100 : 100);
    const suffix = failures.length ? `（${failures.length} 项失败）` : '';
    setLoadStatus(`正在加载资源 ${processed}/${total}${suffix}`);
  };

  setLoadProgress(0);
  setLoadProgressVisible(true);
  setLoadStatus(total ? `正在加载资源 0/${total}` : '无需加载资源');

  const imageTask = (src) => new Promise((resolve) => {
    const img = new Image();
    let timer = 0;
    let settled = false;
    const finish = (status, error = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      const result = {
        type: 'image',
        path: src,
        status,
        issue: status === 'failed' || status === 'timeout',
        error,
      };
      note(result);
      resolve(result);
    };
    img.onload = () => finish('loaded');
    img.onerror = () => finish('failed', new Error(`图片加载失败: ${src}`));
    timer = setTimeout(
      () => finish('timeout', new Error(`图片加载超时: ${src}`)),
      8000,
    );
    try {
      img.src = src;
    } catch (error) {
      finish('failed', error);
      return;
    }
    // A cached success/error may not dispatch an event after handlers are set.
    if (img.complete) {
      queueMicrotask(() => {
        if (img.naturalWidth) finish('loaded');
        else if (img.complete) finish('failed', new Error(`图片加载失败: ${src}`));
      });
    }
  });

  const audioTask = (path) => new Promise((resolve) => {
    const abort = new AbortController();
    let timer = 0;
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      note(result);
      resolve(result);
    };
    timer = setTimeout(() => {
      abort.abort();
      finish({
        type: 'audio',
        path,
        status: 'timeout',
        issue: true,
        error: new Error(`音频加载超时: ${path}`),
      });
    }, 10000);
    const url = path.split('/').map((seg) => encodeURIComponent(seg)).join('/');
    Promise.resolve()
      .then(() => fetch(url, { signal: abort.signal }))
      .then((response) => {
        if (!response.ok) throw new Error(`音频加载失败: ${path} (${response.status})`);
        return response.arrayBuffer();
      })
      .then(async (buffer) => {
        // Fetch success is useful evidence even when mobile audio decoding must
        // wait for a user gesture; that case is intentionally non-blocking.
        if (!audio?.ctx || settled) {
          return { type: 'audio', path, status: 'unavailable', issue: false };
        }
        try {
          const decoded = await audio.ctx.decodeAudioData(buffer.slice(0));
          if (!decoded || settled) {
            return { type: 'audio', path, status: 'unavailable', issue: false };
          }
          audio.cacheAudioBuffer(path, decoded);
          return { type: 'audio', path, status: 'loaded', issue: false };
        } catch (error) {
          return {
            type: 'audio',
            path,
            status: 'unavailable',
            issue: false,
            error,
          };
        }
      })
      .then(finish, (error) => finish({
        type: 'audio',
        path,
        status: 'failed',
        issue: true,
        error,
      }));
  });

  const tasks = [
    ...imagePaths.map(imageTask),
    ...audioFilePaths.map(audioTask),
  ];
  await Promise.all(tasks);
  if (total) setLoadProgress(100);
  setLoadStatus(
    failures.length
      ? `资源处理完成（${loaded}/${total} 成功，${unavailable} 项待后续解码，${failures.length} 项失败）`
      : `资源处理完成（${loaded}/${total} 成功，${unavailable} 项待后续解码）`,
  );
  return failures;
}
/**
 * Dismisses the loading screen only after all startup work and recovery choices
 * have completed. The element is removed synchronously so callers can then show
 * the menu and start its entrance lifecycle.
 */
function dismissLoadScreen() {
  if (!elLoad || elLoad.dataset.dismissed) return;
  elLoad.dataset.dismissed = '1';
  elLoad.classList.add('done');
  elLoad.remove();
}

/** 启动失败：保留加载层与按钮，给出中文原因并允许重新加载。 */
function showBootFailure(error) {
  if (!elLoad) return;
  elLoad.setAttribute('aria-busy', 'false');
  elLoad.dataset.dismissed = '';
  elLoad.classList.remove('done');
  setLoadProgressVisible(false);
  setRecoveryControls({ reload: true });
  setLoadStatus(`启动失败：${errorText(error)}。请点击“重新加载”。`);
}

/**
 * Initializes the audio, input, background, game, and user interface systems.
 *
 * Preloads required assets, applies saved settings, installs interaction handlers,
 * and displays a startup failure message if the main initialization block throws.
 * Errors from audio initialization and preloading are caught and logged but do not
 * trigger the failure page, allowing startup to continue.
 */
async function boot() {
  bindLoaderControls();
  const startupIssues = [];
  setLoadProgress(0);
  setLoadProgressVisible(true);
  setLoadStatus('正在准备启动资源');

  // Three.js 多 CDN 加载与资源预载并行（首个镜像成功即固化）；
  // 构造 StageBackground 前 await 落定：失败则走 #bg3d-fallback 可重试占位，游戏本体照常运行。
  let threeErr = null;
  const threeReady = loadThreeModule().catch((e) => { threeErr = e; });

  // Audio 先于预载创建，使 OGG Buffer 直接进引擎缓存
  // ensure() 在部分移动端可能保持 suspended；失败曲目在首次手势后补 decode
  const audio = new AudioEngine();
  const input = new Input();

  try {
    try {
      await audio.ensure();
    } catch (e) {
      // AudioContext may be blocked until a gesture; this is not a startup failure.
      console.warn('AudioContext init:', e);
      setLoadStatus('音频等待用户手势，继续准备其他资源');
    }

    try {
      startupIssues.push(...await preloadAll(audio));
    } catch (e) {
      // The per-resource tasks settle locally; this is only for an unexpected
      // preload controller failure, which still permits the existing fallbacks.
      console.warn('Preload error:', e);
      startupIssues.push({ kind: 'preload-failure', error: e });
      setLoadProgressVisible(false);
      setLoadStatus(`资源预载失败：${errorText(e)}`);
    }

    // Module caches are not byte-countable. Keep the real warmup, but do not
    // present its completion as a percentage or allow a broken promise to hang boot.
    setLoadProgressVisible(false);
    setLoadStatus('正在准备游戏缓存');
    try {
      const warmResults = await withTimeout(
        Promise.all([preloadArtAssets(), preloadSprites(), preloadPlayfieldBg()]),
        10000,
        '资源缓存预热',
      );
      const cacheFailed = warmResults.some((group) => (
        Array.isArray(group) && group.some((item) => item == null)
      ));
      if (cacheFailed) {
        const issue = { kind: 'cache-failure', error: new Error('部分缓存资源不可用') };
        startupIssues.push(issue);
        setLoadStatus('游戏缓存已准备，但有部分资源不可用');
      } else {
        setLoadStatus('游戏缓存已准备');
      }
    } catch (e) {
      console.warn('Cache warm error:', e);
      const issue = {
        kind: e?.code === 'TIMEOUT' ? 'cache-timeout' : 'cache-failure',
        error: e,
      };
      startupIssues.push(issue);
      setLoadStatus(`缓存准备${issue.kind === 'cache-timeout' ? '超时' : '失败'}：${errorText(e)}`);
    }
  } catch (e) {
    console.error('Boot preparation failed:', e);
    showBootFailure(e);
    return;
  }

  // The UI/game initialization below remains covered by the loader. The menu
  // is inert until UI.showMenu() is called after dismissal at the end of boot.

  // 首次用户手势：resume + 补预载失败的 BGM（移动端 suspended 时常见）
  let audioUnlocked = false;
  const unlockAudio = () => {
    if (audioUnlocked) return;
    audioUnlocked = true;
    audio.unlockAndRetryPreload().catch(() => {});
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  try {
    let background = null;

    const elBgFallback = document.getElementById('bg3d-fallback');
    const elBgErr = document.getElementById('bg3d-fallback-err');
    const showBgFallback = (err) => {
      if (!elBgFallback) return;
      elBgFallback.classList.remove('hidden');
      if (elBgErr) elBgErr.textContent = err?.message || String(err);
    };
    const hideBgFallback = () => elBgFallback?.classList.add('hidden');

    const initBackground = () => {
      const bg = new StageBackground(bgCanvas);
      bg.setMode('s1_mid');
      const idle = () => {
        if (!document.getElementById('screen-game')?.classList.contains('active')) {
          bg.update();
        }
        requestAnimationFrame(idle);
      };
      requestAnimationFrame(idle);
      return bg;
    };

    try {
      // three 加载失败时 loadThreeModule 抛聚合错误（含各镜像原因），占位 UI 展示
      setLoadStatus('正在准备 Three 场景');
      await threeReady;
      if (threeErr) throw threeErr;
      background = initBackground();
    } catch (err) {
      console.warn('Three.js background failed:', err);
      startupIssues.push({ kind: 'three', error: err });
      setLoadStatus('Three 场景不可用，已启用简化背景');
      showBgFallback(err);
      background = { setMode() {}, setTendency() {}, update() {} };
    }

    let game = null;
    const ui = new UI({
      audio,
      onStartGame(opts) {
        unlockAudio();
        input.reloadKeys();
        game.start(opts);
      },
      onSettingsChange(s) {
        if (game) game.applySettings(s);
        else {
          input.applySettings(s);
          audio.setMusicVolume(s.musicVolume ?? 1);
        }
      },
      onPlayReplay(replayId) {
        loadReplay(replayId)
          .then((data) => {
            if (!data) {
              console.warn('[replay] not found:', replayId);
              return;
            }
            if (!game) return;
            ui.showGame();
            game.startReplay(data);
          })
          .catch((e) => console.error('[replay] load failed:', e));
      },
    });

    game = new Game({ canvas, input, audio, background, ui });
    // 启动时套用本地设置
    game.applySettings();
    installDebug(game);
    bindScoreRanking(game);

    // 印象场景加载失败占位：重试 → 重新加载 three 并替换 game 使用的背景
    const retryBtn = document.getElementById('bg3d-fallback-retry');
    retryBtn?.addEventListener('click', async () => {
      if (retryBtn.disabled) return;
      retryBtn.disabled = true;
      try {
        await loadThreeModule();
        const nb = initBackground();
        // 继承当前背景模式（setMode 在 initBackground 内已设默认 's1_mid'）
        if (game?.background?.mode) {
          nb.setMode(game.background.mode);
        }
        hideBgFallback();
        if (game) game.background = nb;
      } catch (err) {
        console.warn('Three.js background retry failed:', err);
        if (elBgErr) elBgErr.textContent = err?.message || String(err);
      } finally {
        retryBtn.disabled = false;
      }
    });

    // Item / Bomb use Input's one-shot frame flags; Pause owns one pointer press.
    // Pointer events prevent touch compatibility mouse events from toggling twice.
    input.bindTouchButtons(itemBtn, bombBtn);
    if (pauseBtn) {
      let activePointerId = null;
      let legacyActive = false;
      const togglePause = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!game.running) return;
        if (game.overlayMode === 'pause') game._hideOverlay();
        else if (!game.overlayMode) game._openPause();
      };
      const pressVis = () => pauseBtn.classList.add('active');
      const releaseVis = () => {
        activePointerId = null;
        legacyActive = false;
        pauseBtn.classList.remove('active');
      };
      const pointerDown = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (activePointerId != null) return;
        activePointerId = e.pointerId;
        pressVis();
        togglePause(e);
        try { pauseBtn.setPointerCapture(e.pointerId); } catch (_) { /* detached button */ }
      };
      const pointerRelease = (e) => {
        if (activePointerId != null && e.pointerId !== activePointerId) return;
        releaseVis();
      };
      const keyboardClick = (e) => {
        // Native button activation (Enter/Space) has detail 0; pointer clicks do not.
        if (e.detail !== 0) return;
        input.pressed.delete('Enter');
        input.pressed.delete('Space');
        togglePause(e);
      };
      const clearOnFocusLoss = () => releaseVis();
      if (window.PointerEvent) {
        pauseBtn.addEventListener('pointerdown', pointerDown, { passive: false });
        pauseBtn.addEventListener('pointerup', pointerRelease);
        pauseBtn.addEventListener('pointercancel', pointerRelease);
        pauseBtn.addEventListener('lostpointercapture', pointerRelease);
        pauseBtn.addEventListener('pointerleave', pointerRelease);
      } else {
        const legacyDown = (e) => {
          if (e.type === 'mousedown' && e.button !== 0) return;
          if (legacyActive) return;
          legacyActive = true;
          pressVis();
          togglePause(e);
        };
        const legacyUp = () => {
          if (!legacyActive) return;
          releaseVis();
        };
        pauseBtn.addEventListener('touchstart', legacyDown, { passive: false });
        pauseBtn.addEventListener('touchend', legacyUp, { passive: true });
        pauseBtn.addEventListener('touchcancel', legacyUp, { passive: true });
        pauseBtn.addEventListener('mousedown', legacyDown);
        pauseBtn.addEventListener('mouseup', legacyUp);
        pauseBtn.addEventListener('mouseleave', legacyUp);
      }
      pauseBtn.addEventListener('click', keyboardClick);
      window.addEventListener('blur', clearOnFocusLoss);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') clearOnFocusLoss();
      });
    }

    // 对话/选线的点击改走 input.tap（会进录像快照），不直调 game 方法，
    // 否则点击绕过 withSeededRng + 快照，回放会卡对话/卡选线且种子流偏移。
    const setTap = (x) => { if (game) game.input.tap = { x, y: 0 }; };

    const dialogueBox = document.getElementById('dialogue-box');
    dialogueBox?.addEventListener('click', (e) => {
      if (e.target.closest?.('a')) return; // 链接点击放行（不推进对话）
      if (game.state === 'dialogue') setTap(1);
    });
    // 路线选择：对话层遮挡时也可点左右半区（触屏 pointer 兼容）
    const routePickFromClientX = (clientX) => {
      if (game.state !== 'routeSelect') return;
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) * (canvas.width / rect.width);
      setTap(x);
    };
    dialogueBox?.addEventListener('pointerup', (e) => {
      if (game.state !== 'routeSelect') return;
      e.preventDefault();
      routePickFromClientX(e.clientX);
    });
    // 鼠标 / 部分触屏：版面左右点选（touch 主路径走 input.tap）
    canvas.addEventListener('pointerup', (e) => {
      if (game.state !== 'routeSelect') return;
      if (e.pointerType === 'touch') return; // 由 input.tap 处理，避免双触发
      routePickFromClientX(e.clientX);
    });

    const unlockTrackPreload = () => {
      audio.ensure()
        .then(() => audio.loadTrackData('s1_mid'))
        .catch(() => {});
      window.removeEventListener('pointerdown', unlockTrackPreload);
      window.removeEventListener('keydown', unlockTrackPreload);
    };
    window.addEventListener('pointerdown', unlockTrackPreload);
    window.addEventListener('keydown', unlockTrackPreload);

    applyVersionToDom();
    const choice = await waitForLoaderChoice(startupIssues);
    if (choice !== 'continue') return;
    dismissLoadScreen();
    ui.showMenu();

    console.info(
      '%cOTTOWiki Project',
      'color:#5eead4;font-size:16px;font-weight:bold',
      VERSION_LABEL,
      'loaded.',
    );
  } catch (e) {
    console.error('Boot failed:', e);
    showBootFailure(e);
  }
}

boot().catch((e) => {
  console.error('Boot crashed:', e);
  showBootFailure(e);
});
