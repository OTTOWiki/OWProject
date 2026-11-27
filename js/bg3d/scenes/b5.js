/**
 * B线第5面「棍电噢哆 · 推退辩论战」——超写实 · 超现实 3D 舞台。
 *
 * PBR 湿沥青 + 镜面水反光、真 3D 木楼挑檐 + 暖窗、灯笼串、霓虹招牌、电线、
 * 蒸汽雾墙、雨粒子。超现实：招牌脱离墙体悬浮、巷子无限延伸、积水里倒立霓虹城。
 * boss：招牌全亮、故障闪、雨更大。
 * 构图：中心留雨巷纵深（低对比），亮招牌/灯笼放两侧与顶部边缘。
 */
const TAU = Math.PI * 2;

function mixHex(a, b, t) {
  const ar = (a >> 16) & 255; const ag = (a >> 8) & 255; const ab = a & 255;
  const br = (b >> 16) & 255; const bg = (b >> 8) & 255; const bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16)
    | (Math.round(ag + (bg - ag) * t) << 8)
    | Math.round(ab + (bb - ab) * t);
}

function neon(ctx, color, w, h, d, intensity = 2.2) {
  return ctx.K.box(w, h, d, 0x000000, { emissive: color, emissiveIntensity: intensity, kind: 'metal', roughness: 0.4 });
}

function char(ctx, text, { x = 0, y = 0, z = -20, h = 2.4, fill = '#ffd0a0', opacity = 0.96 } = {}) {
  return ctx.textSprite(text, {
    x, y, z, w: h * 2, h, fill, bg: 'rgba(0,0,0,0)', opacity,
    font: 'bold 170px "Noto Serif CJK SC", "Microsoft YaHei", serif',
  });
}

/** 湿沥青街面 + 镜面水 */
function addWetStreet(ctx, boss) {
  const K = ctx.K;
  const ground = K.ground({ y: -6.45, w: 120, d: 320, color: 0x0a0c12, kind: 'asphalt', roughness: 0.95 });
  ctx.add(ground);
  const water = K.waterFloor({
    y: -6.3, size: [64, 320], color: 0x05070e,
    normalScale: boss ? 0.3 : 0.24, roughness: boss ? 0.24 : 0.22, metalness: 0.12, envMapIntensity: 0.45, flow: 0.4,
  });
  ctx.add(water);
  // 两侧路缘石与排水沟（真 3D 体块）
  for (const side of [-1, 1]) {
    const curb = K.box(0.7, 0.45, 300, 0x181a22, { kind: 'stone', roughness: 0.85 });
    curb.position.set(side * 7.2, -6.1, -80);
    ctx.add(curb);
    const gutter = K.box(0.5, 0.2, 300, 0x0c0e14, { kind: 'asphalt', roughness: 1 });
    gutter.position.set(side * 6.6, -6.24, -80);
    ctx.add(gutter);
  }
  // 湿地面霓虹反光（薄发光线，斜向纵深）
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const strip = neon(ctx, i % 2 ? 0x54d6d0 : 0xff8a3d, 0.14, 0.03, 46 - i * 6, boss ? 1.5 : 1.0);
      strip.position.set(side * (4.2 + i * 1.5), -6.22, -22 - i * 14);
      strip.rotation.y = side * -0.06;
      ctx.add(strip);
    }
  }
}

