/**
 * 章节表 / 对话键 / 背景 mode 契约
 */
import { buildChapterList, stageIntroFor, stageSelectEntries } from '../js/stages/index.js';
import { getDialogues } from '../js/dialogue.js';
import { bgModeFor } from '../js/bgModes.js';
import { getPlayfieldBgModes } from '../js/playfieldBg.js';
import { test, assert, assertEqual } from './assert.js';

const REQUIRED_STAGE_KEYS = ['1', '2', '3', 'patrol', 'A4', 'A5', 'A6', 'B4', 'B5', 'B6', 'EX'];

test('章节表：id 唯一且故事节点用 onClear 元数据', () => {
  const list = buildChapterList();
  assert(list.length > 30, `too few chapters: ${list.length}`);

  const ids = list.map((c) => c.id);
  assertEqual(new Set(ids).size, ids.length, 'duplicate chapter id');
  assert(ids.includes(1), 'missing chapter 1');

  const routeChecks = list.filter((c) => c.onClear === 'routeCheck');
  const routeSelects = list.filter((c) => c.onClear === 'routeSelect');
  assertEqual(routeChecks.length, 1, 'exactly one routeCheck chapter');
  assertEqual(routeSelects.length, 1, 'exactly one routeSelect chapter');
  assertEqual(String(routeChecks[0].stageKey), '3', 'routeCheck on stage 3');
  assertEqual(String(routeSelects[0].stageKey), 'patrol', 'routeSelect on patrol');

  const patrolFirst = list.find((c) => String(c.stageKey) === 'patrol');
  assert(patrolFirst, 'patrol stage exists');

  for (const c of list) {
    assert(typeof c.build === 'function', `chapter ${c.id} missing build`);
    assert(c.name && c.kind, `chapter ${c.id} incomplete`);
    assert(['mid', 'midboss', 'boss'].includes(c.kind), `bad kind ${c.kind}`);
  }
});

test('章节 stageKey 覆盖主线与 A/B/EX', () => {
  const keys = new Set(buildChapterList().map((c) => String(c.stageKey)));
  for (const k of REQUIRED_STAGE_KEYS) {
    assert(keys.has(k), `missing stageKey ${k}`);
  }
});

test('stageSelectEntries 与 stageIntroFor 可用', () => {
  const entries = stageSelectEntries();
  assert(entries.length >= 10, `stage select entries ${entries.length}`);
  for (const e of entries) {
    assert(e.id && e.label && e.startChapter != null, `bad entry ${JSON.stringify(e)}`);
  }
  assert(stageIntroFor('1')?.label);
  assert(stageIntroFor('A4')?.label);
  assertEqual(stageIntroFor('nope'), null);
});

test('stageSelect startChapter 对齐各 stageKey 首章', () => {
  const list = buildChapterList();
  const firstByKey = new Map();
  for (const c of list) {
    const sk = String(c.stageKey);
    if (!firstByKey.has(sk)) firstByKey.set(sk, c.id);
  }
  for (const e of stageSelectEntries()) {
    const expected = firstByKey.get(String(e.id));
    assert(expected != null, `stageSelect id ${e.id} 无对应章节`);
    assertEqual(e.startChapter, expected, `startChapter for ${e.id}`);
  }
  const ex = stageSelectEntries().find((e) => e.id === 'EX');
  assert(ex, 'EX stage select entry');
  assertEqual(ex.startChapter, firstByKey.get('EX'), 'EX start is first EX chapter');
});

test('章节 dialogue / winDialogue / loseDialogue 键均存在于 getDialogues', () => {
  const dialogues = getDialogues('yinquan');
  for (const c of buildChapterList()) {
    for (const field of ['dialogue', 'winDialogue', 'loseDialogue']) {
      const key = c[field];
      if (!key) continue;
      assert(
        Array.isArray(dialogues[key]) && dialogues[key].length > 0,
        `chapter ${c.id} ${field}='${key}' missing or empty`,
      );
    }
  }
});

test('有 letter 的章节必须 letterTime > 0', () => {
  for (const c of buildChapterList()) {
    if (!c.letter) continue;
    assert(
      typeof c.letterTime === 'number' && c.letterTime > 0,
      `chapter ${c.id} has letter but letterTime=${c.letterTime}`,
    );
  }
});

test('章节 bg 或 bgModeFor 结果在版面 BG mode 表内', () => {
  const modes = new Set(getPlayfieldBgModes());
  assert(modes.size > 10, 'bg modes table empty');
  for (const c of buildChapterList()) {
    const isBoss = c.kind === 'boss';
    const mode = c.bg || bgModeFor(c.stageKey, isBoss);
    assert(modes.has(mode), `chapter ${c.id} bg mode '${mode}' not in playfield BG_TEX`);
  }
});

test('故事图：routeCheck 后存在 A4/B4/patrol；patrol 后有 A/B 可选章', () => {
  const list = buildChapterList();
  const keys = new Set(list.map((c) => String(c.stageKey)));
  assert(keys.has('A4') && keys.has('B4') && keys.has('patrol'));
  const rc = list.find((c) => c.onClear === 'routeCheck');
  const rs = list.find((c) => c.onClear === 'routeSelect');
  const iRc = list.indexOf(rc);
  const iRs = list.indexOf(rs);
  assert(iRc >= 0 && iRs > iRc, 'routeSelect should appear after routeCheck in chapter list');
});
