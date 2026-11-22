/**
 * B线第4面「赌人时尚 · 独轮创车冲击」场景（P6 绘卷系统）。
 * 剧情：独轮碾过螺旋的街巷；狂妄的哲思与「创」字诀如潮水漫过脚踝。
 * mid：血色螺旋街、巨型棘轮/独轮、荆棘与「创」字幡。
 * boss：巨轮加速、荆棘暴长、血色光柱。
 * 设计说明：docs/level-background-redesign.md §4。
 */
import { sceneDefaults } from '../schema.js';
import { STAGE_PALETTES } from './_stub.js';

const BASE = STAGE_PALETTES.b4;

function withA(color, a) {
  const c = String(color || '#ffffff');
  if (c.startsWith('#')) {
    const hex = c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
    return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
  }
  return c;
}

/** 棘轮/独轮（animate 层） */
function spikedWheel(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const x = (p.x ?? 0.28) * w;
  const y = (p.y ?? 0.34) * h;
  const r = (p.r ?? 0.12) * Math.min(w, h);
  const t = env.t || 0;
  const color = p.color || '#c0263a';
  const dark = p.dark || '#1a0508';
  const glow = p.glow || '#ff6b35';
  const dir = p.dir ?? 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((p.angle ?? 0) + t * (p.speed ?? 0.5) * dir);
  // 轮辐
  ctx.strokeStyle = withA(color, 0.7);
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i / 8) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, r);
    ctx.stroke();
    ctx.restore();
  }
  // 轮辋
  ctx.strokeStyle = withA(color, 0.9);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = withA(glow, 0.28);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.06, 0, Math.PI * 2);
  ctx.stroke();
  // 尖刺
  ctx.fillStyle = withA(dark, 0.9);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(r * 0.98, -r * 0.07);
    ctx.lineTo(r * 1.24, 0);
    ctx.lineTo(r * 0.98, r * 0.07);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // 轴心
  ctx.fillStyle = withA(dark, 0.95);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = withA(glow, 0.6);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // 轮缘光
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 1.8);
  g.addColorStop(0, withA(glow, 0.08));
  g.addColorStop(1, withA(glow, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 1.8, y - r * 1.8, r * 3.6, r * 3.6);
  ctx.restore();
}

/** 螺旋街巷（静态底） */
function spiralStreet(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const y0 = (p.y ?? 0.55) * h;
  const color = p.color || '#ff6b35';
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 0.12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(w / 2, y0 + i * 26, w * (0.2 + i * 0.16), 12 + i * 10, 0, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }
  // 中轴碎石
  ctx.fillStyle = withA('#d9c8b0', 0.14);
  for (let i = 0; i < 26; i++) {
    const px = w / 2 + Math.sin(i * 2.1) * w * (0.05 + i * 0.008);
    const py = y0 + i * 6;
    ctx.fillRect(px, py, 2, 1.4);
  }
  ctx.restore();
}

