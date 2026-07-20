/**
 * Three.js 左侧关卡印象 — StageBackground 类
 * mode 登记：js/bgModes.js；场景 builder 见 scenes.js + STAGE_BG_BUILDERS
 */
import * as THREE from 'three';
import { resolveBgMode } from '../bgModes.js';
import { STAGE_BG_BUILDERS } from './builders.js';
import { makeTextTexture } from './textTexture.js';

export class StageBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    this.camera.position.z = 18;
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.particles = null;
    this.clock = new THREE.Clock();
    this.mode = 's1_mid';
    this.tendency = { a: 0, b: 0, pct: 0 };
    this.extras = [];
    this.labels = [];
    this.fogColor = 0x0a0c10;
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const w = this.canvas.clientWidth || 200;
    const h = this.canvas.clientHeight || 600;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setMode(mode) {
    const next = resolveBgMode(mode);
    if (this.mode === next) return;
    this.mode = next;
    this._rebuild();
  }

  setTendency(pct) {
    this.tendency.pct = pct;
  }

  _clear() {
    while (this.root.children.length) {
      const o = this.root.children[0];
      this.root.remove(o);
      o.traverse?.((c) => {
        c.geometry?.dispose?.();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m) => {
            m.map?.dispose?.();
            m.dispose?.();
          });
          else {
            c.material.map?.dispose?.();
            c.material.dispose?.();
          }
        }
      });
    }
    this.particles = null;
    this.extras = [];
    this.labels = [];
    this.scene.background = new THREE.Color(0x0a0c10);
    this.scene.fog = null;
  }

  _rebuild() {
    this._clear();
    const m = resolveBgMode(this.mode);
    const build = STAGE_BG_BUILDERS[m] || STAGE_BG_BUILDERS.s1_mid;
    build(this);
  }

  _addLights(color = 0x88aaff, intensity = 1.2, amb = 0.55) {
    const a = new THREE.AmbientLight(0x334455, amb);
    const dir = new THREE.DirectionalLight(color, intensity);
    dir.position.set(3, 5, 8);
    const fill = new THREE.PointLight(color, 0.45, 40);
    fill.position.set(-4, -2, 6);
    this.root.add(a, dir, fill);
  }

  /**
   * 统一氛围：背景色 + 指数雾 + 三点光（各 mode 参数表入口）
   * @param {{ bg?: number, fog?: number, fogColor?: number, light?: number, intensity?: number, amb?: number }} p
   */
  _atmosphere({
    bg = 0x0a0c10, fog = 0.03, fogColor, light = 0x88aaff, intensity = 1.2, amb = 0.55,
  } = {}) {
    this.scene.background = new THREE.Color(bg);
    this.scene.fog = fog > 0 ? new THREE.FogExp2(fogColor ?? bg, fog) : null;
    this._addLights(light, intensity, amb);
  }

  /**
   * 批量散布几何：默认 (rand-0.5)*spread 落位并 extras
   * @param {number} count
   * @param {(i: number) => THREE.Object3D | null | undefined} factory
   * @param {{
   *   spread?: [number, number, number],
   *   place?: (mesh: THREE.Object3D, i: number) => void,
   *   skipAdd?: boolean,
   * }} [opts]
   * @returns {THREE.Object3D[]}
   */
  _scatter(count, factory, opts = {}) {
    const spread = opts.spread || [10, 10, 8];
    const out = [];
    for (let i = 0; i < count; i++) {
      const mesh = factory(i);
      if (!mesh) continue;
      if (opts.place) {
        opts.place(mesh, i);
      } else if (!mesh.userData.fixed) {
        mesh.position.set(
          (Math.random() - 0.5) * spread[0],
          (Math.random() - 0.5) * spread[1],
          (Math.random() - 0.5) * spread[2],
        );
      }
      if (!opts.skipAdd) {
        this.root.add(mesh);
        this.extras.push(mesh);
      }
      out.push(mesh);
    }
    return out;
  }

  /** 环上放齿/钉等子网格 */
  _ringTeeth(parent, n, radius, geo, mat, { rotFollow = true } = {}) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const tooth = new THREE.Mesh(geo, mat);
      tooth.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      if (rotFollow) tooth.rotation.z = a;
      parent.add(tooth);
    }
  }

  _points(count, color, spread = 12, size = 0.08) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      // Three r160: PointsMaterial uses sizeAttenuation (not depthAttenuation)
      color, size, transparent: true, opacity: 0.85, sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    this.root.add(pts);
    this.particles = pts;
    return pts;
  }

  _labelPlane(text, opts = {}) {
    const {
      color = '#e0ffe8', scale = [3.2, 1.0], pos = [0, 0, 0],
      rot = [0, 0, 0], blink = false, font = 'bold 32px monospace',
    } = opts;
    const tex = makeTextTexture(text, {
      fill: color, font, w: 320, h: 96, bg: 'rgba(0,0,0,0.45)',
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(scale[0], scale[1]),
      new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthWrite: false,
      })
    );
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    mesh.userData.blink = blink;
    mesh.userData.baseOp = 0.92;
    this.root.add(mesh);
    this.labels.push(mesh);
    this.extras.push(mesh);
    return mesh;
  }

  update() {
    const t = this.clock.getElapsedTime();
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.particles) {
      this.particles.rotation.y = t * 0.05;
      const pos = this.particles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + 0.012;
        if (y > 8) y = -8;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    for (const e of this.extras) {
      const ud = e.userData || {};
      if (ud.rot) {
        e.rotation.z += ud.rot * dt;
        e.rotation.x += ud.rot * 0.28 * dt;
      }
      if (ud.speed || ud.tunnel) {
        const sp = ud.speed || 2;
        e.position.z += sp * dt;
        if (e.position.z > 12) e.position.z = -16;
      }
      if (ud.bounce) {
        const ph = ud.phase || 0;
        e.position.y = Math.abs(Math.sin(t * 4.2 + ph)) * 1.6 - 1.05;
      }
      if (ud.floatY) {
        const ph = ud.phase || 0;
        e.position.y += Math.sin(t * 1.4 + ph) * 0.004;
      }
      if (ud.drift) {
        e.position.y += Math.sin(t * ud.drift + (ud.phase || 0)) * 0.008;
        e.rotation.y += dt * 0.2;
      }
      if (ud.spin) e.rotation.z += ud.spin * dt;
      if (ud.stripe && e.material) {
        e.material.opacity = 0.28 + Math.sin(t * 5 + (ud.phase || 0)) * 0.22;
      }
      if (ud.scan) {
        e.position.y = Math.sin(t * 1.1) * 6;
        e.material.opacity = 0.35 + Math.sin(t * 3) * 0.2;
      }
      if (ud.glitch) {
        e.position.x += Math.sin(t * 20 + e.position.z) * 0.004;
        e.material.opacity = 0.02 + Math.abs(Math.sin(t * 12)) * 0.06;
      }
      if (ud.orbit) {
        const o = ud.orbit;
        o.a += o.speed * dt;
        e.position.x = Math.cos(o.a) * o.r;
        e.position.z = Math.sin(o.a) * o.r * 0.6;
        if (o.yAmp) e.position.y = Math.sin(o.a * 1.5) * o.yAmp;
      }
      if (ud.spiral) {
        e.position.x = Math.sin(t * 0.6) * 2.5;
        e.position.y = Math.cos(t * 0.4) * 1.2;
        e.rotation.x = t * 0.8;
      }
      if (ud.shatter) {
        e.scale.setScalar(1 + Math.sin(t * 2.5) * 0.04);
      }
      if (ud.blink && e.material) {
        e.material.opacity = (ud.baseOp || 0.85) * (0.55 + 0.45 * Math.abs(Math.sin(t * 3.5)));
      }
    }

    for (const lb of this.labels) {
      if (lb.userData.blink && lb.material) {
        lb.material.opacity = lb.userData.baseOp * (0.5 + 0.5 * Math.abs(Math.sin(t * 3.2)));
      }
    }

    // 3面倾向：左右动态增强
    if (this.mode === 's3_mid' && this.extras?.length >= 2) {
      const pct = this.tendency.pct || 0;
      const boostA = Math.min(1, Math.abs(Math.min(0, pct)) / 70);
      const boostB = Math.min(1, Math.max(0, pct) / 70);
      this.extras[0].position.x = -4.2 - boostA * 0.8;
      this.extras[0].scale.setScalar(1 + boostA * 0.15);
      this.extras[1].position.x = 2.8 + boostB * 0.6;
      this.extras[1].scale.setScalar(1 + boostB * 0.15);
    }

    this.camera.position.x = Math.sin(t * 0.2) * 0.55;
    this.camera.position.y = Math.cos(t * 0.13) * 0.25;
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }
}
