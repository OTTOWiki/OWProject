/**
 * EX「键政覆写」3D 舞台。
 *
 * 方向（docs §8）：持续深入的 3D 场景 + Billboard 绘卷 + 真 3D + 超现实。
 * 剧情锚点：van♂ 的键政灌入数据洪流；OTTOWiki 词条被批量覆写，强度收敛但覆写仍在继续。
 * mid：被覆写的巨大「词条门」悬在数据漩涡中心，页面碎片与二进制雨在洋红紫风暴里翻飞。
 * boss：门崩解成两半、漩涡加速、全屏覆写文字闪烁、页面风暴（超现实：漂浮门板与页面逆流）。
 * 构图：中心门体用暗紫材质保证低对比，亮光集中在门缝、漩涡环与四边故障带。
 */
import { addFogBillboards, addFloorArt } from './_atmo.js';

const TAU = Math.PI * 2;

function charSprite(ctx, text, { x = 0, y = 0, z = -20, h = 3, fill = '#f0a0ff', opacity = 0.95 } = {}) {
  return ctx.textSprite(text, {
    x, y, z, w: h * 2, h, fill, bg: 'rgba(0,0,0,0)',
    font: 'bold 170px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity,
  });
}

function lineSprite(ctx, text, { x = 0, y = 0, z = -40, h = 5, fill = '#f0a0ff', opacity = 0.9 } = {}) {
  return ctx.textSprite(text, {
    x, y, z, w: h * 2, h, fill, bg: 'rgba(0,0,0,0)',
    font: 'bold 88px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity,
  });
}

function glowBox(ctx, color, w, h, d, opacity) {
  return ctx.K.box(w, h, d, color, {
    transparent: true, opacity, blending: ctx.THREE.AdditiveBlending, depthWrite: false,
  });
}

/* ------------------------------------------------------------------ *
 * 背景：数据风暴
 * ------------------------------------------------------------------ */

function addStormSky(ctx, boss) {
  const K = ctx.K;
  const art = ctx.plateTexture();
  if (!art) return;
  const full = ctx.plateCrop(0, 0, 1, 1);
  if (full) {
    ctx.add(K.panel(full, {
      x: 0, y: 6, z: -150, w: 220, h: 280,
      color: boss ? 0xb05ac0 : 0x8a4a9a, opacity: boss ? 0.7 : 0.6,
    }));
  }
  const crops = [[0.02, 0.05, 0.5, 0.5], [0.48, 0.1, 0.5, 0.5], [0.1, 0.5, 0.52, 0.46], [0.5, 0.5, 0.5, 0.46]];
  for (let i = 0; i < crops.length; i++) {
    const tex = ctx.plateCrop(...crops[i]);
    if (!tex) continue;
    const side = i % 2 ? 1 : -1;
    ctx.add(K.panel(tex, {
      x: side * (22 + i * 6), y: 10 + (i % 2 ? 4 : 0) + i * 2, z: -92 - i * 16,
      w: 32 + i * 4, h: 42 + i * 5, color: 0xc06ad0, opacity: 0.32, rotationY: side * -0.55,
    }));
  }
}

/** 数据地面：暗紫地板 + 发光网格 */
function addDataFloor(ctx, boss) {
  const K = ctx.K;
  ctx.add(K.ground({
    y: -10, color: 0x6a5a7a,
    texture: ctx.matTexture('ink', '#160a20') || null, opacity: 0.92,
  }));
  const color = boss ? 0xff5ad0 : 0xd94fd0;
  for (let i = 0; i < 6; i++) {
    const z = -16 - i * 15;
    const line = glowBox(ctx, i % 2 ? 0x5ad4e0 : color, 40, 0.04, 0.12, boss ? 0.3 : 0.22);
    line.position.set(0, -9.78, z);
    ctx.add(line);
  }
  for (let k = 0; k < 8; k++) {
    const x = (k - 3.5) * 3.4;
    const line = glowBox(ctx, k % 2 ? color : 0x5ad4e0, 0.1, 0.04, 96, boss ? 0.2 : 0.14);
    line.position.set(x, -9.77, -60);
    ctx.add(line);
  }
}

/* ------------------------------------------------------------------ *
 * 主体：词条门 / 漩涡 / 服务器碑 / 页面碎片 / 故障带
 * ------------------------------------------------------------------ */

