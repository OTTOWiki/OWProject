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

/**
 * Updates the loading indicator with a percentage value.
 * @param {number} pct - The progress percentage, clamped to the range from 0 to 100.
 */
function setLoadProgress(pct) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  if (elFill) elFill.style.width = `${p}%`;
  if (elPct) elPct.textContent = `${p}%`;
}

/**
 * Resolves with the first result from the operation or a timeout.
 * @param {Promise} promise - The operation to await.
 * @param {number} ms - The timeout duration in milliseconds.
 * @return {Promise<*>} The operation's result, or `undefined` if the timeout expires first.
 *   If the promise rejects before the timeout, the rejection will propagate.
 */
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((r) => setTimeout(r, ms)),
  ]);
}

/**
 * Preloads artwork and OGG audio files while updating loading progress.
 * @param {import('./audio.js').AudioEngine} [audio] - Audio engine used to decode and cache audio buffers.
 */
async function preloadAll(audio) {
  const imagePaths = [...new Set([
    ...getAssetPaths(),
    ...getSpritePaths(),
    ...getPlayfieldBgPaths(),
  ])];
  const audioFilePaths = [...new Set(Object.values(AUDIO_FILE_MAP).filter(Boolean))];

  const total = Math.max(1, imagePaths.length + audioFilePaths.length);
  let loaded = 0;

  const step = () => {
    loaded = Math.min(total, loaded + 1);
    setLoadProgress((loaded / total) * 100);
  };

  setLoadProgress(0);

  const tasks = [];

  for (const src of imagePaths) {
    tasks.push(new Promise((resolve) => {
      const img = new Image();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        step();
        resolve();
      };
      img.onload = finish;
      img.onerror = finish;
      img.src = src;
      // 缓存命中时可能已 complete 且 onload 不再触发
      if (img.complete) finish();
      else setTimeout(finish, 8000);
    }));
  }

  // 预载音频文件（OGG）；路径含日文时分段 encode
  for (const path of audioFilePaths) {
    const ac = new AbortController();
    let audioDone = false;
    const stepAudio = () => {
      if (audioDone) return;
      audioDone = true;
      clearTimeout(audioTimer);
      step();
    };
    const audioTimer = setTimeout(() => { ac.abort(); stepAudio(); }, 10000);
    const url = path.split('/').map((seg) => encodeURIComponent(seg)).join('/');
    tasks.push(
      fetch(url, { signal: ac.signal })
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
        .then(async (buf) => {
          if (!audio?.ctx) return null;
          try {
            return await audio.ctx.decodeAudioData(buf.slice(0));
          } catch {
            return null;
          }
        })
        .then((decoded) => {
          if (decoded && audio) audio.cacheAudioBuffer(path, decoded);
          stepAudio();
        }, () => stepAudio())
    );
  }

  await withTimeout(Promise.all(tasks), 30000);
  setLoadProgress(100);
}

/**
 * Dismisses the loading screen after marking it complete.
 */
function dismissLoadScreen() {
  if (!elLoad || elLoad.dataset.dismissed) return;
  elLoad.dataset.dismissed = '1';
  setLoadProgress(100);
  elLoad.classList.add('done');
  setTimeout(() => elLoad.remove(), 700);
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
  setLoadProgress(0);

  // Three.js 多 CDN 加载与资源预载并行（首个镜像成功即固化）；
  // 构造 StageBackground 前 await 落定：失败则走 #bg3d-fallback 可重试占位，游戏本体照常运行。
  let threeErr = null;
  const threeReady = loadThreeModule().catch((e) => { threeErr = e; });

  // Audio 先于预载创建，使 OGG Buffer 直接进引擎缓存
  // ensure() 在部分移动端可能保持 suspended；失败曲目在首次手势后补 decode
  const audio = new AudioEngine();
  const input = new Input();

  try {
    await audio.ensure();
  } catch (e) {
    console.warn('AudioContext init:', e);
  }

  try {
    await preloadAll(audio);
  } catch (e) {
    console.warn('Preload error:', e);
  }

  setLoadProgress(100);

  try {
    // 写入模块缓存；带超时避免某图永远不 complete 卡住加载屏
    await withTimeout(
      Promise.all([preloadArtAssets(), preloadSprites(), preloadPlayfieldBg()]),
      10000,
    );
  } catch (e) {
    console.warn('Cache warm error:', e);
  }

  dismissLoadScreen();
  applyVersionToDom();

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
      await threeReady;
      if (threeErr) throw threeErr;
      background = initBackground();
    } catch (err) {
      console.warn('Three.js background failed:', err);
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

    // Item / Bomb 仍用帧内 flag；暂停在 pointerdown 立刻切换
    // （触屏上 preventDefault 会吞掉 click，且 pointer+touch 双绑会连开连关）
    input.bindTouchButtons(itemBtn, bombBtn);
    if (pauseBtn) {
      let pauseLock = false;
      const togglePause = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (pauseLock || !game.running) return;
        pauseLock = true;
        setTimeout(() => { pauseLock = false; }, 320);
        if (game.overlayMode === 'pause') game._hideOverlay();
        else if (!game.overlayMode) game._openPause();
      };
      const pressVis = () => pauseBtn.classList.add('active');
      const releaseVis = () => pauseBtn.classList.remove('active');
      if (window.PointerEvent) {
        pauseBtn.addEventListener('pointerdown', (e) => {
          pressVis();
          togglePause(e);
        }, { passive: false });
        pauseBtn.addEventListener('pointerup', releaseVis);
        pauseBtn.addEventListener('pointercancel', releaseVis);
        pauseBtn.addEventListener('pointerleave', releaseVis);
      } else {
        pauseBtn.addEventListener('touchstart', (e) => {
          pressVis();
          togglePause(e);
        }, { passive: false });
        pauseBtn.addEventListener('touchend', releaseVis, { passive: true });
        pauseBtn.addEventListener('mousedown', (e) => {
          pressVis();
          togglePause(e);
        });
        pauseBtn.addEventListener('mouseup', releaseVis);
      }
    }

    const unlock = () => {
      audio.ensure();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

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

    const unlockAudio = () => {
      audio.ensure()
        .then(() => audio.loadTrackData('s1_mid'))
        .catch(() => {});
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    const art = document.getElementById('menu-title-art');
    if (art) art.classList.add('ready');

    console.info(
      '%cOTTOWiki Project',
      'color:#5eead4;font-size:16px;font-weight:bold',
      VERSION_LABEL,
      'loaded.',
    );
  } catch (e) {
    console.error('Boot failed:', e);
    if (elLoad) {
      elLoad.dataset.dismissed = '';
      elLoad.classList.remove('done');
      elLoad.replaceChildren();
      const box = document.createElement('div');
      box.style.cssText = 'color:#f87171;font-size:16px;text-align:center;padding:40px';
      box.append('启动失败', document.createElement('br'));
      const small = document.createElement('small');
      small.textContent = e?.message || String(e);
      box.append(small);
      elLoad.append(box);
    }
  }
}

boot().catch((e) => {
  console.error('Boot crashed:', e);
  if (elLoad) {
    elLoad.replaceChildren();
    const box = document.createElement('div');
    box.style.cssText = 'color:#f87171;font-size:16px;text-align:center;padding:40px';
    box.append('启动失败', document.createElement('br'));
    const small = document.createElement('small');
    small.textContent = e?.message || String(e);
    box.append(small);
    elLoad.append(box);
  }
});
