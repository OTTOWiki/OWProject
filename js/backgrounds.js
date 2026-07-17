/**
 * Three.js 左侧关卡印象图 — 按剧情主题差异化
 * 严禁人形；仅几何 / 粒子 / 线框 / 文字平面
 */
import * as THREE from 'three';

function makeTextTexture(lines, {
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
    const m = this.mode;
    if (m === 's1_mid') this._s1mid();
    else if (m === 's1_boss') this._s1boss();
    else if (m === 's2_mid') this._s2mid();
    else if (m === 's2_boss') this._s2boss();
    else if (m === 's3_mid') this._s3mid();
    else if (m === 's3_boss') this._s3boss();
    else if (m === 'patrol') this._patrol();
    else if (m === 'a4_mid' || m === 'a4_boss') this._a4(m.endsWith('boss'));
    else if (m === 'a5_mid' || m === 'a5_boss' || m === 'ex_mid') this._a5(m.endsWith('boss'));
    else if (m === 'a6_mid' || m === 'a6_boss' || m === 'ex_boss') this._a6(m === 'a6_boss' || m === 'ex_boss');
    else if (m === 'b4_mid' || m === 'b4_boss') this._b4(m.endsWith('boss'));
    else if (m === 'b5_mid' || m === 'b5_boss') this._b5(m.endsWith('boss'));
    else if (m === 'b6_mid' || m === 'b6_boss') this._b6(m.endsWith('boss'));
    else this._s1mid();
  }

  _addLights(color = 0x88aaff, intensity = 1.2, amb = 0.55) {
    const a = new THREE.AmbientLight(0x334455, amb);
    const dir = new THREE.DirectionalLight(color, intensity);
    dir.position.set(3, 5, 8);
    const fill = new THREE.PointLight(color, 0.45, 40);
    fill.position.set(-4, -2, 6);
    this.root.add(a, dir, fill);
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
      // Three r160+：PointsMaterial 用 sizeAttenuation（depthAttenuation 会告警且无效）
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

  /** 1面道中：维基外围 · 零散草稿 — 深绿代码隧道 */
  _s1mid() {
    this.scene.background = new THREE.Color(0x07140e);
    this.scene.fog = new THREE.FogExp2(0x07140e, 0.035);
    this._addLights(0x66ffaa, 1.1, 0.5);
    const chars = '草稿OTTO#[]{}<>wiki编辑';
    for (let i = 0; i < 48; i++) {
      const geo = new THREE.BoxGeometry(0.06, 0.06, 2.2 + Math.random() * 5);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.33 + Math.random() * 0.06, 0.55, 0.28 + Math.random() * 0.35),
        transparent: true,
        opacity: 0.55 + Math.random() * 0.35,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const r = 2.2 + Math.random() * 5;
      const a = Math.random() * Math.PI * 2;
      mesh.position.set(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.7, (Math.random() - 0.5) * 22);
      mesh.userData.speed = 2.5 + Math.random() * 5;
      mesh.userData.tunnel = true;
      this.root.add(mesh);
      this.extras.push(mesh);
    }
    for (let i = 0; i < 10; i++) {
      const ch = chars[i % chars.length];
      const tex = makeTextTexture(ch, {
        w: 64, h: 64, fill: '#9dffc0', font: 'bold 36px monospace', bg: 'rgba(10,40,24,0.5)',
      });
      const p = new THREE.Mesh(
        new THREE.PlaneGeometry(0.55, 0.55),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
      );
      p.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 14);
      p.userData.speed = 1.5 + Math.random() * 2;
      p.userData.tunnel = true;
      this.root.add(p);
      this.extras.push(p);
    }
    this._labelPlane(['维基外围', '零散草稿'], {
      color: '#a8ffc8', pos: [0, 5.2, -2], scale: [4.2, 1.35],
    });
    this._points(220, 0x88ffaa, 16, 0.07);
  }

  /** 1面Boss：爱丽丝 — 粉青齿轮法阵 */
  _s1boss() {
    this.scene.background = new THREE.Color(0x1a0a16);
    this.scene.fog = new THREE.FogExp2(0x1a0a16, 0.028);
    this._addLights(0xff88cc, 1.6, 0.45);
    const gearMat = (c, e) => new THREE.MeshStandardMaterial({
      color: c, emissive: e, metalness: 0.75, roughness: 0.28,
    });
    const t1 = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.38, 14, 56), gearMat(0xf9a8d4, 0x882244));
    const t2 = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.28, 12, 44), gearMat(0x67e8f9, 0x226666));
    const t3 = new THREE.Mesh(
      new THREE.TorusGeometry(1.4, 0.12, 10, 32),
      new THREE.MeshBasicMaterial({ color: 0xffe4f0, transparent: true, opacity: 0.85 })
    );
    // 齿轮齿
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const tooth = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.55, 0.35),
        gearMat(0xfbcfe8, 0x6b1d3a)
      );
      tooth.position.set(Math.cos(a) * 4.55, Math.sin(a) * 4.55, 0);
      tooth.rotation.z = a;
      t1.add(tooth);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const tooth = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.4, 0.22),
        gearMat(0xa5f3fc, 0x155e75)
      );
      tooth.position.set(Math.cos(a) * 3.0, Math.sin(a) * 3.0, 0);
      tooth.rotation.z = a;
      t2.add(tooth);
    }
    t1.userData.rot = 0.55;
    t2.userData.rot = -1.05;
    t3.userData.rot = 0.9;
    this.root.add(t1, t2, t3);
    this.extras.push(t1, t2, t3);
    this._labelPlane('【爱丽丝】', {
      color: '#ffc0e0', pos: [0, 0, 0.4], scale: [3.6, 1.1], blink: true,
      font: 'bold 36px "Microsoft YaHei", sans-serif',
    });
    this._labelPlane('编辑程序测试', {
      color: '#a5f3fc', pos: [0, -4.8, 0], scale: [3.4, 0.9],
    });
    this._points(340, 0xffaadd, 11, 0.09);
  }

  /** 2面道中：编辑日常 — 深蓝六角数据断裂带 */
  _s2mid() {
    this.scene.background = new THREE.Color(0x050e1c);
    this.scene.fog = new THREE.FogExp2(0x050e1c, 0.032);
    this._addLights(0x4488ff, 1.25);
    for (let i = 0; i < 28; i++) {
      const geo = new THREE.CylinderGeometry(0.35, 0.35, 1.1 + Math.random() * 0.8, 6);
      const warn = Math.random() < 0.22;
      const mat = new THREE.MeshStandardMaterial({
        color: warn ? 0x7f1d1d : 0x1e3a5f,
        emissive: warn ? 0xff2222 : 0x112244,
        emissiveIntensity: warn ? 0.9 : 0.35,
        flatShading: true,
        metalness: 0.4,
        roughness: 0.55,
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.set((Math.random() - 0.5) * 11, (Math.random() - 0.5) * 11, (Math.random() - 0.5) * 9);
      m.rotation.set(Math.random(), Math.random(), Math.random());
      m.userData.drift = 0.3 + Math.random() * 0.5;
      m.userData.phase = Math.random() * 10;
      this.root.add(m);
      this.extras.push(m);
    }
    // 红色警告三角
    for (let i = 0; i < 8; i++) {
      const tri = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 0.7, 3),
        new THREE.MeshBasicMaterial({ color: 0xff3344, transparent: true, opacity: 0.85 })
      );
      tri.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6);
      tri.userData.spin = 1 + Math.random();
      tri.userData.blink = true;
      this.root.add(tri);
      this.extras.push(tri);
    }
    // 二进制飘带
    for (let i = 0; i < 6; i++) {
      const bits = Array.from({ length: 8 }, () => (Math.random() > 0.5 ? '1' : '0')).join('');
      const tex = makeTextTexture(bits, {
        w: 200, h: 40, fill: '#7dd3fc', font: '18px monospace', bg: 'rgba(8,20,40,0.4)',
      });
      const p = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 0.45),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      p.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 5);
      p.userData.floatY = true;
      p.userData.phase = i;
      this.root.add(p);
      this.extras.push(p);
    }
    this._labelPlane(['编辑日常', '审核冲突'], {
      color: '#93c5fd', pos: [0, 5.4, -1], scale: [4.0, 1.3],
    });
    this._points(200, 0x66aaff, 14);
  }

  /** 2面Boss：Icebin — 六角冰晶矩阵 */
  _s2boss() {
    this.scene.background = new THREE.Color(0x030a16);
    this.scene.fog = new THREE.FogExp2(0x030a16, 0.03);
    this._addLights(0xaaddff, 1.55, 0.4);
    const crystal = new THREE.Group();
    for (let ring = 0; ring < 4; ring++) {
      const n = 6;
      const r = 1.4 + ring * 1.15;
      for (let j = 0; j < n; j++) {
        const a = (j / n) * Math.PI * 2 + ring * 0.2;
        const pts = [];
        for (let k = 0; k < 6; k++) {
          const aa = (k / 6) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(aa) * 0.55, Math.sin(aa) * 0.55, 0));
        }
        pts.push(pts[0].clone());
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(
          geo,
          new THREE.LineBasicMaterial({
            color: ring % 2 ? 0x7dd3fc : 0xe0f2fe,
            transparent: true,
            opacity: 0.85,
          })
        );
        line.position.set(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15, 0);
        line.scale.setScalar(r * 0.55);
        crystal.add(line);
      }
    }
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.1, 0),
      new THREE.MeshBasicMaterial({ color: 0xbae6fd, wireframe: true })
    );
    crystal.add(core);
    crystal.userData.rot = 0.45;
    this.root.add(crystal);
    this.extras.push(crystal);
    // 冰蓝粒子流
    this._points(280, 0xaaf0ff, 10, 0.07);
    this._labelPlane('【Icebin】', {
      color: '#e0f2fe', pos: [0, 0, 1.2], scale: [3.4, 1.0], blink: true,
      font: 'bold 34px "Microsoft YaHei", sans-serif',
    });
    this._labelPlane('编译防火墙', {
      color: '#67e8f9', pos: [0, -4.6, 0], scale: [3.2, 0.85],
    });
  }

  /** 3面道中：分歧十字路口 — 左铬右暖 */
  _s3mid() {
    this.scene.background = new THREE.Color(0x0c0a08);
    this.scene.fog = new THREE.FogExp2(0x0c0a08, 0.028);
    this._addLights(0xffcc88, 1.2);
    // 左：门构皮蒂娅 铬科技网格
    const left = new THREE.Group();
    const grid = new THREE.GridHelper(9, 14, 0xa8c4e0, 0x4a6078);
    grid.rotation.x = Math.PI / 2;
    left.add(grid);
    for (let i = 0; i < 6; i++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 3.5, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.2, emissive: 0x334455 })
      );
      bar.position.set(-1.5 + i * 0.55, 0, -1 + (i % 3) * 0.4);
      left.add(bar);
    }
    left.position.x = -4.2;
    // 右：善雅乡 福州暖色块
    const rightG = new THREE.Group();
    for (let i = 0; i < 16; i++) {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(0.7 + Math.random() * 0.5, 0.7 + Math.random() * 0.5, 0.7),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.07 + Math.random() * 0.05, 0.85, 0.45),
          emissive: 0x7c2d12,
          emissiveIntensity: 0.45,
        })
      );
      b.position.set(Math.random() * 3.5, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4);
      b.userData.floatY = true;
      b.userData.phase = i * 0.7;
      rightG.add(b);
      this.extras.push(b);
    }
    rightG.position.x = 2.8;
    // 中缝撕裂粒子
    const split = this._points(90, 0xffeedd, 4, 0.12);
    split.position.set(0, 0, 0);
    this.root.add(left, rightG);
    this.extras.unshift(left, rightG);
    this._labelPlane('门构皮蒂娅', {
      color: '#c0d8f0', pos: [-4.0, 5.0, 0], scale: [3.0, 0.85],
    });
    this._labelPlane('善雅乡', {
      color: '#fdba74', pos: [3.8, 5.0, 0], scale: [2.4, 0.85],
    });
    this._labelPlane('分歧的十字路口', {
      color: '#fde68a', pos: [0, -5.2, 0], scale: [4.4, 0.9],
    });
    this._points(120, 0xffddaa, 12);
  }

  /** 3面Boss：大宗关 — 金橙防火墙多边形 */
  _s3boss() {
    this.scene.background = new THREE.Color(0x1a1008);
    this.scene.fog = new THREE.FogExp2(0x1a1008, 0.025);
    this._addLights(0xffaa44, 1.7, 0.45);
    const outer = new THREE.Mesh(
      new THREE.IcosahedronGeometry(4.2, 0),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, wireframe: true })
    );
    const mid = new THREE.Mesh(
      new THREE.OctahedronGeometry(3.0, 0),
      new THREE.MeshBasicMaterial({ color: 0xfb923c, wireframe: true })
    );
    const inner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.8, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfde68a, emissive: 0xb45309, emissiveIntensity: 0.7, wireframe: true,
      })
    );
    outer.userData.rot = 0.48;
    mid.userData.rot = -0.72;
    inner.userData.rot = 1.1;
    this.root.add(outer, mid, inner);
    this.extras.push(outer, mid, inner);
    // 火焰粒子环
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xff6b1a })
      );
      spark.position.set(Math.cos(a) * 5, Math.sin(a) * 5, 0);
      spark.userData.orbit = { r: 5, a, speed: 0.8 };
      this.root.add(spark);
      this.extras.push(spark);
    }
    this._labelPlane(['【大宗关不是】', '互然雏'], {
      color: '#fde68a', pos: [0, 0, 0.5], scale: [4.0, 1.4], blink: true,
      font: 'bold 28px "Microsoft YaHei", sans-serif',
    });
    this._labelPlane('主防火墙', {
      color: '#fdba74', pos: [0, -5.0, 0], scale: [2.8, 0.8],
    });
    this._points(300, 0xffcc66, 10);
  }

  /** 巡查姬 404 — 红色警告条纹 + 扫描 */
  _patrol() {
    this.scene.background = new THREE.Color(0x0a0004);
    this.scene.fog = new THREE.FogExp2(0x0a0004, 0.04);
    this._addLights(0xff2244, 1.3, 0.35);
    for (let i = 0; i < 22; i++) {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.18, 0.45),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? 0xff2244 : 0xaa0030,
          transparent: true,
          opacity: 0.45,
        })
      );
      b.position.set(0, (i - 11) * 0.85, -2 + (i % 3) * 0.3);
      b.userData.phase = i;
      b.userData.stripe = true;
      this.root.add(b);
      this.extras.push(b);
    }
    // 品红/青错位故障层
    const glitchC = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 14),
      new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.04, side: THREE.DoubleSide })
    );
    glitchC.position.set(0.15, 0, -3);
    glitchC.userData.glitch = true;
    const glitchM = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 14),
      new THREE.MeshBasicMaterial({ color: 0xff00aa, transparent: true, opacity: 0.04, side: THREE.DoubleSide })
    );
    glitchM.position.set(-0.15, 0, -3.1);
    glitchM.userData.glitch = true;
    this.root.add(glitchC, glitchM);
    this.extras.push(glitchC, glitchM);
    // 扫描线
    const scan = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xff6688, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    scan.userData.scan = true;
    this.root.add(scan);
    this.extras.push(scan);
    this._labelPlane('404 NOT FOUND', {
      color: '#ff4466', pos: [0, 1.2, 1], scale: [5.5, 1.2], blink: true,
      font: 'bold 40px monospace',
    });
    this._labelPlane(['全域巡查姬', '违规编辑拦截'], {
      color: '#fecaca', pos: [0, -3.5, 0.5], scale: [4.2, 1.3],
    });
    this._points(240, 0xff4466, 14);
  }

  /** A4 门百梁 — 推销方尖碑 */
  _a4(boss) {
    this.scene.background = new THREE.Color(boss ? 0x2a0808 : 0x1a1408);
    this.scene.fog = new THREE.FogExp2(boss ? 0x2a0808 : 0x1a1408, 0.03);
    this._addLights(boss ? 0xff6644 : 0xffd700, boss ? 1.6 : 1.3);
    const n = boss ? 14 : 9;
    for (let i = 0; i < n; i++) {
      const h = 2.2 + Math.random() * 4.5;
      const m = new THREE.Mesh(
        new THREE.ConeGeometry(0.35 + Math.random() * 0.15, h, 4),
        new THREE.MeshStandardMaterial({
          color: boss ? 0xf87171 : 0xfbbf24,
          emissive: boss ? 0x7f1d1d : 0x92400e,
          metalness: 0.65,
          roughness: 0.3,
        })
      );
      m.position.set((Math.random() - 0.5) * 10, h / 2 - 3.2, (Math.random() - 0.5) * 6);
      if (boss) {
        m.rotation.z = (Math.random() - 0.5) * 1.8;
        m.rotation.x = (Math.random() - 0.5) * 0.8;
        m.userData.rot = 0.4 + Math.random();
      } else {
        m.userData.rot = 0.15;
      }
      this.root.add(m);
      this.extras.push(m);
    }
    if (boss) {
      // 购买按钮碎片射出感
      for (let i = 0; i < 10; i++) {
        const btn = new THREE.Mesh(
          new THREE.PlaneGeometry(1.2, 0.45),
          new THREE.MeshBasicMaterial({
            map: makeTextTexture(['限时特惠', '立即购买', 'VIP'][i % 3], {
              w: 160, h: 48, fill: '#fff', bg: 'rgba(180,40,20,0.75)', font: 'bold 22px sans-serif',
            }),
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
          })
        );
        btn.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4);
        btn.userData.speed = 3 + Math.random() * 4;
        btn.userData.tunnel = true;
        this.root.add(btn);
        this.extras.push(btn);
      }
      this._labelPlane('【门百梁】', {
        color: '#fecaca', pos: [0, 4.8, 0], scale: [3.4, 1.0], blink: true,
      });
    } else {
      for (let i = 0; i < 5; i++) {
        const tag = this._labelPlane(['购买', '特惠', '套装', '加购'][i % 4], {
          color: '#fef08a',
          pos: [(Math.random() - 0.5) * 7, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3],
          scale: [1.8, 0.55],
        });
        tag.userData.floatY = true;
        tag.userData.phase = i;
      }
      this._labelPlane('推销方尖碑', {
        color: '#fde68a', pos: [0, 5.2, -1], scale: [3.6, 0.9],
      });
    }
    this._points(200, boss ? 0xff8866 : 0xffe066, 12);
  }

  /** A5 主角冲突 — 蓝白 vs 粉红 */
  _a5(boss) {
    this.scene.background = new THREE.Color(boss ? 0x14081a : 0x0a0a14);
    this.scene.fog = new THREE.FogExp2(boss ? 0x14081a : 0x0a0a14, 0.03);
    this._addLights(0xaaccff, 1.2);
    const b1 = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 28, 28),
      new THREE.MeshStandardMaterial({
        color: 0x7dd3fc, emissive: 0x1e40af, emissiveIntensity: 0.95, metalness: 0.3, roughness: 0.35,
      })
    );
    const b2 = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 28, 28),
      new THREE.MeshStandardMaterial({
        color: 0xf9a8d4, emissive: 0x9d174d, emissiveIntensity: 0.95, metalness: 0.3, roughness: 0.35,
      })
    );
    if (boss) {
      // 融合螺旋柱
      b1.position.set(-0.35, 0, 0);
      b2.position.set(0.35, 0, 0);
      b1.userData.rot = 1.2;
      b2.userData.rot = -1.2;
      const spiral = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.55, 7, 16, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xe9d5ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, wireframe: true,
        })
      );
      spiral.userData.rot = 1.5;
      this.root.add(spiral);
      this.extras.push(spiral);
      for (let i = 0; i < 20; i++) {
        const tri = new THREE.Mesh(
          new THREE.ConeGeometry(0.15, 0.45, 3),
          new THREE.MeshBasicMaterial({ color: i % 2 ? 0x7dd3fc : 0xf9a8d4 })
        );
        const a = (i / 20) * Math.PI * 2;
        tri.position.set(Math.cos(a) * 3.5, Math.sin(a * 2) * 2, Math.sin(a) * 3.5);
        tri.userData.orbit = { r: 3.5, a, speed: 1.2, yAmp: 2 };
        this.root.add(tri);
        this.extras.push(tri);
      }
      this._labelPlane('署名权争议', {
        color: '#e9d5ff', pos: [0, 5.0, 0], scale: [3.6, 0.9], blink: true,
      });
    } else {
      b1.position.set(-2.8, 0.3, 0);
      b2.position.set(2.8, -0.3, 0);
      b1.userData.floatY = true;
      b1.userData.phase = 0;
      b2.userData.floatY = true;
      b2.userData.phase = 2;
      // 碰撞闪电线
      const lightning = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const pts = [
          new THREE.Vector3(-1.2, (i - 2) * 0.4, 0),
          new THREE.Vector3(-0.3, (i - 2) * 0.4 + (Math.random() - 0.5), 0.2),
          new THREE.Vector3(0.3, (i - 2) * 0.4 + (Math.random() - 0.5), -0.1),
          new THREE.Vector3(1.2, (i - 2) * 0.4, 0),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        lightning.add(new THREE.Line(geo, new THREE.LineBasicMaterial({
          color: 0xf0abfc, transparent: true, opacity: 0.7,
        })));
      }
      lightning.userData.blink = true;
      this.root.add(lightning);
      this.extras.push(lightning);
      this._labelPlane('饮泉思源', { color: '#bae6fd', pos: [-2.8, 2.8, 0], scale: [2.6, 0.7] });
      this._labelPlane('誓约沙玛', { color: '#fbcfe8', pos: [2.8, 2.8, 0], scale: [2.6, 0.7] });
    }
    this.root.add(b1, b2);
    this.extras.push(b1, b2);
    this._points(240, 0xddaaff, 10);
  }

  /** A6 一美个 — 哈机密乐园 / 崩坏 */
  _a6(boss) {
    this.scene.background = new THREE.Color(boss ? 0x1a0010 : 0x180820);
    this.scene.fog = new THREE.FogExp2(boss ? 0x1a0010 : 0x180820, 0.028);
    this._addLights(0xff88cc, boss ? 1.5 : 1.15);
    const n = boss ? 22 : 16;
    for (let i = 0; i < n; i++) {
      let mesh;
      if (i % 3 === 0) {
        mesh = new THREE.Mesh(
          new THREE.TorusGeometry(0.4 + Math.random() * 0.6, 0.08, 8, 22),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.85 + Math.random() * 0.12, 0.75, 0.55),
            emissive: 0x440033,
            emissiveIntensity: 0.5,
          })
        );
      } else if (i % 3 === 1) {
        mesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.35 + Math.random() * 0.3, 0),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.15 + Math.random() * 0.05, 0.9, 0.55),
            emissive: 0x663300,
          })
        );
      } else {
        // 星形近似
        mesh = new THREE.Mesh(
          new THREE.ConeGeometry(0.35, 0.7, 5),
          new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.9, 0.6, 0.6),
            emissive: 0x550044,
          })
        );
      }
      mesh.position.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 7);
      mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random());
      if (boss) {
        mesh.userData.rot = 1.5 + Math.random() * 2;
        mesh.userData.shatter = true;
      } else {
        mesh.userData.rot = 0.25;
        mesh.userData.floatY = true;
        mesh.userData.phase = i;
      }
      this.root.add(mesh);
      this.extras.push(mesh);
    }
    if (boss) {
      // 服务器欠费弹窗
      const popup = new THREE.Mesh(
        new THREE.PlaneGeometry(4.5, 2.4),
        new THREE.MeshBasicMaterial({
          map: makeTextTexture(['⚠ 服务器欠费', '账单逾期 · 资源回收', '[确认]  [取消]'], {
            w: 320, h: 160, fill: '#ffe4e6', bg: 'rgba(60,0,20,0.85)',
            font: 'bold 24px "Microsoft YaHei", sans-serif',
          }),
          transparent: true,
          opacity: 0.95,
          side: THREE.DoubleSide,
        })
      );
      popup.position.set(0, 1.5, 2);
      popup.userData.blink = true;
      this.root.add(popup);
      this.extras.push(popup);
      // 回收站图标阵列
      for (let i = 0; i < 12; i++) {
        const bin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.3, 0.5, 8),
          new THREE.MeshBasicMaterial({ color: 0x94a3b8, wireframe: true })
        );
        bin.position.set((i % 4 - 1.5) * 1.8, -3.5 + Math.floor(i / 4) * 0.9, -1);
        bin.userData.floatY = true;
        bin.userData.phase = i;
        this.root.add(bin);
        this.extras.push(bin);
      }
      this._labelPlane('【一美个】', {
        color: '#fda4af', pos: [0, 5.0, 0], scale: [3.2, 0.95], blink: true,
      });
      this._labelPlane('哈机密乐园 · 崩坏', {
        color: '#fecdd3', pos: [0, -5.2, 0], scale: [4.2, 0.85],
      });
    } else {
      for (let i = 0; i < 4; i++) {
        const bubble = this._labelPlane(
          ['加个好友嘛~', '不回消息？', '哈机密♡', '再聊一会儿'][i],
          {
            color: '#fce7f3',
            pos: [(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 5, 1],
            scale: [2.6, 0.7],
          }
        );
        bubble.userData.floatY = true;
        bubble.userData.phase = i * 1.3;
      }
      this._labelPlane('扭曲哈机密乐园', {
        color: '#f9a8d4', pos: [0, 5.3, -1], scale: [4.0, 0.9],
      });
    }
    this._points(220, 0xff99dd, 11);
  }

  /** B4 赌人时尚 — 独轮创车 */
  _b4(boss) {
    this.scene.background = new THREE.Color(boss ? 0x180606 : 0x140808);
    this.scene.fog = new THREE.FogExp2(0x140808, 0.032);
    this._addLights(0xff4444, 1.35);
    const makeWheel = (r, spikes, rotSpd) => {
      const wheel = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.35, 12, 36),
        new THREE.MeshStandardMaterial({
          color: 0xfb7185, emissive: 0x7f1d1d, metalness: 0.55, roughness: 0.35,
        })
      );
      for (let i = 0; i < spikes; i++) {
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.14, 0.75, 6),
          new THREE.MeshBasicMaterial({ color: 0xff2222 })
        );
        const a = (i / spikes) * Math.PI * 2;
        spike.position.set(Math.cos(a) * (r + 0.4), Math.sin(a) * (r + 0.4), 0);
        spike.rotation.z = a - Math.PI / 2;
        wheel.add(spike);
      }
      wheel.userData.rot = rotSpd;
      return wheel;
    };
    if (boss) {
      for (let i = 0; i < 5; i++) {
        const w = makeWheel(1.2 + i * 0.15, 8, 2.2 + i * 0.3);
        w.position.set((i - 2) * 2.2, (i % 2) * 1.2 - 0.5, -i * 0.5);
        this.root.add(w);
        this.extras.push(w);
      }
      for (let i = 0; i < 8; i++) {
        const storm = this._labelPlane(['创！', '哲学', '创世', '铁皮人'][i % 4], {
          color: '#fecaca',
          pos: [(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 4],
          scale: [1.6, 0.55],
        });
        storm.userData.rot = 1.5;
        storm.userData.orbit = {
          r: 3 + Math.random() * 2, a: (i / 8) * Math.PI * 2, speed: 1.5,
        };
      }
      this._labelPlane('【赌人时尚】', {
        color: '#fda4af', pos: [0, 5.0, 0], scale: [3.6, 1.0], blink: true,
      });
    } else {
      const wheel = makeWheel(2.6, 14, 1.15);
      wheel.userData.spiral = true;
      this.root.add(wheel);
      this.extras.push(wheel);
      for (let i = 0; i < 6; i++) {
        const p = this._labelPlane('创', {
          color: '#ff6688',
          pos: [(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4],
          scale: [1.0, 0.5],
        });
        p.userData.floatY = true;
        p.userData.phase = i;
      }
      this._labelPlane(['善雅乡入口', '独轮创车'], {
        color: '#fecdd3', pos: [0, 5.2, -1], scale: [3.8, 1.2],
      });
    }
    this._points(180, 0xff6688, 12);
  }

  /** B5 棍电噢哆 — 破皮鞋 / 推退 */
  _b5(boss) {
    this.scene.background = new THREE.Color(boss ? 0x100810 : 0x0a0810);
    this.scene.fog = new THREE.FogExp2(0x0a0810, 0.035);
    this._addLights(0xff8844, 1.3);
    const makeShoe = () => {
      const shoe = new THREE.Group();
      const sole = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.35, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.7 })
      );
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.95, 0.95),
        new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.55 })
      );
      body.position.set(-0.15, 0.55, 0);
      const toe = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.5, 0.95),
        new THREE.MeshStandardMaterial({ color: 0x44403c })
      );
      toe.position.set(1.0, 0.25, 0);
      shoe.add(sole, body, toe);
      shoe.userData.bounce = true;
      return shoe;
    };
    if (boss) {
      for (let i = 0; i < 5; i++) {
        const s = makeShoe();
        s.position.set((i - 2) * 2.2, 0, -i * 0.4);
        s.userData.phase = i * 0.8;
        this.root.add(s);
        this.extras.push(s);
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const dlg = this._labelPlane(
          ['推退！', '素质呢', '这波怎么说', '队友的问题'][i % 4],
          {
            color: '#fdba74',
            pos: [Math.cos(a) * 4, Math.sin(a) * 2.5, Math.sin(a) * 2],
            scale: [2.4, 0.65],
          }
        );
        dlg.userData.orbit = { r: 4, a, speed: 0.9, yAmp: 2.5 };
      }
      this._labelPlane('【棍电噢哆】', {
        color: '#fb923c', pos: [0, 5.0, 0], scale: [3.6, 1.0], blink: true,
      });
      this._labelPlane('世界第一 · 推退辩论', {
        color: '#fed7aa', pos: [0, -5.0, 0], scale: [4.4, 0.85],
      });
    } else {
      const shoe = makeShoe();
      shoe.position.set(0, 0, 0);
      this.root.add(shoe);
      this.extras.push(shoe);
      // 霓虹「中单」
      this._labelPlane('中单', {
        color: '#f472b6', pos: [-3.2, 3.5, -1], scale: [2.2, 1.0], blink: true,
        font: 'bold 48px "Microsoft YaHei", sans-serif',
      });
      this._labelPlane('世界第一', {
        color: '#fb923c', pos: [3.0, 3.2, -1], scale: [2.6, 0.8],
      });
      for (let i = 0; i < 5; i++) {
        const t = this._labelPlane(['傲娇', '推', '退', '素质'][i % 4], {
          color: '#fdba74',
          pos: [(Math.random() - 0.5) * 7, (Math.random() - 0.5) * 4, 1],
          scale: [1.4, 0.5],
        });
        t.userData.floatY = true;
        t.userData.phase = i;
      }
      this._labelPlane('街角暗巷', {
        color: '#e7e5e4', pos: [0, -5.0, 0], scale: [3.0, 0.8],
      });
    }
    this._points(160, 0xffaa66, 10);
  }

  /** B6 拉斯特神炫 — 炫妈迷雾 / 虾油风油精 */
  _b6(boss) {
    this.scene.background = new THREE.Color(boss ? 0x102000 : 0x0a1208);
    this.scene.fog = new THREE.FogExp2(boss ? 0x1a3008 : 0x0a1208, boss ? 0.045 : 0.04);
    this._addLights(0xa3e635, boss ? 1.5 : 1.15, 0.5);
    // 防御塔线框
    for (let i = 0; i < (boss ? 7 : 5); i++) {
      const tower = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.4, 3.5 + Math.random(), 6, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x1a2e0a, wireframe: true })
      );
      const top = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 0.9, 6, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x365314, wireframe: true })
      );
      top.position.y = 2.2;
      tower.add(shaft, top);
      tower.position.set((i - 2.5) * 2.2, -2, -2 - Math.random() * 3);
      if (boss) tower.userData.rot = 0.3 + Math.random() * 0.5;
      this.root.add(tower);
      this.extras.push(tower);
    }
    // 宝瓶
    const bottle = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.95, 2.6, 14),
      new THREE.MeshBasicMaterial({ color: 0xa3e635, wireframe: true })
    );
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.4, 0.9, 10),
      new THREE.MeshBasicMaterial({ color: 0xd9f99d, wireframe: true })
    );
    neck.position.y = 1.7;
    bottle.add(body, neck);
    if (boss) {
      bottle.scale.set(1.6, 1.6, 1.6);
      bottle.userData.rot = 0.6;
      bottle.userData.shatter = true;
      // 防毒面具轮廓（几何组合）
      const mask = new THREE.Group();
      const face = new THREE.Mesh(
        new THREE.SphereGeometry(1.8, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.65),
        new THREE.MeshBasicMaterial({ color: 0x4d7c0f, wireframe: true, side: THREE.DoubleSide })
      );
      const filterL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.55, 1.0, 10),
        new THREE.MeshBasicMaterial({ color: 0x65a30d, wireframe: true })
      );
      filterL.rotation.z = Math.PI / 2;
      filterL.position.set(-1.5, -0.3, 0.8);
      const filterR = filterL.clone();
      filterR.position.x = 1.5;
      mask.add(face, filterL, filterR);
      mask.position.set(0, 0, -1);
      mask.userData.rot = -0.25;
      this.root.add(mask);
      this.extras.push(mask);
      this._labelPlane('炫妈', {
        color: '#d9f99d', pos: [0, 4.5, 1], scale: [2.4, 1.0], blink: true,
        font: 'bold 48px "Microsoft YaHei", sans-serif',
      });
      this._labelPlane(['虾油 · 风油精', '绝对帝国'], {
        color: '#bef264', pos: [0, -5.0, 0], scale: [4.0, 1.2],
      });
    } else {
      bottle.position.set(0, 0.5, 0);
      this._labelPlane('炫妈迷雾', {
        color: '#d9f99d', pos: [0, 5.2, -1], scale: [3.4, 0.9],
      });
      this._labelPlane('宝瓶封印', {
        color: '#a3e635', pos: [0, -5.0, 0], scale: [2.8, 0.8],
      });
    }
    this.root.add(bottle);
    this.extras.push(bottle);
    // 浓雾粒子
    this._points(boss ? 520 : 380, boss ? 0x84cc16 : 0xd9f99d, 15, boss ? 0.12 : 0.1);
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
    EX: ['a5_mid', 'a6_boss'],
  };
  const p = map[stageKey] || map[1];
  return isBoss ? p[1] : p[0];
}
