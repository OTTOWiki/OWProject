/**
 * 第 3 面「分歧的十字路口」场景。
 * 剧情：数据在此分叉；打破主防火墙方能择路。
 * mid：左铬蓝 / 右琥珀的分色山道——左右双鸟居（左冷右暖）、中央开裂的防火墙石门、
 *      分叉踏石、A/B 旗幡；左侧雪与落叶、右侧火花双向飘动。
 * boss：石门全开，门洞双色光柱升起，双色气流在门前对撞。
 * 设计说明：docs/level-background-redesign.md §4。
 */
import { sceneDefaults } from '../schema.js';
import { STAGE_PALETTES } from './_stub.js';

const BASE = STAGE_PALETTES.s3;
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
 * 专属原子：左右分色场 / 分色山脊 / 裂门 / 双鸟居 / A·B 旗幡 / 分叉踏石 / 双向飘浮
 * ------------------------------------------------------------------ */

/** 左铬蓝 / 右琥珀的左右分色场 + 中央墨楔（分界身份层） */
function splitField(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const cool = p.cool || '#8aa0b5';
  const warm = p.warm || '#d97a2e';
  const ink = p.ink || '#06070a';
  const alpha = p.alpha ?? 1;

  ctx.save();
  ctx.globalAlpha = alpha;
  // 左冷场
  const lg = ctx.createLinearGradient(0, h * 0.12, 0, h);
  lg.addColorStop(0, rgba(cool, 0.02));
  lg.addColorStop(0.58, rgba(cool, 0.1));
  lg.addColorStop(1, rgba(cool, 0.02));
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, w * 0.54, h);
  // 右暖场
  const rg = ctx.createLinearGradient(0, h * 0.12, 0, h);
  rg.addColorStop(0, rgba(warm, 0.03));
  rg.addColorStop(0.56, rgba(warm, 0.12));
  rg.addColorStop(1, rgba(warm, 0.03));
  ctx.fillStyle = rg;
  ctx.fillRect(w * 0.46, 0, w * 0.54, h);
  // 左右远空微光（强化分色身份）
  const lgl = ctx.createRadialGradient(w * 0.16, h * 0.42, 0, w * 0.16, h * 0.42, w * 0.44);
  lgl.addColorStop(0, rgba(cool, 0.1));
  lgl.addColorStop(1, rgba(cool, 0));
  ctx.fillStyle = lgl;
  ctx.fillRect(0, 0, w * 0.58, h);
  const rgl = ctx.createRadialGradient(w * 0.84, h * 0.42, 0, w * 0.84, h * 0.42, w * 0.44);
  rgl.addColorStop(0, rgba(warm, 0.1));
  rgl.addColorStop(1, rgba(warm, 0));
  ctx.fillStyle = rgl;
  ctx.fillRect(w * 0.42, 0, w * 0.58, h);
  // 中央墨楔：上窄下宽，压住画面中心（保持低对比而非黑色立柱）
  const wg = ctx.createLinearGradient(0, 0, 0, h);
  wg.addColorStop(0, rgba(ink, 0.6));
  wg.addColorStop(0.42, rgba(ink, 0.3));
  wg.addColorStop(1, rgba(ink, 0.78));
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.moveTo(w * 0.474, 0);
  ctx.lineTo(w * 0.526, 0);
  ctx.lineTo(w * 0.61, h);
  ctx.lineTo(w * 0.39, h);
  ctx.closePath();
  ctx.fill();
  // 中央竖向柔暗带
  const cg = ctx.createLinearGradient(w * 0.36, 0, w * 0.64, 0);
  cg.addColorStop(0, rgba(ink, 0));
  cg.addColorStop(0.5, rgba(ink, 0.4));
  cg.addColorStop(1, rgba(ink, 0));
  ctx.fillStyle = cg;
  ctx.fillRect(w * 0.36, 0, w * 0.28, h);
  // 分界发丝线（左冷 / 右暖，各偏向自己一侧）
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(cool, 0.24);
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 0);
  ctx.lineTo(w * 0.44, h);
  ctx.stroke();
  ctx.strokeStyle = rgba(warm, 0.24);
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 0);
  ctx.lineTo(w * 0.56, h);
  ctx.stroke();
  // 地平线细光
  ctx.strokeStyle = rgba(cool, 0.16);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.47);
  ctx.lineTo(w * 0.48, h * 0.47);
  ctx.stroke();
  ctx.strokeStyle = rgba(warm, 0.16);
  ctx.beginPath();
  ctx.moveTo(w * 0.52, h * 0.47);
  ctx.lineTo(w, h * 0.47);
  ctx.stroke();
  ctx.restore();
}