/** 单侧木楼群：真 3D 木结构 + 挑檐 + 暖窗 + 立式霓虹招牌 */
function addBuildings(ctx, boss) {
  const K = ctx.K;
  const texts = ['中单', '推', '退', '锅', '棍', '电'];
  for (const side of [-1, 1]) {
    const count = boss ? 6 : 5;
    for (let i = 0; i < count; i++) {
      const s = i * 31 + (side > 0 ? 501 : 0);
      const z = -22 - i * 13; // 后退：镜头推进到 -15 时仍留 safe margin，避免近景黑面板挡镜
      const h = 8.5 + K.hash01(s + 3) * 6.5;
      const bw = 5.2 + K.hash01(s + 5) * 1.6;
      const g = new ctx.THREE.Group();
      // 木楼主体（深木色）
      const body = K.box(bw, h, 7, 0x241c1a, { kind: 'wood', roughness: 0.85 });
      body.position.y = h / 2;
      g.add(body);
      // 木柱与横枋
      for (const px of [-bw / 2, bw / 2]) {
        const post = K.box(0.3, h, 0.3, 0x15100e, { kind: 'wood', roughness: 0.8 });
        post.position.set(px, h / 2, 3.4);
        g.add(post);
      }
      // 两层挑檐（瓦片深色 + 檐口）
      for (let t = 0; t < 2; t++) {
        const eave = K.box(bw * 1.3, 0.28, 8.4, 0x12161a, { kind: 'stone', roughness: 0.8 });
        eave.position.set(0, h * (0.52 + t * 0.32), 0.6);
        eave.rotation.x = -0.05;
        g.add(eave);
        const lip = neon(ctx, i % 2 ? 0xff8a3d : 0x54d6d0, bw * 1.26, 0.06, 0.1, boss ? 1.8 : 1.1);
        lip.position.set(0, h * (0.52 + t * 0.32) + 0.14, 4.85);
        g.add(lip);
      }
      const roof = K.box(bw * 1.12, 0.35, 7.6, 0x0e1216, { kind: 'stone', roughness: 0.85 });
      roof.position.y = h + 0.1;
      g.add(roof);
      // 暖窗（内侧面，越靠边缘越亮）
      const winN = 2 + ((K.hash01(s + 7) * 3) | 0);
      for (let w = 0; w < winN; w++) {
        const lit = K.hash01(s + 11 + w * 5);
        if (lit < 0.25) continue;
        const warm = lit > 0.65;
        const win = neon(ctx, warm ? 0xffcf8a : 0xffa050, 0.85, 1.15, 0.08, boss ? 2.7 : (warm ? 2.1 : 1.4));
        win.position.set((w - (winN - 1) / 2) * 1.45, h * (0.28 + lit * 0.4), 3.62);
        g.add(win);
        // 窗光溢散板
        const spill = K.panel(null, {
          x: win.position.x, y: win.position.y, z: 3.9,
          w: 2.2, h: 2.6, color: warm ? 0x6a3a14 : 0x4a2a10, opacity: boss ? 0.3 : 0.2,
        });
        g.add(spill);
      }
      // 空调外机/水塔杂物
      const ac = K.box(1.2, 0.9, 1.0, 0x1a2230, { kind: 'metal', roughness: 0.7 });
      ac.position.set(side * -1.2, h * 0.66, 4.1);
      g.add(ac);
      // 立式霓虹招牌（内侧，贴墙）
      const text = texts[(i + (side > 0 ? 2 : 0)) % texts.length];
      const color = i % 2 ? 0x54d6d0 : 0xff8a3d;
      const signY = h + 2.4;
      const board = K.box(1.9, 4.8, 0.24, 0x120c12, { kind: 'stone', roughness: 0.8 });
      board.position.set(0, signY, 3.7);
      g.add(board);
      for (const by of [-2.25, 2.25]) {
        const trim = neon(ctx, color, 1.8, 0.09, 0.08, boss ? 2.4 : 1.5);
        trim.position.set(0, signY + by, 3.86);
        g.add(trim);
      }
      for (let k = 0; k < text.length; k++) {
        const sp = char(ctx, text[k], {
          x: 0, y: signY + (text.length === 1 ? 0 : 1.2 - k * 2.4), z: 3.95 + 0.01 * k,
          h: boss ? 2.3 : 2.0,
          fill: i % 2 ? '#7ff5ec' : '#ffb070', opacity: boss ? 1 : 0.94,
        });
        if (sp) {
          g.add(sp);
          ctx.animate(sp, { pulse: { amp: boss ? 0.05 : 0.02, speed: 1.1 + k * 0.2, phase: i + k } });
        }
      }
      // 招牌外光晕
      const halo = K.panel(null, {
        x: 0, y: signY, z: 3.6, w: 3.6, h: 6.4,
        color: i % 2 ? 0x1a4a48 : 0x4a2a10, opacity: boss ? 0.36 : 0.24,
      });
      g.add(halo);
      g.position.set(side * (9.2 + i * 0.8), -6.5, z);
      g.rotation.y = side * -0.09;
      ctx.add(g);
    }
  }
}