function addWordGate(ctx, boss) {
  const K = ctx.K;
  const accent = boss ? 0xff5ad0 : 0xd94fd0;
  const g = new ctx.THREE.Group();
  const w = 15;
  const hh = 19;
  const postColor = 0x30204a;
  if (!boss) {
    const gate = K.gate({ x: 0, y: 0, z: 0, w, h: hh, color: postColor, accent });
    g.add(gate);
    const panel = K.panel(null, { x: 0, y: hh / 2, z: 0.3, w: w - 3, h: hh - 1, color: accent, opacity: 0.1 });
    g.add(panel);
  } else {
    // 超现实：门从中裂开，两半被数据流冲得错位
    for (const side of [-1, 1]) {
      const half = new ctx.THREE.Group();
      const post = K.box(1.9, hh, 1.8, postColor, { emissiveMix: 0.45 });
      post.position.set(0, hh / 2, 0);
      half.add(post);
      const beam = K.box(w / 2 + 1.4, 1.8, 1.8, postColor, { emissiveMix: 0.45 });
      beam.position.set(side * (w / 4), hh + 0.9, 0);
      half.add(beam);
      const trim = glowBox(ctx, accent, w / 2, 0.22, 0.2, 0.7);
      trim.position.set(side * (w / 4), hh, 0.9);
      half.add(trim);
      half.position.set(side * 4.2, 0, side * 1.2);
      half.rotation.z = side * -0.08;
      half.rotation.y = side * 0.12;
      g.add(half);
    }
    const core = K.sphere(2.2, 0xff8ae0, { emissiveMix: 1.4 });
    core.position.set(0, hh / 2, 0.4);
    g.add(core);
    const coreHalo = K.ring(2.8, 4.4, 0xffb0ff, { opacity: 0.34 });
    coreHalo.position.copy(core.position);
    g.add(coreHalo);
    ctx.animate(coreHalo, { pulse: { amp: 0.12, speed: 1.2 }, spinZ: 0.2 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      const shard = K.cone(0.3 + K.hash01(i * 7) * 0.4, 1.6 + K.hash01(i * 9) * 2.4, 0x4a2a62, { seg: 3, emissiveMix: 0.8 });
      shard.position.set(Math.cos(a) * (6 + K.hash01(i * 11) * 4), hh * 0.42 + K.hash01(i * 13) * 8, Math.sin(a) * 2);
      shard.rotation.set(K.hash01(i * 17) * 0.9, a, K.hash01(i * 19) * 0.9);
      g.add(shard);
    }
  }
  // 门楣「覆写」Billboard
  const chars = ['覆', '写'];
  for (let i = 0; i < chars.length; i++) {
    const sp = charSprite(ctx, chars[i], {
      x: 0, y: hh + (boss ? 4.6 : 3.2) - i * 3.0, z: 0.9, h: 3.0,
      fill: boss ? '#ffd0ff' : '#f0a0ff', opacity: 0.95,
    });
    if (sp) {
      g.add(sp);
      ctx.animate(sp, { pulse: { amp: 0.04, speed: 0.9, phase: i } });
    }
  }
  g.position.set(0, -9, -42);
  ctx.add(g);
  ctx.animate(g, { bob: { amp: 0.06, speed: 0.25 } });
}

/** 数据漩涡：多层环 + 旋转（持续深入的核心） */
function addVortex(ctx, boss) {
  const K = ctx.K;
  const rings = boss ? 9 : 7;
  for (let i = 0; i < rings; i++) {
    const u = i / (rings - 1);
    const r = 5 + u * (boss ? 34 : 28);
    const color = i % 2 ? 0x5ad4e0 : (boss ? 0xff5ad0 : 0xd94fd0);
    const ring = K.ring(r - 0.18, r + 0.18, color, { opacity: (boss ? 0.42 : 0.32) * (1 - u * 0.55) });
    ring.position.set(0, 1 - u * 3, -22 - u * 84);
    ring.rotation.z = (i % 3) * 0.5;
    ctx.add(ring);
    ctx.animate(ring, { spinZ: (i % 2 ? 1 : -1) * (boss ? 0.45 : 0.26), pulse: { amp: 0.05, speed: 0.6, phase: i } });
    if (i % 2 === 0) {
      const ring2 = K.ring(r * 0.86, r * 0.9, 0xffffff, { opacity: 0.1 * (1 - u) });
      ring2.position.copy(ring.position);
      ctx.add(ring2);
      ctx.animate(ring2, { spinZ: -0.3 });
    }
  }
}

/** 服务器碑林（两侧后退的真 3D 体块） */
function addServerField(ctx, boss) {
  const K = ctx.K;
  ctx.field((i) => {
    const g = new ctx.THREE.Group();
    const hh = 7 + K.hash01(i * 19 + 3) * 9;
    const bw = 1.8 + K.hash01(i * 23 + 5) * 1.8;
    const body = K.box(bw, hh, 1.8, 0x32224a, { emissiveMix: 0.55 });
    body.position.y = hh / 2;
    g.add(body);
    const strip = glowBox(ctx, i % 2 ? 0x5ad4e0 : 0xd94fd0, 0.16, hh * 0.7, 0.1, boss ? 0.6 : 0.45);
    strip.position.set(0, hh * 0.5, 0.95);
    g.add(strip);
    const cap = K.sphere(0.22, i % 2 ? 0x7ae0ff : 0xff8ae0, { emissiveMix: 1.2 });
    cap.position.set(0, hh + 0.3, 0);
    g.add(cap);
    return g;
  }, {
    count: boss ? 10 : 7, zNear: -26, zFar: -126, xRange: 62, yRange: 0,
    y: -10, xAbsMin: 11, speedMul: 0.6, jitter: 0.15,
  });
}

/** 页面碎片：漂浮的条目页（Billboard 板 + 墨线 + 自转） */
function addPageFragments(ctx, boss) {
  const K = ctx.K;
  ctx.field((i) => {
    const g = new ctx.THREE.Group();
    const pw = 2.2 + K.hash01(i * 11) * 1.8;
    const ph = pw * 1.32;
    const page = K.box(pw, ph, 0.06, i % 3 === 0 ? 0xd8c8e8 : 0xb8a8d0, { emissiveMix: 0.5 });
    g.add(page);
    for (let r = 0; r < 4; r++) {
      const ink = K.box(pw * 0.62, 0.08, 0.03, 0x3a2a50);
      ink.position.set(0, ph * (0.3 - r * 0.16), 0.05);
      g.add(ink);
    }
    return g;
  }, {
    count: boss ? 16 : 11, zNear: -14, zFar: -82, xRange: 30, yRange: 16,
    xAbsMin: 4, speedMul: boss ? 1.3 : 1.05, jitter: 0.35,
  });
}

/** 边缘故障带 + boss 覆写文字闪烁 */
function addGlitchBands(ctx, boss) {
  const K = ctx.K;
  const rows = boss ? 10 : 6;
  for (let i = 0; i < rows; i++) {
    const y = (i % 2 ? 1 : -1) * (8.6 + K.hash01(i * 13) * 5.4);
    const z = -18 - K.hash01(i * 17) * 52;
    const band = glowBox(ctx, i % 3 === 0 ? 0xffffff : (i % 2 ? 0x5ad4e0 : 0xff5ad0), 26 + K.hash01(i * 19) * 30, 0.08 + K.hash01(i * 23) * 0.22, 0.1, boss ? 0.4 : 0.24);
    band.position.set((K.hash01(i * 29) - 0.5) * 10, y, z);
    ctx.add(band);
  }
  if (boss) {
    for (let i = 0; i < 4; i++) {
      const sp = lineSprite(ctx, '覆写', {
        x: (i % 2 ? 1 : -1) * (8 + i * 2), y: i < 2 ? 17.5 : -13.5, z: -34 - i * 8,
        h: 3.4, fill: i % 2 ? '#ff8ae0' : '#ffd0ff', opacity: 0.55,
      });
      if (sp) {
        ctx.add(sp);
        ctx.animate(sp, { pulse: { amp: 0.09, speed: 1.3, phase: i * 1.7 } });
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * 空气：二进制雨 / 数据火花
 * ------------------------------------------------------------------ */

function addParticles(ctx, boss) {
  const K = ctx.K;
  ctx.points({
    count: boss ? 118 : 96, color: 0x8af0e8, size: 0.2, type: 'binary',
    xRange: 36, yRange: 30, zNear: -2, zFar: -76, speed: boss ? 5.5 : 4.2, seed: 41,
  });
  ctx.points({
    count: boss ? 32 : 24, color: 0xff8ae0, size: 0.18, type: 'spark',
    xRange: 32, yRange: 26, zNear: -4, zFar: -64, speed: 3.0, seed: 43,
  });
}

/* ------------------------------------------------------------------ *
 * Builder
 * ------------------------------------------------------------------ */

function build(ctx, boss) {
  ctx.atmosphere({
    fogColor: boss ? 0x22103a : 0x1c0c30,
    fogDensity: boss ? 0.02 : 0.019,
    ambient: 0x8a7a9e,
    ambientIntensity: boss ? 2.0 : 1.8,
    dirColor: boss ? 0xff5ad0 : 0xc06ad0,
    dirIntensity: boss ? 1.2 : 1.0,
  });
  addStormSky(ctx, boss);
  addDataFloor(ctx, boss);
  addVortex(ctx, boss);
  addWordGate(ctx, boss);
  addServerField(ctx, boss);
  addPageFragments(ctx, boss);
  addGlitchBands(ctx, boss);
  addParticles(ctx, boss);
  addFogBillboards(ctx, {
    color: boss ? '#b06ac0' : '#8a5a9e', alpha: boss ? 0.26 : 0.2, count: 5,
    y: 0, xSpread: 40, zNear: -24, zFar: -128, w: 104, h: 27,
  });
  addFloorArt(ctx, {
    color: boss ? '#9a6aaa' : '#7a5a8a', alpha: boss ? 0.16 : 0.12, count: 3,
    y: -9.5, zNear: -18, zFar: -95, w: 130, h: 110, texture: 'wave',
  });
  ctx.setSpeed(boss ? 18 : 13);
  ctx.setSway(boss ? 0.9 : 0.65, boss ? 0.5 : 0.35);
}

export function mid(ctx) {
  build(ctx, false);
}

export function boss(ctx) {
  build(ctx, true);
}
