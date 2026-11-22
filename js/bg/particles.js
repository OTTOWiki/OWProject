/**
 * 背景粒子系统：草稿纸 / 雪 / 花瓣 / 火星 / 金币 / 雨 / 气泡 / 二进制 / 糖纸 / 落叶 / 孢子 / 光点 / 卷轴。
 *
 * 只做装饰，不参与碰撞/判定，也不消费玩法随机流：场景配置时用固定 seed 生成。
 * 设计说明：docs/level-background-redesign.md §3.2。
 */
import { createRng } from '../rng.js';

/** @type {Set<string>} */
export const PARTICLE_KINDS = new Set([
  'paper', 'snow', 'petal', 'ember', 'coin', 'rain', 'bubble',
  'binary', 'candy', 'leaf', 'spore', 'spark', 'scroll',
]);

/** 每类粒子的运动/绘制基准 */
const KIND_DEFAULTS = {
  paper: { vy: [10, 26], vx: [-9, 9], size: [3, 9], alpha: 0.5, tint: 'rgba(232,226,206,0.9)' },
  snow: { vy: [18, 42], vx: [-6, 6], size: [1, 3], alpha: 0.7, tint: 'rgba(238,246,255,0.95)' },
  petal: { vy: [14, 34], vx: [-10, 10], size: [2.5, 6], alpha: 0.75, tint: 'rgba(246,196,214,0.9)' },
  ember: { vy: [-38, -14], vx: [-8, 8], size: [1, 2.6], alpha: 0.9, tint: 'rgba(255,170,90,0.95)' },
  coin: { vy: [24, 52], vx: [-6, 6], size: [2.5, 5.5], alpha: 0.75, tint: 'rgba(232,190,96,0.95)' },
  rain: { vy: [240, 420], vx: [-30, -12], size: [7, 16], alpha: 0.3, tint: 'rgba(190,220,240,0.9)' },
  bubble: { vy: [-26, -8], vx: [-5, 5], size: [2, 7], alpha: 0.4, tint: 'rgba(180,240,200,0.9)' },
  binary: { vy: [34, 72], vx: [-4, 4], size: [7, 11], alpha: 0.4, tint: 'rgba(130,240,220,0.9)' },
  candy: { vy: [18, 38], vx: [-8, 8], size: [3, 7], alpha: 0.8, tint: 'rgba(244,170,200,0.95)' },
  leaf: { vy: [16, 40], vx: [-12, 12], size: [3, 8], alpha: 0.6, tint: 'rgba(160,190,120,0.9)' },
  spore: { vy: [-10, 6], vx: [-8, 8], size: [1, 2.4], alpha: 0.5, tint: 'rgba(170,220,120,0.9)' },
  spark: { vy: [-70, 30], vx: [-40, 40], size: [1, 2], alpha: 0.85, tint: 'rgba(255,210,150,0.95)' },
  scroll: { vy: [12, 26], vx: [-10, 10], size: [4, 8], alpha: 0.5, tint: 'rgba(240,232,214,0.85)' },
};

function pick(rng, range) {
  return range[0] + rng() * (range[1] - range[0]);
}

export class ParticleField {
  /**
   * @param {number} [width]
   * @param {number} [height]
   */
  constructor(width = 450, height = 600) {
    this.width = width;
    this.height = height;
    this.t = 0;
    /** @type {Array<object>} */
    this.items = [];
  }

  clear() {
    this.items.length = 0;
  }

