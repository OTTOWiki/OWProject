/**
 * B线第5面「棍电噢哆 · 推退辩论战」3D 舞台。
 *
 * 方向（docs §8）：持续深入的 3D 场景 + Billboard 绘卷 + 真 3D + 超现实。
 * 剧情锚点：暗巷霓虹一明一灭，破皮鞋叩地有声；推诿、反问与甩锅谱成一曲傲娇的戏谑。
 * mid：雨夜霓虹暗巷——两侧木楼与亮窗在雾中后退，灯笼与招牌悬浮，积水倒映霓虹。
 * boss：招牌「世界第一等」全亮、霓虹更密、雨势加大，招牌脱离墙体漂浮（超现实）。
 * 构图：中心留出湿街纵深，亮招牌/灯笼全在两侧与顶部边缘。
 */
import { addFogBillboards, addFloorArt, addEdgeFlora } from './_atmo.js';

const TAU = Math.PI * 2;

/** 单字招牌 Billboard：字占满画布，2:1 sprite 保持方正（霓虹灯管感） */
function charSprite(ctx, text, { x = 0, y = 0, z = -20, h = 2.6, fill = '#ffb15c', opacity = 0.95 } = {}) {
  return ctx.textSprite(text, {
    x, y, z, w: h * 2, h, fill, bg: 'rgba(0,0,0,0)',
    font: 'bold 170px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity,
  });
}

/** 横排文字 Billboard（boss 大招牌） */
function lineSprite(ctx, text, { x = 0, y = 0, z = -50, h = 5, fill = '#ffd0a0', opacity = 0.95 } = {}) {
  return ctx.textSprite(text, {
    x, y, z, w: h * 2, h, fill, bg: 'rgba(0,0,0,0)',
    font: 'bold 88px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity,
  });
}

/** 发光条（路面湿反光/霓虹管） */
function glowBox(ctx, color, w, h, d, opacity) {
  return ctx.K.box(w, h, d, color, {
    transparent: true, opacity, blending: ctx.THREE.AdditiveBlending, depthWrite: false,
  });
}

/* ------------------------------------------------------------------ *
 * 背景：绘卷裁片 + 夜雨天空
 * ------------------------------------------------------------------ */

function addRainSky(ctx, boss) {
  const K = ctx.K;
  const art = ctx.plateTexture();
  if (!art) return;
  const full = ctx.plateCrop(0, 0, 1, 1);
  if (full) {
    ctx.add(K.panel(full, {
      x: 0, y: 8, z: -150, w: 220, h: 280,
      color: boss ? 0x6a88b8 : 0x4a6888, opacity: boss ? 0.66 : 0.55,
    }));
  }
  const crops = [[0.02, 0.04, 0.5, 0.5], [0.48, 0.1, 0.5, 0.52], [0.1, 0.52, 0.52, 0.44]];
  for (let i = 0; i < crops.length; i++) {
    const tex = ctx.plateCrop(...crops[i]);
    if (!tex) continue;
    const side = i % 2 ? 1 : -1;
    ctx.add(K.panel(tex, {
      x: side * (24 + i * 6), y: 12 + i * 3, z: -96 - i * 18,
      w: 32 + i * 4, h: 42 + i * 5, color: 0x6a8ab0, opacity: 0.3, rotationY: side * -0.55,
    }));
  }
}

/* ------------------------------------------------------------------ *
 * 空间：雨巷木楼 / 霓虹招牌 / 电线杆 / 灯笼 / 积水
 * ------------------------------------------------------------------ */

