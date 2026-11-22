/**
 * A线第5面「主角组间冲突 · 署名权争夺」——超写实 · 超现实 3D 舞台。
 *
 * 画面：左蓝右粉的双生神社浮岛悬在镜面海上方，两座岛以相反方向缓缓旋转；
 * 中央一幅被撕成两半的巨型署名卷轴（左蓝右粉），裂口透出电光；
 * 蓝粉双色体积光自两侧天穹压向中心，镜片悬浮、花瓣与纸屑在涡流里对撞。
 * 超现实：天空中倒悬着镜面世界的第二对神社（上下互为倒影）、巨大的署名封印自天压落。
 * boss：双涡合并、镜面碎裂（镜片与裂纹铺满天空）、蓝粉光柱正面相撞。
 *
 * 构图：中心 60% 留给暗色卷轴与海面；双涡、浮岛、巨月全部压在两侧与上缘。
 */
import { addFogBillboards } from './_atmo.js';

const BLUE = 0x6f9fd8;
const BLUE_HOT = 0xb8d8ff;
const BLUE_DEEP = 0x1e3a66;
const PINK = 0xe89ab8;
const PINK_HOT = 0xffc4dc;
const PINK_DEEP = 0x6a2a44;
const CREAM = 0xf2e8ec;
const PAPER = 0xd8d4c8;
const INK_DEEP = 0x05070c;
const FLOOR_Y = -5.6;

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

function glowBall(ctx, { x = 0, y = 0, z = -20, r = 0.3, color = CREAM, intensity = 2.4, opacity = 1 } = {}) {
  const mat = ctx.K.emissive(color, intensity);
  if (opacity < 1) { mat.transparent = true; mat.opacity = opacity; }
  const m = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(r, 12, 8), mat);
  m.position.set(x, y, z);
  m.userData.baseEmissive = intensity;
  ctx.add(m);
  return m;
}