/** 左右分色的远山脊：左冷蓝、右暖褐（各画一半，中央留低反差谷口） */
function splitRidges(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const baseY = (p.baseY ?? 0.455) * h;
  const seed = p.seed ?? 83;

  const ridge = (x0, x1, color, seedOff, peakMul) => {
    const pts = 6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x0 - 16, baseY + 46);
    for (let i = 0; i <= pts; i++) {
      const x = x0 - 16 + ((x1 - x0 + 32) * i) / pts;
      const peak = 0.22 + R(env, seed + seedOff + i * 7) * 0.78;
      ctx.lineTo(x, baseY - (p.h ?? 0.1) * h * peak * peakMul);
    }
    ctx.lineTo(x1 + 16, baseY + 46);
    ctx.closePath();
    ctx.fill();
  };

  ctx.save();
  ridge(0, w * 0.55, p.cool || '#0a121c', 0, 1);
  ridge(w * 0.45, w, p.warm || '#1a0e08', 60, 0.85);
  // 山脚薄雾（左右两色半透明，低对比）
  ctx.fillStyle = rgba(p.coolMist || '#8aa0b5', 0.07);
  ctx.fillRect(0, baseY - 12, w * 0.5, 30);
  ctx.fillStyle = rgba(p.warmMist || '#d97a2e', 0.07);
  ctx.fillRect(w * 0.5, baseY - 12, w * 0.5, 30);
  // 边缘冷松 / 暖灯（地标只在两侧）
  ctx.strokeStyle = rgba(p.cool || '#8aa0b5', 0.22);
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 5; i++) {
    const x = w * (0.04 + i * 0.032);
    const top = baseY - h * (0.05 + R(env, seed + 200 + i * 5) * 0.05);
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, top);
    ctx.moveTo(x - 6, top + 10);
    ctx.lineTo(x + 6, top + 10);
    ctx.stroke();
  }
  ctx.fillStyle = rgba(p.warm || '#d97a2e', 0.4);
  for (let i = 0; i < 5; i++) {
    const x = w * (0.9 + R(env, seed + 300 + i * 7) * 0.08);
    const y = baseY - h * (0.02 + R(env, seed + 340 + i * 5) * 0.07);
    ctx.beginPath();
    ctx.arc(x, y, 1.1 + R(env, seed + 380 + i * 3) * 1.1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** 中央裂开的防火墙石门：左冷右暖的石墙、符文格、竖向裂缝、断裂门楣 */
function riftGate(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const cx = (p.x ?? 0.5) * w;
  const baseY = (p.y ?? 0.63) * h;
  const gateH = (p.h ?? 0.3) * h;
  const halfW = (p.w ?? 0.165) * w;
  const open = clamp01(p.open ?? 0.15);
  const split = open * halfW * 0.24;
  const gap = 3 + open * 12;
  const cool = p.coldStone || '#101a24';
  const warmc = p.warmStone || '#1e1410';
  const rimCool = p.rimCool || '#8aa0b5';
  const rimWarm = p.rimWarm || '#d97a2e';
  const glow = p.glow || '#e8c06a';
  const seed = p.seed ?? 911;
  const topY = baseY - gateH;

  ctx.save();
  // 门洞底部台阶
  ctx.fillStyle = rgba('#07080b', 0.92);
  ctx.fillRect(cx - halfW - 16, baseY - 6, (halfW + 16) * 2, 12);
  ctx.fillStyle = rgba(rimCool, 0.16);
  ctx.fillRect(cx - halfW - 16, baseY - 7, halfW + 16, 1.4);
  ctx.fillStyle = rgba(rimWarm, 0.16);
  ctx.fillRect(cx, baseY - 7, halfW + 16, 1.4);

  // 门洞内双色底光（透过裂缝/门洞可见）
  const innerG = ctx.createLinearGradient(0, topY, 0, baseY);
  innerG.addColorStop(0, rgba(rimCool, 0.09 + open * 0.07));
  innerG.addColorStop(0.55, rgba(glow, 0.05 + open * 0.05));
  innerG.addColorStop(1, rgba(rimWarm, 0.1 + open * 0.07));
  ctx.fillStyle = innerG;
  ctx.fillRect(cx - gap / 2 - split - 2, topY, gap + split * 2 + 4, gateH);

  const drawHalf = (dir) => {
    const outer = cx + dir * (halfW + split);
    const inner = cx + dir * (gap / 2 + split);
    const sideSeed = seed + (dir > 0 ? 120 : 0);
    ctx.save();
    // 墙体
    ctx.beginPath();
    ctx.moveTo(outer, baseY);
    ctx.lineTo(outer, topY);
    ctx.lineTo(inner, topY);
    const steps = 7;
    for (let i = 1; i <= steps; i++) {
      const y = topY + (gateH * i) / steps;
      const jag = (R(env, sideSeed + i * 7) - 0.5) * gap * 0.8;
      ctx.lineTo(inner + jag, y);
    }
    ctx.lineTo(inner, baseY);
    ctx.closePath();
    const sg = ctx.createLinearGradient(cx, topY, cx, baseY);
    sg.addColorStop(0, rgba(dir < 0 ? cool : warmc, 0.98));
    sg.addColorStop(1, rgba(dir < 0 ? '#070c12' : '#0e0805', 0.98));
    ctx.fillStyle = sg;
    ctx.fill();
    // 受光内缘
    ctx.strokeStyle = rgba(dir < 0 ? rimCool : rimWarm, 0.72 + open * 0.18);
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(inner, topY);
    for (let i = 1; i <= steps; i++) {
      const y = topY + (gateH * i) / steps;
      const jag = (R(env, sideSeed + i * 7) - 0.5) * gap * 0.8;
      ctx.lineTo(inner + jag, y);
    }
    ctx.stroke();
    // 符文格（只画在门墙两侧，中心低透明）
    const rim = dir < 0 ? rimCool : rimWarm;
    const panelW = halfW * 0.62;
    const px0 = inner + dir * (gap * 0.4 + halfW * 0.24);
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 3; c++) {
        const gx = px0 + dir * c * 12;
        const gy = topY + gateH * (0.16 + r * 0.12);
        if (Math.abs(gx - cx) > halfW * 0.94) continue;
        ctx.globalAlpha = 0.1 + R(env, sideSeed + r * 17 + c * 23) * 0.16;
        ctx.fillStyle = rim;
        ctx.fillRect(gx - 3.5, gy - 2.2, 7, 4.4);
        if (R(env, sideSeed + r * 11 + c * 31) > 0.72) {
          ctx.globalAlpha *= 1.5;
          ctx.fillRect(gx - 1, gy - 1, 2, 2);
        }
        ctx.globalAlpha = 1;
      }
    }
    // 横向石缝
    ctx.strokeStyle = rgba('#04060a', 0.7);
    ctx.lineWidth = 1;
    for (let r = 1; r < 5; r++) {
      const yy = topY + (gateH * r) / 5;
      ctx.beginPath();
      ctx.moveTo(Math.min(outer, inner), yy);
      ctx.lineTo(Math.max(outer, inner), yy + (R(env, sideSeed + r * 5) - 0.5) * 4);
      ctx.stroke();
    }
    // 顶部受光
    ctx.fillStyle = rgba(rim, 0.2);
    ctx.fillRect(Math.min(outer, inner), topY, Math.abs(outer - inner), 1.4);
    ctx.restore();
  };
  drawHalf(-1);
  drawHalf(1);
  // 外侧门柱 + 柱头（加强建筑感）
  for (const dir of [-1, 1]) {
    const fx = cx + dir * (halfW + split) - (dir < 0 ? 4 : -4) - 4;
    ctx.fillStyle = 'rgba(7,9,14,0.96)';
    ctx.fillRect(fx, topY - 18, 8, gateH + 18);
    ctx.fillStyle = rgba(dir < 0 ? rimCool : rimWarm, 0.32);
    ctx.fillRect(dir < 0 ? fx + 7 : fx, topY - 18, 1.2, gateH + 18);
    ctx.fillStyle = 'rgba(10,13,18,0.98)';
    ctx.fillRect(fx - 3, topY - 22, 14, 6);
    ctx.fillStyle = rgba(dir < 0 ? rimCool : rimWarm, 0.28);
    ctx.fillRect(fx - 3, topY - 23, 14, 1.4);
  }

  // 门楣（关闭时整块；张开后断为两截）
  const lintelY = topY - 15;
  const lintel = (x0, len, dir) => {
    ctx.fillStyle = rgba(dir < 0 ? '#0c141c' : '#191008', 0.98);
    ctx.fillRect(x0, lintelY, len, 16);
    ctx.fillStyle = rgba(dir < 0 ? rimCool : rimWarm, 0.3);
    ctx.fillRect(x0, lintelY, len, 1.6);
    ctx.fillStyle = rgba('#04060a', 0.7);
    ctx.fillRect(x0, lintelY + 14.4, len, 1.6);
  };
  if (open > 0.55) {
    lintel(cx - halfW - 16, halfW - gap / 2 - split * 0.2, -1);
    lintel(cx + gap / 2 + split * 0.2, halfW - gap / 2 + 16, 1);
  } else {
    lintel(cx - halfW - 16, (halfW + 16) * 2, -1);
  }
  // 门楣上的封条印
  ctx.save();
  ctx.translate(cx + 6, lintelY + 8);
  ctx.rotate(0.04);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = p.seal || '#c8542f';
  ctx.fillRect(-6, -6, 12, 12);
  ctx.fillStyle = 'rgba(255,238,214,0.85)';
  ctx.font = font(7);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open > 0.55 ? '破' : '封', 0, 0.5);
  ctx.restore();

  // 中缝光：关闭时一条金裂；打开后为宽光带
  if (open <= 0.55) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    let x = cx;
    ctx.strokeStyle = rgba(glow, 0.3);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    for (let i = 1; i <= 8; i++) {
      const y = topY + (gateH * i) / 8;
      x = cx + (R(env, seed + 600 + i * 7) - 0.5) * 7;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,206,0.75)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** 单座鸟居剪影（双色面用） */