function addAlley(ctx, boss) {
  const K = ctx.K;
  // 湿街地面
  const floorTex = ctx.matTexture('wave', '#16202c') || ctx.matTexture('ink', '#16202c');
  ctx.add(K.ground({ y: -10, color: 0x6a7a8a, texture: floorTex || null, opacity: 0.9 }));
  // 街心水光：两条向深处收束的湿反光
  for (const side of [-1, 1]) {
    const wet = glowBox(ctx, side < 0 ? 0xff8a3d : 0x54d6d0, 1.1, 0.04, 100, 0.16);
    wet.position.set(side * 3.6, -9.8, -56);
    wet.rotation.y = side * 0.07;
    ctx.add(wet);
  }
  // 横向积水反光（霓虹色块，低亮度）
  for (let i = 0; i < 8; i++) {
    const z = -16 - i * 11;
    const puddle = glowBox(ctx, i % 2 ? 0xff8a3d : 0x54d6d0, 5 + (i % 3) * 3, 0.03, 1.2, 0.1);
    puddle.position.set((i % 2 ? -1 : 1) * (2 + (i % 4)), -9.79, z);
    ctx.add(puddle);
  }
  // 两侧木楼：真 3D 盒子 + 挑檐 + 亮窗 + 空调箱
  for (const side of [-1, 1]) {
    for (let i = 0; i < (boss ? 5 : 4); i++) {
      const z = -15 - i * 15;
      const g = new ctx.THREE.Group();
      const h = 9 + K.hash01(side * 13 + i * 17) * 7;
      const bw = 5.6 + K.hash01(i * 19 + 3) * 2;
      const body = K.box(bw, h, 4.2, 0x2c3e56, { emissiveMix: 0.5 });
      body.position.y = h / 2;
      g.add(body);
      // 挑檐（两层）
      for (let t = 0; t < 2; t++) {
        const eave = K.box(bw * 1.18, 0.32, 4.9, 0x1c2a3c, { emissiveMix: 0.45 });
        eave.position.set(0, h * (0.55 + t * 0.4), 0.2);
        eave.rotation.x = -0.06;
        g.add(eave);
      }
      const roof = K.box(bw * 1.05, 0.3, 4.6, 0x16222e, { emissiveMix: 0.45 });
      roof.position.y = h + 0.1;
      g.add(roof);
      // 亮窗（暖/青交替，越靠内越暗，保护中心）
      const cols = 2 + ((K.hash01(i * 23 + 5) * 2) | 0);
      for (let c = 0; c < cols; c++) {
        const lit = K.hash01(i * 29 + c * 7 + side);
        if (lit < 0.3) continue;
        const win = K.box(0.7, 1.1, 0.08, lit > 0.7 ? 0xffd890 : 0xffb15c, { emissiveMix: 1.1 });
        win.position.set((c - (cols - 1) / 2) * 1.6, h * (0.3 + lit * 0.42), 2.15);
        g.add(win);
      }
      // 空调/水塔杂物
      const ac = K.box(1.1, 0.8, 0.9, 0x2a3442);
      ac.position.set(side * -1.4, h * 0.62, 2.5);
      g.add(ac);
      g.position.set(side * (8.6 + i * 1.5), -10, z);
      g.rotation.y = side * -0.1;
      ctx.add(g);
      // 霓虹招牌：挂在楼内侧（单字竖排），boss 更亮
      const texts = ['中单', '推', '退', '锅'];
      const text = texts[(i + (side > 0 ? 1 : 0)) % texts.length];
      const color = i % 2 ? 0x54d6d0 : 0xff8a3d;
      const signY = -10 + h + h * 0.18;
      const signX = side * (7.4 + i * 1.5);
      // 招牌底板（3D 盒子，让文字有落脚的实体招牌）
      const board = K.box(4.0, 8.2, 0.28, 0x160e12, { emissiveMix: 0.5 });
      board.position.set(signX, signY, z + 1.9);
      ctx.add(board);
      for (const by of [-4.0, 4.0]) {
        const tube = glowBox(ctx, color, 3.8, 0.14, 0.08, boss ? 0.75 : 0.55);
        tube.position.set(signX, signY + by, z + 2.1);
        ctx.add(tube);
      }
      for (let k = 0; k < text.length; k++) {
        const sp = charSprite(ctx, text[k], {
          x: signX, y: signY + (text.length === 1 ? 0 : 2.1 - k * 4.2), z: z + 2.35,
          h: boss ? 4.4 : 3.8, fill: i % 2 ? '#6ff0e8' : '#ffa050', opacity: boss ? 1 : 0.96,
        });
        if (sp) {
          ctx.add(sp);
          ctx.animate(sp, { pulse: { amp: boss ? 0.06 : 0.03, speed: 1.1, phase: i + k } });
        }
      }
      // 招牌外光晕
      const glow = K.panel(null, {
        x: signX, y: signY, z: z + 1.7,
        w: 5.6, h: 10.4, color: i % 2 ? 0x1a4a48 : 0x4a2a10, opacity: boss ? 0.34 : 0.24,
      });
      ctx.add(glow);
    }
  }
}

