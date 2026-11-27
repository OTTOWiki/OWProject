/**
 * EX「键政覆写」——超写实 · 超现实 3D 舞台。
 *
 * PBR 镜面数据地面 + 数据门 + 漂浮页面 + 二进制雨 + 数据漩涡（环/线框）+ 服务器碑林 + 体积光。
 * 超现实：门崩解为错位两半、页面风暴、无尽数据回廊、巨眼/覆写文字。
 * boss：漩涡加速、全屏覆写闪烁、门核心爆光。
 * 构图：中心门体保持低对比暗紫，亮光集中在门缝、漩涡环与四边故障带。
 */
const TAU = Math.PI * 2;

function mixHex(a, b, t) {
  const ar = (a >> 16) & 255; const ag = (a >> 8) & 255; const ab = a & 255;
  const br = (b >> 16) & 255; const bg = (b >> 8) & 255; const bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16)
    | (Math.round(ag + (bg - ag) * t) << 8)
    | Math.round(ab + (bb - ab) * t);
}

function neon(ctx, color, w, h, d, intensity = 2.2) {
  return ctx.K.box(w, h, d, 0x000000, { emissive: color, emissiveIntensity: intensity, kind: 'metal', roughness: 0.35 });
}

function char(ctx, text, { x = 0, y = 0, z = -20, h = 2.6, fill = '#f0a0ff', opacity = 0.95 } = {}) {
  return ctx.textSprite(text, {
    x, y, z, w: h * 2, h, fill, bg: 'rgba(0,0,0,0)', opacity,
    font: 'bold 170px "Noto Serif CJK SC", "Microsoft YaHei", serif',
  });
}

function line(ctx, text, { x = 0, y = 0, z = -40, h = 4, fill = '#f0a0ff', opacity = 0.9 } = {}) {
  return ctx.textSprite(text, {
    x, y, z, w: h * 2, h, fill, bg: 'rgba(0,0,0,0)', opacity,
    font: 'bold 88px "Noto Serif CJK SC", "Microsoft YaHei", serif',
  });
}

/** 镜面数据地面 + 发光六角格栅 + 数据车道 */
function addDataFloor(ctx, boss) {
  const K = ctx.K;
  const water = K.waterFloor({
    y: -6.3, size: [300, 360], color: 0x05020c,
    normalScale: boss ? 0.3 : 0.24, roughness: 0.24, metalness: 0.12, envMapIntensity: 0.45, flow: 0.4,
  });
  ctx.add(water);
  // 贴地的六角数据格栅（镜面里的电路）
  const hex = K.hexLattice({
    x: 0, y: -6.22, z: -34, w: 54, h: 54, size: 1.5,
    color: 0x7ae0ff, opacity: boss ? 0.22 : 0.14,
  });
  hex.rotation.x = -Math.PI / 2;
  ctx.add(hex);
  // 两侧数据车道（边缘发光线）
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const lane = neon(ctx, i % 2 ? 0xff5ad0 : 0x5ad4e0, 0.12, 0.03, 70 - i * 8, boss ? 1.4 : 0.9);
      lane.position.set(side * (6 + i * 1.6), -6.18, -30 - i * 10);
      lane.rotation.y = side * -0.05;
      ctx.add(lane);
    }
  }
}

/** 无尽数据回廊：一组组矩形门框沿 Z 后退（细线，低亮度） */
function addCorridor(ctx, boss) {
  const K = ctx.K;
  const n = boss ? 8 : 7;
  for (let i = 0; i < n; i++) {
    const z = -16 - i * 13;
    const w = 11 + i * 1.1;
    const hh = 13 + i * 1.2;
    const col = i % 2 ? 0x5ad4e0 : (boss ? 0xff5ad0 : 0xd94fd0);
    const g = new ctx.THREE.Group();
    for (const side of [-1, 1]) {
      const post = K.box(0.5, hh, 0.5, 0x1c1230, { kind: 'metal', roughness: 0.6, emissive: 0x2a1040, emissiveIntensity: 0.4 });
      post.position.set(side * w / 2, hh / 2 - 6.4, 0);
      g.add(post);
      const strip = neon(ctx, col, 0.09, hh * 0.82, 0.09, i < 3 ? 1.4 : 0.8);
      strip.position.set(side * w / 2, hh / 2 - 6.4, 0.3);
      g.add(strip);
    }
    const top = K.box(w, 0.5, 0.5, 0x1c1230, { kind: 'metal', roughness: 0.6, emissive: 0x2a1040, emissiveIntensity: 0.4 });
    top.position.set(0, hh - 6.4, 0);
    g.add(top);
    const topStrip = neon(ctx, col, w, 0.09, 0.09, i < 3 ? 1.2 : 0.7);
    topStrip.position.set(0, hh - 6.4, 0.3);
    g.add(topStrip);
    g.position.z = z;
    ctx.add(g);
  }
}

