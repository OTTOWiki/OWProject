/**
 * 弹幕模式工具
 * 奇数狙 / 偶数狙：奇数路数中心对准自机，偶数路数中心夹在两侧对称
 */
import { Bullet } from './entities.js';
import { BALANCE, LOGICAL_W, LOGICAL_H } from './config.js';

export function aimAngle(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/**
 * 按难度 bulletCount 缩放发数；可选保持奇/偶性（odd/even 狙）。
 * Normal≈1 时原样返回。
 */
export function scaleBulletCount(game, n, parity = null) {
  const mul = game?.bulletCountMul ?? 1;
  const base = Math.max(1, Math.round(n));
  if (!(mul > 0) || mul === 1) return base;
  let c = Math.max(1, Math.round(base * mul));
  if (parity === 'odd') {
    if (c % 2 === 0) c = mul < 1 ? Math.max(1, c - 1) : c + 1;
  } else if (parity === 'even') {
    if (c % 2 === 1) c = mul < 1 ? Math.max(2, c - 1) : c + 1;
    if (c < 2) c = 2;
  }
  return c;
}

/**
 * 奇数路扇形狙：等角间隔，中心路对准自机（n 为奇数时；n 为偶数时几何与 evenAim 相同）。
 * 角度 = base + (i - (n-1)/2) * spread
 */
export function oddAim(from, player, n, spread = 0.18) {
  const base = aimAngle(from, player);
  const bullets = [];
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    bullets.push(base + (i - mid) * spread);
  }
  return bullets;
}

/**
 * 偶数路扇形狙：与 oddAim 同一公式。
 * n 为偶数时 (n-1)/2 为半步，无弹正对 base，自机方向在中心两弹夹缝。
 * n 为奇数时中心路对准 base（与 oddAim 一致）。历史上曾有空 if 分支，已删除以免误导。
 */
export function evenAim(from, player, n, spread = 0.2) {
  const base = aimAngle(from, player);
  const bullets = [];
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    bullets.push(base + (i - mid) * spread);
  }
  return bullets;
}

export function ring(n, baseAngle = 0) {
  const a = [];
  for (let i = 0; i < n; i++) a.push(baseAngle + (i / n) * Math.PI * 2);
  return a;
}

export function fan(base, n, spread) {
  const a = [];
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++) a.push(base + (i - mid) * spread);
  return a;
}

export function spawnAimed(game, from, player, opts) {
  const {
    n = 1,
    parity = 'odd', // odd | even | fixed | ring
    type = 'dot',
    speed = 2.2,
    spread = 0.16,
    color = '#f472b6',
    color2 = '#fff',
    baseAngle = null,
    accel = 0,
    gravity = 0,
    life = 12,
    laserLen = 220,
  } = opts;

  const parityKey = (parity === 'odd' || parity === 'even') ? parity : null;
  const nn = scaleBulletCount(game, n, parityKey);

  let angles;
  if (parity === 'ring') {
    angles = ring(nn, baseAngle ?? 0);
  } else if (parity === 'fixed') {
    angles = fan(baseAngle ?? Math.PI / 2, nn, spread);
  } else if (parity === 'even') {
    angles = evenAim(from, player, nn, spread);
  } else {
    angles = oddAim(from, player, nn, spread);
  }

  for (const ang of angles) {
    game.bullets.push(new Bullet({
      x: from.x,
      y: from.y,
      angle: ang,
      speed,
      type,
      color,
      color2,
      from: 'enemy',
      accel,
      gravity,
      life,
      laserLen,
      w: type === 'laser' ? 10 : undefined,
    }));
  }
}

export function spawnRingAt(game, x, y, n, speed, type, color, base = 0) {
  const nn = Math.max(3, scaleBulletCount(game, n));
  for (const ang of ring(nn, base)) {
    game.bullets.push(new Bullet({
      x, y, angle: ang, speed, type, color, color2: '#fff', from: 'enemy',
    }));
  }
}

export function spawnCrossFall(game, opts = {}) {
  const {
    y = -10,
    speed = 1.8,
    type = 'rice',
    color = '#a78bfa',
    lanes = 6,
    evenOffset = true,
  } = opts;
  const nn = Math.max(3, scaleBulletCount(game, lanes));
  const step = LOGICAL_W / (nn + 1);
  for (let i = 1; i <= nn; i++) {
    const x = step * i + (evenOffset && i % 2 === 0 ? step * 0.25 : 0);
    game.bullets.push(new Bullet({
      x, y,
      vx: (i % 2 === 0 ? 0.4 : -0.4),
      vy: speed,
      type, color, from: 'enemy',
      angle: Math.PI / 2,
    }));
  }
}

export function spawnGravityRain(game, count, type = 'medium', color = '#38bdf8', speed = 1.2) {
  const nn = Math.max(1, scaleBulletCount(game, count));
  for (let i = 0; i < nn; i++) {
    game.bullets.push(new Bullet({
      x: Math.random() * LOGICAL_W,
      y: -20 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.8,
      vy: speed * (0.7 + Math.random() * 0.6),
      gravity: 0.02,
      type, color, from: 'enemy',
      life: 15,
    }));
  }
}

