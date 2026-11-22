/**
 * A线第5面「主角组间冲突 · 署名权争夺」3D 舞台。
 *
 * 方向（2026-11-22 用户修正）：持续深入的 3D 场景 + Billboard 绘卷 + 真 3D 物体 + 超现实。
 * mid：左蓝右粉的双色空间——镜像神社浮岛互相旋绕，中央被撕开的「署名」卷轴悬在两侧，
 *      双色涡旋卷起署名残页与花瓣，镜面水台倒映双色光与水中孤月。
 * boss：双涡合并对撞、巨大的「署名」封印自天压下、镜面碎裂成漂浮残片。
 */
const BLUE = 0x6f9fd8;
const BLUE_HOT = 0x9fc8f0;
const PINK = 0xe89ab8;
const PINK_HOT = 0xffb0d0;
const VIOLET = 0x8a6fae;
const PAPER = 0xd8ccdc;
const INK = 0x05070c;
const SEAL = 0xb3342e;

/** 和纸面片（材质缺失时用纯色面兜底） */
function paperPanel(ctx, { x = 0, y = 0, z = -20, w = 6, h = 8, color = PAPER, opacity = 0.8, rotZ = 0 } = {}) {
  const { K } = ctx;
  const tex = K.matTexture('washi', color);
  const p = K.panel(tex, { x, y, z, w, h, opacity, color: tex ? 0xffffff : color, rotationY: 0 });
  p.rotation.z = rotZ;
  ctx.add(p);
  return p;
}

/** 加色光锥（斜向光束/瀑布光） */
function glowCone(ctx, {
  x = 0, y = 0, z = -30, color = BLUE_HOT, opacity = 0.08,
  radius = 2.4, height = 26, rotX = 0, rotZ = 0, seg = 10,
} = {}) {
  const THREE = ctx.THREE;
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true,
  });
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, height, seg, 1, true), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.x = rotX;
  mesh.rotation.z = rotZ;
  ctx.add(mesh);
  return mesh;
}

/** 加色光带（画面内斜向光条） */
function beamPanel(ctx, { x = 0, y = 0, z = -30, w = 2.4, h = 26, rotZ = 0, color = BLUE_HOT, opacity = 0.08 } = {}) {
  const THREE = ctx.THREE;
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.z = rotZ;
  ctx.add(mesh);
  return mesh;
}

/** 远景绘卷：双色分场 + 漂浮画幅（Billboard 拼贴） */
function addBackdrop(ctx, boss) {
  const { K } = ctx;
  const art = ctx.plateTexture();
  if (art) {
    const back = K.panel(art, {
      x: 0, y: 2, z: -150, w: 260, h: 340, opacity: boss ? 0.58 : 0.5,
      color: boss ? 0x9a90b8 : 0x8a8aa8,
    });
    ctx.add(back);
    // 双色分场：左蓝右粉的大面（在绘卷墙前，极低透明）
    for (const [side, color] of [[-1, BLUE], [1, PINK]]) {
      const wash = K.panel(null, {
        x: side * 32, y: 4, z: -110, w: 70, h: 180, color, opacity: boss ? 0.1 : 0.075,
      });
      ctx.add(wash);
    }
    const crops = boss
      ? [[0.02, 0.03, 0.48, 0.4], [0.5, 0.08, 0.46, 0.44], [0.06, 0.5, 0.52, 0.42], [0.58, 0.52, 0.4, 0.42],
        [0.3, 0.26, 0.34, 0.34], [0.7, 0.28, 0.28, 0.32]]
      : [[0.04, 0.05, 0.44, 0.4], [0.5, 0.1, 0.44, 0.42], [0.1, 0.52, 0.46, 0.4], [0.6, 0.5, 0.36, 0.4]];
    for (let i = 0; i < crops.length; i++) {
      const tex = ctx.plateCrop(...crops[i]);
      if (!tex) continue;
      const side = i % 2 ? 1 : -1;
      const p = K.panel(tex, {
        x: side * (16 + K.hash01(i * 31) * 12),
        y: 6 + K.hash01(i * 37) * 16,
        z: -72 - i * 10,
        w: 22 + K.hash01(i * 41) * 14,
        h: 26 + K.hash01(i * 43) * 16,
        opacity: boss ? 0.3 : 0.22,
        color: i % 2 ? 0xffc8dc : 0xa8c8f0,
        rotationY: side * (0.2 + K.hash01(i * 47) * 0.2),
      });
      p.rotation.z = (K.hash01(i * 53) - 0.5) * 0.5;
      ctx.add(p);
    }
  }
  // 云带：双色各一层
  const cloud = K.matTexture('cloud', '#6a5a88');
  if (cloud) {
    for (let i = 0; i < 2; i++) {
      ctx.add(K.panel(cloud, {
        x: i ? 24 : -24, y: 20 - i * 5, z: -92 - i * 12, w: 150, h: 30,
        opacity: 0.1, color: i ? PINK : BLUE_HOT,
      }));
    }
  }
  // 水中孤月（顶部中央边缘，双色对峙的静默见证者）
  const moon = K.sphere(boss ? 6.2 : 5.6, 0xe8ecf8, { transparent: true, opacity: 0.94 });
  moon.position.set(0, boss ? 25 : 24, -70);
  ctx.add(moon);
  const halo = K.ring(boss ? 7 : 6.4, boss ? 7.5 : 6.9, 0xd8e0ff, { opacity: 0.24 });
  halo.position.set(0, boss ? 25 : 24, -70);
  ctx.add(halo);
  ctx.animate(halo, { pulse: { amp: 0.05, speed: 0.5 } });
}