function floorGlow(ctx, { x = 0, z = -20, color = BLUE, w = 6, d = 20, opacity = 0.05, y = FLOOR_Y + 0.06 } = {}) {
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

/** 斜向体积光（自天穹压向中心；方向由 tilt 决定） */
function aimedBeam(ctx, { x = 0, y = 16, z = -50, tilt = 0, color = BLUE_HOT, opacity = 0.045, length = 36, radius = 2.4 } = {}) {
  const beam = ctx.K.volumetricBeam({ x, y, z, length, radius, color, opacity, tilt, spin: 0 });
  beam.rotation.z = Math.PI + tilt;
  ctx.add(beam);
  return beam;
}

/** 双色涡旋（倾斜的发光环叠成漏斗） */
function vortex(ctx, { x = 0, y = 12, z = -44, color = BLUE_HOT, dir = 1, count = 4, scale = 1 } = {}) {
  const K = ctx.K;
  const g = new ctx.THREE.Group();
  for (let i = 0; i < count; i++) {
    const r = (2.2 + i * 1.3) * scale;
    const ring = K.torus(r, (0.34 - i * 0.055) * scale, color, {
      kind: 'metal', roughness: 0.32, metalness: 0.5,
      emissive: color, emissiveIntensity: i === 0 ? 0.95 : 0.6, castShadow: false,
    });
    ring.rotation.x = 1.12;
    ring.rotation.y = i * 0.5;
    ring.position.y = i * 0.32 * scale;
    g.add(ring);
  }
  const core = glowBall(ctx, { x: 0, y: 0, z: 0, r: 0.75 * scale, color, intensity: 2.2 });
  ctx.root.remove(core); // 从根移入涡旋组，跟随旋转
  g.add(core);
  g.position.set(x, y, z);
  ctx.add(g);
  ctx.animate(g, { spinZ: dir * 0.24, spinY: dir * 0.1 });
  return g;
}

/** 神社浮岛（浮岩基座 + 鸟居 + 小塔 + 岛底辉光） */
function shrineIsland(ctx, { x = 0, y = 5, z = -46, scale = 1, color = BLUE, hot = BLUE_HOT, pink = false } = {}) {
  const K = ctx.K;
  const g = new ctx.THREE.Group();
  // 浮岩基座（上宽下窄，超现实漂浮岛）
  const base = K.cylinder(4.6 * scale, 0.9 * scale, 3.4 * scale, 0x1a1e26, {
    kind: 'granite', seg: 9, roughness: 0.95, flatShading: true,
  });
  base.position.y = -1.7 * scale;
  g.add(base);
  // 岛缘碎岩
  g.add(K.floatingRocks({ y: -2.6 * scale, count: 3, spread: 6 * scale, color: 0x181c22, seed: pink ? 8 : 3 }));
  // 鸟居
  const torii = K.torii({
    y: 0.05 * scale, scale: 0.7 * scale,
    color: pink ? 0x8a4a62 : 0x3a5a8a,
    dark: 0x1a1a22,
  });
  torii.rotation.y = pink ? -0.24 : 0.24;
  g.add(torii);
  // 小塔
  const pagoda = K.pagoda({
    x: -1.7 * scale, y: 0.1 * scale, z: -1.5 * scale,
    scale: 0.42 * scale, tiers: 2,
    body: 0x1d1a20, roof: 0x100e14,
    window: pink ? PINK_HOT : BLUE_HOT, glow: true,
  });
  g.add(pagoda);
  // 台阶
  for (let i = 0; i < 3; i++) {
    const step = K.box((3.2 - i * 0.7) * scale, 0.16 * scale, 0.5 * scale, 0x24242c, {
      kind: 'granite', castShadow: false,
    });
    step.position.set(0, -0.04 * scale - i * 0.16 * scale, (1.2 + i * 0.5) * scale);
    g.add(step);
  }
  // 岛底辉光（悬空感；参与泛光）
  const under = glowBall(ctx, { x: 0, y: 0, z: 0, r: 1.0 * scale, color: hot, intensity: 3.0 });
  ctx.root.remove(under);
  under.position.set(0, -3.5 * scale, 0);
  g.add(under);
  // 岛内暖灯（窗）
  g.position.set(x, y, z);
  ctx.add(g);
  return g;
}

/** 镜面世界：天空里倒悬的神社（超现实倒影） */
function skyMirror(ctx, { boss = false } = {}) {
  const K = ctx.K;
  const specs = [
    { x: -21, y: 31, z: -84, scale: 0.9, pink: false, color: 0x243246 },
    { x: 21, y: 33, z: -94, scale: 1.0, pink: true, color: 0x382433 },
  ];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const t = K.torii({
      x: s.x, y: s.y, z: s.z, scale: 0.72 * s.scale,
      color: s.color, dark: 0x0e1016,
    });
    t.rotation.z = Math.PI;
    t.rotation.y = s.pink ? 0.3 : -0.3;
    t.traverse((o) => { if (o.material) o.material.fog = false; });
    ctx.add(t);
    ctx.animate(t, { bob: { amp: 0.01, speed: 0.22 + i * 0.05, phase: i * 2 } });
    const p = K.pagoda({
      x: s.x + (s.pink ? 2.2 : -2.2), y: s.y + 1.5, z: s.z - 8,
      scale: 0.62 * s.scale, tiers: 2, flip: true,
      body: 0x14161c, roof: 0x0a0c10,
      window: s.pink ? 0xff9ac0 : 0x7fb8f0, glow: false,
    });
    p.traverse((o) => { if (o.material) o.material.fog = false; });
    ctx.add(p);
  }
  // 倒悬浮岩（镜像碎片）
  ctx.add(K.floatingRocks({ x: -19, y: 26, z: -76, count: 3, spread: 7, color: 0x121820, seed: 12 }));
  ctx.add(K.floatingRocks({ x: 19, y: 28, z: -88, count: 3, spread: 7, color: 0x1e141c, seed: 17 }));
  // boss：镜面上空出现第二圈倒影涡旋
  if (boss) {
    const v = vortex(ctx, { x: -21, y: 27, z: -90, color: BLUE, dir: -1, count: 3, scale: 1.1 });
    v.rotation.z = Math.PI;
    const v2 = vortex(ctx, { x: 21, y: 29, z: -96, color: PINK, dir: 1, count: 3, scale: 1.1 });
    v2.rotation.z = Math.PI;
  }
}

