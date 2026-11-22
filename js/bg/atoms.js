/**
 * 共享背景原子（Canvas 2D 绘卷语汇）。
 *
 * 约定：
 * - 签名统一 `(ctx, params, env) => void`，内部自行 save/restore；
 * - 只使用 env 提供的素材（mat/tint）与确定性随机 env.rand(seed)；
 * - 素材缺失时必须退化为程序化几何，不能抛错（测试/断网兜底依赖此约定）；
 * - 坐标为逻辑像素（450×600），不读写 DOM。
 *
 * 场景专属原子放在 `js/bg/scenes/<stage>.js`，本文件只放可复用部件。
 * 设计说明：docs/level-background-redesign.md。
 */
import { createRng } from '../rng.js';

const TAU = Math.PI * 2;

function W(env) {
  return env?.W || 450;
}

function H(env) {
  return env?.H || 600;
}

/** 确定性随机取值器：优先 env.rand，缺失时退化为 0.5 */
function rnd(env, seed) {
  return env && typeof env.rand === 'function' ? env.rand(seed) : 0.5;
}

function tintMat(env, name, color, alpha = 1) {
  if (!env || typeof env.tint !== 'function') return null;
  try {
    return env.tint(name, color, alpha);
  } catch {
    return null;
  }
}

function fontStack(size, weight = 'bold') {
  return `${weight} ${Math.max(6, size | 0)}px "Noto Serif CJK SC", "Source Han Serif SC", "Microsoft YaHei", serif`;
}

function setAlpha(ctx, a) {
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
}

/** 天空/地平线氛围光 */
export function glow(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.3) * h;
  const r = (p.r ?? 0.6) * Math.max(w, h);
  const color = p.color || '#cfd8c0';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, withAlpha(color, (p.alpha ?? 0.22)));
  g.addColorStop(0.55, withAlpha(color, (p.alpha ?? 0.22) * 0.35));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function withAlpha(color, a) {
  const c = String(color || '#ffffff').trim();
  if (c.startsWith('rgba(') || c.startsWith('rgb(')) return c.replace(/rgba?\(([^)]+)\)/, (m, body) => {
    const parts = body.split(',').slice(0, 3).map((s) => s.trim());
    return `rgba(${parts.join(',')},${Math.max(0, Math.min(1, a))})`;
  });
  if (c.startsWith('#') && (c.length === 7 || c.length === 4)) {
    let r;
    let g;
    let b;
    if (c.length === 7) {
      r = parseInt(c.slice(1, 3), 16);
      g = parseInt(c.slice(3, 5), 16);
      b = parseInt(c.slice(5, 7), 16);
    } else {
      r = parseInt(c[1] + c[1], 16);
      g = parseInt(c[2] + c[2], 16);
      b = parseInt(c[3] + c[3], 16);
    }
    return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
  }
  return c;
}