/** 数据门（mid）+ 崩解为两半（boss） */
function addGate(ctx, boss) {
  const K = ctx.K;
  const accent = boss ? 0xff5ad0 : 0xd94fd0;
  if (!boss) {
    ctx.add(K.gate({ x: 0, y: -6.4, z: -54, w: 16, h: 20, color: 0x1a1028, accent, glow: true }));
    // 门楣「覆写」
    for (let i = 0; i < 2; i++) {
      const sp = char(ctx, i ? '写' : '覆', {
        x: 0, y: 15.8 - i * 3.4, z: -53.2, h: 3.0,
        fill: boss ? '#ffd0ff' : '#f0a0ff', opacity: 0.92,
      });
      if (sp) {
        ctx.add(sp);
        ctx.animate(sp, { pulse: { amp: 0.04, speed: 0.9, phase: i } });
      }
    }
    return;
  }
  // boss：门崩解为左右错位两半，中间是爆光核心
  const hh = 20;
  const w = 16;
  for (const side of [-1, 1]) {
    const half = new ctx.THREE.Group();
    const post = K.box(1.8, hh, 1.8, 0x1e1230, { kind: 'stone', roughness: 0.7, emissive: 0x3a1858, emissiveIntensity: 0.5 });
    post.position.set(0, hh / 2, 0);
    half.add(post);
    const beam = K.box(w / 2 + 1.4, 1.8, 1.8, 0x1e1230, { kind: 'stone', roughness: 0.7, emissive: 0x3a1858, emissiveIntensity: 0.5 });
    beam.position.set(side * (w / 4), hh + 0.9, 0);
    half.add(beam);
    const trim = neon(ctx, accent, w / 2, 0.18, 0.2, 2.4);
    trim.position.set(side * (w / 4), hh, 0.92);
    half.add(trim);
    const inner = neon(ctx, 0x5ad4e0, 0.14, hh * 0.9, 0.14, 1.6);
    inner.position.set(side * -0.9, hh / 2, 0.9);
    half.add(inner);
    half.position.set(side * 4.8, 0, side * 1.4);
    half.rotation.z = side * -0.07;
    half.rotation.y = side * 0.14;
    half.position.y = side < 0 ? 0.6 : -0.6;
    ctx.add(half);
  }
  // 门核心爆光
  const core = K.sphere(2.4, 0xff8ae0, { emissive: 0xff8ae0, emissiveIntensity: 3.0, seg: 24, seg2: 16 });
  core.position.set(0, 10.5, -53.6);
  ctx.add(core);
  const coreHalo = K.ring(2.8, 4.6, 0xffb0ff, { opacity: 0.34 });
  coreHalo.position.copy(core.position);
  ctx.add(coreHalo);
  ctx.animate(coreHalo, { pulse: { amp: 0.14, speed: 1.3 }, spinZ: 0.24 });
  ctx.animate(core, { pulse: { amp: 0.06, speed: 1.1 } });
  // 门碎片（错位漂浮的碎块）
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    const shard = K.box(0.7 + K.hash01(i * 7) * 0.9, 0.5 + K.hash01(i * 9) * 1.1, 0.5, 0x241638, {
      kind: 'granite', roughness: 0.8, emissive: 0xd94fd0, emissiveIntensity: 0.5,
    });
    shard.position.set(Math.cos(a) * (5 + K.hash01(i * 11) * 5), 8 + K.hash01(i * 13) * 8, -50 + Math.sin(a) * 3);
    shard.rotation.set(K.hash01(i * 17) * 3, K.hash01(i * 19) * 3, K.hash01(i * 23) * 3);
    ctx.add(shard);
    ctx.animate(shard, { spinX: (hashDir(i) * 0.3), spinY: (hashDir(i + 5) * 0.3), bob: { amp: 0.05, speed: 0.4, phase: i } });
  }
}

