/**
 * B线第6面「拉斯特神炫 · 虾油风油精终局」场景（P6 绘卷系统）。
 * 剧情：虾油色的雾气升起，宝瓶碎裂无声；防御塔的黑影自雾中浮现。
 * mid：毒绿迷雾、宝塔防御塔、倾斜宝瓶、王座台阶。
 * boss：宝瓶碎裂、毒雾翻涌、塔尖齐亮。
 * 设计说明：docs/level-background-redesign.md §4。
 */
import { sceneDefaults } from '../schema.js';
import { STAGE_PALETTES } from './_stub.js';

const BASE = STAGE_PALETTES.b6;

function withA(color, a) {
  const c = String(color || '#ffffff');
  if (c.startsWith('#')) {
    const hex = c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
    return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
  }
  return c;
}

/** 巨大宝瓶（专属原子） */
function spiritBottle(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const x = (p.x ?? 0.62) * w;
  const y = (p.y ?? 0.56) * h;
  const s = p.s ?? 1;
  const color = p.color || '#2a2a16';
  const rim = p.rim || '#cfe8a0';
  const cracked = !!p.cracked;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.tilt ?? 0.06);
  ctx.globalAlpha = p.alpha ?? 0.8;
  // 瓶身
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-13 * s, -58 * s);
  ctx.lineTo(13 * s, -58 * s);
  ctx.lineTo(15 * s, -34 * s);
  ctx.quadraticCurveTo(40 * s, -22 * s, 40 * s, 12 * s);
  ctx.quadraticCurveTo(40 * s, 44 * s, 0, 46 * s);
  ctx.quadraticCurveTo(-40 * s, 44 * s, -40 * s, 12 * s);
  ctx.quadraticCurveTo(-40 * s, -22 * s, -15 * s, -34 * s);
  ctx.closePath();
  ctx.fill();
  // 瓶口
  ctx.fillStyle = withA('#1a1a0e', 0.95);
  ctx.fillRect(-16 * s, -68 * s, 32 * s, 11 * s);
  ctx.fillStyle = withA(rim, 0.5);
  ctx.fillRect(-15 * s, -67 * s, 30 * s, 2);
  // 纹样
  ctx.strokeStyle = withA(rim, 0.32);
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, -6 * s + i * 15 * s, 28 * s, 6 * s, 0, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // 裂纹
  if (cracked) {
    ctx.strokeStyle = withA('#f0ffc0', 0.55);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-6 * s, -66 * s);
    ctx.lineTo(2 * s, -40 * s);
    ctx.lineTo(-8 * s, -18 * s);
    ctx.lineTo(6 * s, 6 * s);
    ctx.lineTo(-2 * s, 38 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12 * s, -58 * s);
    ctx.lineTo(6 * s, -34 * s);
    ctx.lineTo(18 * s, -20 * s);
    ctx.stroke();
    // 漏出的光
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 6 * s, 0, 0, 6 * s, 70 * s);
    g.addColorStop(0, withA('#d0ff80', 0.18));
    g.addColorStop(1, withA('#d0ff80', 0));
    ctx.fillStyle = g;
    ctx.fillRect(-70 * s, -64 * s, 140 * s, 110 * s);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

/** 王座台阶 */
function throneSteps(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const y0 = (p.y ?? 0.7) * h;
  const color = p.color || '#161c0a';
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 0.7;
  for (let i = 0; i < 3; i++) {
    const bw = w * (0.44 - i * 0.1);
    ctx.fillStyle = color;
    ctx.fillRect(w / 2 - bw / 2, y0 + i * 14, bw, 12);
    ctx.fillStyle = withA(p.glow || '#b8e060', 0.18);
    ctx.fillRect(w / 2 - bw / 2, y0 + i * 14, bw, 1);
  }
  ctx.restore();
}

