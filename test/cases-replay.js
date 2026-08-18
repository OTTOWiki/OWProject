/**
 * 录像：RNG 确定性、快照 RLE 往返、回放输入语义。
 */
import { createRng, withSeededRng, withRealRandom } from '../js/rng.js';
import {
  encodeRuns, createPlayer, buildReplay, validateReplay, createReplayInput, makeReplayId,
  serializeReplay, deserializeReplay,
} from '../js/replay.js';
import { moveAxisFromSeq } from '../js/input.js';
import { test, assert, assertEqual } from './assert.js';

const EMPTY_SNAP = { d: [], p: [], m: [], t: null, v: null, a: 0, b: 0, i: 0, l: 0 };

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
    frames: [{ s: 2, i: { d: ['KeyJ'], p: [], m: ['ArrowLeft'], t: [3, 4], v: null, a: 1, b: 0, i: 0, l: 0 } }],
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

test('buildReplay / validateReplay', () => {
  const r = buildReplay({
    header: {
      seed: 5, playerId: 'yinquan', difficultyId: 'normal', mode: 'story',
      route: null, startChapter: 1, lives: null, singleChapter: false,
      unstable: true, shotToggleMode: false,
      keys: { shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' },
    },
    frames: [{ s: 1, i: { ...EMPTY_SNAP } }],
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
