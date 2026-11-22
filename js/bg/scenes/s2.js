/**
 * 第 2 面「编辑日常 · 审核冲突」场景。
 * 剧情：日志翻涌成潮，防火墙亮起冷光。
 * mid：冰封审核关卡——巨型六角防火墙格栅、悬浮审核之眼、冻结鸟居与冰晶柱、雪与冷雾。
 * boss：审核之眼睁开凝视——眼瞳张合、格栅裂缝发光、雷光脉冲、数据流加速。
 * 设计说明：docs/level-background-redesign.md §4。
 */
import { sceneDefaults } from '../schema.js';
import { STAGE_PALETTES } from './_stub.js';

const BASE = STAGE_PALETTES.s2;
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
 * 专属原子：六角防火墙 / 冻结鸟居 / 冰晶柱 / 数据流 / 审核之眼 / 雷光 / 裂缝
 * ------------------------------------------------------------------ */

/** 格栅裂缝路径（同一 seed 静态/发光层共用，保证位置一致） */
function crackPaths(env, seed, cx, cy, gw, gh) {
  const span = Math.min(gw, gh) * 1.15;
  const paths = [];
  for (let k = 0; k < 4; k++) {
    const a = (R(env, seed + k * 13) - 0.5) * Math.PI * 1.3;
    const len = span * (0.35 + R(env, seed + k * 17) * 0.4);
    let x = cx + (R(env, seed + k * 19) - 0.5) * gw * 0.4;
    let y = cy + (R(env, seed + k * 23) - 0.5) * gh * 0.3;
    const pts = [[x, y]];
    for (let i = 1; i <= 6; i++) {
      x += Math.cos(a) * (len / 6) + (R(env, seed + k * 29 + i * 7) - 0.5) * len * 0.2;
      y += Math.sin(a) * (len / 6) + (R(env, seed + k * 31 + i * 11) - 0.5) * len * 0.2;
      pts.push([x, y]);
    }
    paths.push(pts);
  }
  return paths;
}

