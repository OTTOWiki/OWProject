/**
 * 左侧 Three 场景 builder（由 StageBackground 方法抽出，E04）
 * 约定：export function buildXxx(bg, ...) 使用 bg._atmosphere / _scatter 等
 */
import { THREE } from './threeLoader.js';
import { makeTextTexture } from './textTexture.js';

export function buildS1Mid(bg) {
  bg._atmosphere({ bg: 0x07140e, fog: 0.035, light: 0x66ffaa, intensity: 1.1, amb: 0.5 });
  const chars = '草稿OTTO#[]{}<>wiki编辑';
  bg._scatter(48, () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.06, 2.2 + Math.random() * 5),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.33 + Math.random() * 0.06, 0.55, 0.28 + Math.random() * 0.35),
        transparent: true,
        opacity: 0.55 + Math.random() * 0.35,
      }),
    );
    mesh.userData.speed = 2.5 + Math.random() * 5;
    mesh.userData.tunnel = true;
    return mesh;
  }, {
    place: (mesh) => {
      const r = 2.2 + Math.random() * 5;
      const a = Math.random() * Math.PI * 2;
      mesh.position.set(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.7, (Math.random() - 0.5) * 22);
    },
  });
  bg._scatter(10, (i) => {
    const ch = chars[i % chars.length];
    const tex = makeTextTexture(ch, {
      w: 64, h: 64, fill: '#9dffc0', font: 'bold 36px monospace', bg: 'rgba(10,40,24,0.5)',
    });
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.55),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
    );
    p.userData.speed = 1.5 + Math.random() * 2;
    p.userData.tunnel = true;
    return p;
  }, { spread: [8, 9, 14] });
  bg._labelPlane(['维基外围', '零散草稿'], {
    color: '#a8ffc8', pos: [0, 5.2, -2], scale: [4.2, 1.35],
  });
  bg._points(220, 0x88ffaa, 16, 0.07);
}

export function buildS1Boss(bg) {
  bg._atmosphere({ bg: 0x1a0a16, fog: 0.028, light: 0xff88cc, intensity: 1.6, amb: 0.45 });
  const gearMat = (c, e) => new THREE.MeshStandardMaterial({
    color: c, emissive: e, metalness: 0.75, roughness: 0.28,
  });
  const t1 = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.38, 14, 56), gearMat(0xf9a8d4, 0x882244));
  const t2 = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.28, 12, 44), gearMat(0x67e8f9, 0x226666));
  const t3 = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.12, 10, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe4f0, transparent: true, opacity: 0.85 }),
  );
  bg._ringTeeth(t1, 16, 4.55, new THREE.BoxGeometry(0.35, 0.55, 0.35), gearMat(0xfbcfe8, 0x6b1d3a));
  bg._ringTeeth(t2, 12, 3.0, new THREE.BoxGeometry(0.22, 0.4, 0.22), gearMat(0xa5f3fc, 0x155e75));
  t1.userData.rot = 0.55;
  t2.userData.rot = -1.05;
  t3.userData.rot = 0.9;
  bg.root.add(t1, t2, t3);
  bg.extras.push(t1, t2, t3);
  bg._labelPlane('【爱丽丝】', {
    color: '#ffc0e0', pos: [0, 0, 0.4], scale: [3.6, 1.1], blink: true,
    font: 'bold 36px "Microsoft YaHei", sans-serif',
  });
  bg._labelPlane('编辑程序测试', {
    color: '#a5f3fc', pos: [0, -4.8, 0], scale: [3.4, 0.9],
  });
  bg._points(340, 0xffaadd, 11, 0.09);
}

