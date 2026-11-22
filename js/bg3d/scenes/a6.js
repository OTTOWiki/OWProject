/**
 * A线第6面「一美个 · 哈机密乐园崩坏」3D 舞台。
 *
 * 方向（2026-11-22 用户修正）：持续深入的 3D 场景 + Billboard 绘卷 + 真 3D 物体 + 超现实。
 * mid：糖粉/薄荷/铁锈的废墟游乐园——破损摩天轮在右侧缓转，旋转木马顶棚在左侧亮灯，
 *      糖果拱门横跨远处，剥落海报 Billboard 飘在两侧；超现实：漂浮气球与巨型糖果招牌。
 * boss：摩天轮倾倒加速、糖衣剥落露出黑铁、气球爆裂、灯光故障、锈屑与糖纸风暴。
 */
const PINK = 0xf2a6c0;
const PINK_HOT = 0xffb8d0;
const MINT = 0x9fe0c8;
const RUST = 0x8a4a3a;
const IRON = 0x2a1a1e;
const CREAM = 0xe8cf9a;
const GOLD = 0xffd890;
const INK = 0x0c0508;

/** 加色光锥 */
function glowCone(ctx, {
  x = 0, y = 0, z = -30, color = PINK_HOT, opacity = 0.08,
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

/** 小灯泡（会呼吸闪烁） */
function bulb(ctx, x, y, z, color = PINK_HOT, r = 0.24, speed = 1.4, phase = 0) {
  const { K } = ctx;
  const b = K.sphere(r, color, { transparent: true, opacity: 0.95 });
  b.position.set(x, y, z);
  ctx.add(b);
  ctx.animate(b, { pulse: { amp: 0.32, speed, phase } });
  return b;
}

/** 远景：巨幅绘卷墙 + 漂浮画幅（Billboard 拼贴）+ 糖霜巨月 */
function addBackdrop(ctx, boss) {
  const { K } = ctx;
  const art = ctx.plateTexture();
  if (art) {
    const back = K.panel(art, {
      x: 0, y: 2, z: -150, w: 260, h: 340, opacity: boss ? 0.6 : 0.52,
      color: boss ? 0xa87884 : 0x9a8090,
    });
    ctx.add(back);
    const crops = boss
      ? [[0.02, 0.05, 0.5, 0.4], [0.48, 0.1, 0.48, 0.44], [0.08, 0.5, 0.5, 0.42], [0.56, 0.54, 0.4, 0.4],
        [0.3, 0.26, 0.34, 0.3], [0.66, 0.28, 0.3, 0.36]]
      : [[0.04, 0.06, 0.44, 0.4], [0.5, 0.1, 0.44, 0.42], [0.1, 0.52, 0.46, 0.4], [0.6, 0.5, 0.36, 0.4]];
    for (let i = 0; i < crops.length; i++) {
      const tex = ctx.plateCrop(...crops[i]);
      if (!tex) continue;
      const side = i % 2 ? 1 : -1;
      const p = K.panel(tex, {
        x: side * (15 + K.hash01(i * 31) * 11),
        y: 6 + K.hash01(i * 37) * 16,
        z: -72 - i * 10,
        w: 22 + K.hash01(i * 41) * 14,
        h: 26 + K.hash01(i * 43) * 16,
        opacity: boss ? 0.3 : 0.22,
        color: i % 2 ? 0xffc8d8 : 0xa8f0d8,
        rotationY: side * (0.18 + K.hash01(i * 47) * 0.2),
      });
      p.rotation.z = (K.hash01(i * 53) - 0.5) * 0.5;
      ctx.add(p);
    }
  }
  // 糖粉夜云
  const cloud = K.matTexture('cloud', '#a87a8a');
  if (cloud) {
    for (let i = 0; i < 2; i++) {
      ctx.add(K.panel(cloud, {
        x: i ? 22 : -22, y: 21 + i * 4, z: -96 - i * 12, w: 150, h: 28,
        opacity: 0.11, color: boss ? 0xffb8d0 : 0xd0a0b0,
      }));
    }
  }
  // 糖霜巨月（左上边缘）
  const moon = K.sphere(boss ? 7.2 : 6.6, boss ? 0xffe0e8 : 0xf4e4d8, { transparent: true, opacity: 0.92 });
  moon.position.set(-16, boss ? 21 : 20.5, -62);
  ctx.add(moon);
  const halo = K.ring(boss ? 8 : 7.4, boss ? 8.5 : 7.8, boss ? PINK_HOT : CREAM, { opacity: 0.26 });
  halo.position.set(-16, boss ? 21 : 20.5, -62);
  ctx.add(halo);
  ctx.animate(halo, { pulse: { amp: 0.05, speed: 0.5 } });
}

/** 地面：暗色地台 + 糖果小径 + 掉落糖块与锈屑 */
function addParkGround(ctx, boss) {
  const { K } = ctx;
  ctx.add(K.ground({
    y: -10, color: 0x0a060a,
    texture: K.matTexture('ink', boss ? '#241016' : '#1a0e14'),
  }));
  // 糖果小径（低透明光带，向远处收）
  for (let i = 0; i < 3; i++) {
    const strip = K.box(14 - i * 3, 0.05, 150, boss ? 0x8a5a6a : 0x6a5060, { transparent: true, opacity: 0.1 - i * 0.02 });
    strip.position.set(0, -9.9 + i * 0.02, -76);
    ctx.add(strip);
  }
  // 散落糖块 / 锈屑
  ctx.field((i) => {
    const weird = i % 3 === 0;
    const m = weird
      ? K.sphere(0.4 + K.hash01(i * 13) * 0.45, boss && i % 2 ? RUST : (i % 2 ? PINK : MINT), { transparent: true, opacity: 0.62 })
      : K.box(0.8, 0.35, 0.55, boss && i % 2 ? 0x5a2a22 : (i % 2 ? PINK : MINT), { transparent: true, opacity: 0.52 });
    m.scale.y = 0.5;
    m.rotation.y = K.hash01(i * 17) * 3;
    return m;
  }, { count: 26, zNear: -10, zFar: -80, xRange: 34, xAbsMin: 6.5, y: -9.7, speedMul: 0.95 });
  // 断裂的糖果地砖（近处地面斜铺和纸色面片）
  const paperTex = K.matTexture('washi', '#c8a8a8');
  for (let i = 0; i < 4; i++) {
    const x = (i % 2 ? 1 : -1) * (4.6 + K.hash01(i * 17) * 2.4);
    const z = -14 - i * 5;
    const slab = K.panel(paperTex, {
      x, y: -9.84, z, w: 5 + K.hash01(i * 19) * 3, h: 6 + K.hash01(i * 21) * 4,
      opacity: boss ? 0.3 : 0.34, color: boss ? 0xb89090 : 0xd8b8c0,
    });
    slab.rotation.x = -Math.PI / 2;
    slab.rotation.z = (K.hash01(i * 23) - 0.5) * 1.4;
    ctx.add(slab);
  }
  // 近处底角的断栏与瓦砾
  for (const side of [-1, 1]) {
    const post = K.box(0.16, 3.4, 0.16, boss ? 0x3a2018 : 0x2a1a1e);
    post.position.set(side * 5.4, -8.2, -15);
    post.rotation.z = side * 0.28;
    ctx.add(post);
    const rail = K.box(3.2, 0.14, 0.14, boss ? 0x4a2a1e : 0x3a2428);
    rail.position.set(side * 4.2, -7.2, -16);
    rail.rotation.z = side * 0.18;
    ctx.add(rail);
  }
}

/** 破损摩天轮：真 3D 轮 + 舱 + 轮缘灯；boss 倾倒加速 */
function addFerrisWheel(ctx, boss) {
  const { K } = ctx;
  const cx = boss ? 14 : 13;
  const cy = boss ? 9.6 : 8.6;
  const cz = boss ? -38 : -44;
  const r = boss ? 7.6 : 7;
  const wheel = K.ferrisWheel({
    x: cx, y: cy, z: cz, r,
    color: boss ? 0x4a2418 : 0x3e281e,
    accent: boss ? PINK_HOT : PINK, cabins: 10,
  });
  wheel.rotation.z = boss ? Math.PI * 0.9 : -0.06;
  ctx.add(wheel);
  ctx.animate(wheel, { spinZ: boss ? 0.36 : 0.09 });
  // 亮色外圈（让轮子从夜色里读出来）
  const rim = K.torus(r, 0.2, boss ? PINK_HOT : 0xd88aa8, { radial: 5, tubular: 40, transparent: true, opacity: 0.55 });
  wheel.add(rim);
  const rimGlow = K.ring(r - 0.35, r + 0.35, boss ? PINK_HOT : 0xe8a8c0, { opacity: boss ? 0.4 : 0.3 });
  wheel.add(rimGlow);
  for (let i = 0; i < 8; i++) {
    const spoke = K.box(0.14, r * 2, 0.14, boss ? 0xd890a8 : 0xc890a8, { transparent: true, opacity: 0.35 });
    spoke.rotation.z = (i / 8) * Math.PI * 2;
    wheel.add(spoke);
  }
  // 轮缘灯
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const lamp = K.sphere(0.22, i % 3 === 0 ? GOLD : (i % 2 ? PINK_HOT : MINT), { transparent: true, opacity: 0.95 });
    lamp.position.set(Math.cos(a) * (r + 0.4), Math.sin(a) * (r + 0.4), 0.4);
    wheel.add(lamp);
    if (!(boss && i % 4 === 0)) {
      ctx.animate(lamp, { pulse: { amp: 0.35, speed: 1.1 + (i % 5) * 0.4, phase: i } });
    }
  }
  // 支架（不随轮转）
  for (const side of [-1, 1]) {
    const leg = K.box(0.42, cy + 10, 0.42, boss ? 0x3e1e14 : 0x32201a);
    leg.position.set(cx + side * (r * 0.52), (cy - 10) / 2, cz);
    leg.rotation.z = side * 0.36;
    ctx.add(leg);
  }
  const hub = K.cylinder(0.9, 0.9, 1.6, 0x1a0c10);
  hub.rotation.x = Math.PI / 2;
  hub.position.set(cx, cy, cz);
  ctx.add(hub);
  // boss：崩落的吊舱（砸在轮下）
  if (boss) {
    const fallen = K.box(2.4, 2, 2.4, PINK, { transparent: true, opacity: 0.82 });
    fallen.position.set(cx + 2.4, -7.4, cz + 6);
    fallen.rotation.z = 0.6;
    ctx.add(fallen);
    const debris = K.box(1, 0.4, 0.8, IRON, { transparent: true, opacity: 0.8 });
    debris.position.set(cx + 3.6, -8.4, cz + 4.4);
    debris.rotation.y = 0.5;
    ctx.add(debris);
  }
}

/** 旋转木马：平台 + 糖果条纹顶棚 + 木马 + 檐灯（慢速旋转；boss 灯光故障/倾斜） */
function addCarousel(ctx, boss) {
  const { K } = ctx;
  const car = new ctx.THREE.Group();
  car.position.set(boss ? -13 : -12.4, 2.2, boss ? -33 : -34);
  if (boss) car.rotation.z = 0.13;
  // 底台
  const base = K.cylinder(6.4, 6.8, 0.9, boss ? 0x3a1e26 : 0x4a2a34, { seg: 18 });
  base.position.y = -3.2;
  car.add(base);
  const floor = K.cylinder(6, 6, 0.2, boss ? 0x6a3038 : PINK, { seg: 18, transparent: true, opacity: 0.72 });
  floor.position.y = -2.65;
  car.add(floor);
  // 中柱
  const pole = K.cylinder(0.24, 0.24, 9.6, CREAM, { seg: 8 });
  pole.position.y = 1.6;
  car.add(pole);
  // 顶棚（糖果条纹锥：粉锥 + 薄荷辐条）
  const canopy = K.cone(6.6, 3.4, boss ? 0x9a4a5a : PINK, { seg: 18 });
  canopy.position.y = 5.6;
  car.add(canopy);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const stripe = K.box(0.3, 0.2, 3.6, MINT, { transparent: true, opacity: 0.6 });
    stripe.position.set(Math.cos(a) * 3.4, 5.0, Math.sin(a) * 3.4);
    stripe.rotation.y = -a;
    stripe.rotation.x = 0.86;
    car.add(stripe);
  }
  // 顶冠
  const crown = K.sphere(0.65, boss ? GOLD : CREAM, { transparent: true, opacity: 0.88 });
  crown.position.y = 7.7;
  car.add(crown);
  // 檐口薄荷环
  const valance = K.torus(6.35, 0.16, MINT, { radial: 4, tubular: 36, transparent: true, opacity: 0.62 });
  valance.rotation.x = Math.PI / 2;
  valance.position.y = 3.95;
  car.add(valance);
  // 木马剪影
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    const rr = 4.7;
    const horse = new ctx.THREE.Group();
    const broken = boss && i === 2;
    const body = K.box(1.7, 1, 0.6, broken ? IRON : (i % 2 ? MINT : PINK_HOT), { transparent: true, opacity: 0.82 });
    body.position.y = 1;
    const head = K.box(0.55, 0.8, 0.5, broken ? IRON : PINK);
    head.position.set(0.95, 1.5, 0);
    const rode = K.cylinder(0.06, 0.06, 5, CREAM, { seg: 6 });
    rode.position.y = 2.4;
    horse.add(body, head, rode);
    horse.position.set(Math.cos(a) * rr, -2.2, Math.sin(a) * rr);
    horse.rotation.y = -a;
    if (broken) { horse.rotation.z = 0.7; horse.position.y = -2.8; }
    car.add(horse);
    ctx.animate(horse, { bob: { amp: 0.09, speed: 1.1 + i * 0.3, phase: i } });
  }
  // 檐下灯泡（boss 故障：部分不亮）
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    if (boss && i % 5 === 0) continue;
    const b = K.sphere(0.21, i % 3 === 0 ? GOLD : (i % 2 ? PINK_HOT : MINT), { transparent: true, opacity: 0.95 });
    b.position.set(Math.cos(a) * 6.42, 3.72, Math.sin(a) * 6.42);
    car.add(b);
    if (boss && i % 3 === 1) continue;
    ctx.animate(b, { pulse: { amp: 0.2 + (i % 4) * 0.08, speed: 1.2 + (i % 6) * 0.35, phase: i } });
  }
  ctx.add(car);
  ctx.animate(car, { spinY: boss ? -0.12 : 0.16, bob: { amp: 0.1, speed: 0.35 } });
}

