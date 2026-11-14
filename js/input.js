import { loadKeys } from './storage.js';
import { replayKeyTable, encodeReplayFrame } from './replayCodec.js';
import {
  TOUCH_DRAG_SCALE, TOUCH_JOYSTICK_DEADZONE, TOUCH_DIRECTION_HOLD_BLOCKS,
} from './config.js';

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

const AXIS_BY_SECTOR = [
  { x: 1, y: 0 },   // E
  { x: 1, y: 1 },   // SE
  { x: 0, y: 1 },   // S
  { x: -1, y: 1 },  // SW
  { x: -1, y: 0 },  // W
  { x: -1, y: -1 }, // NW
  { x: 0, y: -1 },  // N
  { x: 1, y: -1 },  // NE
];

/**
 * 单次触屏位移 → 径向 8 向数字轴。
 * 0.5 缩放是硬约束；低于死区不移动，超过死区立即映射；低速只由低速键控制。
 * 方向按角度分扇区，不做轴向死区，斜向与方向切换不会卡在“先单轴后斜向”。
 */
export function joystickAxisFromDelta(rawDx, rawDy) {
  const dx = rawDx * TOUCH_DRAG_SCALE;
  const dy = rawDy * TOUCH_DRAG_SCALE;
  if (Math.hypot(dx, dy) < TOUCH_JOYSTICK_DEADZONE) return { x: 0, y: 0 };
  const sector = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
  return { ...AXIS_BY_SECTOR[sector] };
}

