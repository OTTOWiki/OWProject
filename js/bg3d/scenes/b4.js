/**
 * B线第4面「赌人时尚 · 独轮创车冲击」3D 舞台。
 *
 * 方向（docs/level-background-redesign.md §8）：持续深入的 3D 场景 + Billboard 绘卷 + 真 3D + 超现实。
 * 剧情锚点：独轮碾过螺旋的街巷；狂妄的哲思与「创」字诀如潮水漫过脚踝。
 * mid：血色街巷向雾中收束，巨轮自右前方碾压而来，荆棘从血土里暴长，
 *      「创」字幡与骨白赌骰悬浮半空（超现实：骰子逆重力漂浮、轮辐悬空自转）。
 * boss：巨轮加速交错、第二只倒转巨轮升起、荆棘暴长、血色光柱与纸钱风暴。
 * 构图：中心 60% 只留低对比的纵深街道，亮光全部摆在边缘/近景物。
 */
import { addFogBillboards, addEdgeFlora } from './_atmo.js';

const FONT = 'bold 40px "Noto Serif CJK SC", "Microsoft YaHei", serif';
const TAU = Math.PI * 2;

/** 单字 Billboard：字占满 512x256 画布，sprite 用 2:1 宽高保持字形方正 */
function charSprite(ctx, text, { x = 0, y = 0, z = -20, h = 3, fill = '#ffd9c8', opacity = 0.95 } = {}) {
  return ctx.textSprite(text, {
    x, y, z, w: h * 2, h, fill, bg: 'rgba(0,0,0,0)',
    font: 'bold 170px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity,
  });
}

/* ------------------------------------------------------------------ *
 * 背景：深处绘卷 + 血月
 * ------------------------------------------------------------------ */

function addPaintedSky(ctx, boss) {
  const K = ctx.K;
  const art = ctx.plateTexture();
  if (!art) return;
  const full = ctx.plateCrop(0, 0, 1, 1);
  if (full) {
    ctx.add(K.panel(full, {
      x: 0, y: 4, z: -150, w: 220, h: 280,
      color: boss ? 0xb04048 : 0x8a3038, opacity: boss ? 0.7 : 0.58,
    }));
  }
  // 超现实：同轴绘卷被裁成几幅挂在两侧深处，错落成「画中画」
  const crops = [
    [0.02, 0.04, 0.5, 0.52],
    [0.46, 0.1, 0.52, 0.52],
    [0.08, 0.5, 0.52, 0.46],
    [0.5, 0.5, 0.5, 0.46],
  ];
  for (let i = 0; i < crops.length; i++) {
    const tex = ctx.plateCrop(...crops[i]);
    if (!tex) continue;
    const side = i % 2 ? 1 : -1;
    ctx.add(K.panel(tex, {
      x: side * (22 + (i > 1 ? 8 : 0)),
      y: 9 + (i % 2 ? 4 : -1) + i * 2,
      z: -92 - i * 16,
      w: 34 + i * 4, h: 44 + i * 5,
      color: 0xa85050,
      opacity: 0.34,
      rotationY: side * -0.6,
    }));
  }
}

function addBloodMoon(ctx, boss) {
  const K = ctx.K;
  const moon = K.sphere(boss ? 10 : 8.4, boss ? 0xc03a44 : 0x9a2c36, { emissiveMix: 0.7 });
  moon.position.set(26, boss ? 26 : 23, -138);
  ctx.add(moon);
  const halo = K.ring(boss ? 11 : 9.2, boss ? 12.6 : 10.6, 0xc0263a, { opacity: 0.32 });
  halo.position.copy(moon.position);
  ctx.add(halo);
  ctx.animate(halo, { pulse: { amp: 0.05, speed: 0.7, phase: 0.5 }, spinZ: 0.05 });
  const halo2 = K.ring(boss ? 13.6 : 12, boss ? 14.2 : 12.6, 0x6a1018, { opacity: 0.2 });
  halo2.position.copy(moon.position);
  ctx.add(halo2);
  ctx.animate(halo2, { spinZ: -0.035 });
}

