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

const canvas = document.getElementById('playfield');
const bgCanvas = document.getElementById('bg3d');
const itemBtn = document.getElementById('btn-item');
const bombBtn = document.getElementById('btn-bomb');

const elLoad = document.getElementById('load-screen');
const elFill = document.getElementById('load-fill');
const elPct = document.getElementById('load-text');
const elHint = document.getElementById('load-hint');

function setLoadProgress(pct, hint) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  if (elFill) elFill.style.width = `${p}%`;
  if (elPct) elPct.textContent = `${p}%`;
  if (elHint && hint != null) elHint.textContent = hint;
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

  const step = (hint) => {
    loaded = Math.min(total, loaded + 1);
    setLoadProgress((loaded / total) * 100, hint || '');
  };

  setLoadProgress(0, 'Loading…');

  const tasks = [];

  for (const src of imagePaths) {
    tasks.push(new Promise((resolve) => {
      const img = new Image();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        step(src.split('/').pop());
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
      step(path.split('/').pop());
    };
    const timer = setTimeout(() => { ac.abort(); stepMidi(); }, 8000);
    tasks.push(
      fetch(path, { signal: ac.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(() => stepMidi(), () => stepMidi())
    );
  }

  await withTimeout(Promise.all(tasks), 15000);
  setLoadProgress(100, 'Complete');
}

function dismissLoadScreen() {
  if (!elLoad || elLoad.dataset.dismissed) return;
  elLoad.dataset.dismissed = '1';
  setLoadProgress(100, 'Complete');
  elLoad.classList.add('done');
  setTimeout(() => elLoad.remove(), 700);
}

async function boot() {
  setLoadProgress(0, '初始化…');

  try {
    await preloadAll();
  } catch (e) {
    console.warn('Preload error:', e);
  }

  setLoadProgress(100, '缓存写入…');

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

    input.bindTouchButtons(itemBtn, bombBtn);

    const ui = new UI({
      audio,
      onStartGame(opts) {
        input.reloadKeys();
        game.start(opts);
      },
    });

    const game = new Game({ canvas, input, audio, background, ui });

    const unlock = () => {
      audio.ensure();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    document.getElementById('dialogue-box')?.addEventListener('click', () => {
      if (game.state === 'dialogue') game._advanceDialogue();
    });

    canvas.addEventListener('click', (e) => {
      if (game.state !== 'routeSelect') return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      if (x < 225) game._chooseRoute('A');
      else game._chooseRoute('B');
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

    console.info('%c棍维Project', 'color:#5eead4;font-size:16px;font-weight:bold', 'loaded.');
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
