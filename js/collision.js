/**
 * 碰撞与距离工具（从 game.js 拆出）
 * 自机弹×敌机使用网格粗筛，降低密弹时 O(n·m) 开销
 *
 * runCollisions 只做几何命中与实体状态（dead / grazed / hurt）；
 * 得分、掉落、SFX、onDeath 由 apply 侧（gameCombat）消费事件。
 */
import { BALANCE } from './config.js';

const GRID_CELL = 56;

/** @typedef {{ type: 'kill', enemy: object }} KillEvent */
/** @typedef {{ type: 'graze', bullet: object }} GrazeEvent */
/** @typedef {{ type: 'playerHit', source: 'bullet'|'body', bullet?: object, enemy?: object }} PlayerHitEvent */
/** @typedef {KillEvent|GrazeEvent|PlayerHitEvent} CollisionEvent */

/** 点到线段最短距离 */
export function distPointSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-8) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** 敌弹相对自机的有效距离（圆弹=圆心；激光=当前长度线段） */
export function bulletDistToPlayer(b, p) {
  if (b.type === 'laser') {
    const len = b.laserLen || 0;
    if (len <= 0) return Infinity;
    const ang = b.angle || 0;
    const x2 = b.x + Math.cos(ang) * len;
    const y2 = b.y + Math.sin(ang) * len;
    return distPointSeg(p.x, p.y, b.x, b.y, x2, y2);
  }
  return Math.hypot(b.x - p.x, b.y - p.y);
}

/**
 * 将存活敌机放入网格（cell -> Enemy[]）
 * @param {object[]} enemies
 * @param {number} [cell=GRID_CELL]
 */
export function buildEnemyGrid(enemies, cell = GRID_CELL) {
  const grid = new Map();
  const inv = 1 / cell;
  for (const e of enemies) {
    if (e.dead || e.isSpawning) continue;
    const cx = Math.floor(e.x * inv);
    const cy = Math.floor(e.y * inv);
    const key = cx * 73856093 ^ cy * 19349663;
    let bucket = grid.get(key);
    if (!bucket) {
      bucket = [];
      grid.set(key, bucket);
    }
    bucket.push(e);
  }
  return { grid, cell, inv };
}

/**
 * 在网格邻域内查询可能命中的敌机
 * @param {{grid:Map, cell:number, inv:number}} g
 * @param {number} x
 * @param {number} y
 * @param {number} radius  弹半径+最大敌半径裕量
 * @param {(e:object)=>void} visit
 */
export function forEnemiesNear(g, x, y, radius, visit) {
  const { grid, inv } = g;
  const rCells = Math.max(1, Math.ceil(radius * inv));
  const cx = Math.floor(x * inv);
  const cy = Math.floor(y * inv);
  for (let dy = -rCells; dy <= rCells; dy++) {
    for (let dx = -rCells; dx <= rCells; dx++) {
      const key = (cx + dx) * 73856093 ^ (cy + dy) * 19349663;
      const bucket = grid.get(key);
      if (!bucket) continue;
      for (const e of bucket) visit(e);
    }
  }
}

/**
 * 维护自机弹 / 敌弹分表（与 game.bullets 同步，供碰撞与绘制）
 * push 仍走 game.bullets（带难度缩放钩子）
 */
export function rebuildBulletLists(game) {
  const player = game.playerBullets || (game.playerBullets = []);
  const enemy = game.enemyBullets || (game.enemyBullets = []);
  player.length = 0;
  enemy.length = 0;
  for (const b of game.bullets) {
    if (b.dead) continue;
    if (b.from === 'player') player.push(b);
    else enemy.push(b);
  }
}

/**
 * 运行一帧碰撞：几何 + 命中状态，返回事件列表（不写分/SFX/掉落）
 * @param {import('./game.js').Game} game
 * @returns {CollisionEvent[]}
 */
export function runCollisions(game) {
  /** @type {CollisionEvent[]} */
  const events = [];
  const p = game.player;
  if (!p) return events;

  rebuildBulletLists(game);
  const playerBullets = game.playerBullets;
  const enemyBullets = game.enemyBullets;

  // 存活敌机（复用本帧 homeList）
  let living = game._homeList;
  if (!living) {
    living = [];
    for (const e of game.enemies) {
      if (!e.dead && !e.isSpawning) living.push(e);
    }
  }

  const useGrid = living.length >= 4 && playerBullets.length >= 12;
  const gridWrap = useGrid ? buildEnemyGrid(living) : null;
  let maxEnemyR = 24;
  for (const e of living) {
    if (e.r > maxEnemyR) maxEnemyR = e.r;
  }

  // player bullets vs enemies（bomb 巨弹可穿透并分摊伤害）
  for (const b of playerBullets) {
    if (b.dead) continue;
    const hitR = b.r + maxEnemyR;

    const applyHit = (e) => {
      if (e.dead || e.isSpawning) return false;
      if (Math.hypot(b.x - e.x, b.y - e.y) >= b.r + e.r) return false;
      if (b.type === 'bomb') {
        if (!b._hitIds) b._hitIds = new Set();
        if (b._hitIds.has(e.id)) return false;
        b._hitIds.add(e.id);
      } else {
        b.dead = true;
      }
      const killed = e.hurt(b.damage);
      if (killed) {
        // 击杀在碰撞阶段发生；onDeath 须由消费方在 purge 前触发
        events.push({ type: 'kill', enemy: e });
      }
      return true;
    };

    if (gridWrap) {
      let done = false;
      forEnemiesNear(gridWrap, b.x, b.y, hitR, (e) => {
        if (done || b.dead) return;
        if (applyHit(e) && b.type !== 'bomb') done = true;
      });
    } else {
      for (const e of living) {
        if (b.dead) break;
        if (applyHit(e) && b.type !== 'bomb') break;
      }
    }
  }

  // enemy bullets vs player
  for (const b of enemyBullets) {
    if (b.dead || b.delay > 0) continue;

    const dist = bulletDistToPlayer(b, p);
    const hitR = b.type === 'laser' ? (b.w || 10) * 0.5 : b.r;

    if (!b.grazed && dist < BALANCE.grazeRadius + hitR && dist > p.r + hitR) {
      b.grazed = true;
      events.push({ type: 'graze', bullet: b });
    }

    if (dist < p.r + hitR) {
      b.dead = true;
      events.push({ type: 'playerHit', source: 'bullet', bullet: b });
    }
  }

  // body collision with enemies
  for (const e of living) {
    if (e.dead || e.isSpawning) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) < p.r + e.r * 0.5) {
      events.push({ type: 'playerHit', source: 'body', enemy: e });
    }
  }

  return events;
}
