/**
 * A线第4面「门百梁 · 方尖碑推销战」3D 舞台。
 *
 * 方向（2026-11-22 用户修正）：持续深入的 3D 场景 + Billboard 绘卷 + 真 3D 物体 + 超现实。
 * mid：暗金/朱色金箔集市——方尖碑阵列与促销灯柱在两侧循环逼近，推销拱门横跨远处，
 *      广告幡「特惠/VIP/买!/清仓」Billboard 悬于门前，金币与票据 Billboards 逆流而来；
 *      超现实：倒置方尖碑自天垂下、漂浮价签与巨型铜钱悬空。
 * boss：方尖碑齐亮、巨型 VIP 金匾、票券风暴与促销光柱全开。
 */
const GOLD = 0xe3b64d;
const GOLD_HOT = 0xffdf9a;
const GOLD_DARK = 0x6a4e14;
const RED = 0xc8542f;
const RED_DARK = 0x6a1410;
const CREAM = 0xe8d7ac;
const INK = 0x1a1206;
const INK_DEEP = 0x0c0803;

/** 加色竖光柱（促销灯柱；地面附带光圈） */
function lightColumn(ctx, { x = 0, y = -1, z = -28, color = GOLD_HOT, opacity = 0.09, radius = 0.9, height = 20 } = {}) {
  const THREE = ctx.THREE;
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true,
  });
  const col = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.5, height, 8, 1, true), mat);
  col.position.set(x, -10 + height / 2, z);
  ctx.add(col);
  ctx.animate(col, { pulse: { amp: 0.2, speed: 0.9 } });
  // 地面光圈
  const ring = ctx.K.ring(radius * 1.6, radius * 3, color, { opacity: 0.22 });
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, -9.72, z);
  ctx.add(ring);
  ctx.animate(ring, { pulse: { amp: 0.16, speed: 1.1 } });
  return col;
}

/** 悬浮发光点 */
function glowDot(ctx, { x = 0, y = 0, z = -20, r = 0.35, color = GOLD_HOT, opacity = 0.85 } = {}) {
  const m = ctx.K.sphere(r, color, { transparent: true, opacity });
  m.position.set(x, y, z);
  ctx.add(m);
  return m;
}

/** 远景：巨幅绘卷墙 + 漂浮画幅拼贴（Billboard 绘卷；部分倒置 = 超现实） */
function addScrollCollage(ctx, boss) {
  const { K } = ctx;
  const art = ctx.plateTexture();
  if (art) {
    const back = K.panel(art, {
      x: 0, y: 2, z: -150, w: 260, h: 340, opacity: boss ? 0.62 : 0.52,
      color: boss ? 0x9a7a52 : 0x8a7a5a,
    });
    ctx.add(back);
    const crops = boss
      ? [[0.02, 0.04, 0.5, 0.42], [0.46, 0.1, 0.5, 0.5], [0.1, 0.5, 0.56, 0.44], [0.56, 0.56, 0.42, 0.4],
        [0.3, 0.24, 0.36, 0.3], [0.66, 0.3, 0.3, 0.34], [0.0, 0.7, 0.36, 0.3]]
      : [[0.04, 0.06, 0.44, 0.4], [0.48, 0.12, 0.46, 0.44], [0.14, 0.54, 0.48, 0.4], [0.6, 0.5, 0.36, 0.4],
        [0.34, 0.3, 0.3, 0.28]];
    for (let i = 0; i < crops.length; i++) {
      const tex = ctx.plateCrop(...crops[i]);
      if (!tex) continue;
      const side = i % 2 ? 1 : -1;
      const p = K.panel(tex, {
        x: side * (14 + K.hash01(i * 31) * 10),
        y: 7 + K.hash01(i * 37) * 14,
        z: -70 - i * 9,
        w: 22 + K.hash01(i * 41) * 12,
        h: 26 + K.hash01(i * 43) * 14,
        opacity: boss ? 0.32 : 0.24,
        color: i % 3 === 0 ? 0xffd8a8 : 0xb8a888,
        rotationY: side * (0.18 + K.hash01(i * 47) * 0.2),
      });
      p.rotation.z = (K.hash01(i * 53) - 0.5) * (i % 4 === 0 ? 1.4 : 0.3);
      ctx.add(p);
    }
  }
  // 金色云带（绘卷雾带，横跨远景）
  const cloud = K.matTexture('cloud', '#8a6a2a');
  if (cloud) {
    for (let i = 0; i < 2; i++) {
      ctx.add(K.panel(cloud, {
        x: 0, y: 20 + i * 9, z: -96 - i * 14, w: 210, h: 34,
        opacity: 0.1, color: 0xffdf9a,
      }));
    }
  }
}

