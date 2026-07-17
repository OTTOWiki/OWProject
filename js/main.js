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

async function preloadAll() {
  // 图片资源
  const imagePaths = [
    ...getAssetPaths(),
    ...getSpritePaths(),
    ...getPlayfieldBgPaths(),
  ];

  // MIDI JSON
  const midiIds = [...new Set(Object.values(MUSIC_FILE_MAP))];
  const midiPaths = midiIds.map((id) => `assets/midi/${id}.json`);

  const total = imagePaths.length + midiPaths.length;
  let loaded = 0;

  const step = (hint) => {
    loaded++;
    const pct = Math.round((loaded / total) * 100);
    if (elFill) elFill.style.width = `${pct}%`;
    if (elPct) elPct.textContent = `${pct}%`;
    if (elHint) elHint.textContent = hint || '';
  };

  step('');
  elFill.style.width = '0%';

  const tasks = [];

  for (const src of imagePaths) {
    tasks.push(new Promise((resolve) => {
      const img = new Image();
      let done = false;
      const finish = () => { if (done) return; done = true; step(src.split('/').pop()); resolve(); };
      img.onload = finish;
      img.onerror = finish;
      img.src = src;
      setTimeout(() => { if (!img.complete) finish(); }, 8000);
    }));
  }

  for (const path of midiPaths) {
    const ac = new AbortController();
    let midiDone = false;
    const stepMidi = () => { if (midiDone) return; midiDone = true; clearTimeout(timer); step(path.split('/').pop()); };
    const timer = setTimeout(() => { ac.abort(); stepMidi(); }, 8000);
    tasks.push(
      fetch(path, { signal: ac.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(() => stepMidi(), () => stepMidi())
    );
  }

  await Promise.race([
    Promise.all(tasks),
    new Promise((r) => setTimeout(r, 15000)),
  ]);
  elPct.textContent = '100%';
  elHint.textContent = 'Complete';
}

async function boot() {
  try {
    await preloadAll();
  } catch (e) {
    console.warn('Preload error:', e);
  }

  // Populate module-level caches (images already cached by browser)
  await Promise.all([preloadArtAssets(), preloadSprites(), preloadPlayfieldBg()]);

  if (elLoad) elLoad.classList.add('done');
  setTimeout(() => elLoad?.remove(), 700);

  try {
    const input = new Input();
    const audio = new AudioEngine();
    let background = null;

    try {
      background = new StageBackground(bgCanvas);
      background.setMode('s1_mid');
      const idle = () => {
        if (!document.getElementById('screen-game').classList.contains('active')) {
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

    document.getElementById('dialogue-box').addEventListener('click', () => {
      if (game.state === 'dialogue') game._advanceDialogue();
    });

    canvas.addEventListener('click', (e) => {
      if (game.state !== 'routeSelect') return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      if (x < 225) game._chooseRoute('A');
      else game._chooseRoute('B');
    });

    // 首次交互预热第一面 MIDI
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
      elLoad.innerHTML = '<div style="color:#f87171;font-size:16px;text-align:center;padding:40px">启动失败<br><small>' + e.message + '</small></div>';
      elLoad.classList.remove('done');
    }
  }
}

boot();