/** 毒雾涡眼（animate 层） */
function miasmaSwirl(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const x = (p.x ?? 0.5) * w;
  const y = (p.y ?? 0.42) * h;
  const r = (p.r ?? 0.2) * Math.min(w, h);
  const t = env.t || 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * (p.speed ?? 0.05));
  ctx.globalAlpha = p.alpha ?? 0.2;
  for (let i = 0; i < 5; i++) {
    ctx.rotate(0.8);
    ctx.strokeStyle = withA(p.color || '#a0e030', 0.5 - i * 0.06);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * (0.4 + i * 0.16), r * (0.14 + i * 0.05), 0, 0.2, Math.PI * 1.4);
    ctx.stroke();
  }
  ctx.restore();
}

const plateStyle = { scale: 1.07, swayX: 7, swayY: 9, wash: 'rgba(9,16,2,0.28)' };

export const mid = sceneDefaults({
  mode: 'b6_mid',
  stage: 'b6',
  palette: { ...BASE },
  plate: { ...plateStyle },
  layers: [
    { atom: 'glow', params: { x: 0.5, y: 0.28, r: 0.62, color: BASE.glow, alpha: 0.13 } },
    { atom: 'moon', params: { x: 0.22, y: 0.12, r: 22, color: '#cfe8a0', halo: '#7fb52e', haloAlpha: 0.14, alpha: 0.5 } },
    { atom: 'cloudBand', params: { y: 0.2, h: 0.09, color: '#8aa05a', alpha: 0.12, speed: 2 }, animate: true },
    { atom: 'mountainRange', params: { baseY: 0.45, h: 0.06, color: '#0a1004', alpha: 0.85, layers: 2, peaks: 5, seed: 23 } },
    { atom: 'pagoda', params: { x: 0.17, y: 0.5, s: 0.62, tiers: 4, color: '#0f1608', window: '#a0e030', glow: true, glowColor: '#7fb52e', alpha: 0.85 } },
    { atom: 'pagoda', params: { x: 0.84, y: 0.47, s: 0.54, tiers: 3, color: '#0f1608', window: '#a0e030', glow: true, glowColor: '#7fb52e', alpha: 0.82 } },
    { atom: 'miasmaSwirl', params: { x: 0.5, y: 0.4, r: 0.2, alpha: 0.16, speed: 0.06 } },
    { atom: 'spiritBottle', params: { x: 0.62, y: 0.58, s: 0.9, alpha: 0.72, rim: '#cfe8a0' } },
    { atom: 'throneSteps', params: { y: 0.72, alpha: 0.6 } },
    { atom: 'banner', params: { x: 0.09, y: 0.26, w: 24, h: 72, color: '#1e2a0a', text: '虾油', textColor: '#cfe8a0', alpha: 0.5, angle: -4 } },
    { atom: 'banner', params: { x: 0.92, y: 0.3, w: 22, h: 64, color: '#182208', text: '王座', textColor: '#cfe8a0', alpha: 0.46, angle: 4 } },
    { atom: 'fogBank', params: { y: 0.58, h: 0.22, color: BASE.fog, alpha: 0.2, speed: 5, phase: 0.7 }, animate: true },
    { atom: 'fogBank', params: { y: 0.76, h: 0.18, color: '#cfe8a0', alpha: 0.12, speed: 8, phase: 2.2 }, animate: true },
    { atom: 'frameBranches', params: { side: 'left', color: '#0e1606', alpha: 0.55, s: 0.9 } },
    { atom: 'frameBranches', params: { side: 'right', color: '#0c1404', alpha: 0.5, s: 0.8 } },
    { atom: 'grassReeds', params: { color: '#0a1004', alpha: 0.7, h: 0.2 } },
  ],
  particles: [
    { kind: 'bubble', count: 16, colors: ['rgba(180,240,120,0.45)', 'rgba(160,220,110,0.4)'] },
    { kind: 'spore', count: 18, colors: ['rgba(170,220,120,0.5)', 'rgba(130,180,90,0.45)'] },
    { kind: 'ember', count: 6, colors: ['rgba(200,255,140,0.7)'] },
  ],
  fx: { vignette: 0.5, bottomFade: 0.58, topFade: 0.34 },
});