/** 主体：金箔方尖碑阵列（两侧循环逼近；少数倒置悬空）——持续深入的核心 */
function addObeliskFields(ctx, boss) {
  const { K } = ctx;
  // 近中景循环逼近（xAbsMin 依透视让开中心）
  ctx.field((i) => {
    const g = new ctx.THREE.Group();
    const scale = (0.72 + K.hash01(i * 13) * 0.55) * (boss ? 1.15 : 1);
    const inverted = i % 6 === 4;
    const ob = K.obelisk({
      scale,
      color: boss ? 0x7a5a18 : GOLD_DARK,
      gold: boss ? GOLD_HOT : GOLD,
    });
    if (inverted) {
      // 超现实：自天垂下的倒置方尖碑
      ob.rotation.z = Math.PI;
      ob.position.y = 12 + K.hash01(i * 17) * 8;
    }
    g.add(ob);
    if (boss && !inverted) {
      const tip = K.sphere(0.4 * scale, 0xffe8b0, { transparent: true, opacity: 0.92 });
      tip.position.y = scale * 10.2;
      g.add(tip);
      ctx.animate(tip, { pulse: { amp: 0.35, speed: 2.2 + K.hash01(i * 19) * 1.6, phase: i } });
    }
    return g;
  }, {
    count: boss ? 11 : 9, zNear: -26, zFar: -130, xRange: 46, xAbsMin: 9,
    yRange: 0.5, speedMul: 0.5,
  });
  // 固定的主碑对（透视：x ≈ 0.4 |z|，形成大道纵深）
  const pairs = boss
    ? [[-1, -8.6, -20, 1.2], [1, 8.6, -20, 1.2], [-1, -12.3, -28, 1.32], [1, 12.3, -28, 1.32],
      [-1, -17, -40, 1.22], [1, 17, -40, 1.22], [-1, -22.4, -54, 1.1], [1, 22.4, -54, 1.1]]
    : [[-1, -8.6, -20, 1.2], [1, 8.6, -20, 1.2], [-1, -12.3, -28, 1.3], [1, 12.3, -28, 1.3],
      [-1, -17, -40, 1.2], [1, 17, -40, 1.2]];
  // 近侧主碑：保证方尖碑大道在画面两侧清晰可读
  const nearPairs = boss
    ? [[-1, -6.8, -22, 1.02], [1, 6.8, -22, 1.02], [-1, -10.2, -30, 1.12], [1, 10.2, -30, 1.12]]
    : [[-1, -6.8, -22, 1.02], [1, 6.8, -22, 1.02], [-1, -10.2, -30, 1.08], [1, 10.2, -30, 1.08]];
  for (const [side, x, z, scale] of [...pairs, ...nearPairs]) {
    const ob = ctx.K.obelisk({
      x, y: 0, z, scale,
      color: boss ? 0x7a5a18 : GOLD_DARK,
      gold: boss ? GOLD_HOT : GOLD,
    });
    ob.rotation.y = side * 0.14;
    ctx.add(ob);
    const lamp = glowDot(ctx, { x, y: 0.7, z: z + 1.2, r: 0.3, color: GOLD_HOT, opacity: 0.55 });
    ctx.animate(lamp, { pulse: { amp: 0.4, speed: 1.4, phase: side } });
  }
  // 远景剪影小碑（中心远处也允许：小且暗）
  ctx.field((i) => {
    const ob = K.obelisk({
      scale: 0.5 + K.hash01(i * 23) * 0.4,
      color: 0x2e2008, gold: 0x5a4212,
    });
    return ob;
  }, { count: 6, zNear: -80, zFar: -150, xRange: 64, xAbsMin: 18, yRange: 0.4, speedMul: 0.3 });
}

