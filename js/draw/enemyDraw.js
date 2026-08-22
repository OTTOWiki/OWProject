import { withAlpha } from './drawUtils.js';
import { spriteKeyForEnemy, loadSprite, drawSpriteCirc } from '../sprites.js';

export function drawEnemy(ctx, e) {
  const key = spriteKeyForEnemy(e);
  // key 为 null：占位策略为几何绘制（无专用/显式无图 Boss）
  const img = key ? loadSprite(key) : null;
  const isBoss = e.type === 'boss' || e.kind === 'boss';
  const isElite = e.type === 'elite' || e.kind === 'mid' || e.kind === 'mid1' || e.kind === 'mid2' || e.kind === 'mid3';
  const size = isBoss ? 78 : isElite ? 48 : 32;

  // 特效现身：只画法阵/涟漪，本体渐显
  const fxT = e.spawnFxT || 0;
  const fxDur = e.spawnFxDur || (isBoss ? 0.7 : 0.45);
  let bodyAlpha = 1;
  if (fxT > 0) {
    const p = 1 - Math.max(0, fxT) / Math.max(1e-4, fxDur); // 0→1
    bodyAlpha = Math.max(0, (p - 0.35) / 0.65);
    drawSpawnFx(ctx, e, p, size);
    if (bodyAlpha <= 0.02) {
      // 仍画环形血条占位（Boss）
      if (isBoss && e.maxHp > 0) {
        ctx.save();
        ctx.translate(e.x, e.y);
        drawBossRingHp(ctx, e, size);
        ctx.restore();
      }
      return;
    }
  }

  ctx.save();
  ctx.globalAlpha = bodyAlpha;

  // 底层光环
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.spin * (isBoss ? 0.4 : 1.2));
  const ring = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, size * 0.7);
  ring.addColorStop(0, withAlpha(e.color, 0.35));
  ring.addColorStop(1, 'transparent');
  ctx.fillStyle = ring;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const drawn = drawSpriteCirc(ctx, img, e.x, e.y, size, {
    glow: e.color,
    rot: isBoss ? e.spin * 0.25 : e.spin * 0.8,
    glowBlur: isBoss ? 22 : 12,
  });

  if (!drawn) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (isBoss) drawBossShape(ctx, e);
    else if (isElite) drawEliteShape(ctx, e);
    else {
      ctx.rotate(e.spin * 1.5);
      ctx.strokeStyle = e.color;
      ctx.fillStyle = e.color + '55';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = Math.cos(a) * e.r;
        const y = Math.sin(a) * e.r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(e.x, e.y);

  // Boss：围绕自身的环形血条；精英：头顶短条
  if (e.type !== 'mob' && e.maxHp > 0) {
    if (isBoss) {
      drawBossRingHp(ctx, e, size);
    } else {
      const bw = 44;
      const barY = -size / 2 - 10;
      const t = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(-bw / 2, barY, bw, 5);
      ctx.fillStyle = e.color;
      ctx.fillRect(-bw / 2, barY, bw * t, 5);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.strokeRect(-bw / 2, barY, bw, 5);
    }
  }

  if (e.label) {
    ctx.fillStyle = e.color;
    ctx.font = 'bold 11px "Songti SC", serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = bodyAlpha * (0.7 + Math.sin(e.spin * 4) * 0.3);
    ctx.fillText(e.label, 0, size / 2 + 14);
    ctx.globalAlpha = bodyAlpha;
  }

  // 受击白闪：lighter 叠加白色径向渐变 + 圆环（纯视觉）
  if (e.hurtT > 0) {
    const hurtA = Math.min(1, e.hurtT / 0.06) * 0.85;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = hurtA;
    const fr = size * 0.72;
    // 本段处于上方 translate(e.x,e.y) 后的本地坐标系：中心必须用 (0,0)。
    // 回归：曾用绝对坐标 (e.x,e.y)，白闪画到 2×(e.x,e.y) 的偏移位置
    // （用户实测的「白色透明球体」任意位置冒出）。
    const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, fr);
    fg.addColorStop(0, 'rgba(255,255,255,0.85)');
    fg.addColorStop(0.55, 'rgba(255,255,255,0.35)');
    fg.addColorStop(1, 'transparent');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(0, 0, fr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${hurtA})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}

/** Boss 环形血条（绕本体） */
function drawBossRingHp(ctx, e, size) {
  const t = Math.max(0, Math.min(1, e.hp / e.maxHp));
  const radius = size * 0.58;
  const start = -Math.PI / 2;

  // 底环
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // 血量弧
  if (t > 0.001) {
    const hurtA = e.hurtT > 0 ? Math.min(1, e.hurtT / 0.06) * 0.85 : 0;
    const grad = hurtA > 0 ? null : ctx.createLinearGradient(-radius, 0, radius, 0);
    if (grad) {
      grad.addColorStop(0, e.color2 || '#fff');
      grad.addColorStop(1, e.color);
    }
    // 受击瞬间描边闪白
    ctx.strokeStyle = hurtA > 0 ? `rgba(255,255,255,${hurtA})` : grad;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, radius, start, start + Math.PI * 2 * t);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }
}