/** 数字摇杆轴 → 桌面移动键代码（回放仍走既有 downMask/axis 记录，无新格式）。 */
function touchAxisToMoveCodes(axis) {
  const codes = [];
  if (!axis) return codes;
  if (axis.x < 0) codes.push('ArrowLeft');
  else if (axis.x > 0) codes.push('ArrowRight');
  if (axis.y < 0) codes.push('ArrowUp');
  else if (axis.y > 0) codes.push('ArrowDown');
  return codes;
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
    /** 触屏低速键按住状态（与键盘 Shift 并列，均计入 slowHeld） */
    this.slowTouch = false;
    /** 移动端相对移动是否受桌面同速上限约束（设置项；默认 true） */
    this.touchSpeedLimit = true;
    /** 本局是否在限速关闭时实际使用过触屏相对移动（作弊标记） */
    this.mobileCheat = false;
    /** 单击 Shot 切换发射（设置项）；false = 按住发射 */
    this.shotToggleMode = false;
    /** toggle 模式下是否处于发射中 */
    this.shotLatched = false;
    this._touchStart = null;
    this._touchLast = null;
    this._touchId = null;
    this._touchDragged = false;
    /** 实时触屏摇杆的数字轴（8 向）；null = 未触摸 */
    this.touchAxis = null;
    this._touchAxisTTL = 0;
    /** 旧录像兼容：绝对目标；实时触屏不再写入 */
    this.virtualMove = null;
    this.bombTap = false;
    this.itemTap = false;
    /** 版面轻触一次（逻辑坐标），仅当帧有效 */
    this.tap = null;

    this.canvas = null;
    this.getPlayerPos = null;
    this._touchSurface = null;
    this._canvasBound = false;
    this._touchBtnsBound = false;
    this._slowBtnBound = false;
    this._touchButtonReleases = [];

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
    this._onWindowBlur = () => this._releaseTransientInput();
    this._onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') this._releaseTransientInput();
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onWindowBlur);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  _releaseTransientInput() {
    this.down.clear();
    this.pressed.clear();
    this.released.clear();
    this._moveSeq.length = 0;
    this.touchActive = false;
    this.autoShot = false;
    this.slowTouch = false;
    this.shotLatched = false;
    this._touchStart = null;
    this._touchLast = null;
    this._touchId = null;
    this._touchDragged = false;
    this.touchAxis = null;
    this._touchAxisTTL = 0;
    this.virtualMove = null;
    this.bombTap = false;
    this.itemTap = false;
    this.tap = null;
    for (const release of this._touchButtonReleases) release();
  }

  reloadKeys() {
    this.keys = loadKeys();
  }

  /** 应用设置：单击发射切换、移动端限速等 */
  applySettings(settings) {
    const next = !!settings?.shotToggle;
    if (this.shotToggleMode && !next) this.shotLatched = false;
    this.shotToggleMode = next;
    this.touchSpeedLimit = settings?.mobileSpeedLimit !== false;
  }

  /** 重置单击发射锁存（退出对局 / 重新开始时调用） */
  resetShotLatch() {
    this.shotLatched = false;
  }

  /** 新一轮对局清空作弊记录（限速关闭时实际触屏拖动才会再次置位） */
  resetMobileCheat() {
    this.mobileCheat = false;
  }

  /**
   * 绑定触屏移动。事件面默认是 canvas；运行时传入 `#screen-game` 后，
   * 在按钮/叠加层之外的全屏任意位置拖动都能移动自机。
   * 可重复调用以刷新 getPlayerPos；监听器只挂一次（或换面时迁移），避免重开叠层。
   * @param {HTMLCanvasElement} canvas 负责逻辑坐标映射的 450×600 版面
   * @param {() => {x:number,y:number}} getPlayerPos
   * @param {HTMLElement} [surface] 触屏事件面；默认 canvas
   */
  bindCanvas(canvas, getPlayerPos, surface = null) {
    this.canvas = canvas;
    this.getPlayerPos = getPlayerPos;
    const target = surface || canvas;
    if (this._canvasBound) {
      if (this._touchSurface === target) return;
      this._unbindTouchSurface();
    }
    this._canvasBound = true;
    this._touchSurface = target;

    const logical = (touch) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = touch.clientX - rect.left;
      const clientY = touch.clientY - rect.top;
      return {
        x: clientX * (this.canvas.width / rect.width),
        y: clientY * (this.canvas.height / rect.height),
      };
    };
    const findTouch = (touches, identifier) => {
      for (let i = 0; i < (touches?.length || 0); i++) {
        if (touches[i].identifier === identifier) return touches[i];
      }
      return null;
    };
    /** 控件自身要处理点击/按住，不能被全屏移动手势吞掉。 */
    const isControlTarget = (targetEl) => !!targetEl?.closest?.(
      'button, a, input, select, textarea, summary, [role="button"], '
      + '.touch-controls, .game-overlay, .score-ranking, #bg3d-fallback',
    );
    const clearTouch = (emitTap) => {
      if (emitTap && this._touchStart && !this._touchDragged) {
        const last = this._touchLast || this._touchStart;
        const d = Math.hypot(last.x - this._touchStart.x, last.y - this._touchStart.y);
        if (d < 22) this.tap = { x: this._touchStart.x, y: this._touchStart.y };
      }
      this.touchActive = false;
      this.autoShot = false;
      this._touchStart = null;
      this._touchLast = null;
      this._touchId = null;
      this._touchDragged = false;
      this.touchAxis = null;
      this._touchAxisTTL = 0;
      this.virtualMove = null;
    };

    this._onTouchStart = (e) => {
      // 轻触控制区交给按钮自己的 pointer 事件；背景/HUD/版面则开始移动手势。
      if (isControlTarget(e.target)) return;
      e.preventDefault();
      // The first contact owns the gesture. Additional contacts must not reset it.
      if (this._touchId != null) return;
      const touch = e.changedTouches?.[0] || e.touches?.[0];
      if (!touch) return;
      const p = logical(touch);
      this._touchId = touch.identifier;
      this._touchDragged = false;
      this.touchActive = true;
      this.autoShot = true;
      this._touchStart = p;
      this._touchLast = p;
      this.touchAxis = { x: 0, y: 0 };
      this._touchAxisTTL = 0;
      this.virtualMove = null;
    };

    this._onTouchMove = (e) => {
      if (this._touchId == null || !this._touchStart) return;
      e.preventDefault();
      const touch = findTouch(e.touches, this._touchId)
        || findTouch(e.changedTouches, this._touchId);
      if (!touch) return;
      const cur = logical(touch);
      const prev = this._touchLast || this._touchStart;
      const stepDx = cur.x - prev.x;
      const stepDy = cur.y - prev.y;
      this._touchLast = cur;
      if (Math.hypot(cur.x - this._touchStart.x, cur.y - this._touchStart.y) >= 22) {
        this._touchDragged = true;
      }
      // 相对位移：只看这一帧手指相对上一位置的增量，不积攒绝对目标。
      // 映射为径向 8 向移动键；低速只由低速键控制。手指停下后
      // endFrame 会在下一个逻辑块释放方向键，自机随停。
      const axis = joystickAxisFromDelta(stepDx, stepDy);
      const hasDirection = axis.x !== 0 || axis.y !== 0;
      this.touchAxis = hasDirection ? axis : { x: 0, y: 0 };
      this._touchAxisTTL = hasDirection ? TOUCH_DIRECTION_HOLD_BLOCKS : 0;
      this.virtualMove = null;
      if (!this.touchSpeedLimit && hasDirection) this.mobileCheat = true;
    };

    this._onTouchEnd = (e) => {
      if (this._touchId == null || !this._touchStart) return;
      e.preventDefault();
      const primary = findTouch(e.changedTouches, this._touchId);
      // A secondary contact ending must not release the primary gesture.
      if (!primary && e.changedTouches?.length) return;
      if (primary) this._touchLast = logical(primary);
      clearTouch(e.type === 'touchend');
    };

    target.addEventListener('touchstart', this._onTouchStart, { passive: false });
    target.addEventListener('touchmove', this._onTouchMove, { passive: false });
    target.addEventListener('touchend', this._onTouchEnd, { passive: false });
    target.addEventListener('touchcancel', this._onTouchEnd, { passive: false });
  }

  /** 迁移事件面时先摘掉旧监听，避免重开/测试热点叠层。 */
  _unbindTouchSurface() {
    const old = this._touchSurface;
    if (!old) return;
    old.removeEventListener('touchstart', this._onTouchStart);
    old.removeEventListener('touchmove', this._onTouchMove);
    old.removeEventListener('touchend', this._onTouchEnd);
    old.removeEventListener('touchcancel', this._onTouchEnd);
    this._touchSurface = null;
  }

  /** Item / Bomb 触屏键；暂停键由 main.js pointer 直连 */
  bindTouchButtons(itemBtn, bombBtn) {
    if (this._touchBtnsBound) return;
    this._touchBtnsBound = true;
    const bind = (el, flag) => {
      if (!el) return;
      let activePointerId = null;
      const press = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const pointerId = e.pointerId ?? 'mouse';
        if (activePointerId != null) return;
        activePointerId = pointerId;
        e.preventDefault();
        e.stopPropagation();
        this[flag] = true;
        el.classList.add('active');
        if (e.pointerId != null) {
          try { el.setPointerCapture(e.pointerId); } catch (_) { /* detached button */ }
        }
      };
      const release = (e) => {
        const pointerId = e.pointerId ?? 'mouse';
        if (activePointerId != null && pointerId !== activePointerId) return;
        activePointerId = null;
        el.classList.remove('active');
      };
      this._touchButtonReleases.push(() => {
        activePointerId = null;
        el.classList.remove('active');
      });
      if (window.PointerEvent) {
        el.addEventListener('pointerdown', press, { passive: false });
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
        el.addEventListener('lostpointercapture', release);
      } else {
        el.addEventListener('touchstart', press, { passive: false });
        el.addEventListener('touchend', release, { passive: false });
        el.addEventListener('touchcancel', release, { passive: false });
        el.addEventListener('mousedown', press);
        el.addEventListener('mouseup', release);
        el.addEventListener('mouseleave', release);
      }
    };
    bind(itemBtn, 'itemTap');
    bind(bombBtn, 'bombTap');
  }

  /**
   * 触屏低速键：按住才进入低速。与 Item/Bomb 的一次性边沿不同，
   * 松开、pointercancel、失焦或页面隐藏时必须释放，否则会粘住低速。
   */
  bindSlowButton(slowBtn) {
    if (!slowBtn || this._slowBtnBound) return;
    this._slowBtnBound = true;
    let activePointerId = null;
    const press = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const pointerId = e.pointerId ?? 'mouse';
      if (activePointerId != null) return;
      activePointerId = pointerId;
      e.preventDefault();
      e.stopPropagation();
      this.slowTouch = true;
      slowBtn.classList.add('active');
      slowBtn.setAttribute('aria-pressed', 'true');
      if (e.pointerId != null) {
        try { slowBtn.setPointerCapture(e.pointerId); } catch (_) { /* detached button */ }
      }
    };
    const release = (e) => {
      const pointerId = e?.pointerId ?? 'mouse';
      if (activePointerId != null && pointerId !== activePointerId) return;
      activePointerId = null;
      this.slowTouch = false;
      slowBtn.classList.remove('active');
      slowBtn.setAttribute('aria-pressed', 'false');
    };
    this._touchButtonReleases.push(() => {
      activePointerId = null;
      this.slowTouch = false;
      slowBtn.classList.remove('active');
      slowBtn.setAttribute('aria-pressed', 'false');
    });
    if (window.PointerEvent) {
      slowBtn.addEventListener('pointerdown', press, { passive: false });
      slowBtn.addEventListener('pointerup', release);
      slowBtn.addEventListener('pointercancel', release);
      slowBtn.addEventListener('lostpointercapture', release);
    } else {
      slowBtn.addEventListener('touchstart', press, { passive: false });
      slowBtn.addEventListener('touchend', release, { passive: false });
      slowBtn.addEventListener('touchcancel', release, { passive: false });
      slowBtn.addEventListener('mousedown', press);
      slowBtn.addEventListener('mouseup', release);
      slowBtn.addEventListener('mouseleave', release);
    }
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
    if (this._touchAxisTTL > 0) {
      this._touchAxisTTL -= 1;
      if (this._touchAxisTTL <= 0) {
        this.touchAxis = { x: 0, y: 0 };
      }
    }
  }

  /**
   * 录像输入快照：覆盖 Input 各查询方法所读的全部状态。
   * 字段名与 js/replay.js 约定一致（d,p,m,t,v,a,b,i,l,sl,tl）。
   */
  snapshot() {
    return {
      d: [...this.down],
      p: [...this.pressed],
      m: this._effectiveMoveCodes(),
      t: this.tap ? [this.tap.x, this.tap.y] : null,
      v: this.virtualMove ? [this.virtualMove.x, this.virtualMove.y] : null,
      a: !!this.autoShot,
      b: !!this.bombTap,
      i: !!this.itemTap,
      l: !!this.shotLatched,
      /** 触屏低速键按住（键盘 Shift 已在 d 中，回放两条路径都读） */
      sl: !!this.slowTouch,
      /** 本帧移动端相对移动是否限速（逐帧记录以支持中途改设置仍可精确回放） */
      tl: this.touchSpeedLimit !== false,
    };
  }

  /**
   * 录像录制帧（H7）：直接把当前输入编码成紧凑数组。
   * 第 0 位是 steps 占位（调用方在知道本块步数后写回），其余见 replayCodec。
   */
  recordSnapshot() {
    const snap = this.snapshot();
    const frame = encodeReplayFrame(snap, replayKeyTable(this.keys), this.moveAxis());
    frame[0] = 1;
    return frame;
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
    return this.slowTouch
      || this.isDown('ShiftLeft') || this.isDown('ShiftRight');
  }

  /**
   * 本帧有效移动键：触屏摇杆优先于键盘；摇杆居中时返回空集（停止移动）。
   * 回放沿用既有 m/axis 记录，无需新增帧字段。
   */
  _effectiveMoveCodes() {
    if (this.touchActive && this.touchAxis) return touchAxisToMoveCodes(this.touchAxis);
    return [...this._moveSeq];
  }

  /**
   * 移动轴：触屏摇杆按 8 向数字键处理；键盘同轴后按者优先，对角归一化。
   */
  moveAxis() {
    return moveAxisFromSeq(this._effectiveMoveCodes());
  }
}