/** 灯笼串与电线杆 */
function addLightsAndPoles(ctx, boss) {
  const K = ctx.K;
  // 横跨巷子的灯笼串
  for (let i = 0; i < (boss ? 6 : 5); i++) {
    const z = -18 - i * 15;
    const wire = K.box(15, 0.05, 0.05, 0x1a1410, { emissiveMix: 0.2 });
    wire.position.set(0, 9.6 + (i % 2) * 1.2, z);
    ctx.add(wire);
    for (let k = 0; k < 3; k++) {
      const lx = (k - 1) * 4.6 + (i % 2 ? 0.8 : -0.8);
      const lan = K.lantern({ scale: boss ? 1.35 : 1.1, color: boss ? 0xffc78a : 0xffb15c });
      lan.position.set(lx, 8.2 + (i % 2) * 1.2, z);
      ctx.add(lan);
      ctx.animate(lan, { bob: { amp: 0.16, speed: 0.5, phase: i + k } });
      const halo = K.ring(0.62, 0.9, boss ? 0xffc78a : 0xffb15c, { opacity: 0.22 });
      halo.position.copy(lan.position);
      ctx.add(halo);
    }
  }
  // 电线杆（两侧边缘）+ 横担
  for (const side of [-1, 1]) {
    for (let i = 0; i < (boss ? 4 : 3); i++) {
      const z = -20 - i * 22;
      const pole = K.cylinder(0.12, 0.2, 15, 0x22303e, { seg: 6, emissiveMix: 0.4 });
      pole.position.set(side * (7.4 + i * 1.2), -2.5, z);
      pole.rotation.z = side * 0.05;
      ctx.add(pole);
      for (let a = 0; a < 2; a++) {
        const arm = K.box(2.8, 0.12, 0.12, 0x22303e);
        arm.position.set(side * (6.4 + i * 1.2), 8.4 - a * 1.1, z);
        ctx.add(arm);
      }
      const lamp = K.sphere(0.2, i % 2 ? 0x54d6d0 : 0xff8a3d, { emissiveMix: 1.2 });
      lamp.position.set(side * (6.2 + i * 1.2), 7.1, z);
      ctx.add(lamp);
    }
  }
  // 超现实：脱离墙体的漂浮招牌（boss 增加、倒挂一块）
  const floats = boss
    ? [
      { x: 4.6, y: 13.6, z: -24, ch: '推', color: '#ffa050' },
      { x: -4.8, y: 12.4, z: -36, ch: '退', color: '#6ff0e8' },
      { x: 5.6, y: 9.4, z: -48, ch: '锅', color: '#ffa050' },
    ]
    : [
      { x: 4.8, y: 12.8, z: -30, ch: '推', color: '#ff8a3d' },
      { x: -5.2, y: 11.2, z: -44, ch: '退', color: '#54d6d0' },
    ];
  for (let i = 0; i < floats.length; i++) {
    const f = floats[i];
    const sp = charSprite(ctx, f.ch, { x: f.x, y: f.y, z: f.z, h: 2.6, fill: f.color, opacity: 0.92 });
    if (sp) {
      ctx.add(sp);
      ctx.animate(sp, {
        spinY: 0.12 + i * 0.04, bob: { amp: 0.22, speed: 0.4, phase: i * 1.6 },
        pulse: { amp: 0.05, speed: 0.7, phase: i },
      });
    }
    const halo = K.ring(1.5, 2.1, i % 2 ? 0x6ff0e8 : 0xffa050, { opacity: 0.16 });
    halo.position.set(f.x, f.y, f.z - 0.2);
    ctx.add(halo);
  }
  // boss：顶部「世界第一等」大招牌
  if (boss) {
    const sign = lineSprite(ctx, '世界第一等', { x: 0, y: 15.2, z: -52, h: 7, fill: '#ffd8a8', opacity: 0.96 });
    if (sign) {
      ctx.add(sign);
      ctx.animate(sign, { pulse: { amp: 0.03, speed: 0.6 } });
    }
    const back = K.box(20, 4.4, 0.2, 0x2a1408, { emissiveMix: 0.4 });
    back.position.set(0, 15.2, -53);
    ctx.add(back);
    const trim = glowBox(ctx, 0xffa050, 20, 0.16, 0.1, 0.55);
    trim.position.set(0, 13.1, -52.8);
    ctx.add(trim);
  }
}

