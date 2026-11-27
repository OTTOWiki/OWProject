/**
 * B线第6面「拉斯特神炫 · 虾油风油精终局」——超写实 · 超现实 3D 舞台。
 *
 * PBR 宝塔防御塔群 + 巨大物理玻璃宝瓶 + 王座台阶/祭坛 + 毒雾体积光。
 * 超现实：宝瓶碎裂悬浮、塔群倒悬天空、绿色巨眼。
 * boss：宝瓶破碎漏光、毒雾翻涌、塔尖齐亮。
 * 构图：中心是暗绿雾中走廊与祭坛纵深，亮光只在两侧塔窗、瓶光与顶部边缘。
 */
const TAU = Math.PI * 2;

function mixHex(a, b, t) {
  const ar = (a >> 16) & 255; const ag = (a >> 8) & 255; const ab = a & 255;
  const br = (b >> 16) & 255; const bg = (b >> 8) & 255; const bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16)
    | (Math.round(ag + (bg - ag) * t) << 8)
    | Math.round(ab + (bb - ab) * t);
}

function glow(ctx, color, w, h, d, intensity = 2.0) {
  return ctx.K.box(w, h, d, 0x000000, { emissive: color, emissiveIntensity: intensity, kind: 'ceramic', roughness: 0.35 });
}

/** 塔尖灯 */
function towerTip(ctx, x, y, z, boss) {
  const K = ctx.K;
  const tip = K.sphere(0.42, boss ? 0xf0ffb0 : 0xb8e060, {
    emissive: boss ? 0xf0ffb0 : 0xb8e060,
    emissiveIntensity: boss ? 3.0 : 1.4, seg: 12, seg2: 8,
  });
  tip.position.set(x, y, z);
  ctx.add(tip);
  const halo = K.ring(0.5, 1.1, boss ? 0xd0ff80 : 0xa0e030, { opacity: boss ? 0.3 : 0.16 });
  halo.position.copy(tip.position);
  ctx.add(halo);
  ctx.animate(halo, { pulse: { amp: 0.12, speed: 0.8 + 0.1 }, spinZ: 0.06 });
}

/** 地面：毒沼湿地 */
function addSwampFloor(ctx, boss) {
  const K = ctx.K;
  const ground = K.ground({ y: -6.5, w: 200, d: 340, color: 0x141c0a, kind: 'asphalt', roughness: 0.92 });
  ctx.add(ground);
  const water = K.waterFloor({
    y: -6.34, size: [180, 340], color: boss ? 0x0c1404 : 0x0a1204,
    normalScale: boss ? 0.3 : 0.25, roughness: boss ? 0.25 : 0.22, metalness: 0.12, envMapIntensity: 0.45, flow: 0.4,
  });
  ctx.add(water);
  // 毒沼发光脉络（细条，压暗中心亮度）
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1;
    const vein = glow(ctx, i % 3 ? 0x4a7a14 : 0x8ac020, 0.1, 0.02, 16 + K.hash01(i * 7) * 20, 0.8);
    vein.position.set(side * (5.5 + K.hash01(i * 11) * 9), -6.24, -14 - i * 12);
    vein.rotation.y = side * (0.3 + K.hash01(i * 13) * 0.4);
    ctx.add(vein);
  }
}

