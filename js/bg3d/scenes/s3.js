/**
 * 第 3 面「分歧的十字路口」——超写实 · 超现实 3D 舞台。
 *
 * 悬于虚空的双色神殿：左侧铬蓝、右侧琥珀，两列鸟居与浮空石道分道而行；
 * 中央巨型防火墙石门半开，门内体积光与双色气流对撞。
 * 剧情：数据在此分叉——一侧铬光冰冷，一侧暖色混沌；打破主防火墙，方能择路而行。
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
    dirColor: 0xffffff,
    dirIntensity: 1.9,
    shadow: true,
    shadowSize: 1024,
  });

  // 虚空中的双色镜面水（石板路悬于其上）
  ctx.add(K.waterFloor({ y: -9, size: [420, 420], color: 0x04040a, normalScale: 0.24, roughness: 0.22, metalness: 0.12, envMapIntensity: 0.45, flow: 0.4 }));

  // 中央巨门（防火墙石门）
  const gate = K.gate({
    x: 0, y: -6, z: boss ? -46 : -58,
    w: boss ? 15 : 13, h: boss ? 26 : 22,
    color: 0x141218, accent: boss ? 0xffcf8a : 0x9ab0c8,
  });
  ctx.add(gate);
  ctx.add(K.volumetricBeam({ x: 0, y: 12, z: boss ? -48 : -60, length: 44, radius: 5.2, color: 0xffe0b0, opacity: boss ? 0.1 : 0.06, tilt: 0, spin: 0.1 }));

  // 抉择路口的双色引导光路：从左右两条石道汇入中央防火墙门（叙事：你必须选一条路）
  for (const side of [-1, 1]) {
    const col = side < 0 ? 0x9fc0ff : 0xffb060;
    for (let i = 0; i < 6; i++) {
      const strip = K.box(0.28, 0.03, 7.5, 0x000000, {
        kind: 'metal', emissive: col, emissiveIntensity: 2.2, castShadow: false, receiveShadow: false,
      });
      strip.position.set(side * (5.2 - i * 0.78), -5.95, -16 - i * 8.6);
      strip.rotation.y = side * 0.07 * i;
      ctx.add(strip);
    }
  }
  // 两侧分色鸟居列（左冷右暖）
  for (let i = 0; i < (boss ? 12 : 9); i++) {
    const side = i % 2 ? 1 : -1;
    const t = K.torii({
      x: side * (9 + K.hash01(i * 13) * 7),
      y: 0,
      z: -18 - i * 14,
      scale: 1.1 - i * 0.035,
      color: side < 0 ? 0x4a6a8a : 0x8a5028,
      dark: palette.ink,
    });
    if (i % 5 === 3) t.rotation.z = Math.PI;
    ctx.add(t);
    ctx.animate(t, { bob: { amp: 0.1, speed: 0.25, phase: i } });
  }

  // 浮空石道（分叉）
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const slab = K.box(5.5, 0.35, 8, 0x1a1c22, { kind: 'stone', castShadow: false });
      slab.position.set(side * (7 + i * 4.2), -6.2 + i * 0.35, -14 - i * 16);
      slab.rotation.y = side * 0.14 * i;
      slab.rotation.z = side * 0.03;
      ctx.add(slab);
    }
  }

  // 巨型 A/B 封印（超现实：悬浮的封印）
  ctx.add(K.giantSeal({ x: -15, y: 8, z: -32, size: 6, color: 0x2a3a4a, text: 'A', glow: 0x9fc0ff }));
  const sealB = K.giantSeal({ x: 15, y: 9, z: -38, size: 6, color: 0x4a2a18, text: 'B', glow: 0xffb060 });
  ctx.add(sealB);
  ctx.animate(sealB, { bob: { amp: 0.35, speed: 0.28 } });

  // 悬浮岩块 + 镜片
  ctx.add(K.floatingRocks({ x: -20, y: 3, z: -36, count: 4, spread: 8, color: 0x1a1c20, seed: 4 }));
  ctx.add(K.floatingRocks({ x: 0, y: 16, z: -60, count: 5, spread: 12, color: 0x14161a, seed: 12 }));
  ctx.add(K.floatingRocks({ x: 21, y: 5, z: -60, count: 4, spread: 7, color: 0x201a16, seed: 9 }));
  if (boss) {
    ctx.add(K.shardField({ x: 0, y: 8, z: -40, count: 14, spread: 16, color: 0xcfe0ff, seed: 3 }));
  }

  // 双色体积光
  ctx.add(K.volumetricBeam({ x: -18, y: 10, z: -54, length: 46, radius: 4, color: 0x8fc0ff, opacity: boss ? 0.08 : 0.05, tilt: -0.22, spin: 0.2 }));
  ctx.add(K.volumetricBeam({ x: 19, y: 9, z: -58, length: 44, radius: 3.6, color: 0xffb060, opacity: boss ? 0.08 : 0.05, tilt: 0.22, spin: -0.2 }));

  // 左侧雪 / 右侧火星，冷雾
  ctx.points({ count: boss ? 90 : 60, color: 0xbfd8ff, size: 0.12, type: 'snow', xRange: 50, yRange: 26, zNear: -16, zFar: -100, speed: 1.2, seed: 4 });
  ctx.points({ count: boss ? 90 : 60, color: 0xffa860, size: 0.14, type: 'spark', xRange: 50, yRange: 26, zNear: -16, zFar: -100, speed: 2.4, seed: 6 });
  ctx.add(K.mistSheet({ x: -20, y: -1.5, z: -34, w: 130, h: 34, color: mixHex(palette.fog, palette.ink, 0.3), opacity: boss ? 0.18 : 0.13, seed: 3, speed: 0.02 }));
  ctx.add(K.mistSheet({ x: 22, y: -0.5, z: -50, w: 150, h: 40, color: mixHex(palette.fog, palette.ink, 0.25), opacity: boss ? 0.15 : 0.11, seed: 7, speed: 0.016 }));
  ctx.add(K.mistSheet({ x: 0, y: 0, z: -78, w: 200, h: 54, color: mixHex(palette.fog, palette.ink, 0.35), opacity: 0.2, seed: 7, speed: 0.015 }));

  // 超现实：倒悬的第三座门（远处，倒影世界）
  const invGate = K.box(9, 16, 1.2, 0x0e0c12, { kind: 'stone', castShadow: false });
  invGate.position.set(0, 22, -85);
  invGate.rotation.z = Math.PI;
  ctx.add(invGate);

  if (boss) {
    ctx.add(K.volumetricBeam({ x: 0, y: 6, z: -40, length: 34, radius: 7, color: 0xfff0c0, opacity: 0.07, tilt: 0, spin: 0.4 }));
  }

  ctx.setSpeed(boss ? 13 : 9);
  ctx.setSway(0.4, 0.22);
}

export function mid(ctx) { buildScene(ctx, false); }
export function boss(ctx) { buildScene(ctx, true); }