  /**
   * 按场景粒子配置重建粒子场（确定性）。
   * @param {Array<{kind:string,count:number,colors?:string[],size?:[number,number],
   *   speed?:[number,number],drift?:number,alpha?:number}>} specs
   * @param {{seed?: number, width?: number, height?: number}} [opts]
   */
  configure(specs, { seed = 1, width = 450, height = 600 } = {}) {
    this.width = width;
    this.height = height;
    this.t = 0;
    this.items.length = 0;
    if (!Array.isArray(specs)) return;
    let n = 0;
    for (const spec of specs) {
      if (!spec || !PARTICLE_KINDS.has(spec.kind)) continue;
      const count = Math.max(0, Math.min(60, spec.count | 0));
      const rng = createRng((seed * 2654435761 + n * 40503 + 17) >>> 0);
      for (let i = 0; i < count; i++) {
        const def = KIND_DEFAULTS[spec.kind];
        const colors = Array.isArray(spec.colors) && spec.colors.length ? spec.colors : [def.tint];
        const size = spec.size || def.size;
        const speed = spec.speed || def.vy;
        const p = {
          kind: spec.kind,
          x: rng() * (this.width + 40) - 20,
          y: rng() * (this.height + 40) - 20,
          vy: pick(rng, speed),
          vx: (spec.drift ?? 1) * pick(rng, def.vx),
          size: pick(rng, size),
          rot: rng() * Math.PI * 2,
          vr: (rng() - 0.5) * 1.6,
          phase: rng() * Math.PI * 2,
          alpha: (spec.alpha ?? def.alpha) * (0.65 + rng() * 0.35),
          color: colors[(rng() * colors.length) | 0],
          life: 0,
        };
        if (spec.kind === 'rain') p.lengthScale = 0.7 + rng() * 0.9;
        if (spec.kind === 'binary') p.char = rng() > 0.5 ? '0' : '1';
        if (spec.kind === 'scroll') p.lines = 2 + ((rng() * 3) | 0);
        this.items.push(p);
      }
      n += 1;
    }
  }

  /** @param {number} dt 秒 */
  update(dt) {
    this.t += dt;
    const w = this.width;
    const h = this.height;
    for (const p of this.items) {
      p.y += p.vy * dt;
      p.x += p.vx * dt;
      p.rot += p.vr * dt;
      p.phase += dt * (0.6 + (p.size % 3) * 0.15);
      if (p.kind === 'paper' || p.kind === 'petal' || p.kind === 'leaf' || p.kind === 'scroll') {
        p.x += Math.sin(p.phase) * 8 * dt;
      }
      if (p.y < -40) p.y = h + 30;
      if (p.y > h + 40) p.y = -30;
      if (p.x < -40) p.x = w + 30;
      if (p.x > w + 40) p.x = -30;
    }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    for (const p of this.items) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      switch (p.kind) {
        case 'paper': {
          ctx.rotate(p.rot * 0.4);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size * 0.6, -p.size * 0.45, p.size * 1.2, p.size * 0.9);
          ctx.globalAlpha *= 0.35;
          ctx.fillStyle = '#3a3a34';
          ctx.fillRect(-p.size * 0.45, -p.size * 0.2, p.size * 0.9, 0.7);
          break;
        }
        case 'snow':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'petal':
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.7, p.size * 0.35, 0.4, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'ember':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha *= 0.35;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 1.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'coin':
          ctx.rotate(p.rot);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.55, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha *= 0.5;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size * 0.16, -p.size * 0.3, p.size * 0.32, p.size * 0.6);
          break;
        case 'rain':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(p.vx * 0.02, p.size * (p.lengthScale || 1));
          ctx.stroke();
          break;
        case 'bubble':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'binary':
          ctx.fillStyle = p.color;
          ctx.font = `${p.size | 0}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(p.char, 0, 0);
          break;
        case 'candy':
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size * 0.6, -p.size * 0.35, p.size * 1.2, p.size * 0.7);
          ctx.globalAlpha *= 0.6;
          ctx.fillStyle = '#fff';
          ctx.fillRect(-p.size * 0.2, -p.size * 0.35, p.size * 0.4, p.size * 0.7);
          break;
        case 'leaf':
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.8, p.size * 0.32, 0.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'spore':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'spark':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(p.vx * 0.012, p.vy * 0.012);
          ctx.stroke();
          break;
        case 'scroll': {
          ctx.rotate(p.rot * 0.25);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size * 0.42, -p.size, p.size * 0.84, p.size * 2);
          ctx.globalAlpha *= 0.4;
          ctx.fillStyle = '#5a4a38';
          for (let i = 0; i < (p.lines || 2); i++) {
            ctx.fillRect(-p.size * 0.28, -p.size * 0.6 + i * p.size * 0.5, p.size * 0.56, 0.6);
          }
          break;
        }
        default:
          break;
      }
      ctx.restore();
    }
  }
}
