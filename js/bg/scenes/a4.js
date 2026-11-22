/**
 * A线第4面「门百梁 · 方尖碑推销战」场景（P6 绘卷系统）。
 * 剧情：金色方尖碑缓缓回转，客服腔的问候如蜜似刀；通行券的价格写在看不见的条款里。
 * mid：暗金/朱色金箔集市长廊——铜钱月、金箔方尖碑大道、推销拱门（特惠/VIP/买!/清仓）、
 *      悬挂价签、金币与票据雨、促销光柱、摊棚框景与收据。
 * boss：方尖碑齐亮、巨型 VIP 金匾、票券风暴、促销光柱全开、收据铺地。
 * 设计说明：docs/level-background-redesign.md §4。
 */
import { sceneDefaults } from '../schema.js';
import { STAGE_PALETTES } from './_stub.js';
import { lantern } from '../atoms.js';

const BASE = STAGE_PALETTES.a4;
const TAU = Math.PI * 2;

const W = (env) => env?.W || 450;
const H = (env) => env?.H || 600;
const R = (env, seed) => (env && typeof env.rand === 'function' ? env.rand(seed) : 0.5);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** CSS 颜色 → rgba(a)；#rgb / #rrggbb / rgb() / rgba() 均可用 */
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

/** 取染色材质（缺失/异常 → null，原子自行兜底） */
function tinted(env, name, color, alpha = 1) {
  if (!env || typeof env.tint !== 'function') return null;
  try {
    return env.tint(name, color, alpha);
  } catch {
    return null;
  }
}

/**
 * 材质填充：路径裁剪后用金箔/和纸纹理铺满；材质缺失退化为纯色。
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} env
 * @param {string} matName
 * @param {string} color 染色（暗金/奶油等）
 * @param {number} alpha 图层透明度
 * @param {(c: CanvasRenderingContext2D) => void} pathFn 路径
 */
function matFill(ctx, env, matName, color, alpha, pathFn) {
  ctx.save();
  ctx.beginPath();
  pathFn(ctx);
  ctx.clip();
  ctx.globalAlpha = clamp01(alpha);
  const mat = tinted(env, matName, color, 0.94);
  if (mat) ctx.drawImage(mat, 0, 0, W(env), H(env));
  else {
    ctx.fillStyle = color;
    ctx.fillRect(-8, -8, W(env) + 16, H(env) + 16);
  }
  ctx.restore();
}

function rectPath(x, y, w, h) {
  return (c) => { c.rect(x, y, w, h); };
}

/* ------------------------------------------------------------------ *
 * 专属原子：铜钱月 / 集市天际线 / 方尖碑大道 / 推销拱门 / 悬挂价签
 *           摊位棚顶 / 金箔地砖 / 收据长卷 / VIP 金匾 / 促销光柱 / 金尘 / 票券风暴
 * ------------------------------------------------------------------ */

/** 铜钱月：方孔圆钱做的月亮，锈轴与环刻；边缘坠着两枚小钱 */
function coinMoon(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.245) * w;
  const y = (p.y ?? 0.135) * h;
  const r = p.r ?? 33;
  const gold = p.gold || '#e3b64d';
  const dark = p.dark || '#221804';
  const rim = p.rim || '#8a6a22';

  ctx.save();
  // 月晕
  const halo = ctx.createRadialGradient(x, y, r * 0.55, x, y, r * 3.8);
  halo.addColorStop(0, rgba(gold, p.haloAlpha ?? 0.16));
  halo.addColorStop(0.45, rgba(gold, (p.haloAlpha ?? 0.16) * 0.4));
  halo.addColorStop(1, rgba(gold, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(x - r * 3.8, y - r * 3.8, r * 7.6, r * 7.6);

  // 钱盘
  ctx.fillStyle = rgba(dark, 0.92);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  // 锈蚀斑（钱面的暗块）
  ctx.fillStyle = rgba('#120c03', 0.6);
  for (let i = 0; i < 5; i++) {
    const a = R(env, 9 + i * 7) * TAU;
    const rr = r * (0.55 + R(env, 31 + i * 5) * 0.3);
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * 0.16, r * 0.1, a, 0, TAU);
    ctx.fill();
  }
  // 钱缘双环
  ctx.strokeStyle = rgba(gold, 0.44);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.97, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = rgba(rim, 0.6);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.83, 0, TAU);
  ctx.stroke();
  // 环刻：八组短笔画（确定性）
  ctx.fillStyle = rgba(gold, 0.5);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.22;
    for (let k = 0; k < 2; k++) {
      ctx.save();
      ctx.translate(x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.66);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillRect(-1.4, -r * 0.075 + k * r * 0.09, 2.8, r * 0.035);
      ctx.restore();
    }
  }
  // 方孔
  const hs = r * 0.36;
  ctx.fillStyle = rgba('#0a0702', 0.94);
  ctx.fillRect(x - hs / 2, y - hs / 2, hs, hs);
  ctx.strokeStyle = rgba(gold, 0.72);
  ctx.lineWidth = 1.3;
  ctx.strokeRect(x - hs / 2, y - hs / 2, hs, hs);
  // 孔内穿绳的微光
  ctx.strokeStyle = rgba(gold, 0.26);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x - hs * 0.5, y);
  ctx.lineTo(x + hs * 0.5, y);
  ctx.stroke();
  // 高光
  ctx.fillStyle = rgba('#ffe8b0', 0.5);
  ctx.beginPath();
  ctx.arc(x - r * 0.34, y - r * 0.4, r * 0.07, 0, TAU);
  ctx.fill();
  // 伴生小铜钱（边缘）
  const coins = p.coins || [[0.82, 0.62, 0.3], [0.9, 0.09, 0.22], [0.5, 0.86, 0.18]];
  for (const [ox, oy, cs] of coins) {
    const cx = x + (ox - 0.5) * r * 2.6;
    const cy = y + (oy - 0.5) * r * 2.4;
    const cr = r * cs;
    ctx.strokeStyle = rgba(gold, 0.42);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = rgba(dark, 0.55);
    ctx.fillRect(cx - cr * 0.24, cy - cr * 0.24, cr * 0.48, cr * 0.48);
  }
  ctx.restore();
}

