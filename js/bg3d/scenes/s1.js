/**
 * 第 1 面「维基外围 · 零散草稿」——超写实 · 超现实 3D 舞台。
 *
 * 画面：月光下的无限鸟居回廊横跨镜面浅水；远处石塔与绘卷画幅悬浮于体积雾中；
 * 纸页如雪、水面映月；超现实：倒悬巨鸟居悬于回廊上方、漂浮绘卷与岩石、赤月齿轮（boss）。
 * 剧情：草稿如落雪，在审核的边缘漂泊；未竟的词条低语，试探来者的执念。
 */

const PAPER_TEXT = ['草稿', 'wiki', '#{}', '未竟', 'OTTO'];

function mixHex(a, b, t) {
  const ar = (a >> 16) & 255; const ag = (a >> 8) & 255; const ab = a & 255;
  const br = (b >> 16) & 255; const bg = (b >> 8) & 255; const bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16)
    | (Math.round(ag + (bg - ag) * t) << 8)
    | Math.round(ab + (bb - ab) * t);
}

/** 无限鸟居回廊（持续深入的纵深） */
function toriiCorridor(ctx, { boss = false } = {}) {
  const K = ctx.K;
  const palette = ctx.palette;
  const count = boss ? 11 : 9;
  for (let i = 0; i < count; i++) {
    const z = -16 - i * 11;
    const s = 1.35 - i * 0.045;
    const t = K.torii({
      x: boss ? Math.sin(i * 0.7) * 0.25 : Math.sin(i * 0.45) * 0.15,
      y: 0,
      z,
      scale: s,
      color: boss ? 0x8a2028 : 0x6e2228,
      dark: palette.ink,
    });
    // 超现实：第 5 座鸟居倒悬于回廊上方
    if (!boss && i === 4) {
      t.position.y = 10.5;
      t.rotation.z = Math.PI;
      t.rotation.y = 0.08;
      ctx.animate(t, { bob: { amp: 0.35, speed: 0.32 } });
    } else if (i % 3 === 1) {
      t.rotation.y = (i % 2 ? 1 : -1) * 0.035;
    }
    ctx.add(t);
  }
}

/** 悬浮绘卷画幅（Billboard = 真实绘卷被裁片后悬在空中） */
function floatingArt(ctx, { boss = false } = {}) {
  const K = ctx.K;
  const crops = [
    [0, 0, 1, 1], [0.06, 0.12, 0.52, 0.5], [0.42, 0.08, 0.55, 0.62],
    [0.16, 0.42, 0.6, 0.5], [0.55, 0.5, 0.42, 0.42],
  ];
  for (let i = 0; i < (boss ? 7 : 5); i++) {
    const tex = ctx.plateCrop(...crops[i % crops.length]);
    if (!tex) continue;
    const side = i % 2 ? 1 : -1;
    const p = K.artPanel(tex, {
      x: side * (7 + K.hash01(i * 17) * 8),
      y: 3 + K.hash01(i * 11) * 8,
      z: -20 - i * 13,
      w: 7 + K.hash01(i * 23) * 5,
      h: 9 + K.hash01(i * 29) * 6,
      rotationY: side * (0.35 + K.hash01(i * 31) * 0.4),
      rotationZ: (K.hash01(i * 37) - 0.5) * 0.25,
      opacity: boss ? 0.9 : 0.82,
      tint: boss ? 0xffd0d8 : 0xdfe8dc,
    });
    ctx.add(p);
    ctx.animate(p, { bob: { amp: 0.25, speed: 0.25 + K.hash01(i * 41) * 0.2, phase: i } });
  }
}

