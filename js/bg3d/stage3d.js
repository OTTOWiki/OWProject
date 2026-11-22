/**
 * 版面 3D 舞台渲染器（Three.js）。
 *
 * 方向（2026-11-22 用户修正）：场景为持续深入的 3D 空间，混合 Billboard 绘卷（Sprite/贴图面）
 * 与真 3D 几何景物，并使用超现实构图（倒置鸟居、浮空巨月、悬空巨轮、数据门等）。
 *
 * 设计：
 * - 渲染到 #playfield-bg3d（450×600 WebGL canvas），2D 版面 canvas 叠在其上且保持透明；
 * - 相机固定、景物沿 +Z 循环逼近（无限深入），fog + 远景绘卷板负责空气透视；
 * - 场景由 `js/bg3d/scenes/<stage>.js` 的 builder 构建，共享原子来自 `kit.js`；
 * - 素材缺失/WebGL 失败时由调用方回退到 Canvas 2D 绘卷系统（js/bg/renderer.js）。
 */
import { getThree } from '../backgrounds/threeLoader.js';
import { resolveBgMode } from '../bgModes.js';
import { SCENES3D } from './scenes/index.js';
import { sceneFor } from '../bg/scenes/index.js';
import { STAGE_PALETTES } from '../bg/scenes/_stub.js';
import * as K from './kit.js';

const W = 450;
const H = 600;

