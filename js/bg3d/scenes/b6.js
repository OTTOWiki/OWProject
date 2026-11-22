/**
 * B线第6面「拉斯特神炫 · 虾油风油精终局」3D 舞台。
 *
 * 方向（docs §8）：持续深入的 3D 场景 + Billboard 绘卷 + 真 3D + 超现实。
 * 剧情锚点：虾油色的雾气升起，宝瓶碎裂无声；防御塔的黑影自雾中浮现。
 * mid：毒绿迷雾中宝塔防御塔阵列后退，巨大宝瓶悬在王座台阶上方，孢子/气泡上浮。
 * boss：宝瓶开裂漏光、塔群倒悬（超现实）、毒雾翻涌、塔尖齐亮。
 * 构图：中心是暗绿走廊与王座纵深，亮部只在两侧塔窗、瓶身漏光与顶部雾光。
 */
import { addFogBillboards, addFloorArt, addEdgeFlora } from './_atmo.js';

const TAU = Math.PI * 2;

function charSprite(ctx, text, { x = 0, y = 0, z = -20, h = 2.6, fill = '#cfe8a0', opacity = 0.9 } = {}) {
  return ctx.textSprite(text, {
    x, y, z, w: h * 2, h, fill, bg: 'rgba(0,0,0,0)',
    font: 'bold 170px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity,
  });
}

function glowBox(ctx, color, w, h, d, opacity) {
  return ctx.K.box(w, h, d, color, {
    transparent: true, opacity, blending: ctx.THREE.AdditiveBlending, depthWrite: false,
  });
}

/* ------------------------------------------------------------------ *
 * 背景：毒雾天空
 * ------------------------------------------------------------------ */

function addMiasmaSky(ctx, boss) {
  const K = ctx.K;
  const art = ctx.plateTexture();
  if (!art) return;
  const full = ctx.plateCrop(0, 0, 1, 1);
  if (full) {
    ctx.add(K.panel(full, {
      x: 0, y: 6, z: -150, w: 220, h: 280,
      color: boss ? 0x9ac04a : 0x7a9a3a, opacity: boss ? 0.72 : 0.6,
    }));
  }
  const crops = [[0.02, 0.06, 0.5, 0.5], [0.48, 0.08, 0.5, 0.52], [0.1, 0.5, 0.5, 0.46]];
  for (let i = 0; i < crops.length; i++) {
    const tex = ctx.plateCrop(...crops[i]);
    if (!tex) continue;
    const side = i % 2 ? 1 : -1;
    ctx.add(K.panel(tex, {
      x: side * (24 + i * 7), y: 13 + i * 3, z: -98 - i * 18,
      w: 34 + i * 4, h: 44 + i * 5, color: 0x9ac05a, opacity: 0.32, rotationY: side * -0.6,
    }));
  }
  // 毒月（雾中的淡绿光球）
  const moon = K.sphere(boss ? 9 : 7.4, boss ? 0xd0f080 : 0xb0d060, { emissiveMix: 0.85 });
  moon.position.set(-20, 26, -138);
  ctx.add(moon);
  const halo = K.ring(boss ? 10.2 : 8.4, boss ? 11.4 : 9.4, 0xa0e030, { opacity: 0.24 });
  halo.position.copy(moon.position);
  ctx.add(halo);
  ctx.animate(halo, { pulse: { amp: 0.05, speed: 0.5 }, spinZ: 0.03 });
}

/* ------------------------------------------------------------------ *
 * 空间：宝塔防御塔 / 王座台阶 / 祭坛
 * ------------------------------------------------------------------ */