/** 镜面水台：暗色地台 + 平铺绘卷倒影 + 双色反光带 */
function addMirrorFloor(ctx, boss) {
  const { K } = ctx;
  ctx.add(K.ground({
    y: -10, color: 0x070810,
    texture: K.matTexture('ink', boss ? '#161028' : '#0e0c1a'),
  }));
  const art = ctx.plateTexture();
  if (art) {
    const tex = ctx.plateCrop(0.08, 0.1, 0.84, 0.8);
    if (tex) {
      const mirror = K.panel(tex, {
        x: 0, y: -9.82, z: -46, w: 210, h: 260, opacity: boss ? 0.19 : 0.15, color: 0xc8b8e8,
      });
      mirror.rotation.x = -Math.PI / 2;
      ctx.add(mirror);
    }
  }
  // 双色反光带
  for (const [side, color] of [[-1, BLUE_HOT], [1, PINK_HOT]]) {
    for (let i = 0; i < 3; i++) {
      const strip = K.box(10 - i * 1.6, 0.05, 120, color, { transparent: true, opacity: 0.09 });
      strip.position.set(side * (7 + i * 2.8), -9.88 + i * 0.01, -60);
      ctx.add(strip);
    }
  }
  // 水面细碎波光
  ctx.field((i) => K.box(0.9 + K.hash01(i * 11) * 1.2, 0.03, 0.5, i % 2 ? PINK_HOT : BLUE_HOT, { transparent: true, opacity: 0.3 }),
    { count: 22, zNear: -10, zFar: -80, xRange: 30, xAbsMin: 6, y: -9.8, speedMul: 1.1 });
}

