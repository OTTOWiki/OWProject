/**
 * 中立拦截「全域巡查姬 · 404」——超写实 · 超现实 3D 舞台（单 mode）。
 *
 * 雨夜荒原上的巡查监视塔：锈蚀钢架、旋转体积探照灯、404 全息幢幡、湿滑地面反射红光；
 * 天空悬着巨大的巡回之眼。超现实：倒悬的第二座塔、漂浮的 404 残片。
 * 剧情：以抹消之名，行无差别之审判。
 */

function mixHex(a, b, t) {
  const ar = (a >> 16) & 255; const ag = (a >> 8) & 255; const ab = a & 255;
  const br = (b >> 16) & 255; const bg = (b >> 8) & 255; const bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16)
    | (Math.round(ag + (bg - ag) * t) << 8)
    | Math.round(ab + (bb - ab) * t);
}

export function mid(ctx) {
  const { palette, K } = ctx;
  const fogColor = mixHex(palette.fog, palette.ink, 0.42);
  ctx.atmosphere({
    bg: palette.skyBot,
    fogColor,
    fogDensity: 0.021,
    ambient: palette.ambient,
    ambientIntensity: 0.55,
    hemiSky: mixHex(palette.fog, palette.accent, 0.3),
    hemiGround: palette.ink,
    hemiIntensity: 0.55,
    dirColor: palette.accent,
    dirIntensity: 2.2,
    shadow: true,
    shadowSize: 1024,
  });

  // 雨湿荒原（镜面反射红光）
  ctx.add(K.waterFloor({ y: -5.6, size: [380, 400], color: 0x0a0304, normalScale: 0.28, roughness: 0.1 }));

  // 监视塔（锈蚀钢架 + 舱室 + 信标 + 旋转体积探照灯）
  const tower = new ctx.THREE.Group();
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = K.cylinder(0.18, 0.3, 16, 0x3a2420, { kind: 'rust', seg: 8, roughness: 0.8 });
    leg.position.set(sx * 2.2, 8, sz * 2.2);
    leg.rotation.x = sz * 0.06;
    leg.rotation.z = -sx * 0.06;
    tower.add(leg);
  }
  const platform = K.box(6.4, 0.5, 6.4, 0x2a1a18, { kind: 'rust', roughness: 0.7 });
  platform.position.y = 16;
  const cabin = K.box(4.6, 3.2, 4.6, 0x241614, { kind: 'metal', roughness: 0.6 });
  cabin.position.y = 17.9;
  const roof = K.box(5.4, 0.4, 5.4, 0x120a0a, { kind: 'rust' });
  roof.position.y = 19.7;
  const beacon = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(0.5, 16, 12), K.emissive(0xff3a45, 3.0));
  beacon.position.y = 20.8;
  tower.add(platform, cabin, roof, beacon);
  tower.position.set(0, 0, -34);
  tower.scale.setScalar(0.92);
  ctx.add(tower);
  ctx.animate(beacon, { pulse: { amp: 0.35, speed: 2.4 } });
  // 探照灯（两束，旋转）
  for (let i = 0; i < 2; i++) {
    const beam = K.volumetricBeam({
      x: 0, y: 16.5, z: 0, length: 60, radius: 7, color: 0xff6b6b,
      opacity: 0.05, tilt: 1.0 + i * 0.25, spin: 0.35,
    });
    beam.rotation.x = 0.2;
    tower.add(beam);
  }

  // 重复逼近的塔群（巡更网络）
  ctx.field((i) => {
    const scale = 0.75 + K.hash01(i * 7) * 0.35;
    const g = new ctx.THREE.Group();
    const base = K.box(2.4 * scale, 0.6 * scale, 2.4 * scale, 0x241614, { kind: 'rust', castShadow: false });
    base.position.y = 0.3 * scale;
    const mast = K.cylinder(0.1 * scale, 0.16 * scale, 9 * scale, 0x2a1a18, { kind: 'metal', seg: 6, castShadow: false });
    mast.position.y = 4.8 * scale;
    const lamp = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(0.3 * scale, 10, 8), K.emissive(0xff5566, 1.6));
    lamp.position.y = 9.4 * scale;
    g.add(base, mast, lamp);
    return g;
  }, { count: 6, zNear: -46, zFar: -150, xRange: 44, xAbsMin: 12, speedMul: 0.4, y: 0 });

  // 倒悬监视塔（超现实）
  const invTower = new ctx.THREE.Group();
  const invCabin = K.box(5, 3.4, 5, 0x1a0e10, { kind: 'metal', roughness: 0.65, castShadow: false });
  const invBeam = K.volumetricBeam({ x: 0, y: 0, z: 0, length: 40, radius: 5, color: 0x9fe8ff, opacity: 0.05, tilt: 0.6, spin: 0.5 });
  invTower.add(invCabin, invBeam);
  invTower.position.set(16, 24, -64);
  invTower.rotation.z = Math.PI;
  ctx.add(invTower);

  // 404 全息幢幡 + 黄黑警戒条
  for (let i = 0; i < 5; i++) {
    const side = i % 2 ? 1 : -1;
    const sp = ctx.textSprite('404', {
      x: side * (8 + K.hash01(i * 13) * 8),
      y: 4 + K.hash01(i * 17) * 5,
      z: -16 - i * 16,
      w: 5.2, h: 2.4,
      fill: '#ffd166', bg: 'rgba(20,4,6,0)',
      font: 'bold 64px "Noto Serif CJK SC", monospace', opacity: 0.85,
    });
    ctx.add(sp);
    ctx.animate(sp, { bob: { amp: 0.25, speed: 0.5, phase: i } });
  }
  ctx.field(() => K.box(3.6, 0.9, 0.24, 0xffd166, { kind: 'metal', emissive: 0xffd166, emissiveIntensity: 0.5, castShadow: false }),
    { count: 6, zNear: -18, zFar: -80, xRange: 38, xAbsMin: 6, speedMul: 1.2, y: 0.6 });

  // 前景路障与铁丝围栏（真实材质）
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    const post = K.cylinder(0.06, 0.08, 2.6, 0x2a2420, { kind: 'metal', seg: 6, castShadow: false });
    post.position.set(side * (5 + i * 1.6), 0.4, -18 - i * 4.2);
    post.rotation.z = side * 0.16;
    ctx.add(post);
    // 只保留黄黑警示带中较窄的黄色带（黑色带在近景会像贯穿画面的黑线，观感像调试线）
    if (i % 2 === 0) {
      const tape = K.box(3.8, 0.12, 0.04, 0xffd166, { kind: 'fabric', emissive: 0x4a3800, castShadow: false });
      tape.position.set(side * (2.6 + i * 1.6), 1.4 + i * 0.12, -18 - i * 4.2);
      tape.rotation.z = side * 0.2;
      ctx.add(tape);
    }
  }
  // 巨眼巡天
  ctx.add(K.skyEye({ x: 0, y: 14, z: -80, r: 6.5, color: 0xe8d0d0, iris: 0xff4a5a, pupil: 0x0a0204 }));
  ctx.add(K.eye({ x: -11, y: 9, z: -40, scale: 2.2, color: 0xff8090, iris: 0xffd0d4, pupil: 0x1a0204 }));

  // 体积光/红雾/雨/火星
  ctx.add(K.volumetricBeam({ x: 0, y: 16, z: -30, length: 44, radius: 9, color: 0xff5566, opacity: 0.05, tilt: 0.9, spin: 0.4 }));
  ctx.add(K.volumetricBeam({ x: -22, y: 8, z: -60, length: 36, radius: 4, color: 0xffd166, opacity: 0.04, tilt: -0.3, spin: -0.3 }));
  ctx.add(K.mistSheet({ x: -18, y: 0, z: -30, w: 130, h: 34, color: mixHex(palette.fog, palette.ink, 0.3), opacity: 0.16, seed: 5, speed: 0.025 }));
  ctx.add(K.mistSheet({ x: 20, y: 1, z: -48, w: 150, h: 40, color: mixHex(palette.fog, palette.ink, 0.25), opacity: 0.13, seed: 9, speed: 0.02 }));
  ctx.add(K.mistSheet({ x: 0, y: 2, z: -70, w: 190, h: 50, color: mixHex(palette.fog, palette.ink, 0.3), opacity: 0.24, seed: 9, speed: 0.025 }));
  ctx.points({ count: 150, color: 0xb8d0e0, size: 0.12, type: 'rain', xRange: 40, yRange: 32, zNear: -16, zFar: -110, speed: 7, seed: 9 });
  ctx.points({ count: 40, color: 0xff7a5a, size: 0.14, type: 'spark', xRange: 34, yRange: 22, zNear: -16, zFar: -80, speed: 2.6, seed: 11 });

  ctx.setSpeed(11);
  ctx.setSway(0.42, 0.24);
}
