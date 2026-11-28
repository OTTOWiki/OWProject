/**
 * 录像：RNG 确定性、快照 RLE 往返、回放输入语义。
 */
import { createRng, withSeededRng, withRealRandom } from '../js/rng.js';
import {
  encodeRuns, createPlayer, buildReplay, validateReplay, validateLegacyReplay, validateAnyReplay,
  createReplayInput, makeReplayId, serializeReplay, deserializeReplay, replayVersionOf,
} from '../js/replay.js';
import {
  encodeReplayFrame, decodeReplayFrame, replayKeyTable, sameReplayFrame, isCompactReplayFrame,
} from '../js/replayCodec.js';
import { REPLAY_VERSION } from '../js/config.js';
import { moveAxisFromSeq } from '../js/input.js';
import { test, assert, assertEqual } from './assert.js';

const EMPTY_SNAP = { d: [], p: [], m: [], t: null, v: null, a: 0, b: 0, i: 0, l: 0, sl: 0, tl: 0 };

test('createRng：同种子序列一致且 ∈[0,1)', () => {
  const a = createRng(123);
  const b = createRng(123);
  for (let i = 0; i < 100; i++) {
    const x = a();
    const y = b();
    assertEqual(x, y);
    assert(x >= 0 && x < 1);
  }
});

test('withSeededRng：作用域内替换并恢复', () => {
  const orig = Math.random;
  const next = createRng(42);
  let inside = null;
  withSeededRng(() => { inside = Math.random; }, next);
  assertEqual(Math.random, orig);
  assert(inside === next);
});

test('withRealRandom：种子块内换回真实随机（不消费种子流）', () => {
  const next = createRng(7);
  let seededFn = null;
  let realFn = null;
  withSeededRng(() => {
    seededFn = Math.random;
    withRealRandom(() => { realFn = Math.random; });
  }, next);
  assert(seededFn === next);
  assert(realFn !== next);
  assert(typeof realFn() === 'number');
});

test('async 随机：await 后的 Math.random 用真实随机、不消费种子流', async () => {
  const real = Math.random;
  const next = createRng(5);
  let syncFn = null;
  let afterAwait = null;
  await withSeededRng(async () => {
    syncFn = Math.random;
    await Promise.resolve();
    afterAwait = Math.random;
  }, next);
  assert(syncFn === next);
  assert(afterAwait === real);
});

test('makeReplayId：用真实随机、不消费种子流', () => {
  const baseline = (() => {
    const next = createRng(31);
    return [next(), next(), next()].join(',');
  })();
  const next2 = createRng(31);
  const withId = [];
  withSeededRng(() => {
    makeReplayId();
    withId.push(next2(), next2(), next2());
  }, next2);
  assertEqual(withId.join(','), baseline);
});

test('serializeReplay / deserializeReplay 往返', () => {
  const r = buildReplay({
    header: {
      seed: 7, playerId: 'shama', difficultyId: 'hard', mode: 'story',
      route: 'A', startChapter: 1, lives: null, singleChapter: false,
      unstable: true, shotToggleMode: true,
      keys: { shot: 'KeyJ', bomb: 'KeyX', item: 'KeyC' },
    },
    frames: [(() => {
      const table = replayKeyTable({ shot: 'KeyJ', bomb: 'KeyX', item: 'KeyC' });
      const frame = encodeReplayFrame(
        { d: ['KeyJ'], p: [], m: ['ArrowLeft'], t: [3, 4], v: null, a: 1, b: 0, i: 0, l: 0 },
        table,
        { x: -1, y: 0 },
      );
      frame[0] = 2;
      return { s: 2, i: frame };
    })()],
    endState: { score: 12345, cleared: true, stageReached: 'Stage 3', chapterIndex: 20 },
    partial: true,
  });
  const text = serializeReplay(r);
  const res = deserializeReplay(text);
  assert(res.ok);
  assert(validateReplay(res.replay));
  assertEqual(res.replay.seed, 7);
  assertEqual(res.replay.shotToggleMode, true);
  assertEqual(res.replay.endState.score, 12345);
  assertEqual(res.replay.frames.length, r.frames.length);
  // 反序列化后再序列化应一致
  assertEqual(serializeReplay(res.replay), text);
  // 坏输入
  assert(!deserializeReplay('not json').ok);
  assert(!deserializeReplay('{"version":999,"frames":[],"seed":1}').ok);
});

