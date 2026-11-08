/**
 * 版面背景 2D 原子：地平线剪影 / 侧柱（P1）。
 * 从 playfieldBg.js 原样搬出，绘制顺序与参数不变。
 */

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function hexPath(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
}

export function drawSilhouette(ctx, mode, th, alpha, horizonY, W) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.28;
    const baseY = horizonY - 2;
    const sil = th.sil;
    ctx.fillStyle = th.pillar2;

    if (sil === 'blocks') {
      for (let i = 0; i < 12; i++) {
        const x = (i / 12) * W + 4;
        const h = 6 + hash(i * 9 + mode.length) * 22;
        ctx.fillRect(x, baseY - h, 10 + hash(i) * 14, h);
      }
    } else if (sil === 'gears') {
      for (let i = 0; i < 3; i++) {
        const cx = W * (0.2 + i * 0.3);
        const r = 14 + i * 4;
        ctx.beginPath();
        ctx.arc(cx, baseY - r * 0.4, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (sil === 'hex') {
      for (let i = 0; i < 8; i++) {
        const cx = 20 + i * (W / 8);
        const r = 8 + hash(i + 3) * 10;
        hexPath(ctx, cx, baseY - r, r);
        ctx.fill();
      }
    } else if (sil === 'split') {
      ctx.fillStyle = '#6a8098';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(8 + i * 18, baseY - 18 - i * 3, 12, 18 + i * 3);
      }
      ctx.fillStyle = '#c45a20';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(W - 20 - i * 18, baseY - 14 - i * 4, 14, 14 + i * 4);
      }
    } else if (sil === 'poly') {
      ctx.beginPath();
      ctx.moveTo(W * 0.5, baseY - 36);
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
        ctx.lineTo(W * 0.5 + Math.cos(a) * 28, baseY - 12 + Math.sin(a) * 16);
      }
      ctx.closePath();
      ctx.fill();
    } else if (sil === 'bars') {
      for (let i = 0; i < 16; i++) {
        ctx.globalAlpha = alpha * (0.12 + (i % 2) * 0.12);
        ctx.fillRect(0, baseY - 4 - i * 3, W, 2);
      }
    } else if (sil === 'spires') {
      for (let i = 0; i < 9; i++) {
        const x = 15 + i * (W / 9);
        const h = 12 + hash(i * 5) * 28;
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x + 6, baseY - h);
        ctx.lineTo(x + 12, baseY);
        ctx.fill();
      }
    } else if (sil === 'orbs') {
      ctx.fillStyle = th.pillar;
      ctx.beginPath();
      ctx.arc(W * 0.28, baseY - 16, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = th.pillar2;
      ctx.beginPath();
      ctx.arc(W * 0.72, baseY - 16, 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (sil === 'rings') {
      ctx.strokeStyle = th.pillar;
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(40 + i * 90, baseY - 10, 16, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (sil === 'wheel') {
      ctx.strokeStyle = th.pillar;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(W * 0.5, baseY - 8, 22, 0, Math.PI * 2);
      ctx.stroke();
    } else if (sil === 'street') {
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(30 + i * 70, baseY - 30, 8, 30);
        ctx.fillStyle = th.float;
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillRect(28 + i * 70, baseY - 34, 12, 5);
        ctx.fillStyle = th.pillar2;
        ctx.globalAlpha = alpha * 0.28;
      }
    } else if (sil === 'towers') {
      for (let i = 0; i < 7; i++) {
        const x = 25 + i * 60;
        const h = 20 + (i % 3) * 10;
        ctx.fillRect(x, baseY - h, 10, h);
        ctx.beginPath();
        ctx.moveTo(x - 2, baseY - h);
        ctx.lineTo(x + 5, baseY - h - 10);
        ctx.lineTo(x + 12, baseY - h);
        ctx.fill();
      }
    }
    ctx.restore();
}

export function drawPillar(ctx, kind, x, y, w, h, col, col2, variant, p) {
    ctx.save();
    ctx.fillStyle = col2;
    if (kind === 'obelisk' || kind === 'fire') {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.globalAlpha *= 0.7;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5, y + 2);
      ctx.lineTo(x + w * 0.75, y + h * 0.55);
      ctx.lineTo(x + w * 0.25, y + h * 0.55);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'hex' || kind === 'crystal') {
      ctx.fillStyle = col;
      hexPath(ctx, x + w / 2, y + h * 0.35, Math.max(w, h * 0.22));
      ctx.fill();
      ctx.fillStyle = col2;
      ctx.fillRect(x + w * 0.3, y + h * 0.45, w * 0.4, h * 0.55);
    } else if (kind === 'gear') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.35, w * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col2;
      ctx.fillRect(x + w * 0.35, y + h * 0.5, w * 0.3, h * 0.5);
    } else if (kind === 'warn') {
      ctx.fillStyle = variant % 2 ? col : col2;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#fff';
      ctx.globalAlpha *= 0.4;
      ctx.fillRect(x + 1, y + h * 0.2, w - 2, 2);
    } else if (kind === 'neon') {
      ctx.fillStyle = col2;
      ctx.fillRect(x + w * 0.35, y, w * 0.3, h);
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 6 * p;
      ctx.fillRect(x, y, w, h * 0.12);
      ctx.shadowBlur = 0;
    } else if (kind === 'mist' || kind === 'spike') {
      ctx.fillStyle = col2;
      ctx.fillRect(x + w * 0.25, y + h * 0.15, w * 0.5, h * 0.85);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.2);
      ctx.lineTo(x + w * 0.5, y);
      ctx.lineTo(x + w, y + h * 0.2);
      ctx.fill();
    } else if (kind === 'candy') {
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1.5, w * 0.25);
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h * 0.35, w * 0.55, h * 0.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = col2;
      ctx.fillRect(x + w * 0.4, y + h * 0.4, w * 0.2, h * 0.6);
    } else if (kind === 'dual') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.3, w * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col2;
      ctx.fillRect(x + w * 0.35, y + h * 0.45, w * 0.3, h * 0.55);
    } else {
      ctx.fillStyle = col2;
      ctx.fillRect(x + w * 0.3, y + h * 0.1, w * 0.4, h * 0.9);
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, h * 0.12);
      ctx.globalAlpha *= 0.8;
      ctx.fillRect(x + w * 0.15, y + h * 0.25, w * 0.7, 2);
      ctx.fillRect(x + w * 0.15, y + h * 0.45, w * 0.7, 2);
    }
    ctx.restore();
}