/* ------------------------------------------------------------------ *
 * 空气：雨 / 水汽
 * ------------------------------------------------------------------ */

function addRain(ctx, boss) {
  const K = ctx.K;
  ctx.points({
    count: boss ? 118 : 96, color: 0xa8c8e0, size: 0.2, type: 'rain',
    xRange: 34, yRange: 26, zNear: -2, zFar: -70, speed: boss ? 7.5 : 6, seed: 9,
  });
  ctx.points({
    count: boss ? 30 : 22, color: 0x9fe0e8, size: 0.18, type: 'spark',
    xRange: 30, yRange: 22, zNear: -4, zFar: -60, speed: 3.6, seed: 12,
  });
}

/* ------------------------------------------------------------------ *
 * Builder
 * ------------------------------------------------------------------ */

function build(ctx, boss) {
  ctx.atmosphere({
    fogColor: boss ? 0x14202e : 0x101a28,
    fogDensity: boss ? 0.019 : 0.018,
    ambient: 0x7a8a9e,
    ambientIntensity: boss ? 2.0 : 1.8,
    dirColor: boss ? 0xffa060 : 0x9ac0e0,
    dirIntensity: boss ? 1.15 : 1.0,
  });
  addRainSky(ctx, boss);
  addAlley(ctx, boss);
  addLightsAndPoles(ctx, boss);
  // 月亮藏在雨云后（Billboard 绘卷天幕已给夜色，此处只留低亮度月晕）
  const K = ctx.K;
  const moon = K.sphere(6.5, boss ? 0xd8d8e8 : 0xb8c8d8, { emissiveMix: 0.5 });
  moon.position.set(-18, 26, -140);
  ctx.add(moon);
  addRain(ctx, boss);
  addFogBillboards(ctx, {
    color: boss ? '#8a9ab0' : '#7a8a9e', alpha: boss ? 0.24 : 0.18, count: 5,
    y: -1, xSpread: 34, zNear: -20, zFar: -120, w: 100, h: 26,
  });
  addFloorArt(ctx, {
    color: boss ? '#8a7a6a' : '#6a7a8a', alpha: boss ? 0.18 : 0.14, count: 3,
    y: -9.5, zNear: -18, zFar: -90, w: 120, h: 100, texture: 'wave',
  });
  addEdgeFlora(ctx, { grassColor: '#0a1018', plumColor: '#141018', alpha: boss ? 0.5 : 0.4, y: -7 });
  ctx.setSpeed(boss ? 14 : 10);
  ctx.setSway(boss ? 0.7 : 0.5, boss ? 0.4 : 0.26);
}

export function mid(ctx) {
  build(ctx, false);
}

export function boss(ctx) {
  build(ctx, true);
}