/** 推销拱门：门柱 + 门楣 + 巨幅招牌 + 悬挂广告幡 + 檐灯 + 门内暗廊 */
function addSalesGate(ctx, boss) {
  const { K } = ctx;
  const gz = -35;
  const gw = boss ? 32 : 30;
  const gh = boss ? 14.5 : 14;
  const gate = K.gate({
    w: gw, h: gh, z: gz,
    color: boss ? 0x2a1a08 : 0x241808,
    accent: boss ? GOLD_HOT : GOLD,
  });
  ctx.add(gate);
  // 门内暗廊（压住中心的彩度，制造纵深）
  const innerDark = K.panel(null, {
    x: 0, y: gh * 0.5, z: gz - 1.2, w: gw - 4.5, h: gh - 1.5,
    color: INK_DEEP, opacity: 0.62,
  });
  ctx.add(innerDark);
  // 门内走廊尽头的光（远处小灯）
  glowDot(ctx, { x: 0, y: gh * 0.42, z: gz - 2, r: 0.5, color: GOLD_HOT, opacity: 0.5 });
  // 门楣招牌（Billboard 文字；font ≤ 512/字数 以避免裁切）
  const sign = ctx.textSprite('特惠专场', {
    x: 0, y: gh + 3.3, z: gz + 0.8, w: 11, h: 3,
    fill: '#fff0c8', bg: 'rgba(34,14,4,0.78)',
    font: 'bold 110px "Noto Serif CJK SC", "Microsoft YaHei", serif',
    opacity: 0.95,
  });
  ctx.add(sign);
  if (boss) {
    const sub = ctx.textSprite('VIP通道', {
      x: 0, y: gh + 1.1, z: gz + 0.85, w: 8, h: 2.1,
      fill: '#ffcf66', bg: 'rgba(30,8,4,0.68)',
      font: 'bold 100px "Noto Serif CJK SC", serif', opacity: 0.92,
    });
    ctx.add(sub);
  }
  // 门楣上的巨型铜钱饰（boss 顶部已让位给 VIP 金匾）
  if (!boss) {
    const coin = new ctx.THREE.Group();
    const coinRing = K.torus(2.1, 0.4, GOLD, { radial: 5, tubular: 22 });
    const coinHole = K.box(1.3, 1.3, 0.5, INK_DEEP);
    coin.add(coinRing, coinHole);
    coin.position.set(0, gh + 6.4, gz + 0.5);
    ctx.add(coin);
    ctx.animate(coin, { spinZ: 0.14, bob: { amp: 0.14, speed: 0.4 } });
  }
  // 悬挂广告幡（左右各两幅，避开正中）
  const ads = boss ? ['VIP', '秒杀', '买!', '清仓', '特惠'] : ['特惠', 'VIP', '买!', '清仓'];
  const slots = boss ? [-12, -4, 4, 12, 0] : [-10.5, -3.5, 3.5, 10.5];
  for (let i = 0; i < ads.length; i++) {
    const ax = slots[i % slots.length];
    const sp = ctx.textSprite(ads[i], {
      x: ax, y: gh - 1.35, z: gz + 1.15, w: 4.2, h: 2.2,
      fill: i % 2 ? '#ffe8b0' : '#f3e2b6', bg: 'rgba(70,12,8,0.82)',
      font: 'bold 140px "Noto Serif CJK SC", "Microsoft YaHei", serif',
      opacity: 0.93,
    });
    ctx.add(sp);
    ctx.animate(sp, { bob: { amp: 0.05, speed: 1.2 + i * 0.27, phase: i * 1.7 } });
    glowDot(ctx, { x: ax, y: gh - 2.7, z: gz + 1.15, r: 0.2, color: GOLD_HOT, opacity: 0.65 });
  }
  // 门楣檐灯一排
  for (let i = 0; i < 9; i++) {
    const lx = -gw * 0.42 + (i / 8) * gw * 0.84;
    const lamp = glowDot(ctx, { x: lx, y: gh + 1.5, z: gz + 1, r: 0.26, color: i % 2 ? GOLD_HOT : 0xffb15c });
    ctx.animate(lamp, { pulse: { amp: 0.28, speed: 1.6 + (i % 3) * 0.5, phase: i } });
  }
  // 门内双色促销光
  for (const [side, col] of [[-1, GOLD], [1, RED]]) {
    const ray = K.panel(null, {
      x: side * gw * 0.24, y: gh * 0.5, z: gz - 0.4, w: gw * 0.3, h: gh * 0.85,
      color: col, opacity: boss ? 0.09 : 0.055,
    });
    ctx.add(ray);
    ctx.animate(ray, { pulse: { amp: 0.14, speed: 0.8, phase: side } });
  }
}

