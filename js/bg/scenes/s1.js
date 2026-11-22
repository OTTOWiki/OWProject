/**
 * 第 1 面「维基外围 · 零散草稿」场景（绘卷系统样板面）。
 * 剧情：草稿如落雪，在审核的边缘漂泊；未竟的词条低语，试探来者的执念。
 * mid：月下荒野 + 远处维基聚落（藏经塔/服务器天线）+ 破损鸟居 + 草稿纸雪。
 * boss：爱丽丝「全域草稿」战——赤月、旋转草稿齿轮、纸片风暴。
 * 设计说明：docs/level-background-redesign.md §4。
 */
import { sceneDefaults } from '../schema.js';
import { STAGE_PALETTES } from './_stub.js';
import { pagoda } from '../atoms.js';

const BASE = STAGE_PALETTES.s1;
const TAU = Math.PI * 2;

const W = (env) => env?.W || 450;
const H = (env) => env?.H || 600;
const R = (env, seed) => (env && typeof env.rand === 'function' ? env.rand(seed) : 0.5);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** CSS 颜色 → rgba(a)；rgba/rgb 与 #rrggbb/#rgb 均可用 */
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
 * 专属原子：维基聚落 / 破损鸟居 / 月晕 / 草稿纸雪 / 草稿齿轮 / 纸片风暴
 * ------------------------------------------------------------------ */

/**
 * 远处维基聚落：低矮档案楼群 + 藏经塔 + 服务器天线 + 聚落窗光。
 * 楼群压得很低，保证画面中心不被高反差细节占据；窗光集中在左右边缘。
 */
