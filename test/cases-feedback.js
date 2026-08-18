/**
 * 打击反馈（PR-A）：addHitStop / addShake 语义 + collision 事件
 * 受击不再产生 hurt 事件（移除每帧受击停帧后）；击破仍发 kill
 * 纯视觉层：不触碰判定 / 得分 / 回放
 */
import { BALANCE } from '../js/config.js';
import { runCollisions } from '../js/collision.js';
import { addHitStop, addShake } from '../js/gameCombat.js';
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