/** 宝塔防御塔群 + 倒悬塔群 */
function addTowers(ctx, boss) {
  const K = ctx.K;
  // 两侧近景大塔
  for (const side of [-1, 1]) {
    const big = K.pagoda({
      scale: boss ? 2.5 : 2.1, tiers: 4,
      body: 0x2e4418, roof: 0x1a280c,
      window: boss ? 0xd8ff90 : 0x9ad030, glow: true,
    });
    big.position.set(side * (12.2 + K.hash01(side * 7) * 1.6), -6.5, side < 0 ? -24 : -29);
    big.rotation.y = side * 0.16;
    ctx.add(big);
    const topY = -6.5 + (boss ? 2.5 : 2.1) * 2.7 * 4 * 0.98;
    towerTip(ctx, big.position.x, topY, big.position.z, boss);
    // 塔基毒光石阶
    const base = K.box(7, 0.5, 7, 0x1c2a0c, { kind: 'stone', roughness: 0.9 });
    base.position.set(big.position.x, -6.2, big.position.z);
    ctx.add(base);
  }
  // 两侧后退塔群
  for (const side of [-1, 1]) {
    for (let i = 0; i < (boss ? 5 : 4); i++) {
      const s = i * 29 + (side > 0 ? 307 : 0);
      const z = -30 - i * 16;
      const p = K.pagoda({
        scale: 1.2 + K.hash01(s + 3) * 1.0,
        tiers: 2 + (i % 2),
        body: 0x263816, roof: 0x141f08,
        window: boss ? 0xc0ff60 : 0x86c028, glow: i % 2 === 0,
      });
      p.position.set(side * (12 + K.hash01(s + 7) * 6), -6.5, z);
      p.rotation.y = side * 0.1;
      ctx.add(p);
    }
  }
  // 超现实：倒悬塔群挂在雾顶（屋檐朝下）
  const inv = boss ? 5 : 3;
  for (let i = 0; i < inv; i++) {
    const side = i % 2 ? 1 : -1;
    const p = K.pagoda({
      scale: 1.0 + K.hash01(i * 17) * 0.9, tiers: 3, flip: true,
      body: 0x22300f, roof: 0x121c06,
      window: boss ? 0xb8ff60 : 0x86c028, glow: boss,
    });
    p.position.set(side * (11 + K.hash01(i * 19) * 7), boss ? 18.5 : 17.5, -40 - i * 20);
    p.rotation.y = side * 0.2;
    ctx.add(p);
    ctx.animate(p, { bob: { amp: 0.04, speed: 0.3, phase: i } });
  }
}

/** 王座台阶 + 祭坛 + 香炉 */
function addThrone(ctx, boss) {
  const K = ctx.K;
  for (let i = 0; i < 5; i++) {
    const w = 16 - i * 2.2;
    const step = K.box(w, 0.85, 2.4, 0x1c2a10, { kind: 'stone', roughness: 0.9 });
    step.position.set(0, -6.1 + i * 0.85, -28 + i * 2.4);
    ctx.add(step);
    const trim = glow(ctx, boss ? 0x8ac020 : 0x5a8018, w, 0.05, 0.1, boss ? 0.9 : 0.5);
    trim.position.set(0, -5.7 + i * 0.85, -26.9 + i * 2.4);
    ctx.add(trim);
  }
  // 王座（阴影中的高背座）
  const seat = K.box(5.4, 1.2, 3.6, 0x1a260c, { kind: 'wood', roughness: 0.85 });
  seat.position.set(0, -1.8, -40);
  ctx.add(seat);
  const back = K.box(5.6, 6.4, 0.7, 0x1a260c, { kind: 'wood', roughness: 0.85 });
  back.position.set(0, 1.6, -42);
  ctx.add(back);
  for (let i = 0; i < 3; i++) {
    const spike = K.cone(0.34, 1.8, 0x2e4418, { seg: 5, kind: 'ceramic' });
    spike.position.set((i - 1) * 1.4, 5.4, -42);
    ctx.add(spike);
  }
  // 香炉（两侧，绿焰）
  for (const side of [-1, 1]) {
    const burner = K.cylinder(0.42, 0.62, 1.3, 0x2a2412, { kind: 'metal', roughness: 0.6, seg: 10 });
    burner.position.set(side * 5.2, -5.4, -24);
    ctx.add(burner);
    const fire = K.sphere(0.3, 0xc0ff70, { emissive: 0xc0ff70, emissiveIntensity: 2.4, seg: 12, seg2: 8 });
    fire.position.set(side * 5.2, -4.5, -24);
    ctx.add(fire);
    const halo = K.ring(0.36, 0.72, 0xb8ff60, { opacity: 0.28 });
    halo.position.copy(fire.position);
    ctx.add(halo);
    ctx.animate(halo, { pulse: { amp: 0.16, speed: 1.3, phase: side }, spinZ: 0.1 });
  }
}