/** 灯笼串 + 电线（横跨巷子，顶部边缘） */
function addOverhead(ctx, boss) {
  const K = ctx.K;
  const strings = boss ? 5 : 4;
  for (let i = 0; i < strings; i++) {
    const z = -15 - i * 14;
    const y = 8.6 + (i % 2 ? 1.1 : 0);
    ctx.add(K.hangingLights({
      x: 0, y, z, count: boss ? 6 : 5, span: 21 + (i % 2 ? 2 : 0), sag: 1.1,
      color: boss ? 0xffc78a : 0xffb15c, lanternScale: boss ? 0.6 : 0.52, seed: i + 3,
    }));
    // 电线：从两侧楼顶垂下的曲线（tube）
    for (const side of [-1, 1]) {
      const pts = [];
      for (let n = 0; n <= 6; n++) {
        const u = n / 6;
        pts.push([side * (10 - u * 10), y + 1.4 + Math.sin(u * 3.1 + i) * 0.5 - u * 0.9, z + u * 3 - 1.5]);
      }
      ctx.add(K.tube(pts, 0.035, 0x0c0e12, { kind: 'fabric', radial: 4, seg: 18 }));
    }
  }
  // 电线杆（两侧边缘）
  for (const side of [-1, 1]) {
    for (let i = 0; i < (boss ? 4 : 3); i++) {
      const z = -20 - i * 24;
      const pole = K.cylinder(0.13, 0.2, 16, 0x1c2634, { kind: 'metal', roughness: 0.8, seg: 6 });
      pole.position.set(side * 8.9, -1.5, z);
      pole.rotation.z = side * 0.04;
      ctx.add(pole);
      for (let a = 0; a < 2; a++) {
        const arm = K.box(2.6, 0.1, 0.1, 0x141a24, { kind: 'metal', roughness: 0.8 });
        arm.position.set(side * 8.1, 8.0 - a * 1.0, z);
        ctx.add(arm);
      }
      const lamp = K.sphere(0.2, i % 2 ? 0x54d6d0 : 0xff8a3d, { emissive: i % 2 ? 0x54d6d0 : 0xff8a3d, emissiveIntensity: 2.2, seg: 10, seg2: 8 });
      lamp.position.set(side * 7.9, 6.7, z);
      ctx.add(lamp);
      const halo = K.ring(0.3, 0.62, i % 2 ? 0x54d6d0 : 0xff8a3d, { opacity: 0.2 });
      halo.position.copy(lamp.position);
      ctx.add(halo);
    }
  }
}

/** 超现实：脱离墙体漂浮的招牌 + 积水里倒立的霓虹城 */
function addSurreal(ctx, boss) {
  const K = ctx.K;
  const defs = boss
    ? [
      { t: '推', x: -7.4, y: 14.2, z: -28, c: '#7ff5ec' },
      { t: '退', x: 7.8, y: 12.8, z: -44, c: '#ffb070' },
      { t: '锅', x: -7.2, y: 10.4, z: -58, c: '#ffb070' },
      { t: '棍', x: 7.0, y: 16.8, z: -66, c: '#7ff5ec' },
    ]
    : [
      { t: '推', x: -7.6, y: 13.4, z: -34, c: '#ffb070' },
      { t: '退', x: 7.6, y: 11.6, z: -52, c: '#7ff5ec' },
    ];
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    const board = K.box(0.3, 3.6, 2.2, 0x120c12, { kind: 'stone', roughness: 0.75 });
    board.position.set(d.x, d.y, d.z);
    ctx.add(board);
    ctx.animate(board, { spinY: (i % 2 ? 1 : -1) * 0.16, bob: { amp: 0.05, speed: 0.4, phase: i } });
    const sp = char(ctx, d.t, { x: d.x, y: d.y, z: d.z + 1.2, h: 3.2, fill: d.c, opacity: 0.96 });
    if (sp) {
      ctx.add(sp);
      ctx.animate(sp, { spinY: (i % 2 ? 1 : -1) * 0.16, bob: { amp: 0.05, speed: 0.4, phase: i }, pulse: { amp: 0.05, speed: 0.9, phase: i } });
    }
    const halo = K.ring(1.5, 2.2, i % 2 ? 0x54d6d0 : 0xff8a3d, { opacity: 0.18 });
    halo.position.set(d.x, d.y, d.z - 0.4);
    ctx.add(halo);
  }
  // 积水里的倒立霓虹城：镜像招牌（倒转 sprite + 压扁 + 叠加发光，浮在水面之上）
  const mirrors = boss
    ? [
      { x: -4.4, z: -15, c: '#54d6d0' }, { x: 4.6, z: -18, c: '#ff8a3d' },
      { x: -4.0, z: -22, c: '#ff8a3d' }, { x: 4.2, z: -26, c: '#54d6d0' },
      { x: -3.6, z: -31, c: '#54d6d0' },
    ]
    : [
      { x: -4.2, z: -16, c: '#54d6d0' }, { x: 4.4, z: -21, c: '#ff8a3d' },
      { x: -3.8, z: -27, c: '#54d6d0' },
    ];
  for (let i = 0; i < mirrors.length; i++) {
    const m = mirrors[i];
    const sp = char(ctx, '都', { x: m.x, y: -5.55, z: m.z, h: 2.4, fill: m.c, opacity: boss ? 0.52 : 0.38 });
    if (!sp) continue;
    sp.material.rotation = Math.PI;
    sp.scale.y *= 0.55;
    ctx.add(sp);
    ctx.animate(sp, { pulse: { amp: 0.08, speed: 1.4, phase: i } });
    // 竖长霓虹反光柱
    const beam = neon(ctx, i % 2 ? 0x54d6d0 : 0xff8a3d, 0.5, 0.02, 3.2, 0.9);
    beam.position.set(m.x, -5.72, m.z);
    ctx.add(beam);
  }
}