function toriiSilhouette(ctx, env, x, y, s, color, dark, alpha, tilt, glowColor, seed) {
  const pw = 8 * s;
  const gap = 58 * s;
  const ph = 100 * s;
  const over = gap + pw * 2.8;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(tilt);
  if (glowColor) {
    const g = ctx.createRadialGradient(0, -ph * 0.72, 0, 0, -ph * 0.72, over * 2.1);
    g.addColorStop(0, rgba(glowColor, 0.12));
    g.addColorStop(1, rgba(glowColor, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-over * 2.3, -ph * 2.3, over * 4.6, ph * 3);
  }
  for (const side of [-1, 1]) {
    ctx.fillStyle = color;
    ctx.fillRect(side * gap - pw / 2, -ph, pw, ph);
    ctx.fillStyle = rgba(dark, 0.6);
    ctx.fillRect(side * gap - pw / 2, -ph, pw * 0.34, ph);
    ctx.fillStyle = rgba(color, 0.8);
    ctx.fillRect(side * gap + pw * 0.08, -ph * 0.94, pw * 0.18, ph * 0.88);
    // 苔/雪痕
    ctx.fillStyle = rgba(glowColor || '#ffffff', 0.12);
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(
        side * gap - pw / 2 + R(env, seed + i * 7 + (side > 0 ? 40 : 0)) * pw,
        -ph * (0.15 + R(env, seed + i * 11) * 0.7),
        pw * 0.3, 1.3,
      );
    }
  }
  ctx.fillStyle = color;
  ctx.fillRect(-gap - pw * 1.5, -ph * 0.8, (gap + pw * 1.5) * 2, 7 * s);
  ctx.beginPath();
  ctx.moveTo(-over, -ph - 3 * s);
  ctx.quadraticCurveTo(-over * 0.5, -ph - 14 * s, 0, -ph - 9 * s);
  ctx.quadraticCurveTo(over * 0.5, -ph - 14 * s, over, -ph - 3 * s);
  ctx.lineTo(over, -ph + 4 * s);
  ctx.quadraticCurveTo(over * 0.5, -ph - 4 * s, 0, -ph + 1 * s);
  ctx.quadraticCurveTo(-over * 0.5, -ph - 4 * s, -over, -ph + 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 左右双鸟居：左冷右暖，各自朝岔路外倾 */
function dualTorii(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const s = (p.s ?? 0.5) * Math.min(w, h) / 600;
  toriiSilhouette(ctx, env, w * 0.205, h * 0.575, s, p.cool || '#3f5a72', '#0a1018', p.alpha ?? 0.82, -0.022, p.coolGlow || '#8aa0b5', 1401);
  toriiSilhouette(ctx, env, w * 0.795, h * 0.588, s, p.warm || '#7a4520', '#1a0d06', p.alpha ?? 0.82, 0.026, p.warmGlow || '#d97a2e', 1501);
}

/** A / B 双旗：左冷右暖，跨在岔路两端上方 */
function abBanners(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const s = p.s ?? 1;
  const drawFlag = (x, y, letter, cloth, trim, inkColor, tilt) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    // 旗杆
    ctx.strokeStyle = rgba(trim, 0.55);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -18 * s);
    ctx.lineTo(0, 46 * s);
    ctx.stroke();
    ctx.fillStyle = trim;
    ctx.beginPath();
    ctx.arc(0, -19 * s, 2.2 * s, 0, TAU);
    ctx.fill();
    // 布面（燕尾）
    ctx.fillStyle = cloth;
    ctx.beginPath();
    ctx.moveTo(0, -7 * s);
    ctx.lineTo(27 * s, -7 * s);
    ctx.lineTo(27 * s, 34 * s);
    ctx.lineTo(14 * s, 28 * s);
    ctx.lineTo(0, 34 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(trim, 0.7);
    ctx.lineWidth = 1;
    ctx.stroke();
    // 字
    ctx.fillStyle = inkColor;
    ctx.font = font(19 * s);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 13 * s, 13 * s);
    // 旗骨
    ctx.strokeStyle = rgba(trim, 0.4);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(3 * s, -2 * s);
    ctx.lineTo(24 * s, -2 * s);
    ctx.stroke();
    ctx.restore();
  };
  drawFlag(w * 0.325, h * 0.1, 'A', p.aCloth || '#1a2836', p.cool || '#8aa0b5', p.aInk || '#cfe6ff', -0.05);
  drawFlag(w * 0.655, h * 0.105, 'B', p.bCloth || '#3a1c0c', p.warm || '#d97a2e', p.bInk || '#ffcf8a', 0.06);
}

