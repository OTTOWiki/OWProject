/**
 * B线第4面「赌人时尚 · 独轮创车冲击」——超写实 · 超现实 3D 舞台。
 *
 * PBR 锈蚀棘轮 + 湿沥青/血水镜面 + 体积血红光 + 荆棘钢筋。
 * 超现实：巨轮悬空滚动/倒转、轮群沿隧道壁爬升、纸钱龙卷。
 * boss：双轮对转 + 血光柱 + 刺阵 + 纸钱风暴。
 * 构图：中心 60% 留低对比的血水纵深，亮光/巨轮在两侧与近景边缘。
 */
const TAU = Math.PI * 2;

function mixHex(a, b, t) {
  const ar = (a >> 16) & 255; const ag = (a >> 8) & 255; const ab = a & 255;
  const br = (b >> 16) & 255; const bg = (b >> 8) & 255; const bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16)
    | (Math.round(ag + (bg - ag) * t) << 8)
    | Math.round(ab + (bb - ab) * t);
}

/** 发光条：黑漫反射 + 高 emissive（交给 bloom） */
function glow(ctx, color, w, h, d, intensity = 2.2) {
  return ctx.K.box(w, h, d, 0x000000, { emissive: color, emissiveIntensity: intensity, kind: 'metal', roughness: 0.4 });
}

/** 单字霓虹 */
function char(ctx, text, { x = 0, y = 0, z = -20, h = 2.6, fill = '#ffd0c0', opacity = 0.95 } = {}) {
  return ctx.textSprite(text, {
    x, y, z, w: h * 2, h, fill, bg: 'rgba(0,0,0,0)', opacity,
    font: 'bold 170px "Noto Serif CJK SC", "Microsoft YaHei", serif',
  });
}

/** 湿血水镜面 */
function addBloodFloor(ctx, boss) {
  const K = ctx.K;
  const water = K.waterFloor({
    y: -6.2, size: [280, 360],
    color: boss ? 0x1c0407 : 0x120306,
    normalScale: 0.26, roughness: boss ? 0.24 : 0.22, metalness: 0.12, envMapIntensity: 0.45, flow: 0.4,
  });
  ctx.add(water);
  // 血水镜面上漂着的血带（薄发光线，低亮度，不压中心）
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const strip = glow(ctx, side < 0 ? 0x8a1420 : 0x6a0e18, 0.10, 0.02, 60 - i * 12, 0.9);
      strip.position.set(side * (6.4 + i * 1.6), -6.12, -34 - i * 12);
      strip.rotation.y = side * -0.05;
      ctx.add(strip);
    }
  }
  // 两侧沥青断岸 + 锈蚀路缘
  for (const side of [-1, 1]) {
    const bank = K.box(8, 1.2, 240, 0x14070a, { kind: 'asphalt', roughness: 0.95 });
    bank.position.set(side * 12.6, -6.4, -80);
    ctx.add(bank);
    const curb = K.box(0.5, 0.5, 240, 0x2a1014, { kind: 'rust', roughness: 0.7 });
    curb.position.set(side * 8.5, -5.95, -80);
    ctx.add(curb);
    const rim = glow(ctx, boss ? 0xff3a4a : 0xc0263a, 0.12, 0.05, 220, boss ? 1.5 : 1.0);
    rim.position.set(side * 8.5, -5.68, -80);
    ctx.add(rim);
  }
}