function wikiSkyline(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const baseY = (p.baseY ?? 0.435) * h;
  const color = p.color || '#0b1c14';
  const accent = p.accent || BASE.accent;
  const warm = p.warm || BASE.accent2;
  const seed = p.seed ?? 71;
  const count = p.count ?? 10;
  const alpha = p.alpha ?? 0.95;

  // 聚落背后的淡淡地平光：让剪影从天空里浮出来
  const hg = ctx.createLinearGradient(0, baseY - h * 0.1, 0, baseY + h * 0.02);
  hg.addColorStop(0, rgba(accent, 0));
  hg.addColorStop(0.72, rgba(accent, 0.11));
  hg.addColorStop(1, rgba(accent, 0.02));
  ctx.fillStyle = hg;
  ctx.fillRect(0, baseY - h * 0.1, w, h * 0.12);

  // 远层：更暗更矮的仓库/档案楼
  ctx.save();
  ctx.globalAlpha = alpha * 0.5;
  ctx.fillStyle = color;
  for (let i = 0; i < count + 5; i++) {
    const x = ((i + 0.25 + R(env, seed + i * 11) * 0.6) / (count + 5)) * w;
    const bw = 20 + R(env, seed + i * 13) * 44;
    const bh = 6 + R(env, seed + i * 17) * 15;
    ctx.fillRect(x - bw / 2, baseY - bh, bw, bh + 3);
  }

  // 近层：档案楼 + 斜顶 + 窗光 + 檐角灯笼
  for (let i = 0; i < count; i++) {
    const x = ((i + 0.2 + R(env, seed + i * 23) * 0.6) / count) * w;
    const bw = 15 + R(env, seed + i * 29) * 30;
    const bh = 12 + R(env, seed + i * 31) * 32;
    const top = baseY - bh;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x - bw / 2, top, bw, bh + 2);
    // 屋顶（两坡）
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.64, top + 1);
    ctx.lineTo(x, top - 4 - R(env, seed + i * 37) * 3);
    ctx.lineTo(x + bw * 0.64, top + 1);
    ctx.closePath();
    ctx.fill();
    // 窗光：越靠左右边缘越亮（聚落仍在编辑草稿）
    const edgeBoost = 1 - (Math.min(x, w - x) / (w * 0.5)) * 0.55;
    const cols = Math.max(1, (bw / 6.4) | 0);
    const floors = Math.max(1, (bh / 8.2) | 0);
    for (let c = 0; c < cols; c++) {
      for (let f = 0; f < floors; f++) {
        const lit = R(env, seed + i * 41 + c * 53 + f * 97);
        if (lit > 0.42) {
          const warmLight = R(env, seed + i * 43 + c * 59 + f * 101) > 0.68;
          ctx.globalAlpha = alpha * clamp01(0.28 + lit * 0.6 * edgeBoost);
          ctx.fillStyle = warmLight ? warm : accent;
          ctx.fillRect(x - bw / 2 + 2.4 + c * 6.4, top + 3.2 + f * 8.2, 2.2, 2.4);
          // 窗光柔晕
          if (warmLight) {
            ctx.globalAlpha *= 0.28;
            ctx.fillRect(x - bw / 2 + 0.4 + c * 6.4, top + 1.2 + f * 8.2, 6.2, 6.4);
          }
        }
      }
    }
    // 檐角灯笼（暖点，只挂在部分楼）
    if (i % 3 === 0) {
      const lx = x + (R(env, seed + 61 + i * 7) - 0.5) * bw * 0.8;
      const ly = top + 3 + R(env, seed + 83 + i * 11) * 5;
      const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, 7);
      lg.addColorStop(0, rgba(warm, 0.5));
      lg.addColorStop(1, rgba(warm, 0));
      ctx.fillStyle = lg;
      ctx.fillRect(lx - 7, ly - 7, 14, 14);
      ctx.fillStyle = rgba(warm, 0.75);
      ctx.beginPath();
      ctx.arc(lx, ly, 1.5, 0, TAU);
      ctx.fill();
    }
  }

  // 藏经塔（左右两侧地标，避免压中心）
  ctx.globalAlpha = alpha;
  pagoda(ctx, {
    x: w * 0.2, y: baseY + 2, s: 0.52, tiers: 4, color,
    window: '#b9ffd8', gold: '#e8cf8a', alpha, glow: true, glowColor: '#7ee2a8',
  }, env);
  pagoda(ctx, {
    x: w * 0.81, y: baseY + 2, s: 0.4, tiers: 3, color,
    window: '#b9ffd8', gold: '#e8cf8a', alpha: alpha * 0.9,
  }, env);

  // 服务器天线 + 信标
  const antennas = [[0.355, 0.34], [0.63, 0.46]];
  for (const [ax, ah] of antennas) {
    const x = w * ax;
    const top = baseY - h * ah * 0.1;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, top);
    ctx.moveTo(x - 5, top + 6);
    ctx.lineTo(x + 5, top + 6);
    ctx.moveTo(x - 4, top + 14);
    ctx.lineTo(x + 4, top + 14);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(x, top - 1, 1.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * 破损鸟居：一侧笠木断折、贯木缺损、注连绳下垂、柱身裂纹与苔痕。
 * 朱红只保留在边缘受光处，整体深色剪影，避免中心高对比。
 */
function brokenTorii(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.62) * h;
  const s = (p.s ?? 0.8) * Math.min(w, h) / 600;
  const color = p.color || '#7a2a34';
  const dark = p.dark || '#1a070b';
  const alpha = p.alpha ?? 0.8;
  const pw = 10.5 * s;
  const gap = 60 * s;
  const ph = 120 * s;
  const over = gap * 1.27;
  const brokenRight = p.breakSide !== 'left';
  const seed = p.seed ?? 77;

  ctx.save();
  ctx.globalAlpha = alpha;
  // 月光透门（低透明柔光，不压中心可读性）
  if (p.glow !== false) {
    const g = ctx.createRadialGradient(x, y - ph * 0.74, 0, x, y - ph * 0.74, over * 2.3);
    g.addColorStop(0, rgba(p.glowColor || '#7ee2a8', 0.16));
    g.addColorStop(0.55, rgba(p.glowColor || '#7ee2a8', 0.05));
    g.addColorStop(1, rgba(p.glowColor || '#7ee2a8', 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - over * 2.5, y - ph * 2.6, over * 5, ph * 3.2);
  }
  // 基座石
  ctx.fillStyle = rgba(dark, 0.92);
  ctx.fillRect(x - gap - pw * 1.4, y - 5 * s, pw * 2.8, 6 * s);
  ctx.fillRect(x + gap - pw * 1.4, y - 5 * s, pw * 2.8, 6 * s);

  // 柱：左完整 / 右断折微倾
  const pillar = (side, broken, tilt) => {
    ctx.save();
    ctx.translate(x + side * gap, y);
    ctx.rotate(tilt);
    const hh = ph * (broken ? 0.76 : 1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-pw / 2, 0);
    ctx.lineTo(pw / 2, 0);
    ctx.lineTo(pw * 0.4, -hh);
    if (broken) {
      ctx.lineTo(pw * 0.04, -hh - 5 * s);
      ctx.lineTo(-pw * 0.5, -hh + 4 * s);
    } else {
      ctx.lineTo(-pw * 0.42, -hh);
    }
    ctx.closePath();
    ctx.fill();
    // 暗面
    ctx.fillStyle = rgba(dark, 0.62);
    ctx.fillRect(-pw / 2, -hh, pw * 0.36, hh);
    // 受光边
    ctx.fillStyle = rgba('#c46a72', 0.35);
    ctx.fillRect(pw * 0.26, -hh * 0.96, pw * 0.2, hh * 0.94);
    // 苔痕
    ctx.fillStyle = 'rgba(64,96,66,0.5)';
    for (let i = 0; i < 4; i++) {
      const my = -hh * (0.1 + R(env, seed + 40 + i * 7 + (side > 0 ? 30 : 0)) * 0.62);
      ctx.beginPath();
      ctx.ellipse((R(env, seed + 60 + i * 11) - 0.5) * pw, my, pw * 0.34, pw * 0.16, 0, 0, TAU);
      ctx.fill();
    }
    // 裂纹
    ctx.strokeStyle = rgba(dark, 0.85);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-pw * 0.06, -hh * 0.5);
    ctx.lineTo(pw * 0.22, -hh * 0.58);
    ctx.lineTo(pw * 0.02, -hh * 0.68);
    ctx.stroke();
    ctx.restore();
  };
  pillar(-1, false, -0.012);
  pillar(1, brokenRight, brokenRight ? 0.035 : -0.012);

  // 贯（下横木，断口）
  const nukiY = y - ph * 0.77;
  ctx.fillStyle = color;
  if (brokenRight) {
    ctx.save();
    ctx.translate(x, nukiY);
    ctx.rotate(-0.015);
    ctx.fillRect(-gap - pw * 1.3, 0, gap * 0.94 + pw * 1.3, 8.5 * s);
    ctx.restore();
    ctx.save();
    ctx.translate(x + gap - 2 * s, nukiY + 5 * s);
    ctx.rotate(0.07);
    ctx.fillRect(-gap * 0.55, 0, gap * 0.55 + pw * 1.3, 7.5 * s);
    ctx.restore();
  } else {
    ctx.fillRect(x - gap - pw * 1.3, nukiY, (gap + pw * 1.3) * 2, 8.5 * s);
  }
  // 岛木（上横木）
  const shimakiY = y - ph * 0.965;
  ctx.fillStyle = color;
  if (brokenRight) {
    ctx.fillRect(x - gap * 1.12 - pw, shimakiY, gap * 1.05 + pw, 7 * s);
    ctx.save();
    ctx.translate(x + gap * 0.2, shimakiY + 8 * s);
    ctx.rotate(0.12);
    ctx.fillRect(0, 0, gap * 0.95, 6.5 * s);
    ctx.restore();
  } else {
    ctx.fillRect(x - gap * 1.12 - pw, shimakiY, (gap * 1.12 + pw) * 2, 7 * s);
  }

  // 笠木（最上横木：两端上翘；右半断折下垂）
  const kasagiY = y - ph - 3 * s;
  const kasagi = (dir, len, tipLift, droop) => {
    ctx.save();
    ctx.translate(x, kasagiY);
    ctx.fillStyle = color;
    ctx.beginPath();
    const inner = dir * 7 * s;
    const outer = dir * len;
    ctx.moveTo(outer, -tipLift);
    ctx.quadraticCurveTo(dir * len * 0.52, -tipLift - 9 * s, inner, -7 * s + droop);
    ctx.lineTo(inner, 2 * s + droop);
    ctx.quadraticCurveTo(dir * len * 0.5, -2 * s - tipLift * 0.2, outer, 6 * s - tipLift * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(dark, 0.5);
    ctx.fillRect(Math.min(outer, inner), 2.4 * s + droop, Math.abs(outer - inner), 2.6 * s);
    ctx.restore();
  };
  kasagi(-1, over, 10 * s, 0);
  if (brokenRight) kasagi(1, over * 0.78, 4 * s, 7 * s);
  else kasagi(1, over, 10 * s, 0);

  // 注连绳 + 纸垂
  if (p.rope !== false) {
    const ropeColor = p.ropeColor || '#d8cfae';
    ctx.strokeStyle = rgba(ropeColor, 0.5);
    ctx.lineWidth = 1.7 * s;
    ctx.beginPath();
    ctx.moveTo(x - gap * 0.9, nukiY - 5 * s);
    ctx.quadraticCurveTo(x - gap * 0.2, nukiY + 12 * s, x + gap * (brokenRight ? 0.3 : 0.9), nukiY + (brokenRight ? 4 : -2) * s);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const sx = x - gap * 0.58 + i * gap * 0.36;
      const sy = nukiY + (i === 0 ? 1 : 4) * s;
      ctx.fillStyle = rgba('#eee8d2', 0.62);
      ctx.beginPath();
      ctx.moveTo(sx - 2.3 * s, sy);
      ctx.lineTo(sx + 2.3 * s, sy);
      ctx.lineTo(sx + 1.2 * s, sy + 6 * s);
      ctx.lineTo(sx + 2.8 * s, sy + 9.5 * s);
      ctx.lineTo(sx - 1.8 * s, sy + 9.5 * s);
      ctx.closePath();
      ctx.fill();
    }
  }
  // 断口碎屑
  ctx.fillStyle = rgba(dark, 0.85);
  for (let i = 0; i < 6; i++) {
    const fx = x + (R(env, seed + 501 + i * 3) - 0.5) * gap * 1.7;
    const fy = y - ph * (0.74 + R(env, seed + 521 + i * 5) * 0.22);
    ctx.fillRect(fx, fy, (1.6 + R(env, seed + 541 + i) * 2.6) * s, 1.3 * s);
  }
  ctx.restore();
}

