/**
 * Entity drawing (split from entities.js — T13)
 */
import { BALANCE } from '../config.js';
/* ========== Drawing helpers — 梦幻弹幕 + 贴图 ========== */
/** 本帧统一时间（ms）；由 drawGameFrame 注入，避免每弹 performance.now */
let _frameT = 0;
export function setDrawFrameTime(t) {
  _frameT = t || 0;
}
export function frameNow() {
  return _frameT || performance.now();
}

const _withAlphaCache = new Map();
const WITH_ALPHA_CACHE_MAX = 128;

/** hex 只解析一次（P2）：rgb 预拼串缓存，rgba 字符串仍每次现拼 */
export function withAlpha(hex, a) {
  if (!hex || hex[0] !== '#' || (hex.length !== 7 && hex.length !== 4)) {
    return `rgba(255,255,255,${a})`;
  }
  let rgb = _withAlphaCache.get(hex);
  if (!rgb) {
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
    rgb = `${r},${g},${b}`;
    if (_withAlphaCache.size >= WITH_ALPHA_CACHE_MAX) {
      const first = _withAlphaCache.keys().next().value;
      _withAlphaCache.delete(first);
    }
    _withAlphaCache.set(hex, rgb);
  }
  return `rgba(${rgb},${a})`;
}

export const GRAZE_PURPLE = '#c084fc';
export const GRAZE_PURPLE_HI = '#f0abfc';

/** softGlow 离屏缓存：key = r|color|color2 → canvas（局部 0,0 绘制，可平移复用） */
const _glowCache = new Map();
const GLOW_CACHE_MAX = 96;

/** 敌弹是否进入自机擦弹范围（中心距 ≤ grazeR + 判定外包） */
export function isEnemyInGrazeRange(b, player) {
  if (!player || b.from !== 'enemy' || b.delay > 0) return false;
  // 碰撞写的 _grazeNear：true 可直接用；false 时 rice/talisman/laser 视觉外包可能更大，仍需精算
  if (b._grazeNear) return true;
  if (b._grazeNear === false
    && b.type !== 'rice' && b.type !== 'talisman' && b.type !== 'laser') {
    return false;
  }
  const hitR = b.type === 'laser' ? (b.w || 10) * 0.5 : (b.r || 4);
  let reach = hitR;
  if (b.type === 'laser') reach = Math.max(hitR, (b.laserLen || 0) * 0.5);
  else if (b.type === 'rice') reach = Math.max(b.w || 8, b.h || 8) * 0.55;
  else if (b.type === 'talisman') reach = Math.hypot((b.w || 10) / 2, (b.h || 14) / 2);
  const dist = Math.hypot(b.x - player.x, b.y - player.y);
  return dist < BALANCE.grazeRadius + reach;
}

/** 擦弹时视觉微抖：小幅度、高频率，相位跟子弹 id 绑定 */
export function grazeJitterOffset(b) {
  const t = frameNow();
  const seed = (b.id || 0) * 12.9898;
  // ~0.7px 量级，约 25–40Hz 观感
  const jx = Math.sin(t * 0.085 + seed) * 0.75
    + Math.sin(t * 0.13 + seed * 1.7) * 0.35;
  const jy = Math.cos(t * 0.09 + seed * 0.9) * 0.75
    + Math.sin(t * 0.14 + seed * 2.1) * 0.35;
  return { jx, jy };
}

/** 直接在 ctx 上画 softGlow（无缓存路径 / 构建缓存用） */
function softGlowPaint(ctx, r, color, color2) {
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

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.28, Math.max(1.2, r * 0.22), 0, Math.PI * 2);
  ctx.fill();
}

export function softGlow(ctx, r, color, color2) {
  const c2 = color2 || '#fff';
  const key = `${r}|${color}|${c2}`;
  let entry = _glowCache.get(key);
  if (!entry && typeof document !== 'undefined' && document.createElement) {
    const pad = Math.ceil(r * 1.85) + 2;
    const size = pad * 2;
    try {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const gctx = c.getContext('2d');
      if (gctx) {
        gctx.translate(pad, pad);
        softGlowPaint(gctx, r, color, c2);
        entry = { canvas: c, pad };
        if (_glowCache.size >= GLOW_CACHE_MAX) {
          const first = _glowCache.keys().next().value;
          _glowCache.delete(first);
        }
        _glowCache.set(key, entry);
      }
    } catch (_) {
      entry = null;
    }
  }
  if (entry) {
    ctx.drawImage(entry.canvas, -entry.pad, -entry.pad);
    return;
  }
  softGlowPaint(ctx, r, color, c2);
}

export function softGlowAt(ctx, x, y, r, color, color2) {
  ctx.save();
  ctx.translate(x, y);
  softGlow(ctx, r, color, color2);
  ctx.restore();
}

