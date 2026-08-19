/**
 * 打击反馈（PR-A）：addHitStop / addShake 语义 + collision 事件
 * 受击不再产生 hurt 事件（移除每帧受击停帧后）；击破仍发 kill
 * 受击白闪绘制：本地坐标系（回归「白色透明球体」偏移 bug）
 * 纯视觉层：不触碰判定 / 得分 / 回放
 */
import { BALANCE } from '../js/config.js';
import { runCollisions } from '../js/collision.js';
import { addHitStop, addShake } from '../js/gameCombat.js';
import { drawEnemy } from '../js/draw/entitiesDraw.js';
import { test, assert, assertEqual } from './assert.js';

test('addHitStop：max 语义 + cap，不叠加', () => {
  const game = { _hitStop: 0 };
  addHitStop(game, 0.03);
  assertEqual(game._hitStop, 0.03, 'small dur applied');
  // 更大值覆盖更小值
  addHitStop(game, 0.05);
  assertEqual(game._hitStop, 0.05, 'larger dur wins');
  // 更小值不拉低当前值
  addHitStop(game, 0.01);
  assertEqual(game._hitStop, 0.05, 'smaller dur must not lower');
  // cap：超过上限钳制到 hitStopCap
  addHitStop(game, 9.9);
  assertEqual(game._hitStop, BALANCE.feedback.hitStopCap, 'capped at hitStopCap');
});

test('addShake：设置 _shakeMag / _shakeDur / _shakeT 三个字段', () => {
  const game = {};
  addShake(game, 7, 0.45);
  assertEqual(game._shakeMag, 7);
  assertEqual(game._shakeDur, 0.45);
  assertEqual(game._shakeT, 0.45, 'T 初始化为 dur');
});

/** 最小 mock：runCollisions 只读实体字段 + hurt 方法，不碰 audio/score */
function mockGame({ player, enemies = [], bullets = [] } = {}) {
  const playerBullets = [];
  const enemyBullets = [];
  for (const b of bullets) {
    if (b.dead) continue;
    if (b.from === 'player') playerBullets.push(b);
    else enemyBullets.push(b);
  }
  return {
    player,
    enemies,
    bullets,
    playerBullets,
    enemyBullets,
    _homeList: null,
    _colEvents: [],
  };
}

function mockEnemy(opts) {
  return {
    id: opts.id ?? 1,
    x: opts.x ?? 200,
    y: opts.y ?? 200,
    r: opts.r ?? 16,
    type: opts.type ?? 'mob',
    hp: opts.hp ?? 100,
    dead: false,
    isSpawning: false,
    score: opts.score ?? 100,
    color: '#fff',
    drop: null,
    hurt(dmg) {
      this.hp -= dmg;
      if (this.hp <= 0) {
        this.dead = true;
        return true;
      }
      return false;
    },
  };
}

function mockBullet(opts) {
  return {
    dead: false,
    delay: 0,
    grazed: false,
    from: opts.from ?? 'enemy',
    type: opts.type ?? 'dot',
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    r: opts.r ?? 4,
    damage: opts.damage ?? 1,
  };
}

const PLAYER = { x: 50, y: 500, r: 3, edit: 0 };

test('runCollisions：boss 受击未死 → 无 hurt 事件（受击停帧已移除）', () => {
  const boss = mockEnemy({ type: 'boss', x: 100, y: 100, hp: 100 });
  const pb = mockBullet({ from: 'player', x: 100, y: 100, r: 6, damage: 10 });
  const g = mockGame({ player: PLAYER, enemies: [boss], bullets: [pb] });
  const events = runCollisions(g);
  assert(!boss.dead, 'boss survives');
  assert(!events.some((e) => e.type === 'hurt'), `surviving boss must not emit hurt, got ${events.map((e) => e.type).join(',')}`);
  assert(!events.some((e) => e.type === 'kill'), 'surviving boss must not emit kill');
});