/** 镜像神社浮岛：岛底倒锥 + 神社/鸟居 + 光环；左右蓝粉对称、互相旋绕（超现实） */
function makeIsland(ctx, side, boss) {
  const { K } = ctx;
  const g = new ctx.THREE.Group();
  const cool = side < 0;
  const main = cool ? (boss ? BLUE_HOT : BLUE) : (boss ? PINK_HOT : PINK);
  const deep = cool ? 0x16283e : 0x38202c;
  const rock = K.cone(5.2, 7.2, deep, { seg: 8 });
  rock.rotation.z = Math.PI;
  rock.position.y = -3.8;
  g.add(rock);
  const top = K.cylinder(5.3, 4.8, 0.9, cool ? 0x22364c : 0x442438, { seg: 12 });
  top.position.y = 0.1;
  g.add(top);
  // 神社（两层宝塔）
  const shrine = K.pagoda({
    scale: 0.9, tiers: 2,
    body: cool ? 0x1e3248 : 0x3e2032,
    roof: cool ? 0x36526e : 0x64344e,
    window: main,
  });
  shrine.position.y = 0.7;
  g.add(shrine,);
  // 鸟居（面向中央；右岛镜像）
  const t = K.torii({ scale: 0.7, color: cool ? 0x44648c : 0x945070, dark: INK });
  t.position.set(side < 0 ? 3.9 : -3.9, 0.5, 2.4);
  t.rotation.y = side < 0 ? -0.5 : 0.5;
  g.add(t);
  // 浮空光环
  const halo = K.ring(5.6, 6.1, main, { opacity: 0.24 });
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.3;
  g.add(halo);
  ctx.animate(halo, { pulse: { amp: 0.05, speed: 0.7, phase: side } });
  // 岛外旋转环
  const outer = K.torus(6.2, 0.13, main, { radial: 4, tubular: 32 });
  outer.rotation.x = Math.PI / 2;
  outer.position.y = -1.4;
  g.add(outer);
  // 神社灯笼
  for (let i = 0; i < 3; i++) {
    const lamp = K.sphere(0.24, main, { transparent: true, opacity: 0.92 });
    lamp.position.set((i - 1) * 2.6, 1.8, 3.8);
    g.add(lamp);
    ctx.animate(lamp, { pulse: { amp: 0.3, speed: 1.2 + i * 0.4, phase: i + side } });
  }
  g.position.set(side * (boss ? 13 : 12.5), boss ? 5.5 : 4.8, boss ? -38 : -36);
  if (boss && side > 0) g.rotation.z = Math.PI * 0.94; // boss：右岛倾覆
  ctx.add(g);
  ctx.animate(g, {
    spinY: side * (boss ? 0.32 : 0.2),
    bob: { amp: 0.18, speed: 0.42, phase: side > 0 ? 1.4 : 0 },
  });
  // 岛底垂落的双色光瀑布
  const fall = glowCone(ctx, {
    x: side * (boss ? 13 : 12.5), y: -7, z: boss ? -38 : -36,
    color: main, opacity: boss ? 0.1 : 0.075, radius: 2, height: 14, seg: 8,
  });
  ctx.animate(fall, { pulse: { amp: 0.12, speed: 0.6 } });
  return g;
}

/** 撕裂的署名卷轴：左右两半被撕开、各自朝中央倾斜；纸+墨字+朱印+ ragged 撕口 */
function addTornScroll(ctx, boss) {
  const { K } = ctx;
  for (const side of [-1, 1]) {
    const x = side * (boss ? 12 : 11.5);
    const z = boss ? -36 : -38;
    const cy = boss ? 9.5 : 8.8;
    const half = paperPanel(ctx, {
      x, y: cy, z, w: 7.2, h: boss ? 14 : 12.4,
      color: side < 0 ? 0xa8b4d8 : 0xd8b0c4, opacity: boss ? 0.7 : 0.62,
      rotZ: side * (boss ? 0.24 : 0.16),
    });
    ctx.animate(half, { bob: { amp: 0.14, speed: 0.4, phase: side * 1.2 } });
    // 轴杆
    for (const e of [-1, 1]) {
      const rod = K.cylinder(0.16, 0.16, 1.1, 0x3a2a24);
      rod.position.set(x + e * 3.5, cy + e * 0.4, z + 0.4);
      rod.rotation.x = Math.PI / 2;
      ctx.add(rod);
    }
    // 墨字「署」「名」（Billboard）
    const glyph = ctx.textSprite(side < 0 ? '署' : '名', {
      x, y: cy, z: z + 0.35, w: 4.4, h: 6.6,
      fill: '#1e1828', bg: 'rgba(0,0,0,0)',
      font: 'bold 200px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity: 0.85,
    });
    ctx.add(glyph);
    ctx.animate(glyph, { bob: { amp: 0.12, speed: 0.38, phase: side } });
    // 朱印
    const seal = K.box(1.4, 1.4, 0.18, SEAL, { transparent: true, opacity: 0.8 });
    seal.position.set(x - side * 1.5, cy - 3.6, z + 0.5);
    seal.rotation.z = side * 0.08;
    ctx.add(seal);
    // ragged 撕口：沿内缘排一串错落的小纸屑 + 细墨缝
    const inner = x - side * 3.4;
    for (let i = 0; i < 5; i++) {
      const frag = K.box(0.4, 0.2 + K.hash01(i * 17 + side) * 0.3, 0.05, side < 0 ? 0xc8d0e4 : 0xe4c8d4, { transparent: true, opacity: 0.55 });
      frag.position.set(inner + side * (K.hash01(i * 19) - 0.3) * 0.9, cy - 4.4 + i * 2.2, z + 0.2);
      frag.rotation.z = K.hash01(i * 23) * 1.2 - 0.6;
      ctx.add(frag);
    }
    const seam = K.box(0.1, boss ? 14 : 12.4, 0.05, 0x1a1626, { transparent: true, opacity: 0.7 });
    seam.position.set(inner, cy, z + 0.15);
    ctx.add(seam);
  }
  // 撕开的中央裂隙：极低透明竖光
  const rift = K.panel(null, { x: 0, y: 8.8, z: -40, w: 1.3, h: 16, color: boss ? PINK : VIOLET, opacity: boss ? 0.15 : 0.09 });
  ctx.add(rift);
  ctx.animate(rift, { pulse: { amp: 0.2, speed: 0.9 } });
}

