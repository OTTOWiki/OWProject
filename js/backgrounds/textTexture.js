/**
 * Canvas text texture for stage labels
 */
import * as THREE from 'three';

export function makeTextTexture(lines, {
  w = 256, h = 128, fill = '#a8ffc8', bg = 'rgba(0,0,0,0.35)',
  font = 'bold 28px monospace', align = 'center',
} = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.font = font;
  ctx.fillStyle = fill;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const arr = Array.isArray(lines) ? lines : [lines];
  const step = h / (arr.length + 1);
  arr.forEach((t, i) => {
    ctx.fillText(String(t), align === 'center' ? w / 2 : 16, step * (i + 1));
  });
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