/** 天穹渐变（plate 缺失时的兜底底/场景可叠加） */
export function sky(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const palette = env?.palette || {};
  const top = p.top || palette.sky?.[0] || '#0a0d12';
  const bottom = p.bottom || palette.sky?.[1] || '#1a1f26';
  const y1 = (p.y1 ?? 0) * h;
  const y2 = (p.y2 ?? 0.62) * h;
  const g = ctx.createLinearGradient(0, y1, 0, y2);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** 月/日轮 */
export function moon(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.74) * w;
  const y = (p.y ?? 0.16) * h;
  const r = p.r ?? Math.min(w, h) * 0.055;
  const color = p.color || '#e9e3cd';
  const halo = p.halo || color;
  ctx.save();
  if (p.haloAlpha !== 0) {
    const hg = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 4.2);
    hg.addColorStop(0, withAlpha(halo, (p.haloAlpha ?? 0.18)));
    hg.addColorStop(0.5, withAlpha(halo, (p.haloAlpha ?? 0.18) * 0.35));
    hg.addColorStop(1, withAlpha(halo, 0));
    ctx.fillStyle = hg;
    ctx.fillRect(x - r * 4.2, y - r * 4.2, r * 8.4, r * 8.4);
  }
  ctx.fillStyle = withAlpha(color, (p.alpha ?? 0.9));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  // 月面淡斑（避免纯色圆盘）
  if (p.craters !== false) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = withAlpha(p.crater || '#b8b4a0', 0.12);
    const spots = [[-0.3, -0.2, 0.26], [0.24, 0.12, 0.18], [0.05, -0.38, 0.12], [-0.1, 0.32, 0.1]];
    for (const [sx, sy, sr] of spots) {
      ctx.beginPath();
      ctx.arc(x + sx * r, y + sy * r, sr * r, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // 月面阴影（非满月观感）
  if (p.phase) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(x + r * p.phase, y - r * 0.25, r * 0.95, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** 星尘 / 萤火 */
export function starField(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const count = p.count ?? 40;
  const maxY = (p.maxY ?? 0.5) * h;
  const color = p.color || '#e8f0e2';
  const seed = p.seed ?? 7;
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = rnd(env, seed + i * 3) * w;
    const y = rnd(env, seed + i * 5 + 1) * maxY;
    const s = 0.4 + rnd(env, seed + i * 7 + 2) * (p.size ?? 1.4);
    const tw = 0.35 + 0.65 * Math.abs(Math.sin((env?.t || 0) * 0.7 + i));
    setAlpha(ctx, (p.alpha ?? 0.4) * tw);
    ctx.beginPath();
    ctx.arc(x, y, s, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** 雾带：素材 mist 染色；缺失时程序化椭圆雾 */
export function fogBank(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const y = (p.y ?? 0.6) * h;
  const bh = (p.h ?? 0.16) * h;
  const t = env?.t || 0;
  const speed = p.speed ?? 6;
  const ox = Math.sin(t * 0.06 * (p.wave ?? 1) + (p.phase || 0)) * w * 0.12 - w * 0.15;
  const mat = tintMat(env, 'mist', p.color || '#9fb4b0', (p.alpha ?? 0.3) * 1.6);
  ctx.save();
  if (mat) {
    ctx.globalAlpha = p.alpha ?? 0.3;
    const drawW = w * 1.45;
    const shift = ((speed * t) % (w * 0.9) + w * 0.9) % (w * 0.9);
    const dx = ox + shift;
    ctx.drawImage(mat, dx, y - bh * 0.55, drawW, bh * 1.6);
    ctx.drawImage(mat, dx + drawW, y - bh * 0.55, drawW, bh * 1.6);
  } else {
    // 素材缺失兜底：柔和径向雾团，避免实心椭圆
    const col = p.color || '#9fb4b0';
    for (let i = 0; i < 4; i++) {
      const cx = ((i / 4) * w * 1.4 + ox * 0.25) % (w * 1.4) - w * 0.2;
      const cy = y + Math.sin(i * 1.7 + (p.phase || 0)) * bh * 0.14;
      const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.3);
      g2.addColorStop(0, withAlpha(col, (p.alpha ?? 0.3) * 0.42));
      g2.addColorStop(0.6, withAlpha(col, (p.alpha ?? 0.3) * 0.16));
      g2.addColorStop(1, withAlpha(col, 0));
      ctx.fillStyle = g2;
      ctx.fillRect(cx - w * 0.3, cy - bh * 0.9, w * 0.6, bh * 1.8);
    }
  }
  ctx.restore();
}

/** 云带（金屏风云形/绘卷云） */
export function cloudBand(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const y = (p.y ?? 0.2) * h;
  const bh = (p.h ?? 0.12) * h;
  const t = env?.t || 0;
  const dir = p.flip ? -1 : 1;
  const ox = (dir * (p.speed ?? 3) * t) % (w * 0.5) - w * 0.2;
  const mat = tintMat(env, 'cloud', p.color || '#c9bfa2', (p.alpha ?? 0.22) * 1.8);
  ctx.save();
  if (mat) {
    ctx.globalAlpha = p.alpha ?? 0.22;
    ctx.drawImage(mat, ox, y, w * 1.5, bh);
    ctx.drawImage(mat, ox + w * 0.9, y + bh * 0.35, w * 1.2, bh * 0.75);
  } else {
    ctx.fillStyle = withAlpha(p.color || '#c9bfa2', (p.alpha ?? 0.22) * 0.5);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(((i / 4) * w * 1.4 + ox) % (w * 1.4), y + (i % 2) * bh * 0.3, w * 0.2, bh * 0.35, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 浪/云海带：素材 wave 染色，绘制在底部像云海 */
export function waveBand(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const y = (p.y ?? 0.78) * h;
  const bh = (p.h ?? 0.18) * h;
  const mat = tintMat(env, 'wave', p.color || '#6f8f8a', (p.alpha ?? 0.25) * 1.7);
  ctx.save();
  if (mat) {
    ctx.globalAlpha = p.alpha ?? 0.25;
    if (p.flip) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(mat, 0, y, w, bh);
  }
  ctx.restore();
}

/** 远山剪影（可叠 ink 素材质感） */
export function mountainRange(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const baseY = (p.baseY ?? 0.42) * h;
  const color = p.color || '#0c1412';
  const layers = Math.max(1, p.layers ?? 2);
  const seed = p.seed ?? 11;
  ctx.save();
  for (let l = 0; l < layers; l++) {
    const alphaScale = (p.alpha ?? 0.8) * (1 - l * 0.22);
    const rise = (p.h ?? 0.12) * h * (1 - l * 0.28);
    const pts = 5 + ((p.peaks ?? 4) | 0);
    ctx.fillStyle = withAlpha(color, alphaScale);
    ctx.beginPath();
    ctx.moveTo(-20, baseY + 30);
    for (let i = 0; i <= pts; i++) {
      const x = (i / pts) * (w + 40) - 20;
      const peak = 0.25 + rnd(env, seed + l * 31 + i * 7) * 0.75;
      ctx.lineTo(x, baseY - rise * peak);
    }
    ctx.lineTo(w + 20, baseY + 30);
    ctx.closePath();
    ctx.fill();
  }
  // 山脚薄雾
  const g = ctx.createLinearGradient(0, baseY - 10, 0, baseY + 24);
  g.addColorStop(0, withAlpha(color, 0));
  g.addColorStop(1, withAlpha(p.fogColor || color, (p.fogAlpha ?? 0.5)));
  ctx.fillStyle = g;
  ctx.fillRect(0, baseY - 10, w, 34);
  ctx.restore();
}

/** 鸟居 */
export function torii(ctx, p = {}, env) {
  const w = W(env);
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.62) * H(env);
  const s = (p.s ?? 1) * Math.min(w, H(env)) / 600;
  const color = p.color || '#8f2f36';
  const dark = p.dark || '#2a0d12';
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 1;
  const pw = 10 * s;
  const gap = 74 * s;
  const ph = 120 * s;
  // 柱
  for (const side of [-1, 1]) {
    ctx.fillStyle = color;
    ctx.fillRect(x + side * gap - pw * (side < 0 ? 0.5 : 0.5), y - ph, pw, ph);
    ctx.fillStyle = withAlpha(dark, 0.55);
    ctx.fillRect(x + side * gap - (side < 0 ? pw * 0.5 : -pw * 0.1), y - ph, pw * 0.4, ph);
  }
  // 贯（下横木）
  ctx.fillStyle = color;
  ctx.fillRect(x - gap - pw * 1.4, y - ph * 0.82, (gap + pw * 1.4) * 2, 9 * s);
  // 笠木（上横木，两端上翘）
  ctx.beginPath();
  const w2 = gap + pw * 3.2;
  ctx.moveTo(x - w2, y - ph - 4 * s);
  ctx.quadraticCurveTo(x - q(w2) * 0.55, y - ph - 16 * s, x, y - ph - 10 * s);
  ctx.quadraticCurveTo(x + w2 * 0.55, y - ph - 16 * s, x + w2, y - ph - 4 * s);
  ctx.lineTo(x + w2, y - ph + 4 * s);
  ctx.quadraticCurveTo(x + w2 * 0.55, y - ph - 6 * s, x, y - ph);
  ctx.quadraticCurveTo(x - w2 * 0.55, y - ph - 6 * s, x - w2, y - ph + 4 * s);
  ctx.closePath();
  ctx.fill();
  if (p.rope !== false) {
    ctx.strokeStyle = withAlpha(p.ropeColor || '#d8cfae', 0.7);
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(x - gap * 0.9, y - ph * 0.9);
    ctx.quadraticCurveTo(x, y - ph * 0.82, x + gap * 0.9, y - ph * 0.9);
    ctx.stroke();
  }
  if (p.glow) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y - ph * 0.7, 0, x, y - ph * 0.7, gap * 2.2);
    g.addColorStop(0, withAlpha(p.glowColor || color, 0.16));
    g.addColorStop(1, withAlpha(p.glowColor || color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - gap * 2.4, y - ph * 2.1, gap * 4.8, ph * 2.6);
  }
  ctx.restore();
}

function q(v) {
  return v;
}

/** 宝塔 / 藏经阁 / 防御塔（层叠屋檐） */
export function pagoda(ctx, p = {}, env) {
  const w = W(env);
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.55) * H(env);
  const s = (p.s ?? 1) * Math.min(w, H(env)) / 600;
  const tiers = Math.max(1, (p.tiers ?? 3) | 0);
  const color = p.color || '#141a18';
  const roof = p.roof || color;
  const bodyW = (p.w ?? 52) * s;
  const tierH = (p.tierH ?? 34) * s;
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 1;
  // 基座
  ctx.fillStyle = withAlpha(color, 0.95);
  ctx.fillRect(x - bodyW * 0.72, y - tierH * 0.35, bodyW * 1.44, tierH * 0.4);
  for (let t = 0; t < tiers; t++) {
    const bw = bodyW * (1 - t * 0.15);
    const by = y - tierH * (t + 1);
    // 塔身
    ctx.fillStyle = color;
    ctx.fillRect(x - bw * 0.5, by, bw, tierH);
    // 窗
    ctx.fillStyle = withAlpha(p.window || '#d8c07a', 0.55);
    ctx.fillRect(x - bw * 0.12, by + tierH * 0.3, bw * 0.24, tierH * 0.34);
    // 屋檐（上翘）
    ctx.fillStyle = roof;
    ctx.beginPath();
    const rw = bw * 0.95;
    ctx.moveTo(x - rw, by);
    ctx.quadraticCurveTo(x - rw * 0.45, by - 8 * s, x - bw * 0.42, by - 12 * s);
    ctx.lineTo(x + bw * 0.42, by - 12 * s);
    ctx.quadraticCurveTo(x + rw * 0.45, by - 8 * s, x + rw, by);
    ctx.quadraticCurveTo(x + rw * 0.8, by + 3 * s, x + bw * 0.4, by + 1 * s);
    ctx.lineTo(x - bw * 0.4, by + 1 * s);
    ctx.quadraticCurveTo(x - rw * 0.8, by + 3 * s, x - rw, by);
    ctx.closePath();
    ctx.fill();
  }
  // 相轮
  ctx.fillStyle = withAlpha(p.gold || '#c9a44e', 0.8);
  const topY = y - tierH * (tiers + 1);
  ctx.fillRect(x - 1.4 * s, topY - 16 * s, 2.8 * s, 18 * s);
  ctx.beginPath();
  ctx.arc(x, topY - 18 * s, 3 * s, 0, TAU);
  ctx.fill();
  if (p.glow) {
    const g = ctx.createRadialGradient(x, y - tierH * tiers * 0.8, 0, x, y - tierH * tiers * 0.8, bodyW * 2.6);
    g.addColorStop(0, withAlpha(p.glowColor || '#d8b45a', 0.14));
    g.addColorStop(1, withAlpha(p.glowColor || '#d8b45a', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - bodyW * 2.7, y - tierH * (tiers + 1) - bodyW, bodyW * 5.4, bodyW * 4);
  }
  ctx.restore();
}

/** 提灯/纸灯笼 */
export function lantern(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.3) * h;
  const s = (p.s ?? 1) * Math.min(w, h) / 600;
  const color = p.color || '#f0a04b';
  const r = (p.r ?? 9) * s;
  ctx.save();
  if (p.string !== false) {
    ctx.strokeStyle = withAlpha(p.stringColor || '#1a1410', 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 4.4);
    ctx.lineTo(x, y - r);
    ctx.stroke();
  }
  if (p.glow !== false) {
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3.6);
    g.addColorStop(0, withAlpha(color, 0.28));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 3.6, y - r * 3.6, r * 7.2, r * 7.2);
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 1.15, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = withAlpha('#2a1208', 0.4);
  ctx.lineWidth = 0.8;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.ellipse(x, y, r * (1 - Math.abs(i) * 0.28), r * 1.15, 0, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  ctx.fillStyle = withAlpha('#2a1208', 0.65);
  ctx.fillRect(x - r * 0.55, y - r * 1.2, r * 1.1, r * 0.25);
  ctx.fillRect(x - r * 0.45, y + r * 1.05, r * 0.9, r * 0.2);
  ctx.restore();
}

/** 竖幡/横幅（可写字） */
export function banner(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.8) * w;
  const y = (p.y ?? 0.2) * h;
  const bw = (p.w ?? 26) * (p.s ?? 1);
  const bh = (p.h ?? 96) * (p.s ?? 1);
  const color = p.color || '#7a1f2a';
  const text = p.text || '';
  const angle = (p.angle ?? 0) * Math.PI / 180;
  const t = env?.t || 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.sin(t * 0.9 + (p.phase || 0)) * 0.012);
  ctx.globalAlpha = p.alpha ?? 1;
  // 布面（下端双燕尾）
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-bw / 2, 0);
  ctx.lineTo(bw / 2, 0);
  ctx.lineTo(bw / 2, bh * 0.86);
  ctx.lineTo(bw * 0.18, bh);
  ctx.lineTo(0, bh * 0.9);
  ctx.lineTo(-bw * 0.18, bh);
  ctx.lineTo(-bw / 2, bh * 0.86);
  ctx.closePath();
  ctx.fill();
  // 上下装饰条
  ctx.fillStyle = withAlpha(p.trim || '#d8c07a', 0.6);
  ctx.fillRect(-bw / 2, 0, bw, 3);
  ctx.fillRect(-bw / 2, bh * 0.86, bw, 2);
  // 竖排文字
  if (text) {
    ctx.fillStyle = p.textColor || '#efe6d0';
    const fs = Math.min(bw * 0.62, bh / (text.length + 1.4));
    ctx.font = fontStack(fs);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const step = fs * 1.12;
    const startY = bh * 0.5 - (text.length - 1) * step * 0.5;
    for (let i = 0; i < text.length; i++) {
      ctx.fillText(text[i], 0, startY + i * step);
    }
  }
  ctx.restore();
}

/** 朱印/封印 */
export function seal(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.5) * h;
  const s = (p.s ?? 22) * (p.scale ?? 1);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((p.rotate ?? 0) * Math.PI / 180);
  ctx.globalAlpha = p.alpha ?? 0.85;
  ctx.fillStyle = p.color || '#b3342e';
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.strokeStyle = withAlpha(p.ink || '#f2e6d2', 0.85);
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.strokeRect(-s / 2 + s * 0.1, -s / 2 + s * 0.1, s * 0.8, s * 0.8);
  if (p.text) {
    ctx.fillStyle = p.ink || '#f2e6d2';
    ctx.font = fontStack(s * 0.46);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, 0, s * 0.04);
  }
  ctx.restore();
}