export function buildS2Mid(bg) {
  bg._atmosphere({ bg: 0x050e1c, fog: 0.032, light: 0x4488ff, intensity: 1.25 });
  bg._scatter(28, () => {
    const warn = Math.random() < 0.22;
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 1.1 + Math.random() * 0.8, 6),
      new THREE.MeshStandardMaterial({
        color: warn ? 0x7f1d1d : 0x1e3a5f,
        emissive: warn ? 0xff2222 : 0x112244,
        emissiveIntensity: warn ? 0.9 : 0.35,
        flatShading: true,
        metalness: 0.4,
        roughness: 0.55,
      }),
    );
    m.rotation.set(Math.random(), Math.random(), Math.random());
    m.userData.drift = 0.3 + Math.random() * 0.5;
    m.userData.phase = Math.random() * 10;
    return m;
  }, { spread: [11, 11, 9] });
  bg._scatter(8, () => {
    const tri = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 0.7, 3),
      new THREE.MeshBasicMaterial({ color: 0xff3344, transparent: true, opacity: 0.85 }),
    );
    tri.userData.spin = 1 + Math.random();
    tri.userData.blink = true;
    return tri;
  }, { spread: [10, 8, 6] });
  bg._scatter(6, (i) => {
    const bits = Array.from({ length: 8 }, () => (Math.random() > 0.5 ? '1' : '0')).join('');
    const tex = makeTextTexture(bits, {
      w: 200, h: 40, fill: '#7dd3fc', font: '18px monospace', bg: 'rgba(8,20,40,0.4)',
    });
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(2.8, 0.45),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    );
    p.userData.floatY = true;
    p.userData.phase = i;
    return p;
  }, { spread: [8, 8, 5] });
  bg._labelPlane(['编辑日常', '审核冲突'], {
    color: '#93c5fd', pos: [0, 5.4, -1], scale: [4.0, 1.3],
  });
  bg._points(200, 0x66aaff, 14);
}

export function buildS2Boss(bg) {
  bg._atmosphere({ bg: 0x030a16, fog: 0.03, light: 0xaaddff, intensity: 1.55, amb: 0.4 });
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
  bg.root.add(crystal);
  bg.extras.push(crystal);
  // 冰蓝粒子流
  bg._points(280, 0xaaf0ff, 10, 0.07);
  bg._labelPlane('【Icebin】', {
    color: '#e0f2fe', pos: [0, 0, 1.2], scale: [3.4, 1.0], blink: true,
    font: 'bold 34px "Microsoft YaHei", sans-serif',
  });
  bg._labelPlane('编译防火墙', {
    color: '#67e8f9', pos: [0, -4.6, 0], scale: [3.2, 0.85],
  });
}

export function buildS3Mid(bg) {
  bg._atmosphere({ bg: 0x0c0a08, fog: 0.028, light: 0xffcc88, intensity: 1.2 });
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
    bg.extras.push(b);
  }
  rightG.position.x = 2.8;
  // 中缝撕裂粒子
  const split = bg._points(90, 0xffeedd, 4, 0.12);
  split.position.set(0, 0, 0);
  bg.root.add(left, rightG);
  bg.extras.unshift(left, rightG);
  bg._labelPlane('门构皮蒂娅', {
    color: '#c0d8f0', pos: [-4.0, 5.0, 0], scale: [3.0, 0.85],
  });
  bg._labelPlane('善雅乡', {
    color: '#fdba74', pos: [3.8, 5.0, 0], scale: [2.4, 0.85],
  });
  bg._labelPlane('分歧的十字路口', {
    color: '#fde68a', pos: [0, -5.2, 0], scale: [4.4, 0.9],
  });
  bg._points(120, 0xffddaa, 12);
}

export function buildS3Boss(bg) {
  bg._atmosphere({ bg: 0x1a1008, fog: 0.025, light: 0xffaa44, intensity: 1.7, amb: 0.45 });
  const outer = new THREE.Mesh(
    new THREE.IcosahedronGeometry(4.2, 0),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, wireframe: true }),
  );
  const mid = new THREE.Mesh(
    new THREE.OctahedronGeometry(3.0, 0),
    new THREE.MeshBasicMaterial({ color: 0xfb923c, wireframe: true }),
  );
  const inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.8, 0),
    new THREE.MeshStandardMaterial({
      color: 0xfde68a, emissive: 0xb45309, emissiveIntensity: 0.7, wireframe: true,
    }),
  );
  outer.userData.rot = 0.48;
  mid.userData.rot = -0.72;
  inner.userData.rot = 1.1;
  bg.root.add(outer, mid, inner);
  bg.extras.push(outer, mid, inner);
  bg._scatter(18, (i) => {
    const a = (i / 18) * Math.PI * 2;
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff6b1a }),
    );
    spark.userData.fixed = true;
    spark.position.set(Math.cos(a) * 5, Math.sin(a) * 5, 0);
    spark.userData.orbit = { r: 5, a, speed: 0.8 };
    return spark;
  });
  bg._labelPlane(['【大宗关不是】', '互然雏'], {
    color: '#fde68a', pos: [0, 0, 0.5], scale: [4.0, 1.4], blink: true,
    font: 'bold 28px "Microsoft YaHei", sans-serif',
  });
  bg._labelPlane('主防火墙', {
    color: '#fdba74', pos: [0, -5.0, 0], scale: [2.8, 0.8],
  });
  bg._points(300, 0xffcc66, 10);
}

