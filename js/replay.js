/**
 * 录像：输入快照 RLE 编解码 + 顺序播放游标 + 录像对象组装。
 * 快照字段与 Input.snapshot() 约定一致：d,p,m,t,v,a,b,i,l。
 * 帧数据结构：{ s: steps(0..3), i: snapshot }；仅 s>0 帧进入录像。
 */
import { REPLAY_VERSION } from './config.js';
import { moveAxisFromSeq } from './input.js';

/**
 * 录像 id 生成用真实随机：模块加载时捕获，避免在暂停菜单（键盘 Z 保存）时
 * 于 withSeededRng 作用域内消费种子流，导致后续帧种子错位 → 回放走样。
 */
const ID_RANDOM = Math.random.bind(Math);

function eqArr(a, b) {
  const al = a ? a.length : 0;
  const bl = b ? b.length : 0;
  if (al !== bl) return false;
  for (let i = 0; i < al; i++) if (a[i] !== b[i]) return false;
  return true;
}

function sameSnap(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.a !== b.a || a.b !== b.b || a.i !== b.i || a.l !== b.l) return false;
  if (!eqArr(a.d, b.d) || !eqArr(a.p, b.p) || !eqArr(a.m, b.m)) return false;
  if ((a.t ? a.t[0] : null) !== (b.t ? b.t[0] : null)) return false;
  if ((a.t ? a.t[1] : null) !== (b.t ? b.t[1] : null)) return false;
  if ((a.v ? a.v[0] : null) !== (b.v ? b.v[0] : null)) return false;
  if ((a.v ? a.v[1] : null) !== (b.v ? b.v[1] : null)) return false;
  return true;
}

/** 原始帧 [{s,i}] → RLE runs [[n,s,i], ...]（连续相同 (s,i) 合并） */
export function encodeRuns(frames) {
  const runs = [];
  for (const f of frames) {
    const last = runs[runs.length - 1];
    if (last && last[1] === f.s && sameSnap(last[2], f.i)) last[0]++;
    else runs.push([1, f.s, f.i]);
  }
  return runs;
}

/** RLE runs → 顺序播放游标 */
export function createPlayer(runs) {
  let run = 0;
  let pos = 0;
  return {
    reset() { run = 0; pos = 0; },
    /** @returns {{steps:number, snapshot:object}|null} */
    next() {
      while (run < runs.length) {
        const r = runs[run];
        if (pos < r[0]) {
          pos++;
          return { steps: r[1], snapshot: r[2] };
        }
        run++;
        pos = 0;
      }
      return null;
    },
  };
}

export function makeReplayId() {
  return 'r' + Date.now().toString(36) + ID_RANDOM().toString(36).slice(2, 8);
}

/** 组装录像对象（含 RLE 编码后的 frames） */
export function buildReplay({ header, frames, endState, partial }) {
  return {
    replayId: makeReplayId(),
    version: REPLAY_VERSION,
    date: Date.now(),
    ...header,
    partial: !!partial,
    endState,
    frames: encodeRuns(frames),
  };
}

export function validateReplay(data) {
  if (!(data && data.version === REPLAY_VERSION && Array.isArray(data.frames) && data.seed != null)) {
    return false;
  }
  // Validate every frame run as [count, steps, snapshot]
  for (const run of data.frames) {
    if (!Array.isArray(run) || run.length !== 3) return false;
    const [count, steps, snapshot] = run;
    if (!Number.isSafeInteger(count) || !Number.isSafeInteger(steps)) return false;
    if (!snapshot || typeof snapshot !== 'object') return false;
    if (!Array.isArray(snapshot.d) || !Array.isArray(snapshot.p) || !Array.isArray(snapshot.m)) return false;
    if (snapshot.t != null && (!Array.isArray(snapshot.t) || snapshot.t.length !== 2 || !Number.isFinite(snapshot.t[0]) || !Number.isFinite(snapshot.t[1]))) return false;
    if (snapshot.v != null && (!Array.isArray(snapshot.v) || snapshot.v.length !== 2 || !Number.isFinite(snapshot.v[0]) || !Number.isFinite(snapshot.v[1]))) return false;
  }
  return true;
}

/** 录像 → JSON 文本（导出） */
export function serializeReplay(replay) {
  return JSON.stringify(replay);
}

/** JSON 文本 → 录像对象（导入）；解析/校验失败返回 { ok:false, error } */
export function deserializeReplay(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: '不是有效的 JSON 文件' };
  }
  if (!validateReplay(data)) return { ok: false, error: '录像版本不符或数据损坏' };
  return { ok: true, replay: data };
}

/**
 * 回放输入：实现与 Input 相同的查询语义，但从「当前快照」读取。
 * 键位（shot/bomb/item）与 shotToggleMode 来自录像头部；shotLatched 由 updateShotToggle 维护。
 * 覆盖游戏逻辑（gameCombat / _handleGlobalInput / Player.update）所读的全部接口。
 */
export function createReplayInput() {
  return {
    keys: { shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' },
    shotToggleMode: false,
    shotLatched: false,
    autoShot: false,
    bombTap: false,
    itemTap: false,
    virtualMove: null,
    tap: null,
    _snap: null,

    /** 每帧覆盖为录像快照 */
    set(snap) {
      this._snap = snap || {};
      this.autoShot = !!this._snap.a;
      this.bombTap = !!this._snap.b;
      this.itemTap = !!this._snap.i;
      this.shotLatched = !!this._snap.l;
      this.virtualMove = this._snap.v ? { x: this._snap.v[0], y: this._snap.v[1] } : null;
      this.tap = this._snap.t ? { x: this._snap.t[0], y: this._snap.t[1] } : null;
    },

    isDown(code) { return (this._snap.d || []).includes(code); },
    justPressed(code) { return (this._snap.p || []).includes(code); },
    moveAxis() { return moveAxisFromSeq(this._snap.m || []); },
    slowHeld() { return this.isDown('ShiftLeft') || this.isDown('ShiftRight'); },
    shotHeld() {
      if (this.shotToggleMode) return this.autoShot || this.shotLatched;
      return this.autoShot || this.isDown(this.keys.shot);
    },
    shotPressed() { return this.justPressed(this.keys.shot); },
    bombPressed() { return this.justPressed(this.keys.bomb) || this.bombTap; },
    itemPressed() { return this.justPressed(this.keys.item) || this.itemTap; },
    consumePause() { return this.justPressed('Escape'); },
    updateShotToggle() {
      if (!this.shotToggleMode) return;
      if (this.justPressed(this.keys.shot)) this.shotLatched = !this.shotLatched;
    },
    endFrame() {},
    resetShotLatch() { this.shotLatched = false; },
    applySettings() {},
    bindCanvas() {},
    bindTouchButtons() {},
  };
}