/** 分叉踏石：从底部中央分左右两串石径（左冷右暖） */
function forkedStones(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const seed = p.seed ?? 1301;
  const alpha = p.alpha ?? 0.5;

  ctx.save();
  const path = (dir, stone, rim, seedOff) => {
    const steps = 7;
    for (let i = 0; i < steps; i++) {
      const f = i / (steps - 1);
      const x = w * 0.5 + dir * f * w * 0.365 + (R(env, seed + seedOff + i * 7) - 0.5) * 16;
      const y = h * 0.95 - f * h * 0.185 + (R(env, seed + seedOff + i * 11) - 0.5) * 9;
      const rx = (17 - f * 7) * (0.75 + R(env, seed + seedOff + i * 13) * 0.5);
      const ry = rx * 0.32;
      ctx.globalAlpha = alpha * (0.45 + 0.55 * (1 - f * 0.55));
      ctx.fillStyle = stone;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, dir * 0.14, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = rgba(rim, 0.55);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, dir * 0.14, 0, TAU);
      ctx.stroke();
    }
  };
  path(-1, p.coolStone || '#1c2836', p.coolRim || '#8aa0b5', 0);
  path(1, p.warmStone || '#2a180e', p.warmRim || '#d97a2e', 200);
  // 中央基座
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#0b0a0c';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.965, 32, 10, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** 左侧冷飘浮：雪与落叶（只落在左半场，避免压中心） */
function leftDrift(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const count = p.count ?? 16;
  const seed = p.seed ?? 1201;
  const alpha = p.alpha ?? 0.5;

  ctx.save();
  for (let i = 0; i < count; i++) {
    const snowLike = R(env, seed + i * 7) > 0.45;
    const x0 = R(env, seed + i * 11) * w * 0.52;
    const speed = 8 + R(env, seed + i * 13) * 26;
    const y = ((((R(env, seed + i * 17) * (h + 80) + t * speed) % (h + 80)) + (h + 80)) % (h + 80)) - 40;
    const x = x0 + Math.sin(t * 0.5 + i * 1.3) * 13 + t * (R(env, seed + i * 19) - 0.5) * 8;
    const size = snowLike ? 1.2 + R(env, seed + i * 23) * 2.2 : 2.4 + R(env, seed + i * 23) * 3.2;
    ctx.globalAlpha = alpha * (0.35 + R(env, seed + i * 29) * 0.65);
    if (snowLike) {
      ctx.fillStyle = p.snow || '#dce9f5';
      ctx.beginPath();
      ctx.arc(x, y, size * 0.5, 0, TAU);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * (0.5 + R(env, seed + i * 31)) + i);
      ctx.fillStyle = p.leaf || '#8a9a6a';
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.9, size * 0.36, 0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

/** 右侧暖飘浮：火星沿右半场上升（与左侧雪/叶形成双向） */
function rightDrift(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const count = p.count ?? 16;
  const seed = p.seed ?? 1601;
  const alpha = p.alpha ?? 0.55;

  ctx.save();
  for (let i = 0; i < count; i++) {
    const x0 = w * 0.52 + R(env, seed + i * 11) * w * 0.46;
    const speed = 10 + R(env, seed + i * 13) * 34;
    const y = (((h + 50 - ((R(env, seed + i * 17) * (h + 90) + t * speed) % (h + 90))) % (h + 90)) + (h + 90)) % (h + 90) - 40;
    const x = x0 + Math.sin(t * 0.7 + i * 1.9) * 9;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (1.2 + R(env, seed + i * 19) * 1.6) + i));
    const size = 1.1 + R(env, seed + i * 23) * 2;
    ctx.globalAlpha = alpha * tw;
    ctx.fillStyle = i % 4 === 0 ? (p.spark || '#ffd07a') : (p.ember || '#ff9b45');
    ctx.beginPath();
    ctx.arc(x, y, size * 0.6, 0, TAU);
    ctx.fill();
    // 上升拖尾
    ctx.globalAlpha *= 0.5;
    ctx.strokeStyle = p.ember || '#ff9b45';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y + size);
    ctx.lineTo(x - 1.6, y + size * 3.4);
    ctx.stroke();
  }
  ctx.restore();
}

