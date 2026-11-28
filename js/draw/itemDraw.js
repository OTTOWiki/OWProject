import { BALANCE } from '../config.js';

/** 5 种道具配色（模块常量；#43 改前每帧/每道具新建对象） */
const ITEM_COLORS = {
  score: '#fde68a',
  scoreL: '#fbbf24',
  life: '#ff7a9a',
  bomb: '#c4b5fd',
  power: '#86efac',
};

/**
 * 道具 sprite（#43）：颜色 + 光圈 + 字样一次性烘焙，之后只 drawImage。
 * attract 态只差 shadowBlur（10 vs 4），按两态各烘一张。
 * @returns {{canvas: HTMLCanvasElement, pad: number}|null}
 */
function buildItemSprite(kind, attract) {
  const c = document.createElement('canvas');
  const pad = attract ? 30 : 19; // 半径 8 + 描边 + shadowBlur 扩散余量
  c.width = pad * 2;
  c.height = pad * 2;
  const g = c.getContext('2d');
  if (!g) return null;
  g.translate(pad, pad);
  const col = ITEM_COLORS[kind] || '#fff';
  g.fillStyle = col;
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 1.2;
  g.shadowColor = col;
  g.shadowBlur = attract ? 10 : 4;
  if (kind === 'scoreL' || kind === 'life' || kind === 'bomb') {
    g.beginPath();
    g.arc(0, 0, kind === 'scoreL' ? 8 : 7, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(40,20,10,0.85)';
    g.font = 'bold 9px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const label = kind === 'life' ? 'L' : kind === 'bomb' ? 'B' : 'P';
    g.fillText(label, 0, 0.5);
  } else {
    // 小P点：方块 + P
    g.fillRect(-5.5, -5.5, 11, 11);
    g.strokeRect(-5.5, -5.5, 11, 11);
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(40,20,10,0.85)';
    g.font = 'bold 8px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('P', 0, 0.5);
  }
  return { canvas: c, pad };
}

/** key = kind|attract → sprite；仅缓存成功产物（无 canvas 环境每帧走回退） */
const _itemSprites = new Map();

function itemSprite(kind, attract) {
  const key = `${kind}|${attract ? 1 : 0}`;
  let entry = _itemSprites.get(key);
  if (entry === undefined) {
    entry = null;
    if (typeof document !== 'undefined' && document.createElement) {
      try {
        entry = buildItemSprite(kind, attract);
      } catch (_) {
        entry = null;
      }
    }
    if (entry) _itemSprites.set(key, entry);
  }
  return entry;
}

/** 无离屏 canvas 回退：原逐帧绘制 */
function paintItem(ctx, kind, attract) {
  const col = ITEM_COLORS[kind] || '#fff';
  ctx.fillStyle = col;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.2;
  ctx.shadowColor = col;
  ctx.shadowBlur = attract ? 10 : 4;
  if (kind === 'scoreL' || kind === 'life' || kind === 'bomb') {
    ctx.beginPath();
    ctx.arc(0, 0, kind === 'scoreL' ? 8 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(40,20,10,0.85)';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = kind === 'life' ? 'L' : kind === 'bomb' ? 'B' : 'P';
    ctx.fillText(label, 0, 0.5);
  } else {
    ctx.fillRect(-5.5, -5.5, 11, 11);
    ctx.strokeRect(-5.5, -5.5, 11, 11);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(40,20,10,0.85)';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', 0, 0.5);
  }
}

export function drawItem(ctx, it) {
  const entry = itemSprite(it.kind, it.attract);
  if (entry) {
    ctx.drawImage(entry.canvas, it.x - entry.pad, it.y - entry.pad);
    return;
  }
  ctx.save();
  ctx.translate(it.x, it.y);
  paintItem(ctx, it.kind, it.attract);
  ctx.restore();
}

/** 浅色虚线收点线（仅线，无文字） */
export function drawCollectLine(ctx, w) {
  const y = BALANCE.itemCollectLine;
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