/* ------------------------------------------------------------------ *
 * 空间：血色街巷 / 街灯 / 断楼
 * ------------------------------------------------------------------ */

/** 发光长条（路面标线/湿反光） */
function glowStrip(ctx, color, w, h, d, opacity) {
  const K = ctx.K;
  const m = K.box(w, h, d, color, {
    transparent: true, opacity, blending: ctx.THREE.AdditiveBlending, depthWrite: false,
  });
  return m;
}

function addStreet(ctx, boss) {
  const K = ctx.K;
  // 血土地面（和纸材质染色；缺失时纯色）
  const floorTex = ctx.matTexture('washi', boss ? '#5a1c24' : '#4a161e');
  ctx.add(K.ground({
    y: -10, color: 0x8a6a6a, texture: floorTex || null, opacity: 0.95,
  }));
  // 街心：向深处收束的两道血光路缘
  for (const side of [-1, 1]) {
    const edge = glowStrip(ctx, side < 0 ? 0x8a1822 : 0x7a121e, 0.34, 0.06, 108, 0.5);
    edge.position.set(side * 4.4, -9.82, -58);
    edge.rotation.y = side * 0.058;
    ctx.add(edge);
    const edge2 = glowStrip(ctx, 0xff6b35, 0.1, 0.04, 108, 0.24);
    edge2.position.set(side * 4.4, -9.78, -58);
    edge2.rotation.y = side * 0.058;
    ctx.add(edge2);
  }
  // 横向石阶/路缝：由近及远变密，形成深入节奏
  const rows = [12, 18, 25, 33, 42, 53, 66, 82, 100];
  for (let i = 0; i < rows.length; i++) {
    const z = -rows[i];
    const strip = K.box(21 + i * 4, 0.05, 0.5, 0x2a080c, { transparent: true, opacity: 0.5 });
    strip.position.set(0, -9.8, z);
    ctx.add(strip);
    const line = glowStrip(ctx, 0x5a0e16, 21 + i * 4, 0.04, 0.12, 0.3);
    line.position.set(0, -9.77, z + 0.1);
    ctx.add(line);
  }
  // 两侧残灯/断柱：近景只露在边缘
  for (const side of [-1, 1]) {
    for (let i = 0; i < (boss ? 5 : 4); i++) {
      const z = -17 - i * 13;
      const h = 7 + K.hash01(side * 17 + i * 29) * 5;
      const post = K.cylinder(0.12, 0.24, h, 0x24060a, { seg: 6 });
      post.position.set(side * (7.4 + i * 0.9), -10 + h / 2, z);
      post.rotation.z = side * (0.06 + K.hash01(i * 13) * 0.14);
      ctx.add(post);
      const arm = K.box(1.4, 0.12, 0.12, 0x24060a);
      arm.position.set(side * (6.7 + i * 0.9), -10 + h, z);
      arm.rotation.z = side * 0.22;
      ctx.add(arm);
      const lamp = K.sphere(0.3, i % 2 ? 0xffb07a : 0xff6b35, { emissiveMix: 1.1 });
      lamp.position.set(side * (6.1 + i * 0.9), -10 + h - 0.4, z);
      ctx.add(lamp);
      const halo = K.ring(0.42, 0.72, i % 2 ? 0xffb07a : 0xff6b35, { opacity: 0.26 });
      halo.position.copy(lamp.position);
      ctx.add(halo);
    }
  }
  // 街边断楼：远景两侧的低矮血色楼群（真 3D 盒子 + 亮窗）
  ctx.field((i) => {
    const g = new ctx.THREE.Group();
    const hh = 3.2 + K.hash01(i * 19 + 3) * 5;
    const bw = 2.2 + K.hash01(i * 23 + 5) * 2.4;
    const body = K.box(bw, hh, 1.6, 0x2a0810, { emissiveMix: 0.5 });
    body.position.y = hh / 2;
    g.add(body);
    const roof = K.box(bw * 1.15, 0.16, 1.9, 0x1a0508);
    roof.position.y = hh;
    g.add(roof);
    const wins = 2 + ((K.hash01(i * 29 + 7) * 3) | 0);
    for (let k = 0; k < wins; k++) {
      const win = K.box(0.3, 0.4, 0.06, k % 2 ? 0xff8a5a : 0x6a1018, { emissiveMix: 1 });
      win.position.set(
        (K.hash01(i * 31 + k * 7) - 0.5) * bw * 0.7,
        hh * (0.25 + K.hash01(i * 37 + k * 11) * 0.55),
        0.84,
      );
      g.add(win);
    }
    return g;
  }, {
    count: boss ? 10 : 7, zNear: -34, zFar: -128, xRange: 66, yRange: 0,
    y: -10, xAbsMin: 13, speedMul: 0.55, jitter: 0.15,
  });
  // 路面血迹/碎石（低矮，避开中心亮部）
  for (let i = 0; i < 18; i++) {
    const rock = K.box(
      0.2 + K.hash01(i * 7) * 0.7, 0.1 + K.hash01(i * 11) * 0.28, 0.2 + K.hash01(i * 13) * 0.8,
      i % 6 === 0 ? 0x9a8a76 : 0x2a080c, { transparent: true, opacity: 0.6 },
    );
    rock.position.set(
      (K.hash01(i * 17) - 0.5) * 17,
      -9.72,
      -15 - K.hash01(i * 19) * 70,
    );
    rock.rotation.y = K.hash01(i * 23) * TAU;
    ctx.add(rock);
  }
}

