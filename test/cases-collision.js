/**
 * 碰撞几何 + 事件形状（T16：runCollisions 只吐事件）
 */
import {
  distPointSeg, bulletDistToPlayer, runCollisions, rebuildBulletLists,
} from '../js/collision.js';
import { BALANCE } from '../js/config.js';
import { test, assert, assertEqual, assertClose } from './assert.js';

test('distPointSeg：点在线段上 / 垂足 / 端点外', () => {
  assertClose(distPointSeg(5, 0, 0, 0, 10, 0), 0);
  assertClose(distPointSeg(5, 3, 0, 0, 10, 0), 3);
  assertClose(distPointSeg(-2, 0, 0, 0, 10, 0), 2);
  assertClose(distPointSeg(12, 0, 0, 0, 10, 0), 2);
});

test('bulletDistToPlayer：圆弹与激光', () => {
  const p = { x: 100, y: 100 };
  const dot = { type: 'dot', x: 103, y: 104 };
  assertClose(bulletDistToPlayer(dot, p), 5);

  const laser = {
    type: 'laser', x: 0, y: 100, angle: 0, laserLen: 200,
  };
  assertClose(bulletDistToPlayer(laser, p), 0);
});

/** 最小 mock：碰撞只读实体字段 + hurt，不碰 audio/score */
function mockGame({ player, enemies = [], bullets = [] } = {}) {
  const g = {
    player,
    enemies,
    bullets,
    playerBullets: [],
    enemyBullets: [],
    _homeList: null,
    addScore() { throw new Error('runCollisions must not call addScore'); },
    _burst() { throw new Error('runCollisions must not call _burst'); },
    spawnItem() { throw new Error('runCollisions must not call spawnItem'); },
    _hitPlayer() { throw new Error('runCollisions must not call _hitPlayer'); },
    _defaultKillDrop() { throw new Error('runCollisions must not call _defaultKillDrop'); },
    audio: { sfx() { throw new Error('runCollisions must not call audio.sfx'); } },
  };
  return g;
}

function mockEnemy(opts) {
  return {
    id: opts.id ?? 1,
    x: opts.x ?? 200,
    y: opts.y ?? 200,
    r: opts.r ?? 16,
    hp: opts.hp ?? 1,
    dead: false,
    isSpawning: false,
    score: opts.score ?? 100,
    color: '#fff',
    drop: opts.drop ?? null,
    hurt(dmg) {
      this.hp -= dmg;
      if (this.hp <= 0) {
        this.dead = true;
        return true;
      }
      return false;
    },
    fireOnDeath() { throw new Error('runCollisions must not call fireOnDeath'); },
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
    w: opts.w,
    angle: opts.angle,
    laserLen: opts.laserLen,
    _hitIds: opts._hitIds,
  };
}

test('runCollisions：击杀吐 kill 事件且不副作用 score/SFX', () => {
  const enemy = mockEnemy({ x: 100, y: 100, hp: 1, r: 10 });
  const pb = mockBullet({ from: 'player', x: 100, y: 100, r: 6, damage: 10 });
  const g = mockGame({
    player: { x: 50, y: 500, r: 3, edit: 0 },
    enemies: [enemy],
    bullets: [pb],
  });
  const events = runCollisions(g);
  assert(enemy.dead, 'enemy should be dead after hit');
  assert(pb.dead, 'player bullet consumed');
  assertEqual(events.length, 1);
  assertEqual(events[0].type, 'kill');
  assertEqual(events[0].enemy, enemy);
});

test('runCollisions：擦弹吐 graze，中弹吐 playerHit', () => {
  const grazeR = BALANCE.grazeRadius;
  const p = { x: 100, y: 100, r: 3, edit: 0 };
  // 在 graze 环内、判定外
  const grazeB = mockBullet({
    from: 'enemy', x: 100 + grazeR * 0.6, y: 100, r: 2,
  });
  // 叠在判定上
  const hitB = mockBullet({
    from: 'enemy', x: 100, y: 100, r: 4,
  });
  const g = mockGame({ player: p, enemies: [], bullets: [grazeB, hitB] });
  const events = runCollisions(g);
  const types = events.map((e) => e.type);
  assert(types.includes('graze'), `expected graze, got ${types.join(',')}`);
  assert(types.includes('playerHit'), `expected playerHit, got ${types.join(',')}`);
  assert(grazeB.grazed, 'graze bullet marked');
  assert(hitB.dead, 'hitting bullet marked dead');
  const hit = events.find((e) => e.type === 'playerHit');
  assertEqual(hit.source, 'bullet');
});

test('runCollisions：体术碰撞吐 body playerHit', () => {
  const p = { x: 100, y: 100, r: 5, edit: 0 };
  const enemy = mockEnemy({ x: 100, y: 100, r: 20, hp: 99 });
  const g = mockGame({ player: p, enemies: [enemy], bullets: [] });
  const events = runCollisions(g);
  assert(events.some((e) => e.type === 'playerHit' && e.source === 'body'));
  assert(!enemy.dead, 'body collision must not kill enemy');
});

test('rebuildBulletLists 按 from 分表', () => {
  const g = mockGame({
    player: { x: 0, y: 0, r: 3 },
    bullets: [
      mockBullet({ from: 'player', x: 1, y: 1 }),
      mockBullet({ from: 'enemy', x: 2, y: 2 }),
      { ...mockBullet({ from: 'player' }), dead: true },
    ],
  });
  rebuildBulletLists(g);
  assertEqual(g.playerBullets.length, 1);
  assertEqual(g.enemyBullets.length, 1);
});
