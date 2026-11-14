/**
 * 服务层纯函数 / 错误收敛：
 * - historyVersions.isCurrentDeployment：按 origin+pathname 判「当前部署」
 * - AudioEngine._ensureSafe：AudioContext 不可用时收敛为 false（公共异步 API 均 fire-and-forget）
 */
import { isCurrentDeployment } from '../js/historyVersions.js';
import { AudioEngine } from '../js/audio.js';
import { test, assert, assertEqual } from './assert.js';

test('isCurrentDeployment：完整 URL 相等才算当前，忽略 query/hash/尾斜杠', () => {
  const hadWindow = typeof globalThis.window !== 'undefined';
  const prevWindow = globalThis.window;
  globalThis.window = { location: { href: 'https://example.pages.dev/game/' } };
  try {
    assert(isCurrentDeployment('https://example.pages.dev/game/'), '同 origin+path → 当前');
    assert(isCurrentDeployment('https://example.pages.dev/game/?v=1#top'), '忽略 query/hash');
    assert(isCurrentDeployment('https://example.pages.dev/game'), '忽略尾斜杠');
    assert(!isCurrentDeployment('https://example.pages.dev/'), '同域名不同路径 → 非当前');
    assert(!isCurrentDeployment('https://other.pages.dev/game/'), '不同主机 → 非当前');
    assert(!isCurrentDeployment(''), '空 URL → false');
    assert(!isCurrentDeployment('not a url'), '坏 URL → false');
  } finally {
    if (hadWindow) globalThis.window = prevWindow;
    else delete globalThis.window;
  }
});

test('AudioEngine._ensureSafe：初始化失败返回 false，只告警一次', async () => {
  const engine = new AudioEngine();
  let calls = 0;
  engine.ensure = async () => {
    calls += 1;
    throw new Error('AudioContext blocked');
  };
  const warn = console.warn;
  const warns = [];
  console.warn = (...args) => warns.push(args);
  try {
    assertEqual(await engine._ensureSafe(), false);
    assertEqual(await engine._ensureSafe(), false);
    assertEqual(calls, 2, '每次仍尝试 ensure');
    assertEqual(warns.length, 1, '只告警一次，避免刷屏');
  } finally {
    console.warn = warn;
  }
});

test('AudioEngine._ensureSafe：正常初始化返回 true 且不告警', async () => {
  const engine = new AudioEngine();
  engine.ensure = async () => {};
  const warn = console.warn;
  const warns = [];
  console.warn = (...args) => warns.push(args);
  try {
    assertEqual(await engine._ensureSafe(), true);
    assertEqual(warns.length, 0);
  } finally {
    console.warn = warn;
  }
});