/** 隧道壁：断裂混凝土 + 外露钢筋（两侧，让出中心） */
function addTunnelWalls(ctx, boss) {
  const K = ctx.K;
  for (const side of [-1, 1]) {
    for (let i = 0; i < (boss ? 6 : 5); i++) {
      const s = i * 23 + (side > 0 ? 101 : 0);
      const h = 8 + K.hash01(s + 3) * 8;
      const z = -20 - i * 17;
      const g = new ctx.THREE.Group();
      // 断墙板（倾斜、错缝）
      for (let k = 0; k < 3; k++) {
        const bw = 2.6 + K.hash01(s + 7 + k) * 2.8;
        const bh = h * (0.32 + K.hash01(s + 11 + k) * 0.4);
        const slab = K.box(bw, bh, 1.4, 0x1c0a0e, { kind: 'stone', roughness: 0.92 });
        slab.position.set((K.hash01(s + 13 + k) - 0.5) * 2.6, h * (0.2 + k * 0.3), (K.hash01(s + 17 + k) - 0.5) * 1.4);
        slab.rotation.z = (K.hash01(s + 19 + k) - 0.5) * 0.22;
        slab.rotation.y = (K.hash01(s + 23 + k) - 0.5) * 0.3;
        g.add(slab);
      }
      // 钢筋：从断墙里探出的曲线（tube）
      for (let k = 0; k < 3; k++) {
        const pts = [];
        const bx = (K.hash01(s + 29 + k) - 0.5) * 2.2;
        const by = h * (0.35 + k * 0.18);
        for (let n = 0; n <= 4; n++) {
          pts.push([
            bx + side * n * 0.55,
            by + Math.sin(n * 1.7 + k) * 0.7 + n * 0.12,
            (K.hash01(s + 31 + k) - 0.5) * 0.6 + n * 0.22,
          ]);
        }
        g.add(K.tube(pts, 0.055, 0x3a1a18, { kind: 'rust', radial: 5, seg: 16 }));
      }
      // 壁面血光条
      const lamp = glow(ctx, boss ? 0xff2f45 : 0xa02030, 0.14, h * 0.5, 0.14, boss ? 1.8 : 1.1);
      lamp.position.set(side * -1.6, h * 0.55, 0.8);
      g.add(lamp);
      g.position.set(side * 11.5, -6.2, z);
      g.rotation.y = side * -0.22;
      ctx.add(g);
    }
  }
}

/** 巨轮（hero）+ 沿壁爬升的轮群 */
function addWheels(ctx, boss) {
  const K = ctx.K;
  // 主角巨轮：右侧悬空、慢速滚动（不落地 = 超现实）
  const hero = K.spokedWheel({
    x: 13.2, y: boss ? 8.2 : 6.6, z: boss ? -24 : -28,
    r: 8.6, tube: 0.82, color: 0x6a1c24, spikes: 18, glow: boss ? 0xff2f45 : 0xd02838,
  });
  hero.rotation.set(0.16, -0.52, 0.06);
  ctx.add(hero);
  ctx.animate(hero, { spinZ: boss ? -1.35 : -0.55, spinY: 0.05 });
  // 轮下血水里的暗影（暗示悬浮）
  const shadow = K.ring(3.2, 8.2, 0x5a0a12, { opacity: 0.16 });
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(12, -6.05, -26);
  ctx.add(shadow);

  if (boss) {
    // 第二只巨轮：左侧倒转（对转）
    const hero2 = K.spokedWheel({
      x: -13.2, y: 9.4, z: -26,
      r: 8.6, tube: 0.82, color: 0x8a2028, spikes: 18, glow: 0xff5a2f,
    });
    hero2.rotation.set(-0.2, 0.62, Math.PI + 0.12);
    ctx.add(hero2);
    ctx.animate(hero2, { spinZ: 1.35, spinY: -0.05 });
  } else {
    // mid：左上方远处悬浮轮（小一号）
    const far = K.spokedWheel({ x: -11.5, y: 11.5, z: -52, r: 4.6, tube: 0.4, color: 0x4a1018, spikes: 11, glow: 0x8a1826 });
    far.rotation.set(0.3, 0.5, Math.PI);
    ctx.add(far);
    ctx.animate(far, { spinZ: 0.8 });
  }

  // 轮群沿隧道壁爬升：贴在两侧壁上，朝向街心，自转
  const climb = boss ? 6 : 5;
  for (let i = 0; i < climb; i++) {
    const side = i % 2 ? 1 : -1;
    const z = -20 - i * 15;
    const y = 0.5 + i * 2.1;
    const w = K.spokedWheel({
      x: side * (10.6 + (i % 3) * 0.6), y, z,
      r: 2.4 + K.hash01(i * 17 + 3) * 1.1,
      tube: 0.18, color: 0x4a121a, spikes: 9,
      glow: i % 2 ? 0xff5a2f : 0xc0263a,
    });
    w.rotation.y = side * (Math.PI / 2 - 0.18);
    w.rotation.z = side * 0.1;
    ctx.add(w);
    ctx.animate(w, { spinZ: (i % 2 ? 1 : -1) * (0.7 + i * 0.08) });
  }
}