export const boss = sceneDefaults({
  mode: 'b6_boss',
  stage: 'b6',
  palette: { ...BASE, ...(BASE.boss || {}) },
  plate: { ...plateStyle, wash: 'rgba(12,22,2,0.34)' },
  layers: [
    { atom: 'glow', params: { x: 0.58, y: 0.3, r: 0.7, color: '#d0ff80', alpha: 0.16 } },
    { atom: 'moon', params: { x: 0.2, y: 0.1, r: 26, color: '#e0ffb0', halo: '#a0e030', haloAlpha: 0.16, alpha: 0.55 } },
    { atom: 'cloudBand', params: { y: 0.18, h: 0.1, color: '#a0c060', alpha: 0.14, speed: 3 }, animate: true },
    { atom: 'mountainRange', params: { baseY: 0.46, h: 0.07, color: '#0c1202', alpha: 0.9, layers: 2, peaks: 6, seed: 31 } },
    { atom: 'pagoda', params: { x: 0.15, y: 0.5, s: 0.72, tiers: 4, color: '#121c08', window: '#d0ff80', glow: true, glowColor: '#a0e030', alpha: 0.9 } },
    { atom: 'pagoda', params: { x: 0.86, y: 0.46, s: 0.64, tiers: 3, color: '#121c08', window: '#d0ff80', glow: true, glowColor: '#a0e030', alpha: 0.88 } },
    { atom: 'miasmaSwirl', params: { x: 0.5, y: 0.42, r: 0.26, alpha: 0.22, speed: 0.1, color: '#d0ff80' } },
    { atom: 'spiritBottle', params: { x: 0.6, y: 0.6, s: 1.05, alpha: 0.86, rim: '#f0ffc0', cracked: true, tilt: 0.12 } },
    { atom: 'throneSteps', params: { y: 0.74, alpha: 0.7, glow: '#d0ff80' } },
    { atom: 'banner', params: { x: 0.07, y: 0.22, w: 28, h: 84, color: '#26340c', text: '神炫', textColor: '#f0ffc0', alpha: 0.6, angle: -4 } },
    { atom: 'banner', params: { x: 0.94, y: 0.26, w: 26, h: 76, color: '#1e2a0a', text: '王座', textColor: '#d0ff80', alpha: 0.55, angle: 4 } },
    { atom: 'lightBeam', params: { x: 0.15, y: 0.28, angle: 30, width: 50, length: 0.4, color: '#c0ff70', alpha: 0.1 } },
    { atom: 'lightBeam', params: { x: 0.85, y: 0.28, angle: -30, width: 50, length: 0.4, color: '#c0ff70', alpha: 0.1 } },
    { atom: 'fogBank', params: { y: 0.56, h: 0.24, color: BASE.boss.fog, alpha: 0.24, speed: 6, phase: 1.3 }, animate: true },
    { atom: 'fogBank', params: { y: 0.78, h: 0.2, color: '#e0ffb0', alpha: 0.15, speed: 9, phase: 2.8 }, animate: true },
    { atom: 'frameBranches', params: { side: 'left', color: '#101a06', alpha: 0.6, s: 1 } },
    { atom: 'frameBranches', params: { side: 'right', color: '#0e1804', alpha: 0.55, s: 0.9 } },
    { atom: 'grassReeds', params: { color: '#0c1202', alpha: 0.75, h: 0.22 } },
  ],
  particles: [
    { kind: 'bubble', count: 22, colors: ['rgba(200,255,140,0.5)', 'rgba(170,240,110,0.45)'] },
    { kind: 'spore', count: 24, colors: ['rgba(190,240,130,0.55)', 'rgba(150,210,100,0.5)'] },
    { kind: 'ember', count: 10, colors: ['rgba(220,255,160,0.75)'] },
  ],
  fx: { vignette: 0.54, bottomFade: 0.62, topFade: 0.36, glitch: 0.02 },
});

export const atoms = { spiritBottle, throneSteps, miasmaSwirl };