/** 呼吸月晕：径向柔光 + 两圈刻度环（每帧 1 个渐变） */
function moonHalo(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const x = (p.x ?? 0.74) * w;
  const y = (p.y ?? 0.145) * h;
  const r = p.r ?? 30;
  const t = env?.t || 0;
  const breath = 0.5 + 0.5 * Math.sin(t * (p.speed ?? 0.5) + (p.phase ?? 0));
  const color = p.color || '#9fc9a8';
  const alpha = p.alpha ?? 0.18;

  ctx.save();
  const g = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * (2.5 + 0.45 * breath));
  g.addColorStop(0, rgba(color, alpha * (0.7 + 0.3 * breath)));
  g.addColorStop(0.5, rgba(color, alpha * 0.3));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 3.3, y - r * 3.3, r * 6.6, r * 6.6);

  ctx.strokeStyle = rgba(color, alpha * (0.3 + 0.28 * breath));
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, r * (1.5 + 0.08 * breath), 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 1.98, 0, TAU);
  ctx.stroke();
  // 月轮刻度
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + t * 0.035;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 1.76, y + Math.sin(a) * r * 1.76);
    ctx.lineTo(x + Math.cos(a) * r * (1.95 + 0.12 * breath), y + Math.sin(a) * r * 1.95);
    ctx.stroke();
  }
  ctx.restore();
}

