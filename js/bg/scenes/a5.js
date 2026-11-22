/**
 * A线第5面「主角组间冲突 · 署名权争夺」场景（P6 绘卷系统）。
 * 剧情：蓝白与粉红在涡旋中对撞；昔日并肩的署名，如今成为战场。
 * mid：左右镜像神社/浮岛（蓝/粉）、中央撕裂的署名卷轴、双向涡旋与印章。
 * boss：双涡合并、巨大署名封印、镜面碎裂。
 * 设计说明：docs/level-background-redesign.md §4。
 */
import { sceneDefaults } from '../schema.js';
import { STAGE_PALETTES } from './_stub.js';

const BASE = STAGE_PALETTES.a5;

/** 镜像神社/浮岛（专属原子） */
function mirrorShrine(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const side = p.side === 'right' ? 1 : -1;
  const x = (p.x ?? (side < 0 ? 0.2 : 0.8)) * w;
  const y = (p.y ?? 0.52) * h;
  const s = p.s ?? 1;
  const color = p.color || '#243850';
  const roof = p.roof || '#3e5a78';
  const glow = p.glow || '#9fc8f0';
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 0.9;
  // 浮岛
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y + 14 * s, 54 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 48 * s, y + 12 * s);
  ctx.quadraticCurveTo(x, y + 40 * s, x + 48 * s, y + 12 * s);
  ctx.quadraticCurveTo(x, y + 20 * s, x - 48 * s, y + 12 * s);
  ctx.fill();
  // 神社基座与柱
  ctx.fillStyle = withA(color, 0.95);
  ctx.fillRect(x - 30 * s, y - 44 * s, 60 * s, 52 * s);
  ctx.fillStyle = roof;
  // 三层屋檐（镜像朝向）
  for (let t = 0; t < 3; t++) {
    const bw = (42 - t * 9) * s;
    const by = y - 40 * s - t * 20 * s;
    ctx.beginPath();
    ctx.moveTo(x - bw, by);
    ctx.quadraticCurveTo(x - bw * 0.4, by - 10 * s, x - bw * 0.28, by - 12 * s);
    ctx.lineTo(x + bw * 0.28, by - 12 * s);
    ctx.quadraticCurveTo(x + bw * 0.4, by - 10 * s, x + bw, by);
    ctx.quadraticCurveTo(x, by + 5 * s, x - bw, by);
    ctx.closePath();
    ctx.fill();
    // 檐角挑出方向
    ctx.globalAlpha = (p.alpha ?? 0.9) * 0.7;
    ctx.fillStyle = withA(glow, 0.7);
    ctx.fillRect(x + side * bw * 0.92, by - 4 * s, 6 * s, 2 * s);
    ctx.globalAlpha = p.alpha ?? 0.9;
    ctx.fillStyle = roof;
  }
  // 窗光
  ctx.fillStyle = withA(glow, 0.55);
  ctx.fillRect(x - 8 * s, y - 26 * s, 16 * s, 12 * s);
  // 光晕
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y - 30 * s, 0, x, y - 30 * s, 100 * s);
  g.addColorStop(0, withA(glow, 0.14));
  g.addColorStop(1, withA(glow, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - 110 * s, y - 140 * s, 220 * s, 190 * s);
  ctx.restore();
}

function withA(color, a) {
  const c = String(color || '#ffffff');
  if (c.startsWith('#')) {
    const hex = c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
    return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
  }
  return c;
}