test('runCollisions：elite 受击未死 → 无 hurt 事件（受击停帧已移除）', () => {
  const elite = mockEnemy({ type: 'elite', x: 100, y: 100, hp: 100 });
  const pb = mockBullet({ from: 'player', x: 100, y: 100, r: 6, damage: 10 });
  const g = mockGame({ player: PLAYER, enemies: [elite], bullets: [pb] });
  const events = runCollisions(g);
  assert(!elite.dead, 'elite survives');
  assert(!events.some((e) => e.type === 'hurt'), `elite must not emit hurt, got ${events.map((e) => e.type).join(',')}`);
});

test('runCollisions：普通 mob 受击未死 → 无 hurt 事件', () => {
  const mob = mockEnemy({ type: 'mob', x: 100, y: 100, hp: 100 });
  const pb = mockBullet({ from: 'player', x: 100, y: 100, r: 6, damage: 10 });
  const g = mockGame({ player: PLAYER, enemies: [mob], bullets: [pb] });
  const events = runCollisions(g);
  assert(!mob.dead, 'mob survives');
  assert(!events.some((e) => e.type === 'hurt'), 'mob must not emit hurt');
});

test('runCollisions：boss 被击杀 → kill 事件而非 hurt', () => {
  const boss = mockEnemy({ type: 'boss', x: 100, y: 100, hp: 1 });
  const pb = mockBullet({ from: 'player', x: 100, y: 100, r: 6, damage: 10 });
  const g = mockGame({ player: PLAYER, enemies: [boss], bullets: [pb] });
  const events = runCollisions(g);
  assert(boss.dead, 'boss killed');
  assertEqual(events.length, 1, 'single event for killing blow');
  assertEqual(events[0].type, 'kill');
  assertEqual(events[0].enemy, boss);
});

/** 记录 arc 中心的 2D mock ctx（覆盖 drawEnemy 全路径；贴图走 null → 几何分支） */
function mockDrawCtx() {
  const arcs = [];
  const gradients = [];
  const gradient = { addColorStop() {} };
  const ctx = {
    arcs,
    gradients,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt',
    shadowColor: '', shadowBlur: 0, font: '', textAlign: 'start',
    save() {}, restore() {}, translate() {}, rotate() {}, clip() {},
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    arc(x, y, r) { arcs.push({ x, y, r }); },
    ellipse() {}, fill() {}, stroke() {}, fillRect() {}, strokeRect() {},
    fillText() {}, drawImage() {},
    createRadialGradient(x0, y0, r0, x1, y1, r1) {
      gradients.push({ x0, y0, r0, x1, y1, r1 });
      return gradient;
    },
    createLinearGradient() { return gradient; },
  };
  return ctx;
}

test('drawEnemy 受击白闪：translate(e.x,e.y) 后必须用本地中心 (0,0)，杜绝偏移白球', () => {
  // kind 'boss' 未登记专用贴图 → spriteKeyForEnemy 返回 null → 几何分支（node 无 Image 也安全）
  const boss = {
    id: 1, x: 120, y: 80, r: 24, type: 'boss', kind: 'boss',
    hp: 100, maxHp: 100, dead: false, isSpawning: false,
    spin: 0, color: '#f00', color2: '#fff', label: null,
    spawnFxT: 0, hurtT: 0.06,
  };
  const ctx = mockDrawCtx();
  drawEnemy(ctx, boss);
  // 回归锁定：受击白闪曾用绝对坐标 (e.x,e.y) → 白闪画在 2×(120,80)=(240,160) 的偏移位置；
  // drawEnemy 内部已 translate(e.x,e.y)，所有圆必须落在本地原点
  const off = ctx.arcs.filter((a) => a.x !== 0 || a.y !== 0);
  assertEqual(off.length, 0, `所有 arc 必须本地 (0,0)；偏移圆心: ${JSON.stringify(off.slice(0, 3))}`);
  // 同理：受击白闪径向渐变中心也必须为 (0,0)
  const gradOff = ctx.gradients.filter((g) => g.x0 !== 0 || g.y0 !== 0 || g.x1 !== 0 || g.y1 !== 0);
  assertEqual(gradOff.length, 0, `所有径向渐变中心必须本地 (0,0)；偏移渐变: ${JSON.stringify(gradOff.slice(0, 3))}`);
});
