/**
 * 服务层纯函数 / 错误收敛：
 * - historyVersions.isCurrentDeployment：按 origin+pathname 判「当前部署」
 * - AudioEngine._ensureSafe：AudioContext 不可用时收敛为 false（公共异步 API 均 fire-and-forget）
 * - /api/versions：缓存 key 归一化、过滤跨页、错误收敛
 * - HistoryScreen.load：请求代际（旧响应不得覆盖新响应）
 */
import { isCurrentDeployment } from '../js/historyVersions.js';
import { AudioEngine } from '../js/audio.js';
import { HistoryScreen } from '../js/historyScreen.js';
import { onRequestGet } from '../functions/api/versions.js';
import { test, assert, assertEqual } from './assert.js';

const isNode = typeof process !== 'undefined' && !!process.versions?.node;

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

// ---- /api/versions（Cloudflare Pages Function，Node 下 mock fetch / caches）----

const API_ENV = { CF_ACCOUNT_ID: 'acct', CF_API_TOKEN: 'tok', CF_PAGES_PROJECT: 'proj' };

function deployment(id, { branch = 'main', env = 'production', status = 'success', message = 'm' } = {}) {
  return {
    id,
    url: `https://${id}.proj.pages.dev`,
    environment: env,
    created_on: '2026-01-01T00:00:00.000Z',
    latest_stage: { status },
    deployment_trigger: {
      metadata: { branch, commit_hash: `${id}0123456789`, commit_message: message },
    },
  };
}

function upstreamResponse(batch, { ok = true, status = 200, success = true, errors } = {}) {
  return {
    ok,
    status,
    json: async () => ({ success, result: batch, errors }),
  };
}

function apiContext(query = '') {
  return {
    env: { ...API_ENV },
    request: { url: `https://example.pages.dev/api/versions${query}` },
  };
}

async function callVersions(query) {
  const res = await onRequestGet(apiContext(query));
  return { status: res.status, body: await res.json() };
}

/** 临时替换 fetch / caches，结束后还原（浏览器环境禁用这些用例） */
async function withNetworkStubs({ fetch: fetchStub, caches: cachesStub }, fn) {
  const prevFetch = globalThis.fetch;
  const prevCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  globalThis.fetch = fetchStub;
  if (cachesStub) globalThis.caches = cachesStub;
  else delete globalThis.caches;
  try {
    return await fn();
  } finally {
    globalThis.fetch = prevFetch;
    if (prevCaches) Object.defineProperty(globalThis, 'caches', prevCaches);
    else delete globalThis.caches;
  }
}

function fakeMemoryCache() {
  const store = new Map();
  return {
    default: {
      async match(key) {
        const hit = store.get(key);
        return hit ? hit.clone() : null;
      },
      async put(key, res) {
        store.set(key, res.clone());
      },
    },
  };
}

test('/api/versions：branch 过滤不足时继续翻页，能查到第 3 页的目标', async () => {
  if (!isNode) return;
  const fetched = [];
  const fetchStub = async (url) => {
    const page = Number(new URL(url).searchParams.get('page'));
    fetched.push(page);
    if (page === 1) return upstreamResponse(Array.from({ length: 25 }, (_, i) => deployment(`p1-${i}`)));
    if (page === 2) return upstreamResponse(Array.from({ length: 25 }, (_, i) => deployment(`p2-${i}`)));
    if (page === 3) {
      return upstreamResponse([
        ...Array.from({ length: 5 }, (_, i) => deployment(`target-${i}`, { branch: 'feature-x' })),
        ...Array.from({ length: 20 }, (_, i) => deployment(`p3-${i}`)),
      ]);
    }
    return upstreamResponse([]);
  };

  const { status, body } = await withNetworkStubs({ fetch: fetchStub }, () => callVersions('?branch=Feature-X&limit=5'));
  assertEqual(status, 200);
  assert(body.ok);
  assertEqual(body.count, 5);
  assert(body.versions.every((v) => v.branch === 'feature-x'), '只返回目标分支');
  assertEqual(fetched.length, 3, '过滤后不足应继续翻页');
});

test('/api/versions：caches.default 按归一化 key 命中，不再请求上游', async () => {
  if (!isNode) return;
  let upstreamCalls = 0;
  const fetchStub = async () => {
    upstreamCalls += 1;
    return upstreamResponse([deployment('a')]);
  };
  const cache = fakeMemoryCache();

  const first = await withNetworkStubs({ fetch: fetchStub, caches: cache },
    () => callVersions('?limit=40'));
  const second = await withNetworkStubs({ fetch: fetchStub, caches: cache },
    () => callVersions('?limit=040')); // 前导零归一化到同一 key

  assertEqual(first.status, 200);
  assertEqual(second.status, 200);
  assertEqual(first.body.count, 1);
  assertEqual(second.body.count, 1);
  assertEqual(upstreamCalls, 1, '命中缓存后不应再访问上游');
});

test('/api/versions：上游失败统一文案，不回显原始错误', async () => {
  if (!isNode) return;
  const fetchStub = async () => upstreamResponse([], {
    ok: false,
    status: 500,
    success: false,
    errors: [{ message: 'SECRET upstream detail' }],
  });

  const { status, body } = await withNetworkStubs({ fetch: fetchStub }, () => callVersions(''));
  assertEqual(status, 502);
  assertEqual(body.ok, false);
  assertEqual(body.versions.length, 0);
  assert(!JSON.stringify(body).includes('SECRET'), '不得回显上游错误文本');
});

// ---- HistoryScreen（DOM/网络桩，Node 专用）----

function fakeEl() {
  const classes = new Set();
  return {
    textContent: '',
    innerHTML: '',
    value: '',
    className: '',
    dataset: {},
    children: [],
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
    },
    setAttribute() {},
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    append(...children) {
      this.children.push(...children);
    },
    addEventListener(ev, fn) {
      this._handlers = this._handlers || {};
      this._handlers[ev] = fn;
    },
    click() {
      this._handlers?.click?.();
    },
  };
}

function versionResponse(versions) {
  return {
    status: 200,
    json: async () => ({ ok: true, project: 'proj', count: versions.length, versions }),
  };
}

test('HistoryScreen.load：旧请求响应不覆盖新请求（请求代际）', async () => {
  if (!isNode) return;
  const pending = [];
  const statusEl = fakeEl();
  const listEl = fakeEl();
  const prevFetch = globalThis.fetch;
  const prevDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

  globalThis.fetch = () => new Promise((resolve) => pending.push(resolve));
  globalThis.document = {
    getElementById: (id) => (id === 'history-status' ? statusEl
      : id === 'history-list' ? listEl : null),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => fakeEl(),
  };

  try {
    const screen = new HistoryScreen({ audio: { sfx() {} }, isActive: () => true, onBack() {} });
    const p1 = screen.load(true);
    const p2 = screen.load(true);
    assertEqual(pending.length, 2);

    // 后发的请求先返回：列表写入新数据
    pending[1](versionResponse([{ id: 'new', url: 'https://new.pages.dev/' }]));
    await p2;
    // 先发的请求后返回：必须被丢弃，不得回退
    pending[0](versionResponse([{ id: 'old', url: 'https://old.pages.dev/' }]));
    await p1;

    assertEqual(screen.items.length, 1);
    assertEqual(screen.items[0].id, 'new');
    assert(statusEl.textContent.includes('共 1 次构建'), statusEl.textContent);
  } finally {
    globalThis.fetch = prevFetch;
    if (prevDocument) Object.defineProperty(globalThis, 'document', prevDocument);
    else delete globalThis.document;
  }
});
