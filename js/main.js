/**
 * OWProject — 入口
 */
import { Input } from './input.js';
import { AudioEngine, AUDIO_FILE_MAP } from './audio.js';
import { StageBackground } from './backgrounds.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { getAssetPaths, preloadArtAssets } from './assets.js';
import { getSpritePaths, preloadSprites } from './sprites.js';
import { getPlayfieldBgPaths, preloadPlayfieldBg } from './playfieldBg.js';
import { VERSION_LABEL, applyVersionToDom } from './version.js';
import { installDebug } from './debug.js';

const canvas = document.getElementById('playfield');
const bgCanvas = document.getElementById('bg3d');
const itemBtn = document.getElementById('btn-item');
const bombBtn = document.getElementById('btn-bomb');
const pauseBtn = document.getElementById('btn-pause');

const elLoad = document.getElementById('load-screen');
const elFill = document.getElementById('load-fill');
const elPct = document.getElementById('load-text');
const elHint = document.getElementById('load-hint');

const PRAYING = '少女祈祷中...';

function setLoadProgress(pct, hint) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  if (elFill) elFill.style.width = `${p}%`;
  if (elPct) elPct.textContent = `${p}%`;
  // 所有加载类提示统一为「少女祈祷中...」
  if (elHint) elHint.textContent = PRAYING;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((r) => setTimeout(r, ms)),
  ]);
}

/**
 * 预载贴图 + OGG。AudioBuffer 直接写入引擎缓存，开局播歌不再二次 fetch。
 * @param {import('./audio.js').AudioEngine} [audio]
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
    setLoadProgress((loaded / total) * 100, PRAYING);
  };

  setLoadProgress(0, PRAYING);

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
  setLoadProgress(100, PRAYING);
}

function dismissLoadScreen() {
  if (!elLoad || elLoad.dataset.dismissed) return;
  elLoad.dataset.dismissed = '1';
  setLoadProgress(100, PRAYING);
  elLoad.classList.add('done');
  setTimeout(() => elLoad.remove(), 700);
}

async function boot() {
  setLoadProgress(0, PRAYING);

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

  setLoadProgress(100, PRAYING);

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

    try {
      background = new StageBackground(bgCanvas);
      background.setMode('s1_mid');
      const idle = () => {
        if (!document.getElementById('screen-game')?.classList.contains('active')) {
          background.update();
        }
        requestAnimationFrame(idle);
      };
      requestAnimationFrame(idle);
    } catch (err) {
      console.warn('Three.js background failed:', err);
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
    });

    game = new Game({ canvas, input, audio, background, ui });
    // 启动时套用本地设置
    game.applySettings();
    installDebug(game);

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

    const dialogueBox = document.getElementById('dialogue-box');
    dialogueBox?.addEventListener('click', () => {
      if (game.state === 'dialogue') game._advanceDialogue();
    });
    // 路线选择：对话层遮挡时也可点左右半区（触屏 pointer 兼容）
    const routePickFromClientX = (clientX, el) => {
      if (game.state !== 'routeSelect') return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      game._chooseRoute(x < rect.width * 0.5 ? 'A' : 'B');
    };
    dialogueBox?.addEventListener('pointerup', (e) => {
      if (game.state !== 'routeSelect') return;
      e.preventDefault();
      routePickFromClientX(e.clientX, dialogueBox);
    });
    // 鼠标 / 部分触屏：版面左右点选（touch 主路径走 input.tap）
    canvas.addEventListener('pointerup', (e) => {
      if (game.state !== 'routeSelect') return;
      if (e.pointerType === 'touch') return; // 由 input.tap 处理，避免双触发
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      game._chooseRoute(x < canvas.width * 0.5 ? 'A' : 'B');
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
