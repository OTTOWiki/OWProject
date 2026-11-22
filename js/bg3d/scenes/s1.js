/**
 * 第 1 面「维基外围 · 零散草稿」3D 舞台。
 * 方向：持续深入的 3D 场景 + Billboard 绘卷 + 真 3D 混合；超现实：倒置鸟居、浮空巨月、纸片风暴。
 * mid：月下草稿荒野，群塔与鸟居在雾中后退；草稿纸 Billboards 逆流而来。
 * boss：赤月齿轮、倒悬鸟居与纸片风暴。
 */
import { addBaseAtmosphere } from './_atmo.js';

const PAPER_TEXT = ['草稿', 'wiki', '#{}', '未竟', 'OTTO'];

function addBackdrop(ctx, art, tint = 0xffffff, opacity = 0.55) {
  const K = ctx.K;
  if (!art) return;
  // 超现实：同一绘卷被裁成多块「漂浮画幅」，前后错落挂在 3D 空间里
  const crops = [
    [0, 0, 1, 1], [0.06, 0.12, 0.52, 0.5], [0.42, 0.08, 0.55, 0.62],
    [0.16, 0.42, 0.6, 0.5], [0.55, 0.5, 0.42, 0.42],
  ];
  for (let i = 0; i < crops.length; i++) {
    const tex = ctx.plateCrop(...crops[i]);
    if (!tex) continue;
    const p = K.panel(tex, {
      x: (i % 2 ? 1 : -1) * (7 + i * 5),
      y: 7 + i * 4,
      z: -110 + i * 9,
      w: i === 0 ? 130 : 42 + i * 9,
      h: i === 0 ? 175 : 52 + i * 12,
      opacity: i === 0 ? Math.min(0.92, opacity * 1.7) : Math.min(0.6, opacity * 1.15),
      color: tint,
      rotationY: (i - 2) * 0.1,
    });
    ctx.add(p);
  }
}

function addMoon(ctx, boss) {
  const K = ctx.K;
  const { palette } = ctx;
  const moon = K.sphere(boss ? 8.5 : 7.5, boss ? 0xf0c8d8 : palette.glow);
  moon.position.set(7, 16, -100);
  ctx.add(moon);
  const halo = K.ring(boss ? 9.2 : 8.2, boss ? 9.8 : 8.7, boss ? 0xf9a8d4 : palette.glow, { opacity: 0.28 });
  halo.position.set(7, 16, -100);
  ctx.add(halo);
  ctx.animate(halo, { pulse: { amp: 0.05, speed: 0.8 } });
}

function addFields(ctx, boss) {
  const K = ctx.K;
  const { palette } = ctx;
  // 远景聚落群塔：左右两侧后退，部分倒悬（超现实）
  ctx.field((i) => {
    const inverted = i % 5 === 3;
    const p = K.pagoda({
      scale: 0.9 + K.hash01(i * 17) * 0.9,
      tiers: 3 + (i % 2),
      body: palette.ink,
      roof: palette.ink,
      window: boss ? palette.accent : 0x9fe8c0,
      flip: inverted,
    });
    p.position.y = inverted ? 14 : 0;
    return p;
  }, { count: 10, zNear: -30, zFar: -130, xRange: 52, yRange: 2, speedMul: 0.5 });
  // 鸟居：近景两侧连续穿越，一座倒悬
  ctx.field((i) => {
    const t = K.torii({
      scale: 0.8 + K.hash01(i * 29) * 0.5,
      color: boss ? 0x9a3040 : 0x6a2630,
      dark: palette.ink,
    });
    if (i % 5 === 2) { t.rotation.z = Math.PI; t.position.y = 8; }
    return t;
  }, { count: 5, zNear: -26, zFar: -95, xRange: 30, yRange: 0.4, speedMul: 0.9, xAbsMin: 15 });
  // 草稿纸 Billboards：逆流逼近（有绘卷 plate 才启用，否则用字形代替）
  const art = ctx.plateTexture();
  if (art) {
    ctx.field(() => K.sprite(art, {
      w: 2.4 + K.hash01(11) * 2.6,
      h: 3 + K.hash01(13) * 3.4,
      opacity: 0.22,
      color: 0xd8e0c8,
    }), { count: 20, zNear: -12, zFar: -70, xRange: 18, yRange: 12, speedMul: 1.3 });
  }
  // 悬浮字形（billboard 文本）
  for (let i = 0; i < 7; i++) {
    const sp = ctx.textSprite(PAPER_TEXT[i % PAPER_TEXT.length], {
      x: (i % 2 ? 1 : -1) * (5 + K.hash01(i * 41) * 8),
      y: (K.hash01(i * 43) - 0.5) * 16,
      z: -18 - K.hash01(i * 47) * 30,
      w: 4, h: 2,
      fill: boss ? '#f9a8d4' : '#9fe8c0',
      bg: 'rgba(4,10,7,0)',
      font: 'bold 40px "Noto Serif CJK SC", "Microsoft YaHei", serif',
      opacity: 0.5,
    });
    ctx.add(sp);
  }
}