function buildScene(ctx, boss) {
  const { palette, K } = ctx;
  const fogColor = mixHex(palette.fog, palette.ink, 0.5);
  ctx.atmosphere({
    bg: palette.skyBot,
    fogColor,
    fogDensity: boss ? 0.019 : 0.016,
    ambient: palette.ambient,
    ambientIntensity: 0.5,
    hemiSky: mixHex(palette.glow, palette.fog, 0.4),
    hemiGround: palette.ink,
    hemiIntensity: 0.5,
    dirColor: boss ? 0xffc0c8 : palette.glow,
    dirIntensity: 2.0,
    shadow: true,
    shadowSize: 1024,
  });

  // 镜面浅水（真实反射天空/月亮）
  ctx.add(K.waterFloor({
    y: -5.6, size: [320, 360], color: boss ? 0x0a0508 : 0x04080a,
    // 降低镜面高光/环境反射强度，避免水面出现移动的“无意义闪光”
    normalScale: 0.26, roughness: 0.24, metalness: 0.12, envMapIntensity: 0.42, flow: 0.35,
  }));

  // 巨月 + 体积月光柱
  ctx.add(K.moon({
    x: boss ? -9 : 8, y: boss ? 10 : 9.5, z: -108,
    r: boss ? 11 : 8.5,
    color: boss ? 0xf0d0d8 : 0xe8e8dc,
    halo: boss ? 0xff8090 : 0xb8d0d8,
    haloOpacity: boss ? 0.3 : 0.2,
  }));
  for (let i = 0; i < 3; i++) {
    const beam = K.volumetricBeam({
      x: (i - 1) * 11, y: 10, z: -78 - i * 24,
      length: 46, radius: 2.4, color: boss ? 0xff9aa8 : 0xcfe4e0,
      opacity: boss ? 0.04 : 0.028, tilt: (i - 1) * 0.16, spin: 0.25 + i * 0.05,
    });
    ctx.add(beam);
  }

  toriiCorridor(ctx, { boss });
  // 超现实：天空中出现回廊的倒影（上半部分镜像鸟居，压暗）
  for (let i = 0; i < 4; i++) {
    const t = K.torii({ x: Math.sin(i * 0.5) * 0.2, y: 11.5 + i * 0.4, z: -30 - i * 14, scale: 1.1, color: 0x2a1418, dark: palette.ink });
    t.rotation.z = Math.PI;
    t.rotation.y = 0.05;
    ctx.add(t);
  }
  floatingArt(ctx, { boss });

  // 远景石塔（绘卷中的藏经阁；真实石木结构）
  ctx.add(K.pagoda({ x: -20, y: 0, z: -105, scale: 2.2, tiers: 4, body: 0x1a1814, roof: 0x0d0c0a, window: boss ? 0xffb8c8 : 0xcfe0b8, glow: true }));
  ctx.add(K.pagoda({ x: 23, y: 0, z: -125, scale: 1.7, tiers: 3, body: 0x16140f, roof: 0x0b0a08, window: boss ? 0xffa0b0 : 0xb8d8c0, glow: false }));

  // 回廊上方的灯笼串（暖色 practical，冷暖对比）
  ctx.add(K.hangingLights({ x: -4.2, y: 7.6, z: -24, count: 5, span: 10, sag: 0.8, color: 0xffb15c, lanternScale: 0.42, seed: 2 }));
  ctx.add(K.hangingLights({ x: 4.2, y: 7.2, z: -40, count: 5, span: 10, sag: 0.8, color: 0xffb15c, lanternScale: 0.38, seed: 5 }));
  // 悬浮岩块/纸页/萤火
  ctx.add(K.floatingRocks({ x: -12, y: 5.5, z: -46, count: 5, spread: 9, color: 0x1e201c, seed: 3 }));
  ctx.add(K.floatingRocks({ x: 14, y: 8, z: -70, count: 4, spread: 7, color: 0x1a1c18, seed: 8 }));
  ctx.points({ count: boss ? 150 : 110, color: boss ? 0xffd0d8 : 0xe8e4d0, size: 0.14, type: 'paper', xRange: 34, yRange: 26, zNear: -4, zFar: -110, speed: boss ? 3 : 2.2, seed: boss ? 9 : 3 });
  ctx.points({ count: boss ? 60 : 40, color: boss ? 0xff90a8 : 0xa8ffd0, size: 0.18, type: 'spark', xRange: 30, yRange: 20, zNear: -6, zFar: -90, speed: 2.6, seed: boss ? 12 : 5 });
  ctx.points({ count: 26, color: boss ? 0xffb8c8 : 0xd8e8d0, size: 0.1, type: 'petal', xRange: 26, yRange: 20, zNear: -5, zFar: -70, speed: 1.4, seed: 7 });

  // 体积雾层（超写实空气透视）
  ctx.add(K.mistSheet({ x: -18, y: 0.5, z: -34, w: 120, h: 34, color: mixHex(palette.fog, palette.glow, 0.3), opacity: boss ? 0.16 : 0.12, seed: 2, speed: 0.02 }));
  ctx.add(K.mistSheet({ x: 20, y: 1.5, z: -52, w: 140, h: 40, color: mixHex(palette.fog, palette.glow, 0.2), opacity: boss ? 0.14 : 0.1, seed: 6, speed: 0.016 }));
  ctx.add(K.mistSheet({ x: 0, y: 1.5, z: -60, w: 150, h: 46, color: mixHex(palette.fog, palette.ink, 0.35), opacity: 0.22, seed: 3, speed: 0.02 }));

  // 悬浮字形（超现实：文字漂浮在雾中）
  for (let i = 0; i < 5; i++) {
    const sp = ctx.textSprite(PAPER_TEXT[i % PAPER_TEXT.length], {
      x: (i % 2 ? 1 : -1) * (6 + K.hash01(i * 43) * 8),
      y: 4 + K.hash01(i * 47) * 8,
      z: -24 - K.hash01(i * 53) * 34,
      w: 4.4, h: 2.2,
      fill: boss ? '#ffd0e0' : '#d8e8d0',
      bg: 'rgba(4,10,7,0)',
      font: 'bold 44px "Noto Serif CJK SC", "Microsoft YaHei", serif',
      opacity: 0.55,
    });
    ctx.add(sp);
    ctx.animate(sp, { bob: { amp: 0.3, speed: 0.4, phase: i } });
  }

  // Boss：赤月齿轮 + 纸片风暴
  if (boss) {
    const gear = K.torus(17, 0.65, 0x7a2028, { kind: 'rust', radial: 10, tubular: 56 });
    gear.position.set(-10, 20, -80);
    gear.rotation.x = 0.2;
    ctx.add(gear);
    ctx.animate(gear, { spinZ: 0.16 });
    const gear2 = K.torus(11.5, 0.4, 0xd8a94a, { kind: 'gold', radial: 8, tubular: 48 });
    gear2.position.set(-10, 20, -80);
    ctx.add(gear2);
    ctx.animate(gear2, { spinZ: -0.26 });
  }

  ctx.setSpeed(boss ? 14 : 9.5);
  ctx.setSway(boss ? 0.5 : 0.38, 0.22);
}

export function mid(ctx) {
  buildScene(ctx, false);
}

export function boss(ctx) {
  buildScene(ctx, true);
}
