/**
 * 排行榜测试：纯函数 + 保存写盘结果 + 成绩排行面板失败保留
 */
import { RANKING_LIMIT, STORAGE_KEYS } from '../js/config.js';
import {
  qualifies, rankFor, submitEntry, normalizeName, commitRankingEntry,
} from '../js/ranking.js';
import { bindScoreRanking, openScoreRanking } from '../js/scoreRanking.js';
import { chapterStageLabel } from '../js/chapterLabel.js';
import { submitRanking } from '../js/chapterFlow.js';
import { test, assert, assertEqual } from './assert.js';

const isNode = typeof process !== 'undefined' && !!process.versions?.node;

test('normalizeName：截断 3 字 / 去控制字符 / 回落', () => {
  assertEqual(normalizeName('饮泉思源'), '饮泉思');
  assertEqual(normalizeName('AB'), 'AB');
  assertEqual(normalizeName('  a b c d  '), 'a b');
  assertEqual(normalizeName('\u0000x'), 'x');
  assertEqual(normalizeName(''), 'PLAYER');
  assertEqual(normalizeName('', '沙玛'), '沙玛');
});

test('qualifies / rankFor：不足上限或高于末位', () => {
  const list = [{ score: 100, date: 1 }];
  assert(qualifies(list, 50));
  assertEqual(rankFor(list, 50), 1);
  assertEqual(rankFor(list, 200), 0);

  const full = Array.from({ length: RANKING_LIMIT }, (_, i) => ({ score: 100 - i, date: i }));
  assert(!qualifies(full, 0));
  assertEqual(rankFor(full, 0), -1);
  assert(qualifies(full, 999));
  assertEqual(rankFor(full, 999), 0);
});

test('rankFor：同分名次与 submitEntry 最终名次一致（成绩排行预览）', () => {
  const list = [{ score: 100, date: 1 }, { score: 50, date: 2 }];
  const entry = { score: 100, date: 10 };
  assertEqual(rankFor(list, entry.score, entry.date), 1, '同分旧条目在前，预览名次为 1');
  const ranking = { normal: list.slice() };
  assertEqual(submitEntry(ranking, 'normal', entry), 1, '最终名次与预览一致');
  assertEqual(rankFor([...list], 100, 0), 0, '更早日期的同分条目排前');
});

test('submitEntry：降序 + 同分日期更早在前 + 截断上限', () => {
  const ranking = {};
  const a = { score: 100, date: 5, id: 'a' };
  const b = { score: 200, date: 1, id: 'b' };
  const c = { score: 100, date: 2, id: 'c' };
  submitEntry(ranking, 'normal', a);
  submitEntry(ranking, 'normal', b);
  submitEntry(ranking, 'normal', c);
  const list = ranking.normal;
  assertEqual(list.length, 3);
  assertEqual(list[0].id, 'b');
  assertEqual(list[1].id, 'c');
  assertEqual(list[2].id, 'a');

  for (let i = 0; i < RANKING_LIMIT + 5; i++) {
    submitEntry(ranking, 'easy', { score: i, date: i, id: `e${i}` });
  }
  assertEqual(ranking.easy.length, RANKING_LIMIT);
  assertEqual(ranking.easy[0].id, `e${RANKING_LIMIT + 4}`);
});


test('chapterStageLabel：从章节数据生成标签，不读 DOM', () => {
  assertEqual(chapterStageLabel({ stage: 3 }), 'Stage 3');
  assertEqual(chapterStageLabel({ stage: 'EX' }), 'EX');
  assertEqual(chapterStageLabel({ stage: 'A4' }), 'A4');
  assertEqual(chapterStageLabel(null), '');
  assertEqual(chapterStageLabel({}), '');
});