/** 小工具：确定性正负方向 */
function hashDir(n) {
  return ((n * 4.7) % 2 < 1) ? 1 : -1;
}

/** 数据漩涡：环 + 线框 */
function addVortex(ctx, boss) {
  const K = ctx.K;
  // 线框十二面体（数据核心）
  const geo = new ctx.THREE.IcosahedronGeometry(7, 1);
  const wf = new ctx.THREE.WireframeGeometry(geo);
  const wmat = new ctx.THREE.LineBasicMaterial({
    color: boss ? 0x7ae0ff : 0x5ad4e0, transparent: true, opacity: boss ? 0.4 : 0.3,
    fog: true, toneMapped: false,
  });
  const wire = new ctx.THREE.LineSegments(wf, wmat);
  wire.position.set(0, 3.5, boss ? -52 : -60);
  ctx.add(wire);
  ctx.animate(wire, { spinY: boss ? 0.45 : 0.22, spinZ: 0.12 });
  const wmat2 = wmat.clone();
  wmat2.color.setHex(0xff5ad0);
  wmat2.opacity = boss ? 0.3 : 0.2;
  const wire2 = new ctx.THREE.LineSegments(new ctx.THREE.WireframeGeometry(new ctx.THREE.IcosahedronGeometry(10, 0)), wmat2);
  wire2.position.copy(wire.position);
  ctx.add(wire2);
  ctx.animate(wire2, { spinY: boss ? -0.3 : -0.16, spinX: 0.1 });
  // 环（数据涡流）
  const rings = boss ? 8 : 6;
  for (let i = 0; i < rings; i++) {
    const u = i / Math.max(1, rings - 1);
    const r = 6 + u * (boss ? 30 : 24);
    const color = i % 2 ? 0x5ad4e0 : (boss ? 0xff5ad0 : 0xd94fd0);
    const ring = K.ring(r - 0.16, r + 0.16, color, { opacity: (boss ? 0.36 : 0.26) * (1 - u * 0.5) });
    ring.position.set(0, 3 - u * 3.5, -28 - u * 74);
    ring.rotation.z = (i % 3) * 0.4;
    ctx.add(ring);
    ctx.animate(ring, { spinZ: (i % 2 ? 1 : -1) * (boss ? 0.5 : 0.28), pulse: { amp: 0.04, speed: 0.6, phase: i } });
  }
}

/** 服务器碑林（两侧真 3D 体块） */
function addServerField(ctx, boss) {
  const K = ctx.K;
  for (const side of [-1, 1]) {
    for (let i = 0; i < (boss ? 7 : 6); i++) {
      const s = i * 23 + (side > 0 ? 601 : 0);
      const z = -22 - i * 14;
      const g = new ctx.THREE.Group();
      const h = 7 + K.hash01(s + 3) * 9;
      const bw = 1.8 + K.hash01(s + 5) * 1.6;
      const body = K.box(bw, h, 1.8, 0x241636, { kind: 'granite', roughness: 0.7 });
      body.position.y = h / 2;
      g.add(body);
      const strip = neon(ctx, i % 2 ? 0x5ad4e0 : (boss ? 0xff5ad0 : 0xd94fd0), 0.14, h * 0.72, 0.1, boss ? 1.8 : 1.2);
      strip.position.set(0, h * 0.5, 0.95);
      g.add(strip);
      // 服务器插槽横线
      const slots = 3 + (i % 3);
      for (let k = 0; k < slots; k++) {
        const slot = neon(ctx, i % 2 ? 0x7ae0ff : 0xff8ae0, bw * 0.7, 0.04, 0.06, 0.8);
        slot.position.set(0, h * (0.2 + k * 0.18), 0.95);
        g.add(slot);
      }
      const cap = K.sphere(0.2, i % 2 ? 0x7ae0ff : 0xff8ae0, {
        emissive: i % 2 ? 0x7ae0ff : 0xff8ae0, emissiveIntensity: 2.4, seg: 10, seg2: 8,
      });
      cap.position.set(0, h + 0.26, 0);
      g.add(cap);
      g.position.set(side * (12 + K.hash01(s + 7) * 6), -6.4, z);
      g.rotation.y = side * -0.12;
      ctx.add(g);
    }
  }
}