/** 双色涡旋：左右各一个旋转的环+残页，中央对撞光 */
function addVortices(ctx, boss) {
  const { K } = ctx;
  const art = ctx.plateTexture();
  for (const side of [-1, 1]) {
    const main = side < 0 ? (boss ? BLUE_HOT : BLUE) : (boss ? PINK_HOT : PINK);
    const v = new ctx.THREE.Group();
    v.position.set(side * (boss ? 10 : 9.5), 3.2, boss ? -28 : -26);
    for (let i = 0; i < 3; i++) {
      const rr = 2.4 + i * 1.4;
      const ring = K.torus(rr, 0.09 + i * 0.02, main, { radial: 4, tubular: 30, transparent: true, opacity: 0.4 - i * 0.08 });
      ring.rotation.x = Math.PI / 2 + (i - 1) * 0.34;
      ring.rotation.z = i * 0.7;
      v.add(ring);
    }
    for (let i = 0; i < (boss ? 10 : 8); i++) {
      const a = (i / (boss ? 10 : 8)) * Math.PI * 2;
      const rr = 1.7 + (i % 3) * 1.7;
      let item = null;
      if (art && i % 3 === 1) {
        const tex = ctx.plateCrop(K.hash01(i * 19) * 0.6, K.hash01(i * 23) * 0.6, 0.3, 0.3);
        item = tex ? K.sprite(tex, {
          x: Math.cos(a) * rr, y: Math.sin(a) * rr * 0.5, z: Math.sin(a) * 1.6,
          w: 1.5, h: 1.9, opacity: 0.42, color: side < 0 ? 0xb8d8ff : 0xffd0e0,
        }) : null;
      }
      if (!item) {
        item = K.box(0.5, 0.7, 0.05, PAPER, { transparent: true, opacity: 0.5 });
        item.position.set(Math.cos(a) * rr, Math.sin(a) * rr * 0.5, Math.sin(a) * 1.6);
        item.rotation.z = a;
      }
      v.add(item);
      ctx.animate(item, { bob: { amp: 0.1, speed: 0.7 + (i % 4) * 0.2, phase: i } });
    }
    ctx.add(v);
    ctx.animate(v, { spinY: side * (boss ? 0.62 : 0.44), spinZ: side * 0.06 });
  }
  // 中央对撞点：双色小环 + 低透明光斑
  const clash = new ctx.THREE.Group();
  clash.position.set(0, 3.6, -30);
  const c1 = K.torus(1.7, 0.08, BLUE_HOT, { transparent: true, opacity: 0.45 });
  const c2 = K.torus(1.25, 0.08, PINK_HOT, { transparent: true, opacity: 0.45 });
  c2.rotation.x = Math.PI / 2;
  clash.add(c1, c2);
  ctx.add(clash);
  ctx.animate(clash, { spinZ: 0.5, spinX: 0.2, pulse: { amp: 0.07, speed: 1.6 } });
  const flash = ctx.textSprite('✦', {
    x: 0, y: 3.6, z: -30, w: 4.4, h: 4.4,
    fill: boss ? '#ffe0f0' : '#e8e0ff', bg: 'rgba(0,0,0,0)',
    font: 'bold 200px sans-serif', opacity: boss ? 0.42 : 0.3,
  });
  ctx.add(flash);
  ctx.animate(flash, { pulse: { amp: 0.14, speed: 1.2 } });
}