/** 糖果拱门：远处入口的拐杖糖柱 + 薄荷横梁 + 「哈机密乐园」招牌；boss 糖衣剥落露黑铁 */
function addCandyArch(ctx, boss) {
  const { K } = ctx;
  const gz = -76;
  const legX = 14;
  const legH = 27;
  const topY = -10 + legH; // 17
  // 门后糖霜光环（让远处拱门从雾里读出来）
  const halo = K.ring(16, 17.4, boss ? PINK_HOT : MINT, { opacity: 0.22 });
  halo.position.set(0, topY + 2, gz - 2);
  ctx.add(halo);
  ctx.animate(halo, { pulse: { amp: 0.05, speed: 0.5 } });
  for (const side of [-1, 1]) {
    const broken = boss && side > 0;
    const col = K.cylinder(0.8, 1, legH, broken ? 0x6a3030 : 0xc07a8a, { seg: 10 });
    col.position.set(side * legX, -10 + legH / 2, gz);
    if (broken) col.rotation.z = -0.08;
    ctx.add(col);
    for (let i = 0; i < 7; i++) {
      const ring = K.torus(0.98, 0.16, broken ? 0x5a6a5a : MINT, { radial: 4, tubular: 16 });
      ring.rotation.x = Math.PI / 2;
      ring.position.set(side * legX + (broken ? -0.5 - i * 0.12 : 0), -8.6 + i * 4.2, gz);
      ctx.add(ring);
    }
    if (broken) {
      const peel = K.box(2.2, 4, 0.3, IRON);
      peel.position.set(side * (legX - side * 0.8), 2.4, gz + 0.8);
      ctx.add(peel);
    }
    const ball = K.sphere(1.5, side < 0 ? MINT : PINK_HOT, { transparent: true, opacity: 0.9 });
    ball.position.set(side * legX + (broken ? -1.4 : 0), topY + 0.6, gz);
    ctx.add(ball);
  }
  const beam = K.box(legX * 2 + 2.4, 2.2, 1.6, boss ? 0x7a5a4a : MINT);
  beam.position.set(0, topY + 0.4, gz);
  if (boss) beam.rotation.z = -0.04;
  ctx.add(beam);
  const beam2 = K.box(legX * 2 + 1, 0.6, 1.7, CREAM, { transparent: true, opacity: 0.7 });
  beam2.position.set(0, topY + 1.7, gz);
  ctx.add(beam2);
  const sign = ctx.textSprite('哈机密乐园', {
    x: 0, y: topY + 4.4, z: gz + 1.3, w: 16, h: 3.4,
    fill: '#3a1420', bg: 'rgba(240,226,200,0.9)',
    font: 'bold 88px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity: 1,
  });
  ctx.add(sign);
  if (boss) {
    const crack = K.box(0.8, 3.4, 0.3, IRON);
    crack.position.set(3.2, topY + 3.2, gz + 1.4);
    crack.rotation.z = 0.3;
    ctx.add(crack);
  }
  for (let i = 0; i < 5; i++) {
    const x = -12 + i * 6;
    const ball = K.sphere(0.7, i % 2 ? PINK : MINT, { transparent: true, opacity: 0.85 });
    ball.position.set(x, topY - 0.9, gz + 0.9);
    ctx.add(ball);
    ctx.animate(ball, { bob: { amp: 0.12, speed: 0.7 + i * 0.2, phase: i } });
  }
}