/** 草稿纸雪：带 #/{} /wiki/草稿 字迹的纸片缓慢旋落（无渐变） */
function draftFlurry(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const count = p.count ?? 12;
  const seed = p.seed ?? 211;
  const alpha = p.alpha ?? 0.5;
  const colors = p.colors || ['#ded9c2', '#c9cdb4', '#b7c1a8'];
  const glyphs = ['#', '{}', 'wiki', '草'];
  const spanH = h + 90;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < count; i++) {
    const r1 = R(env, seed + i * 11);
    const r2 = R(env, seed + i * 17 + 3);
    const r3 = R(env, seed + i * 23 + 5);
    const r4 = R(env, seed + i * 29 + 7);
    const size = 4.5 + r1 * 5;
    const vy = 15 + r2 * 24;
    const vx = (r3 - 0.5) * 16;
    const x0 = r4 * (w + 50) - 25;
    const y0 = R(env, seed + i * 31 + 9) * spanH;
    const yy = (((y0 + t * vy) % spanH) + spanH) % spanH - 45;
    const xx = ((((x0 + Math.sin(t * 0.5 + i * 1.7) * 10 + t * vx) % (w + 60)) + (w + 60)) % (w + 60)) - 30;
    ctx.save();
    ctx.translate(xx, yy);
    ctx.rotate((r1 - 0.5) * 2 + t * (0.2 + r2 * 0.45) * (i % 2 ? 1 : -1));
    ctx.globalAlpha = alpha * (0.5 + r3 * 0.45);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(-size * 0.6, -size * 0.45, size * 1.2, size * 0.9);
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = '#3c4038';
    ctx.fillRect(-size * 0.42, -size * 0.16, size * 0.84, 0.6);
    ctx.fillRect(-size * 0.42, size * 0.08, size * 0.62, 0.5);
    if (i % 3 === 0) {
      ctx.globalAlpha *= 0.9;
      ctx.font = font(size * 0.72, 'normal');
      ctx.fillStyle = '#4a5044';
      ctx.fillText(glyphs[i % glyphs.length], 0, 0.5);
    }
    ctx.restore();
  }
  ctx.restore();
}