/** 超现实：巨型铜钱悬空 + 漂浮价签 + 两侧灯笼串 */
function addFloatingSigns(ctx, boss) {
  const { K } = ctx;
  // 巨型铜钱（方孔圆钱）：环 + 方孔暗块，缓慢旋转
  const coin = new ctx.THREE.Group();
  const rr = boss ? 4.8 : 4.2;
  const ring = K.torus(rr, boss ? 0.95 : 0.8, boss ? GOLD_HOT : GOLD, { radial: 6, tubular: 28 });
  coin.add(ring);
  for (let i = 0; i < 2; i++) {
    const bar = K.box(rr * 1.7, 0.7, 0.35, boss ? GOLD_HOT : GOLD);
    bar.position.y = (i ? 1 : -1) * rr * 0.42;
    coin.add(bar);
  }
  const hole = K.box(rr * 0.56, rr * 0.56, 0.6, INK_DEEP);
  hole.position.z = 0.4;
  coin.add(hole);
  coin.position.set(-13.5, boss ? 20 : 18.5, boss ? -48 : -54);
  coin.rotation.x = 0.16;
  ctx.add(coin);
  ctx.animate(coin, { spinZ: boss ? 0.16 : 0.1, bob: { amp: 0.22, speed: 0.44 } });

  // 漂浮价签：和纸质感 Billboard（位置=0.8*halfWidth(depth) 保证贴边可见）
  const tags = boss
    ? [['¥9999', -8.8, 13, -24], ['¥8888', 9.6, 15, -26], ['秒杀', -11.6, 5, -31], ['VIP', 12.2, 6, -33],
      ['¥99', -8.4, 19, -22], ['清仓', 9.2, 20, -25]]
    : [['¥99', -8.6, 11, -24], ['VIP', 9.4, 12, -26], ['限时', -11, 4, -30], ['¥1999', 12, 5, -33]];
  for (let i = 0; i < tags.length; i++) {
    const [text, x, y, z] = tags[i];
    const sp = ctx.textSprite(text, {
      x, y, z, w: 3.2, h: 1.7,
      fill: '#5a140e', bg: 'rgba(238,226,196,0.9)',
      font: 'bold 150px "Noto Serif CJK SC", sans-serif', opacity: 0.85,
    });
    sp.material.rotation = (K.hash01(i * 61) - 0.5) * 0.22;
    ctx.add(sp);
    ctx.animate(sp, { bob: { amp: 0.14, speed: 0.5 + i * 0.11, phase: i * 1.3 } });
    const cord = K.cylinder(0.02, 0.02, 2.8, 0x2a1a0a);
    cord.position.set(x, y + 2.2, z);
    ctx.add(cord);
  }

  // 摊位灯笼串：两侧循环逼近
  ctx.field((i) => {
    const g = new ctx.THREE.Group();
    const lamp = K.lantern({ scale: 0.8 + K.hash01(i * 23) * 0.5, color: i % 3 === 0 ? 0xffcf66 : 0xff9a52 });
    lamp.position.y = 8 + K.hash01(i * 29) * 4;
    g.add(lamp);
    const cord = K.cylinder(0.02, 0.02, 6, 0x2a1a0a);
    cord.position.y = 12.5;
    g.add(cord);
    return g;
  }, { count: boss ? 10 : 8, zNear: -20, zFar: -92, xRange: 34, xAbsMin: 7.5, yRange: 0.3, speedMul: 0.7 });

  // 前景掠过：摊架立柱（近处贴边、压出纵深）
  ctx.field((i) => {
    const g = new ctx.THREE.Group();
    const post = K.box(0.55, 13, 0.55, 0x1c1206);
    post.position.y = -2.5;
    const bar = K.box(2.6, 0.35, 0.4, 0x241708);
    bar.position.y = 4.2;
    bar.position.x = (i % 2 ? 1 : -1) * 0.9;
    g.add(post, bar);
    const lamp = K.lantern({ scale: 0.7, color: 0xffb15c });
    lamp.position.set((i % 2 ? 1 : -1) * 1.2, 3.4, 0);
    g.add(lamp);
    return g;
  }, { count: 3, zNear: -16, zFar: -34, xRange: 15, xAbsMin: 6.6, y: -2, speedMul: 1.1 });
}

