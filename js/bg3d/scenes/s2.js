/**
 * 第 2 面「编辑日常 · 审核冲突」——超写实 · 超现实 3D 舞台。
 *
 * 冷蓝冰封的审核圣殿：两侧巨墙与六角防火墙电路在雾中后退，悬浮审核之眼缓缓张合，
 * 冻原与水洼反射冷光；超现实：巨眼巡天、倒悬冰塔、闪电在巨墙间炸开。
 * 剧情：日志翻涌成潮，防火墙亮起冷光；每一次编辑，都被系统悄悄记下。
 */

function mixHex(a, b, t) {
  const ar = (a >> 16) & 255; const ag = (a >> 8) & 255; const ab = a & 255;
  const br = (b >> 16) & 255; const bg = (b >> 8) & 255; const bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16)
    | (Math.round(ag + (bg - ag) * t) << 8)
    | Math.round(ab + (bb - ab) * t);
}

function buildScene(ctx, boss) {
  const { palette, K } = ctx;
  const fogColor = mixHex(palette.fog, palette.ink, 0.45);
  ctx.atmosphere({
    bg: palette.skyBot,
    fogColor,
    fogDensity: boss ? 0.02 : 0.017,
    ambient: palette.ambient,
    ambientIntensity: 0.55,
    hemiSky: mixHex(palette.glow, palette.fog, 0.3),
    hemiGround: palette.ink,
    hemiIntensity: 0.6,
    dirColor: palette.glow,
    dirIntensity: 2.1,
    shadow: true,
    shadowSize: 1024,
  });

  // 冻原水面（冷光反射）
  ctx.add(K.waterFloor({ y: -5.4, size: [340, 380], color: boss ? 0x061220 : 0x040c16, normalScale: 0.24, roughness: 0.22, metalness: 0.12, envMapIntensity: 0.45, flow: 0.4 }));

  // 两侧巨墙 + 发光电路线（持续深入）
  ctx.field((i) => {
    const g = new ctx.THREE.Group();
    const h = 26;
    const wall = K.box(7, h, 9, 0x101820, { kind: 'stone', roughness: 0.85, castShadow: false });
    wall.position.y = h / 2 - 4;
    g.add(wall);
    // 发光电路条
    for (let k = 0; k < 3; k++) {
      const line = K.box(0.12, 0.1, 8.6, boss ? 0xd8f0ff : 0x7cc7f0, { kind: 'metal', emissive: boss ? 0xd8f0ff : 0x7cc7f0, emissiveIntensity: 2.0, castShadow: false });
      line.position.set(3.55, 2 + k * 2.4 + (i % 2) * 0.6, 0);
      g.add(line);
    }
    // 巨型六角格栅
    const lat = K.hexLattice({ w: 7.5, h: 12, size: 1.1, color: boss ? 0xcff0ff : 0x6ab8e8, opacity: boss ? 0.55 : 0.4 });
    lat.rotation.y = Math.PI / 2;
    lat.position.set(3.6, 2.5, 0);
    g.add(lat);
    return g;
  }, { count: boss ? 7 : 6, zNear: -24, zFar: -130, xRange: 30, xAbsMin: 14, speedMul: 0.7, y: 0 });

  // 悬浮审核之眼（巨眼 + 小眼巡天）
  const firstEye = ctx.add(K.eye({ x: -8, y: 6.5, z: -44, scale: boss ? 3.6 : 2.7, color: 0x8fb8c8 }));
  ctx.animate(firstEye, { pulse: { amp: 0.03, speed: 0.6 } });
  const bigEye = ctx.add(K.eye({ x: 8, y: 10, z: -68, scale: boss ? 2.2 : 1.7, color: 0xa8d4e0 }));
  ctx.animate(bigEye, { bob: { amp: 0.4, speed: 0.3 } });
  ctx.add(K.skyEye({ x: 0, y: 13, z: -95, r: 5.5, color: 0xc8d8e0, iris: 0x6aa8c8, pupil: 0x04080c }));

  // 冻结鸟居（冷色木）
  ctx.field((i) => K.torii({
    color: 0x3a5060, dark: 0x0a141c, scale: 1.0 + K.hash01(i * 7) * 0.4,
  }), { count: 4, zNear: -26, zFar: -110, xRange: 34, xAbsMin: 12, speedMul: 0.9 });

  // 倒悬冰塔（超现实）
  for (let i = 0; i < 3; i++) {
    const p = K.pagoda({ x: (i - 1) * 12, y: 15 + i * 2, z: -50 - i * 22, scale: 1.2, tiers: 3, body: 0x1a2630, roof: 0x0a1016, window: 0xa8e0ff, flip: true, glow: true });
    ctx.add(p);
    ctx.animate(p, { bob: { amp: 0.3, speed: 0.2, phase: i } });
  }

  // 冰晶柱（悬浮）
  ctx.field((i) => {
    const c = K.cone(0.25 + K.hash01(i * 5) * 0.35, 2.6 + K.hash01(i * 7) * 3.4, 0x9fd8f0, {
      kind: 'ceramic', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.7, castShadow: false,
      emissive: 0x2a4a5a, emissiveIntensity: 0.4,
    });
    if (i % 3 === 0) c.rotation.z = Math.PI;
    return c;
  }, { count: 24, zNear: -18, zFar: -100, xRange: 36, yRange: 22, speedMul: 1.1 });

  // 体积冷光
  for (let i = 0; i < 2; i++) {
    ctx.add(K.volumetricBeam({ x: -14 + i * 28, y: 12, z: -70 - i * 22, length: 40, radius: 3.6, color: 0xa8e0ff, opacity: 0.05, tilt: (i ? 0.2 : -0.2), spin: 0.18 }));
  }

  // 雪 + 数据流 + 冷雾
  ctx.points({ count: boss ? 150 : 110, color: 0xe8f6ff, size: 0.12, type: 'snow', xRange: 38, yRange: 30, zNear: -14, zFar: -110, speed: boss ? 2 : 1.4, seed: boss ? 8 : 2 });
  ctx.points({ count: boss ? 60 : 36, color: 0x9fe8ff, size: 0.14, type: 'binary', xRange: 34, yRange: 24, zNear: -14, zFar: -90, speed: 2.6, seed: 14 });
  ctx.add(K.mistSheet({ x: -16, y: 1, z: -36, w: 120, h: 34, color: mixHex(palette.fog, palette.glow, 0.35), opacity: boss ? 0.18 : 0.13, seed: 4, speed: 0.02 }));
  ctx.add(K.mistSheet({ x: 18, y: 2, z: -54, w: 140, h: 40, color: mixHex(palette.fog, palette.glow, 0.3), opacity: boss ? 0.15 : 0.11, seed: 8, speed: 0.015 }));
  ctx.add(K.mistSheet({ x: 0, y: 4, z: -85, w: 180, h: 60, color: mixHex(palette.fog, palette.ink, 0.3), opacity: 0.24, seed: 5, speed: 0.02 }));

  // Boss：巨墙裂缝雷光 + 眼瞳张力
  if (boss) {
    for (let i = 0; i < 2; i++) {
      ctx.add(K.volumetricBeam({ x: (i - 0.5) * 10, y: 18, z: -40, length: 30, radius: 0.8, color: 0xe8f8ff, opacity: 0.16, tilt: 0, spin: 1.2 }));
    }
    const crack = K.tube([[-16, 6, -34], [-8, 12, -34], [-2, 10, -34], [6, 16, -34], [14, 12, -34]], 0.09, 0xd8f0ff, { kind: 'metal', emissive: 0xd8f0ff, emissiveIntensity: 2.4, castShadow: false });
    ctx.add(crack);
    ctx.animate(crack, { pulse: { amp: 0.18, speed: 3.2 } });
  }

  ctx.setSpeed(boss ? 12 : 8.5);
  ctx.setSway(boss ? 0.42 : 0.32, 0.2);
}

export function mid(ctx) { buildScene(ctx, false); }
export function boss(ctx) { buildScene(ctx, true); }