/** 单个齿轮（描线） */
function drawGear(ctx, x, y, r, rot, teeth, color, alpha, lw) {
  if (r <= 2) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.68, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.24, 0, TAU);
  ctx.stroke();
  // 齿
  for (let i = 0; i < teeth; i++) {
    ctx.save();
    ctx.rotate((i / teeth) * TAU);
    ctx.beginPath();
    ctx.moveTo(r * 0.99, -r * 0.055);
    ctx.lineTo(r * 1.14, -r * 0.03);
    ctx.lineTo(r * 1.14, r * 0.03);
    ctx.lineTo(r * 0.99, r * 0.055);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  // 辐条
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.24, Math.sin(a) * r * 0.24);
    ctx.lineTo(Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68);
    ctx.stroke();
  }
  ctx.restore();
}

/** 草稿齿轮组：赤月月轮 + 中景齿轮 + 小齿轮（无渐变） */
function draftGearSet(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const m = Math.min(w, h);
  const color = p.color || '#f9a8d4';
  const alpha = p.alpha ?? 0.18;
  ctx.save();
  drawGear(ctx, (p.moonX ?? 0.74) * w, (p.moonY ?? 0.145) * h, (p.moonR ?? 0.095) * m, t * (p.speed ?? 0.05), 18, color, alpha * 1.5, 1.1);
  drawGear(ctx, (p.x ?? 0.5) * w, (p.y ?? 0.255) * h, (p.r ?? 0.13) * m, t * 0.09, 14, color, alpha * 0.8, 0.9);
  drawGear(ctx, 0.21 * w, 0.19 * h, 0.048 * m, -t * 0.16, 10, p.cool || '#9be8ef', alpha * 0.8, 0.8);
  // 齿轮咬合处的纸屑火花（静态位置、闪烁）
  ctx.fillStyle = rgba(color, alpha * 1.4);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.4;
    const r = 0.23 * m;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + i * 1.7));
    ctx.globalAlpha = alpha * tw;
    ctx.fillRect((p.x ?? 0.5) * w + Math.cos(a) * r, (p.y ?? 0.255) * h + Math.sin(a) * r, 1.7, 1.7);
  }
  ctx.restore();
}

/** 纸片风暴：围绕赤月的椭圆纸屑涡流（无渐变） */
function paperStorm(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const t = env?.t || 0;
  const cx = (p.x ?? 0.5) * w;
  const cy = (p.y ?? 0.26) * h;
  const radius = (p.r ?? 0.4) * Math.min(w, h);
  const count = p.count ?? 18;
  const seed = p.seed ?? 311;
  const alpha = p.alpha ?? 0.32;
  const colors = p.colors || ['#efc9d8', '#d9c7d2', '#e9d5e4'];
  ctx.save();
  for (let i = 0; i < count; i++) {
    const r0 = R(env, seed + i * 7);
    const a0 = R(env, seed + i * 13 + 1) * TAU;
    const spin = (0.16 + r0 * 0.32) * (i % 2 ? 1 : -1);
    const rr = radius * (0.24 + r0 * 0.76);
    const a = a0 + t * spin;
    const wob = Math.sin(t * 0.7 + i) * 0.08;
    const x = cx + Math.cos(a) * rr * (1 + wob);
    const y = cy + Math.sin(a) * rr * 0.62 * (1 + wob * 1.4);
    const size = 2.5 + R(env, seed + i * 19 + 2) * 4.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + 1.2 + t * (0.4 + r0));
    ctx.globalAlpha = alpha * (0.45 + 0.55 * R(env, seed + i * 23 + 3));
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(-size * 0.6, -size * 0.42, size * 1.2, size * 0.84);
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = '#5a4050';
    ctx.fillRect(-size * 0.4, -size * 0.1, size * 0.8, 0.5);
    ctx.restore();
  }
  ctx.restore();
}

