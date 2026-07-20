/**
 * 章节表 / 对话键 / 背景 mode 契约
 */
import { buildChapterList, stageIntroFor, stageSelectEntries } from '../js/stages/index.js';
import { getDialogues } from '../js/dialogue.js';
import {
  bgModeFor, getAllBgModes, isKnownBgMode, resolveBgMode,
  BG_MODE_BY_STAGE, PLAYFIELD_BG_TEX,
} from '../js/bgModes.js';
import { getPlayfieldBgModes } from '../js/playfieldBg.js';
import { MODE_THEME, themeFor, FALLBACK_THEME } from '../js/playfieldBgThemes.js';
import {
  faceDefaults, midChapter, letterChapter, installMidWave,
} from '../js/stages/_shared.js';
import { MID_PATTERNS, buildExMid } from '../js/stages/ex_mid.js';
import { asStageContext } from '../js/stages/stageContext.js';
import { evaluateChapterEnd } from '../js/chapterEnd.js';
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

test('bgModes 登记：stageKey 齐全、EX 用 ex_*、resolve 回落', () => {
  for (const k of REQUIRED_STAGE_KEYS) {
    assert(BG_MODE_BY_STAGE[k] || BG_MODE_BY_STAGE[Number(k)], `missing BG_MODE_BY_STAGE ${k}`);
  }
  assertEqual(bgModeFor('EX', false), 'ex_mid');
  assertEqual(bgModeFor('EX', true), 'ex_boss');
  assertEqual(bgModeFor(1, false), 's1_mid');
  assertEqual(bgModeFor(1, true), 's1_boss');
  assert(isKnownBgMode('ex_mid'));
  assert(!isKnownBgMode('not_a_mode'));
  assertEqual(resolveBgMode('ex_boss'), 'ex_boss');
  assertEqual(resolveBgMode('nope'), 's1_mid');
  assertEqual(resolveBgMode(null), 's1_mid');
  // 每个 stageKey 的 mid/boss 都在贴图表内
  for (const [key, pair] of Object.entries(BG_MODE_BY_STAGE)) {
    for (const m of pair) {
      assert(isKnownBgMode(m), `BG_MODE_BY_STAGE[${key}] → ${m} not in PLAYFIELD_BG_TEX`);
    }
  }
  assert(Object.keys(PLAYFIELD_BG_TEX).length >= 20);
});

test('章节 bg 或 bgModeFor 结果在统一 BG mode 表内', () => {
  const modes = new Set(getAllBgModes());
  const playfield = new Set(getPlayfieldBgModes());
  assertEqual(modes.size, playfield.size, 'playfield modes must match bgModes.getAllBgModes');
  for (const m of modes) assert(playfield.has(m), `playfield missing ${m}`);
  assert(modes.size > 10, 'bg modes table empty');
  for (const c of buildChapterList()) {
    const isBoss = c.kind === 'boss';
    const mode = c.bg || bgModeFor(c.stageKey, isBoss);
    assert(modes.has(mode), `chapter ${c.id} bg mode '${mode}' not in PLAYFIELD_BG_TEX`);
  }
});