function mixHex(a, b, t) {
  const ar = (a >> 16) & 255; const ag = (a >> 8) & 255; const ab = a & 255;
  const br = (b >> 16) & 255; const bg = (b >> 8) & 255; const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

function cssToHex(color) {
  if (typeof color === 'number') return color;
  const c = String(color || '#000000').trim();
  if (c.startsWith('#')) {
    const hex = c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
    return parseInt(hex.slice(1), 16);
  }
  return 0x000000;
}

/** 按 mode 取该面调色板（boss 覆盖） */
export function paletteForMode(mode) {
  const scene = sceneFor(mode);
  const stage = scene?.stage || 's1';
  const base = STAGE_PALETTES[stage] || STAGE_PALETTES.s1;
  const merged = /_boss$/.test(mode) ? { ...base, ...(base.boss || {}) } : base;
  return {
    skyTop: cssToHex(merged.sky?.[0] || '#07080c'),
    skyBot: cssToHex(merged.sky?.[1] || '#12161c'),
    ink: cssToHex(merged.ink || '#05070a'),
    accent: cssToHex(merged.accent || '#ffffff'),
    accent2: cssToHex(merged.accent2 || '#cccccc'),
    glow: cssToHex(merged.glow || '#ffffff'),
    fog: cssToHex(merged.fog || '#555555'),
    seal: cssToHex(merged.seal || '#b3342e'),
    ambient: mixHex(cssToHex(merged.ink || '#05070a'), 0x6a7488, 0.55),
  };
}

export class PlayfieldStage3D {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    const THREE = getThree();
    if (!THREE) throw new Error('three not loaded');
    if (!canvas) throw new Error('missing 3d canvas');
    this.THREE = THREE;
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: false, powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    if (THREE.SRGBColorSpace) this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, W / H, 0.1, 280);
    this.camera.position.set(0, 0, 0);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.mode = null;
    this.stage = null;
    this.sceneReady = false;
    this.is3D = true;
    this.t = 0;
    this.speed = 10;
    this.swayX = 0.5;
    this.swayY = 0.3;
    this.animated = [];
    this.fields = [];
    this.pointSets = [];
    this.lights = [];
    this.ownedTextures = [];
    this._lastRender = 0;
    this._renderEvery = 1000 / 45;
    this._warned = false;
    this._contextLost = false;
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this._contextLost = true;
    }, false);
    this.canvas.addEventListener('webglcontextrestored', () => {
      this._contextLost = false;
      this.sceneReady = false;
      try {
        this.setMode(this.mode || 's1_mid', { transition: false });
      } catch (err) {
        this._warn(err);
      }
    }, false);
  }

  _warn(err) {
    if (this._warned) return;
    this._warned = true;
    console.warn('[bg3d] scene failed:', err);
  }

  _makeCtx() {
    const self = this;
    const THREE = this.THREE;
    const stage = sceneFor(this.mode)?.stage || 's1';
    const palette = paletteForMode(this.mode);
    const ctx = {
      THREE,
      mode: this.mode,
      stage,
      palette,
      scene: this.scene,
      root: this.root,
      camera: this.camera,
      K,
      /** 加对象到 root，返回对象 */
      add(obj) {
        if (obj) self.root.add(obj);
        return obj;
      },
      /** 注册通用动画（spinZ/spinY/bob/pulse/orbit/float） */
      animate(obj, spec) {
        if (obj && spec) self.animated.push({ o: obj, spec });
        return obj;
      },
      /** 循环逼近的景物：factory(i, z) 返回 Object3D，沿 +Z 到 6 后回卷 */
      field(factory, {
        count = 4, zNear = -12, zFar = -110, xRange = 10, yRange = 4,
        y = null, speedMul = 1, jitter = 0.4, xAbsMin = 0,
      } = {}) {
        const range = zNear - zFar;
        const items = [];
        for (let i = 0; i < count; i++) {
          const r = ((i / Math.max(1, count - 1)) + (K.hash01(i * 31 + 7) - 0.5) * jitter) * range;
          const z = zFar + ((r % range) + range) % range;
          const obj = factory(i, z);
          if (!obj) continue;
          let px = (K.hash01(i * 53 + 11) - 0.5) * xRange;
          if (xAbsMin > 0 && Math.abs(px) < xAbsMin) {
            px = (px < 0 ? -1 : 1) * (xAbsMin + K.hash01(i * 59 + 5) * xAbsMin);
          }
          obj.position.x = px;
          obj.position.y = y === null ? (K.hash01(i * 71 + 3) - 0.5) * yRange : y;
          obj.position.z = z;
          self.root.add(obj);
          items.push({ o: obj, baseX: obj.position.x, baseY: obj.position.y });
        }
        const f = { items, range, speedMul };
        self.fields.push(f);
        return f;
      },
      /** 粒子组 */
      points(opts) {
        const ps = K.points(opts);
        self.root.add(ps.points);
        self.pointSets.push(ps);
        return ps;
      },
      /** 背景色/雾/灯 */
      atmosphere(opts = {}) {
        const merged = { ...opts, bg: opts.fogColor ?? opts.bg };
        const lights = K.atmosphere(self.scene, merged);
        self.lights.push(lights.amb, lights.dir);
        return lights;
      },
      setSpeed(v) {
        self.speed = v;
      },
      setSway(x, y) {
        self.swayX = x;
        self.swayY = y;
      },
      plateTexture() {
        return K.plateTexture(self.mode);
      },
      matTexture(name, color) {
        return K.matTexture(name, color);
      },
      /** 绘卷贴图裁片（sx/sy/sw/sh 归一化 0..1）；纹理由场景持有并在 clear 释放 */
      plateCrop(sx, sy, sw, sh) {
        const raw = K.plateTexture(self.mode);
        const tex = raw ? K.cropTexture(raw, sx, sy, sw, sh) : null;
        if (tex) self.ownedTextures.push(tex);
        return tex;
      },
      /** 文本 sprite（返回 sprite；纹理归场景持有并在 clear 时释放） */
      textSprite(lines, opts = {}) {
        const { sprite, texture } = K.textSprite(lines, opts);
        self.ownedTextures.push(texture);
        return sprite;
      },
    };
    return ctx;
  }

  /**
   * 切换场景。
   * @param {string} mode
   * @param {{transition?: boolean}} [opts]
   */
  setMode(mode, { transition = true } = {}) {
    const next = resolveBgMode(mode);
    if (this.sceneReady && next === this.mode) return;
    this._clear();
    this.mode = next;
    this.stage = sceneFor(next)?.stage || 's1';
    try {
      const builder = SCENES3D[next];
      if (typeof builder !== 'function') throw new Error(`missing 3D scene: ${next}`);
      builder(this._makeCtx());
      this.sceneReady = true;
      if (transition) this.flash(0.5);
    } catch (err) {
      this._warn(err);
      this.sceneReady = false;
    }
  }

  /** 画面闪白（切场景时由 CSS 动画呈现更省 GPU；这里仅保留接口） */
  flash(strength = 0.4) {
    const el = this.canvas;
    if (!el || typeof el.classList === 'undefined') return;
    el.style.setProperty('--bg3d-flash', String(strength));
    el.classList.remove('bg3d-flash');
    // 强制重启动画
    void el.offsetWidth;
    el.classList.add('bg3d-flash');
  }

  _clear() {
    if (!this.scene) return;
    for (const l of this.lights) {
      this.scene.remove(l);
      l.dispose?.();
    }
    this.lights.length = 0;
    for (const tex of this.ownedTextures) tex?.dispose?.();
    this.ownedTextures.length = 0;
    while (this.root.children.length) {
      const o = this.root.children[0];
      this.root.remove(o);
      o.traverse?.((c) => {
        c.geometry?.dispose?.();
        if (c.material) {
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          for (const m of mats) {
            m.map?.dispose?.();
            m.dispose?.();
          }
        }
      });
    }
    this.animated.length = 0;
    this.fields.length = 0;
    this.pointSets.length = 0;
    this.scene.fog = null;
    this.sceneReady = false;
  }

  /** @param {number} dt 秒 */
  update(dt) {
    this.t += dt;
    if (!this.sceneReady) return;
    const t = this.t;
    // 通用动画
    for (const { o, spec } of this.animated) {
      if (spec.spinZ) o.rotation.z += spec.spinZ * dt;
      if (spec.spinY) o.rotation.y += spec.spinY * dt;
      if (spec.spinX) o.rotation.x += spec.spinX * dt;
      if (spec.bob) o.position.y += Math.sin(t * (spec.bob.speed || 1) + (spec.bob.phase || 0)) * (spec.bob.amp || 0.3) * dt * 2;
      if (spec.pulse) {
        const s = 1 + Math.sin(t * (spec.pulse.speed || 2) + (spec.pulse.phase || 0)) * (spec.pulse.amp || 0.06);
        o.scale.setScalar(s);
      }
      if (spec.orbit) {
        const orb = spec.orbit;
        const a = t * (orb.speed || 0.4) + (orb.phase || 0);
        o.position.x = Math.cos(a) * (orb.r || 6);
        o.position.z = -18 + Math.sin(a) * (orb.r || 6) * 0.5;
        if (orb.yAmp) o.position.y = Math.sin(a * 1.3) * orb.yAmp;
      }
    }
    // 循环逼近
    for (const f of this.fields) {
      for (const it of f.items) {
        it.o.position.z += this.speed * dt * f.speedMul;
        if (it.o.position.z > -10) {
          it.o.position.z -= f.range;
        }
      }
    }
    // 粒子
    for (const ps of this.pointSets) K.updatePoints(ps, dt, t);
    // 相机轻微漂浮（超现实的不稳定感）
    this.camera.position.x = Math.sin(t * 0.21) * this.swayX;
    this.camera.position.y = Math.sin(t * 0.166 + 1.1) * this.swayY;
    this.camera.lookAt(0, 0, -12);
  }

  /** 渲染到自己的 WebGL canvas（兼容 2D 的 draw(ctx) 调用；ctx 参数忽略） */
  draw() {
    if (!this.sceneReady || this._contextLost) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : 0);
    if (now - this._lastRender < this._renderEvery) return;
    this._lastRender = now;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._clear();
    this.renderer?.dispose?.();
    this.is3D = false;
  }
}