export function buildPatrol(bg) {
  bg._atmosphere({ bg: 0x0a0004, fog: 0.04, light: 0xff2244, intensity: 1.3, amb: 0.35 });
  bg._scatter(22, (i) => {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.18, 0.45),
      new THREE.MeshBasicMaterial({
        color: i % 2 ? 0xff2244 : 0xaa0030,
        transparent: true,
        opacity: 0.45,
      }),
    );
    b.userData.fixed = true;
    b.position.set(0, (i - 11) * 0.85, -2 + (i % 3) * 0.3);
    b.userData.phase = i;
    b.userData.stripe = true;
    return b;
  });
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
  bg.root.add(glitchC, glitchM);
  bg.extras.push(glitchC, glitchM);
  // 扫描线
  const scan = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 0.35),
    new THREE.MeshBasicMaterial({ color: 0xff6688, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  );
  scan.userData.scan = true;
  bg.root.add(scan);
  bg.extras.push(scan);
  bg._labelPlane('404 NOT FOUND', {
    color: '#ff4466', pos: [0, 1.2, 1], scale: [5.5, 1.2], blink: true,
    font: 'bold 40px monospace',
  });
  bg._labelPlane(['全域巡查姬', '违规编辑拦截'], {
    color: '#fecaca', pos: [0, -3.5, 0.5], scale: [4.2, 1.3],
  });
  bg._points(240, 0xff4466, 14);
}

export function buildA4(bg, boss) {
  bg._atmosphere({
    bg: boss ? 0x2a0808 : 0x1a1408,
    fog: 0.03,
    light: boss ? 0xff6644 : 0xffd700,
    intensity: boss ? 1.6 : 1.3,
  });
  bg._scatter(boss ? 14 : 9, () => {
    const h = 2.2 + Math.random() * 4.5;
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(0.35 + Math.random() * 0.15, h, 4),
      new THREE.MeshStandardMaterial({
        color: boss ? 0xf87171 : 0xfbbf24,
        emissive: boss ? 0x7f1d1d : 0x92400e,
        metalness: 0.65,
        roughness: 0.3,
      }),
    );
    m.userData.fixed = true;
    m.position.set((Math.random() - 0.5) * 10, h / 2 - 3.2, (Math.random() - 0.5) * 6);
    if (boss) {
      m.rotation.z = (Math.random() - 0.5) * 1.8;
      m.rotation.x = (Math.random() - 0.5) * 0.8;
      m.userData.rot = 0.4 + Math.random();
    } else {
      m.userData.rot = 0.15;
    }
    return m;
  });
  if (boss) {
    bg._scatter(10, (i) => {
      const btn = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.45),
        new THREE.MeshBasicMaterial({
          map: makeTextTexture(['限时特惠', '立即购买', 'VIP'][i % 3], {
            w: 160, h: 48, fill: '#fff', bg: 'rgba(180,40,20,0.75)', font: 'bold 22px sans-serif',
          }),
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        }),
      );
      btn.userData.speed = 3 + Math.random() * 4;
      btn.userData.tunnel = true;
      return btn;
    }, { spread: [8, 6, 4] });
    bg._labelPlane('【门百梁】', {
      color: '#fecaca', pos: [0, 4.8, 0], scale: [3.4, 1.0], blink: true,
    });
  } else {
    for (let i = 0; i < 5; i++) {
      const tag = bg._labelPlane(['购买', '特惠', '套装', '加购'][i % 4], {
        color: '#fef08a',
        pos: [(Math.random() - 0.5) * 7, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3],
        scale: [1.8, 0.55],
      });
      tag.userData.floatY = true;
      tag.userData.phase = i;
    }
    bg._labelPlane('推销方尖碑', {
      color: '#fde68a', pos: [0, 5.2, -1], scale: [3.6, 0.9],
    });
  }
  bg._points(200, boss ? 0xff8866 : 0xffe066, 12);
}

