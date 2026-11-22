/**
 * EX「键政覆写」场景（P6 绘卷系统）。
 * 剧情：van♂ 的键政灌入数据洪流；OTTOWiki 词条被批量覆写，强度收敛但覆写仍在继续。
 * mid：被覆写的巨大「词条门」+ 漂浮页面碎片 + 二进制雨 + 数据漩涡。
 * boss：漩涡加速、全屏覆写文字闪烁、门崩解。
 * 设计说明：docs/level-background-redesign.md §4。
 */
import { sceneDefaults } from '../schema.js';
import { STAGE_PALETTES } from './_stub.js';

const BASE = STAGE_PALETTES.ex;

function withA(color, a) {
  const c = String(color || '#ffffff');
  if (c.startsWith('#')) {
    const hex = c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
    return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
  }
  return c;
}

/** 被覆写的巨大词条门（专属原子） */
function wordGate(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.52) * h;
  const bw = (p.w ?? 132);
  const bh = (p.h ?? 210);
  const color = p.color || '#1e1230';
  const accent = p.accent || '#d94fd0';
  const broken = !!p.broken;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.tilt ?? 0);
  ctx.globalAlpha = p.alpha ?? 0.68;
  // 门框
  ctx.fillStyle = color;
  ctx.fillRect(-bw / 2, -bh, bw, bh);
  ctx.fillStyle = '#07040a';
  ctx.fillRect(-bw / 2 + 12, -bh + 14, bw - 24, bh - 20);
  // 门内数据纹
  ctx.strokeStyle = withA(accent, 0.4);
  ctx.lineWidth = 1;
  for (let r = 0; r < 9; r++) {
    ctx.beginPath();
    ctx.moveTo(-bw / 2 + 18, -bh + 24 + r * (bh - 50) / 9);
    ctx.lineTo(bw / 2 - 18 - (r % 3) * 12, -bh + 24 + r * (bh - 50) / 9 + (r % 2 ? 3 : -2));
    ctx.stroke();
  }
  // 覆写 glyph
  ctx.fillStyle = withA(accent, 0.55);
  ctx.font = 'bold 18px "Noto Serif CJK SC", "Microsoft YaHei", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('覆写', 0, -bh * 0.64);
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = withA('#5ad4e0', 0.5);
  ctx.fillText('0xE7 0x9C 0x9F', 0, -bh * 0.52);
  // 门楣
  ctx.fillStyle = color;
  ctx.fillRect(-bw / 2 - 10, -bh - 14, bw + 20, 16);
  ctx.fillStyle = withA(accent, 0.5);
  ctx.fillRect(-bw / 2 - 10, -bh - 2, bw + 20, 1.6);
  // 裂纹/崩解
  if (broken) {
    ctx.strokeStyle = withA('#f0a0ff', 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-bw * 0.14, -bh + 8);
    ctx.lineTo(-bw * 0.02, -bh * 0.7);
    ctx.lineTo(-bw * 0.18, -bh * 0.42);
    ctx.lineTo(0, -bh * 0.16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bw * 0.2, -bh + 4);
    ctx.lineTo(bw * 0.12, -bh * 0.76);
    ctx.lineTo(bw * 0.28, -bh * 0.5);
    ctx.stroke();
    // 崩解碎片
    ctx.fillStyle = withA('#2a1040', 0.8);
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(-bw * 0.3 + i * 22, -bh * 0.3 + (i % 2) * 26, 9, 4);
    }
  }
  ctx.restore();
}