/** 地面：暗金地砖 + 金箔大道 + 两侧铜钱堆 + 平铺收据 + 立式价目牌 */
function addBazaarGround(ctx, boss) {
  const { K } = ctx;
  ctx.add(K.ground({
    y: -10, color: 0x0a0702,
    texture: K.matTexture('ink', boss ? '#241804' : '#1c1204'),
  }));
  // 金箔大道（低透明暖光带）
  for (let i = 0; i < 3; i++) {
    const strip = K.box(26 - i * 4, 0.05, 150, boss ? GOLD : 0x8a6a2a, { transparent: true, opacity: 0.1 - i * 0.02 });
    strip.position.set(0, -9.9 + i * 0.02, -78);
    ctx.add(strip);
  }
  // 平铺收据 / 票据（斜铺在地面的和纸面片，超现实拼贴）
  const paperTex = K.matTexture('washi', '#c8b890');
  for (let i = 0; i < 4; i++) {
    const x = (i % 2 ? 1 : -1) * (5 + K.hash01(i * 17) * 2.5);
    const z = -15 - i * 6;
    const sheet = K.panel(paperTex, {
      x, y: -9.84, z, w: 6 + K.hash01(i * 19) * 4, h: 8 + K.hash01(i * 21) * 5,
      opacity: 0.34, color: 0xd8c8a0,
    });
    sheet.rotation.x = -Math.PI / 2;
    sheet.rotation.z = (K.hash01(i * 23) - 0.5) * 1.2;
    ctx.add(sheet);
  }
  // 两侧铜钱堆（近处底角）
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const s = K.sphere(0.5 + K.hash01(i * 71 + side * 13) * 0.55, boss ? GOLD_HOT : GOLD, { transparent: true, opacity: 0.78 });
      s.scale.y = 0.24;
      s.position.set(
        side * (4.6 + K.hash01(i * 73 + side) * 2.4),
        -9.55 + i * 0.06,
        -13 - i * 1.7,
      );
      ctx.add(s);
    }
    // 立式价目牌（贴在两侧）
    const bx = side * (boss ? 11.4 : 10.4);
    const board = new ctx.THREE.Group();
    const leg1 = K.box(0.18, 2.6, 0.18, 0x2a1a08);
    leg1.position.set(-0.8, 1.3, 0);
    const leg2 = leg1.clone();
    leg2.position.x = 0.8;
    const face = K.box(2.3, 1.7, 0.12, boss ? GOLD : GOLD_DARK);
    face.position.y = 2.7;
    board.add(leg1, leg2, face);
    board.position.set(bx, -9.9, boss ? -28 : -26);
    board.rotation.y = side * 0.24;
    ctx.add(board);
  }
  const plateL = ctx.textSprite('¥99', {
    x: boss ? -11.2 : -10.2, y: -7.1, z: boss ? -27.8 : -25.8, w: 2, h: 1.2,
    fill: '#ffefc8', bg: 'rgba(24,12,4,0.62)', font: 'bold 150px "Noto Serif CJK SC", serif', opacity: 0.8,
  });
  ctx.add(plateL);
  const plateR = ctx.textSprite(boss ? 'VIP' : '¥9', {
    x: boss ? 11.2 : 10.2, y: -7.1, z: boss ? -27.8 : -25.8, w: 2, h: 1.2,
    fill: '#ffefc8', bg: 'rgba(24,12,4,0.62)', font: 'bold 150px "Noto Serif CJK SC", serif', opacity: 0.8,
  });
  ctx.add(plateR);
}

/** 促销灯柱 */
function addPromoBeams(ctx, boss) {
  lightColumn(ctx, {
    x: boss ? -11 : -10, z: boss ? -26 : -30, color: GOLD_HOT,
    opacity: boss ? 0.1 : 0.075, radius: boss ? 1 : 0.85, height: boss ? 24 : 20,
  });
  lightColumn(ctx, {
    x: boss ? 11 : 10, z: boss ? -26 : -30, color: boss ? 0xffb15c : GOLD_HOT,
    opacity: boss ? 0.1 : 0.07, radius: boss ? 1 : 0.85, height: boss ? 24 : 20,
  });
  if (boss) {
    lightColumn(ctx, { x: -16, z: -46, color: RED, opacity: 0.08, radius: 1.2, height: 26 });
    lightColumn(ctx, { x: 16, z: -46, color: GOLD_HOT, opacity: 0.08, radius: 1.2, height: 26 });
  }
}