/** 剥落海报：和纸 Billboard + 撕角 + 残字；倾斜悬浮（超现实） */
function addPeelingPosters(ctx, boss) {
  const { K } = ctx;
  const list = boss
    ? [[-11, 12, -26, 6, 8, -0.3, '一美个'], [11.5, 13, -29, 5.4, 7.2, 0.24, '哈机密'],
      [-13.5, 4, -33, 4.8, 6.4, 0.2, '乐园'], [13.8, 5, -23, 4.4, 5.8, -0.26, '崩坏']]
    : [[-11, 11.5, -28, 5.8, 7.6, -0.14, '一美个'], [11.5, 12, -31, 5.2, 7, 0.16, '哈机密']];
  for (let i = 0; i < list.length; i++) {
    const [x, y, z, w, h, rot, text] = list[i];
    const tex = K.matTexture('washi', i % 2 ? '#c8a8b8' : '#b8c8b8');
    const poster = K.panel(tex, {
      x, y, z, w, h, opacity: boss ? 0.7 : 0.64,
      color: boss ? 0xd8a8b0 : 0xe8d0c0,
    });
    poster.rotation.z = rot;
    ctx.add(poster);
    // 撕角（露出暗底）
    const torn = K.box(w * 0.34, h * 0.3, 0.05, IRON, { transparent: true, opacity: 0.88 });
    torn.position.set(x + w * 0.32, y + h * 0.32, z + 0.12);
    torn.rotation.z = rot + 0.6;
    ctx.add(torn);
    // 残字
    const glyph = ctx.textSprite(text, {
      x, y: y + (i % 2 ? 0 : 3), z: z + 0.2, w: w * 0.84, h: h * 0.5,
      fill: i % 2 ? '#5a2430' : '#3a4038', bg: 'rgba(0,0,0,0)',
      font: 'bold 120px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity: 0.62,
    });
    glyph.material.rotation = rot;
    ctx.add(glyph);
    ctx.animate(poster, { bob: { amp: 0.15, speed: 0.4 + i * 0.12, phase: i } });
    ctx.animate(glyph, { bob: { amp: 0.15, speed: 0.4 + i * 0.12, phase: i } });
  }
}

