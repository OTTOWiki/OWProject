/**
 * B线第5面「棍电噢哆 · 推退辩论战」场景（P6 绘卷系统）。
 * 剧情：暗巷霓虹一明一灭，破皮鞋叩地有声；推诿、反问与甩锅谱成一曲傲娇的戏谑。
 * mid：雨夜暗巷、木楼剪影、灯笼与霓虹招牌（中单/推/退/锅）、积水反光。
 * boss：招牌全亮、雨势加大、霓虹故障闪。
 * 设计说明：docs/level-background-redesign.md §4。
 */
import { sceneDefaults } from '../schema.js';
import { STAGE_PALETTES } from './_stub.js';
import { lantern } from '../atoms.js';

const BASE = STAGE_PALETTES.b5;

function withA(color, a) {
  const c = String(color || '#ffffff');
  if (c.startsWith('#')) {
    const hex = c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
    return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
  }
  return c;
}

/** 暗巷两侧木楼剪影（专属原子，静态） */
function alleyBuildings(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const color = p.color || '#0a0d16';
  const win = p.window || '#ffb15c';
  ctx.save();
  for (const side of [-1, 1]) {
    const edge = side < 0 ? 0 : w;
    const dir = -side;
    for (let layer = 0; layer < 2; layer++) {
      const inset = 8 + layer * 26;
      const bw = w * (0.16 + layer * 0.05);
      const top = h * (0.2 - layer * 0.05);
      const alpha = 0.92 - layer * 0.32;
      ctx.globalAlpha = (p.alpha ?? 0.9) * alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      if (side < 0) {
        ctx.moveTo(edge, top + h * 0.05);
        ctx.lineTo(edge + bw, top);
        ctx.lineTo(edge + bw * 0.92, h);
        ctx.lineTo(edge, h);
      } else {
        ctx.moveTo(edge, top + h * 0.05);
        ctx.lineTo(edge - bw, top);
        ctx.lineTo(edge - bw * 0.92, h);
        ctx.lineTo(edge, h);
      }
      ctx.closePath();
      ctx.fill();
      // 屋顶挑檐
      ctx.fillStyle = withA('#161a24', 0.9);
      ctx.fillRect(edge + dir * (bw * 0.2 + inset), h * (0.2 - layer * 0.02), bw * 0.8, 3);
      // 窗
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 2; c++) {
          const lit = env.rand ? env.rand(seedFor(side, layer, r, c)) : 0.5;
          if (lit < 0.45) continue;
          ctx.fillStyle = withA(lit > 0.8 ? '#ffd890' : win, 0.68);
          const wx = edge + dir * (bw * (0.34 + c * 0.2) + inset);
          const wy = top + h * (0.07 + r * 0.055);
          ctx.fillRect(wx - 5, wy, 10, 6);
          ctx.globalAlpha *= 0.35;
          ctx.fillStyle = withA(win, 0.5);
          ctx.fillRect(wx - 8, wy + 8, 16, 2);
        }
      }
    }
  }
  // 巷底（远景，渐隐到地面）
  const floor = ctx.createLinearGradient(0, h * 0.42, 0, h);
  floor.addColorStop(0, 'rgba(5,7,13,0)');
  floor.addColorStop(0.5, 'rgba(5,7,13,0.32)');
  floor.addColorStop(1, 'rgba(4,5,10,0.62)');
  ctx.globalAlpha = p.alpha ?? 0.9;
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.42, w, h * 0.58);
  ctx.restore();
  function seedFor(s, l, r, c) {
    return (s + 2) * 100 + l * 31 + r * 7 + c * 3;
  }
}

/** 霓虹招牌（专属原子，静态；glow 用多层描边模拟） */
function neonSign(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const x = (p.x ?? 0.16) * w;
  const y = (p.y ?? 0.3) * h;
  const bw = p.w ?? 44;
  const bh = p.h ?? 96;
  const text = p.text || '推';
  const color = p.color || '#ff8a3d';
  const t = env.t || 0;
  const flicker = p.flicker ? (0.65 + 0.35 * Math.abs(Math.sin(t * 7 + x))) : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = (p.alpha ?? 0.85) * flicker;
  // 招牌底
  ctx.fillStyle = '#120c14';
  ctx.fillRect(-bw / 2, 0, bw, bh);
  // 发光边框（外扩几层）
  for (let i = 3; i > 0; i--) {
    ctx.globalAlpha = (p.alpha ?? 0.85) * flicker * (0.12 * i);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(-bw / 2 - i, -i, bw + i * 2, bh + i * 2);
  }
  ctx.globalAlpha = (p.alpha ?? 0.85) * flicker;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(-bw / 2, 0, bw, bh);
  // 竖排字
  ctx.fillStyle = color;
  ctx.font = 'bold 18px "Noto Serif CJK SC", "Microsoft YaHei", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < text.length; i++) {
    ctx.globalAlpha = (p.alpha ?? 0.85) * flicker;
    ctx.fillText(text[i], 0, bh * 0.28 + i * 26);
  }
  ctx.restore();
}