/** 超现实：纸钱龙卷（旋涡状纸片群） */
function addPaperTornado(ctx, boss) {
  const K = ctx.K;
  const g = new ctx.THREE.Group();
  const n = boss ? 26 : 18;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const a = t * TAU * 2.4;
    const r = 1.4 + t * 5.2;
    const note = K.box(0.7, 0.9, 0.03, 0xd8c4a8, { kind: 'paper', roughness: 0.9, emissive: 0x6a4a28, emissiveIntensity: 0.5 });
    note.position.set(Math.cos(a) * r, t * 13 - 5, Math.sin(a) * r * 0.7);
    note.rotation.set(K.hash01(i * 7) * TAU, a, (K.hash01(i * 11) - 0.5) * 1.2);
    g.add(note);
  }
  g.position.set(11.5, -2, -44);
  ctx.add(g);
  ctx.updater((dt, t) => {
    g.rotation.y += dt * (boss ? 1.9 : 1.2);
    g.position.y = -2 + Math.sin(t * 0.4) * 0.7;
  });
}

/** 荆棘：血土里暴长的 tube 曲线 + 尖刺 */
function addThorns(ctx, boss) {
  const K = ctx.K;
  for (const side of [-1, 1]) {
    const g = new ctx.THREE.Group();
    const nodes = boss ? 3 : 2;
    for (let v = 0; v < nodes; v++) {
      const s = v * 37 + (side > 0 ? 211 : 0);
      const pts = [];
      const len = 6 + K.hash01(s + 3) * 5;
      for (let n = 0; n <= 7; n++) {
        const u = n / 7;
        pts.push([
          side * u * len * (0.35 + K.hash01(s + 5) * 0.4) + Math.sin(u * 5.2 + v) * 0.5,
          0.35 + u * len * (0.6 + K.hash01(s + 7) * 0.5),
          v * 1.4 + Math.sin(u * 4 + v * 2) * 0.7,
        ]);
      }
      g.add(K.tube(pts, 0.09 + K.hash01(s + 11) * 0.09, 0x24080c, { kind: 'wood', radial: 6, seg: 26 }));
      for (let k = 1; k < 7; k++) {
        const u = k / 7;
        const spike = K.cone(0.07 + K.hash01(s + 13 + k) * 0.09, 0.5 + K.hash01(s + 17 + k) * 0.8, 0x1a060a, { seg: 4, kind: 'rust' });
        spike.position.set(
          side * u * len * 0.5 + Math.sin(u * 5.2 + v) * 0.4,
          0.4 + u * len * 0.8,
          v * 1.4 + 0.2,
        );
        spike.rotation.z = side * -(0.7 + u * 0.5);
        g.add(spike);
      }
      // 刺尖微光
      const tip = K.sphere(0.09, 0xc0263a, { emissive: 0xc0263a, emissiveIntensity: 1.6, seg: 8, seg2: 6 });
      tip.position.set(side * len * 0.45, 0.4 + len * 0.85, v * 1.4);
      g.add(tip);
    }
    g.position.set(side * 7.2, -6.1, -10);
    g.rotation.y = side * -0.3;
    ctx.add(g);
  }
}