export function spawnPlayerShot(game, player, dmgMul = 1) {
  const atk = (game.playerAtkMul || 1) * (game.atkMul || 1) * dmgMul;
  const mainDmg = 2.8 * atk;
  const optDmg = 1.35 * atk;
  const color = player.def.color;
  const color2 = player.def.color2;

  // 主弹：低速收束、高速扩散；体积加大便于看清
  const shots = player.slow
    ? [
        { ox: 0, oy: -14, ang: -Math.PI / 2 },
        { ox: -5, oy: -10, ang: -Math.PI / 2 - 0.03 },
        { ox: 5, oy: -10, ang: -Math.PI / 2 + 0.03 },
      ]
    : [
        { ox: -10, oy: -10, ang: -Math.PI / 2 - 0.14 },
        { ox: 0, oy: -14, ang: -Math.PI / 2 },
        { ox: 10, oy: -10, ang: -Math.PI / 2 + 0.14 },
        { ox: -18, oy: -4, ang: -Math.PI / 2 - 0.32 },
        { ox: 18, oy: -4, ang: -Math.PI / 2 + 0.32 },
      ];

  for (const s of shots) {
    game.bullets.push(new Bullet({
      x: player.x + s.ox,
      y: player.y + s.oy,
      angle: s.ang,
      speed: 15,
      type: 'player',
      color,
      color2,
      from: 'player',
      damage: mainDmg,
      r: 5,
      w: 10,
      h: 22,
      life: 2,
    }));
  }

  // 侧方子机：无需瞄准的追踪弹（始终发射）
  player._shotCount = (player._shotCount || 0) + 1;
  const ox = player.slow ? 16 : 22;
  const oy = player.slow ? -6 : 2;
  const home = player.slow ? 9.5 : 7.2;
  const optSpeed = player.slow ? 11 : 10;
  // 初始略向侧前方射出，随后自动转向最近敌人
  for (const side of [-1, 1]) {
    const launchAng = -Math.PI / 2 + side * (player.slow ? 0.55 : 0.95);
    game.bullets.push(new Bullet({
      x: player.x + side * ox,
      y: player.y + oy,
      angle: launchAng,
      speed: optSpeed,
      type: 'option',
      color,
      color2,
      from: 'player',
      damage: optDmg,
      r: 6,
      w: 12,
      h: 12,
      homing: home,
      life: 2.4,
    }));
  }
}

export function clearBulletsToItems(game, cx, cy, radius) {
  let n = 0;
  for (const b of game.bullets) {
    if (b.from !== 'enemy' || b.dead) continue;
    const d = Math.hypot(b.x - cx, b.y - cy);
    if (radius < 0 || d <= radius) {
      b.dead = true;
      n++;
      game.spawnItem(b.x, b.y, Math.random() < 0.15 ? 'scoreL' : 'score');
      game.addScore(10);
    }
  }
  return n;
}

export function fullScreenClear(game) {
  return clearBulletsToItems(game, LOGICAL_W / 2, LOGICAL_H / 2, -1);
}

/**
 * Bomb 释放 8 发巨型追踪弹（自动索敌、高伤害）
 * 需在 fullScreenClear 之后调用，避免被清掉
 */
export function spawnBombOrbs(game, player) {
  const atk = (game.playerAtkMul || 1) * (game.atkMul || 1);
  const n = BALANCE.bombOrbCount ?? 8;
  const dmg = (BALANCE.bombOrbDamage ?? 22) * atk;
  const speed = BALANCE.bombOrbSpeed ?? 7.2;
  const home = BALANCE.bombOrbHoming ?? 11;
  const life = BALANCE.bombOrbLife ?? 3.0;
  const r = BALANCE.bombOrbRadius ?? 18;
  const draw = BALANCE.bombOrbDraw ?? 40;
  const color = player.def?.color || '#c4b5fd';
  const color2 = player.def?.color2 || '#fff';

  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    game.bullets.push(new Bullet({
      x: player.x + Math.cos(ang) * 22,
      y: player.y + Math.sin(ang) * 22,
      angle: ang,
      speed,
      type: 'bomb',
      color,
      color2,
      from: 'player',
      damage: dmg,
      r,
      w: draw,
      h: draw,
      homing: home,
      life,
      _homeSlot: i,
    }));
  }
}

/** 横向激光墙 */
export function spawnHLaser(game, y, dir = 1, color = '#f87171') {
  const x = dir > 0 ? -20 : LOGICAL_W + 20;
  game.bullets.push(new Bullet({
    x, y,
    vx: dir * 3.5,
    vy: 0,
    type: 'laser',
    color,
    laserLen: 60,
    angle: dir > 0 ? 0 : Math.PI,
    w: 10,
    r: 5,
    life: 4,
    from: 'enemy',
  }));
}

/** 固定指向激光（短促） */
export function spawnAimedLaser(game, from, player, color = '#fbbf24') {
  const ang = aimAngle(from, player);
  game.bullets.push(new Bullet({
    x: from.x,
    y: from.y,
    angle: ang,
    speed: 6,
    type: 'laser',
    color,
    laserLen: 180,
    w: 10,
    r: 5,
    life: 1.2,
    from: 'enemy',
  }));
}
