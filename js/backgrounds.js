/**
 * Three.js 左侧关卡印象图
 */
import * as THREE from 'three';

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
    this.tendency = { a: 0, b: 0 };
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
    if (this.mode === mode) return;
    this.mode = mode;
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
          if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
          else c.material.dispose?.();
        }
      });
    }
    this.particles = null;
    this.extras = [];
    this.scene.background = new THREE.Color(0x0a0c10);
  }

  _rebuild() {
    this._clear();
    const m = this.mode;
    if (m === 's1_mid') this._s1mid();
    else if (m === 's1_boss') this._s1boss();
    else if (m === 's2_mid') this._s2mid();
    else if (m === 's2_boss') this._s2boss();
    else if (m === 's3_mid') this._s3mid();
    else if (m === 's3_boss') this._s3boss();
    else if (m === 'patrol') this._patrol();
    else if (m === 'a4_mid' || m === 'a4_boss') this._a4(m.endsWith('boss'));
    else if (m === 'a5_mid' || m === 'a5_boss') this._a5(m.endsWith('boss'));
    else if (m === 'a6_mid' || m === 'a6_boss') this._a6(m.endsWith('boss'));
    else if (m === 'b4_mid' || m === 'b4_boss') this._b4(m.endsWith('boss'));
    else if (m === 'b5_mid' || m === 'b5_boss') this._b5(m.endsWith('boss'));
    else if (m === 'b6_mid' || m === 'b6_boss') this._b6(m.endsWith('boss'));
    else this._s1mid();
  }

  _addLights(color = 0x88aaff, intensity = 1.2) {
    const amb = new THREE.AmbientLight(0x334455, 0.6);
    const dir = new THREE.DirectionalLight(color, intensity);
    dir.position.set(3, 5, 8);
    this.root.add(amb, dir);
  }

  _points(count, color, spread = 12) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.08, transparent: true, opacity: 0.85 });
    const pts = new THREE.Points(geo, mat);
    this.root.add(pts);
    this.particles = pts;
    return pts;
  }

  _s1mid() {
    this.scene.background = new THREE.Color(0x0a1a12);
    this._addLights(0x66ffaa);
    for (let i = 0; i < 40; i++) {
      const geo = new THREE.BoxGeometry(0.08, 0.08, 2 + Math.random() * 4);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.35, 0.6, 0.3 + Math.random() * 0.3),
        transparent: true,
        opacity: 0.7,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 20);
      mesh.userData.speed = 2 + Math.random() * 4;
      this.root.add(mesh);
      this.extras = this.extras || [];
      this.extras.push(mesh);
    }
    this._points(200, 0x88ffaa, 16);
  }

  _s1boss() {
    this.scene.background = new THREE.Color(0x1a0a14);
    this._addLights(0xff88cc, 1.5);
    const t1 = new THREE.Mesh(
      new THREE.TorusGeometry(4, 0.35, 12, 48),
      new THREE.MeshStandardMaterial({ color: 0xf9a8d4, emissive: 0x882244, metalness: 0.7, roughness: 0.3 })
    );
    const t2 = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.25, 12, 40),
      new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x226666, metalness: 0.7, roughness: 0.3 })
    );
    t1.userData.rot = 0.6;
    t2.userData.rot = -1.1;
    this.root.add(t1, t2);
    this.extras = [t1, t2];
    this._points(300, 0xffaadd, 10);
  }

  _s2mid() {
    this.scene.background = new THREE.Color(0x060e1a);
    this._addLights(0x4488ff);
    for (let i = 0; i < 24; i++) {
      const geo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 6);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1e3a5f,
        emissive: Math.random() < 0.2 ? 0xff2222 : 0x112244,
        flatShading: true,
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8);
      m.rotation.set(Math.random(), Math.random(), Math.random());
      this.root.add(m);
      this.extras = this.extras || [];
      this.extras.push(m);
    }
    this._points(180, 0x66aaff, 14);
  }

  _s2boss() {
    this.scene.background = new THREE.Color(0x040a14);
    this._addLights(0xaaddff, 1.4);
    const group = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const pts = [];
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * (3 - i), Math.sin(a) * (3 - i), 0));
      }
      pts.push(pts[0].clone());
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7dd3fc }));
      line.rotation.x = i * 0.4;
      group.add(line);
    }
    group.userData.rot = 0.4;
    this.root.add(group);
    this.extras = [group];
    this._points(250, 0xaaf0ff, 9);
  }

  _s3mid() {
    this.scene.background = new THREE.Color(0x0c0a08);
    this._addLights(0xffcc88);
    // left chrome grid
    const left = new THREE.GridHelper(8, 12, 0x88aacc, 0x445566);
    left.position.x = -4;
    left.rotation.x = Math.PI / 2;
    // right warm blocks
    const rightG = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xea580c, emissive: 0x7c2d12 })
      );
      b.position.set(3 + Math.random() * 3, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4);
      rightG.add(b);
    }
    this.root.add(left, rightG);
    this.extras = [left, rightG];
    this._points(150, 0xffddaa, 12);
  }

  _s3boss() {
    this.scene.background = new THREE.Color(0x1a1008);
    this._addLights(0xffaa44, 1.6);
    const outer = new THREE.Mesh(
      new THREE.IcosahedronGeometry(4, 0),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, wireframe: true })
    );
    const inner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.4, 0),
      new THREE.MeshBasicMaterial({ color: 0xfb923c, wireframe: true })
    );
    outer.userData.rot = 0.5;
    inner.userData.rot = -0.8;
    this.root.add(outer, inner);
    this.extras = [outer, inner];
    this._points(280, 0xffcc66, 10);
  }

  _patrol() {
    this.scene.background = new THREE.Color(0x100000);
    this._addLights(0xff4444, 1.2);
    for (let i = 0; i < 20; i++) {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.15, 0.4),
        new THREE.MeshBasicMaterial({ color: 0xff2244, transparent: true, opacity: 0.5 })
      );
      b.position.set(0, (i - 10) * 0.9, -2);
      b.userData.phase = i;
      this.root.add(b);
      this.extras = this.extras || [];
      this.extras.push(b);
    }
    this._points(200, 0xff4466, 14);
  }

  _a4(boss) {
    this.scene.background = new THREE.Color(boss ? 0x2a0808 : 0x1a1408);
    this._addLights(0xffd700, 1.3);
    for (let i = 0; i < (boss ? 12 : 8); i++) {
      const h = 2 + Math.random() * 4;
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(0.4, h, 4),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0x92400e, metalness: 0.6 })
      );
      m.position.set((Math.random() - 0.5) * 10, h / 2 - 3, (Math.random() - 0.5) * 6);
      if (boss) m.rotation.z = (Math.random() - 0.5) * 1.5;
      this.root.add(m);
      this.extras = this.extras || [];
      this.extras.push(m);
    }
    this._points(180, 0xffe066, 12);
  }

  _a5(boss) {
    this.scene.background = new THREE.Color(0x0a0a14);
    this._addLights(0xaaccff);
    const b1 = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x1e40af, emissiveIntensity: 0.8 })
    );
    const b2 = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xf9a8d4, emissive: 0x9d174d, emissiveIntensity: 0.8 })
    );
    b1.position.x = -2.5;
    b2.position.x = 2.5;
    if (boss) {
      b1.position.set(-0.5, 0, 0);
      b2.position.set(0.5, 0, 0);
    }
    this.root.add(b1, b2);
    this.extras = [b1, b2];
    this._points(220, 0xddaaff, 10);
  }

  _a6(boss) {
    this.scene.background = new THREE.Color(boss ? 0x1a0010 : 0x140818);
    this._addLights(0xff88cc);
    for (let i = 0; i < 15; i++) {
      const m = new THREE.Mesh(
        new THREE.TorusGeometry(0.5 + Math.random(), 0.08, 8, 20),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.85 + Math.random() * 0.1, 0.7, 0.55),
          emissive: 0x440033,
        })
      );
      m.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6);
      m.rotation.set(Math.random() * 2, Math.random() * 2, 0);
      this.root.add(m);
      this.extras = this.extras || [];
      this.extras.push(m);
    }
    this._points(200, 0xff99dd, 11);
  }

  _b4(boss) {
    this.scene.background = new THREE.Color(0x140808);
    this._addLights(0xff4444);
    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.4, 12, 32),
      new THREE.MeshStandardMaterial({ color: 0xfb7185, emissive: 0x7f1d1d, metalness: 0.5 })
    );
    for (let i = 0; i < 12; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.8, 6),
        new THREE.MeshBasicMaterial({ color: 0xff2222 })
      );
      const a = (i / 12) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 2.9, Math.sin(a) * 2.9, 0);
      spike.rotation.z = a - Math.PI / 2;
      wheel.add(spike);
    }
    wheel.userData.rot = boss ? 2.5 : 1.2;
    this.root.add(wheel);
    this.extras = [wheel];
    this._points(160, 0xff6688, 12);
  }

  _b5(boss) {
    this.scene.background = new THREE.Color(0x0a0810);
    this._addLights(0xff8844);
    const shoe = new THREE.Group();
    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.4, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x44403c })
    );
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x78716c })
    );
    body.position.y = 0.5;
    shoe.add(sole, body);
    shoe.userData.bounce = true;
    this.root.add(shoe);
    this.extras = [shoe];
    if (boss) {
      for (let i = 0; i < 4; i++) {
        const c = shoe.clone();
        c.position.set((i - 1.5) * 2, 0, -i);
        c.userData.bounce = true;
        c.userData.phase = i;
        this.root.add(c);
        this.extras.push(c);
      }
    }
    this._points(140, 0xffaa66, 10);
  }

  _b6(boss) {
    this.scene.background = new THREE.Color(boss ? 0x102000 : 0x0a1208);
    this._addLights(0xa3e635, 1.2);
    this._points(400, boss ? 0x84cc16 : 0xd9f99d, 14);
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.8, 2.5, 12),
      new THREE.MeshBasicMaterial({ color: 0xa3e635, wireframe: true })
    );
    if (boss) bottle.scale.set(1.5, 1.5, 1.5);
    this.root.add(bottle);
    this.extras = [bottle];
  }

  update() {
    const t = this.clock.getElapsedTime();
    const dt = this.clock.getDelta();

    if (this.particles) {
      this.particles.rotation.y = t * 0.05;
      const pos = this.particles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + 0.01;
        if (y > 8) y = -8;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    if (this.extras) {
      for (const e of this.extras) {
        if (e.userData.rot) {
          e.rotation.z += e.userData.rot * dt;
          e.rotation.x += e.userData.rot * 0.3 * dt;
        }
        if (e.userData.speed) {
          e.position.z += e.userData.speed * dt;
          if (e.position.z > 10) e.position.z = -15;
        }
        if (e.userData.bounce) {
          const ph = e.userData.phase || 0;
          e.position.y = Math.abs(Math.sin(t * 4 + ph)) * 1.5 - 1;
        }
        if (e.userData.phase != null && e.isMesh && e.geometry?.type === 'BoxGeometry') {
          e.material.opacity = 0.3 + Math.sin(t * 5 + e.userData.phase) * 0.25;
        }
      }
    }

    // stage 3 tendency bias
    if (this.mode === 's3_mid' && this.extras?.length >= 2) {
      const pct = this.tendency.pct || 0;
      const boostA = Math.min(1, Math.abs(Math.min(0, pct)) / 70);
      const boostB = Math.min(1, Math.max(0, pct) / 70);
      this.extras[0].position.x = -4 - boostA;
      this.extras[1].position.x = boostB * 0.5;
    }

    this.camera.position.x = Math.sin(t * 0.2) * 0.5;
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }
}

export function bgModeFor(stageKey, isBoss) {
  const map = {
    1: ['s1_mid', 's1_boss'],
    2: ['s2_mid', 's2_boss'],
    3: ['s3_mid', 's3_boss'],
    patrol: ['patrol', 'patrol'],
    A4: ['a4_mid', 'a4_boss'],
    A5: ['a5_mid', 'a5_boss'],
    A6: ['a6_mid', 'a6_boss'],
    B4: ['b4_mid', 'b4_boss'],
    B5: ['b5_mid', 'b5_boss'],
    B6: ['b6_mid', 'b6_boss'],
  };
  const p = map[stageKey] || map[1];
  return isBoss ? p[1] : p[0];
}