/** 远景：雾中巨轮剪影 + 血月 */
function addBackdrop(ctx, boss) {
  const K = ctx.K;
  const rim = K.torus(boss ? 24 : 20, boss ? 1.3 : 1.0, 0x3a0a12, {
    kind: 'rust', radial: 5, tubular: 64, emissive: 0x5a0c14, emissiveIntensity: 0.7,
  });
  rim.position.set(-19, boss ? 19 : 17, boss ? -118 : -128);
  rim.rotation.z = 0.22;
  ctx.add(rim);
  ctx.animate(rim, { spinZ: boss ? 0.06 : 0.035 });
  const rim2 = K.torus(boss ? 15 : 12, 0.6, 0x22060a, { kind: 'metal', radial: 5, tubular: 48 });
  rim2.position.copy(rim.position);
  ctx.add(rim2);
  ctx.animate(rim2, { spinZ: -0.05 });
  // 血月（边缘）
  ctx.add(K.moon({
    x: 12, y: 13.5, z: -106, r: boss ? 7.6 : 6.4,
    color: 0xd8b0b0, halo: 0xff3040, haloOpacity: boss ? 0.26 : 0.18,
  }));
}

/** 体积血红光 + 血光柱 */
function addBloodLight(ctx, boss) {
  const K = ctx.K;
  const beams = boss ? 4 : 2;
  for (let i = 0; i < beams; i++) {
    const side = i % 2 ? 1 : -1;
    const b = K.volumetricBeam({
      x: side * (11 + (i > 1 ? 3 : 0)), y: 11, z: -34 - i * 16,
      length: 34, radius: 2.6,
      color: boss ? 0xff2438 : 0xc0263a,
      opacity: boss ? 0.07 : 0.04,
      tilt: side * 0.2, spin: 0.3 + i * 0.1,
    });
    ctx.add(b);
  }
  if (boss) {
    // 血光柱：从血水里升起的垂直光柱（近景边缘）
    for (const side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const pillar = new ctx.THREE.Mesh(
          new ctx.THREE.CylinderGeometry(0.5 + i * 0.4, 1.1 + i * 0.5, 30, 16, 1, true),
          new ctx.THREE.MeshBasicMaterial({
            color: i ? 0xff5a2f : 0xff2438, transparent: true, opacity: 0.05 - i * 0.015,
            blending: ctx.THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false,
          }),
        );
        pillar.position.set(side * (10.2 + i * 2.2), 6, -36 - i * 9);
        ctx.add(pillar);
      }
    }
  }
}

/** 刺阵（boss）：血水裂隙里刺出的锈刺 */
function addSpikeField(ctx, boss) {
  if (!boss) return;
  const K = ctx.K;
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1;
    const h = 2.2 + K.hash01(i * 17) * 3.8;
    const sp = K.cone(0.22 + K.hash01(i * 13) * 0.3, h, 0x1a060a, { seg: 5, kind: 'rust' });
    sp.position.set(side * (7.5 + K.hash01(i * 19) * 5.5), -6.1 + h / 2, -14 - K.hash01(i * 23) * 60);
    sp.rotation.z = side * (0.18 + K.hash01(i * 29) * 0.3);
    ctx.add(sp);
    const tip = K.sphere(0.1, 0xff3040, { emissive: 0xff3040, emissiveIntensity: 2, seg: 6, seg2: 4 });
    tip.position.copy(sp.position);
    tip.position.y += h * 0.46;
    ctx.add(tip);
  }
}

