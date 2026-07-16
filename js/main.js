/**
 * 棍维Project — 入口
 */
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { StageBackground } from './backgrounds.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { preloadArtAssets } from './assets.js';
import { preloadSprites } from './sprites.js';
import { preloadPlayfieldBg } from './playfieldBg.js';

const canvas = document.getElementById('playfield');
const bgCanvas = document.getElementById('bg3d');
const itemBtn = document.getElementById('btn-item');
const bombBtn = document.getElementById('btn-bomb');

const input = new Input();
const audio = new AudioEngine();
let background = null;

try {
  background = new StageBackground(bgCanvas);
  background.setMode('s1_mid');
  // idle render
  const idle = () => {
    if (!document.getElementById('screen-game').classList.contains('active')) {
      background.update();
    }
    requestAnimationFrame(idle);
  };
  requestAnimationFrame(idle);
} catch (err) {
  console.warn('Three.js background failed:', err);
  background = {
    setMode() {},
    setTendency() {},
    update() {},
  };
}

input.bindTouchButtons(itemBtn, bombBtn);

const ui = new UI({
  audio,
  onStartGame(opts) {
    input.reloadKeys();
    game.start(opts);
  },
});

const game = new Game({
  canvas,
  input,
  audio,
  background,
  ui,
});

// unlock audio on first interaction
const unlock = () => {
  audio.ensure();
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
};
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

// dialogue click advance
document.getElementById('dialogue-box').addEventListener('click', () => {
  if (game.state === 'dialogue') {
    game._advanceDialogue();
  }
});

// route select click
canvas.addEventListener('click', (e) => {
  if (game.state !== 'routeSelect') return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  if (x < 225) game._chooseRoute('A');
  else game._chooseRoute('B');
});

// 预加载立绘 / 贴图 / 伪3D 背景纹理
Promise.all([preloadArtAssets(), preloadSprites(), preloadPlayfieldBg()]).then(() => {
  const art = document.getElementById('menu-title-art');
  if (art) art.classList.add('ready');
});

// 首次交互解锁 AudioContext，预加载第一面 MIDI
const unlockAudio = () => {
  audio.ensure()
    .then(() => audio.loadTrackData('s1_mid'))
    .catch(() => {});
  window.removeEventListener('pointerdown', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
};
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

console.info('%c棍维Project', 'color:#5eead4;font-size:16px;font-weight:bold', 'loaded.');