/** boss：门洞双色光柱（左冷右暖，每帧 3 个渐变） */
function dualLight(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const cx = w * 0.5;
  const gy = h * 0.53;
  const pulse = 0.62 + 0.38 * Math.sin(t * 1.15 + (p.phase ?? 0));
  const cool = p.cool || '#a8c0d8';
  const warm = p.warm || '#ff9b45';

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // 门洞中心双色辉光
  const g = ctx.createRadialGradient(cx, gy, 0, cx, gy, w * 0.4);
  g.addColorStop(0, rgba('#eaf4ff', (p.alpha ?? 0.16) * pulse));
  g.addColorStop(0.4, rgba(cool, (p.alpha ?? 0.16) * 0.45 * pulse));
  g.addColorStop(0.75, rgba(warm, (p.alpha ?? 0.16) * 0.3 * pulse));
  g.addColorStop(1, rgba(warm, 0));
  ctx.fillStyle = g;
  ctx.fillRect(cx - w * 0.42, gy - w * 0.42, w * 0.84, w * 0.84);

  const beam = (dir, color, alpha) => {
    ctx.save();
    ctx.translate(cx, gy);
    ctx.rotate(dir * 0.34);
    const lg = ctx.createLinearGradient(0, 0, 0, -h * 0.58);
    lg.addColorStop(0, rgba(color, alpha * pulse));
    lg.addColorStop(0.55, rgba(color, alpha * 0.4 * pulse));
    lg.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(5, 0);
    ctx.lineTo(w * 0.19, -h * 0.58);
    ctx.lineTo(-w * 0.19, -h * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  beam(-1, cool, p.beamAlpha ?? 0.16);
  beam(1, warm, p.beamAlpha ?? 0.16);

  // 窄芯光
  ctx.globalAlpha = 0.45 * pulse;
  ctx.strokeStyle = '#fff2d8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx, gy);
  ctx.lineTo(cx - w * 0.21, gy - h * 0.52);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, gy);
  ctx.lineTo(cx + w * 0.21, gy - h * 0.52);
  ctx.stroke();
  ctx.restore();
}

/** boss：双色气流在门前对撞（无渐变） */
function airClash(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const cx = w * 0.5;
  const cy = h * 0.47;
  const alpha = p.alpha ?? 0.22;
  const cool = p.cool || '#a8c0d8';
  const warm = p.warm || '#ff9b45';
  const seed = p.seed ?? 1701;

  ctx.save();
  // 冷气流（右行）
  for (let i = 0; i < 5; i++) {
    const yy = cy - h * 0.14 + i * h * 0.065;
    const amp = 8 + i * 3;
    ctx.globalAlpha = alpha * (0.5 + (i % 2) * 0.4);
    ctx.strokeStyle = cool;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.06, yy + Math.sin(t * 0.8 + i) * amp);
    ctx.bezierCurveTo(
      w * 0.28, yy + amp * 2,
      w * 0.42, yy - amp,
      cx - 4, yy + Math.sin(t * 1.6 + i) * 3,
    );
    ctx.stroke();
  }
  // 暖气流（左行）
  for (let i = 0; i < 5; i++) {
    const yy = cy - h * 0.12 + i * h * 0.062;
    const amp = 8 + i * 3;
    ctx.globalAlpha = alpha * (0.5 + (i % 2) * 0.4);
    ctx.strokeStyle = warm;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.94, yy + Math.sin(t * 0.9 + i * 1.3) * amp);
    ctx.bezierCurveTo(
      w * 0.72, yy + amp * 2,
      w * 0.58, yy - amp,
      cx + 4, yy + Math.sin(t * 1.7 + i) * 3,
    );
    ctx.stroke();
  }
  // 对撞点火花
  for (let i = 0; i < 9; i++) {
    const a = R(env, seed + i * 3) * TAU;
    const rr = 4 + R(env, seed + i * 5) * 20;
    const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 2.2 + i));
    ctx.globalAlpha = alpha * tw * 1.6;
    ctx.fillStyle = i % 2 ? cool : warm;
    ctx.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.5, 1.5, 1.5);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * 场景
 * ------------------------------------------------------------------ */

