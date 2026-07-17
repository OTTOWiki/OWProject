import { BALANCE, LOGICAL_W, LOGICAL_H } from './config.js';
import {
  loadSprite, spriteKeyForEnemy, spriteKeyForPlayer,
  drawSpriteCirc, drawSprite,
} from './sprites.js';

let _id = 1;
const nid = () => _id++;

/* ========== Bullets ========== */
export class Bullet {
  constructor(opts) {
    this.id = nid();
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.vx || 0;
    this.vy = opts.vy || 0;
    this.speed = opts.speed ?? 0;
    this.angle = opts.angle ?? 0;
    this.type = opts.type || 'dot'; // dot, rice, talisman, medium, large, laser
    this.from = opts.from || 'enemy'; // enemy | player
    this.damage = opts.damage || 1;
    this.r = opts.r ?? hitR(this.type);
    this.w = opts.w || visualSize(this.type).w;
    this.h = opts.h || visualSize(this.type).h;
    this.color = opts.color || '#f472b6';
    this.color2 = opts.color2 || '#fff';
    this.life = opts.life ?? 20;
    this.grazed = false;
    this.dead = false;
    this.accel = opts.accel || 0;
    this.spin = opts.spin || 0;
    this.homing = opts.homing || 0;
    this.delay = opts.delay || 0;
    this.laserLen = opts.laserLen || 0;
    this.owner = opts.owner || null;
    this.gravity = opts.gravity || 0;
    this.onSplit = opts.onSplit || null;
    this.age = 0;
    if (this.speed && !opts.vx && !opts.vy) {
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
    }
  }

  /**
   * @param {number} dt
   * @param {object|null} player 自机（敌弹追踪用）
   * @param {object|null} homeTarget 可选追踪目标（玩家子弹打怪）
   */
  update(dt, player, homeTarget = null) {
    if (this.delay > 0) {
      this.delay -= dt;
      return;
    }
    this.age += dt;
    this.life -= dt;
    if (this.life <= 0) {
      if (this.onSplit) this.onSplit(this);
      this.dead = true;
      return;
    }
    if (this.spin) this.angle += this.spin * dt;
    if (this.accel) {
      const sp = Math.hypot(this.vx, this.vy) + this.accel * dt;
      const a = Math.atan2(this.vy, this.vx);
      this.vx = Math.cos(a) * sp;
      this.vy = Math.sin(a) * sp;
    }
    if (this.gravity) this.vy += this.gravity * dt;
    if (this.homing) {
      const target = this.from === 'player' ? homeTarget : player;
      if (target) {
        const ta = Math.atan2(target.y - this.y, target.x - this.x);
        const ca = Math.atan2(this.vy, this.vx);
        let da = ta - ca;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        const na = ca + Math.sign(da) * Math.min(Math.abs(da), this.homing * dt);
        const sp = Math.hypot(this.vx, this.vy) || this.speed || 2;
        this.vx = Math.cos(na) * sp;
        this.vy = Math.sin(na) * sp;
        this.angle = na;
      }
    }
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    if (this.type === 'laser') {
      // laser is a segment from (x,y) along angle
      if (this.x < -80 || this.x > LOGICAL_W + 80 || this.y < -80 || this.y > LOGICAL_H + 80) this.dead = true;
    } else {
      if (this.x < -40 || this.x > LOGICAL_W + 40 || this.y < -40 || this.y > LOGICAL_H + 40) this.dead = true;
    }
  }
}

function hitR(type) {
  return {
    dot: 3, rice: 2, talisman: 4, medium: 6, large: 12, laser: 5,
    player: 5, option: 6,
  }[type] || 3;
}
function visualSize(type) {
  return {
    dot: { w: 8, h: 8 },
    rice: { w: 12, h: 6 },
    talisman: { w: 16, h: 8 },
    medium: { w: 16, h: 16 },
    large: { w: 32, h: 32 },
    laser: { w: 10, h: 80 },
    player: { w: 10, h: 22 },
    option: { w: 12, h: 12 },
  }[type] || { w: 8, h: 8 };
}