export function buildA5(bg, boss) {
  bg._atmosphere({
    bg: boss ? 0x14081a : 0x0a0a14,
    fog: 0.03,
    light: 0xaaccff,
    intensity: 1.2,
  });
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
    bg.root.add(spiral);
    bg.extras.push(spiral);
    bg._scatter(20, (i) => {
      const a = (i / 20) * Math.PI * 2;
      const tri = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.45, 3),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x7dd3fc : 0xf9a8d4 }),
      );
      tri.userData.fixed = true;
      tri.position.set(Math.cos(a) * 3.5, Math.sin(a * 2) * 2, Math.sin(a) * 3.5);
      tri.userData.orbit = { r: 3.5, a, speed: 1.2, yAmp: 2 };
      return tri;
    });
    bg._labelPlane('署名权争议', {
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
    bg.root.add(lightning);
    bg.extras.push(lightning);
    bg._labelPlane('饮泉思源', { color: '#bae6fd', pos: [-2.8, 2.8, 0], scale: [2.6, 0.7] });
    bg._labelPlane('誓约沙玛', { color: '#fbcfe8', pos: [2.8, 2.8, 0], scale: [2.6, 0.7] });
  }
  bg.root.add(b1, b2);
  bg.extras.push(b1, b2);
  bg._points(240, 0xddaaff, 10);
}

export function buildA6(bg, boss) {
  bg._atmosphere({
    bg: boss ? 0x1a0010 : 0x180820,
    fog: 0.028,
    light: 0xff88cc,
    intensity: boss ? 1.5 : 1.15,
  });
  bg._scatter(boss ? 22 : 16, (i) => {
    let mesh;
    if (i % 3 === 0) {
      mesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.4 + Math.random() * 0.6, 0.08, 8, 22),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.85 + Math.random() * 0.12, 0.75, 0.55),
          emissive: 0x440033,
          emissiveIntensity: 0.5,
        }),
      );
    } else if (i % 3 === 1) {
      mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.35 + Math.random() * 0.3, 0),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.15 + Math.random() * 0.05, 0.9, 0.55),
          emissive: 0x663300,
        }),
      );
    } else {
      mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.7, 5),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.9, 0.6, 0.6),
          emissive: 0x550044,
        }),
      );
    }
    mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random());
    if (boss) {
      mesh.userData.rot = 1.5 + Math.random() * 2;
      mesh.userData.shatter = true;
    } else {
      mesh.userData.rot = 0.25;
      mesh.userData.floatY = true;
      mesh.userData.phase = i;
    }
    return mesh;
  }, { spread: [9, 9, 7] });
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
    bg.root.add(popup);
    bg.extras.push(popup);
    // 回收站图标阵列
    for (let i = 0; i < 12; i++) {
      const bin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 0.5, 8),
        new THREE.MeshBasicMaterial({ color: 0x94a3b8, wireframe: true })
      );
      bin.position.set((i % 4 - 1.5) * 1.8, -3.5 + Math.floor(i / 4) * 0.9, -1);
      bin.userData.floatY = true;
      bin.userData.phase = i;
      bg.root.add(bin);
      bg.extras.push(bin);
    }
    bg._labelPlane('【一美个】', {
      color: '#fda4af', pos: [0, 5.0, 0], scale: [3.2, 0.95], blink: true,
    });
    bg._labelPlane('哈机密乐园 · 崩坏', {
      color: '#fecdd3', pos: [0, -5.2, 0], scale: [4.2, 0.85],
    });
  } else {
    for (let i = 0; i < 4; i++) {
      const bubble = bg._labelPlane(
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
    bg._labelPlane('扭曲哈机密乐园', {
      color: '#f9a8d4', pos: [0, 5.3, -1], scale: [4.0, 0.9],
    });
  }
  bg._points(220, 0xff99dd, 11);
}

export function buildB4(bg, boss) {
  bg._atmosphere({
    bg: boss ? 0x180606 : 0x140808,
    fog: 0.032,
    light: 0xff4444,
    intensity: 1.35,
  });
  const makeWheel = (r, spikes, rotSpd) => {
    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.35, 12, 36),
      new THREE.MeshStandardMaterial({
        color: 0xfb7185, emissive: 0x7f1d1d, metalness: 0.55, roughness: 0.35,
      }),
    );
    const spikeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    for (let i = 0; i < spikes; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.75, 6), spikeMat);
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
      bg.root.add(w);
      bg.extras.push(w);
    }
    for (let i = 0; i < 8; i++) {
      const storm = bg._labelPlane(['创！', '哲学', '创世', '铁皮人'][i % 4], {
        color: '#fecaca',
        pos: [(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 4],
        scale: [1.6, 0.55],
      });
      storm.userData.rot = 1.5;
      storm.userData.orbit = {
        r: 3 + Math.random() * 2, a: (i / 8) * Math.PI * 2, speed: 1.5,
      };
    }
    bg._labelPlane('【赌人时尚】', {
      color: '#fda4af', pos: [0, 5.0, 0], scale: [3.6, 1.0], blink: true,
    });
  } else {
    const wheel = makeWheel(2.6, 14, 1.15);
    wheel.userData.spiral = true;
    bg.root.add(wheel);
    bg.extras.push(wheel);
    for (let i = 0; i < 6; i++) {
      const p = bg._labelPlane('创', {
        color: '#ff6688',
        pos: [(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4],
        scale: [1.0, 0.5],
      });
      p.userData.floatY = true;
      p.userData.phase = i;
    }
    bg._labelPlane(['善雅乡入口', '独轮创车'], {
      color: '#fecdd3', pos: [0, 5.2, -1], scale: [3.8, 1.2],
    });
  }
  bg._points(180, 0xff6688, 12);
}

