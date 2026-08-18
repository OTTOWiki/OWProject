import { loadKeys } from './storage.js';
import { LOGICAL_W, LOGICAL_H, TOUCH_SENSITIVITY } from './config.js';

/** 移动键集合（方向键 + WASD） */
const MOVE_LEFT = new Set(['ArrowLeft', 'KeyA']);
const MOVE_RIGHT = new Set(['ArrowRight', 'KeyD']);
const MOVE_UP = new Set(['ArrowUp', 'KeyW']);
const MOVE_DOWN = new Set(['ArrowDown', 'KeyS']);
const MOVE_KEYS = new Set([...MOVE_LEFT, ...MOVE_RIGHT, ...MOVE_UP, ...MOVE_DOWN]);

/**
 * 由移动键按下顺序（moveSeq）求移动轴（同轴对向后按为准；对角归一化）。
 * 抽出为纯函数供 Input.moveAxis 与回放输入复用，避免两处算法漂移。
 */
export function moveAxisFromSeq(moveSeq) {
  let x = 0, y = 0;
  for (let i = moveSeq.length - 1; i >= 0; i--) {
    const code = moveSeq[i];
    if (!x) {
      if (MOVE_LEFT.has(code)) x = -1;
      else if (MOVE_RIGHT.has(code)) x = 1;
    }
    if (!y) {
      if (MOVE_UP.has(code)) y = -1;
      else if (MOVE_DOWN.has(code)) y = 1;
    }
    if (x && y) break;
  }
  if (x && y) {
    const inv = 1 / Math.SQRT2;
    x *= inv; y *= inv;
  }
  return { x, y };
}

export class Input {
  constructor() {
    this.keys = loadKeys();
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    /** 当前仍按住的移动键，按按下先后排序（末尾 = 最近按下，优先级最高） */
    this._moveSeq = [];

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
      if (!this.down.has(e.code)) {
        this.pressed.add(e.code);
        if (MOVE_KEYS.has(e.code)) this._moveSeq.push(e.code);
      }
      this.down.add(e.code);
    };
    this._onKeyUp = (e) => {
      this.down.delete(e.code);
      this.released.add(e.code);
      if (MOVE_KEYS.has(e.code)) {
        const i = this._moveSeq.indexOf(e.code);
        if (i >= 0) this._moveSeq.splice(i, 1);
      }
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
      // 灵敏度：自机位移 = 手指位移 × TOUCH_SENSITIVITY（相对拖拽加速）。
      // 最终 virtualMove 仍为绝对逻辑坐标，录像快照/回放不受影响。
      const dx = (cur.x - this._touchStart.x) * TOUCH_SENSITIVITY;
      const dy = (cur.y - this._touchStart.y) * TOUCH_SENSITIVITY;
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

  /** Item / Bomb 触屏键；暂停键由 main.js pointer 直连 */
  bindTouchButtons(itemBtn, bombBtn) {
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
  }

  /** 消费暂停触发（键盘 Esc；触屏暂停键走 main 直连） */
  consumePause() {
    return this.justPressed('Escape');
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.bombTap = false;
    this.itemTap = false;
    this.tap = null;
  }

  /**
   * 录像输入快照：覆盖 Input 各查询方法所读的全部状态。
   * 字段名与 js/replay.js 约定一致（d,p,m,t,v,a,b,i,l）。
   */
  snapshot() {
    return {
      d: [...this.down],
      p: [...this.pressed],
      m: [...this._moveSeq],
      t: this.tap ? [this.tap.x, this.tap.y] : null,
      v: this.virtualMove ? [this.virtualMove.x, this.virtualMove.y] : null,
      a: !!this.autoShot,
      b: !!this.bombTap,
      i: !!this.itemTap,
      l: !!this.shotLatched,
    };
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

  /**
   * 移动轴：同轴对向键以后按下的为准（先左后右 → 向右；松右后仍按左 → 向左）。
   * 上下轴同理。
   */
  moveAxis() {
    return moveAxisFromSeq(this._moveSeq);
  }
}