/* ========== Player ========== */
export class Player {
  constructor(def) {
    this.def = def;
    this.x = LOGICAL_W / 2;
    this.y = LOGICAL_H * 0.82;
    this.r = BALANCE.playerRadius;
    this.lives = BALANCE.startLives;
    this.bombs = BALANCE.startBombs;
    this.invuln = 0;
    this.shotCd = 0;
    this.bombTimer = 0;
    this.arbitration = 0; // 审核中
    this.dead = false;
    this.slow = false;
    this.edit = 0;
    this.focused = false;
  }

  resetPos() {
    this.x = LOGICAL_W / 2;
    this.y = LOGICAL_H * 0.82;
  }

  update(dt, input, opts = {}) {
    if (this.arbitration > 0) {
      this.arbitration -= dt;
      return;
    }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.bombTimer > 0) this.bombTimer -= dt;
    if (this.shotCd > 0) this.shotCd -= dt;

    this.slow = input.slowHeld();
    const speed = this.slow ? BALANCE.playerSlowSpeed : BALANCE.playerSpeed;

    if (input.virtualMove) {
      this.x = input.virtualMove.x;
      this.y = input.virtualMove.y;
    } else {
      const axis = input.moveAxis();
      this.x += axis.x * speed * dt * 60;
      this.y += axis.y * speed * dt * 60;
    }
    this.x = Math.max(8, Math.min(LOGICAL_W - 8, this.x));
    this.y = Math.max(8, Math.min(LOGICAL_H - 8, this.y));
  }
}

/* ========== Enemy ========== */
export class Enemy {
  constructor(opts) {
    this.id = nid();
    this.hp = opts.hp;
    this.maxHp = opts.hp;
    this.r = opts.r || 18;
    this.type = opts.type || 'mob'; // mob, elite, boss
    this.kind = opts.kind || 'generic';
    this.label = opts.label || '';
    this.color = opts.color || '#f472b6';
    this.color2 = opts.color2 || '#67e8f9';
    this.dead = false;
    this.vx = opts.vx || 0;
    this.vy = opts.vy || 0;
    this.age = 0;
    this.phase = 0;
    this.timers = {};
    this.script = opts.script || null;
    this.onDeath = opts.onDeath || null;
    this.drop = opts.drop || null;
    this.invuln = opts.invuln || 0;
    this.score = opts.score || BALANCE.score.killSmall;
    this.spin = 0;
    this.data = opts.data || {};

    // 入场目标（脚本/移动生效前的落位）
    this.enterX = opts.x;
    // 负 Y / 过顶的目标点默认收到场内，避免屏外就结束入场
    let holdY = opts.enterY != null && Number.isFinite(opts.enterY) ? opts.enterY : opts.y;
    if (!(holdY > 8)) holdY = 40;
    this.enterY = holdY;
    this.spawnFxT = 0; // >0 时播出现特效，结束后才可行动
    this.spawnFxDur = 0;
    this.entering = false;

    if (opts.skipEnter) {
      this.x = opts.x;
      this.y = opts.y;
      this.enterY = opts.y;
    } else if (opts.spawnFx) {
      // 特效入场：原地法阵/涟漪后现身（落在 hold 点）
      this.x = opts.x;
      this.y = this.enterY;
      this.spawnFxDur = opts.spawnFxDur ?? (this.type === 'boss' ? 0.7 : 0.45);
      this.spawnFxT = this.spawnFxDur;
      this.invuln = Math.max(this.invuln, this.spawnFxT + 0.15);
    } else {
      // 屏外飞入 → enterX/enterY
      this.entering = true;
      const from = opts.enterFrom || this._autoEnterFrom(opts.x, this.enterY);
      if (from === 'left') {
        this.x = -40 - Math.random() * 30;
        this.y = this.enterY;
      } else if (from === 'right') {
        this.x = LOGICAL_W + 40 + Math.random() * 30;
        this.y = this.enterY;
      } else if (from === 'bottom') {
        this.x = opts.x;
        this.y = LOGICAL_H + 40;
      } else {
        // top
        this.x = opts.x + (Math.random() - 0.5) * 20;
        this.y = -35 - Math.random() * 40;
      }
      this.invuln = Math.max(this.invuln, 0.55);
    }
  }