test('submitRanking：无 el / 无 stageLabel 时仍记录章节标签与最远章节', () => {
  const chapters = [
    { id: 1, stage: 1, name: '一章' },
    { id: 7, stage: 2, name: '二章' },
  ];
  const game = {
    mode: 'story',
    score: 1234,
    difficultyId: 'easy',
    playerId: 'yinquan',
    player: { def: { name: '饮泉思源' } },
    routeChoice: null,
    continuesUsed: 0,
    stats: { time: 65 },
    chapters,
    chapterIndex: 1,
    furthestChapterId: 7,
    el: null,
    _rankingResult: null,
    _mobileCheat: true,
  };
  const entry = submitRanking(game, { cleared: false });
  assert(entry, '应生成入榜条目');
  assertEqual(entry.stageReached, 'Stage 2');
  assertEqual(entry.furthestChapterId, 7);
  assertEqual(entry.duration, 65);
  assertEqual(entry.cheat, true);
});

// ---- 成绩排行「保存」：写盘结果必须回传，失败不得假装已保存 ----

test('commitRankingEntry：返回排行榜写盘结果（失败时调用方不得关面板）', () => {
  if (!isNode) return;
  const prev = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => null, setItem() { throw new Error('QuotaExceeded'); }, removeItem() {} },
  });
  try {
    const result = {
      qualifies: true,
      difficultyId: 'normal',
      entry: { score: 100, date: 1, playerName: '饮泉思源', route: 'A' },
    };
    assertEqual(commitRankingEntry(result, '沙玛'), false);
    assertEqual(result.rank, 0, '名次仍按预览写入，便于重试');
    assertEqual(result.entry.name, '沙玛');
    // 未入榜：直接返回 false，不写盘
    assertEqual(commitRankingEntry({ qualifies: false }, 'x'), false);
  } finally {
    if (prev) Object.defineProperty(globalThis, 'localStorage', prev);
    else delete globalThis.localStorage;
  }
});

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

test('scoreRanking：保存失败时面板保留并提示，重试成功后才关闭', () => {
  if (!isNode) return;
  const prevDoc = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const prevLS = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  const elements = {
    'score-ranking': fakeEl(),
    'sr-diff': fakeEl(),
    'sr-list': fakeEl(),
    'sr-status': fakeEl(),
  };
  const saveBtn = fakeEl();
  const cancelBtn = fakeEl();
  let currentInput = null;
  globalThis.document = {
    getElementById: (id) => elements[id] || null,
    createElement: (tag) => {
      const el = fakeEl();
      if (tag === 'input') currentInput = el;
      return el;
    },
    querySelector: (sel) => {
      if (sel.includes('action="save"')) return saveBtn;
      if (sel.includes('action="cancel"')) return cancelBtn;
      if (sel.includes('sr-name-input')) return currentInput;
      return null;
    },
    querySelectorAll: (sel) => (sel === '[data-sr-action]' ? [saveBtn, cancelBtn] : []),
  };

  const store = new Map();
  const failStorage = {
    getItem: () => null,
    setItem() { throw new Error('QuotaExceeded'); },
    removeItem() {},
  };
  const workingStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: failStorage });

  let finished = 0;
  try {
    const game = {
      _rankingResult: {
        qualifies: true,
        difficultyId: 'normal',
        entry: { score: 1234, date: 1, playerName: '饮泉思源', route: 'A' },
        rank: 0,
      },
      paused: false,
      state: 'gameover',
      input: {},
    };
    bindScoreRanking(game);
    openScoreRanking(game, () => { finished += 1; });

    saveBtn.click();
    assert(!elements['score-ranking'].classList.contains('hidden'), '写盘失败时面板必须保留');
    assert(
      elements['sr-status'].textContent.includes('保存失败'),
      '面板内应显示保存失败提示',
    );
    assertEqual(finished, 0, '失败时不得进入后续结算');

    // 重试：存储恢复可用后应当真正写盘并关闭
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: workingStorage });
    saveBtn.click();
    assert(elements['score-ranking'].classList.contains('hidden'), '重试成功后关闭面板');
    assertEqual(finished, 1);
    const saved = JSON.parse(store.get(STORAGE_KEYS.ranking));
    assertEqual(saved.normal.length, 1, '重试不得写入重复条目');
    assertEqual(saved.normal[0].score, 1234);
  } finally {
    if (prevDoc) Object.defineProperty(globalThis, 'document', prevDoc);
    else delete globalThis.document;
    if (prevLS) Object.defineProperty(globalThis, 'localStorage', prevLS);
    else delete globalThis.localStorage;
  }
});
