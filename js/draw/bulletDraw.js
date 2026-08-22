import { LOGICAL_W, LOGICAL_H } from '../config.js';
import {
  frameNow, withAlpha, softGlow, isEnemyInGrazeRange, grazeJitterOffset,
  GRAZE_PURPLE, GRAZE_PURPLE_HI,
} from './drawUtils.js';

/* ========== P0/P1：rice/talisman sprite + 激光贴图缓存 ========== */
/** 通用离屏缓存：key → build() 产物；插满清最早条目（防无限涨） */
const _spriteCache = new Map();
const SPRITE_CACHE_MAX = 96;

function cachedSprite(key, build) {
  let entry = _spriteCache.get(key);
  if (!entry && typeof document !== 'undefined' && document.createElement) {
    try {
      entry = build();
    } catch (_) {
      entry = null;
    }
    if (entry) {
      if (_spriteCache.size >= SPRITE_CACHE_MAX) {
        const first = _spriteCache.keys().next().value;
        _spriteCache.delete(first);
      }
      _spriteCache.set(key, entry);
    }
  }
  return entry;
}

/** rice 原路径（shadowBlur；无离屏 canvas 时的回退） */
function paintRice(ctx, b, col, col2, grazeFx) {
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
}

/** rice 离屏 sprite：外圈用预渲染渐变光晕替 shadowBlur（softGlowPaint 手法，均匀扩散） */
function buildRiceSprite(w, h, col, col2, grazeFx) {
  const blur = grazeFx ? 16 : 12;
  const halfX = h / 2 + 1;
  const halfY = w / 2 + 1;
  const glowR = Math.max(halfX, halfY) + blur * 1.5;
  const pad = Math.ceil(glowR) + 2;
  const c = document.createElement('canvas');
  c.width = pad * 2;
  c.height = pad * 2;
  const g = c.getContext('2d');
  g.translate(pad, pad);
  // 光晕（col 色，从中心淡出）
  const gg = g.createRadialGradient(0, 0, 0, 0, 0, glowR);
  gg.addColorStop(0, withAlpha(col, 0.6));
  gg.addColorStop(0.4, withAlpha(col, 0.3));
  gg.addColorStop(1, 'transparent');
  g.fillStyle = gg;
  g.beginPath();
  g.arc(0, 0, glowR, 0, Math.PI * 2);
  g.fill();
  // 弹体（白芯→col2→col）+ 白芯高光
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, w / 2);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(0.4, col2);
  grad.addColorStop(1, col);
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(0, 0, halfX, halfY, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath();
  g.ellipse(0, -1, h * 0.15, w * 0.22, 0, 0, Math.PI * 2);
  g.fill();
  return { canvas: c, pad };
}

function drawRice(ctx, b, col, col2, grazeFx) {
  const key = `rice|${b.w}|${b.h}|${col}|${col2}|${grazeFx ? 1 : 0}`;
  const entry = cachedSprite(key, () => buildRiceSprite(b.w, b.h, col, col2, grazeFx));
  if (entry) {
    ctx.drawImage(entry.canvas, -entry.pad, -entry.pad);
    return;
  }
  paintRice(ctx, b, col, col2, grazeFx);
}

/** talisman 原路径（shadowBlur；无离屏 canvas 时的回退） */
function paintTalisman(ctx, b, col, col2, grazeFx) {
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
}