/** 入场法阵 / 涟漪特效 p: 0→1 */
function drawSpawnFx(ctx, e, p, size) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const baseR = size * (0.35 + p * 0.55);
  const a = Math.min(1, p * 1.4) * (1 - Math.max(0, p - 0.75) / 0.25);

  ctx.globalAlpha = 0.55 * a;
  ctx.strokeStyle = e.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, baseR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.35 * a;
  ctx.strokeStyle = e.color2 || '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, baseR * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  // 旋转符文刻度
  ctx.globalAlpha = 0.7 * a;
  ctx.rotate(e.spin * 3 + p * Math.PI);
  ctx.strokeStyle = e.color;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * baseR * 0.55, Math.sin(ang) * baseR * 0.55);
    ctx.lineTo(Math.cos(ang) * baseR * 1.05, Math.sin(ang) * baseR * 1.05);
    ctx.stroke();
  }

  // 中心光
  ctx.rotate(-(e.spin * 3 + p * Math.PI));
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, baseR * 0.5);
  g.addColorStop(0, withAlpha('#ffffff', 0.55 * a));
  g.addColorStop(0.5, withAlpha(e.color, 0.25 * a));
  g.addColorStop(1, 'transparent');
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, baseR * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBossShape(ctx, e) {
  const kind = e.kind;
  ctx.rotate(e.spin * 0.6);

  if (kind === 'alice') {
    drawGear(ctx, 36, 10, e.spin * 2, e.color);
    drawGear(ctx, 22, 8, -e.spin * 3, e.color2);
  } else if (kind === 'icebin') {
    drawHex(ctx, 34, e.color2);
    ctx.rotate(Math.PI / 6);
    drawHex(ctx, 22, e.color);
  } else if (kind === 'dazong') {
    drawPoly(ctx, 8, 40, e.color);
    ctx.rotate(-e.spin);
    drawPoly(ctx, 6, 26, e.color2);
  } else if (kind === 'patrol') {
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.strokeRect(-40 + i * 2, -28 + i * 3, 80 - i * 4, 12);
    }
    ctx.fillStyle = e.color;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('404', 0, 4);
  } else if (kind === 'menbailiang') {
    // obelisk
    ctx.fillStyle = e.color + '88';
    ctx.strokeStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.lineTo(12, 30);
    ctx.lineTo(-12, 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'yimeige') {
    ctx.strokeStyle = e.color;
    ctx.fillStyle = e.color + '44';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(Math.cos(e.spin + i) * 12, Math.sin(e.spin + i) * 12, 14 - i * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (kind === 'duren') {
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + e.spin;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28);
      ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 40);
      ctx.stroke();
    }
  } else if (kind === 'gundian') {
    ctx.fillStyle = e.color + '66';
    ctx.strokeStyle = e.color;
    ctx.fillRect(-18, -10, 36, 24);
    ctx.strokeRect(-18, -10, 36, 24);
    ctx.beginPath();
    ctx.arc(0, 18, 10, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 'lastgod') {
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 28, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -8, 10, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 'rival') {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 32);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.4, e.color2);
    g.addColorStop(1, e.color);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
  } else {
    drawPoly(ctx, 6, 32, e.color);
  }

  // center label flash
  if (e.label) {
    ctx.rotate(-e.spin * 0.6);
    ctx.fillStyle = e.color;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.65 + Math.sin(e.spin * 5) * 0.35;
    ctx.fillText(`【${e.label}】`, 0, 4);
    ctx.globalAlpha = 1;
  }
}

function drawEliteShape(ctx, e) {
  if (e.kind === 'mid1') {
    ctx.strokeStyle = e.color;
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.strokeRect(-22, -22, 44, 44);
    ctx.setLineDash([]);
    ctx.fillStyle = e.color + '44';
    ctx.fillRect(-14, -14, 28, 28);
  } else if (e.kind === 'mid2') {
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -26);
    ctx.lineTo(22, 0);
    ctx.lineTo(0, 26);
    ctx.lineTo(-22, 0);
    ctx.closePath();
    ctx.stroke();
  } else if (e.kind === 'mid3') {
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(24, 20);
    ctx.lineTo(-24, 20);
    ctx.closePath();
    ctx.stroke();
  } else {
    drawPoly(ctx, 5, 24, e.color);
  }
}

function drawGear(ctx, r, teeth, rot, color) {
  ctx.save();
  ctx.rotate(rot);
  ctx.strokeStyle = color;
  ctx.fillStyle = color + '33';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.72;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawHex(ctx, r, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color + '33';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawPoly(ctx, n, r, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color + '33';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

