/**
 * 关卡版面背景渲染器（P6 绘卷系统）。
 *
 * 结构：场景数据（scenes/）+ 共享/专属原子（atoms/）+ 素材（materials/）+ 粒子（particles/）
 * - 静态层（animate:false）每次切 mode 烘进带 32px 余量的离屏 canvas；
 * - 每帧只做：静态层漂移 blit、animate 层、粒子、fx（暗角/压暗/扫描/故障/转场闪）。
 * - 素材缺失时全部原子退化为程序化几何；plate 缺失时使用 palette.sky 渐变兜底。
 * - 不消费玩法随机流：原子随机走 env.rand(seed)（依 mode 的确定性哈希）。
 *
 * 兼容入口：js/playfieldBg.js 的 `PlayfieldBackground`。
 * 设计说明：docs/level-background-redesign.md。
 */
import { LOGICAL_W, LOGICAL_H } from '../config.js';
import { PLAYFIELD_BG_TEX, resolveBgMode } from '../bgModes.js';
import { sceneFor, atomsFor } from './scenes/index.js';
import { ATOMS } from './atoms.js';
import { getMaterialImage, getTintedMaterial, MATERIAL_NAMES } from './materials.js';
import { ParticleField } from './particles.js';
import { sceneDefaults } from './schema.js';

const OVERSCAN = 32;
const TRANSITION_DUR = 1.15;

/** @type {Map<string, {img: HTMLImageElement|null, promise: Promise<HTMLImageElement|null>|null}>} */
const plateCache = new Map();

/** 取/载入 plate 图（失败 resolve null，不抛） */
export function loadScenePlate(path) {
  if (!path) return Promise.resolve(null);
  let rec = plateCache.get(path);
  if (rec) return rec.promise;
  rec = { img: null, promise: null };
  if (typeof Image === 'undefined') {
    rec.promise = Promise.resolve(null);
    plateCache.set(path, rec);
    return rec.promise;
  }
  rec.promise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      rec.img = img;
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = path;
  });
  plateCache.set(path, rec);
  return rec.promise;
}

/** 同步取已载入 plate（未就绪 null） */
export function plateImage(path) {
  return plateCache.get(path)?.img || null;
}

