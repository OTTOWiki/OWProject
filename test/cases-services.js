/**
 * 服务层纯函数 / 错误收敛：
 * - historyVersions.isCurrentDeployment：按 origin+pathname 判「当前部署」
 * - AudioEngine._ensureSafe：AudioContext 不可用时收敛为 false（公共异步 API 均 fire-and-forget）
 */
import { isCurrentDeployment } from '../js/historyVersions.js';
import { AudioEngine } from '../js/audio.js';
import { Input } from '../js/input.js';
import { keyBindError } from '../js/ui.js';
import { handleScoreRankingKey } from '../js/scoreRanking.js';
import { isReplayPlayRequestCurrent } from '../js/replayScreen.js';
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

/* ========== 审计修复回归（#4 / #6 / #9） ========== */

/** 最小 DOM / localStorage 替身：构造 Input（全局 keydown 监听）不触真实页面 */
function withInputDom(fn) {
  const mem = new Map();
  const prev = {
    window: globalThis.window,
    document: globalThis.document,
    localStorage: globalThis.localStorage,
  };
  const had = {
    window: 'window' in globalThis,
    document: 'document' in globalThis,
    localStorage: 'localStorage' in globalThis,
  };
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  globalThis.document = { addEventListener() {}, visibilityState: 'visible' };
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
  };
  try {
    return fn({ mem });
  } finally {
    for (const name of ['window', 'document', 'localStorage']) {
      if (had[name]) globalThis[name] = prev[name];
      else delete globalThis[name];
    }
  }
}

function fakeKeyEvent(code, target) {
  return {
    code,
    target,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
  };
}

const BODY_TARGET = { tagName: 'BODY', isContentEditable: false, closest: () => null };
const BUTTON_TARGET = {
  tagName: 'BUTTON',
  isContentEditable: false,
  closest: (sel) => (String(sel).includes('button') ? BUTTON_TARGET : null),
};

test('#4 可激活元素聚焦时 Space 不 preventDefault、不进入游戏输入', () => withInputDom(() => {
  const input = new Input();
  const onButton = fakeKeyEvent('Space', BUTTON_TARGET);
  input._onKeyDown(onButton);
  assertEqual(onButton.defaultPrevented, false, '按钮上的 Space 交给原生激活');
  assert(!input.pressed.has('Space') && !input.down.has('Space'), '不得被游戏键处理重复消费');

  const onBody = fakeKeyEvent('Space', BODY_TARGET);
  input._onKeyDown(onBody);
  assertEqual(onBody.defaultPrevented, true, '游戏内 Space 原有行为不变');
  assert(input.pressed.has('Space'));

  const arrow = fakeKeyEvent('ArrowDown', BODY_TARGET);
  input._onKeyDown(arrow);
  assertEqual(arrow.defaultPrevented, true, '方向键仍抑制页面滚动');
}));

test('#4 成绩排行真实焦点在按钮上时键盘处理让位原生激活（不误触保存）', () => {
  const clicks = [];
  const cancelBtn = {
    dataset: { srAction: 'cancel' },
    classList: { contains: () => false },
    click() { clicks.push('cancel'); },
  };
  const saveBtn = {
    dataset: { srAction: 'save' },
    classList: { contains: () => false },
    click() { clicks.push('save'); },
  };
  const active = {
    classList: { contains: () => false },
    closest: (sel) => (sel === '[data-sr-action]' ? cancelBtn : null),
  };
  const had = 'document' in globalThis;
  const prev = globalThis.document;
  globalThis.document = {
    activeElement: active,
    querySelectorAll: () => [saveBtn, cancelBtn],
    querySelector: () => null,
    getElementById: () => null,
  };
  try {
    const handled = handleScoreRankingKey({
      _srFocusIndex: 0, // 旧逻辑会执行 btns[0]（保存）
      input: { justPressed: (code) => code === 'Space' },
    });
    assertEqual(handled, false, '聚焦按钮时应让浏览器原生激活');
    assertEqual(clicks.length, 0, '不得按 _srFocusIndex 误触保存');
  } finally {
    if (had) globalThis.document = prev; else delete globalThis.document;
  }
});

test('#6 键位重绑校验：拒绝占用保留键与其它动作已绑定的键', () => {
  const keys = { shot: 'KeyZ', bomb: 'KeyX', item: 'KeyC' };
  assertEqual(keyBindError(keys, 'bomb', 'KeyZ'), 'conflict', 'Bomb 绑到 Shot 的 Z 应拒绝');
  assertEqual(keyBindError(keys, 'item', 'KeyX'), 'conflict');
  assertEqual(keyBindError(keys, 'shot', 'KeyZ'), null, '保持当前绑定可接受');
  for (const reserved of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Enter', 'Escape', 'Space']) {
    assertEqual(keyBindError(keys, 'shot', reserved), 'reserved', reserved + ' 为保留键');
  }
  assertEqual(keyBindError(keys, 'item', 'KeyJ'), null, '未占用的普通键可绑定');
});

test('#6 改键后 reloadKeys 让新键位立即生效', () => withInputDom(({ mem }) => {
  mem.set('gunwei_keys', JSON.stringify({ shot: 'KeyJ', bomb: 'KeyX', item: 'KeyC' }));
  const input = new Input();
  input.reloadKeys();
  assertEqual(input.keys.shot, 'KeyJ');
  input._onKeyDown(fakeKeyEvent('KeyJ', BODY_TARGET));
  assert(input.shotHeld(), '新射击键应生效');
}));

test('#9 录像异步载入：离开录像屏或旧请求返回时结果丢弃', () => {
  assert(isReplayPlayRequestCurrent(1, 1, true), '仍在录像屏的当前请求应生效');
  assert(!isReplayPlayRequestCurrent(1, 2, true), '过期请求应丢弃');
  assert(!isReplayPlayRequestCurrent(1, 1, false), '已离开录像屏应丢弃');
});