/** 巨大物理玻璃宝瓶（悬浮、倾斜；boss 碎裂漏光） */
function addBottle(ctx, boss) {
  const K = ctx.K;
  const g = new ctx.THREE.Group();
  const bottle = K.bottle({
    scale: boss ? 3.4 : 3.0,
    color: boss ? 0x4a6428 : 0x3e5622,
    rim: boss ? 0xf0ffc0 : 0xcfe8a0,
    cracked: boss,
  });
  // 物理玻璃：把 lathe 瓶身换成 transmission 材质
  const body = bottle.children[0];
  if (body && body.material) {
    const gmat = K.glass(0x5a7a30, {
      roughness: 0.04, transmission: 0.48, thickness: 0.9, ior: 1.45,
      envMapIntensity: 1.25, clearcoat: 0.9,
      attenuationColor: 0x9ad848, attenuationDistance: 1.6,
      side: ctx.THREE.DoubleSide,
    });
    body.material = gmat;
    body.castShadow = false;
    body.receiveShadow = false;
  }
  // 瓶内毒液（发光核心）
  const liquid = new ctx.THREE.Mesh(
    new ctx.THREE.SphereGeometry(2.0, 24, 18),
    new ctx.THREE.MeshStandardMaterial({
      color: 0x2a3a10, emissive: 0x9aff40, emissiveIntensity: 0.8,
      transparent: true, opacity: 0.5, roughness: 0.3, metalness: 0.1,
    }),
  );
  liquid.position.y = 2.6;
  liquid.scale.y = 1.25;
  g.add(liquid);
  // 瓶身缠光
  for (let i = 0; i < (boss ? 4 : 2); i++) {
    const r = K.ring((boss ? 3.6 : 3.2) + i * 0.5, (boss ? 3.75 : 3.32) + i * 0.5, 0xd0ff80, {
      opacity: boss ? 0.26 - i * 0.04 : 0.15 - i * 0.04,
    });
    r.rotation.x = Math.PI / 2;
    r.position.y = (boss ? 2.2 : 1.8) + i * 2.4;
    g.add(r);
    ctx.animate(r, { spinZ: (i % 2 ? 1 : -1) * 0.2, pulse: { amp: 0.04, speed: 0.6, phase: i } });
  }
  if (boss) {
    // 漏光核心 + 斜射光束
    const leak = K.sphere(2.0, 0xe8ffa0, { emissive: 0xe8ffa0, emissiveIntensity: 2.2, seg: 20, seg2: 14 });
    leak.position.set(0, 6.4, 0);
    g.add(leak);
    const leakHalo = K.ring(2.4, 4.2, 0xd0ff80, { opacity: 0.28 });
    leakHalo.position.copy(leak.position);
    g.add(leakHalo);
    ctx.animate(leakHalo, { pulse: { amp: 0.12, speed: 0.9 }, spinZ: 0.12 });
    for (const side of [-1, 1]) {
      const beam = glow(ctx, 0xd0ff80, 1.0, 14, 0.08, 0.8);
      beam.position.set(side * 4.6, 6, 0.4);
      beam.rotation.z = side * 0.45;
      g.add(beam);
    }
  }
  // 瓶身轮廓光（垂直霓虹边）与背光板，保证毒雾中可读
  for (const side of [-1, 1]) {
    const seam = ctx.K.box(0.1, 8.2, 0.1, 0x000000, {
      emissive: boss ? 0xe8ffa0 : 0xc0e878, emissiveIntensity: boss ? 2.0 : 1.2, kind: 'metal', roughness: 0.4,
    });
    seam.position.set(side * 2.75, 3.6, 0.1);
    g.add(seam);
  }
  const rimLight = ctx.K.ring(2.9, 3.05, 0xd0ff80, { opacity: boss ? 0.4 : 0.26 });
  rimLight.rotation.x = Math.PI / 2;
  rimLight.position.y = 6.9;
  g.add(rimLight);
  const backGlow = ctx.K.panel(null, {
    x: 0, y: 4.2, z: -4.2, w: 10, h: 14, color: 0x2a4a10, opacity: boss ? 0.55 : 0.42,
  });
  g.add(backGlow);
  g.position.set(9.2, 2.2, boss ? -30 : -34);
  g.rotation.z = boss ? 0.26 : 0.12;
  g.rotation.y = -0.3;
  ctx.add(g);
  ctx.animate(g, { bob: { amp: 0.08, speed: 0.25 }, spinY: boss ? 0.12 : 0.07 });
  // 瓶光点光源
  const pl = new ctx.THREE.PointLight(0xaaff50, boss ? 70 : 40, 44, 2);
  pl.position.set(9.2, 6.5, boss ? -30 : -34);
  ctx.add(pl);
  // boss：碎裂悬浮的玻璃碎片
  if (boss) {
    ctx.add(K.shardField({
      x: 9.2, y: 6.5, z: -30, count: 14, spread: 9,
      color: 0xbfe88a, seed: 6,
    }));
  }
}

