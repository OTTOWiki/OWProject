/**
 * 3D 舞台通用氛围 Billboard：雾/云/浪花/地面反光/前景草木。
 * 均为 Billboard（Sprite/朝向面片）+ 公有领域材质，供各 stage builder 复用。
 * 素材缺失时整段跳过，不抛错。
 */
export function addFogBillboards(ctx, {
  color = '#9fb4b0', alpha = 0.18, count = 5,
  y = -2, xSpread = 30, zNear = -26, zFar = -150, w = 96, h = 26, speedMin = 0.0,
} = {}) {
  const K = ctx.K;
  const tex = ctx.matTexture('mist', color);
  if (!tex) return [];
  const out = [];
  for (let i = 0; i < count; i++) {
    const s = K.sprite(tex, {
      x: (K.hash01(i * 31 + 5) - 0.5) * xSpread,
      y: y + (K.hash01(i * 37 + 7) - 0.5) * 3,
      z: zFar + (i / Math.max(1, count - 1)) * (zFar - zNear) * -1,
      w: w * (0.7 + K.hash01(i * 41) * 0.6),
      h: h * (0.7 + K.hash01(i * 43) * 0.6),
      opacity: alpha * 0.55 * (0.7 + K.hash01(i * 47) * 0.6),
      color: 0xffffff,
      fog: false,
    });
    s.position.z = zNear - (i / Math.max(1, count - 1)) * (Math.abs(zFar) - Math.abs(zNear));
    ctx.add(s);
    ctx.animate(s, { bob: { amp: 0.04, speed: 0.15 + K.hash01(i * 53) * 0.1, phase: i } });
    out.push(s);
  }
  return out;
}

export function addCloudBillboards(ctx, {
  color = '#c8d8c8', alpha = 0.16, count = 3, y = 16, zNear = -50, zFar = -170,
} = {}) {
  const K = ctx.K;
  const tex = ctx.matTexture('cloud', color);
  if (!tex) return [];
  const out = [];
  for (let i = 0; i < count; i++) {
    const s = K.sprite(tex, {
      x: (K.hash01(i * 61 + 3) - 0.5) * 50,
      y: y + (K.hash01(i * 67) - 0.5) * 8,
      z: zNear - (i / Math.max(1, count - 1)) * (Math.abs(zFar) - Math.abs(zNear)),
      w: 110 + K.hash01(i * 71) * 60,
      h: 26 + K.hash01(i * 73) * 14,
      opacity: alpha * 0.7,
      fog: false,
    });
    ctx.add(s);
    out.push(s);
  }
  return out;
}

/** 地面画幅（把绘卷材质平铺在 3D 地面上，制造流动的地面质感） */
export function addFloorArt(ctx, {
  color = '#c8d8c8', alpha = 0.14, count = 4,
  y = -9.4, zNear = -20, zFar = -110, w = 140, h = 120, texture = 'washi',
} = {}) {
  const K = ctx.K;
  const tex = ctx.matTexture(texture, color);
  if (!tex) return [];
  const out = [];
  for (let i = 0; i < count; i++) {
    const p = K.panel(tex, {
      x: (K.hash01(i * 83 + 1) - 0.5) * 4,
      y,
      z: zNear - (i / Math.max(1, count - 1)) * (Math.abs(zFar) - Math.abs(zNear)),
      w: w * (0.8 + K.hash01(i * 89) * 0.4),
      h: h * (0.8 + K.hash01(i * 91) * 0.4),
      opacity: alpha * 0.55,
      color: 0xffffff,
      fog: true,
    });
    p.rotation.x = -Math.PI / 2;
    ctx.add(p);
    out.push(p);
  }
  return out;
}

/** 前景草木/枝条 Billboard（画面左右下角） */
export function addEdgeFlora(ctx, {
  grassColor = '#0a1810', plumColor = '#1a1016', alpha = 0.55, y = -7,
} = {}) {
  const K = ctx.K;
  const grass = ctx.matTexture('grass', grassColor);
  const plum = ctx.matTexture('plum', plumColor);
  if (grass) {
    for (const side of [-1, 1]) {
      ctx.add(K.sprite(grass, {
        x: side * 10.5, y, z: -9, w: 26, h: 11,
        opacity: alpha * 0.55, color: 0xbfd0b8, fog: true,
      }));
    }
  }
  if (plum) {
    for (const side of [-1, 1]) {
      const s = K.sprite(plum, {
        x: side * 11, y: 6, z: -14, w: 20, h: 18,
        opacity: alpha * 0.8, color: 0xd8c8d0, fog: true,
      });
      s.material.rotation = side * 0.2;
      ctx.add(s);
    }
  }
}

/** 一次性加入通用氛围（雾 + 云 + 地面画幅 + 前景草木） */
export function addBaseAtmosphere(ctx, {
  fogColor = '#9fb4b0', cloudColor = '#c8d8c8', floorColor = '#c8d8c8',
  fogAlpha = 0.18, cloudAlpha = 0.14, floorAlpha = 0.12, floraAlpha = 0.5,
} = {}) {
  addCloudBillboards(ctx, { color: cloudColor, alpha: cloudAlpha });
  addFogBillboards(ctx, { color: fogColor, alpha: fogAlpha });
  addFloorArt(ctx, { color: floorColor, alpha: floorAlpha });
  addEdgeFlora(ctx, { alpha: floraAlpha });
}
