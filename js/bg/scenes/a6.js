/**
 * A线第6面「一美个 · 哈机密乐园崩坏」场景（P6 绘卷系统）。
 * 剧情：糖果外衣剥落，乐园露出锈迹；苦口婆心的言语深处藏着独占维基的野心。
 * mid：破损摩天轮 + 旋转木马顶棚 + 糖果拱门 + 剥落海报；糖粉与锈屑。
 * boss：摩天轮转动/倾斜、糖衣剥落露黑铁、气球爆裂、灯光故障。
 * 设计说明：docs/level-background-redesign.md §4。
 */
import { sceneDefaults } from '../schema.js';
import { STAGE_PALETTES } from './_stub.js';

const BASE = STAGE_PALETTES.a6;

function withA(color, a) {
  const c = String(color || '#ffffff');
  if (c.startsWith('#')) {
    const hex = c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
    return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
  }
  return c;
}

/** 破损摩天轮（animate 层：缓慢转动） */
function ferrisWheel(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const x = (p.x ?? 0.22) * w;
  const y = (p.y ?? 0.33) * h;
  const r = (p.r ?? 0.15) * Math.min(w, h);
  const t = env.t || 0;
  const speed = p.speed ?? 0.06;
  const color = p.color || '#6a4a3a';
  const accent = p.accent || '#f2a6c0';
  const rust = p.rust ?? 0;
  ctx.save();
  // 支架
  ctx.strokeStyle = withA(color, 0.85);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, y + r * 1.35);
  ctx.lineTo(x, y);
  ctx.lineTo(x + r * 0.7, y + r * 1.35);
  ctx.stroke();
  ctx.translate(x, y);
  ctx.rotate((p.tilt ?? 0) + t * speed);
  // 外圈
  ctx.strokeStyle = withA(accent, 0.5);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = withA(color, 0.7);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2);
  ctx.stroke();
  // 吊舱
  const cabins = 10;
  for (let i = 0; i < cabins; i++) {
    const a = (i / cabins) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.strokeStyle = withA(color, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r);
    ctx.stroke();
    ctx.fillStyle = i % 2 ? withA(accent, 0.65) : withA('#9fe0c8', 0.55);
    ctx.fillRect(-3.4, -r - 6, 6.8, 6);
    // 断裂吊舱
    if (rust > 0 && i % 4 === 0) {
      ctx.fillStyle = withA('#3a1c18', 0.8);
      ctx.fillRect(-3.4, -r - 6, 6.8, 3);
    }
    ctx.restore();
  }
  // 轮辐
  ctx.strokeStyle = withA(color, 0.5);
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i / 8) * Math.PI * 2 + 0.2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r * 0.84);
    ctx.stroke();
    ctx.restore();
  }
  // 中心
  ctx.fillStyle = withA('#2a1418', 0.9);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  if (rust > 0) {
    // 锈斑
    ctx.fillStyle = withA('#8a4a3a', rust * 0.5);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.7;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 旋转木马顶棚 */
function carouselCanopy(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const x = (p.x ?? 0.8) * w;
  const y = (p.y ?? 0.56) * h;
  const bw = (p.w ?? 88);
  const bh = (p.h ?? 34);
  const color = p.color || '#f2a6c0';
  const color2 = p.color2 || '#9fe0c8';
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 0.8;
  // 帐篷顶（条纹）
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? withA(color, 0.72) : withA(color2, 0.6);
    ctx.beginPath();
    ctx.moveTo(x, y - bh);
    ctx.lineTo(x - bw / 2 + (i / 8) * bw, y);
    ctx.lineTo(x - bw / 2 + ((i + 1) / 8) * bw, y);
    ctx.closePath();
    ctx.fill();
  }
  // 顶冠
  ctx.fillStyle = withA('#e8cf9a', 0.8);
  ctx.fillRect(x - 2, y - bh - 12, 4, 12);
  ctx.beginPath();
  ctx.arc(x, y - bh - 14, 3.4, 0, Math.PI * 2);
  ctx.fill();
  // 柱子
  ctx.fillStyle = withA('#3a2028', 0.8);
  ctx.fillRect(x - bw * 0.4, y, 2.4, bh * 1.5);
  ctx.fillRect(x + bw * 0.4 - 2.4, y, 2.4, bh * 1.5);
  // 灯泡
  for (let i = 0; i < 6; i++) {
    const bx = x - bw / 2 + (i / 5) * bw;
    ctx.fillStyle = i % 2 ? '#ffe8b0' : '#ffd0e0';
    ctx.globalAlpha = (p.alpha ?? 0.8) * (0.4 + 0.4 * Math.abs(Math.sin((env.t || 0) * 2 + i)));
    ctx.beginPath();
    ctx.arc(bx, y - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 糖果拱门（入口） */
function candyArch(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const x = (p.x ?? 0.5) * w;
  const baseY = (p.y ?? 0.6) * h;
  const span = p.span ?? 120;
  const color = p.color || '#f2a6c0';
  const color2 = p.color2 || '#9fe0c8';
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 0.7;
  for (const side of [-1, 1]) {
    const px = x + side * span;
    // 拐杖糖柱
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(px, baseY);
    ctx.lineTo(px, baseY - 96);
    ctx.quadraticCurveTo(px + side * 18, baseY - 118, px + side * 32, baseY - 100);
    ctx.stroke();
    ctx.strokeStyle = withA('#fff0f4', 0.55);
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) {
      const yy = baseY - 6 - i * 9;
      ctx.beginPath();
      ctx.moveTo(px - 3.4, yy);
      ctx.lineTo(px + 3.4, yy - 4);
      ctx.stroke();
    }
  }
  // 拱顶横幅
  ctx.fillStyle = withA(color2, 0.42);
  ctx.fillRect(x - span * 0.9, baseY - 128, span * 1.8, 20);
  ctx.strokeStyle = withA('#e8cf9a', 0.6);
  ctx.lineWidth = 1;
  ctx.strokeRect(x - span * 0.9, baseY - 128, span * 1.8, 20);
  ctx.fillStyle = '#2a1418';
  ctx.font = 'bold 15px "Noto Serif CJK SC", "Microsoft YaHei", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.text || '哈机密乐园', x, baseY - 118);
  ctx.restore();
}

/** 剥落海报 */
function peelingPoster(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const items = p.items || [
    { x: 0.1, y: 0.28, w: 26, h: 36, rot: -0.08 },
    { x: 0.9, y: 0.35, w: 22, h: 32, rot: 0.1 },
    { x: 0.82, y: 0.2, w: 18, h: 26, rot: -0.14 },
  ];
  ctx.save();
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const x = it.x * w;
    const y = it.y * h;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(it.rot + Math.sin((env.t || 0) * 0.8 + i) * 0.008);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = i % 2 ? '#f0dcc8' : '#e8c8d0';
    ctx.fillRect(-it.w / 2, -it.h / 2, it.w, it.h);
    // 剥落一角
    ctx.fillStyle = withA('#2a1418', 0.5);
    ctx.beginPath();
    ctx.moveTo(it.w / 2, -it.h / 2);
    ctx.lineTo(it.w / 2 - 8, -it.h / 2 + 3);
    ctx.lineTo(it.w / 2, -it.h / 2 + 10);
    ctx.closePath();
    ctx.fill();
    // 字行
    ctx.strokeStyle = withA('#5a3038', 0.6);
    ctx.lineWidth = 1;
    for (let r = 0; r < 4; r++) {
      ctx.beginPath();
      ctx.moveTo(-it.w * 0.32, -it.h * 0.25 + r * 5);
      ctx.lineTo(it.w * 0.3 - (r % 2) * 5, -it.h * 0.25 + r * 5);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

/** 糖果地面条纹（静态，压在下三分之一） */
function candyStripes(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const y0 = (p.y ?? 0.72) * h;
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 0.06;
  for (let i = -4; i < 10; i++) {
    ctx.fillStyle = i % 2 ? (p.color || '#f2a6c0') : (p.color2 || '#9fe0c8');
    ctx.beginPath();
    const x = (i / 7) * w;
    ctx.moveTo(x, h);
    ctx.lineTo(x + w * 0.06, y0);
    ctx.lineTo(x + w * 0.1, y0);
    ctx.lineTo(x + w * 0.04, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

const plateStyle = { scale: 1.07, swayX: 7, swayY: 9, wash: 'rgba(24,8,14,0.24)' };

export const mid = sceneDefaults({
  mode: 'a6_mid',
  stage: 'a6',
  palette: { ...BASE },
  plate: { ...plateStyle },
  layers: [
    { atom: 'glow', params: { x: 0.66, y: 0.2, r: 0.6, color: BASE.glow, alpha: 0.15 } },
    { atom: 'moon', params: { x: 0.72, y: 0.13, r: 24, color: '#f4e4d8', halo: '#f2a6c0', haloAlpha: 0.14, alpha: 0.62 } },
    { atom: 'starField', params: { count: 34, maxY: 0.3, color: '#f6e0e8', alpha: 0.24, seed: 11 } },
    { atom: 'cloudBand', params: { y: 0.22, h: 0.08, color: '#c090a0', alpha: 0.11, speed: 2 }, animate: true },
    { atom: 'mountainRange', params: { baseY: 0.46, h: 0.05, color: '#16090f', alpha: 0.75, layers: 1, peaks: 4, seed: 37 } },
    { atom: 'ferrisWheel', params: { x: 0.21, y: 0.34, r: 0.15, color: '#6a4a3a', accent: '#f2a6c0', speed: 0.05 } },
    { atom: 'carouselCanopy', params: { x: 0.79, y: 0.55, w: 94, h: 34, color: '#f2a6c0', color2: '#9fe0c8', alpha: 0.78 } },
    { atom: 'candyArch', params: { x: 0.5, y: 0.63, span: 104, text: '哈机密乐园', alpha: 0.62 } },
    { atom: 'peelingPoster', params: {} },
    { atom: 'candyStripes', params: { y: 0.78, alpha: 0.08 } },
    { atom: 'fogBank', params: { y: 0.64, h: 0.18, color: BASE.fog, alpha: 0.16, speed: 5, phase: 0.8 }, animate: true },
    { atom: 'frameBranches', params: { side: 'right', color: '#2a1218', alpha: 0.5, s: 0.85 } },
    { atom: 'frameBranches', params: { side: 'left', color: '#241016', alpha: 0.42, s: 0.75 } },
    { atom: 'grassReeds', params: { color: '#140a0e', alpha: 0.65, h: 0.2 } },
  ],
  particles: [
    { kind: 'candy', count: 14, colors: ['rgba(244,170,200,0.9)', 'rgba(159,224,200,0.85)', 'rgba(255,232,176,0.85)'] },
    { kind: 'bubble', count: 8, colors: ['rgba(242,166,192,0.5)'] },
    { kind: 'leaf', count: 6, colors: ['rgba(138,74,58,0.75)'] },
    { kind: 'spark', count: 6, colors: ['rgba(232,207,154,0.8)'] },
  ],
  fx: { vignette: 0.46, bottomFade: 0.55, topFade: 0.3 },
});

export const boss = sceneDefaults({
  mode: 'a6_boss',
  stage: 'a6',
  palette: { ...BASE, ...(BASE.boss || {}) },
  plate: { ...plateStyle, wash: 'rgba(34,10,16,0.32)' },
  layers: [
    { atom: 'glow', params: { x: 0.5, y: 0.2, r: 0.7, color: '#ffd890', alpha: 0.15 } },
    { atom: 'moon', params: { x: 0.3, y: 0.1, r: 30, color: '#f6e0d8', halo: '#ffb8d0', haloAlpha: 0.18, alpha: 0.7 } },
    { atom: 'starField', params: { count: 46, maxY: 0.32, color: '#ffe0e8', alpha: 0.26, seed: 19 } },
    { atom: 'cloudBand', params: { y: 0.2, h: 0.09, color: '#d0a0b0', alpha: 0.14, speed: 3 }, animate: true },
    { atom: 'mountainRange', params: { baseY: 0.46, h: 0.06, color: '#1a0a10', alpha: 0.8, layers: 2, peaks: 5, seed: 43 } },
    { atom: 'ferrisWheel', params: { x: 0.24, y: 0.32, r: 0.18, color: '#5a3a2e', accent: '#ffb8d0', speed: 0.14, tilt: -0.06, rust: 1 } },
    { atom: 'carouselCanopy', params: { x: 0.78, y: 0.54, w: 100, h: 36, color: '#ffb8d0', color2: '#ffd890', alpha: 0.82 } },
    { atom: 'candyArch', params: { x: 0.5, y: 0.62, span: 112, text: '乐园崩坏', alpha: 0.72, color: '#e89ab8', color2: '#ffd890' } },
    { atom: 'peelingPoster', params: { items: [
      { x: 0.09, y: 0.26, w: 30, h: 40, rot: -0.1 },
      { x: 0.91, y: 0.32, w: 26, h: 36, rot: 0.12 },
      { x: 0.84, y: 0.18, w: 20, h: 28, rot: -0.16 },
      { x: 0.14, y: 0.14, w: 16, h: 22, rot: 0.2 },
    ] } },
    { atom: 'candyStripes', params: { y: 0.8, alpha: 0.1, color: '#e89ab8', color2: '#ffd890' } },
    { atom: 'crack', params: { x: 0.63, y: 0.42, len: 0.08, color: '#ffd890', alpha: 0.2, angle: 75, seed: 9 } },
    { atom: 'fogBank', params: { y: 0.66, h: 0.2, color: BASE.boss.fog, alpha: 0.2, speed: 6, phase: 1.9 }, animate: true },
    { atom: 'frameBranches', params: { side: 'right', color: '#341a20', alpha: 0.55, s: 0.95 } },
    { atom: 'frameBranches', params: { side: 'left', color: '#2a141a', alpha: 0.48, s: 0.85 } },
    { atom: 'grassReeds', params: { color: '#180c10', alpha: 0.7, h: 0.22 } },
  ],
  particles: [
    { kind: 'candy', count: 18, colors: ['rgba(255,184,208,0.9)', 'rgba(255,216,144,0.9)', 'rgba(159,224,200,0.8)'] },
    { kind: 'bubble', count: 12, colors: ['rgba(255,184,208,0.55)', 'rgba(255,216,144,0.5)'] },
    { kind: 'leaf', count: 10, colors: ['rgba(138,74,58,0.8)'] },
    { kind: 'spark', count: 8, colors: ['rgba(255,216,144,0.9)'] },
  ],
  fx: { vignette: 0.5, bottomFade: 0.6, topFade: 0.32, glitch: 0.03 },
});

export const atoms = {
  ferrisWheel, carouselCanopy, candyArch, peelingPoster, candyStripes,
};