/** 撕裂的署名卷轴（专属原子） */
function signatureScroll(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.3) * h;
  const bw = (p.w ?? 168) * (p.s ?? 1);
  const bh = (p.h ?? 46) * (p.s ?? 1);
  const split = p.split ?? 2;
  const color = p.color || '#efe6d4';
  const ink = p.ink || '#2a2630';
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.angle ?? -0.04);
  ctx.globalAlpha = p.alpha ?? 0.34;
  // 卷轴纸（左右两半被撕开）
  const pieces = [
    [-bw / 2, -split, bw * 0.44, bh],
    [split, -bh * 0.08, bw * 0.46, bh],
  ];
  for (let i = 0; i < pieces.length; i++) {
    const [px, py, pw, ph] = pieces[i];
    ctx.save();
    ctx.translate(px, py);
    // 卷轴轴杆
    ctx.fillStyle = withA('#3a2a24', 0.85);
    ctx.fillRect(-4, -4, 3.2, ph + 8);
    ctx.fillRect(pw + 1, -4, 3.2, ph + 8);
    ctx.fillStyle = withA('#c8a45a', 0.5);
    ctx.fillRect(-4, -4, 3.2, 2);
    ctx.fillRect(pw + 1, -4, 3.2, 2);
    ctx.rotate((i === 0 ? -1 : 1) * 0.02);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(pw, 0);
    ctx.lineTo(pw, ph);
    ctx.lineTo(pw * 0.6, ph - 4);
    ctx.lineTo(pw * 0.4, ph + 2);
    ctx.lineTo(0, ph);
    ctx.closePath();
    ctx.fill();
    // 撕裂口
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.moveTo(pw, 0);
    ctx.lineTo(pw - 3, ph * 0.25);
    ctx.lineTo(pw + 2, ph * 0.6);
    ctx.lineTo(pw, ph);
    ctx.closePath();
    ctx.fill();
    // 墨字行
    ctx.strokeStyle = withA(ink, 0.8);
    ctx.lineWidth = 1.4;
    for (let r = 0; r < 4; r++) {
      const ly = 8 + r * (bh / 5);
      const start = 8 + (r % 2) * 6;
      ctx.beginPath();
      ctx.moveTo(start, ly);
      ctx.lineTo(pw - 10 - (r % 3) * 8, ly + (r % 2 ? 1.5 : -1));
      ctx.stroke();
    }
    // 朱印
    ctx.fillStyle = '#b3342e';
    ctx.fillRect(pw - 22, ph - 18, 10, 10);
    ctx.restore();
  }
  ctx.restore();
}

/** 署名涡旋环（animate 层） */
function vortexRing(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.36) * h;
  const r = (p.r ?? 0.16) * Math.min(w, h);
  const t = env.t || 0;
  const color = p.color || '#9fc8f0';
  const color2 = p.color2 || '#e89ab8';
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = p.alpha ?? 0.3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const rr = r * (1 - i * 0.2);
    const rot = t * (p.speed ?? 0.25) * (i % 2 ? -1 : 1) + i * 0.9;
    ctx.strokeStyle = i % 2 ? color2 : color;
    ctx.lineWidth = 1.6 - i * 0.3;
    ctx.setLineDash([rr * (0.5 - i * 0.08), rr * (0.2 + i * 0.04)]);
    ctx.beginPath();
    ctx.ellipse(0, 0, rr, rr * (0.34 + i * 0.04), rot, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // 中心柔光
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.4);
  g.addColorStop(0, withA(color2, (p.alpha ?? 0.3) * 0.18));
  g.addColorStop(1, withA(color2, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-r * 1.4, -r * 1.4, r * 2.8, r * 2.8);
  ctx.restore();
}

/** 羽毛笔/署名残页 */
function quill(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const x = (p.x ?? 0.2) * w;
  const y = (p.y ?? 0.3) * h;
  const r = p.r ?? 10;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.angle ?? 0.5);
  ctx.globalAlpha = p.alpha ?? 0.4;
  ctx.fillStyle = p.color || '#e8e0d0';
  ctx.beginPath();
  ctx.moveTo(0, -r * 2);
  ctx.quadraticCurveTo(r * 0.7, -r * 0.4, 0, r * 2);
  ctx.quadraticCurveTo(-r * 0.7, -r * 0.4, 0, -r * 2);
  ctx.fill();
  ctx.strokeStyle = withA(p.ink || '#3a3440', 0.8);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, -r * 2);
  ctx.lineTo(0, r * 1.8);
  ctx.stroke();
  ctx.restore();
}

const plateStyle = { scale: 1.07, swayX: 7, swayY: 9, wash: 'rgba(8,8,18,0.26)' };