/** 气球束：糖粉/薄荷/金三色气球 + 细绳（超现实漂浮） */
function addBalloons(ctx, boss) {
  const { K } = ctx;
  const clusters = boss
    ? [[-9, 17, -30, 5], [9.5, 18, -26, 4], [-6.5, 20, -42, 3]]
    : [[-9.2, 16, -32, 4], [9.4, 17, -28, 3]];
  for (let ci = 0; ci < clusters.length; ci++) {
    const [cx, cy, cz, n] = clusters[ci];
    const g = new ctx.THREE.Group();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ci;
      const r = 1.15;
      const bx = Math.cos(a) * r;
      const by = Math.sin(a) * 0.8 + i * 0.32;
      const col = [PINK, MINT, GOLD][i % 3];
      const ball = K.sphere(0.85 + K.hash01(i * 7 + ci) * 0.35, boss && i === 0 ? IRON : col, { transparent: true, opacity: 0.86 });
      ball.scale.set(1, 1.2, 1);
      ball.position.set(bx, by, (K.hash01(i * 11 + ci) - 0.5) * 0.8);
      g.add(ball);
      const cord = K.cylinder(0.02, 0.02, 3.2, 0x4a3a3e);
      cord.position.set(bx, by - 2.5, 0);
      g.add(cord);
      if (!(boss && i === 0)) ctx.animate(ball, { bob: { amp: 0.08, speed: 0.6 + i * 0.2, phase: i + ci } });
    }
    g.position.set(cx, cy, cz);
    ctx.add(g);
    ctx.animate(g, { bob: { amp: 0.18, speed: 0.3 + ci * 0.09, phase: ci * 1.5 } });
    if (boss && ci === 1) {
      const burst = K.ring(1.5, 1.68, PINK_HOT, { opacity: 0.42 });
      burst.position.set(cx, cy, cz);
      ctx.add(burst);
      ctx.animate(burst, { pulse: { amp: 0.3, speed: 2.2 } });
    }
  }
}