/** 中央断裂的轮架牌坊：巨轮曾经的门，柱子与横梁半悬（超现实） */
function addWheelGate(ctx, boss) {
  const K = ctx.K;
  const g = new ctx.THREE.Group();
  for (const side of [-1, 1]) {
    const leg = K.box(0.7, 11, 0.7, 0x24060a, { emissiveMix: 0.3 });
    leg.position.set(side * 5.6, 5.5, 0);
    leg.rotation.z = side * -0.06;
    g.add(leg);
    const brace = K.box(2.4, 0.28, 0.3, 0x1a0408);
    brace.position.set(side * 4.4, 9.2, 0);
    brace.rotation.z = side * 0.55;
    g.add(brace);
    const lamp = K.sphere(0.26, 0xff6b35, { emissiveMix: 1.1 });
    lamp.position.set(side * 5.2, 10.6, 0.4);
    g.add(lamp);
  }
  // 断梁：左侧尚连、右侧下垂
  const beam = K.box(11.8, 0.6, 0.6, 0x2a080c, { emissiveMix: 0.35 });
  beam.position.set(-0.4, 11.1, 0);
  beam.rotation.z = boss ? -0.16 : -0.07;
  g.add(beam);
  const beam2 = K.box(4.6, 0.5, 0.5, 0x24060a);
  beam2.position.set(4.9, 9.6, 0);
  beam2.rotation.z = -0.5;
  g.add(beam2);
  // 悬吊的轮心残骸
  const hang = K.cylinder(0.03, 0.03, 2.6, 0x1a0408);
  hang.position.set(-0.4, 9.6, 0);
  g.add(hang);
  const hub = K.torus(0.9, 0.16, 0x8a1420, { emissiveMix: 0.8 });
  hub.position.set(-0.4, 8.1, 0);
  g.add(hub);
  ctx.animate(hub, { spinZ: 0.3 });
  g.position.set(0, -10, boss ? -40 : -46);
  ctx.add(g);
}

/* ------------------------------------------------------------------ *
 * 真 3D 主体：巨轮 / 赌骰 / 荆棘 / 「创」幡
 * ------------------------------------------------------------------ */

