/**
 * 录像输入帧的紧凑编码（H7，格式 v2）。
 *
 * 每帧是定长数组 `[steps, downMask, pressMask, flags, ...tapVirtual]`：
 * - downMask / pressMask：位掩码，位序由 `replayKeyTable(keys)` 决定
 * - flags：a=1 b=2 i=4 l=8；位 4-5 为 x 轴（1=左 2=右），位 6-7 为 y 轴（1=上 2=下）
 * - 仅当 tap / virtualMove 存在时追加 `[tapX,tapY,vX,vY]`（缺项 null），保持触摸回放精确
 *
 * 解码结果与旧版 `Input.snapshot()` 的对象形状一致，回放输入无需改语义。
 */

/** 固定参与录像的键位：对局、对话、路线选择、暂停等逻辑会查询的 code */
export const REPLAY_KEY_CODES = [
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'KeyA', 'KeyD', 'KeyW', 'KeyS',
  'ShiftLeft', 'ShiftRight',
  'Enter', 'Space', 'Escape',
  'KeyZ', 'KeyX', 'KeyC', 'KeyR', 'KeyQ', 'KeyF',
];

/**
 * 录像使用的键位表：固定表 + 本局自定义 shot/bomb/item（去重）。
 * 录制与回放必须用同一张表；表本身由 header.keys 决定。
 */
export function replayKeyTable(keys = {}) {
  const table = [...REPLAY_KEY_CODES];
  for (const code of [keys.shot, keys.bomb, keys.item]) {
    if (typeof code === 'string' && code && !table.includes(code)) table.push(code);
  }
  return table;
}

const AXIS_ENCODE = { '-1': 1, 0: 0, 1: 2 };

function masksFor(codes, table) {
  let mask = 0;
  if (!codes) return 0;
  for (const code of codes) {
    const idx = table.indexOf(code);
    if (idx >= 0) mask |= (1 << idx);
  }
  return mask;
}

/**
 * @param {object} snap `Input.snapshot()` 形状
 * @param {string[]} table `replayKeyTable()`
 * @param {{x:number,y:number}} axis `moveAxis()` 结果（-1/0/1）
 * @returns {number[]} 紧凑帧
 */
export function encodeReplayFrame(snap, table, axis = { x: 0, y: 0 }) {
  const flags = (snap.a ? 1 : 0) | (snap.b ? 2 : 0) | (snap.i ? 4 : 0) | (snap.l ? 8 : 0)
    | ((AXIS_ENCODE[axis.x] ?? 0) << 4) | ((AXIS_ENCODE[axis.y] ?? 0) << 6);
  const frame = [
    Number.isSafeInteger(snap.s) ? snap.s : 1,
    masksFor(snap.d, table),
    masksFor(snap.p, table),
    flags,
  ];
  if (snap.t || snap.v) {
    frame.push(snap.t ? snap.t[0] : null, snap.t ? snap.t[1] : null,
      snap.v ? snap.v[0] : null, snap.v ? snap.v[1] : null);
  }
  return frame;
}

const AXIS_DECODE = [0, -1, 1];

/**
 * @param {number[]} frame 紧凑帧
 * @param {string[]} table
 * @returns {object} `Input.snapshot()` 形状（含 m 的规范化表示）
 */
export function decodeReplayFrame(frame, table) {
  const flags = frame[3] | 0;
  const d = [];
  const p = [];
  const downMask = frame[1] | 0;
  const pressMask = frame[2] | 0;
  for (let i = 0; i < table.length; i += 1) {
    const bit = 1 << i;
    if (downMask & bit) d.push(table[i]);
    if (pressMask & bit) p.push(table[i]);
  }
  const ax = AXIS_DECODE[(flags >> 4) & 3] ?? 0;
  const ay = AXIS_DECODE[(flags >> 6) & 3] ?? 0;
  const m = [];
  if (ax < 0) m.push('ArrowLeft');
  else if (ax > 0) m.push('ArrowRight');
  if (ay < 0) m.push('ArrowUp');
  else if (ay > 0) m.push('ArrowDown');
  const hasExtra = frame.length === 8;
  return {
    d,
    p,
    m,
    t: hasExtra && frame[4] != null ? [frame[4], frame[5]] : null,
    v: hasExtra && frame[6] != null ? [frame[6], frame[7]] : null,
    a: !!(flags & 1),
    b: !!(flags & 2),
    i: !!(flags & 4),
    l: !!(flags & 8),
  };
}

/** 两帧紧凑帧是否等价（RLE 合并用；含 steps） */
export function sameReplayFrame(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

/** 紧凑帧的基础结构校验（不含业务字段） */
export function isCompactReplayFrame(frame) {
  if (!Array.isArray(frame)) return false;
  if (frame.length !== 4 && frame.length !== 8) return false;
  if (!Number.isSafeInteger(frame[0]) || frame[0] < 0) return false;
  for (let i = 1; i < 4; i += 1) if (!Number.isSafeInteger(frame[i])) return false;
  for (let i = 4; i < frame.length; i += 1) {
    if (frame[i] == null) continue;
    if (!Number.isFinite(frame[i])) return false;
  }
  return true;
}