function commonGlyphs() {
  return [
    {
      atom: 'glyph', params: {
        text: '分歧', x: 0.5, y: 0.085, size: 12, color: BASE.glow, alpha: 0.2, vertical: true,
      },
    },
    {
      atom: 'glyph', params: {
        text: 'A', x: 0.09, y: 0.2, size: 20, color: BASE.accent, alpha: 0.22, rotate: -0.1,
      },
    },
    {
      atom: 'glyph', params: {
        text: 'B', x: 0.91, y: 0.24, size: 20, color: BASE.accent2, alpha: 0.22, rotate: 0.1,
      },
    },
    {
      atom: 'seal', params: {
        x: 0.075, y: 0.6, s: 15, color: BASE.seal, text: '決', alpha: 0.46, rotate: -7,
      },
    },
  ];
}

const splitGrass = (color) => ({
  atom: 'grassReeds', params: { side: 'both', color, alpha: 0.7, h: 0.2 },
});

export const mid = sceneDefaults({
  mode: 's3_mid',
  stage: 's3',
  palette: { ...BASE },
  plate: { scale: 1.06, swayX: 7, swayY: 10, wash: 'rgba(5,6,10,0.26)' },
  layers: [
    { atom: 'splitField', params: { cool: '#8aa0b5', warm: '#d97a2e', ink: '#06070a', alpha: 1 } },
    {
      atom: 'starField', params: {
        count: 26, maxY: 0.3, color: '#cfe0f0', alpha: 0.24, seed: 13,
      },
    },
    {
      atom: 'splitRidges', params: {
        baseY: 0.455, h: 0.1, cool: '#0a121c', warm: '#1a0e08', seed: 83,
      },
    },
    {
      atom: 'riftGate', params: {
        x: 0.5, y: 0.635, h: 0.3, w: 0.17, open: 0.22,
        coldStone: '#16242f', warmStone: '#2a1a0e',
        rimCool: '#8aa0b5', rimWarm: '#e08838', glow: '#e8c06a',
        seal: BASE.seal, seed: 911,
      },
    },
    {
      atom: 'dualTorii', params: {
        s: 0.6, cool: '#5a7f9e', warm: '#9a5a28',
        coolGlow: '#8aa0b5', warmGlow: '#d97a2e', alpha: 0.9,
      },
    },
    {
      atom: 'abBanners', params: {
        s: 1, aCloth: '#1a2836', bCloth: '#3a1c0c',
        cool: '#8aa0b5', warm: '#d97a2e', aInk: '#cfe6ff', bInk: '#ffcf8a',
      },
    },
    ...commonGlyphs(),
    {
      atom: 'forkedStones', params: {
        coolStone: '#1c2836', warmStone: '#2a180e',
        coolRim: '#8aa0b5', warmRim: '#d97a2e', alpha: 0.64, seed: 1301,
      },
    },
    {
      atom: 'frameBranches', params: { side: 'left', color: '#121a24', alpha: 0.5, s: 0.9 },
    },
    {
      atom: 'frameBranches', params: { side: 'right', color: '#241408', alpha: 0.46, s: 0.82 },
    },
    {
      atom: 'lantern', params: {
        x: 0.1, y: 0.605, s: 1.1, r: 8, color: '#bfe0ff', string: false, glow: true, alpha: 0.7,
      },
    },
    {
      atom: 'lantern', params: {
        x: 0.9, y: 0.625, s: 1.1, r: 8, color: '#ffc070', string: false, glow: true, alpha: 0.75,
      },
    },
    { atom: 'grassReeds', params: { side: 'left', color: '#0a1218', alpha: 0.8, h: 0.24 } },
    { atom: 'grassReeds', params: { side: 'right', color: '#1a0e08', alpha: 0.8, h: 0.24 } },
    {
      atom: 'fogBank', params: {
        y: 0.5, h: 0.1, color: BASE.fog, alpha: 0.1, speed: 3, phase: 0.9,
      },
    },
    {
      atom: 'fogBank', params: {
        y: 0.69, h: 0.2, color: BASE.fog, alpha: 0.2, speed: 5, phase: 0.4,
      }, animate: true,
    },
    {
      atom: 'leftDrift', params: {
        count: 16, seed: 1201, alpha: 0.5, snow: '#dce9f5', leaf: '#8a9a6a',
      }, animate: true,
    },
    {
      atom: 'rightDrift', params: {
        count: 16, seed: 1601, alpha: 0.55, ember: '#ff9b45', spark: '#ffd07a',
      }, animate: true,
    },
  ],
  particles: [
    { kind: 'snow', count: 14, colors: ['rgba(220,233,245,0.9)', 'rgba(160,180,200,0.8)'] },
    { kind: 'leaf', count: 8, colors: ['rgba(120,140,90,0.8)', 'rgba(90,110,80,0.7)'] },
    { kind: 'ember', count: 10, colors: ['rgba(255,155,69,0.9)', 'rgba(255,208,122,0.85)'] },
    { kind: 'spark', count: 8, colors: ['rgba(255,190,110,0.9)', 'rgba(200,220,240,0.85)'] },
  ],
  fx: { vignette: 0.46, bottomFade: 0.58, topFade: 0.32 },
});