function addTowers(ctx, boss) {
  const K = ctx.K;
  // 两侧层叠宝塔阵列（真 3D 层叠屋檐）
  ctx.field((i) => {
    const tiers = 3 + (i % 2);
    const p = K.pagoda({
      scale: 1.4 + K.hash01(i * 17) * 1.3, tiers,
      body: 0x33481e, roof: 0x22320f,
      window: boss ? 0xd0ff80 : 0xa0e030,
    });
    p.position.y = -10;
    ctx.animate(p, { bob: { amp: 0.05, speed: 0.3, phase: i } });
    return p;
  }, {
    count: boss ? 9 : 7, zNear: -26, zFar: -122, xRange: 56, yRange: 0,
    y: -10, xAbsMin: 11, speedMul: 0.55, jitter: 0.15,
  });
  // 超现实：倒悬的宝塔群（悬在雾顶，屋檐朝下）
  ctx.field((i) => {
    const p = K.pagoda({
      scale: 1.1 + K.hash01(i * 31) * 0.9, tiers: 3,
      body: 0x2a3c16, roof: 0x1a280c, window: 0x9ad830,
    });
    p.rotation.z = Math.PI;
    return p;
  }, {
    count: boss ? 5 : 3, zNear: -38, zFar: -120, xRange: 52, yRange: 0,
    y: boss ? 20 : 19, xAbsMin: 12, speedMul: 0.4, jitter: 0.2,
  });
  // 近景大型守塔（左右地标）
  for (const side of [-1, 1]) {
    const big = K.pagoda({
      scale: boss ? 2.4 : 2.0, tiers: 4,
      body: 0x33481e, roof: 0x22320f, window: boss ? 0xe8ffa0 : 0xb8e060,
    });
    big.position.set(side * (11.5 + K.hash01(side * 7) * 2), -10, side < 0 ? -24 : -30);
    big.rotation.y = side * 0.15;
    ctx.add(big);
    // 塔尖灯
    const tipY = -10 + 4 * 2.6 * (boss ? 2.4 : 2.0) * 0.5 + 3;
    const tip = K.sphere(0.5, boss ? 0xe8ffa0 : 0xa0e030, { emissiveMix: 1.25 });
    tip.position.set(big.position.x, tipY, big.position.z);
    ctx.add(tip);
    const tipHalo = K.ring(0.6, 1.3, 0xc0ff70, { opacity: boss ? 0.3 : 0.18 });
    tipHalo.position.copy(tip.position);
    ctx.add(tipHalo);
    ctx.animate(tipHalo, { pulse: { amp: 0.12, speed: 0.8, phase: side } });
  }
}

function addThrone(ctx, boss) {
  const K = ctx.K;
  // 王座台阶（向深处的上升台阶，边缘绿光）
  for (let i = 0; i < 5; i++) {
    const w = 18 - i * 2.6;
    const step = K.box(w, 0.9, 2.2, 0x2a3a18, { emissiveMix: 0.5 });
    step.position.set(0, -10 + i * 0.9, -34 + i * 2.2);
    ctx.add(step);
    const trim = glowBox(ctx, 0xa0e030, w, 0.07, 0.1, boss ? 0.4 : 0.24);
    trim.position.set(0, -9.6 + i * 0.9, -33 + i * 2.2);
    ctx.add(trim);
  }
  // 王座（阴影中的高背座，绿色轮廓）
  const seat = K.box(6, 1.4, 4, 0x26340f, { emissiveMix: 0.5 });
  seat.position.set(0, -5.4, -44);
  ctx.add(seat);
  const back = K.box(6.4, 8, 0.8, 0x26340f, { emissiveMix: 0.5 });
  back.position.set(0, -1.2, -46);
  ctx.add(back);
  for (let i = 0; i < 3; i++) {
    const spike = K.cone(0.4, 2.4, 0x4a5a22, { seg: 4, emissiveMix: 0.7 });
    spike.position.set((i - 1) * 1.6, 3.8, -46);
    ctx.add(spike);
  }
  // 祭坛香炉（左右，绿烟光点）
  for (const side of [-1, 1]) {
    const burner = K.cylinder(0.5, 0.7, 1.4, 0x2a2410, { seg: 8, emissiveMix: 0.4 });
    burner.position.set(side * 4.2, -9.2, -27);
    ctx.add(burner);
    const fire = K.sphere(0.34, side < 0 ? 0xc0ff70 : 0xa0e030, { emissiveMix: 1.3 });
    fire.position.set(side * 4.2, -8.1, -27);
    ctx.add(fire);
    const halo = K.ring(0.4, 0.8, 0xc0ff70, { opacity: 0.26 });
    halo.position.copy(fire.position);
    ctx.add(halo);
    ctx.animate(halo, { pulse: { amp: 0.16, speed: 1.2, phase: side } });
  }
}