/** 漂浮页面碎片（静态） */
function pageFragments(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const count = p.count ?? 9;
  const seed = p.seed ?? 53;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = env.rand(seed + i * 7) * w;
    const y = env.rand(seed + i * 11) * h * 0.55;
    const pw = 12 + env.rand(seed + i * 13) * 22;
    const ph = pw * 1.35;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((env.rand(seed + i * 17) - 0.5) * 0.9);
    ctx.globalAlpha = (p.alpha ?? 0.5) * (0.5 + env.rand(seed + i * 19) * 0.5);
    ctx.fillStyle = i % 3 === 0 ? '#d8c8e8' : '#c8b8d8';
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.strokeStyle = 'rgba(60,40,80,0.55)';
    ctx.lineWidth = 0.8;
    for (let r = 0; r < 4; r++) {
      ctx.beginPath();
      ctx.moveTo(-pw * 0.34, -ph * 0.3 + r * ph * 0.16);
      ctx.lineTo(pw * 0.3 - (r % 2) * 3, -ph * 0.3 + r * ph * 0.16);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

/** 数据漩涡（animate 层） */
function dataVortex(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.4) * h;
  const r = (p.r ?? 0.22) * Math.min(w, h);
  const t = env.t || 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * (p.speed ?? 0.18));
  ctx.globalAlpha = p.alpha ?? 0.3;
  const c1 = p.color || '#d94fd0';
  const c2 = p.color2 || '#5ad4e0';
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = withA(i % 2 ? c2 : c1, 0.38);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * (0.3 + i * 0.12), r * (0.1 + i * 0.04), i * 0.5, 0, Math.PI * 1.7);
    ctx.stroke();
  }
  // 数据点
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + t * 0.5;
    const rr = r * (0.4 + (i % 5) * 0.12);
    ctx.fillStyle = withA(i % 2 ? c2 : c1, 0.5);
    ctx.fillRect(Math.cos(a) * rr, Math.sin(a) * rr * 0.4, 1.6, 1.6);
  }
  ctx.restore();
}

const plateStyle = { scale: 1.07, swayX: 8, swayY: 10, wash: 'rgba(10,4,16,0.3)' };

export const mid = sceneDefaults({
  mode: 'ex_mid',
  stage: 'ex',
  palette: { ...BASE },
  plate: { ...plateStyle },
  layers: [
    { atom: 'glow', params: { x: 0.5, y: 0.3, r: 0.66, color: BASE.glow, alpha: 0.13 } },
    { atom: 'starField', params: { count: 30, maxY: 0.3, color: '#f0c0f0', alpha: 0.2, seed: 7 } },
    { atom: 'cloudBand', params: { y: 0.18, h: 0.1, color: '#a06aa0', alpha: 0.14, speed: 3 }, animate: true },
    { atom: 'mountainRange', params: { baseY: 0.46, h: 0.06, color: '#07040a', alpha: 0.8, layers: 2, peaks: 5, seed: 13 } },
    { atom: 'dataVortex', params: { x: 0.5, y: 0.36, r: 0.24, alpha: 0.2, speed: 0.16 } },
    { atom: 'wordGate', params: { x: 0.5, y: 0.53, w: 128, h: 196, alpha: 0.6 } },
    { atom: 'pageFragments', params: { count: 9, seed: 53, alpha: 0.45 } },
    { atom: 'seal', params: { x: 0.16, y: 0.3, s: 20, color: '#b04ad0', text: '封', alpha: 0.5, rotate: -8 } },
    { atom: 'seal', params: { x: 0.85, y: 0.26, s: 17, color: '#b04ad0', text: '键', alpha: 0.45, rotate: 6 } },
    { atom: 'waveBand', params: { y: 0.66, h: 0.16, color: '#d94fd0', alpha: 0.12 } },
    { atom: 'waveBand', params: { y: 0.72, h: 0.13, color: '#5ad4e0', alpha: 0.08, flip: true } },
    { atom: 'fogBank', params: { y: 0.62, h: 0.18, color: BASE.fog, alpha: 0.16, speed: 5, phase: 1.1 }, animate: true },
    { atom: 'crack', params: { x: 0.3, y: 0.3, len: 0.12, color: '#f0a0ff', alpha: 0.3, angle: 60, seed: 3 } },
    { atom: 'frameBranches', params: { side: 'left', color: '#1a0c24', alpha: 0.45, s: 0.8 } },
    { atom: 'frameBranches', params: { side: 'right', color: '#180a20', alpha: 0.4, s: 0.75 } },
    { atom: 'grassReeds', params: { color: '#0a060e', alpha: 0.6, h: 0.18 } },
  ],
  particles: [
    { kind: 'binary', count: 34, colors: ['rgba(180,250,240,0.5)', 'rgba(230,130,230,0.45)'] },
    { kind: 'paper', count: 8, colors: ['rgba(216,200,232,0.55)'] },
    { kind: 'spark', count: 10, colors: ['rgba(240,160,255,0.8)', 'rgba(110,230,255,0.75)'] },
  ],
  fx: { vignette: 0.5, bottomFade: 0.56, topFade: 0.34, glitch: 0.08, scanlines: 0.18 },
});