function hashMode(mode) {
  let h = 0x811c9dc5;
  for (let i = 0; i < mode.length; i++) {
    h ^= mode.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function seedFor(mode, seed) {
  let x = (Math.imul((seed | 0) + 0x9e3779b9, 0x85ebca6b) ^ hashMode(mode)) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35) >>> 0;
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

function drawCover(ctx, img, w, h, scale = 1) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const target = Math.max(w / iw, h / ih) * scale;
  const dw = iw * target;
  const dh = ih * target;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function rgba(color, a) {
  const c = String(color || '#000000').trim();
  if (c.startsWith('#')) {
    const hex = c.length === 4
      ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`
      : c;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  if (c.startsWith('rgb')) {
    return c.replace(/rgba?\(([^)]+)\)/, (m, body) => {
      const p = body.split(',').slice(0, 3).map((s) => s.trim());
      return `rgba(${p.join(',')},${a})`;
    });
  }
  return c;
}

export class BackgroundRenderer {
  constructor() {
    this.width = LOGICAL_W;
    this.height = LOGICAL_H;
    this.mode = null;
    this.prevMode = null;
    this.t = 0;
    this.transition = 0;
    this.transitionDur = TRANSITION_DUR;
    this._scene = null;
    this._prevScene = null;
    this._chapter = null;
    this._atoms = ATOMS;
    this._static = null;
    this._prevStatic = null;
    this._plate = null;
    this._platePath = null;
    this._particles = new ParticleField(LOGICAL_W, LOGICAL_H);
    this._fxCache = null;
    this._warned = false;
    this._materialsPending = false;
    this._env = this._makeEnv(0);
    if (typeof document !== 'undefined') {
      this.setMode('s1_mid', { transition: false });
    }
  }

  /** 当前场景数据（调试/测试） */
  getScene() {
    return this._scene;
  }

  _makeEnv(t) {
    const self = this;
    return {
      W: LOGICAL_W,
      H: LOGICAL_H,
      t,
      dt: 0,
      rand(seed) {
        return seedFor(self.mode || 's1_mid', seed);
      },
      mat: getMaterialImage,
      tint: getTintedMaterial,
      palette: this._scene?.palette || {},
      stage: this._scene?.stage || 's1',
      mode: this.mode || 's1_mid',
      plate: this._plate,
    };
  }

  _refreshEnv(t) {
    const env = this._env;
    env.t = t;
    env.palette = this._scene?.palette || {};
    env.stage = this._scene?.stage || 's1';
    env.mode = this.mode || 's1_mid';
    env.plate = this._plate;
    return env;
  }

  /**
   * 切换场景。
   * @param {string} mode
   * @param {{transition?: boolean}} [opts]
   */
  setMode(mode, { transition = true } = {}) {
    const next = resolveBgMode(mode);
    if (this._scene && next === this.mode) return;
    const changed = !!this._scene && next !== this.mode;
    if (changed && transition && this._static) {
      this.prevMode = this.mode;
      this._prevStatic = this._static;
      this._prevScene = this._scene;
      this.transition = 1;
    }
    this.mode = next;
    this._scene = sceneDefaults(sceneFor(next));
    this._chapter = this._scene.stage;
    this._atoms = { ...ATOMS, ...(atomsFor(next) || {}) };
    this._platePath = PLAYFIELD_BG_TEX[next] || null;
    this._plate = plateImage(this._platePath);
    if (this._platePath && !this._plate) {
      loadScenePlate(this._platePath).then((img) => {
        if (img && this.mode === next && !this._plate) {
          this._plate = img;
          this._composeStatic();
        }
      });
    }
    this._particles.configure(this._scene.particles, {
      seed: (hashMode(next) % 100000) + 1,
      width: LOGICAL_W,
      height: LOGICAL_H,
    });
    this._composeStatic();
    this._refreshEnv(this.t);
  }

  _drawAtom(ctx, layer, env) {
    const fn = this._atoms[layer?.atom];
    if (typeof fn !== 'function') return;
    try {
      fn(ctx, layer.params || {}, env);
    } catch (err) {
      if (!this._warned) {
        this._warned = true;
        console.warn('[bg] atom draw failed:', layer?.atom, err);
      }
    }
  }

  _composeStatic() {
    if (!this._scene || typeof document === 'undefined') return;
    const w = LOGICAL_W;
    const h = LOGICAL_H;
    const cw = w + OVERSCAN * 2;
    const ch = h + OVERSCAN * 2;
    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const g = c.getContext('2d');
    if (!g) return;
    const scene = this._scene;
    const palette = scene.palette || {};
    const sky = palette.sky || ['#07080c', '#12161c'];

    // 天空兜底（plate 缺失时可见）
    const sg = g.createLinearGradient(0, 0, 0, ch * 0.72);
    sg.addColorStop(0, sky[0] || '#07080c');
    sg.addColorStop(1, sky[1] || '#12161c');
    g.fillStyle = sg;
    g.fillRect(0, 0, cw, ch);

    const plate = scene.plate || {};
    if (this._plate) {
      g.globalAlpha = 1;
      drawCover(g, this._plate, cw, ch, plate.scale ?? 1.06);
    }
    if (plate.wash) {
      g.fillStyle = plate.wash;
      g.fillRect(0, 0, cw, ch);
    }
    if (plate.tint) {
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = plate.tint;
      g.fillRect(0, 0, cw, ch);
      g.globalCompositeOperation = 'source-over';
    }

    g.save();
    g.translate(OVERSCAN, OVERSCAN);
    const env = this._refreshEnv(this.t);
    env.t = 0;
    for (const layer of scene.layers) {
      if (layer.animate) continue;
      this._drawAtom(g, layer, env);
    }
    g.restore();
    this._static = c;
    this._fxCache = this._buildFx(scene);
    // 材质在场景构建后才加载完成时，补一次静态层重烘（避免永远停在程序化兜底）
    this._materialsPending = typeof document !== 'undefined'
      && MATERIAL_NAMES.some((n) => !getMaterialImage(n));
  }

  _buildFx(scene) {
    if (typeof document === 'undefined') return null;
    const w = LOGICAL_W;
    const h = LOGICAL_H;
    const fx = scene.fx || {};
    const cache = { vignette: null, scanlines: null };
    if (fx.vignette > 0) {
      const v = document.createElement('canvas');
      v.width = w;
      v.height = h;
      const vg = v.getContext('2d');
      if (vg) {
        const grad = vg.createRadialGradient(w / 2, h * 0.44, h * 0.16, w / 2, h * 0.5, h * 0.78);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.62, `rgba(0,0,0,${(fx.vignette * 0.35).toFixed(3)})`);
        grad.addColorStop(1, `rgba(0,0,0,${Math.min(1, fx.vignette).toFixed(3)})`);
        vg.fillStyle = grad;
        vg.fillRect(0, 0, w, h);
        cache.vignette = v;
      }
    }
    if (fx.scanlines > 0) {
      const s = document.createElement('canvas');
      s.width = w;
      s.height = h;
      const sg = s.getContext('2d');
      if (sg) {
        sg.fillStyle = `rgba(0,0,0,${(0.06 + fx.scanlines * 0.1).toFixed(3)})`;
        for (let y = 0; y < h; y += 3) sg.fillRect(0, y, w, 1);
        cache.scanlines = s;
      }
    }
    return cache;
  }

  /** @param {number} dt 秒 */
  update(dt) {
    this.t += dt;
    if (this._materialsPending && MATERIAL_NAMES.every((n) => getMaterialImage(n))) {
      this._materialsPending = false;
      this._composeStatic();
    }
    this._env.dt = dt;
    if (this.transition > 0) {
      this.transition = Math.max(0, this.transition - dt / this.transitionDur);
      if (this.transition <= 0) {
        this.prevMode = null;
        this._prevStatic = null;
        this._prevScene = null;
      }
    }
    this._particles.update(dt);
  }

  _blit(ctx, canvas, scene, alpha, zoom = 1) {
    if (!canvas) return;
    const swayX = scene?.plate?.swayX ?? 7;
    const swayY = scene?.plate?.swayY ?? 9;
    const ox = -OVERSCAN + Math.sin(this.t * 0.055) * swayX;
    const oy = -OVERSCAN + Math.sin(this.t * 0.041 + 1.3) * swayY;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    if (zoom !== 1) {
      ctx.translate(LOGICAL_W / 2, LOGICAL_H / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-LOGICAL_W / 2, -LOGICAL_H / 2);
    }
    ctx.drawImage(canvas, ox, oy);
    ctx.restore();
  }

  _drawFx(ctx, scene, alpha = 1) {
    const fx = scene?.fx || {};
    const w = LOGICAL_W;
    const h = LOGICAL_H;
    const palette = scene?.palette || {};
    const ink = palette.ink || '#05070a';
    ctx.save();
    ctx.globalAlpha = alpha;
    if (fx.topFade > 0) {
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.22);
      g.addColorStop(0, rgba(ink, Math.min(1, fx.topFade)));
      g.addColorStop(1, rgba(ink, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h * 0.22);
    }
    if (fx.bottomFade > 0) {
      const g = ctx.createLinearGradient(0, h * 0.68, 0, h);
      g.addColorStop(0, rgba(ink, 0));
      g.addColorStop(1, rgba(ink, Math.min(1, fx.bottomFade)));
      ctx.fillStyle = g;
      ctx.fillRect(0, h * 0.68, w, h * 0.32);
    }
    if (this._fxCache?.vignette) {
      ctx.drawImage(this._fxCache.vignette, 0, 0);
    }
    if (this._fxCache?.scanlines) {
      ctx.globalAlpha = alpha * 0.85;
      ctx.drawImage(this._fxCache.scanlines, 0, 0);
    }
    if (fx.glitch > 0) {
      const tick = Math.floor(this.t * 6);
      const bandCount = 1 + ((seedFor(this.mode || 'x', tick) * 3) | 0);
      for (let i = 0; i < bandCount; i++) {
        const r = seedFor(this.mode || 'x', tick * 17 + i * 31);
        if (r > 0.18 + 0.4 * (1 - fx.glitch)) continue;
        const y = seedFor(this.mode || 'x', tick * 7 + i * 13) * h;
        const bh = 1 + seedFor(this.mode || 'x', tick * 11 + i * 5) * (4 + fx.glitch * 14);
        ctx.globalAlpha = alpha * (0.08 + fx.glitch * 0.16);
        ctx.fillStyle = i % 2 ? '#ff2f6d' : '#52e0ff';
        ctx.fillRect(0, y, w, bh);
      }
    }
    ctx.restore();
  }

  /**
   * 绘制到版面 canvas。
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!this._static) {
      this._composeStatic();
      if (!this._static) return;
    }
    const cur = this._scene;
    const inTrans = this.transition > 0 && this._prevStatic && this._prevScene;
    if (inTrans) {
      this._blit(ctx, this._prevStatic, this._prevScene, this.transition);
      this._blit(ctx, this._static, cur, 1 - this.transition, 1 + this.transition * 0.05);
    } else {
      this._blit(ctx, this._static, cur, 1);
    }

    const env = this._refreshEnv(this.t);
    env.plate = this._plate;
    for (const layer of cur.layers) {
      if (!layer.animate) continue;
      this._drawAtom(ctx, layer, env);
    }

    if (!inTrans || this.transition < 0.85) {
      ctx.save();
      if (inTrans) ctx.globalAlpha = 1 - this.transition;
      this._particles.draw(ctx);
      ctx.restore();
    }

    this._drawFx(ctx, cur, 1);

    if (inTrans) {
      const flash = Math.sin(this.transition * Math.PI) * 0.14;
      if (flash > 0.005) {
        ctx.save();
        ctx.fillStyle = `rgba(255,244,218,${flash.toFixed(3)})`;
        ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
        ctx.restore();
      }
    }
  }
}

export { TRANSITION_DUR };