/** talisman 离屏 sprite：外圈用预渲染渐变光晕替 shadowBlur */
function buildTalismanSprite(w, h, col, col2, grazeFx) {
  const blur = grazeFx ? 14 : 10;
  const rectW = w + 2;
  const rectH = h + 2;
  const glowR = Math.max(rectW, rectH) / 2 + blur * 1.5;
  const pad = Math.ceil(glowR) + 2;
  const c = document.createElement('canvas');
  c.width = pad * 2;
  c.height = pad * 2;
  const g = c.getContext('2d');
  g.translate(pad, pad);
  // 光晕（col 色，从中心淡出）
  const gg = g.createRadialGradient(0, 0, 0, 0, 0, glowR);
  gg.addColorStop(0, withAlpha(col, 0.6));
  gg.addColorStop(0.4, withAlpha(col, 0.3));
  gg.addColorStop(1, 'transparent');
  g.fillStyle = gg;
  g.beginPath();
  g.arc(0, 0, glowR, 0, Math.PI * 2);
  g.fill();
  // 本体：竖渐变 + 白描边 + 白横条
  const grd = g.createLinearGradient(0, -h, 0, h);
  grd.addColorStop(0, '#fff');
  grd.addColorStop(0.4, col2);
  grd.addColorStop(1, col);
  g.fillStyle = grd;
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.roundRect?.(-rectW / 2, -rectH / 2, rectW, rectH, 2) || g.rect(-rectW / 2, -rectH / 2, rectW, rectH);
  g.fill();
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillRect(-rectW / 2 + 3, -1, rectW - 6, 2);
  return { canvas: c, pad };
}

function drawTalisman(ctx, b, col, col2, grazeFx) {
  const key = `talisman|${b.w}|${b.h}|${col}|${col2}|${grazeFx ? 1 : 0}`;
  const entry = cachedSprite(key, () => buildTalismanSprite(b.w, b.h, col, col2, grazeFx));
  if (entry) {
    ctx.drawImage(entry.canvas, -entry.pad, -entry.pad);
    return;
  }
  paintTalisman(ctx, b, col, col2, grazeFx);
}

/** 屏外裁剪 margin（与实体 OFF 略小，避免边缘弹突然消失） */
const DRAW_CULL_M = 36;

/** 激光贴图参考高度（贴图内容按比例画好后每帧纵向拉伸到 laserLen） */
const LASER_TEX_H = 256;

/**
 * 激光弹绘制：细光束，中间略粗、两头略细（纺锤形）
 * 局部坐标已旋转，段从 (0,0) 沿 -Y 方向延伸当前 laserLen（生长中可短）
 * P1：预渲染纵向 strip 贴图（key 含 w/col/col2/grazeFx），每帧 drawImage 拉伸替代 5 层路径重建
 */
function drawLaserBeam(ctx, b, col, col2, a, grazeFx) {
  const len = b.laserLen || 0;
  if (len < 1.5) return;
  const halfMid = Math.max(1.1, (b.w || 10) * 0.26);
  const key = `laser|${halfMid}|${col}|${col2}|${grazeFx ? 1 : 0}`;
  const tex = cachedSprite(key, () => buildLaserTexture(halfMid, col, col2, grazeFx));
  if (tex) {
    // 纺锤轮廓在 u 空间预烘焙，纵向拉伸到 len 后与原逐帧重建的路径几何一致；全局 alpha 由 drawBullet 注入
    ctx.drawImage(tex, -tex.width / 2, -len, tex.width, len);
    return;
  }
  paintLaserBeam(ctx, b, col, col2, a, grazeFx);
}