export const mid = sceneDefaults({
  mode: 'a5_mid',
  stage: 'a5',
  palette: { ...BASE },
  plate: { ...plateStyle },
  layers: [
    { atom: 'glow', params: { x: 0.26, y: 0.22, r: 0.46, color: '#6f9fd8', alpha: 0.14 } },
    { atom: 'glow', params: { x: 0.74, y: 0.22, r: 0.46, color: '#e89ab8', alpha: 0.13 } },
    { atom: 'moon', params: { x: 0.5, y: 0.1, r: 26, color: '#e6e8f0', halo: '#c8d8f0', haloAlpha: 0.14, alpha: 0.7 } },
    { atom: 'starField', params: { count: 42, maxY: 0.32, color: '#ead8e8', alpha: 0.28, seed: 13 } },
    { atom: 'mountainRange', params: { baseY: 0.44, h: 0.06, color: '#0a0c14', alpha: 0.8, layers: 2, peaks: 5, seed: 29 } },
    { atom: 'vortexRing', params: { x: 0.3, y: 0.32, r: 0.13, color: '#8fc0ff', color2: '#c8d8f0', alpha: 0.22, speed: 0.22 }, animate: true },
    { atom: 'vortexRing', params: { x: 0.7, y: 0.3, r: 0.12, color: '#ffb0d0', color2: '#e89ab8', alpha: 0.2, speed: -0.26 }, animate: true },
    { atom: 'mirrorShrine', params: { side: 'left', x: 0.17, y: 0.52, s: 0.9, color: '#243850', roof: '#3e5a78', glow: '#9fc8f0', alpha: 0.9 } },
    { atom: 'mirrorShrine', params: { side: 'right', x: 0.83, y: 0.5, s: 0.86, color: '#3a2434', roof: '#6a3a58', glow: '#e8a0c0', alpha: 0.88 } },
    { atom: 'signatureScroll', params: { x: 0.5, y: 0.29, w: 172, h: 48, alpha: 0.3, split: 3 } },
    { atom: 'quill', params: { x: 0.15, y: 0.34, r: 9, angle: 0.6, color: '#d8e4f0', alpha: 0.35 } },
    { atom: 'quill', params: { x: 0.85, y: 0.4, r: 8, angle: -0.4, color: '#f0d8e4', alpha: 0.32 } },
    { atom: 'seal', params: { x: 0.235, y: 0.63, s: 17, color: '#b3342e', text: '', alpha: 0.4, rotate: -6 } },
    { atom: 'seal', params: { x: 0.765, y: 0.65, s: 15, color: '#6a4a9a', text: '', alpha: 0.35, rotate: 8 } },
    { atom: 'waveBand', params: { y: 0.66, h: 0.14, color: '#8fc0ff', alpha: 0.1 } },
    { atom: 'waveBand', params: { y: 0.7, h: 0.13, color: '#ffb0d0', alpha: 0.09, flip: true } },
    { atom: 'fogBank', params: { y: 0.63, h: 0.18, color: BASE.fog, alpha: 0.16, speed: 5, phase: 0.4 }, animate: true },
    { atom: 'frameBranches', params: { side: 'left', color: '#1a2438', alpha: 0.5, s: 0.9 } },
    { atom: 'frameBranches', params: { side: 'right', color: '#2a1a26', alpha: 0.42, s: 0.85 } },
    { atom: 'grassReeds', params: { color: '#0c0e18', alpha: 0.68, h: 0.2 } },
  ],
  particles: [
    { kind: 'petal', count: 18, colors: ['rgba(143,192,255,0.85)', 'rgba(255,176,208,0.85)', 'rgba(232,154,184,0.8)'] },
    { kind: 'scroll', count: 7, colors: ['rgba(232,224,208,0.75)'] },
    { kind: 'spark', count: 8, colors: ['rgba(159,200,240,0.9)', 'rgba(255,176,208,0.9)'] },
  ],
  fx: { vignette: 0.46, bottomFade: 0.54, topFade: 0.3 },
});