/** 超现实：天空中的绿色巨眼 */
function addGreenEye(ctx, boss) {
  const K = ctx.K;
  const eye = K.skyEye({
    x: -13, y: boss ? 18 : 16.5, z: boss ? -92 : -102, r: boss ? 6.2 : 5.2,
    color: 0xc8d8a8, iris: boss ? 0x9aff50 : 0x86c028, pupil: 0x060c04,
  });
  ctx.add(eye);
  ctx.animate(eye, { pulse: { amp: 0.03, speed: 0.3 } });
  const halo = K.ring(boss ? 6.8 : 5.6, boss ? 9 : 7.6, 0x9aff50, { opacity: boss ? 0.16 : 0.1 });
  halo.position.set(-13, boss ? 18 : 16.5, boss ? -92.5 : -102.5);
  ctx.add(halo);
  ctx.animate(halo, { pulse: { amp: 0.06, speed: 0.4 }, spinZ: 0.05 });
}

function addParticles(ctx, boss) {
  ctx.points({
    count: boss ? 56 : 46, color: 0xa0e030, size: 0.22, type: 'bubble',
    xRange: 34, yRange: 30, zNear: -3, zFar: -70, speed: boss ? 2.4 : 1.8, seed: 31,
  });
  ctx.points({
    count: boss ? 62 : 50, color: 0xc8ff70, size: 0.15, type: 'spark',
    xRange: 36, yRange: 30, zNear: -4, zFar: -78, speed: boss ? 2.4 : 1.8, seed: 33,
  });
  ctx.points({
    count: boss ? 34 : 22, color: 0x5a8a1c, size: 0.55, type: 'spark',
    xRange: 42, yRange: 32, zNear: -26, zFar: -112, speed: 0.9, seed: 37,
  });
}

function build(ctx, boss) {
  const { palette } = ctx;
  ctx.atmosphere({
    bg: palette.skyBot,
    fogColor: mixHex(palette.fog, palette.ink, 0.5),
    fogDensity: boss ? 0.027 : 0.024,
    ambient: palette.ambient,
    ambientIntensity: 0.5,
    hemiSky: mixHex(palette.accent2, palette.fog, 0.4),
    hemiGround: palette.ink,
    hemiIntensity: 0.65,
    dirColor: boss ? 0xd0ff80 : 0xa0e030,
    dirIntensity: boss ? 2.2 : 1.7,
    shadow: true,
    shadowSize: 1024,
  });
  addSwampFloor(ctx, boss);
  addTowers(ctx, boss);
  addThrone(ctx, boss);
  addBottle(ctx, boss);
  addGreenEye(ctx, boss);
  addParticles(ctx, boss);
  // 毒雾墙（shader 噪声，分层翻涌）
  for (let i = 0; i < 4; i++) {
    ctx.add(ctx.K.mistSheet({
      x: (i % 2 ? 1 : -1) * (4 + i * 3), y: -3 + i * 1.4, z: -22 - i * 17,
      w: 60 + i * 8, h: 18 + i * 3,
      color: mixHex(palette.fog, palette.accent, 0.32 + i * 0.06),
      opacity: boss ? 0.26 - i * 0.02 : 0.2 - i * 0.02,
      seed: i + 3, speed: 0.022 + i * 0.006,
    }));
  }
  // 体积绿光（顶部边缘斜射）
  for (let i = 0; i < (boss ? 4 : 3); i++) {
    const side = i % 2 ? 1 : -1;
    ctx.add(ctx.K.volumetricBeam({
      x: side * (10 + i * 2.4), y: 12, z: -36 - i * 16,
      length: 40, radius: 2.1,
      color: boss ? 0xd0ff80 : 0x9ae030,
      opacity: boss ? 0.055 : 0.035,
      tilt: side * 0.24, spin: 0.2 + i * 0.07,
    }));
  }
  ctx.setSpeed(boss ? 15 : 11);
  ctx.setSway(boss ? 0.75 : 0.55, boss ? 0.4 : 0.3);
}

export function mid(ctx) {
  build(ctx, false);
}

export function boss(ctx) {
  build(ctx, true);
}