test('encodeRuns / createPlayer 往返（含 RLE 合并）', () => {
  const snap = { ...EMPTY_SNAP, d: ['KeyZ'] };
  const left = { ...EMPTY_SNAP, m: ['ArrowLeft'] };
  const frames = [
    { s: 1, i: snap },
    { s: 1, i: snap },
    { s: 2, i: left },
    { s: 1, i: snap },
  ];
  const runs = encodeRuns(frames);
  assertEqual(runs.length, 3);
  assertEqual(runs[0][0], 2);
  assertEqual(runs[0][1], 1);
  assertEqual(runs[1][0], 1);
  assertEqual(runs[1][1], 2);
  assertEqual(runs[2][0], 1);

  const p = createPlayer(runs);
  const out = [];
  let f;
  while ((f = p.next())) out.push({ s: f.steps, m: f.snapshot.m });
  assertEqual(out.length, 4);
  assertEqual(out[0].s, 1);
  assertEqual(out[2].s, 2);
  assertEqual(out[2].m[0], 'ArrowLeft');
});

test('createPlayer：不修改传入 runs（消费后录像仍可通过校验/可重开）', () => {
  const snap = { ...EMPTY_SNAP, d: ['KeyZ'] };
  const runs = encodeRuns([
    { s: 1, i: snap },
    { s: 2, i: { ...EMPTY_SNAP, m: ['ArrowLeft'] } },
  ]);
  const before = runs.map((r) => r.length);
  const p = createPlayer(runs, { keys: { shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' } });
  while (p.next()) { /* 消费全部帧 */ }
  assertEqual(runs.map((r) => r.length).join(','), before.join(','), 'runs 长度不被解码缓存改写');
  const keys = { shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' };
  const compact = encodeReplayFrame(snap, replayKeyTable(keys));
  const replay = buildReplay({
    header: {
      seed: 5, playerId: 'yinquan', difficultyId: 'normal', mode: 'story',
      route: null, startChapter: 1, lives: null, singleChapter: false,
      unstable: true, shotToggleMode: false, keys,
    },
    frames: [{ s: 1, i: compact }],
    endState: { score: 1 },
    partial: true,
  });
  const player = createPlayer(replay.frames, { keys: replay.keys });
  player.next();
  assert(validateAnyReplay(replay), '消费过快照缓存后仍应通过 validateAnyReplay（R 重开依赖）');
});

test('buildReplay / validateReplay', () => {
  const r = buildReplay({
    header: {
      seed: 5, playerId: 'yinquan', difficultyId: 'normal', mode: 'story',
      route: null, startChapter: 1, lives: null, singleChapter: false,
      unstable: true, shotToggleMode: false,
      keys: { shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' },
    },
    frames: [(() => {
      const table = replayKeyTable({ shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' });
      const frame = encodeReplayFrame({ ...EMPTY_SNAP }, table, { x: 0, y: 0 });
      frame[0] = 1;
      return { s: 1, i: frame };
    })()],
    endState: { score: 100, cleared: false, stageReached: 'Stage 1', chapterIndex: 0 },
    partial: false,
  });
  assert(validateReplay(r));
  assertEqual(r.seed, 5);
  assert(!r.partial);
  assert(Array.isArray(r.frames));
  assert(!validateReplay({ version: 999, frames: [], seed: 1 }));
});

test('moveAxisFromSeq：对向取后者 + 对角归一化', () => {
  assertEqual(moveAxisFromSeq(['ArrowLeft']).x, -1);
  assertEqual(moveAxisFromSeq(['ArrowLeft', 'ArrowRight']).x, 1);
  const diag = moveAxisFromSeq(['ArrowLeft', 'ArrowUp']);
  assertEqual(diag.x, -1 / Math.SQRT2);
  assertEqual(diag.y, -1 / Math.SQRT2);
});

test('createReplayInput：快照语义（moveAxis / 单击发射 / bombTap）', () => {
  const ri = createReplayInput();
  ri.keys = { shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' };
  ri.shotToggleMode = true;
  ri.set({ d: ['KeyZ', 'ArrowLeft'], p: ['KeyZ'], m: ['ArrowLeft'], t: null, v: null, a: 0, b: 1, i: 0, l: 0 });
  assert(ri.bombPressed());
  assertEqual(ri.moveAxis().x, -1);
  assertEqual(ri.slowHeld(), false);
  assert(!ri.shotHeld());
  ri.updateShotToggle();
  assert(ri.shotHeld());
});


test('H7 紧凑帧：掩码 / flags / 轴 / tap / virtual 往返', () => {
  const keys = { shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' };
  const table = replayKeyTable(keys);
  assert(table.includes('KeyZ') && table.includes('ShiftLeft'));

  const snap = {
    ...EMPTY_SNAP, d: ['ArrowLeft', 'KeyZ'], p: ['KeyZ'], a: true, l: true,
    t: [12.5, 34.25],
  };
  const frame = encodeReplayFrame(snap, table, { x: -1, y: 0 });
  assert(isCompactReplayFrame(frame));
  const back = decodeReplayFrame(frame, table);
  assertEqual(back.d.join(','), 'ArrowLeft,KeyZ');
  assertEqual(back.p.join(','), 'KeyZ');
  assertEqual(back.m.join(','), 'ArrowLeft');
  assertEqual(back.t.join(','), '12.5,34.25');
  assert(back.a && back.l && !back.b && !back.i);

  const virtual = encodeReplayFrame({ ...EMPTY_SNAP, b: true, v: [100.5, 200.25] }, table, { x: 0, y: 1 });
  const vb = decodeReplayFrame(virtual, table);
  assertEqual(vb.v.join(','), '100.5,200.25');
  assertEqual(vb.m.join(','), 'ArrowDown');
  assert(vb.b);

  // 移动端低速/限速标志：新帧写入 flags 位 8/9；旧帧缺位时解码为 false。
  const mobile = encodeReplayFrame({ ...EMPTY_SNAP, sl: true, tl: true }, table, { x: 0, y: 0 });
  const mb = decodeReplayFrame(mobile, table);
  assert(mb.sl && mb.tl);
  const old = decodeReplayFrame([1, 0, 0, 0], table);
  assert(!old.sl && !old.tl);
});

test('H7 紧凑帧：对角线移动轴按符号往返（moveAxis 返回 ±1/√2）', () => {
  const keys = { shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' };
  const table = replayKeyTable(keys);
  for (const pair of [
    ['ArrowLeft', 'ArrowUp'], ['ArrowLeft', 'ArrowDown'],
    ['ArrowRight', 'ArrowUp'], ['ArrowRight', 'ArrowDown'],
  ]) {
    const axis = moveAxisFromSeq(pair);
    const back = decodeReplayFrame(encodeReplayFrame({ ...EMPTY_SNAP }, table, axis), table);
    const again = moveAxisFromSeq(back.m);
    assertEqual(again.x, axis.x, `${pair.join('+')} x`);
    assertEqual(again.y, axis.y, `${pair.join('+')} y`);
  }
});

test('回放输入：触屏低速与逐帧限速语义', () => {
  const ri = createReplayInput();
  ri.set({ ...EMPTY_SNAP, sl: true, tl: true });
  assert(ri.slowHeld());
  assertEqual(ri.touchSpeedLimit, true);
  ri.set({ ...EMPTY_SNAP, sl: false, tl: false });
  assert(!ri.slowHeld());
  assertEqual(ri.touchSpeedLimit, false);
});

test('H7 紧凑帧参与 RLE 合并', () => {
  const table = replayKeyTable({ shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' });
  const a = encodeReplayFrame({ ...EMPTY_SNAP }, table, { x: 0, y: 0 });
  a[0] = 1;
  const b = encodeReplayFrame({ ...EMPTY_SNAP, a: true }, table, { x: 0, y: 0 });
  b[0] = 1;
  const runs = encodeRuns([{ s: 1, i: a }, { s: 1, i: a }, { s: 1, i: b }]);
  assertEqual(runs.length, 2);
  assertEqual(runs[0][0], 2);
  assert(sameReplayFrame(runs[0][2], a));
});

test('H7 v2 校验：steps 与帧内 steps 必须一致', () => {
  const table = replayKeyTable({ shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' });
  const frame = encodeReplayFrame({ ...EMPTY_SNAP }, table, { x: 0, y: 0 });
  frame[0] = 1;
  const base = {
    version: REPLAY_VERSION, seed: 1, playerId: 'yinquan', mode: 'story',
    difficultyId: 'normal', startChapter: 1,
    frames: [[1, 1, frame]],
  };
  assert(validateReplay(base));
  const bad = { ...base, frames: [[1, 2, frame]] };
  assert(!validateReplay(bad));
});

test('H7/H8 旧格式冻结分支仍可读，新字段随 v2 携带', () => {
  const legacy = {
    version: 1, seed: 2, playerId: 'shama', mode: 'story',
    difficultyId: 'hard', startChapter: 1,
    frames: [[1, 1, { ...EMPTY_SNAP }]],
    endState: { score: 10 },
  };
  assertEqual(replayVersionOf(legacy), 1);
  assert(validateLegacyReplay(legacy));
  assert(validateAnyReplay(legacy));
  assert(!validateReplay(legacy), '旧格式不算新格式');

  const table = replayKeyTable({ shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' });
  const frame = encodeReplayFrame({ ...EMPTY_SNAP }, table, { x: 0, y: 0 });
  frame[0] = 1;
  const letters = [{ chapterId: 3, name: '三章', attempts: 1, captures: 1, bestTimeSec: 12 }];
  const r = buildReplay({
    header: {
      seed: 3, playerId: 'yinquan', mode: 'story', difficultyId: 'normal',
      startChapter: 1, keys: { shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' },
    },
    frames: [{ s: 1, i: frame }],
    endState: { score: 1, letters },
  });
  assertEqual(r.version, REPLAY_VERSION);
  assertEqual(r.endState.letters[0].bestTimeSec, 12);
  assert(validateAnyReplay(JSON.parse(serializeReplay(r))));
});

/* ========== 审计修复回归（#2 / #35 / #36 / #40） ========== */

const KEY_TABLE_DEFAULT = replayKeyTable({ shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' });
const V2_HEADER = {
  version: REPLAY_VERSION,
  seed: 1,
  playerId: 'yinquan',
  difficultyId: 'normal',
  mode: 'story',
  startChapter: 1,
};

/** 构造一条通过头/帧校验的 v2 录像（可覆盖头字段/帧 runs 做坏样本） */
function v2Replay(overrides = {}) {
  const frame = encodeReplayFrame({ ...EMPTY_SNAP }, KEY_TABLE_DEFAULT, { x: 0, y: 0 });
  frame[0] = 1;
  return { ...V2_HEADER, frames: [[1, 1, frame]], ...overrides };
}

/** 动态载入 game.js（Node 无 DOM：构造器需要页面元素，测试只用原型方法） */
async function loadGameClass() {
  const hadWindow = typeof globalThis.window !== 'undefined';
  const prevWindow = globalThis.window;
  if (!hadWindow) globalThis.window = { addEventListener() {}, removeEventListener() {} };
  const hadDocument = typeof globalThis.document !== 'undefined';
  const prevDocument = globalThis.document;
  if (!hadDocument) globalThis.document = { getElementById: () => null, querySelector: () => null, addEventListener() {} };
  try {
    return (await import('../js/game.js')).Game;
  } finally {
    if (hadWindow) globalThis.window = prevWindow; else delete globalThis.window;
    if (hadDocument) globalThis.document = prevDocument; else delete globalThis.document;
  }
}

test('#2 录像头契约：未知 playerId / difficultyId、非法 mode、startChapter 一律拒绝', () => {
  assert(validateReplay(v2Replay()));
  for (const bad of [
    { playerId: 'nobody' },
    { playerId: '' },
    { playerId: null },
    { difficultyId: 'hell' },
    { difficultyId: null },
    { mode: 'debug' },
    { mode: undefined },
    { startChapter: 0 },
    { startChapter: -3 },
    { startChapter: 1.5 },
    { startChapter: '1' },
  ]) {
    const tag = JSON.stringify(bad);
    assert(!validateReplay(v2Replay(bad)), 'validateReplay 应拒 ' + tag);
    assert(!validateAnyReplay(v2Replay(bad)), 'validateAnyReplay 应拒 ' + tag);
  }
  // 导入坏录像必须落在失败分支（录像屏/主流程报错），不能静默播放
  assert(!deserializeReplay(serializeReplay(v2Replay({ playerId: 'nobody' }))).ok);
  // 合法的 extra 难度（EX 录像）仍应通过
  assert(validateReplay(v2Replay({ difficultyId: 'extra', startChapter: 129 })));
});

test('#2 帧契约：steps/count 非正数与超大 count 被拒', () => {
  const make = (count, steps) => ({
    ...V2_HEADER,
    frames: [[count, steps, [steps, 0, 0, 0]]],
  });
  assert(validateReplay(make(1, 1)));
  assert(!validateReplay(make(1, 0)), 'steps:0 会空转回放循环');
  assert(!validateReplay(make(1, -1)), '负数 steps');
  assert(!validateReplay(make(0, 1)), 'count 必须 ≥1');
  assert(!validateReplay(make(-1, 1)), '负数 count');
  assert(!validateReplay(make(1_000_000_001, 1)), '超大 count');
});

test('#2 v1 旧格式只补防御校验：header 合法 + count/steps ≥1', () => {
  const snap = { ...EMPTY_SNAP };
  const base = {
    version: 1, seed: 2, playerId: 'shama', difficultyId: 'hard', mode: 'story',
    startChapter: 1, frames: [[1, 1, snap]],
  };
  assert(validateLegacyReplay(base));
  assert(!validateLegacyReplay({ ...base, frames: [[1, 0, snap]] }));
  assert(!validateLegacyReplay({ ...base, frames: [[1, -1, snap]] }));
  assert(!validateLegacyReplay({ ...base, frames: [[0, 1, snap]] }));
  assert(!validateLegacyReplay({ ...base, frames: [[-2, 1, snap]] }));
  assert(!validateLegacyReplay({ ...base, playerId: 'nobody' }));
  assert(!validateLegacyReplay({ ...base, difficultyId: 'hell' }));
  assert(!validateAnyReplay({ ...base, frames: [[1, -1, snap]] }));
});

test('#35 录制中切换“单击发射”不改变本局输入模式；回放期间不应用', async () => {
  const Game = await loadGameClass();
  const settings = {
    shotToggle: true, musicVolume: 0.5, playerBulletOpacity: 0.3,
    mobileSpeedLimit: true, fpsLimit: 0,
  };
  const makeGame = (over = {}) => {
    const g = Object.create(Game.prototype);
    g.recording = true;
    g.replaying = false;
    g._recordFrames = [{ s: 1, i: [] }];
    g.realInput = {
      shotToggleMode: false,
      applied: null,
      applySettings(s) { this.applied = s; },
    };
    g.audio = { setMusicVolume() {} };
    Object.assign(g, over);
    return g;
  };

  // 已开始录制：忽略切换，本局保持开录时的模式（录像头与帧语义一致）
  const recording = makeGame();
  Game.prototype.applySettings.call(recording, settings);
  assertEqual(recording.realInput.applied.shotToggle, false, '录制中应保持原输入模式');

  // 新局开局（尚无录制帧）：应用保存的设置
  const fresh = makeGame({ _recordFrames: [] });
  Game.prototype.applySettings.call(fresh, settings);
  assertEqual(fresh.realInput.applied.shotToggle, true, '新局应应用保存的设置');

  // 回放期间：不应用该设置（回放输入模式来自录像头）
  const replaying = makeGame({ recording: false, replaying: true });
  Game.prototype.applySettings.call(replaying, settings);
  assertEqual(replaying.realInput.applied.shotToggle, false, '回放中不应切换输入模式');
});

test('#36 保存录像防重：成功后重复保存早退，失败可重试', async () => {
  const Game = await loadGameClass();
  const hadLocal = 'localStorage' in globalThis;
  const prevLocal = globalThis.localStorage;
  const hadIdb = 'indexedDB' in globalThis;
  const prevIdb = globalThis.indexedDB;
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
  };
  let puts = 0;
  let failOpen = false;
  globalThis.indexedDB = {
    open() {
      if (failOpen) throw new Error('storage disabled');
      const req = {
        result: {
          objectStoreNames: { contains: () => true },
          transaction: () => ({
            objectStore: () => ({
              put() {
                puts += 1;
                const done = {};
                setTimeout(() => done.onsuccess?.(), 0);
                return done;
              },
            }),
          }),
          close() {},
        },
      };
      setTimeout(() => { req.onupgradeneeded?.(); req.onsuccess?.(); }, 0);
      return req;
    },
  };
  try {
    const makeGame = () => {
      const g = Object.create(Game.prototype);
      g.recording = true;
      g.replaying = false;
      g._recordFrames = [{ s: 1, i: [1, 0, 0, 0] }];
      g._mobileCheat = false;
      g.realInput = {
        shotToggleMode: false,
        keys: { shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' },
        mobileCheat: false,
      };
      g._replaySeed = 5;
      g.playerId = 'yinquan';
      g.difficultyId = 'normal';
      g.mode = 'story';
      g.routeChoice = null;
      g._startChapterId = 1;
      g._startLives = null;
      g.singleChapter = false;
      g.practiceUnstable = true;
      g.mobileSpeedLimit = true;
      g.score = 100;
      g.stats = { time: 1 };
      g.letterLog = [];
      g.chapters = [{ id: 1, stage: 1, name: '一章' }];
      g.chapterIndex = 0;
      g._replaySaved = false;
      g._replaySaving = false;
      return g;
    };

    const g = makeGame();
    const first = await Game.prototype._saveReplay.call(g, { partial: true });
    assert(first.ok, '首次保存成功');
    const second = await Game.prototype._saveReplay.call(g, { partial: true });
    assert(!second.ok);
    assertEqual(second.reason, 'saved');
    assertEqual(puts, 1, 'IndexedDB 只写入一份帧数据');

    failOpen = true;
    const g2 = makeGame();
    const failed = await Game.prototype._saveReplay.call(g2, { partial: true });
    assert(!failed.ok);
    assertEqual(failed.reason, 'store');
    failOpen = false;
    const retried = await Game.prototype._saveReplay.call(g2, { partial: true });
    assert(retried.ok, '写盘失败后允许重试');
  } finally {
    if (hadLocal) globalThis.localStorage = prevLocal; else delete globalThis.localStorage;
    if (hadIdb) globalThis.indexedDB = prevIdb; else delete globalThis.indexedDB;
  }
});

test('#40 stop() 释放录制/回放缓冲', async () => {
  const Game = await loadGameClass();
  const hadDoc = 'document' in globalThis;
  const prevDoc = globalThis.document;
  const hadRaf = 'cancelAnimationFrame' in globalThis;
  const prevRaf = globalThis.cancelAnimationFrame;
  globalThis.document = { getElementById: () => null };
  globalThis.cancelAnimationFrame = () => {};
  try {
    const g = Object.create(Game.prototype);
    g.running = true;
    g.raf = 1;
    g.input = { resetShotLatch() {} };
    g.realInput = { _releaseTransientInput() {} };
    g.audio = { stopMusic() {} };
    g.el = { bossEnemyMarker: null };
    g._recordFrames = [{ s: 1 }, { s: 2 }];
    g._replayPlayer = { next() {} };
    g.replay = { replayId: 'r1' };
    Game.prototype.stop.call(g);
    assertEqual(g.running, false);
    assertEqual(g._recordFrames.length, 0, '录制帧缓冲释放');
    assertEqual(g._replayPlayer, null, '回放游标释放');
    assertEqual(g.replay, null, '录像对象释放');
  } finally {
    if (hadDoc) globalThis.document = prevDoc; else delete globalThis.document;
    if (hadRaf) globalThis.cancelAnimationFrame = prevRaf; else delete globalThis.cancelAnimationFrame;
  }
});