  _autoEnterFrom(x, y) {
    if (x < LOGICAL_W * 0.18) return 'left';
    if (x > LOGICAL_W * 0.82) return 'right';
    if (y > LOGICAL_H * 0.55) return 'bottom';
    return 'top';
  }

  /** 是否仍在入场/现身中（不可行动、脚本不跑） */
  get isSpawning() {
    return this.entering || this.spawnFxT > 0;
  }

  update(dt, game) {
    this.age += dt;
    if (this.invuln > 0) this.invuln -= dt;
    this.spin += dt;

    // 特效现身
    if (this.spawnFxT > 0) {
      this.spawnFxT -= dt;
      if (this.spawnFxT < 0) this.spawnFxT = 0;
      this.x = this.enterX;
      this.y = this.enterY;
      return;
    }

    // 屏外飞入至目标点
    if (this.entering) {
      const dx = this.enterX - this.x;
      const dy = this.enterY - this.y;
      const dist = Math.hypot(dx, dy);
      const sp = (this.type === 'boss' ? 95 : 130) * dt;
      if (dist <= sp + 0.5) {
        this.x = this.enterX;
        this.y = this.enterY;
        this.entering = false;
      } else {
        this.x += (dx / dist) * sp;
        this.y += (dy / dist) * sp;
      }
      return; // 入场完成前不跑 script / 自由移动
    }

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    if (this.script) this.script(this, dt, game);
    if (this.y > LOGICAL_H + 60 || this.x < -80 || this.x > LOGICAL_W + 80) {
      if (this.type !== 'boss') this.dead = true;
    }
  }

  hurt(dmg) {
    if (this.invuln > 0 || this.isSpawning) return false;
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }
}

/* ========== Item drops ========== */
export class Item {
  constructor(x, y, kind = 'score') {
    this.id = nid();
    this.x = x;
    this.y = y;
    this.kind = kind; // score, scoreL, life, bomb, power
    this.vy = BALANCE.itemPopVy ?? -0.55;
    this.vx = (Math.random() - 0.5) * 0.55;
    this.r = kind === 'scoreL' ? 10 : 8;
    this.dead = false;
    this.attract = false; // 永久吸引标记：一旦为 true 不会再下落
  }

  update(dt, player, autoAttract) {
    const line = BALANCE.itemCollectLine ?? LOGICAL_H * 0.28;

    // 自机越过收点线 / Bomb 全收：锁定吸引，之后自机回到线下也不取消
    if (autoAttract || player.y < line) {
      this.attract = true;
    }

    if (this.attract) {
      const a = Math.atan2(player.y - this.y, player.x - this.x);
      const sp = BALANCE.itemAttractSpeed ?? 9.5;
      this.x += Math.cos(a) * sp * dt * 60;
      this.y += Math.sin(a) * sp * dt * 60;
      this.vx = 0;
      this.vy = 0;
    } else {
      // 缓慢下落（比原先明显更慢）
      const g = BALANCE.itemFallGravity ?? 0.022;
      const maxVy = BALANCE.itemFallMaxVy ?? 1.35;
      this.vy = Math.min(maxVy, this.vy + g * dt * 60);
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      this.vx *= 0.992;
    }
    if (this.y > LOGICAL_H + 20) this.dead = true;
  }
}

/* ========== Particles ========== */
export class Particle {
  constructor(x, y, color, life = 0.4) {
    this.x = x;
    this.y = y;
    const a = Math.random() * Math.PI * 2;
    const s = 1 + Math.random() * 3;
    this.vx = Math.cos(a) * s;
    this.vy = Math.sin(a) * s;
    this.life = life;
    this.max = life;
    this.color = color;
    this.r = 2 + Math.random() * 3;
    this.dead = false;
  }
  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    if (this.life <= 0) this.dead = true;
  }
}

