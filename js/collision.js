/**
 * 碰撞与距离工具（从 game.js 拆出）
 * 自机弹×敌机使用网格粗筛，降低密弹时 O(n·m) 开销
 *
 * runCollisions 只做几何命中与实体状态（dead / grazed / hurt）；
 * 得分、掉落、SFX、onDeath 由 apply 侧（gameCombat）消费事件。
 *
 * 分表 playerBullets / enemyBullets 为权威存活列表（spawn 直写，帧末 purge）。
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
  if (len2 < 1e-8) {
    const ex = px - x1;
    const ey = py - y1;
    return Math.sqrt(ex * ex + ey * ey);
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const qx = px - (x1 + t * dx);
  const qy = py - (y1 + t * dy);
  return Math.sqrt(qx * qx + qy * qy);
}

/** 点到线段最短距离的平方（避免热路径 sqrt，仅圆弹粗/精筛用） */
export function distPointSeg2(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-8) {
    const ex = px - x1;
    const ey = py - y1;
    return ex * ex + ey * ey;
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const qx = px - (x1 + t * dx);
  const qy = py - (y1 + t * dy);
  return qx * qx + qy * qy;
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
  const dx = b.x - p.x;
  const dy = b.y - p.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ---- 可复用网格（避免每帧 new Map / 新桶）----
const _gridMap = new Map();
const _gridFreeBuckets = [];
let _gridActiveKeys = [];

/**
 * 将存活敌机放入网格（cell -> Enemy[]）
 * @param {object[]} enemies
 * @param {number} [cell=GRID_CELL]
 */
export function buildEnemyGrid(enemies, cell = GRID_CELL) {
  // 回收上一帧桶
  for (let i = 0; i < _gridActiveKeys.length; i++) {
    const bucket = _gridMap.get(_gridActiveKeys[i]);
    if (bucket) {
      bucket.length = 0;
      _gridFreeBuckets.push(bucket);
    }
  }
  _gridMap.clear();
  _gridActiveKeys = [];

  const inv = 1 / cell;
  for (const e of enemies) {
    if (e.dead || e.isSpawning) continue;
    const cx = Math.floor(e.x * inv);
    const cy = Math.floor(e.y * inv);
    const key = cx * 73856093 ^ cy * 19349663;
    let bucket = _gridMap.get(key);
    if (!bucket) {
      bucket = _gridFreeBuckets.length > 0 ? _gridFreeBuckets.pop() : [];
      _gridMap.set(key, bucket);
      _gridActiveKeys.push(key);
    }
    bucket.push(e);
  }
  return { grid: _gridMap, cell, inv };
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
      for (let i = 0; i < bucket.length; i++) visit(bucket[i]);
    }
  }
}

/**
 * 生产路径兼容守卫：runCollisions 每帧在「合并 bullets 旧状态」下调用。
 * 正常分表（playerBullets/enemyBullets）已是权威时本函数直接返回。
 */
export function rebuildBulletLists(game) {
  const player = game.playerBullets || (game.playerBullets = []);
  const enemy = game.enemyBullets || (game.enemyBullets = []);
  // 分表已有存活弹且无合并表 → 已是权威
  if ((!game.bullets || game.bullets.length === 0)
    && (player.length > 0 || enemy.length > 0)) {
    return;
  }
  // 从合并表重建（测试 / 旧路径）
  if (game.bullets && game.bullets.length) {
    player.length = 0;
    enemy.length = 0;
    for (const b of game.bullets) {
      if (b.dead) continue;
      if (b.from === 'player') player.push(b);
      else enemy.push(b);
    }
  }
}

/**
 * 运行一帧碰撞：几何 + 命中状态，返回事件列表（不写分/SFX/掉落）
 * @param {import('./game.js').Game} game
 * @returns {CollisionEvent[]}
 */