function addParticles(ctx, boss) {
  const { palette } = ctx;
  ctx.points({
    count: boss ? 120 : 80,
    color: boss ? palette.accent : 0xf0ead4,
    size: 0.16, type: 'paper',
    xRange: 26, yRange: 22, zNear: -4, zFar: -70, speed: 2.2, seed: boss ? 9 : 3,
  });
  ctx.points({
    count: boss ? 50 : 30,
    color: boss ? 0xffc0e0 : 0x9fffc0,
    size: 0.3, type: 'spark',
    xRange: 24, yRange: 18, zNear: -6, zFar: -60, speed: 3, seed: boss ? 12 : 5,
  });
}

export function mid(ctx) {
  const { palette, K } = ctx;
  ctx.atmosphere({
    bg: palette.skyBot, fogColor: palette.fog, fogDensity: 0.017,
    ambient: palette.ambient, ambientIntensity: 1.15, dirColor: palette.glow, dirIntensity: 0.7,
  });
  addBackdrop(ctx, ctx.plateTexture());
  ctx.add(K.ground({ y: -10, color: 0x07130d, texture: K.matTexture('ink', '#07130d') }));
  addMoon(ctx, false);
  addFields(ctx, false);
  addBaseAtmosphere(ctx, {
    fogColor: '#8fbfa0', cloudColor: '#a8c8a8', floorColor: '#9fb8a0',
    fogAlpha: 0.2, cloudAlpha: 0.14, floorAlpha: 0.1, floraAlpha: 0.55,
  });
  addParticles(ctx, false);
  ctx.setSpeed(10);
  ctx.setSway(0.5, 0.28);
}

export function boss(ctx) {
  const { palette, K } = ctx;
  ctx.atmosphere({
    bg: palette.skyBot, fogColor: palette.fog, fogDensity: 0.016,
    ambient: palette.ambient, ambientIntensity: 1.2, dirColor: palette.accent, dirIntensity: 0.8,
  });
  addBackdrop(ctx, ctx.plateTexture(), 0xffd0e8);
  ctx.add(K.ground({ y: -10, color: 0x14060e, texture: K.matTexture('ink', '#14060e') }));
  addMoon(ctx, true);
  // 超现实：巨大的草稿齿轮月轮
  const gear = K.torus(16, 0.65, palette.accent, { radial: 5, tubular: 40 });
  gear.position.set(-9, 20, -78);
  ctx.add(gear);
  ctx.animate(gear, { spinZ: 0.18 });
  const gear2 = K.torus(11, 0.45, palette.accent2, { radial: 4, tubular: 32 });
  gear2.position.set(-9, 20, -78);
  ctx.add(gear2);
  ctx.animate(gear2, { spinZ: -0.3 });
  addFields(ctx, true);
  // 倒悬鸟居特写
  const inv = K.torii({ scale: 1.3, color: 0x9a3040, dark: palette.ink });
  inv.position.set(6, 9, -34);
  inv.rotation.z = Math.PI;
  ctx.add(inv);
  ctx.animate(inv, { bob: { amp: 0.3, speed: 0.5 } });
  addBaseAtmosphere(ctx, {
    fogColor: '#c090a8', cloudColor: '#d0a8c0', floorColor: '#c8a0b0',
    fogAlpha: 0.22, cloudAlpha: 0.16, floorAlpha: 0.12, floraAlpha: 0.6,
  });
  addParticles(ctx, true);
  ctx.setSpeed(14);
  ctx.setSway(0.7, 0.36);
}