/** 漂浮页面（绘卷裁片 = 被覆写的词条页） */
function addPages(ctx, boss) {
  const K = ctx.K;
  const crops = [
    [0.02, 0.04, 0.48, 0.5], [0.5, 0.08, 0.48, 0.52], [0.08, 0.52, 0.5, 0.44],
    [0.52, 0.52, 0.46, 0.44],
  ];
  const n = boss ? 10 : 7;
  for (let i = 0; i < n; i++) {
    const tex = ctx.plateCrop(...crops[i % crops.length]);
    const side = i % 2 ? 1 : -1;
    const p = tex ? K.artPanel(tex, {
      x: side * (5.4 + K.hash01(i * 17) * 6), y: 2 + K.hash01(i * 11) * 11, z: -20 - i * 9,
      w: 3.4 + K.hash01(i * 23) * 2.4, h: 4.4 + K.hash01(i * 29) * 2.6,
      rotationY: side * (0.3 + K.hash01(i * 31) * 0.5),
      rotationZ: (K.hash01(i * 37) - 0.5) * 0.5,
      opacity: boss ? 0.86 : 0.72, tint: boss ? 0xffd0ff : 0xd8b0e8,
    }) : null;
    if (p) {
      ctx.add(p);
      ctx.animate(p, { spinY: (i % 2 ? 1 : -1) * (0.14 + i * 0.01), bob: { amp: 0.06, speed: 0.3 + i * 0.02, phase: i } });
    }
    // 页面边缘发光
    const edge = neon(ctx, i % 2 ? 0x5ad4e0 : (boss ? 0xff5ad0 : 0xd94fd0), 0.08, 4.6, 0.08, 1.0);
    edge.position.set(side * (5.4 + K.hash01(i * 17) * 6), 2 + K.hash01(i * 11) * 11 + 0.4, -20 - i * 9 + 0.2);
    ctx.add(edge);
  }
}

/** 巨眼（边缘）+ 覆写文字 + 故障带 */
function addOverwrite(ctx, boss) {
  const K = ctx.K;
  const eye = K.skyEye({
    x: 13.5, y: boss ? 16.5 : 15.5, z: boss ? -84 : -96, r: boss ? 5.6 : 4.8,
    color: 0xd8c0e0, iris: boss ? 0xff5ad0 : 0xd94fd0, pupil: 0x0a0410,
  });
  ctx.add(eye);
  ctx.animate(eye, { pulse: { amp: 0.03, speed: 0.35 } });
  const halo = K.ring(boss ? 6.2 : 5.3, boss ? 8.2 : 7.0, 0xff5ad0, { opacity: boss ? 0.18 : 0.11 });
  halo.position.set(13.5, boss ? 16.5 : 15.5, boss ? -84.5 : -96.5);
  ctx.add(halo);
  ctx.animate(halo, { spinZ: 0.08 });
  // 覆写文字（顶部/底部边缘）
  const wordDefs = boss
    ? [{ x: -8.5, y: 16.5, t: '覆写', c: '#ffb0ff', h: 3.2 }, { x: 8.5, y: -14.8, t: '404', c: '#7ae0ff', h: 2.6 }]
    : [{ x: 9.5, y: 16.2, t: '覆写', c: '#e8b0ff', h: 2.6 }];
  for (let i = 0; i < wordDefs.length; i++) {
    const d = wordDefs[i];
    const sp = line(ctx, d.t, { x: d.x, y: d.y, z: -32 - i * 10, h: d.h, fill: d.c, opacity: 0.9 });
    if (sp) {
      ctx.add(sp);
      ctx.animate(sp, { pulse: { amp: boss ? 0.3 : 0.06, speed: boss ? 4.0 : 1.0, phase: i }, bob: { amp: 0.04, speed: 0.3, phase: i } });
    }
  }
  // 故障带（四边）
  for (let i = 0; i < (boss ? 12 : 7); i++) {
    const y = (i % 2 ? 1 : -1) * (8.4 + K.hash01(i * 13) * 5.2);
    const z = -16 - K.hash01(i * 17) * 50;
    const band = neon(ctx, i % 3 === 0 ? 0xffffff : (i % 2 ? 0x5ad4e0 : 0xff5ad0), 20 + K.hash01(i * 19) * 26, 0.06 + K.hash01(i * 23) * 0.18, 0.1, boss ? 1.8 : 1.1);
    band.position.set((K.hash01(i * 29) - 0.5) * 8, y, z);
    ctx.add(band);
    ctx.animate(band, { pulse: { amp: boss ? 0.6 : 0.25, speed: 2.4 + i * 0.3, phase: i } });
  }
}