/** 灯光故障：串灯横跨拱门与两侧，boss 明灭不均 */
function addLightStrings(ctx, boss) {
  const { K } = ctx;
  const spans = boss
    ? [[-12.4, 8, -34, 13, 9, -40], [-9, 5, -49, 9, 5, -49]]
    : [[-12, 8.5, -35, 13, 9, -42], [-9, 4.8, -49, 9, 4.8, -49]];
  for (let s = 0; s < spans.length; s++) {
    const [x0, y0, z0, x1, y1, z1] = spans[s];
    const n = boss ? 13 : 16;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 1.5;
      const z = z0 + (z1 - z0) * t;
      if (boss && i % 4 === 0) continue;
      const col = i % 3 === 0 ? GOLD : (i % 2 ? PINK_HOT : MINT);
      const b = K.sphere(0.18, col, { transparent: true, opacity: 0.9 });
      b.position.set(x, y, z);
      ctx.add(b);
      if (!(boss && i % 5 === 2)) {
        ctx.animate(b, { pulse: { amp: boss ? 0.42 : 0.26, speed: 1.1 + (i % 7) * 0.33, phase: i } });
      }
    }
  }
}

/** 超现实：巨型糖果招牌（糖衣圆盘 + 露出的黑铁缺口） */
function addCandyBillboard(ctx, boss) {
  const { K } = ctx;
  const g = new ctx.THREE.Group();
  const disc = K.cylinder(4.4, 4.4, 0.9, boss ? 0x9a4a5a : PINK, { seg: 18 });
  disc.rotation.x = Math.PI / 2;
  g.add(disc);
  const ring = K.torus(4.4, 0.4, MINT, { radial: 5, tubular: 30 });
  g.add(ring);
  for (let i = 0; i < 3; i++) {
    const swirl = K.torus(1.3 + i * 1.05, 0.1, CREAM, { radial: 4, tubular: 24, transparent: true, opacity: 0.5 });
    swirl.position.z = 0.5;
    g.add(swirl);
  }
  if (boss) {
    for (let i = 0; i < 3; i++) {
      const bite = K.sphere(1.1 + i * 0.3, IRON);
      bite.scale.set(1, 1, 0.3);
      bite.position.set(-1.5 + i * 1.2, 1.1 - i * 0.9, 0.62);
      g.add(bite);
    }
  }
  g.position.set(-13, boss ? 12.4 : 12.8, -31);
  g.rotation.z = 0.18;
  ctx.add(g);
  ctx.animate(g, { spinZ: boss ? 0.08 : 0.05, bob: { amp: 0.2, speed: 0.4 } });
  const tag = ctx.textSprite(boss ? '崩坏' : '哈机密', {
    x: boss ? -13.6 : -14.4, y: boss ? 16.4 : 17, z: -31, w: 4.4, h: 2.2,
    fill: '#3a1420', bg: 'rgba(238,226,200,0.9)',
    font: 'bold 130px "Noto Serif CJK SC", serif', opacity: 0.85,
  });
  tag.material.rotation = -0.14;
  ctx.add(tag);
  ctx.animate(tag, { bob: { amp: 0.15, speed: 0.5 } });
  // 剥落的糖衣碎片（附近悬浮）
  for (let i = 0; i < 4; i++) {
    const shard = K.box(0.6 + i * 0.2, 0.3, 0.06, boss ? 0xd88aa0 : PINK_HOT, { transparent: true, opacity: 0.7 });
    shard.position.set(-13 + (i - 1.5) * 1.4, (boss ? 12.4 : 12.8) - 4.4 - K.hash01(i * 13) * 1.6, -30.6);
    shard.rotation.z = K.hash01(i * 17) * 2;
    ctx.add(shard);
    ctx.animate(shard, { bob: { amp: 0.12, speed: 0.6 + i * 0.2, phase: i } });
  }
}