/* ========== Drawing helpers — 梦幻弹幕 + 贴图 ========== */
function withAlpha(hex, a) {
  if (!hex || hex[0] !== '#' || (hex.length !== 7 && hex.length !== 4)) {
    return `rgba(255,255,255,${a})`;
  }
  let r; let g; let b;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  return `rgba(${r},${g},${b},${a})`;
}

function softGlow(ctx, r, color, color2) {
  // 外层光晕
  const outer = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.85);
  outer.addColorStop(0, withAlpha(color2 || '#ffffff', 0.7));
  outer.addColorStop(0.35, withAlpha(color, 0.4));
  outer.addColorStop(1, 'transparent');
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.85, 0, Math.PI * 2);
  ctx.fill();

  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.25, 0, 0, 0, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.28, color2 || '#fff');
  g.addColorStop(0.72, color);
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // 高光点
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.28, Math.max(1.2, r * 0.22), 0, Math.PI * 2);
  ctx.fill();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {*} b
 * @param {number} [alphaMul=1] 整体不透明度倍率（自机弹用）
 */
export function drawBullet(ctx, b, alphaMul = 1) {
  const a = Math.max(0, Math.min(1, alphaMul));
  if (b.delay > 0) {
    // 预显环
    ctx.save();
    ctx.globalAlpha = 0.35 * a;
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 6 + Math.sin(performance.now() / 80) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(b.x, b.y);
  if (b.type !== 'dot' && b.type !== 'medium' && b.type !== 'large' && b.type !== 'option') {
    ctx.rotate(b.angle + Math.PI / 2);
  }

  if (b.type === 'dot' || b.type === 'medium' || b.type === 'large') {
    softGlow(ctx, b.w / 2, b.color, b.color2 || '#fff');
  } else if (b.type === 'rice') {
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 12;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, b.w / 2);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.4, b.color2 || '#fff');
    g.addColorStop(1, b.color);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, b.h / 2 + 1, b.w / 2 + 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(0, -1, b.h * 0.15, b.w * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.type === 'talisman') {
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 10;
    const grd = ctx.createLinearGradient(0, -b.h, 0, b.h);
    grd.addColorStop(0, '#fff');
    grd.addColorStop(0.4, b.color2 || b.color);
    grd.addColorStop(1, b.color);
    ctx.fillStyle = grd;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.2;
    const w = b.w + 2;
    const h = b.h + 2;
    ctx.beginPath();
    ctx.roundRect?.(-w / 2, -h / 2, w, h, 2) || ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(-w / 2 + 3, -1, w - 6, 2);
  } else if (b.type === 'laser') {
    const len = b.laserLen || 200;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 16;
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.15, b.color);
    g.addColorStop(1, 'transparent');
    ctx.strokeStyle = g;
    ctx.lineWidth = b.w + 4;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len);
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = b.w * 0.55;
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len * 0.92);
    ctx.stroke();
    ctx.globalAlpha = 1;
    softGlow(ctx, b.w * 0.45, b.color, '#fff');
  } else if (b.type === 'player') {
    const hw = (b.w || 10) / 2;
    const hh = (b.h || 22) / 2;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 14;
    const g = ctx.createLinearGradient(0, hh, 0, -hh);
    g.addColorStop(0, b.color);
    g.addColorStop(0.4, b.color2 || '#fff');
    g.addColorStop(1, '#fff');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, hw * 0.65, hh * 1.05, 0, 0, Math.PI * 2);
    ctx.fill();
    // 拖尾光
    ctx.globalAlpha = 0.45 * a;
    ctx.beginPath();
    ctx.ellipse(0, hh * 0.6, hw * 0.35, hh * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = a;
    ctx.shadowBlur = 0;
  } else if (b.type === 'option') {
    const r = (b.w || 12) / 2;
    softGlow(ctx, r * 0.95, b.color, b.color2 || '#fff');
    // 星形高光
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + performance.now() / 400;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * r * 1.1, Math.sin(ang) * r * 1.1);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPlayer(ctx, p) {
  const inv = p.invuln > 0 && Math.floor(p.invuln * 20) % 2 === 0;
  const alpha = inv && p.arbitration <= 0 ? 0.35 : 1;

  // 子机
  const t = performance.now() / 1000;
  const ox = p.slow ? 16 : 22;
  const oy = p.slow ? -6 : 2;
  const bob = Math.sin(t * 6) * 1.5;
  for (const side of [-1, 1]) {
    const sx = p.x + side * ox;
    const sy = p.y + oy + bob * side;
    ctx.save();
    ctx.globalAlpha = alpha;
    softGlowAt(ctx, sx, sy, 6, p.def.color, p.def.color2);
    ctx.restore();
  }

  // 贴图 + 光晕
  const key = spriteKeyForPlayer(p);
  const img = loadSprite(key);
  const size = 36;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
  g.addColorStop(0, withAlpha(p.def.color2, 0.55));
  g.addColorStop(0.5, withAlpha(p.def.color, 0.28));
  g.addColorStop(1, 'transparent');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
  ctx.fill();

  const ok = drawSpriteCirc(ctx, img, p.x, p.y, size, {
    glow: p.def.color,
    alpha,
    rot: Math.sin(t * 2) * 0.04,
  });
  if (!ok) {
    // 回退几何
    softGlowAt(ctx, p.x, p.y, BALANCE.playerDrawRadius, p.def.color, p.def.color2);
  }

  // 判定点
  if (p.slow || p.arbitration > 0) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  if (p.arbitration > 0) {
    ctx.strokeStyle = 'rgba(248,113,113,.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20 + Math.sin(performance.now() / 30) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function softGlowAt(ctx, x, y, r, color, color2) {
  ctx.save();
  ctx.translate(x, y);
  softGlow(ctx, r, color, color2);
  ctx.restore();
}

export function drawEnemy(ctx, e) {
  const key = spriteKeyForEnemy(e);
  const img = loadSprite(key);
  const isBoss = e.type === 'boss' || e.kind === 'boss';
  const isElite = e.type === 'elite' || e.kind === 'mid' || e.kind === 'mid1' || e.kind === 'mid2' || e.kind === 'mid3';
  const size = isBoss ? 78 : isElite ? 48 : 32;

  // 特效现身：只画法阵/涟漪，本体渐显
  const fxT = e.spawnFxT || 0;
  const fxDur = e.spawnFxDur || (isBoss ? 0.7 : 0.45);
  let bodyAlpha = 1;
  if (fxT > 0) {
    const p = 1 - Math.max(0, fxT) / Math.max(1e-4, fxDur); // 0→1
    bodyAlpha = Math.max(0, (p - 0.35) / 0.65);
    drawSpawnFx(ctx, e, p, size);
    if (bodyAlpha <= 0.02) {
      // 仍画环形血条占位（Boss）
      if (isBoss && e.maxHp > 0) {
        ctx.save();
        ctx.translate(e.x, e.y);
        drawBossRingHp(ctx, e, size);
        ctx.restore();
      }
      return;
    }
  }

  ctx.save();
  ctx.globalAlpha = bodyAlpha;

  // 底层光环
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.spin * (isBoss ? 0.4 : 1.2));
  const ring = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 0.7);
  ring.addColorStop(0, withAlpha(e.color, 0.35));
  ring.addColorStop(1, 'transparent');
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const drawn = drawSpriteCirc(ctx, img, e.x, e.y, size, {
    glow: e.color,
    rot: isBoss ? e.spin * 0.25 : e.spin * 0.8,
    glowBlur: isBoss ? 22 : 12,
  });

  if (!drawn) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (isBoss) drawBossShape(ctx, e);
    else if (isElite) drawEliteShape(ctx, e);
    else {
      ctx.rotate(e.spin * 1.5);
      ctx.strokeStyle = e.color;
      ctx.fillStyle = e.color + '55';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = Math.cos(a) * e.r;
        const y = Math.sin(a) * e.r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(e.x, e.y);

  // Boss：围绕自身的环形血条；精英：头顶短条
  if (e.type !== 'mob' && e.maxHp > 0) {
    if (isBoss) {
      drawBossRingHp(ctx, e, size);
    } else {
      const bw = 44;
      const barY = -size / 2 - 10;
      const t = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(-bw / 2, barY, bw, 5);
      ctx.fillStyle = e.color;
      ctx.fillRect(-bw / 2, barY, bw * t, 5);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.strokeRect(-bw / 2, barY, bw, 5);
    }
  }

  if (e.label) {
    ctx.fillStyle = e.color;
    ctx.font = 'bold 11px "Songti SC", serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = bodyAlpha * (0.7 + Math.sin(e.spin * 4) * 0.3);
    ctx.fillText(e.label, 0, size / 2 + 14);
    ctx.globalAlpha = bodyAlpha;
  }
  ctx.restore();
  ctx.restore();
}

