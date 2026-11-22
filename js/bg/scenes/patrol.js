/**
 * 中立拦截「全域巡查姬 · 404」场景。
 * 剧情：以抹消之名，行无差别审判。
 * 单 mode：黑红警戒荒原 + 巡查监视塔 + 旋转探照灯 + 404 路障/幢幡 + 红雨 +
 *          故障扫描带（fx.glitch 高） + 监视之眼。
 * 设计说明：docs/level-background-redesign.md §4。
 */
import { sceneDefaults } from '../schema.js';
import { STAGE_PALETTES } from './_stub.js';

const BASE = STAGE_PALETTES.patrol;
const TAU = Math.PI * 2;

const W = (env) => env?.W || 450;
const H = (env) => env?.H || 600;
const R = (env, seed) => (env && typeof env.rand === 'function' ? env.rand(seed) : 0.5);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function rgba(color, a) {
  const c = String(color || '#ffffff').trim();
  const al = clamp01(a);
  if (c.startsWith('rgb')) {
    return c.replace(/rgba?\(([^)]+)\)/, (m, body) => {
      const p = body.split(',').slice(0, 3).map((s) => s.trim());
      return `rgba(${p.join(',')},${al})`;
    });
  }
  if (c.startsWith('#')) {
    const hex = c.length === 4
      ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`
      : c;
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return `rgba(${r},${g},${b},${al})`;
  }
  return c;
}

function font(size, weight = 'bold') {
  return `${weight} ${Math.max(6, size | 0)}px "Noto Serif CJK SC", "Source Han Serif SC", "Microsoft YaHei", serif`;
}

/* ------------------------------------------------------------------ *
 * 专属原子：警戒荒原 / 监视塔 / 探照灯 / 404 路障 / 监视之眼 / 故障带 / 红闪
 * ------------------------------------------------------------------ */

/** 黑红警戒荒原：地平线血光、开裂地面、废墟剪影、铁丝网（静态） */
function redWaste(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const horizon = (p.horizon ?? 0.48) * h;
  const accent = p.accent || BASE.accent;
  const seed = p.seed ?? 1001;

  ctx.save();
  // 地平线血光
  const hg = ctx.createLinearGradient(0, horizon - h * 0.18, 0, horizon + h * 0.12);
  hg.addColorStop(0, rgba(accent, 0));
  hg.addColorStop(0.62, rgba(accent, 0.13));
  hg.addColorStop(1, rgba(accent, 0.02));
  ctx.fillStyle = hg;
  ctx.fillRect(0, horizon - h * 0.18, w, h * 0.3);
  // 地面
  const gg = ctx.createLinearGradient(0, horizon, 0, h);
  gg.addColorStop(0, '#1c0306');
  gg.addColorStop(0.42, '#100204');
  gg.addColorStop(1, '#050102');
  ctx.fillStyle = gg;
  ctx.fillRect(0, horizon, w, h - horizon);

  // 远处废墟剪影（只在两侧）
  ctx.fillStyle = '#0b0103';
  const ruin = (x, rw, rh) => {
    ctx.fillRect(x - rw / 2, horizon - rh, rw, rh + 2);
    ctx.beginPath();
    ctx.moveTo(x - rw / 2 - 3, horizon - rh);
    ctx.lineTo(x - rw * 0.18, horizon - rh - 6);
    ctx.lineTo(x + rw * 0.22, horizon - rh - 2);
    ctx.lineTo(x + rw / 2 + 3, horizon - rh);
    ctx.closePath();
    ctx.fill();
  };
  ruin(w * 0.055, 40, 30);
  ruin(w * 0.135, 20, 46);
  ruin(w * 0.9, 46, 34);
  ruin(w * 0.965, 22, 52);
  // 断裂视标柱
  for (let i = 0; i < 4; i++) {
    const x = w * (0.26 + i * 0.16) + (R(env, seed + i * 7) - 0.5) * 20;
    const bh = 12 + R(env, seed + i * 11) * 22;
    ctx.fillStyle = rgba('#0e0204', 0.9);
    ctx.fillRect(x, horizon - bh, 2.4, bh);
    if (i % 2 === 0) {
      ctx.fillRect(x - 4, horizon - bh + 3, 10, 2);
    }
  }

  // 地面裂纹（暗缝 + 极低红余光）
  for (let i = 0; i < 9; i++) {
    let x = R(env, seed + 60 + i * 13) * w;
    let y = horizon + R(env, seed + 70 + i * 17) * (h - horizon) * 0.7;
    ctx.strokeStyle = rgba(accent, 0.1 + R(env, seed + 80 + i * 19) * 0.1);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (R(env, seed + 90 + i * 23 + k * 7) - 0.5) * 34;
      y += (h - horizon) * 0.06;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // 铁丝网两道
  const wire = (wy, alpha) => {
    ctx.strokeStyle = rgba('#1c0508', alpha);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, wy + 3);
    ctx.quadraticCurveTo(w * 0.5, wy - 5, w + 4, wy + 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, wy + 12);
    ctx.quadraticCurveTo(w * 0.5, wy + 5, w + 4, wy + 11);
    ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const x = (i / 8) * w;
      const yy = wy + 2 + Math.sin(i * 1.7) * 3;
      ctx.strokeStyle = rgba('#1c0508', alpha * 0.9);
      ctx.beginPath();
      ctx.moveTo(x - 3, yy - 2);
      ctx.lineTo(x + 3, yy + 3);
      ctx.moveTo(x + 3, yy - 2);
      ctx.lineTo(x - 3, yy + 3);
      ctx.stroke();
    }
    ctx.fillStyle = rgba('#0c0204', alpha + 0.1);
    for (let i = 0; i <= 4; i++) {
      const x = (i / 4) * w + (i === 0 ? 5 : i === 4 ? -5 : 0);
      ctx.fillRect(x - 1.2, wy - 2, 2.4, 18);
    }
  };
  wire(horizon + (h - horizon) * 0.22, 0.55);
  wire(horizon + (h - horizon) * 0.46, 0.4);

  // 警戒带（横跨荒原下部，低透明）
  const tape = (ty, sag, alpha2, seedOff) => {
    ctx.strokeStyle = rgba(accent, alpha2 * 0.55);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-4, ty);
    ctx.quadraticCurveTo(w * 0.5, ty + sag, w + 4, ty + 2);
    ctx.stroke();
    const seg = 9;
    for (let i = 0; i < seg; i++) {
      const f = (i + 0.5) / seg;
      const tx = f * w;
      const tyy = ty + Math.sin(f * Math.PI) * sag;
      ctx.save();
      ctx.translate(tx, tyy);
      ctx.rotate(0.35 + (R(env, seed + seedOff + i * 5) - 0.5) * 0.3);
      ctx.globalAlpha = alpha2 * (0.5 + R(env, seed + seedOff + 20 + i * 7) * 0.5);
      ctx.fillStyle = i % 2 ? rgba(accent, 0.5) : rgba('#0a0103', 0.6);
      ctx.fillRect(-5, -1.6, 10, 3.2);
      ctx.restore();
    }
  };
  ctx.globalAlpha = 1;
  tape(h * 0.78, 10, 0.55, 0);
  tape(h * 0.865, -8, 0.38, 40);

  // 地面碎石
  ctx.fillStyle = '#0a0103';
  for (let i = 0; i < 26; i++) {
    const x = R(env, seed + 300 + i * 3) * w;
    const y = horizon + R(env, seed + 340 + i * 5) * (h - horizon);
    const s = 1 + R(env, seed + 380 + i * 7) * 2.6;
    ctx.fillRect(x, y, s * 1.6, s);
  }
  ctx.restore();
}

/** 巡查监视塔：四脚桁架塔 + 机舱 + 灯罩 + 天线 + 红色信标（静态） */
function watchtower(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.18) * w;
  const baseY = (p.y ?? 0.55) * h;
  const th = (p.h ?? 0.36) * h;
  const color = p.color || '#0b0103';
  const accent = p.accent || BASE.accent;
  const yellow = p.yellow || BASE.seal;

  ctx.save();
  const topY = baseY - th;
  const botW = th * 0.44;
  const topW = th * 0.2;
  ctx.fillStyle = color;
  // 底座
  ctx.fillRect(x - botW * 0.62, baseY - 5, botW * 1.24, 6);
  // 四腿（前后两片梯形）
  ctx.beginPath();
  ctx.moveTo(x - botW / 2, baseY);
  ctx.lineTo(x - topW / 2, topY);
  ctx.lineTo(x - topW * 0.36, topY);
  ctx.lineTo(x - botW * 0.3, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + botW / 2, baseY);
  ctx.lineTo(x + topW / 2, topY);
  ctx.lineTo(x + topW * 0.36, topY);
  ctx.lineTo(x + botW * 0.3, baseY);
  ctx.closePath();
  ctx.fill();
  // 交叉支撑
  ctx.strokeStyle = rgba(color, 0.95);
  ctx.lineWidth = 1.2;
  const levels = 5;
  for (let i = 0; i < levels; i++) {
    const f0 = i / levels;
    const f1 = (i + 1) / levels;
    const y0 = baseY - th * f0;
    const y1 = baseY - th * f1;
    const w0 = botW * (1 - f0 * 0.56);
    const w1 = botW * (1 - f1 * 0.56);
    ctx.beginPath();
    ctx.moveTo(x - w0 * 0.42, y0);
    ctx.lineTo(x + w1 * 0.42, y1);
    ctx.moveTo(x + w0 * 0.42, y0);
    ctx.lineTo(x - w1 * 0.42, y1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - w1 * 0.42, y1);
    ctx.lineTo(x + w1 * 0.42, y1);
    ctx.stroke();
  }
  // 平台
  ctx.fillStyle = color;
  ctx.fillRect(x - th * 0.17, topY - 4, th * 0.34, 5);
  // 机舱
  ctx.fillRect(x - th * 0.11, topY - 19, th * 0.22, 15);
  ctx.fillStyle = rgba(accent, 0.3);
  ctx.fillRect(x - th * 0.11, topY - 19, th * 0.22, 1.2);
  // 观察窗
  ctx.fillStyle = rgba(yellow, 0.35);
  ctx.fillRect(x - th * 0.05, topY - 16, th * 0.1, 4);
  // 灯罩
  ctx.fillStyle = rgba(accent, 0.45);
  ctx.fillRect(x - th * 0.13, topY - 23, th * 0.26, 3.6);
  ctx.fillStyle = color;
  ctx.fillRect(x - th * 0.13, topY - 24, th * 0.26, 3.6);
  // 天线
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, topY - 24);
  ctx.lineTo(x, topY - 24 - th * 0.12);
  ctx.moveTo(x - 5, topY - 24 - th * 0.08);
  ctx.lineTo(x + 5, topY - 24 - th * 0.08);
  ctx.moveTo(x - 3.4, topY - 24 - th * 0.04);
  ctx.lineTo(x + 3.4, topY - 24 - th * 0.04);
  ctx.stroke();
  // 信标
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(x, topY - 24 - th * 0.14, 1.7, 0, TAU);
  ctx.fill();
  // 塔身警示条
  ctx.fillStyle = rgba(accent, 0.35);
  ctx.fillRect(x - th * 0.02, topY + th * 0.1, th * 0.04, th * 0.09);
  ctx.fillStyle = rgba(yellow, 0.25);
  ctx.fillRect(x - th * 0.02, topY + th * 0.22, th * 0.04, th * 0.05);
  ctx.restore();
}

/** 旋转探照灯：从监视塔顶扫过荒原（每帧 2 个渐变；中心保持低透明） */
function searchlight(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const x = (p.x ?? 0.18) * w;
  const y = (p.y ?? 0.158) * h;
  const angle = (p.angle0 ?? 0.35) + t * (p.speed ?? 0.55);
  const len = (p.length ?? 0.95) * h;
  const color = p.color || '#ffd9c0';
  const alpha = p.alpha ?? 0.14;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cone = (a, aa, width) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    const g = ctx.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, rgba(color, aa));
    g.addColorStop(0.5, rgba(color, aa * 0.34));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(2, 0);
    ctx.lineTo(width, len);
    ctx.lineTo(-width, len);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  cone(angle, alpha, w * 0.23);
  cone(angle + Math.PI, alpha * 0.32, w * 0.15);
  // 灯头
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 2.6, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** 404 路障 + 「NOT FOUND」牌 + 抹消幢幡（静态） */
function roadblock404(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.79) * w;
  const y = (p.y ?? 0.665) * h;
  const s = (p.s ?? 1) * Math.min(w, h) / 600;
  const accent = p.accent || BASE.accent;
  const yellow = p.yellow || BASE.seal;
  const color = '#0d0204';
  const seed = p.seed ?? 1101;

  ctx.save();
  // 支撑腿
  ctx.fillStyle = color;
  ctx.fillRect(x - 27 * s, y, 5 * s, 27 * s);
  ctx.fillRect(x + 22 * s, y, 5 * s, 27 * s);
  // 斜纹路障板
  ctx.fillStyle = color;
  ctx.fillRect(x - 33 * s, y - 16 * s, 66 * s, 18 * s);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 33 * s, y - 16 * s, 66 * s, 18 * s);
  ctx.clip();
  for (let i = 0; i < 7; i++) {
    ctx.save();
    ctx.translate(x - 33 * s + i * 12 * s, y - 16 * s);
    ctx.rotate(0.42);
    ctx.fillStyle = i % 2 ? rgba(accent, 0.75) : rgba('#efe6d2', 0.5);
    ctx.fillRect(0, -8 * s, 5 * s, 34 * s);
    ctx.restore();
  }
  ctx.restore();
  // 警示灯
  ctx.fillStyle = yellow;
  ctx.beginPath();
  ctx.arc(x, y - 20 * s, 2.4 * s, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(x, y - 20 * s, 6.5 * s, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 右立柱 + 大牌
  const px = x + 40 * s;
  ctx.fillStyle = color;
  ctx.fillRect(px - 1.6 * s, y - 60 * s, 3.2 * s, 76 * s);
  ctx.fillStyle = '#170308';
  ctx.fillRect(px + 1.5 * s, y - 58 * s, 52 * s, 36 * s);
  ctx.strokeStyle = rgba(accent, 0.7);
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 1.5 * s, y - 58 * s, 52 * s, 36 * s);
  ctx.fillStyle = accent;
  ctx.font = font(19 * s);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('404', px + 27.5 * s, y - 44 * s);
  ctx.fillStyle = yellow;
  ctx.font = font(6.5 * s);
  ctx.fillText('NOT FOUND', px + 27.5 * s, y - 31 * s);
  // 小朱印
  ctx.fillStyle = rgba('#b03c2a', 0.8);
  ctx.fillRect(px + 40 * s, y - 27 * s, 8 * s, 8 * s);
  ctx.fillStyle = 'rgba(255,238,214,0.9)';
  ctx.font = font(5.4 * s);
  ctx.fillText('抹', px + 44 * s, y - 22.8 * s);

  // 倒下的第二块路障
  ctx.save();
  ctx.translate(x - 52 * s, y + 24 * s);
  ctx.rotate(-0.22);
  ctx.fillStyle = color;
  ctx.fillRect(-20 * s, -5 * s, 40 * s, 10 * s);
  ctx.fillStyle = rgba(accent, 0.55);
  ctx.fillRect(-14 * s, -4 * s, 7 * s, 8 * s);
  ctx.fillRect(1 * s, -4 * s, 7 * s, 8 * s);
  ctx.restore();

  // 右侧竖幡「404」
  const bx = w - 14;
  ctx.fillStyle = rgba('#3a0810', 0.85);
  ctx.beginPath();
  ctx.moveTo(bx - 12, h * 0.13);
  ctx.lineTo(bx + 10, h * 0.13);
  ctx.lineTo(bx + 10, h * 0.13 + 74);
  ctx.lineTo(bx - 12, h * 0.13 + 68);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba(accent, 0.5);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = yellow;
  ctx.font = font(12);
  ctx.fillText('4', bx - 1, h * 0.13 + 22);
  ctx.fillText('0', bx - 1, h * 0.13 + 38);
  ctx.fillText('4', bx - 1, h * 0.13 + 54);
  // 幡杆
  ctx.strokeStyle = rgba('#1a0407', 0.9);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(bx + 11, h * 0.1);
  ctx.lineTo(bx + 11, h * 0.13 + 80);
  ctx.stroke();
  // 地面反光
  ctx.fillStyle = rgba(accent, 0.08);
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x - 30 * s + R(env, seed + i * 7) * 60 * s, y + 28 * s, 8 * s, 2 * s);
  }
  ctx.restore();
}

/** 监视之眼：警戒红瞳、扫描环、缓慢眨眼（每帧 1 个渐变） */
function patrolEye(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const x = (p.x ?? 0.82) * w;
  const y = (p.y ?? 0.15) * h;
  const r = (p.r ?? 32) * (p.scale ?? 1);
  const color = p.color || BASE.accent;
  const iris = p.iris || '#ff8a8a';
  const lid = p.lid || '#090103';

  // 缓慢眨眼
  const cycle = (t * 0.16 + (p.phase ?? 0)) % 1;
  const blink = cycle > 0.94 ? 1 - (cycle - 0.94) / 0.06 : 1;
  const open = clamp01((p.open ?? 0.62) * blink);

  ctx.save();
  // 外红光
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3);
  g.addColorStop(0, rgba(color, 0.18));
  g.addColorStop(0.6, rgba(color, 0.05));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  // 虚线警戒环
  ctx.strokeStyle = rgba(color, 0.38);
  ctx.lineWidth = 1;
  if (typeof ctx.setLineDash === 'function') ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.arc(x, y, r * 1.36, 0, TAU);
  ctx.stroke();
  if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
  // 扫描刻度
  ctx.strokeStyle = rgba(p.scan || '#ffd166', 0.28);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + t * 0.12;
    ctx.moveTo(x + Math.cos(a) * r * 1.46, y + Math.sin(a) * r * 1.46);
    ctx.lineTo(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6);
  }
  ctx.stroke();

  // 眼形
  const ry = r * 0.55 * open;
  ctx.fillStyle = rgba(iris, 0.72);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.85, y);
  ctx.quadraticCurveTo(x, y - ry * 2, x + r * 0.85, y);
  ctx.quadraticCurveTo(x, y + ry * 2, x - r * 0.85, y);
  ctx.closePath();
  ctx.fill();
  // 虹膜
  const scanX = Math.sin(t * 0.5) * r * 0.14;
  ctx.fillStyle = rgba(color, 0.88);
  ctx.beginPath();
  ctx.arc(x + scanX, y, r * (0.14 + 0.16 * open), 0, TAU);
  ctx.fill();
  // 竖瞳
  ctx.fillStyle = rgba(lid, 0.96);
  ctx.beginPath();
  ctx.ellipse(x + scanX, y, r * 0.05, r * (0.12 + 0.2 * open), 0, 0, TAU);
  ctx.fill();
  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(x - r * 0.14 + scanX, y - r * 0.09, Math.max(1, r * 0.05), 0, TAU);
  ctx.fill();
  // 上下眼睑
  ctx.strokeStyle = rgba(lid, 0.92);
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.88, y);
  ctx.quadraticCurveTo(x, y - ry * 2, x + r * 0.88, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.88, y);
  ctx.quadraticCurveTo(x, y + ry * 2, x + r * 0.88, y);
  ctx.stroke();
  ctx.restore();
}

/** 故障扫描带：周期性横向撕裂条（无渐变） */
function signalTear(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const period = p.period ?? 1.8;
  const raw = t / period + (p.phase ?? 0);
  const idx = Math.floor(raw);
  const cycle = raw - idx;
  const burst = Math.max(0, 1 - Math.abs(cycle - 0.06) / 0.1);
  if (burst <= 0.02) return;
  const seed = (p.seed ?? 1901) + idx * 97;
  const color = p.color || BASE.accent;

  ctx.save();
  for (let i = 0; i < 3; i++) {
    const yy = R(env, seed + i * 7) * h;
    const bh = 1 + R(env, seed + i * 11) * 7;
    const off = (R(env, seed + i * 13) - 0.5) * w * 0.32 * burst;
    ctx.globalAlpha = burst * (0.16 + i * 0.08);
    ctx.fillStyle = i % 2 === 0 ? color : '#080203';
    ctx.fillRect(off, yy, w, bh);
    ctx.globalAlpha = burst * 0.4;
    ctx.fillStyle = p.yellow || BASE.seal;
    ctx.fillRect(off, yy, w, 0.8);
  }
  ctx.restore();
}

/** 全屏红闪 / 边缘警示脉动（每帧 1 个渐变） */
function redPulse(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const pulse = 0.5 + 0.5 * Math.sin(t * (p.speed ?? 0.9) + (p.phase ?? 0));
  const alpha = p.alpha ?? 0.05;
  const color = p.color || BASE.accent;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * (0.4 + 0.6 * pulse);
  const g = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, w * 0.78);
  g.addColorStop(0, rgba(color, 0.5));
  g.addColorStop(0.6, rgba(color, 0.16));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // 上下边缘警示线
  ctx.globalAlpha = alpha * 2.4 * (0.3 + 0.7 * pulse);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, 2);
  ctx.fillRect(0, h - 2, w, 2);
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * 场景（单 mode：patrol）
 * ------------------------------------------------------------------ */

export const mid = sceneDefaults({
  mode: 'patrol',
  stage: 'patrol',
  palette: { ...BASE },
  plate: { scale: 1.06, swayX: 7, swayY: 10, wash: 'rgba(12,2,5,0.26)' },
  layers: [
    { atom: 'glow', params: { x: 0.5, y: 0.28, r: 0.7, color: BASE.accent, alpha: 0.1 } },
    {
      atom: 'starField', params: {
        count: 24, maxY: 0.34, color: '#ffb199', alpha: 0.2, seed: 27,
      },
    },
    { atom: 'redWaste', params: { horizon: 0.48, accent: BASE.accent, seed: 1001 } },
    {
      atom: 'fogBank', params: {
        y: 0.49, h: 0.1, color: BASE.fog, alpha: 0.12, speed: 3, phase: 1.1,
      },
    },
    {
      atom: 'watchtower', params: {
        x: 0.18, y: 0.55, h: 0.36, color: '#0b0103', accent: BASE.accent, yellow: BASE.seal,
      },
    },
    {
      atom: 'roadblock404', params: {
        x: 0.79, y: 0.675, s: 1.18, accent: BASE.accent, yellow: BASE.seal, seed: 1101,
      },
    },
    {
      atom: 'banner', params: {
        x: 0.075, y: 0.23, w: 20, h: 66, color: '#3a0810', text: '巡查', textColor: '#ffb199', alpha: 0.55, angle: 4,
      },
    },
    {
      atom: 'glyph', params: {
        text: '404', x: 0.055, y: 0.43, size: 20, color: BASE.accent, alpha: 0.13, vertical: true,
      },
    },
    {
      atom: 'glyph', params: {
        text: 'WATCH', x: 0.5, y: 0.052, size: 9, color: BASE.seal, alpha: 0.2,
      },
    },
    {
      atom: 'seal', params: {
        x: 0.93, y: 0.52, s: 16, color: '#8a1020', ink: '#ffd166', text: '抹', alpha: 0.5, rotate: 8,
      },
    },
    {
      atom: 'frameBranches', params: { side: 'left', color: '#1a0508', alpha: 0.5, s: 1.05 },
    },
    {
      atom: 'frameBranches', params: { side: 'right', color: '#160406', alpha: 0.4, s: 0.8 },
    },
    {
      atom: 'grassReeds', params: { color: '#1e0708', alpha: 0.85, h: 0.22 },
    },
    {
      atom: 'searchlight', params: {
        x: 0.18, y: 0.158, angle0: 0.35, speed: 0.55, length: 0.95, color: '#ffd9c0', alpha: 0.17,
      }, animate: true,
    },
    {
      atom: 'patrolEye', params: {
        x: 0.82, y: 0.15, r: 32, color: BASE.accent, iris: '#ff8a8a', scan: BASE.seal,
        open: 0.62, phase: 0.25,
      }, animate: true,
    },
    {
      atom: 'signalTear', params: {
        period: 1.8, phase: 0.2, seed: 1901, color: BASE.accent, yellow: BASE.seal,
      }, animate: true,
    },
    {
      atom: 'redPulse', params: {
        color: BASE.accent, alpha: 0.045, speed: 0.9, phase: 0.5,
      }, animate: true,
    },
  ],
  particles: [
    { kind: 'rain', count: 26, colors: ['rgba(255,90,100,0.55)', 'rgba(224,42,64,0.45)'] },
    { kind: 'spark', count: 10, colors: ['rgba(255,59,78,0.9)', 'rgba(255,177,153,0.85)'] },
    { kind: 'paper', count: 8, colors: ['rgba(90,70,66,0.7)', 'rgba(140,110,100,0.6)'] },
  ],
  fx: { vignette: 0.52, bottomFade: 0.62, topFade: 0.36, scanlines: 0.45, glitch: 0.85 },
});

export const boss = null;

export const atoms = {
  redWaste,
  watchtower,
  searchlight,
  roadblock404,
  patrolEye,
  signalTear,
  redPulse,
};