/** 前景草稿地面：底部两侧纸堆、中景两侧草稿簇与细草（避开画面中心高对比） */
function draftGround(ctx, p = {}, env) {
  const w = W(env);
  const h = H(env);
  const seed = p.seed ?? 401;
  const alpha = p.alpha ?? 0.42;

  ctx.save();
  // 底部两侧纸堆
  for (const side of [-1, 1]) {
    const bx = side < 0 ? w * 0.16 : w * 0.84;
    for (let i = 0; i < 8; i++) {
      const sx = bx + (R(env, seed + i * 7 + (side > 0 ? 60 : 0)) - 0.5) * w * 0.24;
      const sy = h * (0.88 + R(env, seed + i * 11 + (side > 0 ? 60 : 0)) * 0.1);
      const sw = 9 + R(env, seed + i * 13) * 18;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate((R(env, seed + i * 19) - 0.5) * 0.55);
      ctx.globalAlpha = alpha * (0.4 + R(env, seed + i * 23) * 0.6);
      ctx.fillStyle = p.paper || 'rgba(216,216,196,0.5)';
      ctx.fillRect(-sw / 2, -1.4, sw, 2.8);
      ctx.fillStyle = 'rgba(62,72,60,0.45)';
      ctx.fillRect(-sw * 0.3, -0.4, sw * 0.6, 0.5);
      ctx.restore();
    }
  }
  // 中景两侧草稿簇 + 细草（y≈0.5-0.66，x≈0.3/0.7 两侧，低透明）
  const clusters = [[0.31, 0.555], [0.69, 0.585], [0.235, 0.495], [0.765, 0.52]];
  for (const [cx, cy] of clusters) {
    const px = cx * w;
    const py = cy * h;
    for (let i = 0; i < 5; i++) {
      const sx = px + (R(env, seed + 100 + i * 7) - 0.5) * 36;
      const sy = py + (R(env, seed + 120 + i * 11) - 0.5) * 20;
      const sw = 5 + R(env, seed + 140 + i * 13) * 9;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate((R(env, seed + 160 + i * 17) - 0.5) * 0.9);
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = p.paper || 'rgba(206,208,186,0.55)';
      ctx.fillRect(-sw / 2, -sw * 0.32, sw, sw * 0.64);
      ctx.restore();
    }
    ctx.strokeStyle = p.grass || '#2e4a38';
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 6; i++) {
      const gx = px + (R(env, seed + 200 + i * 5) - 0.5) * 44;
      const gh = 8 + R(env, seed + 220 + i * 7) * 20;
      ctx.globalAlpha = alpha * 0.75;
      ctx.beginPath();
      ctx.moveTo(gx, py + 12);
      ctx.quadraticCurveTo(
        gx + (R(env, seed + 240 + i * 3) - 0.5) * 8, py + 12 - gh * 0.6,
        gx + (R(env, seed + 260 + i * 9) - 0.5) * 12, py + 12 - gh,
      );
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * 场景
 * ------------------------------------------------------------------ */

export const mid = sceneDefaults({
  mode: 's1_mid',
  stage: 's1',
  palette: { ...BASE },
  plate: { scale: 1.06, swayX: 8, swayY: 10, wash: 'rgba(4,14,9,0.2)' },
  layers: [
    { atom: 'glow', params: { x: 0.64, y: 0.19, r: 0.52, color: BASE.glow, alpha: 0.13 } },
    {
      atom: 'moon', params: {
        x: 0.74, y: 0.145, r: 30, color: '#e2e8cf', halo: '#9fc9a8', haloAlpha: 0.12, alpha: 0.84,
      },
    },
    {
      atom: 'moonHalo', params: {
        x: 0.74, y: 0.145, r: 30, color: '#9fc9a8', alpha: 0.17, speed: 0.5, phase: 0.4,
      }, animate: true,
    },
    {
      atom: 'starField', params: {
        count: 46, maxY: 0.36, color: '#cfe8d8', alpha: 0.32, seed: 5,
      },
    },
    {
      atom: 'cloudBand', params: {
        y: 0.27, h: 0.09, color: '#6fa383', alpha: 0.1, speed: 2.5,
      }, animate: true,
    },
    {
      atom: 'mountainRange', params: {
        baseY: 0.418, h: 0.075, color: '#05100a', alpha: 0.85, layers: 2, peaks: 5, seed: 31,
      },
    },
    {
      atom: 'wikiSkyline', params: {
        baseY: 0.436, color: '#0b1c14', accent: '#a8f0c8', warm: '#f0cf8a', seed: 71, count: 10, alpha: 0.95,
      },
    },
    {
      atom: 'brokenTorii', params: {
        x: 0.5, y: 0.6, s: 0.8, color: '#7a2a34', dark: '#1a070b',
        alpha: 0.8, glow: true, glowColor: '#7ee2a8', ropeColor: '#cfc39e',
      },
    },
    {
      atom: 'glyph', params: {
        text: '#', x: 0.1, y: 0.235, size: 15, color: BASE.accent, alpha: 0.18, rotate: -0.2,
      },
    },
    {
      atom: 'glyph', params: {
        text: '{}', x: 0.88, y: 0.33, size: 13, color: BASE.accent, alpha: 0.15, rotate: 0.12,
      },
    },
    {
      atom: 'glyph', params: {
        text: '草稿', x: 0.9, y: 0.17, size: 12, color: BASE.accent, alpha: 0.2, vertical: true,
      },
    },
    {
      atom: 'glyph', params: {
        text: 'wiki', x: 0.09, y: 0.35, size: 11, color: BASE.accent2, alpha: 0.16, rotate: -0.9,
      },
    },
    {
      atom: 'seal', params: {
        x: 0.075, y: 0.47, s: 15, color: BASE.seal, text: '草', alpha: 0.5, rotate: -8,
      },
    },
    {
      atom: 'fogBank', params: {
        y: 0.525, h: 0.1, color: BASE.fog, alpha: 0.11, speed: 3, phase: 0.3,
      },
    },
    {
      atom: 'fogBank', params: {
        y: 0.6, h: 0.21, color: BASE.fog, alpha: 0.22, speed: 7, phase: 1.2,
      }, animate: true,
    },
    {
      atom: 'frameBranches', params: {
        side: 'left', color: '#1b2a20', alpha: 0.5, s: 0.95,
      },
    },
    {
      atom: 'frameBranches', params: {
        side: 'right', color: '#182419', alpha: 0.4, s: 0.8,
      },
    },
    {
      atom: 'grassReeds', params: {
        color: '#0e2016', alpha: 0.85, h: 0.28,
      },
    },
    {
      atom: 'draftGround', params: {
        seed: 401, alpha: 0.52, paper: 'rgba(216,216,196,0.55)', grass: '#2e4a38',
      },
    },
    {
      atom: 'draftFlurry', params: {
        count: 12, seed: 211, alpha: 0.5, colors: ['#ded9c2', '#c9cdb4', '#b7c1a8'],
      }, animate: true,
    },
  ],
  particles: [
    {
      kind: 'paper', count: 22, colors: ['rgba(226,229,206,0.9)', 'rgba(201,209,184,0.8)'],
    },
    { kind: 'spark', count: 9, colors: ['rgba(126,226,168,0.9)', 'rgba(200,255,220,0.8)'] },
    { kind: 'leaf', count: 5, colors: ['rgba(90,140,100,0.7)'] },
  ],
  fx: { vignette: 0.46, bottomFade: 0.58, topFade: 0.3 },
});

export const boss = sceneDefaults({
  mode: 's1_boss',
  stage: 's1',
  palette: { ...BASE, ...(BASE.boss || {}) },
  plate: { scale: 1.08, swayX: 9, swayY: 11, wash: 'rgba(18,4,12,0.24)' },
  layers: [
    { atom: 'glow', params: { x: 0.7, y: 0.15, r: 0.62, color: '#f9a8d4', alpha: 0.15 } },
    {
      atom: 'moon', params: {
        x: 0.74, y: 0.145, r: 34, color: '#f2c2ce', halo: '#e0506a', haloAlpha: 0.2, alpha: 0.88,
      },
    },
    {
      atom: 'moonHalo', params: {
        x: 0.74, y: 0.145, r: 34, color: '#e0506a', alpha: 0.22, speed: 0.35, phase: 1.1,
      }, animate: true,
    },
    {
      atom: 'starField', params: {
        count: 54, maxY: 0.38, color: '#f6d8e8', alpha: 0.3, seed: 9,
      },
    },
    {
      atom: 'cloudBand', params: {
        y: 0.26, h: 0.1, color: '#b48a9e', alpha: 0.14, speed: 3.5,
      }, animate: true,
    },
    {
      atom: 'mountainRange', params: {
        baseY: 0.42, h: 0.085, color: '#0a0407', alpha: 0.9, layers: 2, peaks: 6, seed: 44,
      },
    },
    {
      atom: 'wikiSkyline', params: {
        baseY: 0.436, color: '#1a0b16', accent: '#ffb8dc', warm: '#ffe0b0', seed: 89, count: 10, alpha: 0.95,
      },
    },
    {
      atom: 'draftGearSet', params: {
        x: 0.5, y: 0.255, r: 0.13, moonX: 0.74, moonY: 0.145, moonR: 0.098,
        color: '#f9a8d4', cool: '#9be8ef', alpha: 0.25, speed: 0.05,
      }, animate: true,
    },
    {
      atom: 'brokenTorii', params: {
        x: 0.5, y: 0.605, s: 0.86, color: '#8a3040', dark: '#22080f',
        alpha: 0.82, glow: true, glowColor: '#f9a8d4', ropeColor: '#e8cfd8', breakSide: 'left',
      },
    },
    {
      atom: 'banner', params: {
        x: 0.135, y: 0.135, w: 20, h: 74, color: '#5a1c28', text: '草稿', textColor: '#f9d8e8', alpha: 0.62, angle: 4,
      },
    },
    {
      atom: 'banner', params: {
        x: 0.875, y: 0.17, w: 18, h: 64, color: '#3a1830', text: '審', textColor: '#f9a8d4', alpha: 0.55, angle: -5,
      },
    },
    {
      atom: 'seal', params: {
        x: 0.88, y: 0.43, s: 18, color: '#a8303c', text: '草', alpha: 0.5, rotate: 6,
      },
    },
    {
      atom: 'chrysanthemum', params: { x: 0.13, y: 0.44, r: 15, color: '#f3cfe0', alpha: 0.3, petals: 12 },
    },
    {
      atom: 'chrysanthemum', params: { x: 0.86, y: 0.5, r: 11, color: '#9be8ef', alpha: 0.22, petals: 10 },
    },
    {
      atom: 'paperStorm', params: {
        x: 0.5, y: 0.255, r: 0.43, count: 24, seed: 311, alpha: 0.4,
      }, animate: true,
    },
    {
      atom: 'fogBank', params: {
        y: 0.525, h: 0.1, color: BASE.boss.fog, alpha: 0.12, speed: 3.4, phase: 1.7,
      },
    },
    {
      atom: 'fogBank', params: {
        y: 0.6, h: 0.21, color: BASE.boss.fog, alpha: 0.22, speed: 8, phase: 2.4,
      },
    },
    {
      atom: 'frameBranches', params: { side: 'left', color: '#2a1220', alpha: 0.55, s: 1 },
    },
    {
      atom: 'frameBranches', params: { side: 'right', color: '#241020', alpha: 0.45, s: 0.85 },
    },
    {
      atom: 'grassReeds', params: { color: '#2a1020', alpha: 0.85, h: 0.28 },
    },
    {
      atom: 'draftGround', params: {
        seed: 421, alpha: 0.56, paper: 'rgba(232,206,222,0.55)', grass: '#4a2438',
      },
    },
  ],
  particles: [
    {
      kind: 'paper', count: 26, colors: ['rgba(240,214,228,0.9)', 'rgba(216,200,214,0.8)'],
    },
    { kind: 'petal', count: 8, colors: ['rgba(249,168,212,0.85)'] },
    { kind: 'spark', count: 12, colors: ['rgba(249,168,212,0.9)', 'rgba(155,232,239,0.85)'] },
  ],
  fx: { vignette: 0.52, bottomFade: 0.62, topFade: 0.34 },
});

export const atoms = {
  wikiSkyline,
  brokenTorii,
  moonHalo,
  draftFlurry,
  draftGearSet,
  paperStorm,
  draftGround,
};
