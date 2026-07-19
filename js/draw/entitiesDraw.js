/**
 * Entity drawing (split from entities.js — T13)
 */
import { BALANCE } from '../config.js';
import {
  loadSprite, spriteKeyForEnemy, spriteKeyForPlayer,
  drawSpriteCirc, drawSprite,
} from '../sprites.js';

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

const GRAZE_PURPLE = '#c084fc';
const GRAZE_PURPLE_HI = '#f0abfc';

/** 敌弹是否进入自机擦弹范围（中心距 ≤ grazeR + 判定外包） */
function isEnemyInGrazeRange(b, player) {
  if (!player || b.from !== 'enemy' || b.delay > 0) return false;
  const hitR = b.type === 'laser' ? (b.w || 10) * 0.5 : (b.r || 4);
  let reach = hitR;
  if (b.type === 'laser') reach = Math.max(hitR, (b.laserLen || 0) * 0.5);
  else if (b.type === 'rice') reach = Math.max(b.w || 8, b.h || 8) * 0.55;
  else if (b.type === 'talisman') reach = Math.hypot((b.w || 10) / 2, (b.h || 14) / 2);
  const dist = Math.hypot(b.x - player.x, b.y - player.y);
  return dist < BALANCE.grazeRadius + reach;
}

/** 擦弹时视觉微抖：小幅度、高频率，相位跟子弹 id 绑定 */
function grazeJitterOffset(b) {
  const t = performance.now();
  const seed = (b.id || 0) * 12.9898;
  // ~0.7px 量级，约 25–40Hz 观感
  const jx = Math.sin(t * 0.085 + seed) * 0.75
    + Math.sin(t * 0.13 + seed * 1.7) * 0.35;
  const jy = Math.cos(t * 0.09 + seed * 0.9) * 0.75
    + Math.sin(t * 0.14 + seed * 2.1) * 0.35;
  return { jx, jy };
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
 * 激光弹绘制：细光束，中间略粗、两头略细（纺锤形）
 * 局部坐标已旋转，段从 (0,0) 沿 -Y 方向延伸当前 laserLen（生长中可短）
 */
function drawLaserBeam(ctx, b, col, col2, a, grazeFx) {
  const len = b.laserLen || 0;
  if (len < 1.5) return;
  // 中间略粗、两端略细；整体偏细
  const halfMid = Math.max(1.1, (b.w || 10) * 0.26);
  const halfEnd = halfMid * 0.52;
  const y0 = 0;
  const y1 = -len;

  // 纺锤轮廓：u∈[0,1] 沿长度，中间最粗、两端最细
  const halfAt = (u) => {
    const t = u < 0.5 ? u * 2 : (1 - u) * 2; // 0→1→0
    const s = t * t * (3 - 2 * t); // smoothstep
    return halfEnd + (halfMid - halfEnd) * s;
  };

  // 封闭路径：左缘 0→1，右缘 1→0
  const buildSpindle = (scale) => {
    const segs = Math.max(10, Math.min(28, Math.round(len / 14)));
    ctx.beginPath();
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const y = y0 + (y1 - y0) * u;
      const hx = halfAt(u) * scale;
      if (i === 0) ctx.moveTo(-hx, y);
      else ctx.lineTo(-hx, y);
    }
    for (let i = segs; i >= 0; i--) {
      const u = i / segs;
      const y = y0 + (y1 - y0) * u;
      const hx = halfAt(u) * scale;
      ctx.lineTo(hx, y);
    }
    ctx.closePath();
  };

  ctx.shadowBlur = 0;
  ctx.lineWidth = 0;

  // 1) 外柔光
  buildSpindle(2.2);
  ctx.fillStyle = withAlpha(col, grazeFx ? 0.22 : 0.16);
  ctx.globalAlpha = a;
  ctx.fill();

  // 2) 色晕
  buildSpindle(1.45);
  ctx.fillStyle = withAlpha(col, grazeFx ? 0.55 : 0.42);
  ctx.fill();

  // 3) 主色体
  buildSpindle(1);
  {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, withAlpha(col, 0.75));
    g.addColorStop(0.5, col2);
    g.addColorStop(1, withAlpha(col, 0.75));
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.95 * a;
    ctx.fill();
  }

  // 4) 白芯（更细的纺锤）
  buildSpindle(0.38);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.globalAlpha = 0.95 * a;
  ctx.fill();

  // 5) 针芯线
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = Math.max(0.6, halfMid * 0.18);
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.65 * a;
  ctx.beginPath();
  ctx.moveTo(0, y0);
  ctx.lineTo(0, y1);
  ctx.stroke();

  ctx.globalAlpha = a;
  ctx.lineCap = 'butt';
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {*} b
 * @param {number} [alphaMul=1] 整体不透明度倍率（自机弹用）
 */
export function drawBullet(ctx, b, alphaMul = 1, player = null) {
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

  // 进入擦弹范围：整弹紫色辉光替换原色辉光 + 小幅高频抖动（不叠加原色 glow）
  const grazeFx = isEnemyInGrazeRange(b, player);
  const col = grazeFx ? GRAZE_PURPLE : b.color;
  const col2 = grazeFx ? GRAZE_PURPLE_HI : (b.color2 || '#fff');
  let drawX = b.x;
  let drawY = b.y;
  if (grazeFx) {
    const { jx, jy } = grazeJitterOffset(b);
    drawX += jx;
    drawY += jy;
  }

  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(drawX, drawY);
  if (b.type !== 'dot' && b.type !== 'medium' && b.type !== 'large' && b.type !== 'option' && b.type !== 'bomb') {
    ctx.rotate(b.angle + Math.PI / 2);
  }

  if (b.type === 'dot' || b.type === 'medium' || b.type === 'large') {
    softGlow(ctx, b.w / 2, col, col2);
  } else if (b.type === 'bomb') {
    // Bomb 巨型追踪弹：大光球 + 外环
    const rr = (b.w || 40) / 2;
    softGlow(ctx, rr * 0.95, col, col2);
    ctx.strokeStyle = withAlpha(col2, 0.75);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, rr * 1.05, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(col, 0.45);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, rr * 1.35, 0, Math.PI * 2);
    ctx.stroke();
    // 旋转十字
    ctx.rotate(performance.now() / 280);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * rr * 0.35, Math.sin(ang) * rr * 0.35);
      ctx.lineTo(Math.cos(ang) * rr * 1.15, Math.sin(ang) * rr * 1.15);
      ctx.stroke();
    }
  } else if (b.type === 'rice') {
    ctx.shadowColor = col;
    ctx.shadowBlur = grazeFx ? 16 : 12;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, b.w / 2);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.4, col2);
    g.addColorStop(1, col);
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
    ctx.shadowColor = col;
    ctx.shadowBlur = grazeFx ? 14 : 10;
    const grd = ctx.createLinearGradient(0, -b.h, 0, b.h);
    grd.addColorStop(0, '#fff');
    grd.addColorStop(0.4, col2);
    grd.addColorStop(1, col);
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
    drawLaserBeam(ctx, b, col, col2, a, grazeFx);
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
  // key 为 null：占位策略为几何绘制（无专用/显式无图 Boss）
  const img = key ? loadSprite(key) : null;
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

/** 浅色虚线收点线（仅线，无文字） */
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
  ctx.restore();
}