/** 文字戳（场景标记/竖排） */
export function glyph(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.5) * h;
  const size = (p.size ?? 14) * (p.scale ?? 1);
  const text = p.text || '';
  ctx.save();
  ctx.translate(x, y);
  if (p.rotate) ctx.rotate(p.rotate);
  ctx.globalAlpha = p.alpha ?? 0.6;
  ctx.fillStyle = p.color || '#efe6d0';
  ctx.font = fontStack(size, p.weight || 'bold');
  ctx.textAlign = p.align || 'center';
  ctx.textBaseline = 'middle';
  if (p.vertical) {
    const step = size * 1.15;
    const start = -(text.length - 1) * step * 0.5;
    for (let i = 0; i < text.length; i++) ctx.fillText(text[i], 0, start + i * step);
  } else {
    ctx.fillText(text, 0, 0);
  }
  ctx.restore();
}

/** 前景框景枝条（梅/樱；素材 plum 染色，缺失时线稿） */
export function frameBranches(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const side = p.side || 'left';
  const s = p.s ?? 1;
  const color = p.color || '#241016';
  const mat = tintMat(env, 'plum', color, (p.alpha ?? 0.8) * 1.2);
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 0.8;
  if (mat) {
    const mw = w * 0.62 * s;
    const mh = h * 0.5 * s;
    const x = side === 'left' ? -w * 0.06 : w - mw + w * 0.06;
    const y = side === 'top' ? -h * 0.05 : h - mh * 0.72;
    if (side === 'right') {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(mat, -mw * 0.86, y, mw, mh);
    } else if (side === 'top') {
      ctx.drawImage(mat, x, y, mw * 1.2, mh * 0.7);
    } else {
      ctx.drawImage(mat, x, y, mw, mh);
    }
  } else {
    // 程序化枝干（素材缺失兜底）：主枝多边形 + 分叉 + 花点
    const dir = side === 'right' ? -1 : 1;
    const bx = side === 'right' ? w + 6 : -6;
    const by = h * (side === 'top' ? 0.12 : 0.66);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(bx, by + 10);
    ctx.quadraticCurveTo(bx + dir * w * 0.14, by - h * 0.05, bx + dir * w * 0.3, by - h * 0.1);
    ctx.lineTo(bx + dir * w * 0.31, by - h * 0.075);
    ctx.quadraticCurveTo(bx + dir * w * 0.16, by - h * 0.02, bx + dir * w * 0.02, by + 14);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const px = bx + dir * w * (0.07 + i * 0.042);
      const py = by - h * (0.055 + (i % 3) * 0.014) + (i % 2 ? 6 : 0);
      ctx.lineWidth = Math.max(1, 2.4 - i * 0.25);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + dir * 10, py - 12, px + dir * w * 0.025, py - h * 0.035);
      ctx.stroke();
      // 花点
      for (let k = 0; k < 3; k++) {
        ctx.globalAlpha = (p.alpha ?? 0.8) * (0.25 + k * 0.08);
        ctx.beginPath();
        ctx.arc(px + dir * (4 + k * 5), py - h * 0.028 + k * 5, 1.6 - k * 0.3, 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

/** 底部/两侧芦苇草（素材 grass 染色，缺失时线稿） */
export function grassReeds(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const side = p.side || 'both';
  const color = p.color || '#0c1710';
  const mat = tintMat(env, 'grass', color, (p.alpha ?? 0.7) * 1.25);
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 0.7;
  if (mat) {
    const gh = h * (p.h ?? 0.26);
    if (side === 'both' || side === 'left') {
      ctx.save();
      ctx.translate(-w * 0.02, h - gh * 0.9);
      ctx.drawImage(mat, 0, 0, w * 0.45, gh);
      ctx.restore();
    }
    if (side === 'both' || side === 'right') {
      ctx.save();
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(mat, -w * 0.02, h - gh * 0.9, w * 0.45, gh);
      ctx.restore();
    }
  } else {
    // 素材缺失兜底：填充叶片（比细线更有植被体积）
    ctx.fillStyle = withAlpha(color, p.alpha ?? 0.7);
    const seed = p.seed ?? 21;
    const count = p.count ?? 22;
    for (let i = 0; i < count; i++) {
      let x = rnd(env, seed + i * 3) * w;
      if (side === 'left') x *= 0.5;
      if (side === 'right') x = w * 0.5 + x * 0.5;
      const y = h - rnd(env, seed + i * 5) * h * 0.08;
      const len = h * (0.06 + rnd(env, seed + i * 7) * (p.h ?? 0.22));
      const bend = (rnd(env, seed + i * 11) - 0.5) * 26;
      const wBlade = 1.2 + rnd(env, seed + i * 13) * 1.8;
      ctx.beginPath();
      ctx.moveTo(x - wBlade * 0.5, y);
      ctx.quadraticCurveTo(x + bend * 0.5, y - len * 0.55, x + bend, y - len);
      ctx.quadraticCurveTo(x + bend * 0.5 + wBlade, y - len * 0.55, x + wBlade * 0.5, y);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 探照灯/光柱 */
export function lightBeam(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.1) * h;
  const angle = (p.angle ?? 0.4) * Math.PI / 180;
  const len = (p.length ?? 0.7) * h;
  const width = (p.width ?? 40);
  const color = p.color || '#ffd9a0';
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const g = ctx.createLinearGradient(0, 0, 0, len);
  g.addColorStop(0, withAlpha(color, p.alpha ?? 0.2));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-width * 0.16, 0);
  ctx.lineTo(width * 0.16, 0);
  ctx.lineTo(width * 0.5, len);
  ctx.lineTo(-width * 0.5, len);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 六角防火墙格栅 */
export function hexLattice(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.42) * h;
  const gw = (p.w ?? 0.8) * w;
  const gh = (p.h ?? 0.34) * h;
  const size = p.size ?? 24;
  const color = p.color || '#7cc7f0';
  const alpha = p.alpha ?? 0.24;
  const t = env?.t || 0;
  ctx.save();
  ctx.translate(x - gw / 2, y - gh / 2);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = p.lineWidth ?? 1;
  const cols = Math.ceil(gw / (size * 0.9)) + 1;
  const rows = Math.ceil(gh / (size * 0.78)) + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * size * 0.9;
      const cy = r * size * 0.78 + (c % 2 ? size * 0.39 : 0);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU - Math.PI / 6;
        const px = cx + Math.cos(a) * size * 0.46;
        const py = cy + Math.sin(a) * size * 0.46;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  if (p.glow) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.4);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, 0, 0, gh);
    g.addColorStop(0, withAlpha(color, 0.1 * pulse));
    g.addColorStop(0.5, withAlpha(color, 0.04));
    g.addColorStop(1, withAlpha(color, 0.14 * pulse));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, gw, gh);
  }
  ctx.restore();
}