export const boss = sceneDefaults({
  mode: 'ex_boss',
  stage: 'ex',
  palette: { ...BASE, ...(BASE.boss || {}) },
  plate: { ...plateStyle, wash: 'rgba(16,4,22,0.36)' },
  layers: [
    { atom: 'glow', params: { x: 0.5, y: 0.34, r: 0.74, color: '#ffb0ff', alpha: 0.16 } },
    { atom: 'starField', params: { count: 40, maxY: 0.32, color: '#ffd0ff', alpha: 0.24, seed: 11 } },
    { atom: 'cloudBand', params: { y: 0.16, h: 0.11, color: '#c080c0', alpha: 0.16, speed: 4 }, animate: true },
    { atom: 'mountainRange', params: { baseY: 0.47, h: 0.07, color: '#08040c', alpha: 0.85, layers: 2, peaks: 6, seed: 17 } },
    { atom: 'dataVortex', params: { x: 0.5, y: 0.36, r: 0.32, alpha: 0.26, speed: 0.3, color: '#ff5ad0', color2: '#7ae0ff' } },
    { atom: 'wordGate', params: { x: 0.5, y: 0.55, w: 142, h: 206, alpha: 0.72, broken: true, tilt: 0.04, accent: '#ff5ad0' } },
    { atom: 'pageFragments', params: { count: 14, seed: 61, alpha: 0.55 } },
    { atom: 'seal', params: { x: 0.14, y: 0.26, s: 24, color: '#c05ae0', text: '政', alpha: 0.55, rotate: -10 } },
    { atom: 'seal', params: { x: 0.86, y: 0.22, s: 20, color: '#c05ae0', text: '覆', alpha: 0.5, rotate: 8 } },
    { atom: 'crack', params: { x: 0.5, y: 0.3, len: 0.18, color: '#ffb0ff', alpha: 0.4, angle: 84, seed: 5 } },
    { atom: 'waveBand', params: { y: 0.66, h: 0.17, color: '#ff5ad0', alpha: 0.15 } },
    { atom: 'waveBand', params: { y: 0.73, h: 0.14, color: '#7ae0ff', alpha: 0.1, flip: true } },
    { atom: 'fogBank', params: { y: 0.62, h: 0.2, color: BASE.boss.fog, alpha: 0.2, speed: 7, phase: 2.3 }, animate: true },
    { atom: 'frameBranches', params: { side: 'left', color: '#22102c', alpha: 0.5, s: 0.9 } },
    { atom: 'frameBranches', params: { side: 'right', color: '#200e28', alpha: 0.45, s: 0.85 } },
    { atom: 'grassReeds', params: { color: '#0c0812', alpha: 0.65, h: 0.2 } },
  ],
  particles: [
    { kind: 'binary', count: 46, colors: ['rgba(200,255,245,0.55)', 'rgba(255,140,240,0.5)'] },
    { kind: 'paper', count: 12, colors: ['rgba(230,210,240,0.6)'] },
    { kind: 'spark', count: 16, colors: ['rgba(255,160,255,0.85)', 'rgba(120,240,255,0.8)'] },
  ],
  fx: { vignette: 0.54, bottomFade: 0.6, topFade: 0.36, glitch: 0.12, scanlines: 0.22 },
});

export const atoms = { wordGate, pageFragments, dataVortex };