/** 远处集市天际线：层叠摊顶、招牌幡、檐下灯火与拉旗绳 */
function bazaarSkyline(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const baseY = (p.baseY ?? 0.448) * h;
  const seed = p.seed ?? 801;
  const warm = p.warm || '#e3b64d';
  const red = p.red || '#8a2418';
  const dark = p.dark || '#120b03';
  const cream = p.cream || '#d8c49a';
  const count = p.count ?? 11;
  const alpha = p.alpha ?? 1;

  ctx.save();
  // 地平线暖光
  const hg = ctx.createLinearGradient(0, baseY - h * 0.17, 0, baseY + h * 0.02);
  hg.addColorStop(0, rgba(warm, 0));
  hg.addColorStop(0.72, rgba(warm, 0.09));
  hg.addColorStop(1, rgba(warm, 0.015));
  ctx.fillStyle = hg;
  ctx.fillRect(0, baseY - h * 0.17, w, h * 0.19);

  // 远层：低矮库房 / 摊位背棚
  ctx.globalAlpha = alpha * 0.5;
  ctx.fillStyle = dark;
  for (let i = 0; i < count + 5; i++) {
    const x = ((i + 0.2 + R(env, seed + i * 11) * 0.62) / (count + 5)) * w;
    const bw = 18 + R(env, seed + i * 13) * 44;
    const bh = 7 + R(env, seed + i * 17) * 17;
    ctx.fillRect(x - bw / 2, baseY - bh, bw, bh + 3);
  }

  // 近层：摊棚 + 斜顶雨棚 + 檐下灯 + 招牌幡
  for (let i = 0; i < count; i++) {
    const x = ((i + 0.22 + R(env, seed + i * 23) * 0.56) / count) * w;
    const bw = 15 + R(env, seed + i * 29) * 32;
    const bh = 14 + R(env, seed + i * 31) * 36;
    const top = baseY - bh;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = dark;
    ctx.fillRect(x - bw / 2, top, bw, bh + 2);
    // 雨棚（斜顶 + 条纹）
    const awningR = R(env, seed + i * 37) > 0.5;
    ctx.fillStyle = rgba(awningR ? red : '#3a2c10', 0.85);
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.7, top + 1);
    ctx.lineTo(x + bw * 0.7, top + 1);
    ctx.lineTo(x + bw * 0.56, top - 6);
    ctx.lineTo(x - bw * 0.56, top - 6);
    ctx.closePath();
    ctx.fill();
    if (i % 3 === 0) {
      ctx.fillStyle = rgba(cream, 0.2);
      for (let s = 0; s < 3; s++) ctx.fillRect(x - bw * 0.5 + s * bw * 0.32, top - 5, bw * 0.1, 5);
    }
    // 檐下灯与窗光（越靠两侧越亮，中心压低）
    const edgeBoost = 1 - (Math.min(x, w - x) / (w * 0.5)) * 0.62;
    const lights = Math.max(1, (bw / 7) | 0);
    for (let c = 0; c < lights; c++) {
      const lit = R(env, seed + i * 41 + c * 53);
      if (lit > 0.4) {
        const warmLight = R(env, seed + i * 43 + c * 59) > 0.64;
        ctx.globalAlpha = alpha * clamp01(0.2 + lit * 0.5 * edgeBoost);
        ctx.fillStyle = warmLight ? warm : red;
        ctx.fillRect(x - bw / 2 + 2.6 + c * 7, top + 3 + R(env, seed + i * 47 + c * 61) * bh * 0.4, 2.1, 2.6);
      }
    }
    // 招牌幡（竖条，部分写单字）
    if (i % 4 === 0) {
      const sx = x + (R(env, seed + 61 + i * 7) - 0.5) * bw * 0.7;
      ctx.globalAlpha = alpha * 0.62;
      ctx.fillStyle = rgba(red, 0.9);
      ctx.fillRect(sx - 3.2, top + 2, 6.4, 18 + R(env, seed + 71 + i) * 8);
      ctx.fillStyle = rgba(cream, 0.55);
      ctx.font = font(5.4);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const sign = ['特', '惠', '買', 'VIP'][i % 4];
      ctx.fillText(sign, sx, top + 10);
    }
  }

  // 檐间拉旗绳 + 三角旗
  for (let s = 0; s < 3; s++) {
    const y0 = baseY - h * (0.085 + s * 0.035);
    const sag = h * 0.024;
    ctx.strokeStyle = rgba(cream, 0.14);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-10, y0);
    ctx.quadraticCurveTo(w * 0.5, y0 + sag * (1 + s * 0.3), w + 10, y0 - 4);
    ctx.stroke();
    for (let i = 0; i < 13; i++) {
      const t = i / 12;
      const px = t * w;
      const py = y0 + Math.sin(t * Math.PI) * sag * (1 + s * 0.3) - 3;
      ctx.globalAlpha = alpha * (0.22 + (i % 2) * 0.1);
      ctx.fillStyle = i % 3 === 0 ? rgba(warm, 0.85) : rgba(red, 0.85);
      ctx.beginPath();
      ctx.moveTo(px - 2.6, py);
      ctx.lineTo(px + 2.6, py);
      ctx.lineTo(px, py + 4.6);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 两侧远碑（更高，压在天际线两边）
  for (const side of [-1, 1]) {
    const ox = side < 0 ? 0.048 : 0.952;
    const bx = ox * w;
    const bw = 7;
    const bh = h * (0.14 + (side < 0 ? 0.03 : 0));
    const top = baseY - bh;
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = rgba(dark, 0.95);
    ctx.beginPath();
    ctx.moveTo(bx - bw, baseY);
    ctx.lineTo(bx - bw * 0.66, top);
    ctx.lineTo(bx, top - 8);
    ctx.lineTo(bx + bw * 0.66, top);
    ctx.lineTo(bx + bw, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(warm, 0.28);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(bx - bw * 0.62, top);
    ctx.lineTo(bx, top - 8);
    ctx.stroke();
  }
  ctx.restore();
}

/** 方尖碑大道的排布（透视：远者近中、近者贴边；与脉冲原子共用） */
function obeliskLayout(env, p = {}) {
  const w = W(env);
  const h = H(env);
  const rows = Math.max(2, (p.rows ?? 4) | 0);
  const vpY = (p.vpY ?? 0.45) * h;
  const list = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < rows; i++) {
      const depth = (i + 1) / rows; // 0..1 近
      const x = w * 0.5 + side * (0.055 + depth * 0.395) * w;
      const y = vpY + depth * 0.315 * h;
      list.push({ x, y, s: 0.4 + depth * 1.05, side, depth, i });
    }
  }
  list.sort((a, b) => a.depth - b.depth);
  return list;
}