/** 监视之眼 / 审核之眼 */
export function guardianEye(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.3) * h;
  const r = (p.r ?? 34) * (p.scale ?? 1);
  const open = Math.max(0.05, Math.min(1, p.open ?? 1));
  const color = p.color || '#8fb8c8';
  const iris = p.iris || '#d8eef2';
  const t = env?.t || 0;
  ctx.save();
  ctx.translate(x, y);
  if (p.glow) {
    const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 3.4);
    g.addColorStop(0, withAlpha(color, 0.16));
    g.addColorStop(1, withAlpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-r * 3.4, -r * 3.4, r * 6.8, r * 6.8);
  }
  // 外环
  ctx.strokeStyle = withAlpha(color, 0.7);
  ctx.lineWidth = Math.max(1, r * 0.055);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = withAlpha(color, 0.35);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, 0, TAU);
  ctx.stroke();
  // 眼睑（上下弧）
  const pupilX = Math.sin(t * 0.6 + (p.phase || 0)) * r * 0.16;
  ctx.fillStyle = withAlpha(iris, 0.9);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.5, r * 0.5 * open, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = withAlpha('#10161c', 0.95);
  ctx.beginPath();
  ctx.ellipse(pupilX, 0, r * 0.2, r * 0.34 * open, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = withAlpha('#ffffff', 0.8);
  ctx.beginPath();
  ctx.arc(-r * 0.13 + pupilX, -r * 0.12, r * 0.06, 0, TAU);
  ctx.fill();
  // 眼睑阴影
  ctx.fillStyle = withAlpha(p.lid || '#0a1016', 0.85);
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.62, r * 0.92, r * 0.4, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, r * 0.62, r * 0.92, r * 0.4, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** 菊/花簇（代码描线，用于署名/乐园装饰） */
export function chrysanthemum(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.4) * h;
  const r = (p.r ?? 18) * (p.scale ?? 1);
  const petals = p.petals ?? 12;
  const color = p.color || '#eef0e4';
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.rotate || 0);
  ctx.globalAlpha = p.alpha ?? 0.85;
  ctx.fillStyle = color;
  for (let ring = 0; ring < 2; ring++) {
    const rr = r * (1 - ring * 0.32);
    const n = petals + ring * 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + ring * 0.2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * rr * 0.6, Math.sin(a) * rr * 0.6, rr * 0.34, rr * 0.16, a, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = withAlpha(p.center || '#c9a44e', 0.85);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.24, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** 裂纹 / 雷纹 */
export function crack(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.4) * h;
  const len = (p.len ?? 0.3) * Math.max(w, h);
  const color = p.color || '#9fd8ff';
  const seed = p.seed ?? 5;
  const branches = p.branches ?? 4;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((p.angle ?? 0) * Math.PI / 180);
  ctx.globalAlpha = p.alpha ?? 0.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = p.lineWidth ?? 1.1;
  ctx.beginPath();
  ctx.moveTo(0, -len / 2);
  let px = 0;
  let py = -len / 2;
  for (let i = 1; i <= 6; i++) {
    px += (rnd(env, seed + i) - 0.5) * len * 0.22;
    py += len / 6;
    ctx.lineTo(px, py);
  }
  ctx.stroke();
  for (let b = 0; b < branches; b++) {
    const by = -len / 2 + len * (0.2 + 0.13 * b);
    ctx.beginPath();
    ctx.moveTo(0, by);
    ctx.lineTo((rnd(env, seed + b * 7) - 0.5) * len * 0.4, by + len * 0.1);
    ctx.stroke();
  }
  ctx.restore();
}

/** 底部压暗（场景级，覆盖在静态层上；fx 之外的可选补充） */
export function groundShade(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const hh = (p.h ?? 0.24) * h;
  const g = ctx.createLinearGradient(0, h - hh, 0, h);
  g.addColorStop(0, withAlpha(p.color || '#000000', 0));
  g.addColorStop(1, withAlpha(p.color || '#000000', p.alpha ?? 0.55));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, h - hh, w, hh);
  ctx.restore();
}

/** 精确颜色抖动（确定性数列） */
export function hash01(n) {
  const rng = createRng((n | 0) ^ 0x9e3779b9);
  return rng();
}

/** 共享原子注册表（场景通过 atom 名引用） */
export const ATOMS = {
  glow,
  sky,
  moon,
  starField,
  fogBank,
  cloudBand,
  waveBand,
  mountainRange,
  torii,
  pagoda,
  lantern,
  banner,
  seal,
  glyph,
  frameBranches,
  grassReeds,
  lightBeam,
  hexLattice,
  guardianEye,
  chrysanthemum,
  crack,
  groundShade,
};