/** 被撕成两半的巨型署名卷轴（左蓝右粉；中央低对比） */
function tornScroll(ctx, { boss = false } = {}) {
  const K = ctx.K;
  const y = boss ? 10.2 : 9.8;
  const z = boss ? -56 : -58;
  const halves = [
    { crop: [0.02, 0.05, 0.42, 0.52], x: -4.1, rot: 0.045, tint: 0xe0e8f8, color: BLUE_DEEP },
    { crop: [0.56, 0.07, 0.42, 0.52], x: 4.1, rot: -0.05, tint: 0xffe0ec, color: PINK_DEEP },
  ];
  for (let i = 0; i < halves.length; i++) {
    const h = halves[i];
    const tex = ctx.plateCrop(...h.crop);
    if (!tex) continue;
    const p = K.artPanel(tex, {
      x: h.x, y, z, w: 9.2, h: 13.2,
      rotationY: i ? -0.06 : 0.06, rotationZ: h.rot,
      opacity: 0.94, tint: h.tint,
    });
    p.traverse((o) => {
      if (!o.material) return;
      o.material.fog = false;
      if (o.material.emissive) { o.material.emissive.setHex(0x3a3a52); o.material.emissiveIntensity = 0.5; }
    });
    ctx.add(p);
    ctx.animate(p, { bob: { amp: 0.008, speed: 0.3 + i * 0.1, phase: i * 2 } });
    const glyph = ctx.textSprite(i ? '名' : '署', {
      x: h.x, y: y + 2.6, z: z + 0.7, w: 3.4, h: 3.4,
      fill: i ? '#ffe8f2' : '#e8f2ff', bg: 'rgba(8,10,20,0)',
      font: 'bold 220px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity: 0.72,
    });
    ctx.add(glyph);
    ctx.animate(glyph, { bob: { amp: 0.006, speed: 0.3 + i * 0.1, phase: i * 2 } });
    // 卷轴上下轴（暗木）
    const rod = K.cylinder(0.09, 0.11, 9.2, 0x1a1218, { kind: 'wood', seg: 8, castShadow: false });
    rod.rotation.z = Math.PI / 2;
    rod.position.set(h.x, y + 6.3, z);
    ctx.add(rod);
    const rod2 = rod.clone();
    rod2.position.y = y - 6.3;
    ctx.add(rod2);
  }
  // 裂口电光（细加色条）
  const tearMat = K.basic(CREAM, {
    transparent: true, opacity: boss ? 0.2 : 0.1, depthWrite: false,
    blending: ctx.THREE.AdditiveBlending, side: ctx.THREE.DoubleSide, fog: false,
  });
  const tear = new ctx.THREE.Mesh(new ctx.THREE.PlaneGeometry(0.32, 12.6), tearMat);
  tear.position.set(0, y, z + 0.2);
  ctx.add(tear);
  ctx.updater((dt, t) => { tearMat.opacity = (boss ? 0.2 : 0.1) * (0.6 + 0.4 * Math.abs(Math.sin(t * 1.3))); });
  // 卷轴下的落纸（torn 边缘碎片）
  for (let i = 0; i < 5; i++) {
    const shard = K.sprite(ctx.plateCrop(0.1 + i * 0.12, 0.6, 0.16, 0.2), {
      x: (i % 2 ? 1 : -1) * (1.5 + K.hash01(i * 13) * 3.5),
      y: y - 5 + K.hash01(i * 17) * 2,
      z: z + 1.2,
      w: 1.1 + K.hash01(i * 19) * 1.2,
      h: 1.3 + K.hash01(i * 23) * 1.6,
      opacity: 0.55,
      color: i % 2 ? 0xa8c0e0 : 0xe0b0c8,
    });
    ctx.add(shard);
    ctx.animate(shard, { bob: { amp: 0.012, speed: 0.45 + i * 0.08, phase: i * 1.6 } });
  }
}

/** 巨大的署名封印（从天压落；boss 更近更大） */
function giantSignatureSeal(ctx, { boss = false } = {}) {
  const K = ctx.K;
  const seal = K.giantSeal({
    x: 0, y: boss ? 17 : 21, z: boss ? -68 : -76,
    size: boss ? 10 : 7.6,
    color: 0x5a1a2e, text: '署名', glow: boss ? 0xff8098 : 0xd07a92,
  });
  seal.traverse((o) => { if (o.material) o.material.fog = false; });
  ctx.add(seal);
  const s0 = boss ? 17 : 21;
  const amp = boss ? 5.4 : 3.4;
  const speed = boss ? 0.2 : 0.14;
  ctx.updater((dt, t) => {
    seal.position.y = s0 - Math.abs(Math.sin(t * speed)) * amp;
    seal.rotation.z = Math.sin(t * speed * 0.7) * 0.04;
  });
  return seal;
}