function makeWheel(ctx, { big = false, boss = false } = {}) {
  const K = ctx.K;
  const g = new ctx.THREE.Group();
  const r = big ? 6.6 : 4.4;
  // 轮辋（双圈 + 齿）
  const rim = K.torus(r, big ? 0.5 : 0.34, boss ? 0xa02030 : 0x7a1420, { emissiveMix: 0.8 });
  g.add(rim);
  const rim2 = K.torus(r * 0.78, big ? 0.16 : 0.11, 0xff6b35, { emissiveMix: 1 });
  g.add(rim2);
  // 轮辐
  for (let i = 0; i < 8; i++) {
    const spoke = K.box(big ? 0.3 : 0.2, r * 1.72, big ? 0.3 : 0.2, 0x5a0c14, { emissiveMix: 0.5 });
    spoke.rotation.z = (i / 8) * TAU;
    g.add(spoke);
  }
  // 棘齿
  const spikes = big ? 14 : 9;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * TAU;
    const sp = K.cone(big ? 0.42 : 0.3, big ? 1.6 : 1.1, 0x24060a, { seg: 4, emissiveMix: 0.3 });
    sp.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
    sp.rotation.z = a - Math.PI / 2;
    g.add(sp);
  }
  // 轮心赤光
  const core = K.sphere(big ? 1 : 0.66, boss ? 0xff3a4a : 0xc0263a, { emissiveMix: 1.2 });
  core.position.z = 0.4;
  g.add(core);
  const halo = K.ring(big ? 1.5 : 1, big ? 1.9 : 1.3, 0xff6b35, { opacity: 0.32 });
  halo.position.z = 0.5;
  g.add(halo);
  ctx.animate(halo, { pulse: { amp: 0.12, speed: big ? 1.4 : 0.9 } });
  // 轮缘火星
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU + 0.3;
    const ember = K.sphere(0.13, 0xff6b35, { emissiveMix: 1.2 });
    ember.position.set(Math.cos(a) * r * 0.94, Math.sin(a) * r * 0.94, 0.2);
    g.add(ember);
  }
  return g;
}

function addWheels(ctx, boss) {
  const K = ctx.K;
  // 主角巨轮：右前方压过来（超现实：悬空、倒转）
  const hero = makeWheel(ctx, { big: true, boss });
  hero.position.set(12.6, boss ? 8 : 6.4, boss ? -21 : -25);
  hero.rotation.set(0.12, -0.34, boss ? 0.22 : 0.14);
  ctx.add(hero);
  ctx.animate(hero, { spinZ: boss ? -1.2 : -0.55, bob: { amp: 0.12, speed: 0.5 } });
  // 第二只巨轮：boss 时从左侧升起、反向转
  if (boss) {
    const hero2 = makeWheel(ctx, { big: true, boss });
    hero2.position.set(-12.8, 9.6, -25);
    hero2.rotation.set(-0.16, 0.4, -0.18);
    ctx.add(hero2);
    ctx.animate(hero2, { spinZ: 1.35, bob: { amp: 0.16, speed: 0.6, phase: 1.4 } });
  }
  // 轮群逆流（不断深入的主体运动）：深处小轮逐渐放大并滑向两侧
  ctx.field((i) => {
    const w = makeWheel(ctx, { big: i % 4 === 1, boss });
    w.rotation.set(
      (K.hash01(i * 31 + 5) - 0.5) * 0.4,
      (K.hash01(i * 37 + 9) - 0.5) * 0.8,
      (K.hash01(i * 41 + 3) - 0.5) * 0.4,
    );
    ctx.animate(w, { spinZ: (K.hash01(i * 43 + 7) > 0.5 ? 1 : -1) * (0.6 + K.hash01(i * 47) * 0.9) });
    return w;
  }, {
    count: boss ? 5 : 4, zNear: -24, zFar: -112,
    xRange: 42, yRange: 13, xAbsMin: 7, speedMul: boss ? 1.5 : 1.15, jitter: 0.2,
  });
}