/** Boss 环形血条（绕本体） */
function drawBossRingHp(ctx, e, size) {
  const t = Math.max(0, Math.min(1, e.hp / e.maxHp));
  const radius = size * 0.58;
  const start = -Math.PI / 2;

  // 底环
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // 血量弧
  if (t > 0.001) {
    const grad = ctx.createLinearGradient(-radius, 0, radius, 0);
    grad.addColorStop(0, e.color2 || '#fff');
    grad.addColorStop(1, e.color);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, radius, start, start + Math.PI * 2 * t);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }
}

/** 入场法阵 / 涟漪特效 p: 0→1 */
function drawSpawnFx(ctx, e, p, size) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const baseR = size * (0.35 + p * 0.55);
  const a = Math.min(1, p * 1.4) * (1 - Math.max(0, p - 0.75) / 0.25);

  ctx.globalAlpha = 0.55 * a;
  ctx.strokeStyle = e.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, baseR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.35 * a;
  ctx.strokeStyle = e.color2 || '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, baseR * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  // 旋转符文刻度
  ctx.globalAlpha = 0.7 * a;
  ctx.rotate(e.spin * 3 + p * Math.PI);
  ctx.strokeStyle = e.color;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * baseR * 0.55, Math.sin(ang) * baseR * 0.55);
    ctx.lineTo(Math.cos(ang) * baseR * 1.05, Math.sin(ang) * baseR * 1.05);
    ctx.stroke();
  }

  // 中心光
  ctx.rotate(-(e.spin * 3 + p * Math.PI));
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, baseR * 0.5);
  g.addColorStop(0, withAlpha('#ffffff', 0.55 * a));
  g.addColorStop(0.5, withAlpha(e.color, 0.25 * a));
  g.addColorStop(1, 'transparent');
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, baseR * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBossShape(ctx, e) {
  const kind = e.kind;
  ctx.rotate(e.spin * 0.6);

  if (kind === 'alice') {
    drawGear(ctx, 36, 10, e.spin * 2, e.color);
    drawGear(ctx, 22, 8, -e.spin * 3, e.color2);
  } else if (kind === 'icebin') {
    drawHex(ctx, 34, e.color2);
    ctx.rotate(Math.PI / 6);
    drawHex(ctx, 22, e.color);
  } else if (kind === 'dazong') {
    drawPoly(ctx, 8, 40, e.color);
    ctx.rotate(-e.spin);
    drawPoly(ctx, 6, 26, e.color2);
  } else if (kind === 'patrol') {
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.strokeRect(-40 + i * 2, -28 + i * 3, 80 - i * 4, 12);
    }
    ctx.fillStyle = e.color;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('404', 0, 4);
  } else if (kind === 'menbailiang') {
    // obelisk
    ctx.fillStyle = e.color + '88';
    ctx.strokeStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.lineTo(12, 30);
    ctx.lineTo(-12, 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'yimeige') {
    ctx.strokeStyle = e.color;
    ctx.fillStyle = e.color + '44';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(Math.cos(e.spin + i) * 12, Math.sin(e.spin + i) * 12, 14 - i * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (kind === 'duren') {
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + e.spin;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28);
      ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 40);
      ctx.stroke();
    }
  } else if (kind === 'gundian') {
    ctx.fillStyle = e.color + '66';
    ctx.strokeStyle = e.color;
    ctx.fillRect(-18, -10, 36, 24);
    ctx.strokeRect(-18, -10, 36, 24);
    ctx.beginPath();
    ctx.arc(0, 18, 10, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 'lastgod') {
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 28, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -8, 10, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 'rival') {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 32);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.4, e.color2);
    g.addColorStop(1, e.color);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
  } else {
    drawPoly(ctx, 6, 32, e.color);
  }

  // center label flash
  if (e.label) {
    ctx.rotate(-e.spin * 0.6);
    ctx.fillStyle = e.color;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.65 + Math.sin(e.spin * 5) * 0.35;
    ctx.fillText(`【${e.label}】`, 0, 4);
    ctx.globalAlpha = 1;
  }
}

