/**
 * A线第4面「门百梁 · 方尖碑推销战」——超写实 · 超现实 3D 舞台。
 *
 * 画面：暗金与朱红浸透的无限推销长廊。PBR 金/石方尖碑沿镜面浅水一字排开，
 * 每座都以透视比例向雾中收束；推销巨门一层层套向深处（无限 VIP 门廊）；
 * 广告幡「特惠 / VIP / 秒杀 / 清仓」悬在门楣下，暖灯笼串与金币堆压在画面两角。
 * 超现实：倒悬方尖碑阵自天垂下、漂浮巨型铜钱缓慢自转、金色尘埃逆着重力翻卷。
 * boss：VIP 金匾自天边亮起、票券风暴环旋、金红双色促销光柱全开。
 *
 * 构图：中心 60% 只保留低对比的门廊纵深与水面冷反射，所有亮光压在两侧/上缘。
 */
import { addFogBillboards } from './_atmo.js';

const GOLD = 0xe3b64d;
const GOLD_HOT = 0xffdf9a;
const GOLD_DEEP = 0x8a6516;
const RED = 0xc8542f;
const RED_DEEP = 0x7a1c12;
const CREAM = 0xf3e2b6;
const INK_DEEP = 0x080502;
const FLOOR_Y = -5.8;

function mixHex(a, b, t) {
  const ar = (a >> 16) & 255; const ag = (a >> 8) & 255; const ab = a & 255;
  const br = (b >> 16) & 255; const bg = (b >> 8) & 255; const bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16)
    | (Math.round(ag + (bg - ag) * t) << 8)
    | Math.round(ab + (bb - ab) * t);
}

/* ------------------------------------------------------------------ *
 * 小工具（全部经 ctx.THREE / ctx.K，确定性随机）
 * ------------------------------------------------------------------ */

/** 自发光小球（灯珠/金尘核心；参与 bloom） */
function glowBall(ctx, { x = 0, y = 0, z = -20, r = 0.3, color = GOLD_HOT, intensity = 2.6, opacity = 1 } = {}) {
  const mat = ctx.K.emissive(color, intensity);
  if (opacity < 1) { mat.transparent = true; mat.opacity = opacity; }
  const m = new ctx.THREE.Mesh(new ctx.THREE.SphereGeometry(r, 12, 8), mat);
  m.position.set(x, y, z);
  m.userData.baseEmissive = intensity;
  ctx.add(m);
  return m;
}