/** 边缘文字 + 雾幕 */
function addAtoms(ctx, boss) {
  const K = ctx.K;
  const textColor = boss ? '#ffd0c8' : '#ffb199';
  const defs = boss
    ? [{ t: '赌', x: -9.5, y: 12.5, z: -24 }, { t: '创', x: 9.8, y: 14.4, z: -40 }]
    : [{ t: '创', x: 9.6, y: 12.6, z: -30 }];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    const sp = char(ctx, d.t, { x: d.x, y: d.y, z: d.z, h: boss ? 3.6 : 3.0, fill: textColor, opacity: 0.9 });
    if (sp) {
      ctx.add(sp);
      ctx.animate(sp, { bob: { amp: 0.05, speed: 0.5, phase: i }, pulse: { amp: 0.05, speed: 0.8, phase: i } });
    }
    const halo = K.ring(1.7, 2.5, boss ? 0xff3040 : 0xc0263a, { opacity: 0.18 });
    halo.position.set(d.x, d.y, d.z - 0.3);
    ctx.add(halo);
  }
  // 雾幕（shader 噪声，代替旧雾片，避免三角形伪影）
  ctx.add(K.mistSheet({
    x: 0, y: -2, z: -30, w: 90, h: 26,
    color: mixHex(ctx.palette.fog, ctx.palette.ink, 0.4),
    opacity: boss ? 0.22 : 0.16, seed: 2, speed: 0.025,
  }));
  ctx.add(K.mistSheet({
    x: -8, y: 2, z: -64, w: 110, h: 30,
    color: mixHex(ctx.palette.fog, ctx.palette.glow, 0.2),
    opacity: boss ? 0.2 : 0.14, seed: 5, speed: 0.018,
  }));
}

function addParticles(ctx, boss) {
  ctx.points({
    count: boss ? 48 : 34, color: 0xff6a35, size: 0.18, type: 'spark',
    xRange: 38, yRange: 26, zNear: -2, zFar: -66, speed: boss ? 4.2 : 3.0, seed: 21,
  });
  ctx.points({
    count: boss ? 34 : 26, color: 0xd8c0a8, size: 0.22, type: 'paper',
    xRange: 38, yRange: 26, zNear: -3, zFar: -72, speed: 2.0, seed: 23,
  });
  ctx.points({
    count: boss ? 26 : 18, color: 0x8a1420, size: 0.6, type: 'spark',
    xRange: 46, yRange: 30, zNear: -28, zFar: -112, speed: 0.9, seed: 27,
  });
}

function build(ctx, boss) {
  const { palette, K } = ctx;
  ctx.atmosphere({
    bg: palette.skyBot,
    fogColor: mixHex(palette.fog, palette.ink, 0.62),
    fogDensity: boss ? 0.019 : 0.017,
    ambient: palette.ambient,
    ambientIntensity: 0.42,
    hemiSky: mixHex(palette.glow, palette.fog, 0.35),
    hemiGround: palette.ink,
    hemiIntensity: 0.55,
    dirColor: boss ? 0xff5a5a : 0xffa080,
    dirIntensity: boss ? 2.3 : 1.9,
    shadow: true,
    shadowSize: 1024,
  });
  addBloodFloor(ctx, boss);
  addBackdrop(ctx, boss);
  addTunnelWalls(ctx, boss);
  addThorns(ctx, boss);
  addWheels(ctx, boss);
  addPaperTornado(ctx, boss);
  addSpikeField(ctx, boss);
  addBloodLight(ctx, boss);
  addAtoms(ctx, boss);
  addParticles(ctx, boss);
  // 顶部悬挂的「独轮创车」铁牌
  const sign = K.box(9, 3.2, 0.25, 0x1a070b, { kind: 'rust', roughness: 0.8 });
  sign.position.set(boss ? 0 : -6.5, boss ? 16.5 : 15.5, -46);
  ctx.add(sign);
  for (let i = 0; i < 4; i++) {
    const bar = glow(ctx, i % 2 ? 0xff6a35 : 0xc0263a, 0.18, 2.4, 0.12, 1.6);
    bar.position.set(sign.position.x + (i - 1.5) * 2.1, sign.position.y, sign.position.z + 0.2);
    ctx.add(bar);
  }
  ctx.setSpeed(boss ? 15 : 10);
  ctx.setSway(boss ? 0.8 : 0.55, boss ? 0.42 : 0.3);
}

export function mid(ctx) {
  build(ctx, false);
}

export function boss(ctx) {
  build(ctx, true);
}