/** 漂浮的镜片/玻璃碎片 */
function shardCloud(ctx, { x = 0, y = 10, z = -34, count = 8, spread = 9, color = BLUE_HOT, dir = 1 } = {}) {
  const K = ctx.K;
  const g = K.shardField({ x, y, z, count, spread, color, seed: dir > 0 ? 4 : 9 });
  ctx.add(g);
  ctx.animate(g, { spinY: dir * 0.12, spinZ: dir * 0.06, bob: { amp: 0.008, speed: 0.3 } });
  return g;
}

/* ------------------------------------------------------------------ *
 * 场景
 * ------------------------------------------------------------------ */

function buildScene(ctx, boss) {
  const { palette, K } = ctx;
  const blueHot = boss ? 0x9fc8ff : BLUE_HOT;
  const pinkHot = boss ? 0xffb0d0 : PINK_HOT;

  ctx.atmosphere({
    bg: palette.skyBot,
    fogColor: mixHex(palette.fog, palette.ink, 0.58),
    fogDensity: boss ? 0.0145 : 0.012,
    ambient: palette.ambient,
    ambientIntensity: 0.55,
    hemiSky: mixHex(palette.glow, palette.fog, 0.3),
    hemiGround: palette.ink,
    hemiIntensity: 0.55,
    dirColor: boss ? 0xe8d8ff : palette.glow,
    dirIntensity: boss ? 2.3 : 2.0,
    shadow: true,
    shadowSize: 1024,
  });

  // 镜面海（左右调色靠加色光斑与倒影光柱）
  ctx.add(K.waterFloor({ y: FLOOR_Y, size: [380, 420], color: boss ? 0x04060c : 0x03040a, normalScale: boss ? 1.3 : 1.0, roughness: 0.07 }));
  const veil = K.panel(null, { x: 0, y: FLOOR_Y + 0.05, z: -60, w: 380, h: 420, color: 0x04050c, opacity: 0.32, fog: false });
  veil.rotation.x = -Math.PI / 2;
  ctx.add(veil);
  ctx.updater(() => { if (ctx.scene.environmentIntensity !== 0.74) ctx.scene.environmentIntensity = 0.74; });
  floorGlow(ctx, { x: -9, z: -30, color: blueHot, w: 9, d: 46, opacity: boss ? 0.07 : 0.05 });
  floorGlow(ctx, { x: 9, z: -30, color: pinkHot, w: 9, d: 46, opacity: boss ? 0.07 : 0.05 });
  floorGlow(ctx, { x: 0, z: -64, color: 0xd8d0f0, w: 10, d: 50, opacity: 0.025 });

  // 双色巨月（左右上缘，超现实尺度）
  const moonL = K.moon({
    x: -27, y: 22, z: -88, r: 7.4,
    color: 0xd8e8ff, halo: blueHot, haloOpacity: boss ? 0.44 : 0.36,
  });
  moonL.traverse((o) => { if (o.material) o.material.fog = false; });
  ctx.add(moonL);
  const moonR = K.moon({
    x: 27, y: 23.5, z: -90, r: 7.4,
    color: 0xffd8e8, halo: pinkHot, haloOpacity: boss ? 0.44 : 0.36,
  });
  moonR.traverse((o) => { if (o.material) o.material.fog = false; });
  ctx.add(moonR);

  // 天空倒影世界（镜面世界：上下互为倒影）
  skyMirror(ctx, { boss });

  // 双生神社浮岛（左右镜像；反向缓慢旋转）
  const islandL = shrineIsland(ctx, { x: -12.6, y: 4.8, z: -43, scale: 1.2, color: BLUE, hot: blueHot, pink: false });
  const islandR = shrineIsland(ctx, { x: 12.6, y: 5.2, z: -43, scale: 1.2, color: PINK, hot: pinkHot, pink: true });
  islandL.rotation.y = 0.34;
  islandR.rotation.y = -0.34;
  // 浮岛悬链（自天而降，被镜面世界牵住）
  for (const side of [-1, 1]) {
    const chain = K.cylinder(0.05, 0.05, 18, 0x2a2c36, { kind: 'metal', seg: 6, castShadow: false });
    chain.position.set(side * 12.6, 19.5, -43);
    chain.rotation.z = side * 0.05;
    ctx.add(chain);
  }
  const drift = boss ? 1.6 : 0.9;
  ctx.updater((dt, t) => {
    islandL.position.y = 4.8 + Math.sin(t * 0.28) * drift * 0.4;
    islandR.position.y = 5.2 + Math.sin(t * 0.28 + 2.2) * drift * 0.4;
    islandL.rotation.y = 0.34 + Math.sin(t * 0.13) * 0.3;
    islandR.rotation.y = -0.34 - Math.sin(t * 0.13 + 1.2) * 0.3;
  });
  // 岛底光斑映在海面
  floorGlow(ctx, { x: -12.4, z: -41, color: blueHot, w: 8, d: 18, opacity: 0.11 });
  floorGlow(ctx, { x: 12.4, z: -41, color: pinkHot, w: 8, d: 18, opacity: 0.11 });

  // 中央：撕开的署名卷轴 + 落下的署名封印
  tornScroll(ctx, { boss });
  giantSignatureSeal(ctx, { boss });

  // 双色涡旋（对撞的两股）
  vortex(ctx, { x: -11.5, y: 12.5, z: -44, color: blueHot, dir: 1, count: boss ? 5 : 4, scale: boss ? 1.25 : 1 });
  vortex(ctx, { x: 11.5, y: 12.5, z: -44, color: pinkHot, dir: -1, count: boss ? 5 : 4, scale: boss ? 1.25 : 1 });
  // boss：双涡合并的第三涡（中心上缘，低亮度避免压中心）
  if (boss) {
    vortex(ctx, { x: 0, y: 20.5, z: -70, color: 0xe0d0f0, dir: 1, count: 3, scale: 1.55 });
  }

  // 双色体积光：自两侧天穹压向中心
  aimedBeam(ctx, { x: -14, y: 27, z: -70, tilt: 0.5, color: blueHot, opacity: boss ? 0.04 : 0.028, length: 42, radius: 3.0 });
  aimedBeam(ctx, { x: 14, y: 27, z: -70, tilt: -0.5, color: pinkHot, opacity: boss ? 0.04 : 0.028, length: 42, radius: 3.0 });
  if (boss) {
    aimedBeam(ctx, { x: -20, y: 30, z: -96, tilt: 0.35, color: BLUE, opacity: 0.032, length: 48, radius: 3.2 });
    aimedBeam(ctx, { x: 20, y: 30, z: -96, tilt: -0.35, color: PINK, opacity: 0.032, length: 48, radius: 3.2 });
    // 正面对撞的光柱（水平）
    const clash = K.torus(2.2, 0.12, 0xf0e8ff, {
      kind: 'metal', emissive: 0xf0e8ff, emissiveIntensity: 2.2, roughness: 0.2,
    });
    clash.position.set(0, 14.5, -58);
    clash.rotation.x = 0.4;
    ctx.add(clash);
    ctx.animate(clash, { spinZ: 0.5, spinY: 0.2 });
  }

  // 悬浮镜片（左蓝右粉）
  shardCloud(ctx, { x: -12, y: 9, z: -33, count: boss ? 10 : 7, spread: 8, color: blueHot, dir: 1 });
  shardCloud(ctx, { x: 12, y: 10, z: -38, count: boss ? 10 : 7, spread: 8, color: pinkHot, dir: -1 });
  if (boss) shardCloud(ctx, { x: 0, y: 16, z: -62, count: 14, spread: 18, color: 0xd8e8ff, dir: 1 });

  // 镜面裂纹（boss：天空碎裂的发光裂缝）
  if (boss) {
    const cracks = [
      [[-26, 20, -80], [-12, 26, -74], [-2, 22, -70], [8, 29, -72], [22, 24, -78]],
      [[-24, 34, -96], [-10, 28, -88], [2, 33, -86], [14, 27, -90], [26, 32, -94]],
    ];
    for (let i = 0; i < cracks.length; i++) {
      const tube = K.tube(cracks[i], 0.09, i ? 0xffc0d8 : 0xb8d8ff, {
        kind: 'metal', emissive: i ? 0xff9ac0 : 0x7fb8f0, emissiveIntensity: 2.0,
        roughness: 0.3, seg: 30, radial: 5, castShadow: false,
      });
      ctx.add(tube);
    }
  }

  // 漂浮的署名文字 / 版权碎语（两侧，不压中心）
  const words = boss
    ? [['署名权', -10.5, 15.5, -30, '#ffd0e0'], ['©', 11.6, 18, -36, '#cfe0ff'], ['作者', -13, 7, -26, '#d8e8ff'],
      ['credit', 12.4, 9.5, -30, '#ffd8e8'], ['原著', 10.2, 24, -44, '#e8e0ff']]
    : [['署名', -10.2, 14.5, -34, '#d8e8ff'], ['©', 11, 17, -40, '#ffd8e8'], ['作者', 12, 8, -30, '#e0d8f0']];
  for (let i = 0; i < words.length; i++) {
    const [text, x, y, z, fill] = words[i];
    const sp = ctx.textSprite(text, {
      x, y, z, w: text.length > 2 ? 4.4 : 2.6, h: text.length > 2 ? 2.2 : 1.6,
      fill, bg: 'rgba(6,8,16,0)', font: 'bold 74px "Noto Serif CJK SC", "Microsoft YaHei", serif',
      opacity: 0.55,
    });
    ctx.add(sp);
    ctx.animate(sp, { bob: { amp: 0.012, speed: 0.32 + i * 0.07, phase: i } });
  }

  // 悬浮绘卷残片（两侧纵深；镜像世界碎片）
  const crops = [[0.04, 0.08, 0.4, 0.46], [0.52, 0.1, 0.42, 0.5], [0.1, 0.52, 0.44, 0.42], [0.58, 0.54, 0.38, 0.4]];
  for (let i = 0; i < (boss ? 5 : 4); i++) {
    const tex = ctx.plateCrop(...crops[i % crops.length]);
    if (!tex) continue;
    const side = i % 2 ? 1 : -1;
    const p = K.artPanel(tex, {
      x: side * (8.5 + K.hash01(i * 31) * 7), y: 4 + K.hash01(i * 37) * 10,
      z: -24 - i * 13, w: 5.5 + K.hash01(i * 41) * 4, h: 7 + K.hash01(i * 43) * 5,
      rotationY: side * (0.3 + K.hash01(i * 47) * 0.3),
      rotationZ: (K.hash01(i * 53) - 0.5) * (boss && i === 2 ? 2.6 : 0.3),
      opacity: 0.42, tint: side < 0 ? 0x8aa0c8 : 0xc890a8,
    });
    ctx.add(p);
    ctx.animate(p, { bob: { amp: 0.01, speed: 0.24 + K.hash01(i * 59) * 0.2, phase: i } });
  }

  // 花瓣 / 纸屑 / 蓝粉光尘（双向涡旋感）
  ctx.points({
    count: boss ? 70 : 58, color: 0xffc4dc, size: 0.16, type: 'petal',
    xRange: 34, yRange: 26, zNear: -4, zFar: -96, speed: boss ? 2.2 : 1.6, seed: boss ? 71 : 11,
  });
  ctx.points({
    count: boss ? 50 : 44, color: CREAM, size: 0.19, type: 'paper',
    xRange: 32, yRange: 26, zNear: -4, zFar: -88, speed: 1.7, seed: boss ? 73 : 13,
  });
  ctx.points({
    count: boss ? 50 : 42, color: 0xb8d8ff, size: 0.15, type: 'spark',
    xRange: 30, yRange: 22, zNear: -3, zFar: -80, speed: 2.6, seed: boss ? 79 : 17,
  });

  // 雾：左右双色雾带 + 远处冷雾墙
  ctx.add(K.mistSheet({
    x: 0, y: 1.5, z: -74, w: 190, h: 50,
    color: mixHex(palette.fog, palette.ink, 0.52), opacity: boss ? 0.13 : 0.1, seed: 7, speed: 0.016,
  }));
  addFogBillboards(ctx, {
    color: '#8a84a8', alpha: boss ? 0.13 : 0.1, count: 5, y: -1.5, zNear: -22, zFar: -130,
    w: 115, h: 26,
  });

  ctx.setSpeed(boss ? 13.5 : 10);
  ctx.setSway(boss ? 0.46 : 0.34, boss ? 0.22 : 0.17);
}

export function mid(ctx) {
  buildScene(ctx, false);
}

export function boss(ctx) {
  buildScene(ctx, true);
}