/** 漂浮的署名印章 / 羽毛笔 / 残页（超现实悬空物） */
function addFloatingProps(ctx, boss) {
  const { K } = ctx;
  const seals = boss
    ? [[-11.5, 16, -28, 3.2, '署'], [12, 17, -31, 3.2, '名'], [-13, 8, -40, 2.4, '印'], [13.5, 7, -42, 2.4, '封']]
    : [[-11, 13, -28, 2.8, '署'], [11.5, 14, -30, 2.8, '名']];
  for (let i = 0; i < seals.length; i++) {
    const [x, y, z, s, text] = seals[i];
    const board = K.box(s, s, 0.3, SEAL, { transparent: true, opacity: 0.72 });
    board.position.set(x, y, z);
    board.rotation.z = (K.hash01(i * 61) - 0.5) * 0.34;
    ctx.add(board);
    const sp = ctx.textSprite(text, {
      x, y, z: z + 0.3, w: s * 1.5, h: s * 1.2,
      fill: '#f6e8e8', bg: 'rgba(0,0,0,0)', font: 'bold 190px "Noto Serif CJK SC", serif', opacity: 0.88,
    });
    ctx.add(sp);
    ctx.animate(board, { bob: { amp: 0.18, speed: 0.4 + i * 0.13, phase: i } });
    ctx.animate(sp, { bob: { amp: 0.18, speed: 0.4 + i * 0.13, phase: i } });
  }
  // 羽毛笔：细锥 + 笔杆（两侧飞过）
  ctx.field((i) => {
    const g = new ctx.THREE.Group();
    const col = i % 2 ? PINK_HOT : BLUE_HOT;
    const feather = K.cone(0.34, 2.6, col, { transparent: true, opacity: 0.6, seg: 5 });
    feather.position.y = 1.2;
    const shaft = K.cylinder(0.03, 0.05, 3.6, 0x2a2638);
    shaft.position.y = -1.2;
    g.add(feather, shaft);
    g.rotation.z = (i % 3) * 0.5 - 0.5;
    return g;
  }, { count: boss ? 8 : 5, zNear: -14, zFar: -78, xRange: 32, xAbsMin: 9, yRange: 14, speedMul: 1.15 });
  // 前景掠过：漂浮镜片（近处贴边，压出纵深）
  ctx.field((i) => {
    const side = i % 2 ? 1 : -1;
    const g = new ctx.THREE.Group();
    const shard = K.box(2.6, 3.4, 0.08, side < 0 ? BLUE_HOT : PINK_HOT, { transparent: true, opacity: 0.32 });
    shard.rotation.z = (K.hash01(i * 29) - 0.5) * 1.1;
    g.add(shard);
    const frame = K.box(2.9, 3.7, 0.04, 0x2a2438, { transparent: true, opacity: 0.5 });
    frame.position.z = -0.1;
    g.add(frame);
    return g;
  }, { count: 3, zNear: -16, zFar: -32, xRange: 14, xAbsMin: 6.6, y: 1, speedMul: 1.05 });
  // 远景剪影：漂浮的小神社 / 鸟居（中心远处也允许：小且暗）
  ctx.field((i) => {
    if (i % 2) {
      const t = K.torii({ scale: 0.6, color: i % 4 ? 0x3a4a66 : 0x5a3a50, dark: INK });
      if (i % 5 === 3) t.rotation.z = Math.PI;
      return t;
    }
    const p = K.pagoda({ scale: 0.6, tiers: 2, body: 0x1a2234, roof: 0x141a28, window: i % 4 ? BLUE : PINK });
    p.rotation.y = K.hash01(i * 31) * 1.2;
    return p;
  }, { count: 6, zNear: -80, zFar: -150, xRange: 56, xAbsMin: 14, yRange: 16, speedMul: 0.3 });
}

/** 双色光束（自两侧向中央斜射） */
function addClashBeams(ctx, boss) {
  for (const side of [-1, 1]) {
    const col = side < 0 ? (boss ? BLUE_HOT : BLUE) : (boss ? PINK_HOT : PINK);
    const beam = beamPanel(ctx, {
      x: side * 11, y: 9, z: boss ? -26 : -30,
      w: boss ? 3 : 2.4, h: boss ? 40 : 34,
      rotZ: side * (boss ? 0.62 : 0.5), color: col, opacity: boss ? 0.1 : 0.055,
    });
    ctx.animate(beam, { pulse: { amp: 0.16, speed: 1.1, phase: side } });
  }
  if (boss) {
    const col = glowCone(ctx, { x: 0, y: 12, z: -46, color: 0xe0d0ff, opacity: 0.05, radius: 5, height: 40 });
    ctx.animate(col, { pulse: { amp: 0.1, speed: 0.8 } });
  }
}