/** 巨型六角防火墙格栅：双层网格 + 边缘总线 + 审核红节点；中心降对比 */
function hexFirewall(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const cx = (p.x ?? 0.5) * w;
  const cy = (p.y ?? 0.45) * h;
  const gw = (p.w ?? 0.9) * w;
  const gh = (p.h ?? 0.36) * h;
  const size = p.size ?? 24;
  const color = p.color || '#7cc7f0';
  const seal = p.seal || BASE.seal;
  const alpha = p.alpha ?? 0.2;
  const seed = p.seed ?? 601;
  const cracked = !!p.cracked;
  const x0 = cx - gw / 2;
  const y0 = cy - gh / 2;
  const hexH = Math.sqrt(3) * size;
  const cols = Math.ceil(gw / (size * 1.5)) + 1;
  const rows = Math.ceil(gh / hexH) + 2;

  ctx.save();
  // 背板：极暗的面板底色（只在中景压出一点体积）
  const bg = ctx.createLinearGradient(x0, y0, x0, y0 + gh);
  bg.addColorStop(0, rgba(color, alpha * 0.16));
  bg.addColorStop(0.5, rgba(color, alpha * 0.04));
  bg.addColorStop(1, rgba(color, alpha * 0.13));
  ctx.fillStyle = bg;
  ctx.fillRect(x0, y0, gw, gh);

  // 六角格
  ctx.lineWidth = p.lineWidth ?? 0.8;
  ctx.strokeStyle = color;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const sx = x0 + c * size * 1.5;
      const sy = y0 + r * hexH + (c % 2 ? hexH / 2 : 0);
      if (sx + size < x0 - 2 || sx - size > x0 + gw + 2) continue;
      if (sy + hexH * 0.6 < y0 - 2 || sy - hexH * 0.6 > y0 + gh + 2) continue;
      const cellSeed = seed + c * 37 + r * 53;
      // 中心 60% 降对比：越靠中心越淡
      const distX = Math.abs(sx - cx) / (gw * 0.5);
      const distY = Math.abs(sy - cy) / (gh * 0.5);
      const edge = clamp01(Math.max(distX, distY));
      const att = 0.42 + 0.58 * edge;
      const broken = cracked && R(env, cellSeed + 5) > 0.955;
      if (broken) continue;
      ctx.globalAlpha = alpha * att * (0.55 + R(env, cellSeed) * 0.7);
      // 部分格填充成数据面板
      if (R(env, cellSeed + 1) > 0.86) {
        ctx.fillStyle = rgba(color, 0.05);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          const px = sx + Math.cos(a) * size * 0.92;
          const py = sy + Math.sin(a) * size * 0.92;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const px = sx + Math.cos(a) * size;
        const py = sy + Math.sin(a) * size;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  // 边缘总线（左右竖向框 + 节点）
  ctx.globalAlpha = alpha * 1.4;
  ctx.fillStyle = color;
  ctx.fillRect(x0 - 7, y0 - 6, 2, gh + 12);
  ctx.fillRect(x0 + gw + 5, y0 - 6, 2, gh + 12);
  ctx.fillRect(x0 - 7, y0 - 6, gw + 14, 1.6);
  ctx.fillRect(x0 - 7, y0 + gh + 4, gw + 14, 1.6);
  for (let i = 0; i <= 8; i++) {
    const ny = y0 + (i / 8) * gh;
    ctx.globalAlpha = alpha * (0.55 + R(env, seed + 801 + i * 7) * 0.6);
    ctx.fillRect(x0 - 9, ny - 1.5, 6, 3);
    ctx.fillRect(x0 + gw + 3, ny - 1.5, 6, 3);
  }

  // 审核红节点（四角 + 两侧）
  const nodes = [
    [x0 + 2, y0 + 2], [x0 + gw - 2, y0 + 2],
    [x0 + 2, y0 + gh - 2], [x0 + gw - 2, y0 + gh - 2],
    [x0 - 10, cy], [x0 + gw + 10, cy],
  ];
  for (let i = 0; i < nodes.length; i++) {
    const [nx, ny] = nodes[i];
    ctx.globalAlpha = alpha * 1.7;
    ctx.fillStyle = seal;
    ctx.fillRect(nx - 2.5, ny - 2.5, 5, 5);
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillRect(nx - 5, ny - 5, 10, 10);
  }

  // 破口：断线崩坏的格栅缺口（boss）
  if (cracked) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = rgba('#02080e', 0.9);
    ctx.lineWidth = 3.4;
    for (const pts of crackPaths(env, seed + 7, cx, cy, gw, gh)) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** 格栅裂缝发光（boss，动画脉冲） */
function glowCracks(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const cx = (p.x ?? 0.5) * w;
  const cy = (p.y ?? 0.45) * h;
  const gw = (p.w ?? 0.94) * w;
  const gh = (p.h ?? 0.4) * h;
  const t = env?.t || 0;
  const seed = p.seed ?? 601;
  const color = p.color || '#bfe6ff';
  const alpha = p.alpha ?? 0.4;
  const pulse = 0.55 + 0.45 * Math.sin(t * 1.6 + (p.phase ?? 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const paths = crackPaths(env, seed + 7, cx, cy, gw, gh);
  for (let k = 0; k < paths.length; k++) {
    const pts = paths[k];
    const local = pulse * (0.6 + 0.4 * R(env, seed + 900 + k * 17));
    // 外层光晕
    ctx.globalAlpha = alpha * local * 0.35;
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    strokePts(ctx, pts);
    // 芯线
    ctx.globalAlpha = alpha * local;
    ctx.strokeStyle = '#eafcff';
    ctx.lineWidth = 1.4;
    strokePts(ctx, pts);
    // 分叉
    ctx.globalAlpha = alpha * local * 0.6;
    ctx.lineWidth = 1;
    for (let i = 1; i + 1 < pts.length; i += 2) {
      ctx.beginPath();
      ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.lineTo(
        pts[i][0] + (R(env, seed + 950 + k * 13 + i * 7) - 0.5) * 34,
        pts[i][1] + (R(env, seed + 970 + k * 19 + i * 11) - 0.5) * 26,
      );
      ctx.stroke();
    }
  }
  ctx.restore();
}

function strokePts(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

/** 冻结鸟居：冰壳包裹的鸟居，檐口垂冰锥、积雪、霜裂 */
function frozenTorii(ctx, p = {}, env) {
  const w = W(env);
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.64) * H(env);
  const s = (p.s ?? 0.72) * Math.min(w, H(env)) / 600;
  const ice = p.color || '#1d5478';
  const dark = p.dark || '#04101c';
  const frost = p.frost || '#e8f8ff';
  const alpha = p.alpha ?? 0.78;
  const pw = 11 * s;
  const gap = 60 * s;
  const ph = 118 * s;
  const over = gap * 1.27;
  const seed = p.seed ?? 733;

  ctx.save();
  ctx.globalAlpha = alpha;
  if (p.glow) {
    const g = ctx.createRadialGradient(x, y - ph * 0.72, 0, x, y - ph * 0.72, over * 2.3);
    g.addColorStop(0, rgba(p.glowColor || '#7cc7f0', 0.17));
    g.addColorStop(0.6, rgba(p.glowColor || '#7cc7f0', 0.05));
    g.addColorStop(1, rgba(p.glowColor || '#7cc7f0', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - over * 2.5, y - ph * 2.5, over * 5, ph * 3.2);
  }
  // 冰基座
  ctx.fillStyle = rgba('#0a2233', 0.92);
  ctx.beginPath();
  ctx.ellipse(x, y - 2 * s, gap * 1.9, 8 * s, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba(frost, 0.16);
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(x + (R(env, seed + 900 + i * 7) - 0.5) * gap * 2.6, y + 1 * s, 10 * s, 2.4 * s, 0, 0, TAU);
    ctx.fill();
  }
  // 柱：冰壳 + 暗芯
  for (const side of [-1, 1]) {
    const px = x + side * gap;
    ctx.fillStyle = ice;
    ctx.fillRect(px - pw / 2, y - ph, pw, ph);
    ctx.fillStyle = rgba(dark, 0.66);
    ctx.fillRect(px - pw * 0.1, y - ph, pw * 0.42, ph);
    ctx.fillStyle = rgba(frost, 0.26);
    ctx.fillRect(px - pw * 0.46, y - ph, pw * 0.2, ph);
    // 柱面霜裂
    ctx.strokeStyle = rgba(frost, 0.38);
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(px - pw * 0.32, y - ph * (0.18 + i * 0.24));
      ctx.lineTo(px + pw * 0.26, y - ph * (0.24 + i * 0.24));
      ctx.stroke();
    }
  }
  // 贯
  ctx.fillStyle = ice;
  ctx.fillRect(x - gap - pw * 1.35, y - ph * 0.77, (gap + pw * 1.35) * 2, 9 * s);
  ctx.fillStyle = rgba(frost, 0.3);
  ctx.fillRect(x - gap - pw * 1.35, y - ph * 0.77 - 1.8 * s, (gap + pw * 1.35) * 2, 1.8 * s);
  // 岛木
  ctx.fillStyle = ice;
  ctx.fillRect(x - gap * 1.12 - pw, y - ph * 0.965, (gap * 1.12 + pw) * 2, 7 * s);
  // 笠木（两端上翘）
  const kasagiY = y - ph - 3 * s;
  const kasagi = (dir) => {
    ctx.save();
    ctx.translate(x, kasagiY);
    ctx.fillStyle = ice;
    ctx.beginPath();
    const inner = dir * 7 * s;
    const outer = dir * over;
    ctx.moveTo(outer, -10 * s);
    ctx.quadraticCurveTo(dir * over * 0.52, -19 * s, inner, -7 * s);
    ctx.lineTo(inner, 2 * s);
    ctx.quadraticCurveTo(dir * over * 0.5, -2 * s, outer, 3.2 * s);
    ctx.closePath();
    ctx.fill();
    // 积雪
    ctx.fillStyle = rgba(frost, 0.42);
    ctx.beginPath();
    ctx.moveTo(outer * 0.96, -10.6 * s);
    ctx.quadraticCurveTo(dir * over * 0.5, -18.4 * s, inner, -6.6 * s);
    ctx.lineTo(inner, -2.4 * s);
    ctx.quadraticCurveTo(dir * over * 0.5, -14.2 * s, outer * 0.94, -6.6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  kasagi(-1);
  kasagi(1);
  // 冰锥（笠木与贯下缘）
  ctx.fillStyle = rgba(frost, 0.4);
  for (let i = 0; i < 11; i++) {
    const ix = x + (i / 10 - 0.5) * over * 1.7;
    const len = (3 + R(env, seed + i * 7) * 15) * s;
    const iw = (1.2 + R(env, seed + i * 11) * 2) * s;
    const iy = i % 4 === 0 ? y - ph * 0.77 + 9 * s : (i % 3 === 0 ? y - ph * 0.965 + 7 * s : kasagiY + 2 * s);
    ctx.beginPath();
    ctx.moveTo(ix - iw, iy);
    ctx.lineTo(ix + iw, iy);
    ctx.lineTo(ix + (R(env, seed + i * 13) - 0.5) * 2, iy + len);
    ctx.closePath();
    ctx.fill();
  }
  // 注连绳（冰封，几乎僵直）
  ctx.strokeStyle = rgba(frost, 0.46);
  ctx.lineWidth = 1.7 * s;
  ctx.beginPath();
  ctx.moveTo(x - gap * 0.9, y - ph * 0.79);
  ctx.quadraticCurveTo(x, y - ph * 0.7, x + gap * 0.9, y - ph * 0.79);
  ctx.stroke();
  // 霜点
  ctx.fillStyle = rgba(frost, 0.5);
  for (let i = 0; i < 16; i++) {
    ctx.globalAlpha = alpha * (0.2 + R(env, seed + 200 + i * 3) * 0.5);
    ctx.fillRect(
      x + (R(env, seed + 230 + i * 5) - 0.5) * over * 2.1,
      y - ph * (0.08 + R(env, seed + 260 + i * 7) * 0.98),
      1.2, 1.2,
    );
  }
  ctx.restore();
}

/** 冰晶柱群：只落在左右边缘，保持中心低对比 */
function icePillars(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const color = p.color || '#7cc7f0';
  const frost = p.frost || '#d7ecff';
  const alpha = p.alpha ?? 0.6;
  const scale = p.scale ?? 1;
  const sides = p.sides || ['left', 'right'];

  ctx.save();
  for (let si = 0; si < sides.length; si++) {
    const side = sides[si];
    for (let i = 0; i < 5; i++) {
      const seed = (p.seed ?? 760) + si * 131 + i * 17;
      const bx = (side === 'left'
        ? 0.01 + R(env, seed) * 0.13
        : 0.86 + R(env, seed) * 0.13) * w;
      const big = i < 3;
      const bh = h * (big ? 0.14 + R(env, seed + 3) * 0.14 : 0.05 + R(env, seed + 3) * 0.07) * scale;
      const bw = (big ? 13 : 8) + R(env, seed + 5) * (big ? 14 : 8);
      const tilt = (R(env, seed + 7) - 0.5) * 0.14;
      ctx.save();
      ctx.translate(bx, h * 0.995);
      ctx.rotate(tilt);
      ctx.globalAlpha = alpha * (0.45 + R(env, seed + 9) * 0.55);
      const g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
      g.addColorStop(0, 'rgba(5,14,24,0.96)');
      g.addColorStop(0.55, rgba(color, 0.28));
      g.addColorStop(1, 'rgba(6,18,30,0.96)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-bw / 2, 0);
      ctx.lineTo(-bw * 0.28, -bh * 0.7);
      ctx.lineTo((R(env, seed + 11) - 0.5) * bw * 0.4, -bh);
      ctx.lineTo(bw * 0.3, -bh * 0.62);
      ctx.lineTo(bw / 2, 0);
      ctx.closePath();
      ctx.fill();
      // 棱面高光
      ctx.strokeStyle = rgba(frost, 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-bw * 0.28, -bh * 0.7);
      ctx.lineTo(bw * 0.05, -bh * 0.2);
      ctx.lineTo(bw * 0.3, -bh * 0.62);
      ctx.stroke();
      // 雪帽
      ctx.fillStyle = rgba(frost, 0.5);
      ctx.beginPath();
      ctx.moveTo(-bw * 0.2, -bh * 0.93);
      ctx.lineTo(bw * 0.15, -bh * 1.02);
      ctx.lineTo(bw * 0.02, -bh * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // 底部雪堆
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = rgba(frost, 0.22);
    ctx.beginPath();
    ctx.ellipse(side === 'left' ? w * 0.08 : w * 0.92, h * 0.985, w * 0.14, h * 0.035, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** 冻结地面：冰坡、雪斑、地面裂纹与两侧雪堆（静态，中心低对比） */
function frozenGround(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const color = p.color || '#7cc7f0';
  const frost = p.frost || '#d7ecff';
  const alpha = p.alpha ?? 0.5;
  const seed = p.seed ?? 880;
  const gy = h * 0.7;

  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, gy, 0, h);
  g.addColorStop(0, 'rgba(8,22,36,0)');
  g.addColorStop(0.28, 'rgba(9,26,42,0.66)');
  g.addColorStop(1, 'rgba(4,12,22,0.95)');
  ctx.fillStyle = g;
  ctx.fillRect(0, gy, w, h - gy);
  // 地面裂纹
  ctx.strokeStyle = rgba(color, 0.16);
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 7; i++) {
    let x = R(env, seed + i * 13) * w;
    let y = gy + (h - gy) * (0.15 + R(env, seed + 20 + i * 17) * 0.6);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      x += (R(env, seed + 40 + i * 23 + k * 7) - 0.5) * 40;
      y += (h - gy) * 0.1;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // 雪斑（边缘更密，中心更淡）
  for (let i = 0; i < 14; i++) {
    const sx = R(env, seed + 100 + i * 7) * w;
    const edge = Math.min(sx, w - sx) / (w * 0.5);
    const a = (0.1 - edge * 0.05) * (0.6 + R(env, seed + 120 + i * 11) * 0.4);
    ctx.globalAlpha = clamp01(alpha * (0.5 + a * 4));
    ctx.fillStyle = rgba(frost, 0.12);
    ctx.beginPath();
    ctx.ellipse(
      sx, gy + (h - gy) * (0.2 + R(env, seed + 140 + i * 13) * 0.7),
      10 + R(env, seed + 160 + i * 17) * 20, 3 + R(env, seed + 180 + i * 19) * 4,
      0, 0, TAU,
    );
    ctx.fill();
  }
  // 两侧雪堆
  for (const side of [-1, 1]) {
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = rgba(frost, 0.15);
    ctx.beginPath();
    ctx.ellipse(side < 0 ? w * 0.1 : w * 0.9, h * 0.93, w * 0.18, h * 0.055, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.4;
    ctx.beginPath();
    ctx.ellipse(side < 0 ? w * 0.02 : w * 0.98, h * 0.88, w * 0.11, h * 0.07, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** 边缘数据流：竖向 0/1 条带下落（无渐变） */
function dataStreams(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const count = p.count ?? 12;
  const seed = p.seed ?? 501;
  const color = p.color || '#7cc7f0';
  const alpha = p.alpha ?? 0.18;
  const speedMul = p.speed ?? 1;

  ctx.save();
  ctx.textAlign = 'left';
  for (let i = 0; i < count; i++) {
    const left = i % 2 === 0;
    const x = (left ? R(env, seed + i * 11) * 0.17 : 0.83 + R(env, seed + i * 11) * 0.17) * w;
    const speed = (36 + R(env, seed + i * 13) * 90) * speedMul;
    const y = (((R(env, seed + i * 17) * (h + 140) + t * speed) % (h + 140)) + (h + 140)) % (h + 140) - 70;
    const segs = 3 + ((R(env, seed + i * 19) * 4) | 0);
    for (let k = 0; k < segs; k++) {
      ctx.globalAlpha = alpha * (0.25 + R(env, seed + i * 23 + k * 7) * 0.75);
      ctx.fillStyle = color;
      ctx.fillRect(x, y - k * 9 - 4, 1.1 + R(env, seed + i * 29) * 1.3, 3 + R(env, seed + i * 31 + k * 3) * 7);
    }
    if (i % 4 === 0) {
      ctx.globalAlpha = alpha * 1.2;
      ctx.fillStyle = color;
      ctx.font = font(7, 'normal');
      ctx.fillText(i % 2 ? '1' : '0', x + 4.5, y);
    }
  }
  // 顶部横向数据指针
  ctx.globalAlpha = alpha * 0.8;
  ctx.fillStyle = color;
  for (let i = 0; i < 7; i++) {
    const y = h * (0.1 + i * 0.115);
    const len = 8 + R(env, seed + 70 + i * 5) * 24;
    ctx.fillRect(0, y, len, 1);
    ctx.fillRect(w - len, y + 18, len, 1);
  }
  ctx.restore();
}

/** 悬浮审核之眼：六角环 + 扫描弧 + 张合眼瞳（每帧 1 个渐变） */
function auditEye(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.185) * h;
  const r = (p.r ?? 26) * (p.scale ?? 1);
  const t = env?.t || 0;
  const openBase = p.openBase ?? 0.55;
  const openAmp = p.openAmp ?? 0.12;
  const open = clamp01(openBase + openAmp * (0.5 + 0.5 * Math.sin(t * (p.speed ?? 0.8) + (p.phase ?? 0))));
  const color = p.color || '#7cc7f0';
  const iris = p.iris || '#d7ecff';
  const lid = p.lid || '#040b14';

  ctx.save();
  // 外柔光
  const g = ctx.createRadialGradient(x, y, r * 0.25, x, y, r * 2.9);
  g.addColorStop(0, rgba(color, 0.15));
  g.addColorStop(0.55, rgba(color, 0.04));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 2.9, y - r * 2.9, r * 5.8, r * 5.8);

  ctx.translate(x, y);
  // 六角环
  ctx.rotate(t * 0.05);
  ctx.strokeStyle = rgba(color, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const px = Math.cos(a) * r * 1.2;
    const py = Math.sin(a) * r * 1.2;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = color;
    ctx.fillRect(Math.cos(a) * r * 1.2 - 1.8, Math.sin(a) * r * 1.2 - 1.8, 3.6, 3.6);
  }
  ctx.globalAlpha = 1;
  // 扫描弧
  const sa = t * 1.1;
  ctx.strokeStyle = rgba(iris, 0.75);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.2, sa, sa + 0.85);
  ctx.stroke();
  // 眼形（杏仁）
  const ry = r * 0.5 * open;
  ctx.fillStyle = rgba(iris, 0.82);
  ctx.beginPath();
  ctx.moveTo(-r * 0.82, 0);
  ctx.quadraticCurveTo(0, -ry * 2, r * 0.82, 0);
  ctx.quadraticCurveTo(0, ry * 2, -r * 0.82, 0);
  ctx.closePath();
  ctx.fill();
  // 虹膜
  ctx.fillStyle = rgba(color, 0.9);
  ctx.beginPath();
  ctx.arc(Math.sin(t * 0.45 + (p.phase ?? 0)) * r * 0.09, 0, r * (0.16 + 0.14 * open), 0, TAU);
  ctx.fill();
  // 竖瞳
  ctx.fillStyle = rgba(lid, 0.96);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.055, r * (0.12 + 0.2 * open), 0, 0, TAU);
  ctx.fill();
  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(-r * 0.12, -r * 0.07, Math.max(1, r * 0.05), 0, TAU);
  ctx.fill();
  // 眼睑描边（上下）
  ctx.strokeStyle = rgba(lid, 0.92);
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.beginPath();
  ctx.moveTo(-r * 0.86, 0);
  ctx.quadraticCurveTo(0, -ry * 2, r * 0.86, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.86, 0);
  ctx.quadraticCurveTo(0, ry * 2, r * 0.86, 0);
  ctx.stroke();
  // 角饰线
  ctx.strokeStyle = rgba(color, 0.45);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-r * 0.86, 0);
  ctx.lineTo(-r * 1.28, -r * 0.22);
  ctx.moveTo(r * 0.86, 0);
  ctx.lineTo(r * 1.28, r * 0.22);
  ctx.stroke();
  ctx.restore();
}

/** 雷光脉冲（boss）：每 2s 一次短促落雷 + 冷光泛白 */
function lightningPulse(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const period = p.period ?? 2;
  const phase = p.phase ?? 0;
  const raw = t / period + phase;
  const idx = Math.floor(raw);
  const cycle = raw - idx;
  const flash = Math.max(0, 1 - cycle / 0.17);
  if (flash <= 0.01) return;
  const seed = (p.seed ?? 911) + idx * 131;
  const color = p.color || '#bfe6ff';

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let b = 0; b < 2; b++) {
    const sx = (b ? 0.8 : 0.24) * w + (R(env, seed + b * 7) - 0.5) * 50;
    let x = sx;
    let y = -8;
    const steps = 7 + ((R(env, seed + b * 11) * 4) | 0);
    const pts = [[x, y]];
    for (let i = 1; i <= steps; i++) {
      y = (i / steps) * h * (0.28 + R(env, seed + b * 13) * 0.18);
      x += (R(env, seed + b * 17 + i * 7) - 0.5) * w * 0.16;
      pts.push([x, y]);
    }
    // 外晕
    ctx.globalAlpha = flash * 0.13;
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    strokePts(ctx, pts);
    // 主枝
    ctx.globalAlpha = flash * 0.72;
    ctx.strokeStyle = '#eafcff';
    ctx.lineWidth = 1.5;
    strokePts(ctx, pts);
    // 分叉
    ctx.globalAlpha = flash * 0.45;
    ctx.lineWidth = 0.9;
    for (let i = 2; i + 1 < pts.length; i += 2) {
      ctx.beginPath();
      ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.lineTo(
        pts[i][0] + (R(env, seed + 300 + b * 13 + i * 5) - 0.5) * 42,
        pts[i][1] + (R(env, seed + 330 + b * 17 + i * 7) - 0.2) * 46,
      );
      ctx.stroke();
    }
  }
  ctx.globalAlpha = flash * 0.05;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * 场景
 * ------------------------------------------------------------------ */

export const mid = sceneDefaults({
  mode: 's2_mid',
  stage: 's2',
  palette: { ...BASE },
  plate: { scale: 1.06, swayX: 7, swayY: 10, wash: 'rgba(3,10,20,0.24)' },
  layers: [
    { atom: 'glow', params: { x: 0.5, y: 0.18, r: 0.6, color: BASE.glow, alpha: 0.12 } },
    {
      atom: 'moon', params: {
        x: 0.78, y: 0.13, r: 31, color: '#dcefff', halo: '#7cc7f0', haloAlpha: 0.16, alpha: 0.84,
      },
    },
    {
      atom: 'starField', params: {
        count: 34, maxY: 0.32, color: '#d7ecff', alpha: 0.3, seed: 17,
      },
    },
    {
      atom: 'mountainRange', params: {
        baseY: 0.45, h: 0.078, color: '#04101c', alpha: 0.88, layers: 2, peaks: 5, seed: 61,
      },
    },
    {
      atom: 'hexFirewall', params: {
        x: 0.5, y: 0.45, w: 0.9, h: 0.36, size: 24,
        color: '#7cc7f0', seal: BASE.seal, alpha: 0.2, seed: 601,
      },
    },
    {
      atom: 'frozenGround', params: {
          color: '#7cc7f0', frost: '#d7ecff', alpha: 0.5, seed: 880,
        },
      },
      {
        atom: 'frozenTorii', params: {
          x: 0.5, y: 0.655, s: 0.72, color: '#1d5478', dark: '#04101c', frost: '#e8f8ff',
          alpha: 0.78, glow: true, glowColor: '#7cc7f0', seed: 733,
        },
      },
      {
        atom: 'icePillars', params: {
          color: '#7cc7f0', frost: '#d7ecff', alpha: 0.62, scale: 1, seed: 760,
        },
      },
    {
      atom: 'glyph', params: {
        text: '審核', x: 0.92, y: 0.27, size: 13, color: BASE.accent, alpha: 0.22, vertical: true,
      },
    },
    {
      atom: 'glyph', params: {
        text: '#', x: 0.08, y: 0.2, size: 13, color: BASE.accent, alpha: 0.15, rotate: -0.25,
      },
    },
    {
      atom: 'glyph', params: {
        text: 'REVIEW', x: 0.1, y: 0.31, size: 9, color: BASE.accent2, alpha: 0.16, rotate: -1.2,
      },
    },
    {
      atom: 'seal', params: {
        x: 0.88, y: 0.5, s: 16, color: BASE.seal, text: '審', alpha: 0.52, rotate: 8,
      },
    },
    {
      atom: 'frameBranches', params: { side: 'left', color: '#0c2130', alpha: 0.5, s: 0.95 },
    },
    {
      atom: 'frameBranches', params: { side: 'right', color: '#0a1c2a', alpha: 0.42, s: 0.8 },
    },
    {
      atom: 'fogBank', params: {
        y: 0.5, h: 0.1, color: BASE.fog, alpha: 0.1, speed: 3, phase: 0.6,
      },
    },
    {
      atom: 'grassReeds', params: { color: '#0d2436', alpha: 0.85, h: 0.22 },
    },
    {
      atom: 'cloudBand', params: {
        y: 0.24, h: 0.08, color: '#8fb6cc', alpha: 0.1, speed: 2,
      }, animate: true,
    },
    {
      atom: 'dataStreams', params: {
        count: 14, seed: 501, color: '#7cc7f0', alpha: 0.24, speed: 1,
      }, animate: true,
    },
    {
      atom: 'auditEye', params: {
        x: 0.5, y: 0.185, r: 26, color: '#7cc7f0', iris: '#d7ecff',
        openBase: 0.55, openAmp: 0.12, speed: 0.8, phase: 0.6,
      }, animate: true,
    },
    {
      atom: 'fogBank', params: {
        y: 0.62, h: 0.18, color: BASE.fog, alpha: 0.18, speed: 6, phase: 0.8,
      }, animate: true,
    },
  ],
  particles: [
    { kind: 'snow', count: 24, colors: ['rgba(215,236,255,0.95)', 'rgba(159,216,255,0.8)'] },
    { kind: 'spark', count: 8, colors: ['rgba(124,199,240,0.9)', 'rgba(215,236,255,0.85)'] },
    { kind: 'binary', count: 10, colors: ['rgba(124,199,240,0.75)', 'rgba(159,216,255,0.7)'] },
  ],
  fx: { vignette: 0.46, bottomFade: 0.58, topFade: 0.32, scanlines: 0.16 },
});

export const boss = sceneDefaults({
  mode: 's2_boss',
  stage: 's2',
  palette: { ...BASE, ...(BASE.boss || {}) },
  plate: { scale: 1.08, swayX: 8, swayY: 11, wash: 'rgba(4,14,26,0.26)' },
  layers: [
    { atom: 'glow', params: { x: 0.5, y: 0.18, r: 0.7, color: '#9fd8ff', alpha: 0.16 } },
    {
      atom: 'moon', params: {
        x: 0.78, y: 0.13, r: 33, color: '#eefaff', halo: '#7cc7f0', haloAlpha: 0.2, alpha: 0.9,
      },
    },
    {
      atom: 'starField', params: {
        count: 40, maxY: 0.34, color: '#d7ecff', alpha: 0.3, seed: 23,
      },
    },
    {
      atom: 'mountainRange', params: {
        baseY: 0.45, h: 0.082, color: '#030c16', alpha: 0.92, layers: 2, peaks: 6, seed: 67,
      },
    },
    {
      atom: 'hexFirewall', params: {
        x: 0.5, y: 0.45, w: 0.94, h: 0.4, size: 26,
        color: '#9fd8ff', seal: BASE.seal, alpha: 0.29, seed: 601, cracked: true,
      },
    },
    {
      atom: 'glowCracks', params: {
        x: 0.5, y: 0.45, w: 0.94, h: 0.4, color: '#bfe6ff', alpha: 0.34, seed: 601,
      }, animate: true,
    },
    {
      atom: 'frozenGround', params: {
          color: '#9fd8ff', frost: '#eefaff', alpha: 0.58, seed: 890,
        },
      },
      {
        atom: 'frozenTorii', params: {
          x: 0.5, y: 0.66, s: 0.76, color: '#235f88', dark: '#04101c', frost: '#eefaff',
          alpha: 0.82, glow: true, glowColor: '#9fd8ff', seed: 741,
        },
      },
      {
        atom: 'icePillars', params: {
          color: '#9fd8ff', frost: '#eefaff', alpha: 0.72, scale: 1.2, seed: 780,
        },
      },
    {
      atom: 'banner', params: {
        x: 0.12, y: 0.13, w: 20, h: 74, color: '#143349', text: '審核', textColor: '#d7ecff', alpha: 0.62, angle: 4,
      },
    },
    {
      atom: 'banner', params: {
        x: 0.88, y: 0.16, w: 18, h: 66, color: '#3a1620', text: '異議', textColor: '#ff9a9a', alpha: 0.55, angle: -5,
      },
    },
    {
      atom: 'seal', params: {
        x: 0.12, y: 0.44, s: 18, color: '#a83044', text: '審', alpha: 0.5, rotate: -6,
      },
    },
    {
      atom: 'glyph', params: {
        text: '審核中', x: 0.94, y: 0.3, size: 11, color: '#9fd8ff', alpha: 0.2, vertical: true,
      },
    },
    {
      atom: 'frameBranches', params: { side: 'left', color: '#10283a', alpha: 0.55, s: 1 },
    },
    {
      atom: 'frameBranches', params: { side: 'right', color: '#0d2234', alpha: 0.45, s: 0.85 },
    },
    {
      atom: 'fogBank', params: {
        y: 0.5, h: 0.1, color: BASE.boss.fog, alpha: 0.11, speed: 3.4, phase: 1.9,
      },
    },
    {
      atom: 'grassReeds', params: { color: '#0f2a3c', alpha: 0.85, h: 0.23 },
    },
    {
      atom: 'fogBank', params: {
        y: 0.63, h: 0.19, color: BASE.boss.fog, alpha: 0.16, speed: 7, phase: 2.1,
      },
    },
    {
      atom: 'cloudBand', params: {
        y: 0.23, h: 0.09, color: '#a8c8d8', alpha: 0.12, speed: 2.6,
      },
    },
    {
      atom: 'dataStreams', params: {
        count: 16, seed: 521, color: '#9fd8ff', alpha: 0.27, speed: 1.6,
      }, animate: true,
    },
    {
      atom: 'auditEye', params: {
        x: 0.5, y: 0.168, r: 34, color: '#9fd8ff', iris: '#eefaff',
        openBase: 0.3, openAmp: 0.62, speed: 0.45, phase: 0.2, scale: 1,
      }, animate: true,
    },
    {
      atom: 'lightningPulse', params: {
        color: '#bfe6ff', period: 1.55, phase: 0.15, seed: 911,
      }, animate: true,
    },
  ],
  particles: [
    { kind: 'snow', count: 26, colors: ['rgba(238,250,255,0.95)', 'rgba(159,216,255,0.85)'] },
    { kind: 'binary', count: 12, colors: ['rgba(159,216,255,0.8)', 'rgba(215,236,255,0.7)'] },
    { kind: 'spark', count: 10, colors: ['rgba(191,230,255,0.95)', 'rgba(124,199,240,0.9)'] },
  ],
  fx: { vignette: 0.5, bottomFade: 0.62, topFade: 0.36, scanlines: 0.24, glitch: 0.1 },
});

export const atoms = {
  hexFirewall,
  glowCracks,
  frozenTorii,
  icePillars,
  frozenGround,
  dataStreams,
  auditEye,
  lightningPulse,
};