export const boss = sceneDefaults({
  mode: 's3_boss',
  stage: 's3',
  palette: { ...BASE, ...(BASE.boss || {}) },
  plate: { scale: 1.08, swayX: 8, swayY: 11, wash: 'rgba(10,6,10,0.28)' },
  layers: [
    { atom: 'splitField', params: { cool: '#a8c0d8', warm: '#ff9b45', ink: '#070408', alpha: 1 } },
    {
      atom: 'starField', params: {
        count: 32, maxY: 0.32, color: '#e0ecf8', alpha: 0.26, seed: 19,
      },
    },
    {
      atom: 'splitRidges', params: {
        baseY: 0.45, h: 0.105, cool: '#0a121c', warm: '#1e0e06', seed: 89,
      },
    },
    {
      atom: 'riftGate', params: {
        x: 0.5, y: 0.64, h: 0.31, w: 0.175, open: 0.9,
        coldStone: '#1a2c3c', warmStone: '#33200e',
        rimCool: '#a8c0d8', rimWarm: '#ff9b45', glow: '#ffcf8a',
        seal: '#b03c2a', seed: 921,
      },
    },
    {
      atom: 'dualTorii', params: {
        s: 0.64, cool: '#6f9fc4', warm: '#c47a38',
        coolGlow: '#a8c0d8', warmGlow: '#ff9b45', alpha: 0.95,
      },
    },
    {
      atom: 'abBanners', params: {
        s: 1.15, aCloth: '#20364a', bCloth: '#4a2410',
        cool: '#a8c0d8', warm: '#ff9b45', aInk: '#e8f4ff', bInk: '#ffe0a8',
      },
    },
    ...commonGlyphs(),
    {
      atom: 'forkedStones', params: {
        coolStone: '#24364a', warmStone: '#3a2210',
        coolRim: '#a8c0d8', warmRim: '#ff9b45', alpha: 0.72, seed: 1311,
      },
    },
    {
      atom: 'frameBranches', params: { side: 'left', color: '#16222e', alpha: 0.55, s: 0.95 },
    },
    {
      atom: 'frameBranches', params: { side: 'right', color: '#2a1808', alpha: 0.5, s: 0.86 },
    },
    {
      atom: 'lantern', params: {
        x: 0.1, y: 0.6, s: 1.2, r: 8, color: '#cfe6ff', string: false, glow: true, alpha: 0.8,
      },
    },
    {
      atom: 'lantern', params: {
        x: 0.9, y: 0.62, s: 1.2, r: 8, color: '#ffd07a', string: false, glow: true, alpha: 0.85,
      },
    },
    { atom: 'grassReeds', params: { side: 'left', color: '#0c141c', alpha: 0.82, h: 0.25 } },
    { atom: 'grassReeds', params: { side: 'right', color: '#241208', alpha: 0.82, h: 0.25 } },
    {
      atom: 'fogBank', params: {
        y: 0.5, h: 0.1, color: BASE.boss.fog, alpha: 0.11, speed: 3.4, phase: 2.2,
      },
    },
    {
      atom: 'fogBank', params: {
        y: 0.7, h: 0.2, color: BASE.boss.fog, alpha: 0.18, speed: 6, phase: 2,
      },
    },
    {
      atom: 'dualLight', params: {
        cool: '#a8c0d8', warm: '#ff9b45', alpha: 0.11, beamAlpha: 0.1, phase: 0.3,
      }, animate: true,
    },
    {
      atom: 'airClash', params: {
        cool: '#a8c0d8', warm: '#ff9b45', alpha: 0.14, seed: 1701,
      }, animate: true,
    },
    {
      atom: 'leftDrift', params: {
        count: 14, seed: 1211, alpha: 0.45, snow: '#e0ecf8', leaf: '#8a9a6a',
      }, animate: true,
    },
    {
      atom: 'rightDrift', params: {
        count: 18, seed: 1611, alpha: 0.6, ember: '#ff9b45', spark: '#ffe0a8',
      }, animate: true,
    },
  ],
  particles: [
    { kind: 'snow', count: 12, colors: ['rgba(232,244,255,0.9)', 'rgba(170,190,210,0.8)'] },
    { kind: 'leaf', count: 6, colors: ['rgba(130,150,100,0.8)', 'rgba(100,120,90,0.7)'] },
    { kind: 'ember', count: 14, colors: ['rgba(255,155,69,0.9)', 'rgba(255,208,122,0.85)'] },
    { kind: 'spark', count: 12, colors: ['rgba(255,207,138,0.95)', 'rgba(168,192,216,0.85)'] },
  ],
  fx: { vignette: 0.5, bottomFade: 0.6, topFade: 0.34, glitch: 0.05 },
});

export const atoms = {
  splitField,
  splitRidges,
  riftGate,
  dualTorii,
  abBanners,
  forkedStones,
  leftDrift,
  rightDrift,
  dualLight,
  airClash,
};