/** 远景剪影：远处锈蚀的过山车轨道与塔架（中心远处，暗） */
function addFarSilhouette(ctx, boss) {
  const { K } = ctx;
  const color = boss ? 0x2a1218 : 0x201016;
  const coil = K.torus(13, 0.28, color, { radial: 4, tubular: 40 });
  coil.position.set(0, 4, -96);
  coil.rotation.x = 0.4;
  ctx.add(coil);
  const coil2 = K.torus(8, 0.24, color, { radial: 4, tubular: 32 });
  coil2.position.set(-6, 8, -118);
  coil2.rotation.x = 0.6;
  ctx.add(coil2);
  for (let i = 0; i < 5; i++) {
    const x = -26 + i * 13;
    const tower = K.box(0.5, 12 + K.hash01(i * 7) * 8, 0.5, color);
    tower.position.set(x, -4, -104 - (i % 2) * 10);
    ctx.add(tower);
  }
  // 前景掠过：断裂栏杆（近处贴边、压出纵深）
  ctx.field((i) => {
    const side = i % 2 ? 1 : -1;
    const g = new ctx.THREE.Group();
    const post = K.box(0.22, 7, 0.22, boss ? 0x3a2018 : 0x2a1a1e);
    post.position.y = 1;
    const rail = K.box(2.6, 0.16, 0.16, boss ? 0x4a2a1e : 0x3a2428);
    rail.position.set(side * 1.1, 3.4, 0);
    rail.rotation.z = side * 0.22;
    g.add(post, rail);
    return g;
  }, { count: 3, zNear: -16, zFar: -34, xRange: 14, xAbsMin: 6.4, y: -1.5, speedMul: 1.05 });
}