/** 骨白赌骰：逆重力漂浮 + 缓慢自转（赌人时尚的荒诞符号） */
function addDice(ctx, boss) {
  const K = ctx.K;
  const build = (size) => {
    const g = new ctx.THREE.Group();
    g.add(K.box(size, size, size, 0xc8b8a0, { emissiveMix: 0.32 }));
    const pip = size * 0.1;
    const f = size / 2 + pip * 0.25;
    const faces = [
      { axis: 'z', sign: 1, pts: [[0, 0]] },
      { axis: 'z', sign: -1, pts: [[-0.24, -0.24], [0.24, 0.24]] },
      { axis: 'x', sign: 1, pts: [[-0.26, 0.26], [0, 0], [0.26, -0.26]] },
    ];
    for (const face of faces) {
      for (const [a, b] of face.pts) {
        const dot = K.sphere(pip * 1.5, 0xb02030, { emissiveMix: 0.9 });
        if (face.axis === 'z') dot.position.set(a * size, b * size, face.sign * f);
        else dot.position.set(face.sign * f, b * size, a * size);
        g.add(dot);
      }
    }
    const edge = K.box(size * 1.01, size * 0.05, size * 1.01, 0x7a5a48, { transparent: true, opacity: 0.35 });
    edge.position.y = size * 0.42;
    g.add(edge);
    return g;
  };
  const defs = boss
    ? [
      { x: -8.6, y: 13.4, z: -30, s: 2.4, spin: [0.22, 0.3, 0.1] },
      { x: 8.2, y: 11.6, z: -22, s: 1.5, spin: [-0.3, 0.24, 0.18] },
      { x: 7.4, y: 16.2, z: -52, s: 3.0, spin: [0.16, -0.2, 0.08] },
      { x: -7.8, y: 5.2, z: -44, s: 1.4, spin: [0.34, 0.3, -0.22] },
    ]
    : [
      { x: -9.2, y: 12.6, z: -34, s: 2.2, spin: [0.2, 0.32, 0.12] },
      { x: 8.4, y: 14.4, z: -46, s: 1.7, spin: [-0.28, 0.22, 0.2] },
      { x: 7.6, y: 6.2, z: -24, s: 1.3, spin: [0.24, -0.26, 0.16] },
    ];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    const die = build(d.s);
    die.position.set(d.x, d.y, d.z);
    die.rotation.set(K.hash01(i * 7) * TAU, K.hash01(i * 11) * TAU, K.hash01(i * 13) * TAU);
    ctx.add(die);
    ctx.animate(die, {
      spinX: d.spin[0], spinY: d.spin[1], spinZ: d.spin[2],
      bob: { amp: 0.2, speed: 0.36, phase: i * 1.3 },
    });
  }
}

/** 荆棘：左右近景暴长，boss 更高更密并向街心探出 */
function addThorns(ctx, boss) {
  const K = ctx.K;
  for (const side of [-1, 1]) {
    const g = new ctx.THREE.Group();
    const nodes = boss ? 6 : 4;
    for (let i = 0; i < nodes; i++) {
      const s = i * 31 + (side > 0 ? 271 : 0);
      const hh = 3.6 + K.hash01(s + 3) * (boss ? 6.4 : 4.2);
      const lean = 0.55 + K.hash01(s + 7) * (boss ? 1.1 : 0.8);
      const z0 = -K.hash01(s + 13) * 3;
      const vine = K.cylinder(0.07, 0.22, hh, 0x2a080c, { seg: 5, emissiveMix: 0.3 });
      vine.position.set(K.hash01(s + 11) * 1.6 * side, hh / 2 - 0.4, z0);
      vine.rotation.z = side * -lean;
      g.add(vine);
      for (let k = 0; k < 3; k++) {
        const spike = K.cone(0.1 + K.hash01(s + 17 + k) * 0.12, 0.9 + K.hash01(s + 19 + k) * 0.9, 0x3a0a12, { seg: 4 });
        spike.position.set(
          side * (0.2 + lean * hh * 0.52 * (k / 3)),
          hh * (0.3 + k * 0.24) - 0.4,
          z0 + 0.1,
        );
        spike.rotation.z = side * -(1.05 + k * 0.16);
        g.add(spike);
      }
      const tip = K.sphere(0.1, 0xc0263a, { emissiveMix: 1 });
      tip.position.set(side * lean * hh * 0.6, hh * 0.92, z0);
      g.add(tip);
    }
    g.position.set(side * 5.6, -9.8, -14);
    g.scale.setScalar(boss ? 1.3 : 0.95);
    g.rotation.y = side * -0.2;
    ctx.add(g);
  }
  // boss：血土裂隙里刺出的尖刺阵
  if (boss) {
    for (let i = 0; i < 12; i++) {
      const hgt = 2.4 + K.hash01(i * 17) * 3.4;
      const sp = K.cone(0.2 + K.hash01(i * 13) * 0.26, hgt, 0x2a080c, { seg: 4, emissiveMix: 0.3 });
      const side = i % 2 ? 1 : -1;
      sp.position.set(side * (4 + K.hash01(i * 19) * 5), -10 + hgt / 2, -16 - K.hash01(i * 23) * 46);
      sp.rotation.z = side * 0.28;
      ctx.add(sp);
      const tip = K.sphere(0.1, 0x9a1826, { emissiveMix: 1 });
      tip.position.copy(sp.position);
      tip.position.y += hgt * 0.48;
      ctx.add(tip);
    }
  }
}

