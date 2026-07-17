/**
 * 棍维Project — 入口
 */
import { Input } from './input.js';
import { AudioEngine, MUSIC_FILE_MAP } from './audio.js';
import { StageBackground } from './backgrounds.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { getAssetPaths, preloadArtAssets } from './assets.js';
import { getSpritePaths, preloadSprites } from './sprites.js';
import { getPlayfieldBgPaths, preloadPlayfieldBg } from './playfieldBg.js';
import { VERSION_LABEL, applyVersionToDom } from './version.js';

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

async function preloadAll() {
  const imagePaths = [...new Set([
    ...getAssetPaths(),
    ...getSpritePaths(),
    ...getPlayfieldBgPaths(),
  ])];
  const midiIds = [...new Set(Object.values(MUSIC_FILE_MAP))];
  const midiPaths = midiIds.map((id) => `assets/midi/${id}.json`);

  const total = Math.max(1, imagePaths.length + midiPaths.length);
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

  for (const path of midiPaths) {
    const ac = new AbortController();
    let midiDone = false;
    const stepMidi = () => {
      if (midiDone) return;
      midiDone = true;
      clearTimeout(timer);
      step();
    };
    const timer = setTimeout(() => { ac.abort(); stepMidi(); }, 8000);
    tasks.push(
      fetch(path, { signal: ac.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(() => stepMidi(), () => stepMidi())
    );
  }

  await withTimeout(Promise.all(tasks), 15000);
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

  try {
    await preloadAll();
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

  try {
    const input = new Input();
    const audio = new AudioEngine();
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

    // Item / Bomb 仍用帧内 flag；暂停在 pointerdown 立刻切换
    // （触屏上 preventDefault 会吞掉 click，且 pointer+touch 双绑会连开连关）
    input.bindTouchButtons(itemBtn, bombBtn, null);
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
      '%c棍维Project',
      'color:#5eead4;font-size:16px;font-weight:bold',
      VERSION_LABEL,
      'loaded.',
    );
  } catch (e) {
    console.error('Boot failed:', e);
    if (elLoad) {
      elLoad.dataset.dismissed = '';
      elLoad.classList.remove('done');
      elLoad.innerHTML = '<div style="color:#f87171;font-size:16px;text-align:center;padding:40px">启动失败<br><small>' + e.message + '</small></div>';
    }
  }
}

boot().catch((e) => {
  console.error('Boot crashed:', e);
  if (elLoad) {
    elLoad.innerHTML = '<div style="color:#f87171;font-size:16px;text-align:center;padding:40px">启动失败<br><small>' + (e?.message || e) + '</small></div>';
  }
});