export const boss = sceneDefaults({
  mode: 'a5_boss',
  stage: 'a5',
  palette: { ...BASE, ...(BASE.boss || {}) },
  plate: { ...plateStyle, wash: 'rgba(12,8,24,0.3)' },
  layers: [
    { atom: 'glow', params: { x: 0.5, y: 0.24, r: 0.62, color: '#e0d0ff', alpha: 0.15 } },
    { atom: 'moon', params: { x: 0.5, y: 0.09, r: 30, color: '#f0e0f0', halo: '#d0c0ff', haloAlpha: 0.16, alpha: 0.74 } },
    { atom: 'starField', params: { count: 52, maxY: 0.34, color: '#f0d8f0', alpha: 0.3, seed: 17 } },
    { atom: 'mountainRange', params: { baseY: 0.45, h: 0.07, color: '#0a0612', alpha: 0.85, layers: 2, peaks: 6, seed: 33 } },
    { atom: 'vortexRing', params: { x: 0.5, y: 0.3, r: 0.2, color: '#8fc0ff', color2: '#ffb0d0', alpha: 0.26, speed: 0.32 }, animate: true },
    { atom: 'mirrorShrine', params: { side: 'left', x: 0.14, y: 0.5, s: 1.02, color: '#2a3e5a', roof: '#4a6888', glow: '#a8d0ff', alpha: 0.92 } },
    { atom: 'mirrorShrine', params: { side: 'right', x: 0.86, y: 0.48, s: 0.98, color: '#46283e', roof: '#7a4464', glow: '#ffb0d0', alpha: 0.9 } },
    { atom: 'signatureScroll', params: { x: 0.5, y: 0.28, w: 190, h: 54, alpha: 0.38, split: 6, angle: 0.03 } },
    { atom: 'seal', params: { x: 0.5, y: 0.28, s: 30, color: '#b3342e', text: '署', alpha: 0.3, rotate: -3 } },
    { atom: 'crack', params: { x: 0.5, y: 0.42, len: 0.1, color: '#c8b0e0', alpha: 0.25, angle: 90, seed: 7 } },
    { atom: 'quill', params: { x: 0.12, y: 0.3, r: 10, angle: 0.6, color: '#e0ecff', alpha: 0.4 } },
    { atom: 'quill', params: { x: 0.88, y: 0.36, r: 9, angle: -0.4, color: '#ffe0ec', alpha: 0.36 } },
    { atom: 'lightBeam', params: { x: 0.4, y: 0.05, angle: 24, width: 48, length: 0.5, color: '#b8d0ff', alpha: 0.1 } },
    { atom: 'lightBeam', params: { x: 0.6, y: 0.05, angle: -24, width: 48, length: 0.5, color: '#ffc0d8', alpha: 0.1 } },
    { atom: 'waveBand', params: { y: 0.66, h: 0.15, color: '#8fc0ff', alpha: 0.12 } },
    { atom: 'waveBand', params: { y: 0.71, h: 0.13, color: '#ffb0d0', alpha: 0.11, flip: true } },
    { atom: 'fogBank', params: { y: 0.64, h: 0.2, color: BASE.boss.fog, alpha: 0.19, speed: 6, phase: 1.4 }, animate: true },
    { atom: 'frameBranches', params: { side: 'left', color: '#202a44', alpha: 0.55, s: 1 } },
    { atom: 'frameBranches', params: { side: 'right', color: '#341e30', alpha: 0.5, s: 0.95 } },
    { atom: 'grassReeds', params: { color: '#100c1a', alpha: 0.72, h: 0.22 } },
  ],
  particles: [
    { kind: 'petal', count: 24, colors: ['rgba(159,200,255,0.9)', 'rgba(255,176,208,0.9)'] },
    { kind: 'scroll', count: 10, colors: ['rgba(240,232,220,0.8)'] },
    { kind: 'spark', count: 12, colors: ['rgba(180,210,255,0.9)', 'rgba(255,190,220,0.9)'] },
  ],
  fx: { vignette: 0.5, bottomFade: 0.58, topFade: 0.32, glitch: 0.015 },
});

export const atoms = { mirrorShrine, signatureScroll, vortexRing, quill };