/** 金箔方尖碑大道：两列锥形碑渐次逼近，碑身刻铭、尖端受光 */
function obeliskAvenue(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const gold = p.gold || '#5a4212';
  const rim = p.rim || '#e3b64d';
  const hot = p.hot || '#ffdf9a';
  const dark = p.dark || '#161005';
  const bh0 = p.bh ?? 116;
  const bw0 = p.bw ?? 15;
  const list = obeliskLayout(env, p);

  ctx.save();
  for (const o of list) {
    const bh = bh0 * o.s;
    const bw = bw0 * o.s;
    const x = o.x;
    const base = o.y;
    const shaftH = bh * 0.86;
    const apexY = base - bh;
    const topW = bw * 0.3;
    // 基座
    ctx.fillStyle = rgba(dark, 0.92);
    ctx.fillRect(x - bw * 1.15, base - bh * 0.045, bw * 2.3, bh * 0.055 + 2);
    ctx.fillStyle = rgba(rim, 0.14);
    ctx.fillRect(x - bw * 1.15, base - bh * 0.045, bw * 2.3, 1);
    // 碑体（金箔材质）
    matFill(ctx, env, 'gold', gold, 0.96, (c) => {
      c.moveTo(x - bw / 2, base);
      c.lineTo(x - topW, base - shaftH);
      c.lineTo(x, apexY);
      c.lineTo(x + topW, base - shaftH);
      c.lineTo(x + bw / 2, base);
      c.closePath();
    });
    // 暗面（外侧）
    ctx.fillStyle = rgba('#0c0802', 0.4);
    ctx.beginPath();
    ctx.moveTo(x + o.side * bw * 0.5, base);
    ctx.lineTo(x + o.side * topW, base - shaftH);
    ctx.lineTo(x + o.side * topW * 0.2, base - shaftH);
    ctx.lineTo(x + o.side * bw * 0.16, base);
    ctx.closePath();
    ctx.fill();
    // 内侧受光棱
    ctx.strokeStyle = rgba(rim, 0.35 + o.depth * 0.3);
    ctx.lineWidth = 0.9 + o.depth * 0.6;
    ctx.beginPath();
    ctx.moveTo(x - o.side * bw * 0.5, base - bh * 0.02);
    ctx.lineTo(x - o.side * topW, base - shaftH);
    ctx.lineTo(x, apexY);
    ctx.stroke();
    // 尖端小三角受光
    ctx.fillStyle = rgba(hot, 0.18 + o.depth * 0.24);
    ctx.beginPath();
    ctx.moveTo(x - topW * 1.05, base - shaftH);
    ctx.lineTo(x, apexY);
    ctx.lineTo(x - topW * 0.1, base - shaftH);
    ctx.closePath();
    ctx.fill();
    // 铭文带（近处才画，避免远景糊成噪点）
    if (o.depth > 0.45) {
      ctx.strokeStyle = rgba(rim, 0.3);
      ctx.lineWidth = 0.7;
      for (let k = 0; k < 3; k++) {
        const yy = base - shaftH * (0.24 + k * 0.2);
        const half = (bw / 2) * (1 - ((base - yy) / bh) * 0.62) * 0.6;
        ctx.beginPath();
        ctx.moveTo(x - half, yy);
        ctx.lineTo(x + half, yy);
        ctx.stroke();
        ctx.fillStyle = rgba(hot, 0.28);
        for (let d = 0; d < 3; d++) {
          ctx.fillRect(x - half * 0.6 + d * half * 0.5, yy - 1.6, 1.2, 1.6);
        }
      }
      // 垂挂价签（少数碑上）
      if (o.i === 1 && o.side > 0) {
        ctx.save();
        ctx.translate(x + bw * 0.55, base - shaftH * 0.56);
        ctx.rotate(0.16);
        ctx.strokeStyle = rgba(rim, 0.3);
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.fillStyle = rgba('#e8d7ac', 0.5);
        ctx.fillRect(-8, 0, 16, 11);
        ctx.fillStyle = rgba('#5a140e', 0.8);
        ctx.font = font(6.4);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('¥99', 0, 5.4);
        ctx.restore();
      }
    }
    // 尖端灯（静态基础光）
    ctx.fillStyle = rgba(hot, 0.5 + o.depth * 0.3);
    ctx.beginPath();
    ctx.arc(x, apexY - 1.4, 1.3 + o.depth * 1.6, 0, TAU);
    ctx.fill();
    ctx.globalAlpha *= 0.4;
    ctx.beginPath();
    ctx.arc(x, apexY - 1.4, 3.6 + o.depth * 5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** 推销拱门：金箔门柱、多层门楣、巨型招牌、五幅竖广告幡、檐灯与拉绳 */
function salesArch(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const cx = (p.x ?? 0.5) * w;
  const baseY = (p.y ?? 0.6) * h;
  const gap = (p.gap ?? 0.148) * w;
  const pw = (p.pw ?? 25) * (p.s ?? 1);
  const ph = (p.ph ?? 148) * (p.s ?? 1);
  const gold = p.gold || '#4a3410';
  const rim = p.rim || '#e3b64d';
  const hot = p.hot || '#ffe8b0';
  const red = p.red || '#701810';
  const cream = p.cream || '#e8d7ac';
  const ads = p.ads || ['特惠', 'VIP', '买!', '清仓', '限时'];
  const topY = baseY - ph;

  ctx.save();
  // 门内深色（走廊尽头的暗）
  const inner = ctx.createLinearGradient(0, topY, 0, baseY);
  inner.addColorStop(0, rgba('#1a1206', 0.86));
  inner.addColorStop(1, rgba('#0a0702', 0.94));
  ctx.fillStyle = inner;
  ctx.fillRect(cx - gap - pw, topY, (gap + pw) * 2, ph + 8);

  // 柱（金箔材质 + 朱漆内衬）
  for (const side of [-1, 1]) {
    const px = cx + side * gap - pw / 2;
    matFill(ctx, env, 'gold', gold, 0.97, rectPath(px, topY, pw, ph));
    ctx.fillStyle = rgba(red, 0.75);
    ctx.fillRect(side < 0 ? px + pw - 4.5 : px, topY + 6, 4.5, ph - 10);
    ctx.fillStyle = rgba('#0b0702', 0.45);
    ctx.fillRect(side < 0 ? px : px + pw - 3, topY, 3, ph);
    // 柱身箍环
    ctx.fillStyle = rgba(rim, 0.42);
    for (let k = 1; k < 4; k++) ctx.fillRect(px - 1.5, topY + (ph * k) / 4, pw + 3, 2.2);
    // 柱础
    ctx.fillStyle = rgba('#120c04', 0.95);
    ctx.fillRect(px - 5, baseY - 8, pw + 10, 9);
    ctx.fillStyle = rgba(rim, 0.22);
    ctx.fillRect(px - 5, baseY - 9, pw + 10, 1.4);
    // 柱头
    ctx.fillStyle = rgba('#1a1206', 0.98);
    ctx.fillRect(px - 4, topY - 7, pw + 8, 8);
    ctx.fillStyle = rgba(rim, 0.3);
    ctx.fillRect(px - 4, topY - 7, pw + 8, 1.2);
  }

  // 门楣：三层横梁
  const beamW = (gap + pw) * 2 + 10;
  const beamX = cx - beamW / 2;
  const beams = [
    { y: topY - 26, hh: 11, color: '#241806', rimA: 0.3 },
    { y: topY - 14, hh: 13, color: '#1c1205', rimA: 0.4 },
    { y: topY - 2, hh: 8, color: '#120c03', rimA: 0.22 },
  ];
  for (const b of beams) {
    matFill(ctx, env, 'gold', b.color, 0.96, rectPath(beamX, b.y, beamW, b.hh));
    ctx.fillStyle = rgba(rim, b.rimA);
    ctx.fillRect(beamX, b.y, beamW, 1.1);
  }
  // 招牌（门楣上方中央）
  const signW = Math.min(beamW * 0.66, 178);
  const signH = 30;
  const signY = topY - 26 - signH - 4;
  ctx.save();
  const sg = ctx.createLinearGradient(0, signY, 0, signY + signH);
  sg.addColorStop(0, rgba('#3a2010', 0.96));
  sg.addColorStop(1, rgba('#1c0e06', 0.98));
  ctx.fillStyle = sg;
  ctx.fillRect(cx - signW / 2, signY, signW, signH);
  ctx.strokeStyle = rgba(rim, 0.72);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - signW / 2 + 1.5, signY + 1.5, signW - 3, signH - 3);
  ctx.strokeStyle = rgba(hot, 0.28);
  ctx.lineWidth = 0.7;
  ctx.strokeRect(cx - signW / 2 + 4.5, signY + 4.5, signW - 9, signH - 9);
  ctx.fillStyle = rgba(hot, 0.86);
  ctx.font = font(15);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.sign || '特惠专场', cx, signY + signH * 0.52);
  // 招牌两端铜钱饰
  for (const side of [-1, 1]) {
    const dx = cx + side * (signW / 2 + 7);
    ctx.strokeStyle = rgba(rim, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(dx, signY + signH / 2, 6.5, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = rgba(gold, 0.9);
    ctx.fillRect(dx - 2, signY + signH / 2 - 2, 4, 4);
  }
  ctx.restore();

  // 五幅竖广告幡（自门楣垂下）
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const adCount = Math.max(1, ads.length);
  for (let i = 0; i < adCount; i++) {
    const t = adCount === 1 ? 0.5 : i / (adCount - 1);
    const bx = cx - gap * 0.86 + t * gap * 1.72;
    const bw = 17 - Math.abs(t - 0.5) * 5;
    const bh = 50 + R(env, 61 + i * 7) * 14;
    const by = topY - 4;
    const sway = Math.sin((env?.t || 0) * 0.8 + i * 1.7) * 0.012;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(sway + (i % 2 ? 0.02 : -0.02));
    ctx.fillStyle = rgba(red, 0.88);
    ctx.beginPath();
    ctx.moveTo(-bw / 2, 0);
    ctx.lineTo(bw / 2, 0);
    ctx.lineTo(bw / 2, bh * 0.8);
    ctx.lineTo(bw * 0.16, bh);
    ctx.lineTo(0, bh * 0.9);
    ctx.lineTo(-bw * 0.16, bh);
    ctx.lineTo(-bw / 2, bh * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(rim, 0.4);
    ctx.fillRect(-bw / 2, 0, bw, 2);
    // 字
    const text = ads[i] || '';
    ctx.fillStyle = rgba(cream, 0.82);
    const fs = Math.min(bw * 0.62, bh / (text.length + 1.2));
    ctx.font = font(fs);
    const step = fs * 1.12;
    const startY = bh * 0.46 - ((text.length - 1) * step) / 2;
    for (let k = 0; k < text.length; k++) ctx.fillText(text[k], 0, startY + k * step);
    // 底端小铜钱
    ctx.strokeStyle = rgba(rim, 0.55);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, bh + 4, 3.2, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // 檐下灯串 + 拉旗绳
  ctx.strokeStyle = rgba(cream, 0.16);
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(beamX, topY - 27);
  ctx.quadraticCurveTo(cx, topY - 16, beamX + beamW, topY - 27);
  ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.5) / 9;
    const lx = beamX + t * beamW;
    const ly = topY - 27 + Math.sin(t * Math.PI) * 10;
    lantern(ctx, {
      x: lx / w, y: ly / h, r: 3.4, s: 1, color: i % 2 ? '#ffcf66' : '#ff9a52', glow: true, string: false,
    }, env);
  }
  // 门柱外侧斜拉绳三角旗（向画面两侧）
  for (const side of [-1, 1]) {
    const x0 = cx + side * (gap + pw);
    const x1 = side < 0 ? -8 : w + 8;
    const y0 = topY + 6;
    const y1 = topY + h * 0.1;
    ctx.strokeStyle = rgba(cream, 0.13);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, y0 + h * 0.045, x1, y1);
    ctx.stroke();
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * ((x0 + x1) / 2) + t * t * x1;
      const py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + h * 0.045) + t * t * y1;
      ctx.fillStyle = rgba(i % 2 ? red : rim, 0.2);
      ctx.beginPath();
      ctx.moveTo(px - 2.4, py);
      ctx.lineTo(px + 2.4, py);
      ctx.lineTo(px, py + 4.2);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 悬挂价签：从画面上缘垂绳挂下的和纸标签（价格 / 限时 / 买一送一） */
function hangingTags(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const cream = p.cream || '#e8d7ac';
  const ink = p.ink || '#4a2a12';
  const red = p.red || '#a33622';
  const tags = p.tags || [
    { x: 0.075, y: 0.235, len: 96, w: 24, h: 28, text: '¥99', sub: '限时' },
    { x: 0.165, y: 0.2, len: 72, w: 20, h: 24, text: '¥1999' },
    { x: 0.255, y: 0.29, len: 118, w: 22, h: 26, text: 'VIP', sub: '专享' },
    { x: 0.745, y: 0.27, len: 104, w: 22, h: 26, text: '秒杀' },
    { x: 0.84, y: 0.21, len: 76, w: 20, h: 24, text: '¥999' },
    { x: 0.925, y: 0.31, len: 112, w: 24, h: 28, text: '买一送一', small: true },
  ];
  const t = env?.t || 0;
  ctx.save();
  for (let i = 0; i < tags.length; i++) {
    const tg = tags[i];
    const x = tg.x * w;
    const yTop = (tg.y - tg.len / h) * h;
    const rot = (R(env, 131 + i * 7) - 0.5) * 0.28 + Math.sin(t * 0.55 + i * 1.3) * 0.018;
    ctx.save();
    ctx.translate(x, yTop);
    ctx.rotate(rot);
    // 绳
    ctx.strokeStyle = rgba(cream, 0.32);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, tg.len - 6);
    ctx.stroke();
    // 吊环
    ctx.beginPath();
    ctx.arc(0, tg.len - 6, 2.2, 0, TAU);
    ctx.stroke();
    // 纸签
    const tw = tg.w;
    const th = tg.small ? tg.h + 5 : tg.h;
    matFill(ctx, env, 'washi', cream, 0.66, rectPath(-tw / 2, tg.len, tw, th));
    ctx.strokeStyle = rgba(ink, 0.42);
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-tw / 2, tg.len, tw, th);
    // 竖排字
    ctx.fillStyle = rgba(ink, 0.78);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = tg.text || '';
    if (tg.small) {
      ctx.font = font(7);
      ctx.fillText(text, 0, tg.len + th * 0.42);
    } else {
      ctx.font = font(Math.min(tw * 0.44, 12));
      const step = Math.min(tw * 0.5, 13);
      const start = tg.len + th / 2 - ((text.length - 1) * step) / 2;
      for (let k = 0; k < text.length; k++) ctx.fillText(text[k], 0, start + k * step);
    }
    // 副标（红字条）
    if (tg.sub) {
      ctx.fillStyle = rgba(red, 0.6);
      ctx.fillRect(-tw * 0.44, tg.len + th - 6, tw * 0.88, 4.6);
      ctx.fillStyle = rgba(cream, 0.8);
      ctx.font = font(4.6);
      ctx.fillText(tg.sub, 0, tg.len + th - 3.6);
    }
    // 红色折扣戳
    if (i % 3 === 0) {
      ctx.strokeStyle = rgba(red, 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(tw * 0.28, tg.len + 6, 4.4, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

/** 金箔地砖 + 散落票据/金币堆 + 前景立式价目牌 */
function bazaarFloor(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const y0 = (p.y ?? 0.64) * h;
  const ink = p.ink || '#0b0702';
  const gold = p.gold || '#e3b64d';
  const cream = p.cream || '#d8c49a';
  const seed = p.seed ?? 1401;
  const alpha = p.alpha ?? 1;

  ctx.save();
  // 地面暗部
  const g = ctx.createLinearGradient(0, y0, 0, h);
  g.addColorStop(0, rgba(ink, 0));
  g.addColorStop(0.42, rgba(ink, 0.58));
  g.addColorStop(1, rgba(ink, 0.9));
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, w, h - y0);
  // 透视地砖线（向灭点收束）
  const vpx = w * 0.5;
  const vpy = h * 0.5;
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const bx = -w * 0.35 + t * w * 1.7;
    ctx.strokeStyle = rgba(gold, 0.07 + (i % 2) * 0.03);
    ctx.beginPath();
    ctx.moveTo(vpx + (bx - vpx) * 0.18, y0 + 6);
    ctx.lineTo(bx, h + 10);
    ctx.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const yy = y0 + 14 + t * t * (h - y0);
    ctx.strokeStyle = rgba(gold, 0.055 + t * 0.03);
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.quadraticCurveTo(w * 0.5, yy + 3, w, yy);
    ctx.stroke();
  }
  // 散落票券 / 纸片
  for (let i = 0; i < 14; i++) {
    const t = R(env, seed + i * 7);
    const x = w * (0.06 + R(env, seed + i * 11) * 0.88);
    const y = y0 + 22 + t * (h - y0 - 26);
    const sw = 6 + R(env, seed + i * 13) * 10;
    const sh = sw * 0.58;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((R(env, seed + i * 17) - 0.5) * 1.1);
    ctx.globalAlpha = alpha * (0.2 + R(env, seed + i * 19) * 0.3);
    ctx.fillStyle = cream;
    ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
    ctx.fillStyle = rgba('#5a3a18', 0.55);
    ctx.fillRect(-sw * 0.32, -sh * 0.1, sw * 0.64, 0.6);
    ctx.fillRect(-sw * 0.32, sh * 0.14, sw * 0.42, 0.5);
    ctx.restore();
  }
  // 金币堆（左右两角）
  for (const side of [-1, 1]) {
    const bx = side < 0 ? w * 0.115 : w * 0.885;
    const by = h * 0.905;
    for (let i = 0; i < 9; i++) {
      const rr = R(env, seed + 200 + i * 7 + (side > 0 ? 50 : 0));
      const ox = bx + (R(env, seed + 220 + i * 11 + (side > 0 ? 50 : 0)) - 0.5) * 42;
      const oy = by + (R(env, seed + 240 + i * 13) - 0.5) * 13 - i * 1.2;
      ctx.globalAlpha = alpha * (0.3 + rr * 0.4);
      ctx.fillStyle = rgba(gold, 0.65);
      ctx.beginPath();
      ctx.ellipse(ox, oy, 4.6 + rr * 3.4, 1.7 + rr * 1.1, -0.12, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba('#3a2a0c', 0.6);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.ellipse(ox, oy, 4.6 + rr * 3.4, 1.7 + rr * 1.1, -0.12, 0, TAU);
      ctx.stroke();
    }
  }
  // 前景立式价目牌（左右贴边）
  for (const side of [-1, 1]) {
    const px = side < 0 ? w * 0.045 : w * 0.955;
    const py = h * 0.845;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(side * 0.06);
    ctx.globalAlpha = alpha * 0.85;
    // 支架
    ctx.strokeStyle = rgba('#1c1206', 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-9, 26);
    ctx.moveTo(0, 0);
    ctx.lineTo(9, 26);
    ctx.stroke();
    // 板
    const bw = 38;
    const bh = 30;
    matFill(ctx, env, 'washi', '#3a2410', 0.94, (c) => { c.rect(-bw / 2, -bh, bw, bh); });
    ctx.strokeStyle = rgba(gold, 0.4);
    ctx.lineWidth = 0.9;
    ctx.strokeRect(-bw / 2, -bh, bw, bh);
    ctx.fillStyle = rgba('#ffcf66', 0.82);
    ctx.font = font(13);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(side < 0 ? '¥9' : '¥99', 0, -bh * 0.56);
    ctx.fillStyle = rgba(cream, 0.6);
    ctx.font = font(6.4);
    ctx.fillText(side < 0 ? '限时' : 'VIP', 0, -bh * 0.24);
    ctx.restore();
  }
  ctx.restore();
}

/** 摊位棚顶：画面两上角的条纹雨棚 + 吊灯，形成“人在集市长廊里”的框景 */
function stallCanopies(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const red = p.red || '#5a140e';
  const cream = p.cream || '#d8c49a';
  const rim = p.rim || '#e3b64d';
  const alpha = p.alpha ?? 0.9;
  ctx.save();
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -12 : w + 12;
    const inner = side < 0 ? w * 0.295 : w * 0.705;
    ctx.save();
    ctx.globalAlpha = alpha;
    // 雨棚布（斜向条纹）
    const rows = 5;
    for (let i = 0; i < rows; i++) {
      const t0 = i / rows;
      const t1 = (i + 1) / rows;
      const y0 = h * (0.008 + t0 * 0.088);
      const y1 = h * (0.008 + t1 * 0.088);
      const xa = x0 + (inner - x0) * (0.28 + t0 * 0.72);
      const xb = x0 + (inner - x0) * (0.28 + t1 * 0.72);
      ctx.fillStyle = i % 2 ? rgba(red, 0.5) : rgba(cream, 0.26);
      ctx.beginPath();
      ctx.moveTo(x0, y0 - 8);
      ctx.lineTo(xa, y0 - 8);
      ctx.lineTo(xb, y1 - 8);
      ctx.lineTo(x0, y1 - 8);
      ctx.closePath();
      ctx.fill();
    }
    // 棚沿（波浪边）+ 沿口金线
    ctx.beginPath();
    const ea = inner;
    const ey = h * 0.1;
    ctx.moveTo(x0, h * 0.075);
    ctx.lineTo(ea, ey);
    for (let i = 0; i < 7; i++) {
      const t = i / 7;
      const x = ea - (ea - x0) * t;
      ctx.quadraticCurveTo(x - (ea - x0) * 0.02, ey + 7, x - (ea - x0) * 0.05, ey + 2);
    }
    ctx.lineTo(x0, ey);
    ctx.strokeStyle = rgba(rim, 0.24);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // 垂穗
    ctx.strokeStyle = rgba(cream, 0.2);
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 6; i++) {
      const x = x0 + (ea - x0) * (i / 6);
      const y = h * 0.1 + 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (side < 0 ? -2 : 2), y + 6);
      ctx.stroke();
    }
    // 吊灯
    lantern(ctx, {
      x: (x0 + (ea - x0) * 0.34) / w,
      y: h > 0 ? 0.088 + 0.085 : 0.1,
      r: 4.2, s: 1, color: '#ffcf66', glow: true, string: true, stringColor: '#1a1006',
    }, env);
    ctx.restore();
  }
  ctx.restore();
}

/** 收据长卷：从右下角铺开、折返的打印票据（boss 层） */
function receiptStream(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const cream = p.cream || '#e8dcc0';
  const ink = p.ink || '#4a3a24';
  const red = p.red || '#a33622';
  const alpha = p.alpha ?? 0.42;
  const yBase = h * (p.y ?? 0.93);
  ctx.save();
  ctx.globalAlpha = alpha;
  // 纸带（几段折返）
  ctx.beginPath();
  ctx.moveTo(w + 8, yBase - 26);
  ctx.quadraticCurveTo(w * 0.72, yBase - 34, w * 0.62, yBase - 8);
  ctx.quadraticCurveTo(w * 0.53, yBase + 14, w * 0.4, yBase + 2);
  ctx.quadraticCurveTo(w * 0.26, yBase - 10, w * 0.16, yBase + 6);
  ctx.lineTo(w * 0.12, yBase + 20);
  ctx.quadraticCurveTo(w * 0.3, yBase + 12, w * 0.44, yBase + 22);
  ctx.quadraticCurveTo(w * 0.6, yBase + 33, w * 0.74, yBase + 14);
  ctx.quadraticCurveTo(w * 0.87, yBase + 1, w + 8, yBase + 12);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, yBase - 30, 0, yBase + 30);
  g.addColorStop(0, rgba(cream, 0.9));
  g.addColorStop(1, rgba('#9a8a6a', 0.85));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(ink, 0.3);
  ctx.lineWidth = 0.7;
  ctx.stroke();
  // 打印行
  ctx.strokeStyle = rgba(ink, 0.4);
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 5; i++) {
    const yy = yBase - 18 + i * 6;
    ctx.beginPath();
    ctx.moveTo(w * 0.68, yy);
    ctx.lineTo(w * 0.94, yy + 2);
    ctx.stroke();
  }
  // 合计金额
  ctx.fillStyle = rgba(red, 0.72);
  ctx.font = font(8);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('合计 ¥99999', w - 18, yBase - 4);
  // 锯齿断口
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const x = w * (0.12 + i * 0.008);
    const y = yBase + 20 - i;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = rgba(ink, 0.35);
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.restore();
}

