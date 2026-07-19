import { Enemy } from '../entities.js';
import { BALANCE, LOGICAL_W } from '../config.js';
import { scaleBulletCount } from '../patterns.js';

export { scaleBulletCount };

export function mob(x, y, hp, color = '#86efac') {
  // 关卡常用 mob(x, -20)：飞入目标落到场内，避免屏外就结束入场并开火
  const holdY = y > 0 ? y : 40;
  return new Enemy({
    x,
    y: holdY,
    enterY: holdY,
    hp,
    r: 14,
    type: 'mob',
    color,
    score: BALANCE.score.killSmall,
    enterFrom: 'top',
  });
}

export function elite(opts) {
  return new Enemy({
    type: 'elite', r: 22, score: BALANCE.score.killElite,
    ...opts,
  });
}

export function boss(opts) {
  // Boss 默认法阵特效现身；可用 spawnFx:false + enterFrom 改飞入
  const spawnFx = opts.spawnFx !== false && !opts.skipEnter;
  return new Enemy({
    type: 'boss', r: 36, score: BALANCE.score.killBoss, invuln: 1.2,
    ...opts,
    spawnFx,
  });
}

export function timer(e, key, interval, dt, fn) {
  e.timers[key] = (e.timers[key] || 0) - dt;
  if (e.timers[key] <= 0) {
    e.timers[key] = interval * (e._fireMul ?? 1);
    fn();
  }
}

/** 关卡内手写环/扇发数：scaleN(game, n) / scaleN(game, n, 'odd'|'even') */
export function scaleN(game, n, parity = null) {
  return scaleBulletCount(game, n, parity);
}

/* ========== 章节元数据工厂（T14，对齐 Extra 表驱动脚手架） ========== */

/**
 * 某面的默认 mid/boss 音乐与背景
 * @param {string|number} stageKey
 * @param {{ musicMid?: string, musicBoss?: string, bgMid?: string, bgBoss?: string, stage?: string|number }} [opts]
 */
export function faceDefaults(stageKey, opts = {}) {
  const sk = stageKey;
  const stage = opts.stage ?? sk;
  const key = String(sk).toLowerCase();
  // 数字面：s1_mid；路线面：a4_mid / b5_boss；patrol/ex 特例由调用方覆盖
  const midBase = opts.musicMid || (typeof sk === 'number' || /^\d+$/.test(String(sk))
    ? `s${sk}_mid`
    : `${key}_mid`);
  const bossBase = opts.musicBoss || (typeof sk === 'number' || /^\d+$/.test(String(sk))
    ? `s${sk}_boss`
    : `${key}_boss`);
  return {
    stage,
    stageKey: sk,
    musicMid: midBase,
    musicBoss: bossBase,
    bgMid: opts.bgMid || midBase,
    bgBoss: opts.bgBoss || bossBase,
  };
}

/**
 * 道中 / midboss 章节行
 * @param {ReturnType<typeof faceDefaults>} face
 * @param {{ id: number, name: string, kind?: 'mid'|'midboss', duration?: number, unstable?: boolean, music?: string, bg?: string, dialogue?: string, build: (g: object) => void, [k: string]: unknown }} row
 */
export function midChapter(face, row) {
  const kind = row.kind || 'mid';
  const music = row.music ?? face.musicMid;
  const bg = row.bg ?? face.bgMid;
  const {
    id, name, duration, unstable, dialogue, build, kind: _k, music: _m, bg: _b, ...extra
  } = row;
  return {
    id,
    name,
    stage: face.stage,
    stageKey: face.stageKey,
    kind,
    music,
    bg,
    ...(duration != null ? { duration } : {}),
    ...(unstable ? { unstable: true } : {}),
    ...(dialogue ? { dialogue } : {}),
    build,
    ...extra,
  };
}

/**
 * Boss Letter 章节行
 * @param {ReturnType<typeof faceDefaults>} face
 * @param {{ id: number, name: string, letter: string, letterTime: number, build: (g: object) => void, dialogue?: string, music?: string, bg?: string, onClear?: string, winDialogue?: string, ending?: string, [k: string]: unknown }} row
 */
export function letterChapter(face, row) {
  const music = row.music ?? face.musicBoss;
  const bg = row.bg ?? face.bgBoss;
  const {
    id, name, letter, letterTime, dialogue, build,
    music: _m, bg: _b, ...extra
  } = row;
  return {
    id,
    name,
    stage: face.stage,
    stageKey: face.stageKey,
    kind: 'boss',
    music,
    bg,
    letter,
    letterTime,
    ...(dialogue ? { dialogue } : {}),
    build,
    ...extra,
  };
}

/**
 * 道中 wave 脚手架：continuous 先 tick，再 spawn 门控（避免辅压被 early-return 卡住）
 *
 * - 常规：传 `interval` + `maxWaves` + `onWave`（可加 `continuous` 辅压）
 * - 仅辅压/纯弹幕：只传 `continuous`（或不传 `onWave` / `maxWaves<=0`）——**不**推进 waveCount，
 *   避免 wrapWaveFn 误判 wavesExhausted 导致「打死精英提前清章」等行为变化
 *
 * @param {object} g game
 * @param {{ interval?: number, maxWaves?: number, onWave?: (g: object, wave: number) => void, continuous?: (g: object, dt: number) => void }} opts
 */
export function installMidWave(g, opts) {
  const { interval = 1, maxWaves = 0, onWave, continuous } = opts;
  const hasWaves = typeof onWave === 'function' && maxWaves > 0;
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    continuous?.(g, dt);
    if (!hasWaves) return;
    g.waveTimer += dt;
    if (g.waveTimer < interval) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > maxWaves) return;
    onWave(g, g.waveCount);
  };
}

/**
 * 挂一台 boss/midboss 并设 bossRef
 * @param {object} g
 * @param {object} opts 传给 boss()/elite 的字段；type 默认 boss
 * @param {(en: object, d: number, game: object) => void} [script]
 * @param {'boss'|'elite'} [factory='boss']
 */
export function pushBossRef(g, opts, script, factory = 'boss') {
  const make = factory === 'elite' ? elite : boss;
  const e = make({
    x: opts.x ?? LOGICAL_W / 2,
    y: opts.y ?? opts.enterY ?? 95,
    enterY: opts.enterY ?? opts.y ?? 95,
    ...opts,
  });
  if (script) e.script = script;
  g.spawnEnemy(e);
  g.bossRef = e;
  return e;
}