/* ------------------------------------------------------------------ *
 * 场景
 * ------------------------------------------------------------------ */

export function mid(ctx) {
  const { palette } = ctx;
  ctx.atmosphere({
    bg: 0x12080e,
    fogColor: 0x2a141c,
    fogDensity: 0.012,
    ambient: palette.ambient,
    ambientIntensity: 1.08,
    dirColor: 0xf0c8d0,
    dirIntensity: 0.82,
  });
  addBackdrop(ctx, false);
  addParkGround(ctx, false);
  addFarSilhouette(ctx, false);
  addFerrisWheel(ctx, false);
  addCarousel(ctx, false);
  addCandyArch(ctx, false);
  addPeelingPosters(ctx, false);
  addBalloons(ctx, false);
  addLightStrings(ctx, false);
  addCandyBillboard(ctx, false);
  ctx.points({
    count: 55, color: 0xf2a6c0, size: 0.2, type: 'paper',
    xRange: 32, yRange: 24, zNear: -3, zFar: -78, speed: 1.8, seed: 41,
  });
  ctx.points({
    count: 40, color: 0x9fe0c8, size: 0.18, type: 'petal',
    xRange: 32, yRange: 24, zNear: -3, zFar: -78, speed: 1.6, seed: 43,
  });
  ctx.setSpeed(10);
  ctx.setSway(0.5, 0.3);
}

