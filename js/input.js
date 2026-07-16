import { loadKeys } from './storage.js';
import { LOGICAL_W, LOGICAL_H } from './config.js';

export class Input {
  constructor() {
    this.keys = loadKeys();
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();

    this.touchActive = false;
    this.autoShot = false;
    this._touchStart = null;
    this._playerStart = null;
    this.virtualMove = null; // {x,y} absolute target from relative drag
    this.bombTap = false;
    this.itemTap = false;

    this._onKeyDown = (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    };
    this._onKeyUp = (e) => {
      this.down.delete(e.code);
      this.released.add(e.code);
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  reloadKeys() {
    this.keys = loadKeys();
  }

  bindCanvas(canvas, getPlayerPos) {
    this.canvas = canvas;
    this.getPlayerPos = getPlayerPos;

    const logical = (touch) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = touch.clientX - rect.left;
      const clientY = touch.clientY - rect.top;
      return {
        x: clientX * (canvas.width / rect.width),
        y: clientY * (canvas.height / rect.height),
      };
    };

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!e.touches.length) return;
      const p = logical(e.touches[0]);
      const pl = getPlayerPos();
      this.touchActive = true;
      this.autoShot = true;
      this._touchStart = p;
      this._playerStart = { x: pl.x, y: pl.y };
      this.virtualMove = { x: pl.x, y: pl.y };
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!e.touches.length || !this._touchStart || !this._playerStart) return;
      const cur = logical(e.touches[0]);
      const dx = cur.x - this._touchStart.x;
      const dy = cur.y - this._touchStart.y;
      this.virtualMove = {
        x: Math.max(0, Math.min(LOGICAL_W, this._playerStart.x + dx)),
        y: Math.max(0, Math.min(LOGICAL_H, this._playerStart.y + dy)),
      };
    }, { passive: false });

    const end = (e) => {
      e.preventDefault();
      this.touchActive = false;
      this.autoShot = false;
      this._touchStart = null;
      this._playerStart = null;
      // keep virtualMove null so keyboard works
      this.virtualMove = null;
    };
    canvas.addEventListener('touchend', end, { passive: false });
    canvas.addEventListener('touchcancel', end, { passive: false });
  }

  bindTouchButtons(itemBtn, bombBtn) {
    const bind = (el, flag) => {
      const down = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this[flag] = true;
        el.classList.add('active');
      };
      const up = (e) => {
        e.preventDefault();
        el.classList.remove('active');
      };
      el.addEventListener('touchstart', down, { passive: false });
      el.addEventListener('mousedown', down);
      el.addEventListener('touchend', up, { passive: false });
      el.addEventListener('mouseup', up);
      el.addEventListener('mouseleave', up);
    };
    bind(itemBtn, 'itemTap');
    bind(bombBtn, 'bombTap');
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.bombTap = false;
    this.itemTap = false;
  }

  isDown(code) { return this.down.has(code); }
  justPressed(code) { return this.pressed.has(code); }

  shotHeld() {
    return this.autoShot || this.isDown(this.keys.shot);
  }
  shotPressed() {
    return this.justPressed(this.keys.shot);
  }
  bombPressed() {
    return this.justPressed(this.keys.bomb) || this.bombTap;
  }
  itemPressed() {
    return this.justPressed(this.keys.item) || this.itemTap;
  }
  slowHeld() {
    return this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }

  moveAxis() {
    let x = 0, y = 0;
    if (this.isDown('ArrowLeft') || this.isDown('KeyA')) x -= 1;
    if (this.isDown('ArrowRight') || this.isDown('KeyD')) x += 1;
    if (this.isDown('ArrowUp') || this.isDown('KeyW')) y -= 1;
    if (this.isDown('ArrowDown') || this.isDown('KeyS')) y += 1;
    if (x && y) {
      const inv = 1 / Math.SQRT2;
      x *= inv; y *= inv;
    }
    return { x, y };
  }
}