/** boss：世界第一等大招牌（顶部边缘）+ 故障闪带 */
function addBossSign(ctx, boss) {
  if (!boss) return;
  const K = ctx.K;
  const ys = 12.8;
  const sign = ctx.textSprite('世界第一等', {
    x: 0, y: ys, z: -27.5, w: 22, h: 4.6, fill: '#ffd8a8', bg: 'rgba(0,0,0,0)',
    font: 'bold 88px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity: 0.96,
  });
  if (sign) {
    ctx.add(sign);
    ctx.animate(sign, { pulse: { amp: 0.025, speed: 0.7 } });
  }
  const board = K.box(21, 4.2, 0.3, 0x1c1008, { kind: 'stone', roughness: 0.8 });
  board.position.set(0, ys, -27.9);
  ctx.add(board);
  const trim = neon(ctx, 0xffa050, 21, 0.12, 0.1, 2.6);
  trim.position.set(0, ys - 2.2, -27.7);
  ctx.add(trim);
  // 故障闪带
  for (let i = 0; i < 7; i++) {
    const side = i % 2 ? 1 : -1;
    const band = neon(ctx, i % 3 === 0 ? 0xffffff : (i % 2 ? 0x54d6d0 : 0xff8a3d), 10 + K.hash01(i * 13) * 12, 0.07, 0.1, 1.8);
    band.position.set(side * (4 + K.hash01(i * 17) * 6), 12.5 + K.hash01(i * 19) * 5, -26 - i * 7);
    ctx.add(band);
    ctx.animate(band, { pulse: { amp: 0.5, speed: 3.2 + i * 0.4, phase: i } });
  }
}

function addParticles(ctx, boss) {
  ctx.points({
    count: boss ? 118 : 94, color: 0xa8c8e0, size: 0.17, type: 'rain',
    xRange: 30, yRange: 30, zNear: -2, zFar: -72, speed: boss ? 8.4 : 6.4, seed: 9,
  });
  ctx.points({
    count: boss ? 28 : 22, color: 0x9fe0e8, size: 0.16, type: 'spark',
    xRange: 26, yRange: 24, zNear: -4, zFar: -60, speed: 3.4, seed: 12,
  });
  ctx.points({
    count: boss ? 20 : 14, color: 0xffcf8a, size: 0.2, type: 'spark',
    xRange: 26, yRange: 20, zNear: -6, zFar: -52, speed: 0.8, seed: 17,
  });
}

function build(ctx, boss) {
  const { palette } = ctx;
  ctx.atmosphere({
    bg: palette.skyBot,
    fogColor: mixHex(palette.fog, palette.ink, 0.55),
    fogDensity: boss ? 0.024 : 0.021,
    ambient: palette.ambient,
    ambientIntensity: 0.45,
    hemiSky: mixHex(palette.accent2, palette.glow, 0.3),
    hemiGround: palette.ink,
    hemiIntensity: 0.6,
    dirColor: boss ? 0xffb080 : 0x8fb0d8,
    dirIntensity: boss ? 1.5 : 1.1,
    shadow: true,
    shadowSize: 1024,
  });
  addWetStreet(ctx, boss);
  addBuildings(ctx, boss);
  addOverhead(ctx, boss);
  addSurreal(ctx, boss);
  addBossSign(ctx, boss);
  // 雨夜巨月（顶部边缘，藏在云后）
  ctx.add(ctx.K.moon({
    x: -15, y: 17.5, z: -118, r: boss ? 6.2 : 5.4,
    color: 0xb8c4d8, halo: 0x7aa0c8, haloOpacity: 0.2,
  }));
  // 蒸汽雾墙（shader 噪声，从地面升起）
  for (let i = 0; i < 3; i++) {
    ctx.add(ctx.K.mistSheet({
      x: (i - 1) * 8, y: -3.4 + i * 0.4, z: -22 - i * 16, w: 40, h: 11,
      color: mixHex(palette.fog, palette.ink, 0.55),
      opacity: boss ? 0.13 : 0.1, seed: i + 2, speed: 0.03 + i * 0.008,
    }));
  }
  // 雨夜环境体积光（霓虹光柱，边缘）
  for (let i = 0; i < (boss ? 4 : 2); i++) {
    const side = i % 2 ? 1 : -1;
    ctx.add(ctx.K.volumetricBeam({
      x: side * (10.5 + (i > 1 ? 2 : 0)), y: 10, z: -30 - i * 15,
      length: 30, radius: 2.0, color: i % 2 ? 0x54d6d0 : 0xff8a3d,
      opacity: boss ? 0.07 : 0.045, tilt: side * 0.18, spin: 0.22 + i * 0.08,
    }));
  }
  addParticles(ctx, boss);
  ctx.setSpeed(boss ? 14 : 10);
  ctx.setSway(boss ? 0.7 : 0.5, boss ? 0.4 : 0.26);
}

export function mid(ctx) {
  build(ctx, false);
}

export function boss(ctx) {
  build(ctx, true);
}
