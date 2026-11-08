/**
 * 无头章节捕获器（分析工具，不进运行时）
 *
 * 用途：为「每面难度与体量」的数学模型提供实测数据——
 *   对一个章节 build 后按固定步长驱动 waveFn + 敌机 script，记录每一发的
 *   { t, speed, r, n, type, ownerKind }。
 *
 * 与生产路径的差异（必须知道，否则数字不可比）：
 *   - 用 test/mockGame.js 的轻量替身，不启 Canvas / Audio / DOM；
 *   - 自机固定不动（脚本里的 oddAim/evenAim 得到的角度因此固定，但**发数与弹速不受影响**）；
 *   - 不跑碰撞、不跑掉落，只记录"发出来什么"。
 */
import assert from 'node:assert/strict';
import { createMockGame } from '../test/mockGame.js';
import { createRng } from '../js/rng.js';
import { buildChapterList } from '../js/stages/index.js';

const DT = 1 / 60;

/**
 * @param {object} ch 章节对象（来自 buildChapterList）
 * @param {{ frames?: number, seed?: number }} [opts]
 */
export function captureChapter(ch, opts = {}) {
  const frames = opts.frames ?? 7200;
  const seed = opts.seed ?? 0x12345678;
  const g = createMockGame();

  // 捕获每次出弹
  const shots = [];
  const realSpawnBullet = g.spawnBullet.bind(g);
  g.spawnBullet = (b) => {
    if (b && b.from === 'enemy') {
      shots.push({
        t: g.chapterTime,
        // 真实位移速度：Bullet 的 vx/vy 已是「每帧位移量」（update 里 *= dt*60）
        // 部分子弹只给 vx/vy 不给 speed，必须以 hypot 为准，否则会出现 speed=0 的假样本
        speed: Math.hypot(b.vx || 0, b.vy || 0) || (b.speed || 0),
        r: b.r,
        type: b.type,
        life: Number.isFinite(b.life) ? b.life : Infinity,
        homing: b.homing || 0,
        accel: b.accel || 0,
        laserLen: b.type === 'laser' ? (b.laserLenMax || b.laserLen || 0) : 0,
      });
    }
    return realSpawnBullet(b);
  };

  // 捕获出怪（记录 type/kind 以便分面统计）
  const spawned = [];
  const realSpawnEnemy = g.spawnEnemy.bind(g);
  g.spawnEnemy = (e) => {
    spawned.push({ t: g.chapterTime, type: e?.type, kind: e?.kind });
    return realSpawnEnemy(e);
  };

  // 捕获连续波次调用次数（判断章节是否靠 waveFn 推进）
  let waveTicks = 0;

  const rng = createRng(seed);
  const savedRandom = Math.random;
  Math.random = rng;
  try {
    if (typeof ch.build !== 'function') {
      return { id: ch.id, name: ch.name, shots: [], spawned: [], frames: 0, error: 'no build' };
    }
    ch.build(g);
    const rawWave = g.waveFn;
    const spawnMul = g.spawnMul || 1;

    for (let f = 0; f < frames; f++) {
      g.chapterTime += DT;
      if (rawWave) { rawWave(DT / spawnMul); waveTicks++; }
      // 敌机每帧：调用 script（与 Enemy.update 的调用形态一致）
      for (const e of g.enemies) {
        if (e.dead) continue;
        e.age += DT;
        if (e.script) {
          try { e.script(e, DT, g); } catch { /* 捕获器忽略章节内异常 */ }
        }
      }
    }
  } finally {
    Math.random = savedRandom;
  }

  return {
    id: ch.id,
    name: ch.name,
    kind: ch.kind,
    stageKey: ch.stageKey,
    frames,
    waveTicks,
    spawned,
    shots,
  };
}

/** 一个 stageKey 下所有章节的合计 */
export function captureFace(stageKey) {
  const chapters = buildChapterList().filter((c) => String(c.stageKey) === String(stageKey));
  return chapters.map((c) => captureChapter(c));
}

/** CLI：node tools/face-metrics.mjs [stageKey...] */
if (import.meta.url === `file://${process.argv[1]}`) {
  const keys = process.argv.slice(2);
  const all = buildChapterList();
  const targets = keys.length ? all.filter((c) => keys.includes(String(c.stageKey))) : all;
  // 输出完整记录（含逐发明细），供 face-metrics.mjs 计算
  const out = targets.map((c) => {
    const r = captureChapter(c);
    return {
      id: r.id,
      name: r.name,
      kind: r.kind,
      stageKey: r.stageKey,
      frames: r.frames,
      waveTicks: r.waveTicks,
      spawned: r.spawned,
      shots: r.shots,
      enemySpawns: r.spawned.length,
      bullets: r.shots.length,
    };
  });
  console.log(JSON.stringify(out));
  assert.ok(out.length >= 0);
}