/** 积水反光 */
function puddle(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  const y0 = (p.y ?? 0.7) * h;
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 0.16;
  for (let i = 0; i < 3; i++) {
    const y = y0 + i * 26;
    const grad = ctx.createLinearGradient(0, y, w, y);
    grad.addColorStop(0, withA(p.color || '#ff8a3d', 0));
    grad.addColorStop(0.3, withA(p.color || '#ff8a3d', 0.5));
    grad.addColorStop(0.55, withA(p.color2 || '#54d6d0', 0.45));
    grad.addColorStop(1, withA(p.color2 || '#54d6d0', 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, w, 2 + i);
    // 倒影灯斑
    ctx.globalAlpha = (p.alpha ?? 0.16) * 0.5;
    ctx.fillStyle = p.color || '#ffb15c';
    ctx.fillRect(w * 0.16 + i * 12, y + 4, 6, 2);
    ctx.fillRect(w * 0.78 - i * 10, y + 7, 5, 2);
    ctx.globalAlpha = p.alpha ?? 0.16;
  }
  ctx.restore();
}

/** 电线杆与电线 */
function powerLines(ctx, p = {}, env) {
  const w = env.W;
  const h = env.H;
  ctx.save();
  ctx.globalAlpha = p.alpha ?? 0.5;
  ctx.strokeStyle = '#080a12';
  for (const px of [w * 0.3, w * 0.7]) {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px, h * 0.16);
    ctx.lineTo(px, h * 0.62);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(px - 16, h * 0.2);
    ctx.lineTo(px + 16, h * 0.2);
    ctx.stroke();
  }
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, h * (0.17 + i * 0.02));
    ctx.quadraticCurveTo(w / 2, h * (0.23 + i * 0.02), w, h * (0.16 + i * 0.02));
    ctx.stroke();
  }
  ctx.restore();
}

const plateStyle = { scale: 1.07, swayX: 8, swayY: 10, wash: 'rgba(5,7,12,0.3)' };

export const mid = sceneDefaults({
  mode: 'b5_mid',
  stage: 'b5',
  palette: { ...BASE },
  plate: { ...plateStyle },
  layers: [
    { atom: 'glow', params: { x: 0.5, y: 0.36, r: 0.5, color: BASE.glow, alpha: 0.12 } },
    { atom: 'cloudBand', params: { y: 0.16, h: 0.1, color: '#6a5a62', alpha: 0.14, speed: 2.5 }, animate: true },
    { atom: 'moon', params: { x: 0.62, y: 0.1, r: 18, color: '#d8d0c8', halo: '#ffb15c', haloAlpha: 0.1, alpha: 0.4 } },
    { atom: 'alleyBuildings', params: { color: '#0a0d16', window: '#ffb15c', alpha: 0.94 } },
    { atom: 'powerLines', params: { alpha: 0.5 } },
    { atom: 'neonSign', params: { x: 0.13, y: 0.24, w: 42, h: 92, text: '推', color: '#ff8a3d', alpha: 0.8 } },
    { atom: 'neonSign', params: { x: 0.87, y: 0.28, w: 40, h: 86, text: '退', color: '#54d6d0', alpha: 0.78 } },
    { atom: 'neonSign', params: { x: 0.2, y: 0.44, w: 34, h: 62, text: '中单', color: '#ff8a3d', alpha: 0.55, flicker: true } },
    { atom: 'neonSign', params: { x: 0.8, y: 0.46, w: 32, h: 58, text: '锅', color: '#54d6d0', alpha: 0.5, flicker: true } },
    { atom: 'lantern', params: { x: 0.28, y: 0.2, s: 1.3, r: 7, color: '#ffb15c', glow: true } },
    { atom: 'lantern', params: { x: 0.72, y: 0.24, s: 1.2, r: 6.5, color: '#ffb15c', glow: true } },
    { atom: 'puddle', params: { y: 0.68, alpha: 0.18, color: '#ff8a3d', color2: '#54d6d0' } },
    { atom: 'fogBank', params: { y: 0.62, h: 0.16, color: BASE.fog, alpha: 0.14, speed: 4, phase: 0.9 }, animate: true },
    { atom: 'frameBranches', params: { side: 'left', color: '#120c14', alpha: 0.45, s: 0.75 } },
    { atom: 'grassReeds', params: { color: '#080a10', alpha: 0.6, h: 0.16 } },
  ],
  particles: [
    { kind: 'rain', count: 58, colors: ['rgba(180,200,220,0.7)', 'rgba(150,180,200,0.6)'] },
    { kind: 'spore', count: 10, colors: ['rgba(120,110,120,0.35)'] },
    { kind: 'spark', count: 6, colors: ['rgba(255,177,92,0.8)'] },
  ],
  fx: { vignette: 0.5, bottomFade: 0.56, topFade: 0.34 },
});