/** boss：票券风暴（旋转的票价 Billboard 环 + 票券面片） */
function addTicketStorm(ctx) {
  const { K } = ctx;
  const storm = new ctx.THREE.Group();
  storm.position.set(0, 14.5, -42);
  const texts = ['¥999', 'VIP', '买!', '清仓', '秒杀', '¥99'];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = 7.5;
    const sp = ctx.textSprite(texts[i % texts.length], {
      x: Math.cos(a) * r, y: Math.sin(a) * r * 0.55, z: Math.sin(a) * 2.4,
      w: 3.1, h: 1.6,
      fill: i % 2 ? '#ffe8b0' : '#ffb15c', bg: 'rgba(60,14,8,0.74)',
      font: 'bold 140px "Noto Serif CJK SC", serif', opacity: 0.75,
    });
    storm.add(sp);
  }
  const art = ctx.plateTexture();
  if (art) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const w = 1.6 + K.hash01(i * 83) * 1.4;
      const sp = K.sprite(art, {
        x: Math.cos(a) * 10, y: Math.sin(a) * 6, z: Math.sin(a) * 3,
        w, h: w * 1.35, opacity: 0.32, color: 0xffd8a8,
      });
      sp.material.rotation = a;
      storm.add(sp);
    }
  }
  ctx.add(storm);
  ctx.animate(storm, { spinZ: 0.22, bob: { amp: 0.12, speed: 0.4 } });
}

/** boss：天空巨型 VIP 金匾（顶部边缘，让开画面中心） */
function addVipPlaque(ctx) {
  const { K } = ctx;
  const board = K.box(18, 5.2, 0.8, GOLD_DARK);
  board.position.set(0, 20.5, -58);
  ctx.add(board);
  const frame = K.box(19, 6, 0.5, GOLD);
  frame.position.set(0, 20.5, -58.4);
  ctx.add(frame);
  const plate = ctx.textSprite('VIP专享', {
    x: 0, y: 20.5, z: -57.4, w: 15.5, h: 4,
    fill: '#fff0c8', bg: 'rgba(40,16,4,0.9)',
    font: 'bold 96px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity: 0.95,
  });
  ctx.add(plate);
  ctx.animate(plate, { pulse: { amp: 0.016, speed: 0.9 } });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const d = glowDot(ctx, {
        x: side * (8.4 + i * 0.45), y: 17.6 + i * 0.5, z: -58, r: 0.2, color: GOLD_HOT, opacity: 0.7,
      });
      ctx.animate(d, { pulse: { amp: 0.3, speed: 1.6 + i * 0.3, phase: i } });
    }
  }
}

/* ------------------------------------------------------------------ *
 * 场景
 * ------------------------------------------------------------------ */

export function mid(ctx) {
  const { palette } = ctx;
  ctx.atmosphere({
    bg: 0x120b04,
    fogColor: 0x2a1c0a,
    fogDensity: 0.015,
    ambient: palette.ambient,
    ambientIntensity: 1.08,
    dirColor: palette.glow,
    dirIntensity: 0.95,
  });
  addScrollCollage(ctx, false);
  addBazaarGround(ctx, false);
  addObeliskFields(ctx, false);
  addSalesGate(ctx, false);
  addFloatingSigns(ctx, false);
  addPromoBeams(ctx, false);
  ctx.points({
    count: 60, color: 0xffdf9a, size: 0.16, type: 'spark',
    xRange: 34, yRange: 22, zNear: -3, zFar: -80, speed: 2.2, seed: 21,
  });
  ctx.points({
    count: 50, color: 0xe8d7ac, size: 0.2, type: 'paper',
    xRange: 32, yRange: 24, zNear: -4, zFar: -74, speed: 1.8, seed: 27,
  });
  ctx.setSpeed(11);
  ctx.setSway(0.5, 0.28);
}

export function boss(ctx) {
  const { palette } = ctx;
  ctx.atmosphere({
    bg: 0x160c03,
    fogColor: 0x3a2408,
    fogDensity: 0.016,
    ambient: palette.ambient,
    ambientIntensity: 1.18,
    dirColor: palette.glow,
    dirIntensity: 1.1,
  });
  addScrollCollage(ctx, true);
  addBazaarGround(ctx, true);
  addObeliskFields(ctx, true);
  addSalesGate(ctx, true);
  addFloatingSigns(ctx, true);
  addPromoBeams(ctx, true);
  addVipPlaque(ctx);
  addTicketStorm(ctx);
  ctx.points({
    count: 60, color: 0xffdf9a, size: 0.17, type: 'spark',
    xRange: 36, yRange: 24, zNear: -3, zFar: -84, speed: 2.8, seed: 22,
  });
  ctx.points({
    count: 60, color: 0xf0e0b8, size: 0.21, type: 'paper',
    xRange: 34, yRange: 26, zNear: -4, zFar: -80, speed: 2.4, seed: 28,
  });
  ctx.points({
    count: 30, color: 0xff9a52, size: 0.2, type: 'spark',
    xRange: 30, yRange: 20, zNear: -2, zFar: -66, speed: 3.2, seed: 29,
  });
  ctx.setSpeed(14);
  ctx.setSway(0.7, 0.36);
}
