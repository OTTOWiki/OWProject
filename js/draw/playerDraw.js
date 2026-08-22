import { BALANCE } from '../config.js';
import { frameNow, withAlpha, softGlowAt } from './drawUtils.js';
import { spriteKeyForPlayer, loadSprite, drawSpriteCirc } from '../sprites.js';

export function drawPlayer(ctx, p) {
  const inv = p.invuln > 0 && Math.floor(p.invuln * 20) % 2 === 0;
  const alpha = inv && p.arbitration <= 0 ? 0.35 : 1;

  // 子机
  const t = frameNow() / 1000;
  const ox = p.slow ? 16 : 22;
  const oy = p.slow ? -6 : 2;
  const bob = Math.sin(t * 6) * 1.5;
  for (const side of [-1, 1]) {
    const sx = p.x + side * ox;
    const sy = p.y + oy + bob * side;
    ctx.save();
    ctx.globalAlpha = alpha;
    softGlowAt(ctx, sx, sy, 6, p.def.color, p.def.color2);
    ctx.restore();
  }

  // 贴图 + 光晕
  const key = spriteKeyForPlayer(p);
  const img = loadSprite(key);
  const size = 36;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
  g.addColorStop(0, withAlpha(p.def.color2, 0.55));
  g.addColorStop(0.5, withAlpha(p.def.color, 0.28));
  g.addColorStop(1, 'transparent');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
  ctx.fill();

  const ok = drawSpriteCirc(ctx, img, p.x, p.y, size, {
    glow: p.def.color,
    alpha,
    rot: Math.sin(t * 2) * 0.04,
  });
  if (!ok) {
    // 回退几何
    softGlowAt(ctx, p.x, p.y, BALANCE.playerDrawRadius, p.def.color, p.def.color2);
  }

  // 判定点
  if (p.slow || p.arbitration > 0) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  if (p.arbitration > 0) {
    ctx.strokeStyle = 'rgba(248,113,113,.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20 + Math.sin(frameNow() / 30) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

