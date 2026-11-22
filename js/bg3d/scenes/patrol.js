/**
 * 中立拦截「全域巡查姬 · 404」3D 舞台（单 mode）。
 * 黑红警戒荒原：监视塔与旋转探照灯、404 路障、悬空监视之眼、红雨与故障条。
 * 超现实：探照灯扫过天空时照出悬浮的「404」文字。
 */
import { addBaseAtmosphere } from './_atmo.js';

export function mid(ctx) {
  const { palette, K } = ctx;
  ctx.atmosphere({
    bg: palette.skyBot,
    fogColor: palette.fog,
    fogDensity: 0.03,
    ambient: palette.ambient,
    ambientIntensity: 0.9,
    dirColor: palette.accent,
    dirIntensity: 0.8,
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
        opacity: i === 0 ? 0.8 : 0.5, color: 0xffb0b0, rotationY: (i - 1.5) * 0.1,
      }));
    }
  }
  ctx.add(K.ground({ y: -10, color: 0x140406, texture: K.matTexture('ink', '#140406') }));
  // 监视塔（近景，重复逼近）
  ctx.field((i) => {
    const g = new ctx.THREE.Group();
    const legL = K.box(0.5, 12, 0.5, 0x1a0a0e);
    legL.position.set(-1.6, 6, 0);
    const legR = legL.clone();
    legR.position.x = 1.6;
    const cabin = K.box(4.2, 2.4, 4.2, 0x2a1014);
    cabin.position.y = 12.8;
    const roof = K.box(4.8, 0.4, 4.8, 0x120608);
    roof.position.y = 14.2;
    const lamp = K.sphere(0.5, 0xffd166, { transparent: true, opacity: 0.9 });
    lamp.position.y = 15;
    g.add(legL, legR, cabin, roof, lamp);
    // 探照灯锥
    const cone = new ctx.THREE.Mesh(
      new ctx.THREE.ConeGeometry(2.6, 26, 12, 1, true),
      new ctx.THREE.MeshBasicMaterial({
        color: 0xff6b6b, transparent: true, opacity: 0.1, side: ctx.THREE.DoubleSide,
        depthWrite: false, blending: ctx.THREE.AdditiveBlending, fog: true,
      }),
    );
    cone.rotation.x = Math.PI * 0.42;
    cone.position.set(0, 15, -10);
    const pivot = new ctx.THREE.Group();
    pivot.position.set(0, 0, 0);
    pivot.add(cone);
    g.add(pivot);
    ctx.animate(pivot, { spinY: 0.55 + i * 0.08 });
    g.position.y = 2;
    return g;
  }, { count: 2, zNear: -34, zFar: -100, xRange: 20, yRange: 0, speedMul: 0.45 });
  // 悬浮监视之眼
  const eye = K.eye({ scale: 1.6, color: 0xff5566, iris: 0xffd0d4, pupil: 0x1a0204 });
  eye.position.set(6, 15, -48);
  ctx.add(eye);
  ctx.animate(eye, { bob: { amp: 0.4, speed: 0.6 } });
  // 404 路障/幢幡
  for (let i = 0; i < 4; i++) {
    const sp = ctx.textSprite('404', {
      x: i % 2 ? 7 : -7, y: 4 + i * 2.4, z: -14 - i * 18,
      w: 5, h: 2.4, fill: '#ffd166', bg: 'rgba(20,4,6,0.45)', opacity: 0.9,
    });
    ctx.add(sp);
  }
  // 警戒条（黄黑，低矮且靠两侧）
  ctx.field((i) => {
    const b = K.box(3.2, 0.8, 0.2, i % 2 ? 0xffd166 : 0x140608);
    b.rotation.z = 0.4;
    return b;
  }, { count: 5, zNear: -16, zFar: -70, xRange: 26, yRange: 0, speedMul: 1.1 });
  // 地面红雨
  ctx.points({
    count: 110, color: 0xff4a5a, size: 0.16, type: 'rain',
    xRange: 30, yRange: 24, zNear: -2, zFar: -60, speed: 5, seed: 9,
  });
  ctx.points({
    count: 30, color: 0xffb199, size: 0.24, type: 'spark',
    xRange: 26, yRange: 18, zNear: -4, zFar: -60, speed: 3, seed: 11,
  });
  addBaseAtmosphere(ctx, {fogColor: '#b86a70', cloudColor: '#c08080', floorColor: '#a05a60', fogAlpha: 0.24, cloudAlpha: 0.15, floorAlpha: 0.12, floraAlpha: 0.5});
  ctx.setSpeed(13);
  ctx.setSway(0.6, 0.4);
}