function addParticles(ctx, boss) {
  ctx.points({
    count: boss ? 106 : 88, color: 0x8af0e8, size: 0.18, type: 'binary',
    xRange: 34, yRange: 32, zNear: -2, zFar: -74, speed: boss ? 5.6 : 4.2, seed: 41,
  });
  ctx.points({
    count: boss ? 38 : 28, color: 0xff8ae0, size: 0.16, type: 'spark',
    xRange: 30, yRange: 28, zNear: -4, zFar: -64, speed: 2.8, seed: 43,
  });
  ctx.points({
    count: boss ? 26 : 18, color: 0x6a9ec8, size: 0.5, type: 'spark',
    xRange: 40, yRange: 30, zNear: -26, zFar: -108, speed: 0.8, seed: 47,
  });
}

function build(ctx, boss) {
  const { palette } = ctx;
  ctx.atmosphere({
    bg: palette.skyBot,
    fogColor: mixHex(palette.fog, palette.ink, 0.5),
    fogDensity: boss ? 0.024 : 0.021,
    ambient: palette.ambient,
    ambientIntensity: 0.45,
    hemiSky: mixHex(palette.accent2, palette.fog, 0.4),
    hemiGround: palette.ink,
    hemiIntensity: 0.6,
    dirColor: boss ? 0xff5ad0 : 0xc06ad0,
    dirIntensity: boss ? 1.6 : 1.2,
    shadow: true,
    shadowSize: 1024,
  });
  addDataFloor(ctx, boss);
  addCorridor(ctx, boss);
  addGate(ctx, boss);
  addVortex(ctx, boss);
  addServerField(ctx, boss);
  addPages(ctx, boss);
  addOverwrite(ctx, boss);
  addParticles(ctx, boss);
  // 数据雾墙
  for (let i = 0; i < 3; i++) {
    ctx.add(ctx.K.mistSheet({
      x: (i - 1) * 7, y: -1.5 + i * 0.8, z: -26 - i * 18, w: 70 + i * 10, h: 22,
      color: mixHex(palette.fog, palette.accent, 0.25 + i * 0.05),
      opacity: boss ? 0.2 : 0.15, seed: i + 2, speed: 0.03 + i * 0.01,
    }));
  }
  // 体积光（洋红/青，两侧边缘）
  for (let i = 0; i < (boss ? 4 : 3); i++) {
    const side = i % 2 ? 1 : -1;
    ctx.add(ctx.K.volumetricBeam({
      x: side * (10.5 + i * 2.2), y: 11, z: -36 - i * 15,
      length: 36, radius: 2.4,
      color: i % 2 ? 0x5ad4e0 : (boss ? 0xff5ad0 : 0xd94fd0),
      opacity: boss ? 0.075 : 0.05,
      tilt: side * 0.18, spin: 0.24 + i * 0.06,
    }));
  }
  ctx.setSpeed(boss ? 18 : 13);
  ctx.setSway(boss ? 0.9 : 0.65, boss ? 0.5 : 0.35);
}

export function mid(ctx) {
  build(ctx, false);
}

export function boss(ctx) {
  build(ctx, true);
}