/** 「创」字幡（Billboard 字形 + 3D 布面）+ 雾顶巨字 */
function addBanners(ctx, boss) {
  const K = ctx.K;
  const defs = boss
    ? [
      { x: 8.4, y: 9.4, z: -24, w: 3.8, h: 5.4 },
      { x: -8.6, y: 6.6, z: -36, w: 3.4, h: 4.8 },
      { x: 6.8, y: 15.2, z: -58, w: 3.2, h: 4.4 },
      { x: -6.4, y: 11.8, z: -70, w: 3, h: 4 },
    ]
    : [
      { x: 8.6, y: 8.8, z: -27, w: 3.6, h: 5.2 },
      { x: -8.8, y: 5.4, z: -42, w: 3.2, h: 4.6 },
    ];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    const cloth = K.box(d.w * 0.92, d.h * 0.92, 0.08, 0x4a0810, { emissiveMix: 0.5 });
    cloth.position.set(d.x, d.y, d.z);
    cloth.rotation.y = (i % 2 ? -1 : 1) * 0.14;
    ctx.add(cloth);
    const sp = charSprite(ctx, '创', {
      x: d.x, y: d.y, z: d.z + 0.14, h: d.h * 1.35,
      fill: i === 0 ? '#ffd9c8' : '#ffb199', opacity: 0.96,
    });
    if (sp) {
      ctx.add(sp);
      ctx.animate(sp, { pulse: { amp: 0.04, speed: 0.7, phase: i * 1.7 } });
    }
    const pole = K.cylinder(0.05, 0.08, d.h * 1.4, 0x24060a, { seg: 5 });
    pole.position.set(d.x + (i % 2 ? -1 : 1) * d.w * 0.58, d.y - d.h * 0.12, d.z);
    ctx.add(pole);
  }
  // 超现实：雾顶的巨大「创」字（低亮度，只在边缘）
  const big = charSprite(ctx, '创', {
    x: boss ? 0 : -1, y: boss ? 21 : 19, z: -86, h: boss ? 18 : 15,
    fill: 'rgba(255,96,72,0.5)', opacity: boss ? 0.3 : 0.22,
  });
  if (big) {
    ctx.add(big);
    ctx.animate(big, { spinZ: 0.04, pulse: { amp: 0.05, speed: 0.4 } });
  }
}

/* ------------------------------------------------------------------ *
 * 空气：火星 / 纸钱 / 光柱
 * ------------------------------------------------------------------ */

function addParticles(ctx, boss) {
  const K = ctx.K;
  // 轮缘火星逆流
  ctx.points({
    count: boss ? 48 : 34, color: 0xff7a3a, size: 0.17, type: 'spark',
    xRange: 38, yRange: 28, zNear: -2, zFar: -60, speed: boss ? 4.4 : 3.2, seed: 21,
  });
  // 纸钱/骨屑
  ctx.points({
    count: boss ? 44 : 30, color: 0xd9c8b0, size: 0.24, type: 'paper',
    xRange: 38, yRange: 26, zNear: -3, zFar: -68, speed: 2.2, seed: 23,
  });
  // 深层血雾颗粒（填充走廊，不压中心亮部）
  ctx.points({
    count: boss ? 28 : 20, color: 0x7a1420, size: 0.62, type: 'spark',
    xRange: 44, yRange: 30, zNear: -26, zFar: -110, speed: 1.1, seed: 27,
  });
}