/* ------------------------------------------------------------------ *
 * boss 专属：双涡合并 + 巨大署名封印 + 镜面碎裂
 * ------------------------------------------------------------------ */

/** 双涡合并：中央巨型双色涡环 */
function addMergedVortex(ctx) {
  const { K } = ctx;
  const v = new ctx.THREE.Group();
  v.position.set(0, 6.5, -44);
  for (let i = 0; i < 4; i++) {
    const ring = K.torus(3.4 + i * 2.3, 0.11, i % 2 ? PINK_HOT : BLUE_HOT, {
      radial: 4, tubular: 34, transparent: true, opacity: 0.36 - i * 0.05,
    });
    ring.rotation.x = Math.PI / 2 + (i - 1.5) * 0.22;
    ring.rotation.z = i * 0.5;
    v.add(ring);
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rr = 2.8 + (i % 4) * 2.2;
    const piece = K.box(0.55, 0.75, 0.05, i % 2 ? PINK : BLUE, { transparent: true, opacity: 0.55 });
    piece.position.set(Math.cos(a) * rr, Math.sin(a) * rr * 0.42, Math.sin(a) * 2.2);
    piece.rotation.z = a + 0.4;
    v.add(piece);
  }
  ctx.add(v);
  ctx.animate(v, { spinY: 0.64, spinZ: 0.1 });
  const core = glowCone(ctx, { x: 0, y: 6.5, z: -42, color: 0xe8dcff, opacity: 0.09, radius: 2.4, height: 28, rotX: Math.PI / 2 });
  ctx.animate(core, { pulse: { amp: 0.2, speed: 1.4 } });
}

/** 巨大「署名」封印：自天压下的方形朱印（顶部边缘，让开中心） */
function addGiantSeal(ctx) {
  const { K } = ctx;
  const seal = K.box(15, 15, 1.1, SEAL);
  seal.position.set(0, 22, -60);
  seal.rotation.z = -0.07;
  ctx.add(seal);
  const frame = K.box(16, 16, 0.7, 0xf2e8ec);
  frame.position.set(0, 22, -60.7);
  frame.rotation.z = -0.07;
  ctx.add(frame);
  const text = ctx.textSprite('署名', {
    x: 0, y: 22, z: -59.2, w: 11, h: 4,
    fill: '#f6e8e8', bg: 'rgba(0,0,0,0)',
    font: 'bold 150px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity: 0.95,
  });
  ctx.add(text);
  for (let i = 0; i < 2; i++) {
    const ring = K.ring(9 + i * 2.2, 9.15 + i * 2.2, i ? PINK_HOT : BLUE_HOT, { opacity: 0.2 - i * 0.06 });
    ring.position.set(0, 22, -60);
    ctx.add(ring);
    ctx.animate(ring, { pulse: { amp: 0.04, speed: 0.5 + i * 0.3, phase: i } });
  }
  // 封印四角垂下的红黑光带
  for (const sx of [-1, 1]) {
    const beam = beamPanel(ctx, {
      x: sx * 8, y: 13.5, z: -60, w: 1.3, h: 13,
      color: 0xff8a90, opacity: 0.07,
    });
    ctx.animate(beam, { pulse: { amp: 0.16, speed: 0.8, phase: sx } });
  }
}