export const boss = sceneDefaults({
  mode: 'b5_boss',
  stage: 'b5',
  palette: { ...BASE, ...(BASE.boss || {}) },
  plate: { ...plateStyle, wash: 'rgba(6,8,16,0.34)' },
  layers: [
    { atom: 'glow', params: { x: 0.5, y: 0.34, r: 0.6, color: '#ffd0a0', alpha: 0.14 } },
    { atom: 'cloudBand', params: { y: 0.15, h: 0.11, color: '#7a6a72', alpha: 0.16, speed: 3.5 }, animate: true },
    { atom: 'moon', params: { x: 0.6, y: 0.09, r: 20, color: '#e0d8d0', halo: '#ffb15c', haloAlpha: 0.12, alpha: 0.42 } },
    { atom: 'alleyBuildings', params: { color: '#090c14', window: '#ffd890', alpha: 0.96 } },
    { atom: 'powerLines', params: { alpha: 0.6 } },
    { atom: 'neonSign', params: { x: 0.12, y: 0.22, w: 48, h: 104, text: '世界第一', color: '#ffa050', alpha: 0.9, flicker: true } },
    { atom: 'neonSign', params: { x: 0.88, y: 0.26, w: 44, h: 96, text: '推退', color: '#6ff0e8', alpha: 0.86, flicker: true } },
    { atom: 'neonSign', params: { x: 0.19, y: 0.44, w: 38, h: 70, text: '甩锅', color: '#ffa050', alpha: 0.65, flicker: true } },
    { atom: 'neonSign', params: { x: 0.81, y: 0.45, w: 36, h: 66, text: '中单', color: '#6ff0e8', alpha: 0.6, flicker: true } },
    { atom: 'lantern', params: { x: 0.26, y: 0.18, s: 1.5, r: 8, color: '#ffc78a', glow: true } },
    { atom: 'lantern', params: { x: 0.74, y: 0.22, s: 1.4, r: 7.5, color: '#ffc78a', glow: true } },
    { atom: 'puddle', params: { y: 0.68, alpha: 0.24, color: '#ffa050', color2: '#6ff0e8' } },
    { atom: 'lightBeam', params: { x: 0.14, y: 0.18, angle: 20, width: 40, length: 0.4, color: '#ffa050', alpha: 0.1 } },
    { atom: 'lightBeam', params: { x: 0.86, y: 0.2, angle: -20, width: 40, length: 0.4, color: '#6ff0e8', alpha: 0.1 } },
    { atom: 'fogBank', params: { y: 0.63, h: 0.18, color: BASE.boss.fog, alpha: 0.16, speed: 5, phase: 2.1 }, animate: true },
    { atom: 'frameBranches', params: { side: 'left', color: '#16101a', alpha: 0.5, s: 0.85 } },
    { atom: 'grassReeds', params: { color: '#0a0c12', alpha: 0.65, h: 0.18 } },
  ],
  particles: [
    { kind: 'rain', count: 36, colors: ['rgba(190,210,230,0.75)'] },
    { kind: 'rain', count: 30, colors: ['rgba(160,190,210,0.65)'] },
    { kind: 'spore', count: 14, colors: ['rgba(130,120,130,0.4)'] },
    { kind: 'spark', count: 10, colors: ['rgba(255,208,160,0.85)', 'rgba(111,240,232,0.7)'] },
  ],
  fx: { vignette: 0.54, bottomFade: 0.6, topFade: 0.36, glitch: 0.05, scanlines: 0.15 },
});

export const atoms = { alleyBuildings, neonSign, puddle, powerLines };