/** 巨型 VIP 金匾：华丽框边、流苏、金字（boss 层） */
function vipPlaque(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const cx = (p.x ?? 0.5) * w;
  const cy = (p.y ?? 0.105) * h;
  const bw = p.w ?? 182;
  const bh = p.h ?? 52;
  const gold = p.gold || '#3a2a0c';
  const rim = p.rim || '#ffcf66';
  const hot = p.hot || '#ffe8b0';
  const red = p.red || '#7a1a12';

  ctx.save();
  // 背光
  const halo = ctx.createRadialGradient(cx, cy, bh * 0.3, cx, cy, bw * 1.1);
  halo.addColorStop(0, rgba(hot, 0.13));
  halo.addColorStop(0.55, rgba(rim, 0.05));
  halo.addColorStop(1, rgba(rim, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(cx - bw * 1.2, cy - bw * 0.8, bw * 2.4, bw * 1.6);
  // 流苏（左右垂下）
  for (const side of [-1, 1]) {
    const tx = cx + side * (bw / 2 + 8);
    ctx.strokeStyle = rgba(red, 0.8);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(tx, cy - bh * 0.2);
    ctx.quadraticCurveTo(tx + side * 6, cy + bh * 0.6, tx + side * 2, cy + bh * 1.35);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = rgba(rim, 0.55);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(tx + side * 2, cy + bh * 0.9 + i * 2);
      ctx.lineTo(tx + side * (5 + i), cy + bh * 1.35 + i * 2.4);
      ctx.stroke();
    }
  }
  // 外框（两层）
  matFill(ctx, env, 'gold', gold, 0.98, rectPath(cx - bw / 2 - 7, cy - bh / 2 - 7, bw + 14, bh + 14));
  ctx.strokeStyle = rgba(rim, 0.8);
  ctx.lineWidth = 1.6;
  ctx.strokeRect(cx - bw / 2 - 7, cy - bh / 2 - 7, bw + 14, bh + 14);
  ctx.strokeStyle = rgba(hot, 0.35);
  ctx.lineWidth = 0.8;
  ctx.strokeRect(cx - bw / 2 - 3.5, cy - bh / 2 - 3.5, bw + 7, bh + 7);
  // 内板
  const ig = ctx.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2);
  ig.addColorStop(0, rgba('#3a1a0c', 0.96));
  ig.addColorStop(1, rgba('#1c0c05', 0.98));
  ctx.fillStyle = ig;
  ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
  // 四角卷草饰
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const ox = cx + sx * (bw / 2 - 2);
      const oy = cy + sy * (bh / 2 - 2);
      ctx.strokeStyle = rgba(rim, 0.7);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(ox, oy, 7, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ox - sx * 5, oy - sy * 5, 3.4, 0, TAU);
      ctx.stroke();
    }
  }
  // 星饰
  ctx.fillStyle = rgba(hot, 0.7);
  for (let i = 0; i < 2; i++) {
    const sx = cx - bw / 2 + 22 + i * (bw - 44);
    const sy = cy - bh * 0.22;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI;
      const rr = k % 2 === 0 ? 4.4 : 1.4;
      const px = sx + Math.cos(a) * rr;
      const py = sy + Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  // 金字
  ctx.fillStyle = rgba(hot, 0.92);
  ctx.font = font(23);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.text || 'VIP 专享', cx, cy + 1);
  // 顶部小冠饰
  ctx.fillStyle = rgba(rim, 0.75);
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - bh / 2 - 7);
  ctx.lineTo(cx, cy - bh / 2 - 18);
  ctx.lineTo(cx + 10, cy - bh / 2 - 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 促销光柱：从画面上方扫下的金色灯柱 + 地面光池（每帧 ≤3 渐变） */
function promoBeams(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const gold = p.gold || '#ffdf9a';
  const beams = Math.max(1, Math.min(3, (p.beams ?? 3) | 0));
  const alpha = p.alpha ?? 0.075;
  const len = h * (p.len ?? 0.82);
  const defs = [
    { x: 0.09, a0: 0.36, sway: 0.1, ph: 0.4, width: 64 },
    { x: 0.91, a0: -0.36, sway: 0.1, ph: 2.3, width: 60 },
    { x: 0.5, a0: 0.02, sway: 0.14, ph: 4.1, width: 86 },
  ];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < beams; i++) {
    const d = defs[i % defs.length];
    const a = d.a0 + Math.sin(t * 0.22 + d.ph) * d.sway;
    ctx.save();
    ctx.translate(d.x * w, -h * 0.03);
    ctx.rotate(a);
    const g = ctx.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, rgba(gold, alpha * 1.2));
    g.addColorStop(0.5, rgba(gold, alpha * 0.5));
    g.addColorStop(1, rgba(gold, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-d.width * 0.12, 0);
    ctx.lineTo(d.width * 0.12, 0);
    ctx.lineTo(d.width * 0.58, len);
    ctx.lineTo(-d.width * 0.56, len);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // 地面光池
    const py = h * 0.82;
    const px = (d.x + Math.sin(a) * 0.4) * w;
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = rgba(gold, 0.5);
    ctx.beginPath();
    ctx.ellipse(px, py, d.width * 0.72, 7, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** 金尘：上扬/下坠的金色尘埃，边缘更密（每帧 0 渐变） */
function goldDust(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const count = p.count ?? 26;
  const seed = p.seed ?? 2211;
  const color = p.color || '#ffdf9a';
  const color2 = p.color2 || '#c89a3a';
  const alpha = p.alpha ?? 0.4;
  const spanH = h + 80;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const r1 = R(env, seed + i * 7);
    const r2 = R(env, seed + i * 11 + 1);
    const r3 = R(env, seed + i * 13 + 2);
    const r4 = R(env, seed + i * 17 + 3);
    const speed = 7 + r1 * 24;
    const dir = i % 5 === 0 ? 1 : -1; // 少数下坠（钱币/票屑），多数上扬
    const y = ((((r2 * spanH - dir * t * speed) % spanH) + spanH) % spanH) - 36;
    const x = r3 * (w + 60) - 30 + Math.sin(t * 0.4 + r1 * 6) * 16;
    const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * (0.8 + r1 * 1.4) + i * 1.7));
    const s = 0.6 + r4 * 1.5;
    // 中心区域不点灯（保持低对比）
    const inCenter = x > w * 0.28 && x < w * 0.72 && y > h * 0.18 && y < h * 0.8;
    ctx.globalAlpha = alpha * tw * (0.45 + r4 * 0.5) * (inCenter ? 0.35 : 1);
    ctx.fillStyle = i % 4 === 0 ? color : color2;
    if (i % 3 === 0) {
      ctx.fillRect(x - s, y, s * 2, 0.7);
      ctx.fillRect(x, y - s * 0.8, 0.7, s * 1.6);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, s * 0.7, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 票券风暴：两圈反向旋转的票券/价签，越靠边越亮（boss 层，0 渐变） */
function ticketStorm(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const cx = (p.x ?? 0.5) * w;
  const cy = (p.y ?? 0.4) * h;
  const rx = (p.rx ?? 0.46) * w;
  const ry = (p.ry ?? 0.33) * h;
  const count = p.count ?? 30;
  const seed = p.seed ?? 3301;
  const colors = p.colors || ['#e8d7ac', '#d8b26a', '#f0e4c4'];
  const red = p.red || '#8a2418';
  ctx.save();
  for (let i = 0; i < count; i++) {
    const r1 = R(env, seed + i * 7);
    const r2 = R(env, seed + i * 11 + 1);
    const r3 = R(env, seed + i * 13 + 2);
    const r4 = R(env, seed + i * 17 + 3);
    const ring = 0.3 + r1 * 0.7;
    const dir = i % 2 === 0 ? 1 : -1;
    const ang = r2 * TAU + t * (0.14 + r3 * 0.34) * dir;
    const x = cx + Math.cos(ang) * rx * ring;
    const y = cy + Math.sin(ang) * ry * ring + Math.sin(t * 0.5 + i) * 5;
    const size = 3 + r4 * 4.2;
    const edge = Math.min(1, Math.abs(Math.cos(ang)) * 0.8 + ring * 0.5);
    // 中心减淡
    const nx = Math.abs(x - cx) / (w * 0.5);
    const ny = Math.abs(y - cy) / (h * 0.5);
    const centerFade = Math.min(1, Math.max(0.25, Math.max(nx, ny) * 1.5));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + 1.1 + t * (0.25 + r1 * 0.5) * dir);
    ctx.globalAlpha = (p.alpha ?? 0.5) * edge * centerFade * (0.45 + r4 * 0.55);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(-size * 0.62, -size * 0.4, size * 1.24, size * 0.8);
    // 票面印线 / 撕角
    ctx.fillStyle = rgba('#5a3a18', 0.5);
    ctx.fillRect(-size * 0.42, -size * 0.12, size * 0.84, 0.6);
    ctx.fillRect(-size * 0.42, size * 0.1, size * 0.5, 0.5);
    if (i % 4 === 0) {
      ctx.fillStyle = rgba(red, 0.6);
      ctx.fillRect(size * 0.24, -size * 0.4, size * 0.34, size * 0.8);
    }
    ctx.restore();
  }
  ctx.restore();
}

/** 方尖碑齐亮：尖端灯脉冲（boss 层，0 渐变） */
function obeliskPulse(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const gold = p.gold || '#ffe8b0';
  const red = p.red || '#ff7a3d';
  const bh0 = p.bh ?? 116;
  const list = obeliskLayout(env, p);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const o of list) {
    const tipY = o.y - bh0 * o.s;
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.6 + o.depth * 3.4 + o.side * 1.3);
    const color = o.depth > 0.6 ? gold : red;
    // 灯芯
    ctx.globalAlpha = (p.alpha ?? 0.5) * pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(o.x, tipY, 1.4 + o.depth * 2.2, 0, TAU);
    ctx.fill();
    // 柔晕（叠两圈低透明圆，避免逐碑径向渐变）
    ctx.globalAlpha *= 0.22;
    ctx.beginPath();
    ctx.arc(o.x, tipY, 5 + o.depth * 8, 0, TAU);
    ctx.fill();
    ctx.globalAlpha *= 0.5;
    ctx.beginPath();
    ctx.arc(o.x, tipY, 9 + o.depth * 13, 0, TAU);
    ctx.fill();
    // 十字星芒
    ctx.globalAlpha = (p.alpha ?? 0.5) * pulse * 0.75;
    const L = 2.5 + o.depth * 5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(o.x - L, tipY);
    ctx.lineTo(o.x + L, tipY);
    ctx.moveTo(o.x, tipY - L);
    ctx.lineTo(o.x, tipY + L);
    ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * 场景
 * ------------------------------------------------------------------ */

const PLATE_MID = { scale: 1.07, swayX: 8, swayY: 10, wash: 'rgba(18,10,3,0.3)' };
const PLATE_BOSS = { scale: 1.08, swayX: 9, swayY: 11, wash: 'rgba(24,12,3,0.36)' };

/** mid / boss 共用的空中氛围层（月亮、星、云、远棚） */
function skyLayers(mode) {
  const boss = mode === 'boss';
  return [
    {
      atom: 'glow', params: {
        x: 0.5, y: boss ? 0.13 : 0.16, r: 0.66,
        color: boss ? '#ffcf66' : BASE.glow, alpha: boss ? 0.17 : 0.13,
      },
    },
    {
      atom: 'starField', params: {
        count: boss ? 34 : 28, maxY: 0.32, color: '#e8d7ac', alpha: 0.24, seed: boss ? 19 : 11,
      },
    },
    {
      atom: 'coinMoon', params: {
        x: 0.245, y: 0.138, r: boss ? 39 : 33,
        gold: boss ? '#ffcf66' : '#e3b64d', haloAlpha: boss ? 0.2 : 0.16,
      },
    },
    {
      atom: 'cloudBand', params: {
        y: 0.22, h: 0.09, color: '#b89a5a', alpha: boss ? 0.13 : 0.1, speed: boss ? 3 : 2.2,
      }, animate: true,
    },
  ];
}

/** 共享前景外层（棚顶 + 地砖 + 边角氛围） */
function baseForeground(boss) {
  return [
    { atom: 'stallCanopies', params: { red: '#5a140e', cream: '#d8c49a', rim: '#e3b64d', alpha: 0.92 } },
    {
      atom: 'bazaarFloor', params: {
        y: 0.64, seed: boss ? 1421 : 1401, ink: '#0b0702',
        gold: boss ? '#ffcf66' : '#e3b64d', cream: '#d8c49a', alpha: 1,
      },
    },
    {
      atom: 'glyph', params: {
        text: '¥', x: 0.055, y: 0.45, size: boss ? 26 : 22, color: '#e3b64d',
        alpha: boss ? 0.26 : 0.18, rotate: -0.16,
      },
    },
    {
      atom: 'glyph', params: {
        text: '買', x: 0.945, y: boss ? 0.42 : 0.5, size: 18, color: boss ? '#ff7a3d' : '#c8542f',
        alpha: boss ? 0.24 : 0.17, vertical: true,
      },
    },
    {
      atom: 'seal', params: {
        x: 0.075, y: 0.615, s: boss ? 17 : 14, color: '#a33622',
        text: '特', alpha: 0.42, rotate: -8,
      },
    },
    { atom: 'grassReeds', params: { side: 'both', color: '#140d04', alpha: 0.55, h: 0.15 } },
  ];
}

export const mid = sceneDefaults({
  mode: 'a4_mid',
  stage: 'a4',
  palette: { ...BASE },
  plate: { ...PLATE_MID },
  layers: [
    ...skyLayers('mid'),
    {
      atom: 'bazaarSkyline', params: {
        baseY: 0.448, seed: 801, count: 11,
        warm: '#e3b64d', red: '#8a2418', dark: '#120b03', cream: '#d8c49a', alpha: 1,
      },
    },
    {
      atom: 'obeliskAvenue', params: {
        rows: 4, vpY: 0.45, bh: 116, bw: 15,
        gold: '#5a4212', rim: '#e3b64d', hot: '#ffdf9a', dark: '#161005',
      },
    },
    {
      atom: 'salesArch', params: {
        x: 0.5, y: 0.6, gap: 0.148, pw: 25, ph: 148, s: 1,
        ads: ['特惠', 'VIP', '买!', '清仓', '限时'], sign: '特惠专场',
      },
    },
    { atom: 'hangingTags', params: {} },
    { atom: 'lantern', params: { x: 0.075, y: 0.29, s: 1.5, r: 8, color: '#e8a44e', glow: true } },
    { atom: 'lantern', params: { x: 0.925, y: 0.255, s: 1.4, r: 7.4, color: '#e8a44e', glow: true } },
    {
      atom: 'banner', params: {
        x: 0.043, y: 0.335, w: 18, h: 62, color: '#6a1410',
        text: '清仓', textColor: '#e8d7ac', alpha: 0.55, angle: 3,
      },
    },
    {
      atom: 'banner', params: {
        x: 0.957, y: 0.315, w: 18, h: 70, color: '#8a1f18',
        text: '特惠', textColor: '#e8d7ac', alpha: 0.55, angle: -4,
      },
    },
    { atom: 'stallCanopies', params: { red: '#5a140e', cream: '#d8c49a', rim: '#e3b64d', alpha: 0.92 } },
    {
      atom: 'bazaarFloor', params: {
        y: 0.64, seed: 1401, ink: '#0b0702', gold: '#e3b64d', cream: '#d8c49a', alpha: 1,
      },
    },
    {
      atom: 'glyph', params: {
        text: '¥', x: 0.055, y: 0.45, size: 22, color: '#e3b64d', alpha: 0.18, rotate: -0.16,
      },
    },
    {
      atom: 'glyph', params: {
        text: '買', x: 0.945, y: 0.5, size: 18, color: '#c8542f', alpha: 0.17, vertical: true,
      },
    },
    { atom: 'seal', params: { x: 0.075, y: 0.615, s: 14, color: '#a33622', text: '特', alpha: 0.42, rotate: -8 } },
    { atom: 'grassReeds', params: { side: 'both', color: '#140d04', alpha: 0.55, h: 0.15 } },
    {
      atom: 'fogBank', params: {
        y: 0.655, h: 0.17, color: BASE.fog, alpha: 0.14, speed: 5, phase: 0.7,
      }, animate: true,
    },
    { atom: 'promoBeams', params: { beams: 2, alpha: 0.055, len: 0.78 }, animate: true },
    { atom: 'goldDust', params: { count: 26, seed: 2211, alpha: 0.4 }, animate: true },
  ],
  particles: [
    { kind: 'coin', count: 20, colors: ['rgba(200,154,58,0.75)', 'rgba(232,190,96,0.7)'] },
    { kind: 'paper', count: 14, colors: ['rgba(216,196,154,0.6)', 'rgba(200,178,132,0.55)'] },
    { kind: 'spark', count: 8, colors: ['rgba(255,223,154,0.75)', 'rgba(216,178,90,0.7)'] },
    { kind: 'ember', count: 5, colors: ['rgba(200,120,60,0.65)'] },
  ],
  fx: { vignette: 0.46, bottomFade: 0.58, topFade: 0.32 },
});

export const boss = sceneDefaults({
  mode: 'a4_boss',
  stage: 'a4',
  palette: { ...BASE, ...(BASE.boss || {}) },
  plate: { ...PLATE_BOSS },
  layers: [
    ...skyLayers('boss'),
    { atom: 'vipPlaque', params: { x: 0.5, y: 0.105, w: 182, h: 52, text: 'VIP 专享' } },
    {
      atom: 'bazaarSkyline', params: {
        baseY: 0.45, seed: 821, count: 13,
        warm: '#ffcf66', red: '#9a2a1a', dark: '#160c03', cream: '#e8d7ac', alpha: 1,
      },
    },
    {
      atom: 'obeliskAvenue', params: {
        rows: 5, vpY: 0.45, bh: 120, bw: 15,
        gold: '#6a4e14', rim: '#ffcf66', hot: '#ffe8b0', dark: '#1a1206',
      },
    },
    {
      atom: 'salesArch', params: {
        x: 0.5, y: 0.605, gap: 0.148, pw: 27, ph: 152, s: 1,
        ads: ['VIP', '秒杀', '清仓', '买!', '特惠'], sign: 'VIP 专享通道',
      },
    },
    { atom: 'hangingTags', params: {
      tags: [
        { x: 0.06, y: 0.225, len: 96, w: 25, h: 30, text: '¥9999', sub: '限时' },
        { x: 0.155, y: 0.19, len: 76, w: 21, h: 25, text: 'VIP' },
        { x: 0.26, y: 0.285, len: 122, w: 22, h: 27, text: '秒杀' },
        { x: 0.74, y: 0.27, len: 108, w: 22, h: 27, text: '清仓' },
        { x: 0.845, y: 0.2, len: 78, w: 21, h: 25, text: '¥8888' },
        { x: 0.94, y: 0.3, len: 118, w: 25, h: 29, text: '买一送一', small: true },
      ],
    } },
    { atom: 'lantern', params: { x: 0.07, y: 0.275, s: 1.8, r: 9, color: '#ffb15c', glow: true } },
    { atom: 'lantern', params: { x: 0.93, y: 0.24, s: 1.7, r: 8.4, color: '#ffb15c', glow: true } },
    { atom: 'lantern', params: { x: 0.5, y: 0.185, s: 1.5, r: 7, color: '#ffcf66', glow: true } },
    {
      atom: 'banner', params: {
        x: 0.04, y: 0.31, w: 21, h: 74, color: '#8a1f18',
        text: 'VIP', textColor: '#ffe8b0', alpha: 0.62, angle: 3,
      },
    },
    {
      atom: 'banner', params: {
        x: 0.96, y: 0.3, w: 21, h: 80, color: '#7a1812',
        text: '破产', textColor: '#e8d7ac', alpha: 0.58, angle: -4,
      },
    },
    { atom: 'stallCanopies', params: { red: '#6a1810', cream: '#e8d7ac', rim: '#ffcf66', alpha: 0.94 } },
    { atom: 'receiptStream', params: { y: 0.925, alpha: 0.46 } },
    {
      atom: 'bazaarFloor', params: {
        y: 0.63, seed: 1421, ink: '#0b0702', gold: '#ffcf66', cream: '#e8d7ac', alpha: 1,
      },
    },
    { atom: 'glyph', params: { text: '¥', x: 0.05, y: 0.44, size: 28, color: '#ffcf66', alpha: 0.26, rotate: -0.16 } },
    { atom: 'glyph', params: { text: '買', x: 0.95, y: 0.47, size: 20, color: '#ff7a3d', alpha: 0.24, vertical: true } },
    { atom: 'seal', params: { x: 0.07, y: 0.6, s: 18, color: '#a33622', text: '特', alpha: 0.46, rotate: -8 } },
    { atom: 'grassReeds', params: { side: 'both', color: '#161005', alpha: 0.6, h: 0.16 } },
    {
      atom: 'fogBank', params: {
        y: 0.65, h: 0.18, color: BASE.boss.fog, alpha: 0.16, speed: 6, phase: 1.8,
      },
    },
    { atom: 'promoBeams', params: { beams: 3, alpha: 0.085, len: 0.9 }, animate: true },
    { atom: 'ticketStorm', params: { count: 30, seed: 3301, alpha: 0.5, rx: 0.46, ry: 0.33 }, animate: true },
    { atom: 'obeliskPulse', params: { alpha: 0.52, gold: '#ffe8b0', red: '#ff7a3d', bh: 120, rows: 5 }, animate: true },
  ],
  particles: [
    { kind: 'coin', count: 24, colors: ['rgba(232,190,96,0.8)', 'rgba(255,223,154,0.75)'] },
    { kind: 'paper', count: 22, colors: ['rgba(232,215,172,0.7)', 'rgba(216,196,154,0.65)'] },
    { kind: 'spark', count: 16, colors: ['rgba(255,223,154,0.8)', 'rgba(255,150,80,0.7)'] },
    { kind: 'ember', count: 8, colors: ['rgba(216,140,70,0.7)'] },
  ],
  fx: { vignette: 0.52, bottomFade: 0.62, topFade: 0.34, glitch: 0.02 },
});

export const atoms = {
  coinMoon,
  bazaarSkyline,
  obeliskAvenue,
  salesArch,
  hangingTags,
  bazaarFloor,
  stallCanopies,
  receiptStream,
  vipPlaque,
  promoBeams,
  goldDust,
  ticketStorm,
  obeliskPulse,
};