export function runCollisions(game) {
  /** @type {CollisionEvent[]} */
  const events = game._colEvents || (game._colEvents = []);
  events.length = 0;

  const p = game.player;
  if (!p) return events;

  // 兼容：仅 bullets 有数据时补分表
  if ((!game.playerBullets?.length && !game.enemyBullets?.length) && game.bullets?.length) {
    rebuildBulletLists(game);
  }

  const playerBullets = game.playerBullets || (game.playerBullets = []);
  const enemyBullets = game.enemyBullets || (game.enemyBullets = []);

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
  for (let i = 0; i < living.length; i++) {
    const er = living[i].r;
    if (er > maxEnemyR) maxEnemyR = er;
  }

  // player bullets vs enemies
  for (let bi = 0; bi < playerBullets.length; bi++) {
    const b = playerBullets[bi];
    if (b.dead) continue;
    const br = b.r;
    const hitR = br + maxEnemyR;
    const hitR2 = hitR * hitR;
    const bx = b.x;
    const by = b.y;
    const isBomb = b.type === 'bomb';

    const applyHit = (e) => {
      if (e.dead || e.isSpawning) return false;
      const dx = bx - e.x;
      const dy = by - e.y;
      const rr = br + e.r;
      if (dx * dx + dy * dy >= rr * rr) return false;
      if (isBomb) {
        if (!b._hitIds) b._hitIds = new Set();
        if (b._hitIds.has(e.id)) return false;
        b._hitIds.add(e.id);
      } else {
        b.dead = true;
      }
      const killed = e.hurt(b.damage);
      if (killed) {
        events.push({ type: 'kill', enemy: e });
      }
      return true;
    };

    if (gridWrap) {
      let done = false;
      forEnemiesNear(gridWrap, bx, by, hitR, (e) => {
        if (done || b.dead) return;
        // 粗筛：hitR 平方（含 maxEnemyR 裕量，applyHit 再精算）
        const dx = bx - e.x;
        const dy = by - e.y;
        if (dx * dx + dy * dy >= hitR2) return;
        if (applyHit(e) && !isBomb) done = true;
      });
    } else {
      for (let ei = 0; ei < living.length; ei++) {
        if (b.dead) break;
        if (applyHit(living[ei]) && !isBomb) break;
      }
    }
  }

  // enemy bullets vs player
  const px = p.x;
  const py = p.y;
  const pr = p.r;
  const grazeR = BALANCE.grazeRadius;

  for (let i = 0; i < enemyBullets.length; i++) {
    const b = enemyBullets[i];
    if (b.dead || b.delay > 0) {
      if (b) b._grazeNear = false;
      continue;
    }

    if (b.type === 'laser') {
      const len = b.laserLen || 0;
      if (len <= 0) {
        b._grazeNear = false;
        continue;
      }
      const hitR = (b.w || 10) * 0.5;
      const ang = b.angle || 0;
      const x2 = b.x + Math.cos(ang) * len;
      const y2 = b.y + Math.sin(ang) * len;
      const dist2 = distPointSeg2(px, py, b.x, b.y, x2, y2);
      const hitSum = pr + hitR;
      const grazeSum = grazeR + hitR;
      const hitSum2 = hitSum * hitSum;
      const grazeSum2 = grazeSum * grazeSum;
      b._grazeNear = dist2 < grazeSum2;

      if (!b.grazed && dist2 < grazeSum2 && dist2 > hitSum2) {
        b.grazed = true;
        events.push({ type: 'graze', bullet: b });
      }
      if (dist2 < hitSum2) {
        b.dead = true;
        events.push({ type: 'playerHit', source: 'bullet', bullet: b });
      }
    } else {
      const dx = b.x - px;
      const dy = b.y - py;
      const hitR = b.r;
      const dist2 = dx * dx + dy * dy;
      const hitSum = pr + hitR;
      const grazeSum = grazeR + hitR;

      // 轴对齐粗筛
      if (dx > grazeSum || dx < -grazeSum || dy > grazeSum || dy < -grazeSum) {
        b._grazeNear = false;
        continue;
      }

      const hitSum2 = hitSum * hitSum;
      const grazeSum2 = grazeSum * grazeSum;
      b._grazeNear = dist2 < grazeSum2;

      if (!b.grazed && dist2 < grazeSum2 && dist2 > hitSum2) {
        b.grazed = true;
        events.push({ type: 'graze', bullet: b });
      }
      if (dist2 < hitSum2) {
        b.dead = true;
        events.push({ type: 'playerHit', source: 'bullet', bullet: b });
      }
    }
  }

  // body collision with enemies
  for (let i = 0; i < living.length; i++) {
    const e = living[i];
    if (e.dead || e.isSpawning) continue;
    const dx = e.x - px;
    const dy = e.y - py;
    const rr = pr + e.r * 0.5;
    if (dx * dx + dy * dy < rr * rr) {
      events.push({ type: 'playerHit', source: 'body', enemy: e });
    }
  }

  return events;
}