export function buildB5(bg, boss) {
  bg._atmosphere({
    bg: boss ? 0x100810 : 0x0a0810,
    fog: 0.035,
    light: 0xff8844,
    intensity: 1.3,
  });
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
      bg.root.add(s);
      bg.extras.push(s);
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const dlg = bg._labelPlane(
        ['推退！', '素质呢', '这波怎么说', '队友的问题'][i % 4],
        {
          color: '#fdba74',
          pos: [Math.cos(a) * 4, Math.sin(a) * 2.5, Math.sin(a) * 2],
          scale: [2.4, 0.65],
        }
      );
      dlg.userData.orbit = { r: 4, a, speed: 0.9, yAmp: 2.5 };
    }
    bg._labelPlane('【棍电噢哆】', {
      color: '#fb923c', pos: [0, 5.0, 0], scale: [3.6, 1.0], blink: true,
    });
    bg._labelPlane('世界第一 · 推退辩论', {
      color: '#fed7aa', pos: [0, -5.0, 0], scale: [4.4, 0.85],
    });
  } else {
    const shoe = makeShoe();
    shoe.position.set(0, 0, 0);
    bg.root.add(shoe);
    bg.extras.push(shoe);
    // 霓虹「中单」
    bg._labelPlane('中单', {
      color: '#f472b6', pos: [-3.2, 3.5, -1], scale: [2.2, 1.0], blink: true,
      font: 'bold 48px "Microsoft YaHei", sans-serif',
    });
    bg._labelPlane('世界第一', {
      color: '#fb923c', pos: [3.0, 3.2, -1], scale: [2.6, 0.8],
    });
    for (let i = 0; i < 5; i++) {
      const t = bg._labelPlane(['傲娇', '推', '退', '素质'][i % 4], {
        color: '#fdba74',
        pos: [(Math.random() - 0.5) * 7, (Math.random() - 0.5) * 4, 1],
        scale: [1.4, 0.5],
      });
      t.userData.floatY = true;
      t.userData.phase = i;
    }
    bg._labelPlane('街角暗巷', {
      color: '#e7e5e4', pos: [0, -5.0, 0], scale: [3.0, 0.8],
    });
  }
  bg._points(160, 0xffaa66, 10);
}

export function buildB6(bg, boss) {
  bg._atmosphere({
    bg: boss ? 0x102000 : 0x0a1208,
    fog: boss ? 0.045 : 0.04,
    fogColor: boss ? 0x1a3008 : 0x0a1208,
    light: 0xa3e635,
    intensity: boss ? 1.5 : 1.15,
    amb: 0.5,
  });
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
    bg.root.add(tower);
    bg.extras.push(tower);
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
    bg.root.add(mask);
    bg.extras.push(mask);
    bg._labelPlane('炫妈', {
      color: '#d9f99d', pos: [0, 4.5, 1], scale: [2.4, 1.0], blink: true,
      font: 'bold 48px "Microsoft YaHei", sans-serif',
    });
    bg._labelPlane(['虾油 · 风油精', '绝对帝国'], {
      color: '#bef264', pos: [0, -5.0, 0], scale: [4.0, 1.2],
    });
  } else {
    bottle.position.set(0, 0.5, 0);
    bg._labelPlane('炫妈迷雾', {
      color: '#d9f99d', pos: [0, 5.2, -1], scale: [3.4, 0.9],
    });
    bg._labelPlane('宝瓶封印', {
      color: '#a3e635', pos: [0, -5.0, 0], scale: [2.8, 0.8],
    });
  }
  bg.root.add(bottle);
  bg.extras.push(bottle);
  // 浓雾粒子
  bg._points(boss ? 520 : 380, boss ? 0x84cc16 : 0xd9f99d, 15, boss ? 0.12 : 0.1);
}

