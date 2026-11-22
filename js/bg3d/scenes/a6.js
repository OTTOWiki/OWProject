/**
 * A线第6面「一美个 · 哈机密乐园崩坏」——超写实 · 超现实 3D 舞台。
 *
 * 画面：糖粉与薄荷色浸透的荒废乐园之夜。PBR 锈蚀摩天轮斜倚在湿滑的镜面广场上，
 * 旋转木马还在无休止地转，巨型糖果拱门横跨镜头；剥落的海报露出黑铁，
 * 气球群、糖纸与糖粒在月光里慢慢落下。
 * 超现实：摩天轮倒置且倾斜旋转、融化的糖果拉出长长的糖丝、糖衣剥落处露出锈铁。
 * boss：崩坏加剧——第二座倒悬摩天轮升上夜空，灯光故障明灭，气球在镜面上爆裂成糖玻璃。
 *
 * 构图：中心 60% 只保留湿滑广场的暗反射；车轮、木马、拱门与亮灯全部压在两侧/上缘。
 */
import { addFogBillboards } from './_atmo.js';

const SUGAR = 0xf2a6c0;
const SUGAR_HOT = 0xffc8dc;
const MINT = 0x9fe0c8;
const MINT_HOT = 0xd0ffe8;
const RUST = 0x8a4a3a;
const RUST_DEEP = 0x421f16;
const AMBER = 0xe8cf9a;
const CREAM = 0xf6e8c8;
const INK_DEEP = 0x0c0508;
const FLOOR_Y = -6.2;

function mixHex(a, b, t) {
  const ar = (a >> 16) & 255; const ag = (a >> 8) & 255; const ab = a & 255;
  const br = (b >> 16) & 255; const bg = (b >> 8) & 255; const bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16)
    | (Math.round(ag + (bg - ag) * t) << 8)
    | Math.round(ab + (bb - ab) * t);
}

/* ------------------------------------------------------------------ *
 * 小工具
 * ------------------------------------------------------------------ */

function glowBall(ctx, { x = 0, y = 0, z = -20, r = 0.3, color = SUGAR_HOT, intensity = 2.4, opacity = 1 } = {}) {
  const mat = ctx.K.emissive(color, intensity);
  if (opacity < 1) { mat.transparent = true; mat.opacity = opacity; }
  const m = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(r, 12, 8), mat);
  m.position.set(x, y, z);
  m.userData.baseEmissive = intensity;
  ctx.add(m);
  return m;
}