function addBloodPillars(ctx, boss) {
  if (!boss) return;
  const K = ctx.K;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const beam = K.box(1.2 + i * 0.8, 34, 0.2, 0x6a0e1a, {
        transparent: true, opacity: 0.16 - i * 0.04, blending: ctx.THREE.AdditiveBlending, depthWrite: false,
      });
      beam.position.set(side * (10.6 + i * 2), 6, -38 - i * 10);
      beam.rotation.z = side * -0.12;
      ctx.add(beam);
    }
  }
}

/** 超现实：雾中的巨型棘轮月轮（远景剪影地标） */
function addGiantWheel(ctx, boss) {
  const K = ctx.K;
  const g = new ctx.THREE.Group();
  const r = boss ? 21 : 17;
  const color = boss ? 0x8a1824 : 0x5a0e18;
  g.add(K.torus(r, boss ? 1.1 : 0.9, color, { radial: 5, tubular: 48, emissiveMix: 0.7 }));
  g.add(K.torus(r * 0.62, boss ? 0.5 : 0.4, boss ? 0xa02030 : 0x4a0a12, { radial: 5, tubular: 40, emissiveMix: 0.6 }));
  for (let i = 0; i < 10; i++) {
    const spoke = K.box(boss ? 0.9 : 0.7, r * 1.7, 0.5, color, { emissiveMix: 0.5 });
    spoke.rotation.z = (i / 10) * TAU;
    g.add(spoke);
  }
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU;
    const sp = K.cone(boss ? 1.4 : 1.1, boss ? 4.2 : 3.4, color, { seg: 4, emissiveMix: 0.6 });
    sp.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
    sp.rotation.z = a - Math.PI / 2;
    g.add(sp);
  }
  const core = K.ring(r * 0.12, r * 0.2, 0xff6b35, { opacity: 0.3 });
  g.add(core);
  ctx.animate(core, { pulse: { amp: 0.08, speed: 0.5 } });
  g.position.set(-22, boss ? 22 : 20, boss ? -122 : -132);
  g.rotation.z = 0.25;
  ctx.add(g);
  ctx.animate(g, { spinZ: boss ? 0.05 : 0.03 });
}

/* ------------------------------------------------------------------ *
 * Builder
 * ------------------------------------------------------------------ */

function build(ctx, boss) {
  const { palette } = ctx;
  ctx.atmosphere({
    fogColor: boss ? 0x22060a : 0x1c0509,
    fogDensity: boss ? 0.018 : 0.017,
    ambient: 0x9a8a90,
    ambientIntensity: boss ? 1.5 : 1.35,
    dirColor: boss ? 0xff5a60 : 0xffa070,
    dirIntensity: boss ? 1.25 : 1.05,
  });
  addPaintedSky(ctx, boss);
  addBloodMoon(ctx, boss);
  addGiantWheel(ctx, boss);
  addStreet(ctx, boss);
  addWheelGate(ctx, boss);
  addWheels(ctx, boss);
  addThorns(ctx, boss);
  addBanners(ctx, boss);
  addDice(ctx, boss);
  addBloodPillars(ctx, boss);
  addParticles(ctx, boss);
  addFogBillboards(ctx, {
    color: boss ? '#8a2a34' : '#6a2028', alpha: boss ? 0.26 : 0.2, count: 5,
    y: boss ? 1 : 0, xSpread: 44, zNear: -24, zFar: -140, w: 110, h: 30,
  });
  addEdgeFlora(ctx, { grassColor: '#20060a', plumColor: '#2a0810', alpha: boss ? 0.75 : 0.6, y: -6.5 });
  ctx.setSpeed(boss ? 16 : 10);
  ctx.setSway(boss ? 0.85 : 0.55, boss ? 0.45 : 0.3);
}

export function mid(ctx) {
  build(ctx, false);
}

export function boss(ctx) {
  build(ctx, true);
}
