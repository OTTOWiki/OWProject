/**
 * 第 2 面「编辑日常 · 审核冲突」3D 舞台。
 * 冰封审核关卡：六角防火墙隧道、悬浮审核之眼、冻结鸟居与冰晶；超现实：巨眼巡天、格栅倒悬。
 */
import { addBaseAtmosphere } from './_atmo.js';

function makeBuild(boss) {
  return function build(ctx) {
    const { palette, K } = ctx;
    ctx.atmosphere({
      bg: palette.skyBot,
      fogColor: palette.fog,
      fogDensity: boss ? 0.02 : 0.024,
      ambient: palette.ambient,
      ambientIntensity: 1.0,
      dirColor: boss ? 0xffffff : palette.glow,
      dirIntensity: 0.6,
    });
      const art = ctx.plateTexture();
  if (art) {
    const crops = [[0, 0, 1, 1], [0.08, 0.1, 0.5, 0.5], [0.4, 0.16, 0.55, 0.5], [0.2, 0.45, 0.5, 0.5]];
    for (let i = 0; i < crops.length; i++) {
      const tex = ctx.plateCrop(...crops[i]);
      if (!tex) continue;
      ctx.add(K.panel(tex, {
        x: (i % 2 ? 1 : -1) * (8 + i * 5), y: 7 + i * 3, z: -105 + i * 10,
        w: i === 0 ? 120 : 44 + i * 8, h: i === 0 ? 160 : 50 + i * 10,
        opacity: i === 0 ? 0.8 : 0.5, color: 0xcfe8ff, rotationY: (i - 1.5) * 0.1,
      }));
    }
  }
    ctx.add(K.ground({ y: -10, color: 0x081420, texture: K.matTexture('ink', '#081420') }));
    // 冰月
    const moon = K.sphere(7, 0xe8f4ff);
    moon.position.set(-9, 16, -110);
    ctx.add(moon);
    // 六角防火墙：左右侧墙（避免铺满中心，保护弹幕可读性）
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const l = K.hexLattice({
          w: 18, h: 22, size: 1.4,
          color: boss ? 0xd8f0ff : 0x7cc7f0,
          opacity: boss ? 0.34 : 0.24,
        });
        l.rotation.y = side * Math.PI / 2;
        l.position.set(side * 13, 2, -16 - i * 22);
        ctx.add(l);
      }
    }
    // 悬浮审核之眼
    for (let i = 0; i < (boss ? 3 : 2); i++) {
      const e = K.eye({ scale: boss ? 1.4 : 1, color: 0xbfe6ff, iris: 0xe8f8ff });
      e.position.set(i === 0 ? -7 : i * 9, 8 + i * 4, -30 - i * 22);
      ctx.add(e);
      ctx.animate(e, { bob: { amp: 0.25, speed: 0.7, phase: i } });
    }
    // 冻结鸟居
    ctx.field((i) => {
      const t = K.torii({ scale: 1.1, color: 0x4a6a80, dark: 0x0a1824 });
      if (i % 2) t.rotation.z = 0.08;
      return t;
    }, { count: 4, zNear: -12, zFar: -90, xRange: 18, yRange: 1, speedMul: 0.9 });
    // 冰晶
    ctx.field((i) => {
      const c = K.cone(0.35 + K.hash01(i * 5) * 0.4, 2.4 + K.hash01(i * 7) * 3, 0xbfe6ff, { transparent: true, opacity: 0.55 });
      if (i % 3 === 0) c.rotation.z = Math.PI;
      return c;
    }, { count: 26, zNear: -4, zFar: -70, xRange: 26, yRange: 14, speedMul: 1.2 });
    ctx.points({
      count: boss ? 90 : 60, color: 0xe8f6ff, size: 0.14, type: 'snow',
      xRange: 28, yRange: 22, zNear: -2, zFar: -70, speed: 1.4, seed: boss ? 8 : 2,
    });
    if (boss) {
      ctx.points({
        count: 40, color: 0x9fe8ff, size: 0.22, type: 'binary',
        xRange: 26, yRange: 20, zNear: -3, zFar: -60, speed: 2.6, seed: 14,
      });
    }
    addBaseAtmosphere(ctx, {fogColor: '#a8c8e0', cloudColor: '#c8e0f0', floorColor: '#b8d8e8', fogAlpha: 0.2, cloudAlpha: 0.15, floorAlpha: 0.1, floraAlpha: 0.4});
    ctx.setSpeed(boss ? 16 : 12);
    ctx.setSway(0.5, 0.35);
  };
}

export const mid = makeBuild(false);
export const boss = makeBuild(true);