/** 激光贴图构建：256px 高 strip，5 层按原比例画好，层 alpha 叠入贴图 */
function buildLaserTexture(halfMid, col, col2, grazeFx) {
  const texW = Math.max(2, Math.round(halfMid * 2.2 * 2)) + 2;
  const c = document.createElement('canvas');
  c.width = texW;
  c.height = LASER_TEX_H;
  const g = c.getContext('2d');
  const cx = texW / 2;
  const halfEnd = halfMid * 0.52;

  // 纺锤轮廓：u∈[0,1] 沿长度，中间最粗、两端最细（u=0 发射端在底部，u=1 尖端在顶部）
  const halfAt = (u) => {
    const t = u < 0.5 ? u * 2 : (1 - u) * 2; // 0→1→0
    const s = t * t * (3 - 2 * t); // smoothstep
    return halfEnd + (halfMid - halfEnd) * s;
  };

  // 封闭路径：左缘 0→1，右缘 1→0
  const buildSpindle = (scale) => {
    const segs = Math.max(10, Math.min(28, Math.round(LASER_TEX_H / 14)));
    g.beginPath();
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const cy = (1 - u) * LASER_TEX_H;
      const hx = halfAt(u) * scale;
      if (i === 0) g.moveTo(cx - hx, cy);
      else g.lineTo(cx - hx, cy);
    }
    for (let i = segs; i >= 0; i--) {
      const u = i / segs;
      const cy = (1 - u) * LASER_TEX_H;
      const hx = halfAt(u) * scale;
      g.lineTo(cx + hx, cy);
    }
    g.closePath();
  };

  // 1) 外柔光
  buildSpindle(2.2);
  g.fillStyle = withAlpha(col, grazeFx ? 0.22 : 0.16);
  g.fill();

  // 2) 色晕
  buildSpindle(1.45);
  g.fillStyle = withAlpha(col, grazeFx ? 0.55 : 0.42);
  g.fill();

  // 3) 主色体：col→col2→col 竖渐变（0.95 叠入，α 由外层 globalAlpha 乘）
  buildSpindle(1);
  {
    const grad = g.createLinearGradient(0, LASER_TEX_H, 0, 0);
    grad.addColorStop(0, withAlpha(col, 0.75));
    grad.addColorStop(0.5, col2);
    grad.addColorStop(1, withAlpha(col, 0.75));
    g.fillStyle = grad;
    g.globalAlpha = 0.95;
    g.fill();
    g.globalAlpha = 1;
  }

  // 4) 白芯（更细的纺锤）
  buildSpindle(0.38);
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.globalAlpha = 0.95;
  g.fill();
  g.globalAlpha = 1;

  // 5) 针芯线
  g.strokeStyle = 'rgba(255,255,255,0.7)';
  g.lineWidth = Math.max(0.6, halfMid * 0.18);
  g.lineCap = 'round';
  g.globalAlpha = 0.65;
  g.beginPath();
  g.moveTo(cx, LASER_TEX_H);
  g.lineTo(cx, 0);
  g.stroke();
  g.globalAlpha = 1;
  return c;
}

/** 激光原路径（每帧重建 5 层；无离屏 canvas 时的回退） */
function paintLaserBeam(ctx, b, col, col2, a, grazeFx) {
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
  // 屏外不画（激光用当前段外包粗略判断）
  if (b.type === 'laser') {
    const len = b.laserLen || 0;
    if (len > 0) {
      const ang = b.angle || 0;
      const hx = b.x + Math.cos(ang) * len;
      const hy = b.y + Math.sin(ang) * len;
      const minX = b.x < hx ? b.x : hx;
      const maxX = b.x > hx ? b.x : hx;
      const minY = b.y < hy ? b.y : hy;
      const maxY = b.y > hy ? b.y : hy;
      if (maxX < -DRAW_CULL_M || minX > LOGICAL_W + DRAW_CULL_M
        || maxY < -DRAW_CULL_M || minY > LOGICAL_H + DRAW_CULL_M) {
        return;
      }
    }
  } else if (
    b.x < -DRAW_CULL_M || b.x > LOGICAL_W + DRAW_CULL_M
    || b.y < -DRAW_CULL_M || b.y > LOGICAL_H + DRAW_CULL_M
  ) {
    return;
  }

  if (b.delay > 0) {
    // 预显环
    ctx.save();
    ctx.globalAlpha = 0.35 * a;
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 6 + Math.sin(frameNow() / 80) * 2, 0, Math.PI * 2);
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
    ctx.rotate(frameNow() / 280);
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
    drawRice(ctx, b, col, col2, grazeFx);
  } else if (b.type === 'talisman') {
    drawTalisman(ctx, b, col, col2, grazeFx);
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
      const ang = (i / 4) * Math.PI * 2 + frameNow() / 400;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * r * 1.1, Math.sin(ang) * r * 1.1);
    }
    ctx.stroke();
  }

  ctx.restore();
}

