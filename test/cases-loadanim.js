import { test, assert, assertClose } from './assert.js';
import { petalPlaybackRate } from '../js/loadingPetals.js';

test('petalPlaybackRate：0/15/50/85/100 关键点', () => {
  assertClose(petalPlaybackRate(0), 0.55);
  assertClose(petalPlaybackRate(15), 0.8);
  assertClose(petalPlaybackRate(50), 1.3);
  assertClose(petalPlaybackRate(85), 1.8);
  assertClose(petalPlaybackRate(100), 1.0);
});

test('petalPlaybackRate：0→85 单调加速，85→100 减速', () => {
  let prev = petalPlaybackRate(0);
  for (let p = 1; p <= 85; p += 1) {
    const next = petalPlaybackRate(p);
    assert(next >= prev - 1e-9, `rate dropped at ${p}: ${prev} -> ${next}`);
    prev = next;
  }
  prev = petalPlaybackRate(85);
  for (let p = 86; p <= 100; p += 1) {
    const next = petalPlaybackRate(p);
    assert(next <= prev + 1e-9, `rate rose at ${p}: ${prev} -> ${next}`);
    prev = next;
  }
});

test('petalPlaybackRate：非法/越界输入按 0 或 100 clamp', () => {
  assertClose(petalPlaybackRate(-20), 0.55);
  assertClose(petalPlaybackRate(140), 1.0);
  assertClose(petalPlaybackRate(NaN), 0.55);
  assertClose(petalPlaybackRate(undefined), 0.55);
  assertClose(petalPlaybackRate(null), 0.55);
  assertClose(petalPlaybackRate('50'), 1.3);
  assertClose(petalPlaybackRate('not-a-number'), 0.55);
});