/** 水面上的加色光斑（低透明；中心保持暗） */
function floorGlow(ctx, { x = 0, z = -20, color = GOLD, w = 6, d = 20, opacity = 0.05, y = FLOOR_Y + 0.06 } = {}) {
  const m = new ctx.THREE.Mesh(
    new ctx.THREE.PlaneGeometry(w, d),
    ctx.K.basic(color, {
      transparent: true, opacity, depthWrite: false,
      blending: ctx.THREE.AdditiveBlending, side: ctx.THREE.DoubleSide, fog: true,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  ctx.add(m);
  return m;
}

/** 加色光柱（促销灯柱；不吃阴影） */
function lightPillar(ctx, { x = 0, z = -30, color = GOLD_HOT, h = 24, radius = 0.9, opacity = 0.06, baseY = FLOOR_Y } = {}) {
  const m = new ctx.THREE.Mesh(
    new ctx.THREE.CylinderGeometry(radius, radius * 1.7, h, 14, 1, true),
    ctx.K.basic(color, {
      transparent: true, opacity, depthWrite: false,
      blending: ctx.THREE.AdditiveBlending, side: ctx.THREE.DoubleSide, fog: true,
    }),
  );
  m.position.set(x, baseY + h / 2, z);
  ctx.add(m);
  return m;
}

/** 巨型铜钱（方孔圆钱：金环 + 方孔暗块 + 发光轮缘） */
function giantCoin(ctx, { x = 0, y = 12, z = -40, r = 4, hot = false } = {}) {
  const K = ctx.K;
  const g = new ctx.THREE.Group();
  const ring = K.torus(r, r * 0.17, hot ? GOLD_HOT : GOLD, {
    kind: 'gold', roughness: 0.22, metalness: 1, envMapIntensity: 1.8, radial: 8, tubular: 40,
  });
  const hole = K.box(r * 0.66, r * 0.66, r * 0.62, INK_DEEP, {
    kind: 'metal', roughness: 0.65, metalness: 0.5,
  });
  const inner = K.torus(r * 0.74, r * 0.05, CREAM, {
    kind: 'gold', roughness: 0.2, metalness: 1, emissive: GOLD_HOT, emissiveIntensity: 0.35, castShadow: false,
  });
  g.add(ring, inner, hole);
  const rim = new ctx.THREE.Mesh(
    new ctx.THREE.TorusGeometry(r * 1.005, r * 0.028, 6, 54),
    K.emissive(GOLD_HOT, hot ? 2.8 : 1.9),
  );
  g.add(rim);
  g.position.set(x, y, z);
  return g;
}

/** 预生成广告幡文字纹（供 field 内复用，避免重复建纹理） */
function bannerTextures(ctx) {
  const defs = [
    ['特惠', '#ffe6b0', 'rgba(58,12,8,0.9)'],
    ['VIP', '#ffd98a', 'rgba(26,9,4,0.92)'],
    ['秒杀', '#ffd0b0', 'rgba(70,14,10,0.88)'],
    ['清仓', '#f3e2b6', 'rgba(44,14,6,0.9)'],
    ['买!', '#fff0c8', 'rgba(84,18,8,0.88)'],
  ];
  return defs.map(([text, fill, bg]) => {
    const sp = ctx.textSprite(text, {
      w: 4, h: 2, fill, bg,
      font: 'bold 132px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity: 0.95,
    });
    return sp.material.map;
  });
}

/* ------------------------------------------------------------------ *
 * 场景构件
 * ------------------------------------------------------------------ */

/** 天幕压暗：巨幅暗金帷幕挡住过亮的 IBL 天空，只留上缘一抹暖光 */
function buildSkyVeil(ctx, boss) {
  const veil = ctx.K.panel(null, {
    x: 0, y: 26, z: -134, w: 430, h: 430,
    color: boss ? 0x160d03 : 0x120a02,
    opacity: boss ? 0.7 : 0.78, fog: false,
  });
  ctx.add(veil);
  // 上缘一抹暖色透光（保持"暗金"而不是死黑）
  const glowBand = ctx.K.panel(null, {
    x: 0, y: 40, z: -132, w: 380, h: 40,
    color: 0x8a5a18, opacity: 0.16, fog: false,
  });
  ctx.add(glowBand);
  // 收敛 IBL 反射强度（暗金更沉，边缘广告更亮）
  ctx.updater(() => {
    if (ctx.scene.environmentIntensity !== 0.62) ctx.scene.environmentIntensity = 0.62;
  });
}

/** 镜面浅水 + 金箔光带 + 两角金币堆 */
function buildFloor(ctx, boss) {
  const K = ctx.K;
  ctx.add(K.waterFloor({
    y: FLOOR_Y,
    size: [380, 420],
    color: boss ? 0x080401 : 0x050301,
    normalScale: boss ? 0.3 : 0.26, roughness: boss ? 0.24 : 0.22, metalness: 0.12, envMapIntensity: 0.45, flow: 0.4,
  }));
  // 两侧金箔反光带（避开中线）
  for (const side of [-1, 1]) {
    floorGlow(ctx, { x: side * 10, z: -26, color: boss ? GOLD_HOT : GOLD, w: 7, d: 44, opacity: boss ? 0.042 : 0.028 });
    floorGlow(ctx, { x: side * 15.5, z: -52, color: GOLD, w: 4, d: 60, opacity: 0.02 });
  }
  // 近景两角金币堆（实例化）
  for (const side of [-1, 1]) {
    const pile = K.coinField({
      x: side * 8.6, y: FLOOR_Y + 0.05, z: -15.5,
      count: boss ? 42 : 32, spread: 6.4, seed: side < 0 ? 3 : 9,
    });
    ctx.add(pile);
  }
  // 金箔铺地：斜铺的绘卷残片（超现实拼贴）
  const paper = ctx.matTexture('gold', boss ? '#e8c070' : '#a87e34');
  if (paper) {
    for (let i = 0; i < 3; i++) {
      const p = K.panel(paper, {
        x: (i % 2 ? 1 : -1) * (6.5 + K.hash01(i * 17) * 2.5),
        y: FLOOR_Y + 0.02,
        z: -18 - i * 7,
        w: 5 + K.hash01(i * 19) * 3.5, h: 7 + K.hash01(i * 21) * 4,
        opacity: 0.1, color: boss ? 0xd8b060 : 0x8a6a30, fog: true,
      });
      p.rotation.x = -Math.PI / 2;
      p.rotation.z = (K.hash01(i * 23) - 0.5) * 1.1;
      ctx.add(p);
    }
  }
}

/** 方尖碑大道（静态锚点按透视收束）+ 倒悬方尖碑阵（超现实） */
function buildObeliskAvenue(ctx, boss) {
  const K = ctx.K;
  const dists = boss ? [20, 28, 38.5, 51, 68, 90, 117] : [20, 29, 41, 57, 79, 105];
  const anchors = [];
  for (let i = 0; i < dists.length; i++) {
    const d = dists[i];
    const x = d * 0.356;
    const sc = 0.8 + (d - 20) * 0.033;
    const goldOne = i % 2 === 0;
    for (const side of [-1, 1]) {
      const ob = K.obelisk({
        x: side * x, y: FLOOR_Y, z: -d, scale: sc,
        color: goldOne ? (boss ? 0x6a4c12 : 0x46300c) : 0x181512,
        gold: goldOne ? (boss ? 0xd8a84e : 0x8a6220) : 0x5a4212,
        kind: goldOne ? 'gold' : 'granite',
      });
      ob.rotation.y = -side * 0.16;
      ctx.add(ob);
      anchors.push({ x: side * x, y: FLOOR_Y + 11 * sc, z: -d });
      if (boss && i < 3) {
        const ring = K.ring(x * 0.35, x * 0.75, goldOne ? GOLD_HOT : RED, { opacity: 0.07 });
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(side * x * 0.86, FLOOR_Y + 0.08, -d + 1.5);
        ctx.add(ring);
      }
    }
  }
  // 循环逼近的方尖碑（持续深入）：近处从两侧掠过，远处压暗成剪影
  ctx.field((i) => {
    const s = 0.55 + K.hash01(i * 23) * 0.55;
    const goldOne = K.hash01(i * 29) > 0.45;
    return K.obelisk({
      scale: s,
      color: goldOne ? 0x3a2a0a : 0x14120e,
      gold: goldOne ? 0x6a4e14 : 0x3a2c0e,
      kind: goldOne ? 'gold' : 'granite',
    });
  }, { count: boss ? 12 : 9, zNear: -18, zFar: -96, xRange: 44, xAbsMin: 9.5, y: FLOOR_Y, speedMul: 0.85 });

  // 超现实：倒悬方尖碑阵自天垂下
  const inv = boss
    ? [[-8.5, -30, 18, 1.15], [8.5, -30, 18, 1.15], [-17, -52, 21, 1.45], [17, -52, 21, 1.45], [0, -80, 25, 1.7]]
    : [[-10, -38, 15, 0.85], [10, -38, 15, 0.85], [-19, -66, 18, 1.1], [19, -66, 18, 1.1]];
  for (let i = 0; i < inv.length; i++) {
    const [x, z, y, sc] = inv[i];
    const holder = new ctx.THREE.Group();
    const ob = K.obelisk({
      scale: sc,
      color: boss ? 0x5a3e0e : 0x32240a,
      gold: boss ? 0xd8a84e : 0x7a5418,
      kind: 'gold',
    });
    ob.rotation.z = Math.PI;
    holder.add(ob);
    holder.position.set(x, y, z);
    ctx.add(holder);
    ctx.animate(holder, { bob: { amp: 0.018, speed: 0.25 + K.hash01(i * 41) * 0.2, phase: i * 1.7 } });
    // 悬链
    if (boss || i < 2) {
      const chain = K.cylinder(0.045, 0.045, 13, 0x2a2018, { kind: 'metal', seg: 6 });
      chain.position.set(x, y + 9, z);
      ctx.add(chain);
    }
    // boss：倒悬碑尖亮起促销灯
    if (boss) {
      const lamp = glowBall(ctx, { x, y: y - 11 * sc, z, r: 0.28, color: i % 2 ? RED : GOLD_HOT, intensity: 3.2 });
      ctx.animate(lamp, { bob: { amp: 0.02, speed: 0.5, phase: i } });
    }
  }
  // boss：近处两座巨碑夹住画面左右
  if (boss) {
    for (const side of [-1, 1]) {
      const ob = ctx.K.obelisk({
        x: side * 8.4, y: FLOOR_Y, z: -24, scale: 1.05,
        color: 0x5a3e0e, gold: 0xd8a84e, kind: 'gold',
      });
      ob.rotation.y = -side * 0.24;
      ctx.add(ob);
    }
  }
  return anchors;
}

/** 推销巨门：主门 + 纵深嵌套的无限 VIP 门廊 + 门楣招牌 + 广告幡 + 布幔 */
function buildSalesGate(ctx, boss) {
  const K = ctx.K;
  const gz = boss ? -50 : -53;
  const gw = boss ? 28 : 26;
  const gh = boss ? 14 : 13;

  const gate = K.gate({
    x: 0, y: FLOOR_Y, z: gz, w: gw, h: gh,
    color: boss ? 0x191005 : 0x150e05,
    accent: boss ? 0xd8a84e : 0xb08a3c,
    glow: true,
  });
  ctx.add(gate);
  // 门内暗廊（压住中心对比度，制造纵深）
  const dark = K.panel(null, {
    x: 0, y: FLOOR_Y + gh * 0.5, z: gz - 1.6,
    w: gw - 3.4, h: gh - 1.4, color: INK_DEEP, opacity: 0.78, fog: false,
  });
  ctx.add(dark);
  // 门内尽头的暖光（小而远）
  const far = glowBall(ctx, { x: -1.5, y: FLOOR_Y + gh * 0.45, z: gz - 3.2, r: 0.42, color: GOLD_HOT, intensity: 1.6 });
  ctx.animate(far, { bob: { amp: 0.01, speed: 0.8 } });

  // 无限门廊：一层层套向雾里（只留结构剪影，不点灯）
  const nested = [
    { z: gz - 40, w: 42, h: 20 },
    { z: gz - 74, w: 58, h: 27 },
  ];
  for (let i = 0; i < nested.length; i++) {
    const n = nested[i];
    ctx.add(K.gate({
      x: 0, y: FLOOR_Y, z: n.z, w: n.w, h: n.h,
      color: 0x1a1208, accent: i % 2 ? RED_DEEP : GOLD_DEEP, glow: false,
    }));
  }

  // 门楣主招牌（避开画面正中，抬到上缘）
  const sign = ctx.textSprite('VIP通道', {
    x: 0, y: FLOOR_Y + gh + 3.1, z: gz + 0.9, w: 10.5, h: 3.2,
    fill: boss ? '#ffe0a8' : '#e8c884', bg: 'rgba(22,9,3,0.88)',
    font: 'bold 96px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity: 0.95,
  });
  ctx.add(sign);
  // 檐灯一排（门楣上的暖灯珠，中心两侧对称）
  const bulbs = [];
  for (let i = 0; i < 10; i++) {
    const lx = -gw * 0.42 + (i / 9) * gw * 0.84;
    const b = glowBall(ctx, {
      x: lx, y: FLOOR_Y + gh + 1.3, z: gz + 1.0, r: 0.17,
      color: i % 2 ? RED : GOLD_HOT, intensity: 2.6,
    });
    bulbs.push(b);
  }
  // 灯珠脉动（故障式明灭，boss 更快）
  ctx.updater((dt, t) => {
    for (let i = 0; i < bulbs.length; i++) {
      const b = bulbs[i];
      const base = b.userData.baseEmissive || 2.6;
      const s = 0.55 + 0.45 * Math.abs(Math.sin(t * (boss ? 4.6 : 2.2) + i * 1.31));
      b.material.emissiveIntensity = base * (0.55 + s * 0.7);
    }
  });

  // 悬挂广告幡：门楣下一排（贴在门柱内侧，避开正中）
  const ads = boss ? [['VIP', -10.5], ['秒杀', -5.2], ['特惠', 5.2], ['清仓', 10.5], ['买!', 0]]
    : [['特惠', -9.6], ['VIP', -4.6], ['秒杀', 4.6], ['清仓', 9.6]];
  for (let i = 0; i < ads.length; i++) {
    const [text, ax] = ads[i];
    const sp = ctx.textSprite(text, {
      x: ax, y: FLOOR_Y + gh - 2.1, z: gz + 1.2, w: 3.6, h: 1.85,
      fill: i % 2 ? '#e8c884' : '#d8b888', bg: i % 2 ? 'rgba(62,12,8,0.9)' : 'rgba(20,7,3,0.92)',
      font: 'bold 140px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity: 0.94,
    });
    ctx.add(sp);
    ctx.animate(sp, { bob: { amp: 0.012, speed: 0.9 + i * 0.17, phase: i * 1.4 } });
    // 幡绳
    const cord = K.cylinder(0.012, 0.012, 1.6, 0x2a1a0a, { kind: 'fabric', seg: 4 });
    cord.position.set(ax, FLOOR_Y + gh - 1.1, gz + 1.2);
    ctx.add(cord);
  }

  // 布幔（绘卷裁片，风动；贴在门柱上）
  const clothTex = ctx.plateCrop(0.05, 0.08, 0.42, 0.56);
  if (clothTex) {
    for (const side of [-1, 1]) {
      const c = K.curtain({
        x: side * (gw * 0.5 - 1.4), y: FLOOR_Y + gh * 0.42, z: gz + 0.75,
        w: 4.2, h: gh * 0.72, color: side < 0 ? 0x7a2418 : 0x8a2a1c, texture: clothTex, opacity: 0.94,
      });
      ctx.add(c);
    }
  }
  // 门柱上的巨幅海报（绘卷裁片）
  const crops = [[0.08, 0.1, 0.4, 0.5], [0.5, 0.12, 0.42, 0.5]];
  for (let i = 0; i < crops.length; i++) {
    const tex = ctx.plateCrop(...crops[i]);
    if (!tex) continue;
    const side = i ? 1 : -1;
    const p = K.artPanel(tex, {
      x: side * (gw * 0.5 + 1.3), y: FLOOR_Y + gh * 0.5, z: gz + 0.4,
      w: 6.4, h: 9, rotationY: side * 0.34, rotationZ: side * 0.05,
      opacity: 0.6, tint: boss ? 0xffd8a0 : 0xc8a060,
    });
    ctx.add(p);
  }
}

/** 体积金光 + 促销灯柱 + 雾（超写实空气透视） */
function buildLightAir(ctx, boss) {
  const K = ctx.K;
  const { palette } = ctx;
  // 体积光：自门楣两侧斜落
  const beams = boss
    ? [[-15, 17, -40, 0xffc76a, 0.032, 0.2], [15, 17, -40, 0xff9a6a, 0.032, -0.2],
      [-21, 19, -78, 0xffd890, 0.024, 0.3], [21, 19, -78, 0xffc080, 0.024, -0.3]]
    : [[-14, 16, -44, 0xffd890, 0.022, 0.18], [14, 16, -44, 0xffd890, 0.022, -0.18]];
  for (let i = 0; i < beams.length; i++) {
    const [x, y, z, color, opacity, tilt] = beams[i];
    ctx.add(K.volumetricBeam({
      x, y, z, length: 40, radius: 2.8, color, opacity, tilt, spin: 0.14 + i * 0.03,
    }));
  }
  // 促销灯柱（贴边；加色柱 + 地面光圈）
  const pillars = boss
    ? [[-11, -28, GOLD_HOT, 0.05], [11, -28, RED, 0.046], [-19, -56, RED, 0.04], [19, -56, GOLD_HOT, 0.04]]
    : [[-10.5, -30, GOLD_HOT, 0.034], [10.5, -30, GOLD_HOT, 0.034]];
  for (let i = 0; i < pillars.length; i++) {
    const [x, z, color, opacity] = pillars[i];
    const p = lightPillar(ctx, { x, z, color, h: boss ? 30 : 24, radius: boss ? 1.15 : 0.9, opacity });
    ctx.animate(p, { bob: { amp: 0.02, speed: 0.6, phase: i } });
    const ring = K.ring(1.1, 2.6, color, { opacity: boss ? 0.12 : 0.08 });
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, FLOOR_Y + 0.08, z);
    ctx.add(ring);
    ctx.updater((dt, t) => { ring.material.opacity = (boss ? 0.12 : 0.08) * (0.7 + 0.3 * Math.sin(t * 1.7 + i)); });
  }
  // 雾墙 / 雾带
  ctx.add(K.mistSheet({
    x: 0, y: 2, z: -78, w: 180, h: 52,
    color: mixHex(palette.fog, GOLD_DEEP, 0.5), opacity: boss ? 0.13 : 0.1, seed: 4, speed: 0.018,
  }));
  addFogBillboards(ctx, {
    color: '#8a6a3c', alpha: boss ? 0.13 : 0.1, count: 5, y: -1.5, zNear: -22, zFar: -130,
    w: 110, h: 26,
  });
}

/** 超现实：漂浮巨钱 / 价签 / 灯笼串 / 飘过的广告幡 / 金尘 */
function buildSurreal(ctx, boss) {
  const K = ctx.K;
  const { palette } = ctx;
  // 漂浮的巨型铜钱（上缘两侧，缓慢自转）
  const coins = boss
    ? [[-15.5, 19.5, -42, 5.2], [18, 24, -62, 4.2], [-22, 9, -56, 3.2]]
    : [[-14.5, 17.5, -46, 4.2], [17.5, 21, -64, 3.4]];
  for (let i = 0; i < coins.length; i++) {
    const [x, y, z, r] = coins[i];
    const coin = giantCoin(ctx, { x, y, z, r, hot: boss && i === 0 });
    coin.rotation.x = 0.12 + i * 0.05;
    ctx.add(coin);
    ctx.animate(coin, { spinZ: (i % 2 ? -1 : 1) * (0.09 + i * 0.025), bob: { amp: 0.014, speed: 0.3 + i * 0.08, phase: i } });
  }

  // 漂浮价签（和纸质感文字 billboard，两侧；位置随 z 贴边）
  const tags = boss
    ? [['¥9999', -9.4, 12, -24], ['¥8888', 9.8, 14, -26], ['¥199', -12.4, 4.5, -32],
      ['VIP', 12.8, 6, -34], ['¥49', -9.2, 21, -22], ['限时', 9.4, 21.5, -25]]
    : [['¥99', -9.2, 11, -26], ['VIP', 9.4, 12, -28], ['限时', -11.8, 4.5, -34], ['¥1999', 12.2, 5.5, -36]];
  for (let i = 0; i < tags.length; i++) {
    const [text, x, y, z] = tags[i];
    const sp = ctx.textSprite(text, {
      x, y, z, w: 3.1, h: 1.6,
      fill: '#5a140e', bg: 'rgba(238,226,196,0.9)',
      font: 'bold 150px "Noto Serif CJK SC", sans-serif', opacity: 0.82,
    });
    sp.material.rotation = (K.hash01(i * 61) - 0.5) * 0.24;
    ctx.add(sp);
    ctx.animate(sp, { bob: { amp: 0.012, speed: 0.4 + i * 0.09, phase: i * 1.3 } });
    const cord = K.cylinder(0.016, 0.016, 2.6, 0x2a1a0a, { kind: 'fabric', seg: 4 });
    cord.position.set(x, y + 2.1, z);
    ctx.add(cord);
  }

  // 两侧灯笼串（暖 practical，与暗金形成冷暖对照）
  ctx.add(K.hangingLights({ x: -13, y: 13.5, z: -32, count: 4, span: 11, sag: 0.9, color: 0xffb15c, lanternScale: 0.36, seed: 2 }));
  ctx.add(K.hangingLights({ x: 13, y: 15.5, z: -46, count: 4, span: 11, sag: 0.9, color: 0xffa04b, lanternScale: 0.32, seed: 5 }));

  // 循环掠过的广告幡（贴边，持续深入）
  const adTex = bannerTextures(ctx);
  ctx.field((i) => {
    const g = new ctx.THREE.Group();
    const w = 2.6 + K.hash01(i * 37) * 1.1;
    const sp = K.sprite(adTex[i % adTex.length], { w, h: w * 0.5, opacity: 0.92, fog: false });
    sp.material.toneMapped = false;
    g.add(sp);
    const bar = K.box(w * 1.18, 0.07, 0.07, 0x2a1a0a, { kind: 'wood', castShadow: false });
    bar.position.y = w * 0.28;
    g.add(bar);
    for (const side of [-1, 1]) {
      const cord = K.cylinder(0.01, 0.01, 1.1, 0x2a1a0a, { kind: 'fabric', seg: 4 });
      cord.position.set(side * w * 0.42, w * 0.28 + 0.55, 0);
      g.add(cord);
    }
    return g;
  }, { count: boss ? 9 : 7, zNear: -20, zFar: -108, xRange: 36, xAbsMin: 8, y: boss ? 9.5 : 8.5, speedMul: 0.8 });

  // 金尘风暴：逆着重力翻卷的加色尘埃
  ctx.points({
    count: boss ? 78 : 58, color: 0xffd88a, size: 0.13, type: 'spark',
    xRange: 34, yRange: 24, zNear: -3, zFar: -92, speed: boss ? 3.4 : 2.4, seed: boss ? 41 : 21,
  });
  ctx.points({
    count: boss ? 44 : 36, color: CREAM, size: 0.18, type: 'paper',
    xRange: 32, yRange: 26, zNear: -4, zFar: -86, speed: 1.9, seed: boss ? 47 : 27,
  });
  ctx.points({
    count: boss ? 36 : 24, color: 0xff8a4a, size: 0.17, type: 'spark',
    xRange: 30, yRange: 20, zNear: -2, zFar: -70, speed: 2.9, seed: boss ? 53 : 33,
  });
}

/** boss：VIP 金匾 + 票券风暴 + 金币涡旋 + 双色促销光柱全开 */
function buildBoss(ctx) {
  const K = ctx.K;
  // 金匾悬在左上缘（部分压出画面，保持中心干净）
  const plaque = new ctx.THREE.Group();
  const frame = K.box(23, 7.4, 0.7, GOLD, { kind: 'gold', roughness: 0.28, metalness: 1, envMapIntensity: 1.6, castShadow: true });
  const board = K.box(21.4, 6.2, 0.8, 0x4a1208, { kind: 'lacquer', roughness: 0.55, castShadow: false });
  board.position.z = 0.35;
  const text = ctx.textSprite('VIP专享', {
    x: 0, y: 0, z: 0.85, w: 18.5, h: 5,
    fill: '#ffe0a8', bg: 'rgba(38,11,3,0.94)',
    font: 'bold 108px "Noto Serif CJK SC", "Microsoft YaHei", serif', opacity: 0.97,
  });
  plaque.add(frame, board, text);
  plaque.position.set(-13, 29, -76);
  plaque.rotation.set(-0.05, 0.22, -0.06);
  ctx.add(plaque);
  ctx.animate(plaque, { bob: { amp: 0.012, speed: 0.26 } });
  // 匾缘灯
  for (let i = 0; i < 6; i++) {
    const b = glowBall(ctx, {
      x: -13 - 10 + i * 4, y: 25.6 + i * 0.22, z: -75.4, r: 0.19,
      color: i % 2 ? RED : GOLD_HOT, intensity: 3.0,
    });
    ctx.animate(b, { bob: { amp: 0.005, speed: 0.8, phase: i } });
  }

  // 票券风暴：水平椭圆环（全部压在上半区，避免压住弹幕区）
  const storm = new ctx.THREE.Group();
  storm.position.set(0, 18.5, -58);
  const texts = ['¥999', 'VIP', '买!', '清仓', '秒杀', '¥99'];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const sp = ctx.textSprite(texts[i % texts.length], {
      x: Math.cos(a) * 11.5, y: Math.sin(a) * 4.2, z: Math.sin(a) * 2.6,
      w: 2.9, h: 1.5,
      fill: i % 2 ? '#ffe8b0' : '#ffb15c', bg: 'rgba(58,14,8,0.8)',
      font: 'bold 140px "Noto Serif CJK SC", serif', opacity: 0.7,
    });
    storm.add(sp);
  }
  ctx.add(storm);
  ctx.animate(storm, { spinZ: 0.17 });

  // 金币涡旋（超现实：金雨绕门廊旋转）
  const swirl = K.coinField({ y: 14, z: -52, count: 44, spread: 20, seed: 61 });
  ctx.add(swirl);
  ctx.animate(swirl, { spinZ: 0.32, bob: { amp: 0.01, speed: 0.4 } });

  // 金红双色促销光柱全开（左右对称，贴边）
  const duo = [[-12.5, GOLD_HOT, 0.06], [12.5, RED, 0.058], [-20, RED, 0.04], [20, GOLD_HOT, 0.04]];
  for (let i = 0; i < duo.length; i++) {
    const [x, color, opacity] = duo[i];
    const col = lightPillar(ctx, { x, z: i < 2 ? -27 : -60, color, h: 34, radius: 1.35, opacity });
    ctx.animate(col, { bob: { amp: 0.02, speed: 0.5 + i * 0.1, phase: i } });
    floorGlow(ctx, { x: x * 1.3, z: i < 2 ? -24 : -55, color, w: 8, d: 34, opacity: opacity * 0.6 });
  }
  // 顶部双色扫光（斜向体积光加强）
  for (const side of [-1, 1]) {
    const beam = K.volumetricBeam({
      x: side * 9, y: 22, z: -38, length: 46, radius: 3.2,
      color: side < 0 ? GOLD_HOT : RED, opacity: 0.036, tilt: side * 0.34, spin: 0.34,
    });
    ctx.add(beam);
  }
  // 巨型铜钱再增一枚压顶（中心上缘，仅一圈暗金）
  const top = giantCoin(ctx, { x: 2, y: 32, z: -84, r: 6.5, hot: false });
  top.rotation.x = 0.2;
  ctx.add(top);
  ctx.animate(top, { spinZ: 0.07 });
}

function buildScene(ctx, boss) {
  const { palette } = ctx;
  ctx.atmosphere({
    bg: palette.skyBot,
    fogColor: mixHex(palette.fog, palette.ink, 0.62),
    fogDensity: boss ? 0.015 : 0.013,
    ambient: palette.ambient,
    ambientIntensity: 0.55,
    hemiSky: mixHex(palette.glow, palette.fog, 0.35),
    hemiGround: palette.ink,
    hemiIntensity: 0.5,
    dirColor: boss ? 0xffd8a0 : palette.glow,
    dirIntensity: boss ? 2.4 : 2.1,
    shadow: true,
    shadowSize: 1024,
  });

  buildSkyVeil(ctx, boss);
  buildFloor(ctx, boss);
  buildObeliskAvenue(ctx, boss);
  buildSalesGate(ctx, boss);
  buildLightAir(ctx, boss);
  buildSurreal(ctx, boss);
  if (boss) buildBoss(ctx);

  ctx.setSpeed(boss ? 14.5 : 10.5);
  ctx.setSway(boss ? 0.5 : 0.36, boss ? 0.24 : 0.18);
}

export function mid(ctx) {
  buildScene(ctx, false);
}

export function boss(ctx) {
  buildScene(ctx, true);
}