test('playfieldBgThemes：登记 mode 均有主题行（E06c）', () => {
  assert(FALLBACK_THEME === MODE_THEME.s1_mid || FALLBACK_THEME?.kind);
  for (const m of getAllBgModes()) {
    const th = themeFor(m);
    assert(th && Array.isArray(th.sky) && th.sky.length === 2, `theme ${m} sky`);
    assert(typeof th.accent === 'string' && th.pillar && th.kind, `theme ${m} fields`);
  }
  assertEqual(themeFor('__no_such_mode__'), FALLBACK_THEME);
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

test('faceDefaults / midChapter / letterChapter 元数据工厂', () => {
  const face = faceDefaults(1);
  assertEqual(face.musicMid, 's1_mid');
  assertEqual(face.musicBoss, 's1_boss');
  assertEqual(face.bgMid, 's1_mid');
  const mid = midChapter(face, {
    id: 1, name: 't', kind: 'mid', duration: 22, unstable: true, build: () => {},
  });
  assertEqual(mid.stageKey, 1);
  assertEqual(mid.music, 's1_mid');
  assertEqual(mid.kind, 'mid');
  assert(mid.unstable === true);
  assertEqual(mid.duration, 22);
  const letter = letterChapter(face, {
    id: 5, name: 'boss', letter: 'L', letterTime: 40, build: () => {}, dialogue: 's1_boss',
  });
  assertEqual(letter.kind, 'boss');
  assertEqual(letter.music, 's1_boss');
  assertEqual(letter.letterTime, 40);
  assertEqual(letter.dialogue, 's1_boss');
});

test('installMidWave：continuous 先于 spawn 门控', () => {
  const g = { waveTimer: 0, waveCount: 0, enemies: [] };
  const order = [];
  installMidWave(g, {
    interval: 1,
    maxWaves: 2,
    continuous: () => { order.push('c'); },
    onWave: () => { order.push('w'); },
  });
  g.waveFn(0.5);
  assertEqual(order.join(''), 'c'); // 未到 interval，只有 continuous
  g.waveFn(0.6);
  assertEqual(order.join(''), 'ccw'); // continuous + wave
});

test('installMidWave：仅 continuous 不推进 waveCount（E03a）', () => {
  const g = { waveTimer: 0, waveCount: 0 };
  let ticks = 0;
  installMidWave(g, {
    continuous: () => { ticks += 1; },
  });
  g.waveFn(1);
  g.waveFn(1);
  assertEqual(ticks, 2);
  assertEqual(g.waveCount, 0); // 勿误触发 wrapWaveFn → wavesExhausted
});

test('第1–3面章节表经工厂后字段完整（T14）', () => {
  const faces = [
    { key: '1', n: 6, firstId: 1, musicMid: 's1_mid', firstBossIdx: 4, letterTime: 40, lastId: 6 },
    { key: '2', n: 8, firstId: 7, musicMid: 's2_mid', firstBossIdx: 5, letterTime: 42, lastId: 14 },
    { key: '3', n: 8, firstId: 15, musicMid: 's3_mid', firstBossIdx: 6, letterTime: 45, lastId: 22 },
  ];
  for (const f of faces) {
    const list = buildChapterList().filter((c) => String(c.stageKey) === f.key);
    assertEqual(list.length, f.n, `stage ${f.key} count`);
    assertEqual(list[0].id, f.firstId);
    assertEqual(list[0].music, f.musicMid);
    assertEqual(list[f.firstBossIdx].kind, 'boss');
    assertEqual(list[f.firstBossIdx].letterTime, f.letterTime);
    assertEqual(list[list.length - 1].id, f.lastId);
    for (const c of list) {
      assert(typeof c.build === 'function', `s${f.key} #${c.id} build`);
    }
  }
  const s3last = buildChapterList().find((c) => c.id === 22);
  assertEqual(s3last?.onClear, 'routeCheck');
});

test('EX mid：MID_PATTERNS 长度 62 且均可调用（E03d1）', () => {
  assertEqual(MID_PATTERNS.length, 62, 'MID_PATTERNS length');
  for (let i = 0; i < MID_PATTERNS.length; i++) {
    assert(typeof MID_PATTERNS[i] === 'function', `pattern ${i}`);
  }
  assert(typeof buildExMid === 'function');
});

test('asStageContext：窄 API 转发 spawn / wave / boss（E07）', () => {
  const spawned = [];
  const game = {
    player: { x: 1, y: 2 },
    bulletCountMul: 1,
    spawnEnemy(e) { spawned.push(['e', e]); return e; },
    spawnBullet(b) { spawned.push(['b', b]); return b; },
  };
  const ctx = asStageContext(game);
  assertEqual(ctx.player, game.player);
  assertEqual(ctx.bulletCountMul, 1);
  assertEqual(ctx.raw, game);
  ctx.spawnEnemy({ id: 'm' });
  ctx.spawnBullet({ id: 'b' });
  assertEqual(spawned.length, 2);
  let waved = 0;
  ctx.installWave({
    interval: 1,
    maxWaves: 2,
    onWave: (c, wave) => {
      assert(c.spawnEnemy === ctx.spawnEnemy || typeof c.spawnEnemy === 'function');
      assertEqual(c.player, game.player);
      waved = wave;
    },
  });
  assert(typeof game.waveFn === 'function');
  game.waveFn(1.1);
  assertEqual(waved, 1);
  // setBoss 走 pushBossRef → 需要 spawnEnemy 接受 Enemy 形；mock 只验 script 包装
  ctx.setBoss({ x: 10, y: 20, hp: 100, label: 't' }, (en, d, c) => {
    assertEqual(c.player, game.player);
  }, 'elite');
  assert(spawned.some((x) => x[0] === 'e'));
  assertEqual(game.bossRef != null || spawned.length >= 3, true);
});

test('evaluateChapterEnd：Letter 超时失败 / 击破成功 / 道中耗尽（E05）', () => {
  assertEqual(evaluateChapterEnd({ chapterDone: true }), null);

  const letterFail = evaluateChapterEnd({
    chapterDone: false,
    letterTimeMax: 40,
    letterTimeLeft: 0,
    hasBossRef: true,
    bossRefDead: false,
  });
  assertEqual(letterFail?.success, false);
  assertEqual(letterFail?.reason, 'letterTimeout');
  assertEqual(letterFail?.killBoss, true);

  const letterLive = evaluateChapterEnd({
    chapterDone: false,
    letterTimeMax: 40,
    letterTimeLeft: 1.5,
    hasBossRef: true,
    bossRefDead: false,
  });
  assertEqual(letterLive, null);

  const bossWin = evaluateChapterEnd({
    chapterDone: false,
    letterTimeMax: 40,
    letterTimeLeft: 10,
    hasBossRef: true,
    bossRefDead: true,
  });
  assertEqual(bossWin?.success, true);
  assertEqual(bossWin?.reason, 'bossDefeated');

  const durFail = evaluateChapterEnd({
    chapterDone: false,
    letterTimeMax: 0,
    duration: 30,
    chapterTime: 30,
    hasBossRef: true,
    bossRefDead: false,
  });
  assertEqual(durFail?.success, false);
  assertEqual(durFail?.reason, 'durationBossFail');
  assertEqual(durFail?.killBoss, true);

  const durOk = evaluateChapterEnd({
    chapterDone: false,
    letterTimeMax: 0,
    duration: 24,
    chapterTime: 24,
    hasBossRef: false,
    kind: 'mid',
  });
  assertEqual(durOk?.success, true);
  assertEqual(durOk?.reason, 'durationOk');

  const waves = evaluateChapterEnd({
    chapterDone: false,
    letterTimeMax: 0,
    duration: undefined,
    chapterTime: 1,
    hasBossRef: false,
    kind: 'mid',
    wavesExhausted: true,
    livingEnemies: false,
  });
  assertEqual(waves?.success, true);
  assertEqual(waves?.reason, 'wavesClear');

  const wavesEarly = evaluateChapterEnd({
    chapterDone: false,
    letterTimeMax: 0,
    chapterTime: 0.2,
    hasBossRef: false,
    kind: 'mid',
    wavesExhausted: true,
    livingEnemies: false,
  });
  assertEqual(wavesEarly, null);

  const midBetweenWaves = evaluateChapterEnd({
    chapterDone: false,
    letterTimeMax: 0,
    chapterTime: 5,
    hasBossRef: false,
    kind: 'mid',
    wavesExhausted: false,
    livingEnemies: false,
  });
  assertEqual(midBetweenWaves, null);
});