function floorGlow(ctx, { x = 0, z = -20, color = SUGAR, w = 6, d = 20, opacity = 0.05, y = FLOOR_Y + 0.06 } = {}) {
  const m = new ctx.THREE.Mesh(
    new ctx.THREE.PlaneGeometry(w, d),
    ctx.K.basic(color, {
      transparent: true, opacity, depthWrite: false,
      blending: ctx.THREE.AdditiveBlending, side: ctx.THREE.DoubleSide, fog: true,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  ctx.add(m);
  return m;
}

/** 融化的糖果（超现实：拉长的糖果滴 + 拉丝） */
function meltedCandy(ctx, { x = 0, z = -20, color = SUGAR, scale = 1, slim = false } = {}) {
  const K = ctx.K;
  const g = new ctx.THREE.Group();
  // 糖滴主体（拉长的车削形体）
  const profile = slim
    ? [[0.02, 0], [0.5, 0.4], [0.62, 1.4], [0.4, 2.6], [0.18, 3.6], [0.05, 4.4]]
    : [[0.02, 0], [1.1, 0.3], [1.45, 0.9], [1.16, 2.1], [0.72, 3.2], [0.36, 4.1], [0.1, 4.6]];
  const body = K.lathe(profile, color, {
    kind: 'ceramic', roughness: 0.22, metalness: 0.04, envMapIntensity: 1.35, seg: 22,
  });
  g.add(body);
  // 糖浆摊开的底座
  const puddle = K.cylinder(2.5, 2.9, 0.18, color, {
    kind: 'ceramic', roughness: 0.18, metalness: 0.02, seg: 20, castShadow: false,
  });
  puddle.position.y = 0.09;
  g.add(puddle);
  // 拉丝（细长糖丝，斜挂在边缘）
  const strand = K.cylinder(0.05, 0.02, (slim ? 3.2 : 2.4) * scale, color, {
    kind: 'ceramic', roughness: 0.2, seg: 6, castShadow: false,
  });
  strand.position.set(0.9 * scale, 1.5 * scale, 0.2);
  strand.rotation.z = 0.5;
  g.add(strand);
  g.scale.setScalar(scale);
  g.position.set(x, FLOOR_Y + 0.05, z);
  ctx.add(g);
  return g;
}

/** 气球（高光糖果膜 + 细绳） */
function balloon(ctx, { x = 0, y = 8, z = -30, scale = 1, color = SUGAR } = {}) {
  const K = ctx.K;
  const g = new ctx.THREE.Group();
  const b = K.sphere(0.62 * scale, color, {
    kind: 'ceramic', roughness: 0.12, metalness: 0.02, envMapIntensity: 1.5, seg: 18, seg2: 12, castShadow: false,
  });
  b.scale.set(1, 1.16, 1);
  const knot = K.cone(0.1 * scale, 0.24 * scale, color, { kind: 'ceramic', seg: 6, castShadow: false });
  knot.position.y = -0.78 * scale;
  knot.rotation.x = Math.PI;
  const cord = K.cylinder(0.008, 0.008, 1.8 * scale, 0x3a2a30, { kind: 'fabric', seg: 4, castShadow: false });
  cord.position.y = -1.9 * scale;
  g.add(b, knot, cord);
  g.position.set(x, y, z);
  return g;
}

/** 气球群（漂浮 + 轻摆） */
function balloonCluster(ctx, { x = 0, y = 8, z = -30, count = 6, seed = 1, scale = 1 } = {}) {
  const K = ctx.K;
  const g = new ctx.THREE.Group();
  for (let i = 0; i < count; i++) {
    const color = i % 3 === 0 ? SUGAR : (i % 3 === 1 ? MINT : (i % 3 === 2 ? AMBER : CREAM));
    const b = balloon(ctx, {
      x: (K.hash01(seed + i * 7) - 0.5) * 3.4 * scale,
      y: (K.hash01(seed + i * 11) - 0.2) * 2.6 * scale,
      z: (K.hash01(seed + i * 13) - 0.5) * 1.6 * scale,
      scale: (0.75 + K.hash01(seed + i * 17) * 0.45) * scale,
      color,
    });
    g.add(b);
  }
  g.position.set(x, y, z);
  ctx.add(g);
  ctx.animate(g, { bob: { amp: 0.014, speed: 0.3 + K.hash01(seed * 5) * 0.15, phase: seed } });
  return g;
}

/** 旋转木马（糖果顶棚 + 灯环 + 木马座） */
function carousel(ctx, { x = 14, z = -40, scale = 1, tilt = 0 } = {}) {
  const K = ctx.K;
  const g = new ctx.THREE.Group();
  // 台座
  const base = K.cylinder(4.8 * scale, 5.2 * scale, 0.6 * scale, 0x5a3028, { kind: 'wood', seg: 28 });
  base.position.y = 0.3 * scale;
  g.add(base);
  // 围栏（低矮的糖果边）
  const rail = K.torus(4.7 * scale, 0.12 * scale, SUGAR, { kind: 'ceramic', roughness: 0.25, seg: 8, tubular: 36 });
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 1.1 * scale;
  g.add(rail);
  // 中心柱
  const pole = K.cylinder(0.3 * scale, 0.36 * scale, 6.2 * scale, AMBER, { kind: 'wood', seg: 12 });
  pole.position.y = 3.4 * scale;
  g.add(pole);
  // 糖果顶棚（粉 + 薄荷双层）
  const canopy = K.cone(5.4 * scale, 2.4 * scale, SUGAR, {
    kind: 'fabric', roughness: 0.55, seg: 24, castShadow: true,
  });
  canopy.position.y = 7.0 * scale;
  g.add(canopy);
  const rim = K.torus(5.3 * scale, 0.24 * scale, MINT, { kind: 'ceramic', roughness: 0.3, seg: 8, tubular: 40 });
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 5.9 * scale;
  g.add(rim);
  const tip = K.sphere(0.55 * scale, AMBER, { kind: 'gold', roughness: 0.3, castShadow: false });
  tip.position.y = 8.6 * scale;
  g.add(tip);
  // 支柱
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const p = K.cylinder(0.09 * scale, 0.12 * scale, 4.6 * scale, 0x8a6a4a, { kind: 'wood', seg: 6, castShadow: false });
    p.position.set(Math.cos(a) * 4.1 * scale, 2.9 * scale, Math.sin(a) * 4.1 * scale);
    g.add(p);
    // 木马座（简化几何：鞍座 + 竖杆）
    const saddle = K.box(1.05 * scale, 0.42 * scale, 0.52 * scale, i % 2 ? SUGAR : AMBER, {
      kind: 'ceramic', roughness: 0.3, castShadow: false,
    });
    saddle.position.set(Math.cos(a) * 3.3 * scale, 2.15 * scale, Math.sin(a) * 3.3 * scale);
    saddle.rotation.y = -a;
    const rod = K.cylinder(0.03 * scale, 0.03 * scale, 3.6 * scale, AMBER, { kind: 'metal', seg: 4, castShadow: false });
    rod.position.set(Math.cos(a) * 3.3 * scale, 3.6 * scale, Math.sin(a) * 3.3 * scale);
    g.add(saddle, rod);
  }
  // 灯环（薄荷/糖粉交替；boss 由脉冲 updater 统一切换）
  const bulbs = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = glowBall(ctx, {
      x: 0, y: 0, z: 0, r: 0.13 * scale,
      color: i % 2 ? MINT_HOT : SUGAR_HOT, intensity: 2.2,
    });
    ctx.root.remove(b);
    b.position.set(Math.cos(a) * 5.2 * scale, 5.65 * scale, Math.sin(a) * 5.2 * scale);
    g.add(b);
    bulbs.push(b);
  }
  g.position.set(x, FLOOR_Y, z);
  g.rotation.z = tilt;
  ctx.add(g);
  ctx.animate(g, { spinY: 0.16 });
  return { group: g, bulbs };
}

/** 剥落的海报（锈框 + 绘卷裁片；部分倒置/斜挂 = 崩坏） */
function peelingPoster(ctx, { x = 0, y = 0, z = -30, w = 5, h = 7, crop = null, tilt = 0, upside = false, opacity = 0.75 } = {}) {
  const K = ctx.K;
  const g = new ctx.THREE.Group();
  const board = K.box(w * 1.1, h * 1.08, 0.12, 0x6a3a2c, { kind: 'rust', roughness: 0.8, castShadow: false });
  board.position.z = -0.14;
  g.add(board);
  const tex = crop ? ctx.plateCrop(...crop) : null;
  if (tex) {
    const p = K.artPanel(tex, {
      x: 0, y: 0, z: 0.02, w, h,
      rotationZ: tilt * 0.4, opacity: Math.min(1, opacity + 0.1), tint: 0xffd8e4,
    });
    g.add(p);
  }
  g.position.set(x, y, z);
  g.rotation.z = tilt;
  if (upside) g.rotation.z += Math.PI;
  ctx.add(g);
  return g;
}

/** 摩天轮支架（锈蚀 A 字架） */
function wheelLegs(ctx, { x = -14, y = 9, z = -52, r = 10, side = 1 } = {}) {
  const K = ctx.K;
  for (const s of [-1, 1]) {
    const leg = K.cylinder(0.22, 0.34, 17, 0x4a2a22, { kind: 'rust', seg: 8 });
    leg.position.set(x + s * 3.2, FLOOR_Y + 8.5, z + side * 1.6);
    leg.rotation.z = s * 0.2;
    ctx.add(leg);
  }
  const axle = K.cylinder(0.5, 0.5, 6, 0x2a1a14, { kind: 'rust', seg: 12 });
  axle.rotation.x = Math.PI / 2;
  axle.position.set(x, y, z);
  ctx.add(axle);
}

/** 糖果拱门（巨型半圆 + 糖灯 + 融化糖滴） */
function candyArch(ctx, { z = -34, boss = false } = {}) {
  const K = ctx.K;
  const R = 13.5;
  const cy = FLOOR_Y + 0.25;
  const ring = K.torus(R, 0.34, 0x9a5468, {
    kind: 'ceramic', roughness: 0.24, metalness: 0.05, envMapIntensity: 1.3,
    radial: 12, tubular: 64, castShadow: true,
  });
  ring.position.set(0, cy, z);
  ctx.add(ring);
  const ring2 = K.torus(R - 0.9, 0.14, 0x4e8a74, { kind: 'ceramic', roughness: 0.32, radial: 8, tubular: 56 });
  ring2.position.set(0, cy, z - 0.2);
  ctx.add(ring2);
  const ring3 = K.torus(R + 0.55, 0.1, 0x9a8870, { kind: 'ceramic', roughness: 0.35, radial: 6, tubular: 56 });
  ring3.position.set(0, cy, z + 0.15);
  ctx.add(ring3);
  // 拱沿糖灯（只铺上半弧，避开中心下方）
  const ptsA = [];
  const ptsB = [];
  for (let i = 0; i <= 13; i++) {
    const a = (i / 13) * Math.PI;
    const px = Math.cos(a) * (R - 0.45);
    const py = cy + Math.sin(a) * (R - 0.45);
    (i % 2 ? ptsA : ptsB).push([px, py, z + 0.4]);
  }
  ctx.add(K.lightString(ptsA, { color: 0xffb8d0, size: 0.11 }));
  ctx.add(K.lightString(ptsB, { color: 0xb8f0d8, size: 0.11 }));
  // 融化糖滴自拱顶下垂（超现实：糖在往下流）
  for (let i = 0; i < 4; i++) {
    const a = 1.05 + i * 0.28;
    const px = Math.cos(a) * (R - 0.2);
    const py = cy + Math.sin(a) * (R - 0.2);
    const drip = meltedCandy(ctx, {
      x: px, z: z + 0.5, color: i % 2 ? MINT : SUGAR, scale: 0.34, slim: true,
    });
    drip.position.y = py;
    drip.rotation.x = Math.PI;
  }
  if (boss) {
    ring.rotation.z = 0.05;
    ring2.rotation.z = 0.05;
    ring3.rotation.z = 0.05;
  }
}

/* ------------------------------------------------------------------ *
 * 场景
 * ------------------------------------------------------------------ */

function buildScene(ctx, boss) {
  const { palette, K } = ctx;

  ctx.atmosphere({
    bg: palette.skyBot,
    fogColor: mixHex(palette.fog, palette.ink, 0.62),
    fogDensity: boss ? 0.0155 : 0.0135,
    ambient: palette.ambient,
    ambientIntensity: 0.52,
    hemiSky: mixHex(palette.glow, palette.fog, 0.3),
    hemiGround: palette.ink,
    hemiIntensity: 0.5,
    dirColor: boss ? 0xffd8b0 : palette.glow,
    dirIntensity: boss ? 2.3 : 2.0,
    shadow: true,
    shadowSize: 1024,
  });

  // 湿滑的镜面广场（糖水反光）
  // 夜空压暗帷幕（乐园要"月夜"而不是粉雾）
  const nightVeil = K.panel(null, {
    x: 0, y: 24, z: -122, w: 420, h: 400,
    color: boss ? 0x120710 : 0x0e0509, opacity: boss ? 0.64 : 0.72, fog: false,
  });
  ctx.add(nightVeil);
  const haloBand = K.panel(null, { x: -20, y: 42, z: -120, w: 220, h: 46, color: 0x8a4a5e, opacity: 0.12, fog: false });
  ctx.add(haloBand);
  ctx.updater(() => { if (ctx.scene.environmentIntensity !== 0.68) ctx.scene.environmentIntensity = 0.68; });

  ctx.add(K.waterFloor({
    y: FLOOR_Y,
    size: [380, 420],
    color: boss ? 0x080405 : 0x050303,
    normalScale: boss ? 0.85 : 0.6,
    roughness: boss ? 0.1 : 0.13,
  }));
  floorGlow(ctx, { x: -10, z: -26, color: SUGAR, w: 8, d: 40, opacity: boss ? 0.06 : 0.04 });
  floorGlow(ctx, { x: 11, z: -34, color: AMBER, w: 7, d: 40, opacity: boss ? 0.055 : 0.038 });
  floorGlow(ctx, { x: 0, z: -52, color: MINT, w: 12, d: 40, opacity: 0.022 });

  // 温暖的巨月（左上缘，超现实尺度）
  const moon = K.moon({
    x: -27, y: 24, z: -88, r: 8.6,
    color: 0xffefc8, halo: boss ? 0xffb080 : 0xffcf98, haloOpacity: boss ? 0.4 : 0.32,
  });
  moon.traverse((o) => { if (o.material) o.material.fog = false; });
  ctx.add(moon);

  // 地面散布的糖块/糖纸（贴边，不压中心）
  const candyTiles = [[-9.5, -14, SUGAR], [8.8, -17, MINT], [-12.5, -22, AMBER], [12.6, -26, SUGAR], [-7.8, -30, MINT]];
  for (let i = 0; i < candyTiles.length; i++) {
    const [x, z, color] = candyTiles[i];
    const tile = K.box(1.6 + K.hash01(i * 13) * 1.6, 0.24, 1.2 + K.hash01(i * 17) * 1.2, color, {
      kind: 'ceramic', roughness: 0.25, castShadow: false,
    });
    tile.position.set(x, FLOOR_Y + 0.1, z);
    tile.rotation.y = K.hash01(i * 19) * 3;
    tile.rotation.z = (K.hash01(i * 23) - 0.5) * 0.2;
    ctx.add(tile);
  }

  // 摩天轮（左）/ 支架 / 糖衣剥落
  const wheelX = -12;
  const wheelZ = -60;
  const wheel = K.ferrisWheel({
    x: wheelX, y: 11.5, z: wheelZ, r: 10.2,
    color: 0x6a3a2e, accent: SUGAR, cabins: 10, glow: boss ? 0xffd0e0 : 0xffe0e8,
  });
  wheel.rotation.z = boss ? 0.38 : 0.2;
  ctx.add(wheel);
  ctx.animate(wheel, { spinZ: boss ? 0.1 : 0.055 });
  wheelLegs(ctx, { x: wheelX, y: 11.5, z: wheelZ, r: 10.2, side: 1 });
  // 糖衣（贴在轮缘的糖片）+ 剥落飞散的糖片
  for (let i = 0; i < 5; i++) {
    const a = 0.4 + i * 1.15;
    const plate = K.box(2.6, 1.1, 0.28, i % 2 ? SUGAR : RUST, {
      kind: i % 2 ? 'ceramic' : 'rust', roughness: 0.2, metalness: 0.03, castShadow: false,
    });
    plate.position.set(Math.cos(a) * 10.2, Math.sin(a) * 10.2, 0.5);
    plate.rotation.z = a;
    wheel.add(plate);
  }
  for (let i = 0; i < (boss ? 8 : 3); i++) {
    const shard = K.box(1.6 + (boss ? K.hash01(i * 29) * 1.2 : 0), 0.6, 0.16, i % 3 === 0 ? 0xb06a80 : SUGAR, {
      kind: i % 3 === 0 ? 'rust' : 'ceramic', roughness: 0.22, castShadow: false,
    });
    shard.position.set(
      wheelX + (K.hash01(i * 31) - 0.3) * 16,
      12 + K.hash01(i * 37) * 11,
      wheelZ + 2 + K.hash01(i * 41) * 7,
    );
    shard.rotation.set(K.hash01(i * 43) * 3, K.hash01(i * 47) * 3, K.hash01(i * 53) * 3);
    ctx.add(shard);
    ctx.animate(shard, { spinX: 0.3 + K.hash01(i * 59) * 0.3, bob: { amp: 0.012, speed: 0.4 + i * 0.1, phase: i } });
  }
  // boss：轮缘糖壳大面积剥落，露出黑铁（超现实：糖在掉、铁在露）
  if (boss) {
    for (let i = 0; i < 4; i++) {
      const a = 0.2 + i * 1.5;
      const rustPatch = K.box(3.4, 1.7, 0.3, RUST_DEEP, {
        kind: 'rust', roughness: 0.85, metalness: 0.2, castShadow: false,
      });
      rustPatch.position.set(Math.cos(a) * 10.3, Math.sin(a) * 10.3, 0.62);
      rustPatch.rotation.z = a;
      wheel.add(rustPatch);
    }
  }
  // boss：第二座倒悬摩天轮升上夜空（超现实）
  if (boss) {
    const inv = K.ferrisWheel({
      x: 14.5, y: 26, z: -74, r: 8.2,
      color: 0x5a3028, accent: SUGAR, cabins: 8, glow: 0xffc0d8,
    });
    inv.rotation.z = Math.PI + 0.36;
    ctx.add(inv);
    ctx.animate(inv, { spinZ: -0.085 });
  }

  // 旋转木马（右；boss 倾斜）
  const car = carousel(ctx, { x: 12.6, z: -39, scale: boss ? 1.05 : 1, tilt: boss ? 0.1 : 0 });

  // 糖果拱门（横跨镜头；只留细环与糖灯）
  candyArch(ctx, { z: boss ? -52 : -50, boss });

  // 剥落海报（两侧，倒置/斜挂）
  const posterCrops = [[0.06, 0.08, 0.42, 0.5], [0.52, 0.1, 0.4, 0.5], [0.12, 0.52, 0.44, 0.42], [0.56, 0.54, 0.38, 0.4]];
  const posters = [[-11.2, 4.5, -27, 4.6, 6.6, 0, 0.14], [10.8, 6.5, -30, 4.2, 6, 1, -0.18],
    [-12.8, -1.5, -38, 5, 7, 2, 0.3], [12.6, -2.5, -44, 4.4, 6.4, 3, 2.1],
    [-10.4, 10.5, -46, 4, 5.6, 2, 0.5], [11.8, 11.5, -54, 4.6, 6.4, 1, -0.4]];
  for (let i = 0; i < (boss ? posters.length : 5); i++) {
    const [x, y, z, w, h, ci, tilt] = posters[i];
    peelingPoster(ctx, {
      x, y: FLOOR_Y + y + 6, z, w, h, crop: posterCrops[ci % posterCrops.length],
      tilt, upside: i === 3, opacity: i === 3 ? 0.66 : 0.88,
    });
  }
  // 地面上的倒伏海报（镜面拼贴）
  for (let i = 0; i < 3; i++) {
    const tex = ctx.plateCrop(posterCrops[i].at(0), 0.55, 0.3, 0.24);
    if (!tex) continue;
    const p = K.artPanel(tex, {
      x: (i % 2 ? 1 : -1) * (7.5 + K.hash01(i * 23) * 2),
      y: FLOOR_Y + 0.04, z: -16 - i * 6,
      w: 4.4, h: 5.4, rotationZ: (K.hash01(i * 29) - 0.5) * 1.4,
      opacity: 0.4, tint: 0xd8a0b0,
    });
    p.rotation.x = -Math.PI / 2;
    ctx.add(p);
  }

  // 气球群（漂浮在两侧上缘）
  balloonCluster(ctx, { x: -11.5, y: 11, z: -30, count: 6, seed: 3, scale: boss ? 1.15 : 1 });
  balloonCluster(ctx, { x: 13, y: 8.5, z: -34, count: 5, seed: 7 });
  if (boss) {
    balloonCluster(ctx, { x: 17, y: 16.5, z: -54, count: 7, seed: 11, scale: 1.1 });
    // 气球爆裂的糖玻璃碎片
    const burst = K.shardField({ x: 13, y: 9, z: -33, count: 10, spread: 7, color: SUGAR_HOT, seed: 5 });
    ctx.add(burst);
    ctx.animate(burst, { spinY: 0.2, spinZ: -0.12, bob: { amp: 0.008, speed: 0.5 } });
    const burst2 = K.shardField({ x: 17, y: 16, z: -52, count: 8, spread: 6, color: MINT_HOT, seed: 8 });
    ctx.add(burst2);
    ctx.animate(burst2, { spinY: -0.18, spinZ: 0.1 });
  }

  // 融化糖果（贴边地面；boss 更多、糖丝更长）
  meltedCandy(ctx, { x: -8.6, z: -18, color: SUGAR, scale: boss ? 1.5 : 1.15 });
  meltedCandy(ctx, { x: 9.4, z: -23, color: MINT, scale: boss ? 1.3 : 1 });
  meltedCandy(ctx, { x: -7.6, z: -34, color: AMBER, scale: boss ? 1.1 : 0.85 });
  if (boss) {
    meltedCandy(ctx, { x: 12.4, z: -15, color: SUGAR, scale: 1.2 });
    meltedCandy(ctx, { x: -13.2, z: -28, color: MINT, scale: 1.4 });
  }

  // 灯串（右上与左上，暖色；与糖果粉形成冷暖）
  ctx.add(K.hangingLights({ x: -10, y: 14, z: -26, count: 4, span: 13, sag: 1.4, color: 0xffb15c, lanternScale: 0.34, seed: 2 }));
  ctx.add(K.hangingLights({ x: 10, y: 15.5, z: -32, count: 4, span: 13, sag: 1.5, color: AMBER, lanternScale: 0.3, seed: 6 }));

  // 灯光故障：大灯珠（boss 强烈明灭）
  const fault = [];
  for (let i = 0; i < 6; i++) {
    const b = glowBall(ctx, {
      x: (i % 2 ? 1 : -1) * (7.5 + i * 1.1),
      y: 12.5 + (i % 3) * 1.8,
      z: -22 - i * 3,
      r: 0.2, color: i % 2 ? SUGAR_HOT : MINT_HOT, intensity: 2.4,
    });
    fault.push(b);
  }
  ctx.updater((dt, t) => {
    for (let i = 0; i < fault.length; i++) {
      const b = fault[i];
      const base = b.userData.baseEmissive || 2.4;
      if (!boss) {
        b.material.emissiveIntensity = base * (0.85 + 0.15 * Math.sin(t * 1.6 + i));
      } else {
        const gate = Math.abs(Math.sin(t * (3.1 + i * 0.47) + i * 2.1));
        const drop = gate < 0.24 ? 0.12 : 1;
        b.material.emissiveIntensity = base * drop * (0.6 + 0.6 * gate);
      }
    }
    // 木马灯环故障
    for (let i = 0; i < car.bulbs.length; i++) {
      const b = car.bulbs[i];
      const base = b.userData.baseEmissive || 2.2;
      const s = boss
        ? (Math.sin(t * (4.2 + (i % 5) * 0.6) + i * 1.9) > 0.1 ? 1 : 0.15)
        : 0.9;
      b.material.emissiveIntensity = base * s;
    }
  });

  // 糖粒 / 糖纸 / 光尘
  ctx.points({
    count: boss ? 68 : 56, color: 0xffc8dc, size: 0.15, type: 'spark',
    xRange: 34, yRange: 24, zNear: -3, zFar: -90, speed: boss ? 3.0 : 2.2, seed: boss ? 81 : 21,
  });
  ctx.points({
    count: boss ? 50 : 42, color: CREAM, size: 0.2, type: 'paper',
    xRange: 32, yRange: 26, zNear: -4, zFar: -86, speed: 1.7, seed: boss ? 83 : 23,
  });
  ctx.points({
    count: boss ? 44 : 36, color: 0xc8ffe8, size: 0.17, type: 'snow',
    xRange: 30, yRange: 24, zNear: -4, zFar: -80, speed: 1.5, seed: boss ? 87 : 29,
  });
  // 锈屑（暗红細粒，落向地面）
  ctx.points({
    count: boss ? 30 : 22, color: 0x9a5a44, size: 0.13, type: 'snow',
    xRange: 36, yRange: 20, zNear: -6, zFar: -74, speed: 2.4, seed: boss ? 91 : 31,
  });

  // 雾
  ctx.add(K.mistSheet({
    x: 0, y: 1, z: -70, w: 190, h: 48,
    color: mixHex(palette.fog, palette.ink, 0.56), opacity: boss ? 0.13 : 0.1, seed: 9, speed: 0.02,
  }));
  addFogBillboards(ctx, {
    color: '#9a7080', alpha: boss ? 0.13 : 0.1, count: 5, y: -1.5, zNear: -20, zFar: -128,
    w: 112, h: 26,
  });

  // boss：地面崩裂的锈红裂纹 + 海报风暴（上缘）
  if (boss) {
    const cracks = [
      [[-9, FLOOR_Y + 0.03, -14], [-4, FLOOR_Y + 0.03, -22], [2, FLOOR_Y + 0.03, -18], [9, FLOOR_Y + 0.03, -26]],
      [[-12, FLOOR_Y + 0.03, -32], [-5, FLOOR_Y + 0.03, -38], [3, FLOOR_Y + 0.03, -36], [12, FLOOR_Y + 0.03, -44]],
    ];
    for (let i = 0; i < cracks.length; i++) {
      ctx.add(K.tube(cracks[i], 0.05, 0x8a4a3a, {
        kind: 'metal', emissive: 0xa04a34, emissiveIntensity: 1.0, roughness: 0.5, seg: 26, radial: 5, castShadow: false,
      }));
    }
    const storm = new ctx.THREE.Group();
    storm.position.set(0, 21, -62);
    for (let i = 0; i < 8; i++) {
      const tex = ctx.plateCrop(...posterCrops[i % posterCrops.length]);
      if (!tex) continue;
      const p = K.artPanel(tex, {
        x: Math.cos((i / 8) * Math.PI * 2) * 11, y: Math.sin((i / 8) * Math.PI * 2) * 4.2,
        z: Math.sin((i / 8) * Math.PI * 2) * 2.6, w: 3.2, h: 4.2,
        opacity: 0.5, tint: 0xf0b8c8,
      });
      storm.add(p);
    }
    ctx.add(storm);
    ctx.animate(storm, { spinZ: 0.18 });
  }

  ctx.setSpeed(boss ? 14 : 10.5);
  ctx.setSway(boss ? 0.48 : 0.34, boss ? 0.23 : 0.18);
}

export function mid(ctx) {
  buildScene(ctx, false);
}

export function boss(ctx) {
  buildScene(ctx, true);
}