/** 镜面碎裂：漂浮镜片 + 水面裂纹 */
function addMirrorShards(ctx) {
  const { K } = ctx;
  const art = ctx.plateTexture();
  for (let i = 0; i < 9; i++) {
    const side = i % 2 ? 1 : -1;
    const z = -22 - (i % 5) * 12;
    const x = side * (7.5 + K.hash01(i * 19) * 9);
    const y = 0.5 + K.hash01(i * 23) * 15;
    const w = 2.4 + K.hash01(i * 37) * 2.2;
    const h = 2.8 + K.hash01(i * 41) * 2.4;
    let shard = null;
    if (art) {
      const tex = ctx.plateCrop(K.hash01(i * 29) * 0.5, K.hash01(i * 31) * 0.5, 0.34, 0.34);
      if (tex) {
        shard = K.panel(tex, { x, y, z, w, h, opacity: 0.42, color: i % 2 ? 0xffd0e0 : 0xb8d8ff });
      }
    }
    if (!shard) {
      shard = K.box(w, h, 0.08, i % 2 ? PINK : BLUE_HOT, { transparent: true, opacity: 0.36 });
      shard.position.set(x, y, z);
    }
    shard.rotation.z = (K.hash01(i * 43) - 0.5) * 1.1;
    ctx.add(shard);
    ctx.animate(shard, {
      spinZ: (i % 2 ? 1 : -1) * (0.15 + K.hash01(i * 47) * 0.25),
      bob: { amp: 0.2, speed: 0.4 + K.hash01(i * 53) * 0.4, phase: i },
    });
  }
  // 水台上方的巨大裂纹
  for (let i = 0; i < 6; i++) {
    const crack = K.box(0.14, 0.05, 7 + K.hash01(i * 7) * 10, 0xc8d8ff, { transparent: true, opacity: 0.26 });
    crack.position.set((K.hash01(i * 11) - 0.5) * 26, -9.7, -30 - i * 9);
    crack.rotation.y = (K.hash01(i * 13) - 0.5) * 1.4;
    ctx.add(crack);
  }
}

/* ------------------------------------------------------------------ *
 * 场景
 * ------------------------------------------------------------------ */

export function mid(ctx) {
  const { palette } = ctx;
  ctx.atmosphere({
    bg: 0x090814,
    fogColor: 0x241a34,
    fogDensity: 0.014,
    ambient: palette.ambient,
    ambientIntensity: 1.05,
    dirColor: 0xd8c8f0,
    dirIntensity: 0.75,
  });
  addBackdrop(ctx, false);
  addMirrorFloor(ctx, false);
  makeIsland(ctx, -1, false);
  makeIsland(ctx, 1, false);
  addTornScroll(ctx, false);
  addVortices(ctx, false);
  addFloatingProps(ctx, false);
  addClashBeams(ctx, false);
  ctx.points({
    count: 50, color: 0x9fc8f0, size: 0.18, type: 'paper',
    xRange: 30, yRange: 22, zNear: -3, zFar: -76, speed: 1.6, seed: 31,
  });
  ctx.points({
    count: 50, color: 0xffb0d0, size: 0.18, type: 'petal',
    xRange: 30, yRange: 22, zNear: -3, zFar: -76, speed: 1.6, seed: 37,
  });
  ctx.setSpeed(10);
  ctx.setSway(0.55, 0.3);
}

export function boss(ctx) {
  const { palette } = ctx;
  ctx.atmosphere({
    bg: 0x0c0a1a,
    fogColor: 0x2c2040,
    fogDensity: 0.015,
    ambient: palette.ambient,
    ambientIntensity: 1.14,
    dirColor: 0xe8d8ff,
    dirIntensity: 0.9,
  });
  addBackdrop(ctx, true);
  addMirrorFloor(ctx, true);
  makeIsland(ctx, -1, true);
  makeIsland(ctx, 1, true);
  addTornScroll(ctx, true);
  addVortices(ctx, true);
  addMergedVortex(ctx);
  addGiantSeal(ctx);
  addMirrorShards(ctx);
  addFloatingProps(ctx, true);
  addClashBeams(ctx, true);
  ctx.points({
    count: 55, color: 0x9fc8f0, size: 0.19, type: 'paper',
    xRange: 32, yRange: 24, zNear: -3, zFar: -80, speed: 2, seed: 32,
  });
  ctx.points({
    count: 55, color: 0xffb0d0, size: 0.19, type: 'petal',
    xRange: 32, yRange: 24, zNear: -3, zFar: -80, speed: 2, seed: 38,
  });
  ctx.points({
    count: 30, color: 0xe8dcff, size: 0.16, type: 'spark',
    xRange: 28, yRange: 20, zNear: -2, zFar: -66, speed: 2.8, seed: 39,
  });
  ctx.setSpeed(13);
  ctx.setSway(0.7, 0.36);
}
