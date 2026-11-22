/**
 * 第 3 面「分歧的十字路口」3D 舞台。
 * 空间本身一分为二：左侧铬蓝、右侧琥珀；两侧鸟居/踏石/旗幡在雾中分道，中央防火墙石门悬置。
 * 超现实：中央石门悬浮张开、两色气流在门内对撞。
 */
import { addBaseAtmosphere } from './_atmo.js';

function makeBuild(boss) {
  return function build(ctx) {
    const { palette, K } = ctx;
    ctx.atmosphere({
      bg: palette.skyBot,
      fogColor: palette.fog,
      fogDensity: boss ? 0.02 : 0.023,
      ambient: palette.ambient,
      ambientIntensity: 1.0,
      dirColor: 0xffffff,
      dirIntensity: 0.5,
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
        opacity: i === 0 ? 0.8 : 0.5, color: 0xffffff, rotationY: (i - 1.5) * 0.1,
      }));
    }
  }
    ctx.add(K.ground({ y: -10, color: 0x0a0a10, texture: K.matTexture('ink', '#0a0a10') }));
    // 两侧分色地面（超现实：路面色块悬浮）
    for (const [side, color] of [[-1, 0x9fc0ff], [1, 0xffb060]]) {
      const strip = K.box(16, 0.06, 120, color, { transparent: true, opacity: boss ? 0.1 : 0.06 });
      strip.position.set(side * 11, -9.6, -60);
      ctx.add(strip);
    }
    // 两侧分色鸟居：左冷右暖
    for (let i = 0; i < (boss ? 10 : 8); i++) {
      const side = i % 2 ? 1 : -1;
      const t = K.torii({
        scale: 0.8 + K.hash01(i * 13) * 0.35,
        color: side < 0 ? 0x587890 : 0x9a5020,
        dark: palette.ink,
      });
      t.position.set(side * (7 + K.hash01(i * 17) * 7), 0, -16 - i * 13);
      if (i % 3 === 2) t.rotation.z = Math.PI;
      ctx.add(t);
      ctx.animate(t, { bob: { amp: 0.08, speed: 0.4, phase: i } });
    }
    // 中央石门（超现实：张开 + 悬浮）
    const gate = K.gate({ w: 10, h: 15, color: 0x0c0a0e, accent: boss ? 0xffcf8a : 0x9ab0c8 });
    gate.position.set(0, boss ? 1 : -1, boss ? -40 : -52);
    ctx.add(gate);
    ctx.animate(gate, { bob: { amp: 0.18, speed: 0.35 } });
    // 门内双色光片
    for (const [side, color] of [[-1, 0x9fc0ff], [1, 0xffb060]]) {
      const ray = K.panel(null, {
        x: side * 2.0, y: 7, z: -44, w: 4, h: 22, color, opacity: boss ? 0.18 : 0.1,
      });
      ctx.add(ray);
      ctx.animate(ray, { pulse: { amp: 0.08, speed: 1.4, phase: side } });
    }
    // 分叉踏石
    ctx.field((i) => K.box(1.6, 0.25, 1.2, 0x3a3a42, { transparent: true, opacity: 0.5 }),
      { count: 18, zNear: -14, zFar: -90, xRange: 20, yRange: 1, speedMul: 1.2 });
    // A/B 幢幡
    for (const [side, text, color] of [[-1, 'A', '#9fc0ff'], [1, 'B', '#ffb060']]) {
      const sp = ctx.textSprite(text, {
        x: side * 8, y: 12, z: -26, w: 3, h: 4,
        fill: color, bg: 'rgba(6,8,14,0.35)', opacity: 0.85,
      });
      ctx.add(sp);
    }
    // 左侧雪 / 右侧火花，粒子位置混合表现两色
    ctx.points({
      count: boss ? 60 : 40, color: 0xbfd8ff, size: 0.15, type: 'snow',
      xRange: 30, yRange: 20, zNear: -2, zFar: -60, speed: 1.2, seed: 4,
    });
    ctx.points({
      count: boss ? 60 : 40, color: 0xffa860, size: 0.18, type: 'spark',
      xRange: 30, yRange: 20, zNear: -2, zFar: -60, speed: 2.4, seed: 6,
    });
    addBaseAtmosphere(ctx, {fogColor: '#8a90a8', cloudColor: '#b8b8c8', floorColor: '#a8a8b8', fogAlpha: 0.18, cloudAlpha: 0.12, floorAlpha: 0.1, floraAlpha: 0.45});
    ctx.setSpeed(boss ? 15 : 11);
    ctx.setSway(0.7, 0.3);
  };
}

export const mid = makeBuild(false);
export const boss = makeBuild(true);