/** 荆棘藤蔓 */
function thornVines(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const color = p.color || '#3a0a12';
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 0.7;
  for (const side of [-1, 1]) {
    const baseX = side < 0 ? 0 : w;
    const dir = -side;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(baseX, h * 0.35);
    ctx.bezierCurveTo(baseX + dir * w * 0.14, h * 0.42, baseX + dir * w * 0.1, h * 0.56, baseX + dir * w * 0.24, h * 0.62);
    ctx.stroke();
    // 尖刺
    ctx.fillStyle = color;
    for (let i = 0; i < 9; i++) {
      const px = baseX + dir * w * (0.04 + i * 0.022);
      const py = h * (0.4 + i * 0.024);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - dir * 7, py - 5);
      ctx.lineTo(px + dir * 4, py - 2);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

const plateStyle = { scale: 1.07, swayX: 8, swayY: 10, wash: 'rgba(18,3,6,0.28)' };

export const mid = sceneDefaults({
  mode: 'b4_mid',
  stage: 'b4',
  palette: { ...BASE },
  plate: { ...plateStyle },
  layers: [
    { atom: 'glow', params: { x: 0.34, y: 0.26, r: 0.55, color: BASE.glow, alpha: 0.14 } },
    { atom: 'moon', params: { x: 0.75, y: 0.14, r: 26, color: '#e0b0a0', halo: '#ff4a55', haloAlpha: 0.16, alpha: 0.6 } },
    { atom: 'cloudBand', params: { y: 0.22, h: 0.09, color: '#a05a62', alpha: 0.13, speed: 3 }, animate: true },
    { atom: 'mountainRange', params: { baseY: 0.46, h: 0.06, color: '#140407', alpha: 0.85, layers: 2, peaks: 5, seed: 19 } },
    { atom: 'spikedWheel', params: { x: 0.26, y: 0.35, r: 0.13, color: '#c0263a', glow: '#ff6b35', speed: 0.45, dir: -1 } },
    { atom: 'spiralStreet', params: { y: 0.56, alpha: 0.13 } },
    { atom: 'thornVines', params: { color: '#3a0a12', alpha: 0.7 } },
    { atom: 'banner', params: { x: 0.87, y: 0.16, w: 30, h: 88, color: '#6a0a14', text: '创', textColor: '#ffd9c8', alpha: 0.62, angle: 5 } },
    { atom: 'banner', params: { x: 0.1, y: 0.28, w: 22, h: 64, color: '#4a0810', text: '狂', textColor: '#ffb199', alpha: 0.5, angle: -4 } },
    { atom: 'fogBank', params: { y: 0.65, h: 0.18, color: BASE.fog, alpha: 0.16, speed: 6, phase: 0.5 }, animate: true },
    { atom: 'frameBranches', params: { side: 'left', color: '#1e060a', alpha: 0.55, s: 0.9 } },
    { atom: 'frameBranches', params: { side: 'right', color: '#1a0508', alpha: 0.5, s: 0.85 } },
    { atom: 'grassReeds', params: { color: '#120306', alpha: 0.7, h: 0.2 } },
  ],
  particles: [
    { kind: 'ember', count: 16, colors: ['rgba(255,140,80,0.9)', 'rgba(200,40,60,0.85)'] },
    { kind: 'spark', count: 12, colors: ['rgba(255,160,100,0.9)', 'rgba(255,90,70,0.85)'] },
    { kind: 'paper', count: 8, colors: ['rgba(217,200,176,0.7)'] },
  ],
  fx: { vignette: 0.48, bottomFade: 0.58, topFade: 0.3 },
});

export const boss = sceneDefaults({
  mode: 'b4_boss',
  stage: 'b4',
  palette: { ...BASE, ...(BASE.boss || {}) },
  plate: { ...plateStyle, wash: 'rgba(26,4,8,0.34)' },
  layers: [
    { atom: 'glow', params: { x: 0.3, y: 0.24, r: 0.66, color: '#ffb080', alpha: 0.16 } },
    { atom: 'moon', params: { x: 0.76, y: 0.12, r: 30, color: '#e8b0a0', halo: '#ff2f45', haloAlpha: 0.2, alpha: 0.66 } },
    { atom: 'cloudBand', params: { y: 0.21, h: 0.1, color: '#c06a72', alpha: 0.15, speed: 4 }, animate: true },
    { atom: 'mountainRange', params: { baseY: 0.47, h: 0.07, color: '#160308', alpha: 0.9, layers: 2, peaks: 6, seed: 27 } },
    { atom: 'spikedWheel', params: { x: 0.24, y: 0.34, r: 0.17, color: '#ff2f45', glow: '#ffa040', speed: 0.9, dir: -1 } },
    { atom: 'spikedWheel', params: { x: 0.78, y: 0.3, r: 0.09, color: '#c0263a', glow: '#ff6b35', speed: -0.6, dir: 1 } },
    { atom: 'spiralStreet', params: { y: 0.55, alpha: 0.2, color: '#ff8a5a' } },
    { atom: 'thornVines', params: { color: '#4a0c14', alpha: 0.85 } },
    { atom: 'banner', params: { x: 0.88, y: 0.13, w: 34, h: 100, color: '#7a0a14', text: '创!', textColor: '#ffe0d0', alpha: 0.72, angle: 5 } },
    { atom: 'banner', params: { x: 0.09, y: 0.24, w: 26, h: 76, color: '#5a0810', text: '灵魂', textColor: '#ffb199', alpha: 0.6, angle: -5 } },
    { atom: 'lightBeam', params: { x: 0.2, y: 0.06, angle: 22, width: 64, length: 0.55, color: '#ff5a4a', alpha: 0.12 } },
    { atom: 'lightBeam', params: { x: 0.8, y: 0.06, angle: -22, width: 64, length: 0.55, color: '#ff5a4a', alpha: 0.12 } },
    { atom: 'fogBank', params: { y: 0.66, h: 0.2, color: BASE.boss.fog, alpha: 0.19, speed: 7, phase: 1.6 }, animate: true },
    { atom: 'frameBranches', params: { side: 'left', color: '#260810', alpha: 0.6, s: 1 } },
    { atom: 'frameBranches', params: { side: 'right', color: '#22070e', alpha: 0.55, s: 0.95 } },
    { atom: 'grassReeds', params: { color: '#160408', alpha: 0.75, h: 0.22 } },
  ],
  particles: [
    { kind: 'ember', count: 22, colors: ['rgba(255,160,90,0.95)', 'rgba(255,60,80,0.9)'] },
    { kind: 'spark', count: 16, colors: ['rgba(255,180,120,0.9)', 'rgba(255,80,60,0.85)'] },
    { kind: 'paper', count: 10, colors: ['rgba(217,200,176,0.75)'] },
  ],
  fx: { vignette: 0.52, bottomFade: 0.62, topFade: 0.32, glitch: 0.02 },
});

export const atoms = { spikedWheel, spiralStreet, thornVines };