export function boss(ctx) {
  const { palette } = ctx;
  ctx.atmosphere({
    bg: 0x160a10,
    fogColor: 0x341a24,
    fogDensity: 0.013,
    ambient: palette.ambient,
    ambientIntensity: 1.14,
    dirColor: 0xffd0d8,
    dirIntensity: 0.95,
  });
  addBackdrop(ctx, true);
  addParkGround(ctx, true);
  addFarSilhouette(ctx, true);
  addFerrisWheel(ctx, true);
  addCarousel(ctx, true);
  addCandyArch(ctx, true);
  addPeelingPosters(ctx, true);
  addBalloons(ctx, true);
  addLightStrings(ctx, true);
  addCandyBillboard(ctx, true);
  // 崩坏锈光（中央远处，低透明）
  const rustGlow = glowCone(ctx, { x: 0, y: 8, z: -46, color: 0xff8a6a, opacity: 0.05, radius: 6, height: 40 });
  ctx.animate(rustGlow, { pulse: { amp: 0.14, speed: 0.7 } });
  // 灯光故障：边缘一列忽明忽暗的冷白点
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      bulb(ctx, side * (12.6 + i * 0.5), 1 + i * 3.4, -32 - i * 2, i % 2 ? 0xffe0c0 : PINK_HOT, 0.16, 3.4 + i, side * i);
    }
  }
  ctx.points({
    count: 55, color: 0xffb8d0, size: 0.21, type: 'paper',
    xRange: 34, yRange: 26, zNear: -3, zFar: -82, speed: 2.4, seed: 42,
  });
  ctx.points({
    count: 45, color: 0x9fe0c8, size: 0.19, type: 'petal',
    xRange: 34, yRange: 26, zNear: -3, zFar: -82, speed: 2.2, seed: 44,
  });
  ctx.points({
    count: 35, color: 0xffd890, size: 0.18, type: 'spark',
    xRange: 30, yRange: 22, zNear: -2, zFar: -70, speed: 3, seed: 45,
  });
  ctx.setSpeed(13.5);
  ctx.setSway(0.72, 0.38);
}
