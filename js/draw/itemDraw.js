import { BALANCE } from '../config.js';

export function drawItem(ctx, it) {
  ctx.save();
  ctx.translate(it.x, it.y);
  const colors = {
    score: '#fde68a',
    scoreL: '#fbbf24',
    life: '#ff7a9a',
    bomb: '#c4b5fd',
    power: '#86efac',
  };
  const c = colors[it.kind] || '#fff';
  ctx.fillStyle = c;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.2;
  ctx.shadowColor = c;
  ctx.shadowBlur = it.attract ? 10 : 4;
  if (it.kind === 'scoreL' || it.kind === 'life' || it.kind === 'bomb') {
    ctx.beginPath();
    ctx.arc(0, 0, it.kind === 'scoreL' ? 8 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(40,20,10,0.85)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = it.kind === 'life' ? 'L' : it.kind === 'bomb' ? 'B' : 'P';
    ctx.fillText(label, 0, 0.5);
  } else {
    // 小P点：方块 + P
    ctx.fillRect(-5.5, -5.5, 11, 11);
    ctx.strokeRect(-5.5, -5.5, 11, 11);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(40,20,10,0.85)';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', 0, 0.5);
  }
  ctx.restore();
}

/** 浅色虚线收点线（仅线，无文字） */
export function drawCollectLine(ctx, w) {
  const y = BALANCE.itemCollectLine ?? 168;
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(210, 230, 255, 0.42)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8, y);
  ctx.lineTo(w - 8, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