function addBottle(ctx, boss) {
  const K = ctx.K;
  const g = new ctx.THREE.Group();
  const bottle = K.bottle({
    scale: boss ? 3.0 : 2.5,
    color: boss ? 0x3a3418 : 0x2a2a16,
    rim: boss ? 0xf0ffc0 : 0xcfe8a0,
  });
  bottle.position.y = 0;
  g.add(bottle);
  // 瓶身纹光（几圈发光环，boss 更亮）
  const rings = boss ? 4 : 2;
  for (let i = 0; i < rings; i++) {
    const r = K.ring(
      (boss ? 3.4 : 2.8) + i * 0.5, (boss ? 3.55 : 2.92) + i * 0.5,
      0xd0ff80, { opacity: boss ? 0.3 - i * 0.05 : 0.18 - i * 0.05 },
    );
    r.rotation.x = Math.PI / 2;
    r.position.y = (boss ? 2.2 : 1.8) + i * (boss ? 2.4 : 2.2);
    g.add(r);
    ctx.animate(r, { spinZ: (i % 2 ? 1 : -1) * 0.2, pulse: { amp: 0.04, speed: 0.6, phase: i } });
  }
  // boss：瓶身裂纹与碎片 + 漏光
  if (boss) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      const shard = K.cone(0.34, 1.8 + K.hash01(i * 7) * 2.2, 0x2a2410, { seg: 3, emissiveMix: 0.5 });
      shard.position.set(Math.cos(a) * (4.2 + K.hash01(i * 11) * 1.6), 4.5 + K.hash01(i * 13) * 5, Math.sin(a) * 1.6);
      shard.rotation.set(K.hash01(i * 17) * 0.9, a, K.hash01(i * 19) * 0.9);
      g.add(shard);
    }
    const leak = K.sphere(2.2, 0xe8ffa0, { emissiveMix: 1.4 });
    leak.position.set(0, 6.2, 0);
    g.add(leak);
    const leakHalo = K.ring(2.6, 4.6, 0xd0ff80, { opacity: 0.3 });
    leakHalo.position.set(0, 6.2, 0);
    g.add(leakHalo);
    ctx.animate(leakHalo, { pulse: { amp: 0.1, speed: 0.9 }, spinZ: 0.12 });
    // 漏光光束（两侧斜射）
    for (const side of [-1, 1]) {
      const beam = glowBox(ctx, 0xd0ff80, 1.2, 16, 0.1, 0.12);
      beam.position.set(side * 5.2, 6, 0.6);
      beam.rotation.z = side * 0.5;
      g.add(beam);
    }
  }
  g.position.set(boss ? 4.6 : 5.2, boss ? -1.5 : -2.5, boss ? -28 : -32);
  if (boss) g.rotation.z = 0.16;
  ctx.add(g);
  ctx.animate(g, { bob: { amp: 0.14, speed: 0.3 }, pulse: boss ? { amp: 0.01, speed: 0.5 } : undefined });
}

/* ------------------------------------------------------------------ *
 * 空气：孢子 / 气泡 / 毒雾
 * ------------------------------------------------------------------ */

function addParticles(ctx, boss) {
  const K = ctx.K;
  ctx.points({
    count: boss ? 52 : 42, color: 0xa0e030, size: 0.24, type: 'bubble',
    xRange: 34, yRange: 28, zNear: -3, zFar: -68, speed: boss ? 2.4 : 1.8, seed: 31,
  });
  ctx.points({
    count: boss ? 78 : 62, color: 0xc0ff70, size: 0.16, type: 'spark',
    xRange: 36, yRange: 30, zNear: -4, zFar: -76, speed: boss ? 2.6 : 2.0, seed: 33,
  });
  ctx.points({
    count: boss ? 24 : 16, color: 0x6a9a2a, size: 0.5, type: 'spark',
    xRange: 40, yRange: 30, zNear: -26, zFar: -110, speed: 1.0, seed: 37,
  });
}

/* ------------------------------------------------------------------ *
 * Builder
 * ------------------------------------------------------------------ */

function build(ctx, boss) {
  ctx.atmosphere({
    fogColor: boss ? 0x1a2a0a : 0x16240a,
    fogDensity: boss ? 0.021 : 0.019,
    ambient: 0x8a9a72,
    ambientIntensity: boss ? 2.1 : 1.9,
    dirColor: boss ? 0xd0ff80 : 0xa0e030,
    dirIntensity: boss ? 1.2 : 1.0,
  });
  addMiasmaSky(ctx, boss);
  ctx.add(ctx.K.ground({
    y: -10, color: 0x7a8a6a,
    texture: ctx.matTexture('ink', boss ? '#1e2e0c' : '#18260a') || null, opacity: 0.92,
  }));
  addTowers(ctx, boss);
  addThrone(ctx, boss);
  addBottle(ctx, boss);
  addParticles(ctx, boss);
  addFogBillboards(ctx, {
    color: boss ? '#a0c060' : '#7a9a4a', alpha: boss ? 0.3 : 0.22, count: 6,
    y: boss ? 1 : 0, xSpread: 42, zNear: -22, zFar: -130, w: 106, h: 28,
  });
  addFloorArt(ctx, {
    color: boss ? '#8aa05a' : '#6a7a4a', alpha: boss ? 0.2 : 0.16, count: 3,
    y: -9.5, zNear: -20, zFar: -95, w: 130, h: 110, texture: 'washi',
  });
  addEdgeFlora(ctx, { grassColor: '#0c1804', plumColor: '#121e08', alpha: boss ? 0.7 : 0.55, y: -7 });
  ctx.setSpeed(boss ? 15 : 11);
  ctx.setSway(boss ? 0.75 : 0.55, boss ? 0.4 : 0.3);
}

export function mid(ctx) {
  build(ctx, false);
}

export function boss(ctx) {
  build(ctx, true);
}
