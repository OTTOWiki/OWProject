/**
 * 音频：BGM 按需解码（启动不再全库预解码）后的缓存上限、并发播放与重试语义。
 */
import { AudioEngine, AUDIO_CACHE_LIMIT } from '../js/audio.js';
import { test, assert, assertEqual } from './assert.js';

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

function makeGain() {
  return {
    gain: {
      value: 0,
      cancelScheduledValues() {},
      setValueAtTime() {},
      linearRampToValueAtTime() {},
    },
    connect() {},
    disconnect() {},
  };
}

/** 只实现 playTrack/stopMusic/_wireMusicBus 用到的 WebAudio 表面。 */
function makeEngine() {
  const started = [];
  const engine = new AudioEngine();
  engine.ensure = async () => {
    engine.ctx = {
      currentTime: 0,
      state: 'running',
      destination: {},
      createGain: makeGain,
      createDelay: () => ({ delayTime: { value: 0 }, connect() {}, disconnect() {} }),
      createBiquadFilter: () => ({ type: '', frequency: { value: 0 }, connect() {}, disconnect() {} }),
      createBufferSource: () => {
        const src = {
          buffer: null,
          loop: false,
          connect() {},
          disconnect() {},
          stop() {},
          start() { started.push(src); },
        };
        return src;
      },
    };
  };
  return { engine, started };
}

const buffer = (duration) => ({ duration });

test('playTrack：加载期间换曲时只有最后一次请求启动 source', async () => {
  const { engine, started } = makeEngine();
  const loads = new Map();
  const calls = [];
  engine.loadAudioBuffer = (id) => {
    calls.push(id);
    const d = deferred();
    loads.set(id, d);
    return d.promise;
  };

  const first = engine.playTrack('s1_mid');
  const second = engine.playTrack('s1_boss');
  // 两个请求都走过 await ensure 之后才会进入 loadAudioBuffer
  for (let i = 0; i < 8 && calls.length < 2; i++) await Promise.resolve();
  assertEqual(calls.join(','), 's1_mid,s1_boss');

  loads.get('s1_boss').resolve(buffer(120));
  await second;
  loads.get('s1_mid').resolve(buffer(100));
  await first;

  assertEqual(started.length, 1, '只应启动最新请求的循环源');
  assertEqual(started[0].buffer.duration, 120, '启动的应是后请求的曲目');
  assertEqual(engine.currentId, 's1_boss');
});

test('_pruneAudioBufferCache：解码缓存只保留当前与上一首', () => {
  const engine = new AudioEngine();
  for (const path of ['a.ogg', 'b.ogg', 'c.ogg']) engine._audioBufferCache.set(path, buffer(1));
  engine._pruneAudioBufferCache('c.ogg');
  assertEqual(engine._audioBufferCache.size, AUDIO_CACHE_LIMIT);
  assert(engine._audioBufferCache.has('c.ogg'), '当前曲目必须保留');
  assert(!engine._audioBufferCache.has('a.ogg'), '最旧的非当前曲目被淘汰');
});

test('playTrack：加载失败会记下待重试曲目，首次手势后 unlock 重试', async () => {
  const { engine } = makeEngine();
  engine.loadAudioBuffer = async () => { throw new Error('offline'); };
  const warn = console.warn;
  console.warn = () => {};
  try {
    await engine.playTrack('s1_boss');
  } finally {
    console.warn = warn;
  }
  assertEqual(engine._pendingTrackId, 's1_boss');

  let retried = null;
  engine.playTrack = async (id) => { retried = id; };
  await engine.unlock();
  assertEqual(retried, 's1_boss');
  assertEqual(engine._pendingTrackId, null);
});