function drawEliteShape(ctx, e) {
  if (e.kind === 'mid1') {
    ctx.strokeStyle = e.color;
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.strokeRect(-22, -22, 44, 44);
    ctx.setLineDash([]);
    ctx.fillStyle = e.color + '44';
    ctx.fillRect(-14, -14, 28, 28);
  } else if (e.kind === 'mid2') {
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(22, 0);
    ctx.lineTo(0, 26);
    ctx.lineTo(-22, 0);
    ctx.closePath();
    ctx.stroke();
  } else if (e.kind === 'mid3') {
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(24, 20);
    ctx.lineTo(-24, 20);
    ctx.closePath();
    ctx.stroke();
  } else {
    drawPoly(ctx, 5, 24, e.color);
  }
}

function drawGear(ctx, r, teeth, rot, color) {
  ctx.save();
  ctx.rotate(rot);
  ctx.strokeStyle = color;
  ctx.fillStyle = color + '33';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.72;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawHex(ctx, r, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color + '33';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawPoly(ctx, n, r, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color + '33';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawItem(ctx, it) {
  ctx.save();
  ctx.translate(it.x, it.y);
  const colors = {
    score: '#fde68a',
    scoreL: '#fbbf24',
    life: '#ff7a9a',
    bomb: '#c4b5fd',
    power: '#86efac',
  };
  const c = colors[it.kind] || '#fff';
  ctx.fillStyle = c;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.2;
  ctx.shadowColor = c;
  ctx.shadowBlur = it.attract ? 10 : 4;
  if (it.kind === 'scoreL' || it.kind === 'life' || it.kind === 'bomb') {
    ctx.beginPath();
    ctx.arc(0, 0, it.kind === 'scoreL' ? 8 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(40,20,10,0.85)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = it.kind === 'life' ? 'L' : it.kind === 'bomb' ? 'B' : 'P';
    ctx.fillText(label, 0, 0.5);
  } else {
    // 小P点：方块 + P
    ctx.fillRect(-5.5, -5.5, 11, 11);
    ctx.strokeRect(-5.5, -5.5, 11, 11);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(40,20,10,0.85)';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', 0, 0.5);
  }
  ctx.restore();
}

/** 浅色虚线收点线 */
export function drawCollectLine(ctx, w) {
  const y = BALANCE.itemCollectLine ?? 168;
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(210, 230, 255, 0.42)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8, y);
  ctx.lineTo(w - 8, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(210, 230, 255, 0.38)';
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('— 收点线 —', 12, y - 5);
  ctx.restore();
}
