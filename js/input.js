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
    /** 单击 Shot 切换发射（设置项）；false = 按住发射 */
    this.shotToggleMode = false;
    /** toggle 模式下是否处于发射中 */
    this.shotLatched = false;
    this._touchStart = null;
    this._touchLast = null;
    this._playerStart = null;
    this.virtualMove = null; // {x,y} absolute target from relative drag
    this.bombTap = false;
    this.itemTap = false;
    this.pauseTap = false;
    /** 版面轻触一次（逻辑坐标），仅当帧有效 */
    this.tap = null;

    this.canvas = null;
    this.getPlayerPos = null;
    this._canvasBound = false;
    this._touchBtnsBound = false;

    this._onKeyDown = (e) => {
      // 表单控件获得焦点时不要吞方向键/空格（练习残机输入等）
      const t = e.target;
      const formField = t && (
        t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable
      );
      if (!formField && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
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

  /** 应用设置：单击发射切换等 */
  applySettings(settings) {
    const next = !!settings?.shotToggle;
    if (this.shotToggleMode && !next) this.shotLatched = false;
    this.shotToggleMode = next;
  }

  /** 重置单击发射锁存（退出对局 / 重新开始时调用） */
  resetShotLatch() {
    this.shotLatched = false;
  }

  /**
   * 绑定版面触控。可重复调用以刷新 getPlayerPos；监听器只挂一次，避免重开叠层。
   */
  bindCanvas(canvas, getPlayerPos) {
    this.canvas = canvas;
    this.getPlayerPos = getPlayerPos;
    if (this._canvasBound) return;
    this._canvasBound = true;

    const logical = (touch) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = touch.clientX - rect.left;
      const clientY = touch.clientY - rect.top;
      return {
        x: clientX * (this.canvas.width / rect.width),
        y: clientY * (this.canvas.height / rect.height),
      };
    };

    this._onTouchStart = (e) => {
      e.preventDefault();
      if (!e.touches.length) return;
      const p = logical(e.touches[0]);
      const pl = this.getPlayerPos?.() || { x: LOGICAL_W / 2, y: LOGICAL_H * 0.82 };
      this.touchActive = true;
      this.autoShot = true;
      this._touchStart = p;
      this._touchLast = p;
      this._playerStart = { x: pl.x, y: pl.y };
      this.virtualMove = { x: pl.x, y: pl.y };
    };

    this._onTouchMove = (e) => {
      e.preventDefault();
      if (!e.touches.length || !this._touchStart || !this._playerStart) return;
      const cur = logical(e.touches[0]);
      this._touchLast = cur;
      const dx = cur.x - this._touchStart.x;
      const dy = cur.y - this._touchStart.y;
      this.virtualMove = {
        x: Math.max(0, Math.min(LOGICAL_W, this._playerStart.x + dx)),
        y: Math.max(0, Math.min(LOGICAL_H, this._playerStart.y + dy)),
      };
    };

    this._onTouchEnd = (e) => {
      e.preventDefault();
      // 轻触（位移小）→ 记一次 tap，供路线选择等 UI 用
      if (this._touchStart) {
        const last = this._touchLast || this._touchStart;
        const d = Math.hypot(last.x - this._touchStart.x, last.y - this._touchStart.y);
        if (d < 22) this.tap = { x: this._touchStart.x, y: this._touchStart.y };
      }
      this.touchActive = false;
      this.autoShot = false;
      this._touchStart = null;
      this._touchLast = null;
      this._playerStart = null;
      this.virtualMove = null;
    };

    canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', this._onTouchEnd, { passive: false });
  }

  bindTouchButtons(itemBtn, bombBtn, pauseBtn) {
    if (this._touchBtnsBound) return;
    this._touchBtnsBound = true;
    const bind = (el, flag) => {
      if (!el) return;
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
    // 暂停键由 main.js 直连 pointerdown（此处仅兼容旧调用签名）
    if (pauseBtn) bind(pauseBtn, 'pauseTap');
  }

  /** 消费暂停触发（键盘 Esc；触屏暂停键走 main 直连） */
  consumePause() {
    const hit = this.justPressed('Escape') || this.pauseTap;
    this.pauseTap = false;
    return hit;
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.bombTap = false;
    this.itemTap = false;
    this.pauseTap = false;
    this.tap = null;
  }

  pausePressed() {
    return this.justPressed('Escape') || this.pauseTap;
  }

  isDown(code) { return this.down.has(code); }
  justPressed(code) { return this.pressed.has(code); }

  /**
   * 单击发射模式：每帧在对局逻辑里调用一次，翻转发射锁存。
   * 勿在 shotHeld 内处理，避免同帧多次查询导致连翻。
   */
  updateShotToggle() {
    if (!this.shotToggleMode) return;
    if (this.justPressed(this.keys.shot)) {
      this.shotLatched = !this.shotLatched;
    }
  }

  shotHeld() {
    if (this.shotToggleMode) {
      return this.autoShot || this.shotLatched;
    }
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
