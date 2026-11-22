/**
 * 关卡背景 3D 舞台工具包（Three.js）。
 *
 * 方向（2026-11-22 用户修正）：版面场景 = 持续深入的 3D 场景 + Billboard 材质绘卷 + 真 3D 物体混合，
 * 并大量使用超现实构图（倒置鸟居、漂浮巨月、悬空轮、数据门等）。
 *
 * 约定：
 * - 本文件顶层不访问 THREE.Xxx，只在函数调用时通过懒代理取模块（node 导入安全）；
 * - 所有随机走 hash01(seed)，不消费玩法随机流、可复现；
 * - 纹理优先复用 `js/bg/renderer.js` 的 plate 与 `js/bg/materials.js` 的材质；
 *   素材缺失时退化为纯色材质，不抛错。
 * - 设计说明：docs/level-background-redesign.md §3D。
 */
import { THREE } from '../backgrounds/threeLoader.js';
import { makeTextTexture } from '../backgrounds/textTexture.js';
import { plateImage } from '../bg/renderer.js';
import { getMaterialImage, getTintedMaterial } from '../bg/materials.js';
import { PLAYFIELD_BG_TEX } from '../bgModes.js';

/** 确定性随机 [0,1) */
export function hash01(n) {
  let x = (Math.imul((n | 0) + 0x9e3779b9, 0x85ebca6b) ^ 0x27d4eb2f) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35) >>> 0;
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** 区间随机 */
export function rr(seed, min, max) {
  return min + hash01(seed) * (max - min);
}

const plateTexCache = new Map();
const matTexCache = new Map();

function texFromImage(img) {
  const tex = new THREE.CanvasTexture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

/** 版面绘卷 plate 纹理（共享缓存，不要 dispose） */
export function plateTexture(mode) {
  const path = PLAYFIELD_BG_TEX[mode];
  if (!path) return null;
  if (plateTexCache.has(path)) return plateTexCache.get(path);
  const img = plateImage(path);
  if (!img) {
    plateTexCache.set(path, null);
    return null;
  }
  const tex = texFromImage(img);
  plateTexCache.set(path, tex);
  return tex;
}

/** 材质纹理（共享缓存，不要 dispose）；color 传入时取染色版 */
export function matTexture(name, color = null) {
  const key = color ? `${name}|${color}` : name;
  if (matTexCache.has(key)) return matTexCache.get(key);
  const img = color ? getTintedMaterial(name, color, 0.85) : getMaterialImage(name);
  const tex = img ? texFromImage(img) : null;
  matTexCache.set(key, tex);
  return tex;
}

/** 裁切一份贴图（超现实拼贴用；返回的克隆纹理由调用方负责释放） */
export function cropTexture(texture, sx, sy, sw, sh) {
  if (!texture) return null;
  const t = texture.clone();
  t.needsUpdate = true;
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(sw, sh);
  t.offset.set(sx, sy);
  return t;
}

/** 清空纹理缓存（仅测试/释放用） */
export function clearKitTextureCache() {
  for (const tex of plateTexCache.values()) tex?.dispose?.();
  for (const tex of matTexCache.values()) tex?.dispose?.();
  plateTexCache.clear();
  matTexCache.clear();
}

export function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({
    color, fog: true, transparent: !!opts.transparent, opacity: opts.opacity ?? 1, ...opts,
  });
}

export function lambert(color, opts = {}) {
  const { emissiveMix = 0.42, ...rest } = opts;
  return new THREE.MeshLambertMaterial({
    color,
    fog: true,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    emissive: new THREE.Color(color).multiplyScalar(emissiveMix),
    ...rest,
  });
}

/** 贴图面片（Sprite：始终面向相机 = Billboard） */
export function sprite(texture, {
  x = 0, y = 0, z = -20, w = 10, h = 10, opacity = 1, color = 0xffffff, blending = null, fog = true,
} = {}) {
  const mat = new THREE.SpriteMaterial({
    map: texture || null,
    color,
    transparent: true,
    opacity,
    fog,
    depthWrite: false,
  });
  if (blending !== null) mat.blending = blending;
  const s = new THREE.Sprite(mat);
  s.position.set(x, y, z);
  s.scale.set(w, h, 1);
  return s;
}

/** 固定朝向面片（天空/远景绘卷板） */
export function panel(texture, {
  x = 0, y = 0, z = -60, w = 60, h = 60, color = 0xffffff, opacity = 1, rotationY = 0, fog = false,
} = {}) {
  const mat = new THREE.MeshBasicMaterial({
    map: texture || null, color, transparent: true, opacity, fog, depthWrite: false, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotationY;
  return m;
}

/** 文本贴图 sprite（招牌/幢幡），返回 { sprite, texture } */
export function textSprite(lines, {
  x = 0, y = 0, z = -12, w = 4, h = 2,
  fill = '#efe6d0', bg = 'rgba(8,6,10,0.55)', font = 'bold 40px "Noto Serif CJK SC", "Microsoft YaHei", serif',
  opacity = 0.9,
} = {}) {
  const texture = makeTextTexture(lines, {
    w: 512, h: 256, fill, bg, font,
  });
  const s = sprite(texture, { x, y, z, w, h, opacity, fog: false });
  return { sprite: s, texture };
}

export function box(w, h, d, color, opts = {}) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color, opts));
}

export function cylinder(rTop, rBot, h, color, opts = {}) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, opts.seg ?? 10), lambert(color, opts));
}

export function cone(r, h, color, opts = {}) {
  return new THREE.Mesh(new THREE.ConeGeometry(r, h, opts.seg ?? 6), lambert(color, opts));
}

export function sphere(r, color, opts = {}) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, opts.seg ?? 12, opts.seg2 ?? 8), lambert(color, opts));
}

export function torus(r, tube, color, opts = {}) {
  return new THREE.Mesh(new THREE.TorusGeometry(r, tube, opts.radial ?? 6, opts.tubular ?? 24), lambert(color, opts));
}

export function ring(rInner, rOuter, color, opts = {}) {
  return new THREE.Mesh(new THREE.RingGeometry(rInner, rOuter, opts.seg ?? 32), basic(color, { transparent: true, side: THREE.DoubleSide, opacity: opts.opacity ?? 1 }));
}

export function lathe(points, color, opts = {}) {
  const vecs = points.map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.Mesh(new THREE.LatheGeometry(vecs, opts.seg ?? 16), lambert(color, opts));
}

/** 氛围：背景色 + 指数雾 + 两盏灯 */
export function atmosphere(scene, {
  bg = 0x0a0c10, fogColor = null, fogDensity = 0.02,
  ambient = 0x4a5468, ambientIntensity = 1.05,
  dirColor = 0xffffff, dirIntensity = 0.85,
} = {}) {
  scene.background = new THREE.Color(bg);
  scene.fog = new THREE.FogExp2(fogColor ?? bg, fogDensity);
  const amb = new THREE.AmbientLight(ambient, ambientIntensity);
  const dir = new THREE.DirectionalLight(dirColor, dirIntensity);
  dir.position.set(3, 6, 4);
  scene.add(amb, dir);
  return { amb, dir };
}

/** 地面（接收雾的暗色地板；可叠材质贴图） */
export function ground({
  y = -11, w = 240, d = 280, color = 0x0a0c10, texture = null, opacity = 1,
} = {}) {
  const mat = new THREE.MeshBasicMaterial({
    color, map: texture || null, transparent: opacity < 1, opacity, fog: true,
  });
  const geo = new THREE.PlaneGeometry(w, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, y, -95);
  return mesh;
}

/** 鸟居（可倒置：opts.flip） */
export function torii({
  x = 0, y = 0, z = -20, scale = 1, color = 0x8f2f36, dark = 0x2a0d12,
} = {}) {
  const g = new THREE.Group();
  const pw = 0.55 * scale;
  const gap = 4.4 * scale;
  const ph = 7.2 * scale;
  for (const side of [-1, 1]) {
    const p = cylinder(pw * 0.5, pw * 0.55, ph, color, { seg: 8 });
    p.position.set(side * gap, ph / 2, 0);
    g.add(p);
  }
  const nuki = box(gap * 2 + pw * 2.4, 0.45 * scale, 0.5 * scale, dark);
  nuki.position.y = ph * 0.78;
  const kasagi = box(gap * 2 + pw * 3.2, 0.55 * scale, 0.7 * scale, color);
  kasagi.position.y = ph * 1.02;
  const shimaki = box(gap * 2 + pw * 2.6, 0.28 * scale, 0.55 * scale, color);
  shimaki.position.y = ph * 0.96;
  g.add(nuki, kasagi, shimaki);
  g.position.set(x, y, z);
  return g;
}

/** 宝塔（层叠屋檐） */
export function pagoda({
  x = 0, y = 0, z = -30, scale = 1, tiers = 3,
  body = 0x141a18, roof = 0x0c1210, window = 0xd8c07a, flip = false,
} = {}) {
  const g = new THREE.Group();
  const tierH = 2.6 * scale;
  const bodyW = 3.2 * scale;
  for (let i = 0; i < tiers; i++) {
    const bw = bodyW * (1 - i * 0.16);
    const b = box(bw, tierH, bw, body);
    b.position.y = tierH * (i + 0.5);
    const win = box(bw * 0.22, tierH * 0.3, bw * 0.22, window, { transparent: true, opacity: 0.7 });
    win.position.y = tierH * (i + 0.55);
    win.position.z = bw * 0.5;
    const r = cone(bw * 0.82, tierH * 0.42, roof, { seg: 4 });
    r.position.y = tierH * (i + 1) + tierH * 0.12;
    r.rotation.y = Math.PI / 4;
    g.add(b, win, r);
  }
  const finial = cylinder(0.06 * scale, 0.18 * scale, 1.4 * scale, 0xc9a44e);
  finial.position.y = tierH * (tiers + 0.6);
  g.add(finial);
  g.position.set(x, y, z);
  if (flip) g.rotation.z = Math.PI;
  return g;
}

/** 方尖碑 */
export function obelisk({ x = 0, y = 0, z = -20, scale = 1, color = 0x8a6a1e, gold = 0xd8a94a } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.9 * scale, 9 * scale, 4), lambert(color));
  body.position.y = 4.5 * scale;
  const tip = cone(0.72 * scale, 1.5 * scale, gold, { seg: 4 });
  tip.position.y = 10 * scale;
  const base = box(2.2 * scale, 0.7 * scale, 2.2 * scale, 0x2a1d08);
  base.position.y = 0.35 * scale;
  g.add(body, tip, base);
  g.position.set(x, y, z);
  return g;
}

/** 棘轮/独轮（可旋转） */
export function spokedWheel({ x = 0, y = 0, z = -20, r = 6, tube = 0.35, color = 0xc0263a, spikes = 12 } = {}) {
  const g = new THREE.Group();
  g.add(torus(r, tube, color, { radial: 6, tubular: 28 }));
  for (let i = 0; i < 8; i++) {
    const spoke = box(0.22, r * 2, 0.22, color);
    spoke.rotation.z = (i / 8) * Math.PI * 2;
    g.add(spoke);
  }
  for (let i = 0; i < spikes; i++) {
    const sp = cone(0.5, r * 0.36, color, { seg: 4 });
    const a = (i / spikes) * Math.PI * 2;
    sp.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
    sp.rotation.z = a - Math.PI / 2;
    g.add(sp);
  }
  const hub = cylinder(r * 0.12, r * 0.12, 0.5, 0x1a0508);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  g.position.set(x, y, z);
  return g;
}

/** 摩天轮（轮 + 吊舱） */
export function ferrisWheel({
  x = 0, y = 0, z = -30, r = 10, color = 0x6a4a3a, accent = 0xf2a6c0, cabins = 10,
} = {}) {
  const g = new THREE.Group();
  g.add(torus(r, 0.4, color, { radial: 5, tubular: 40 }));
  for (let i = 0; i < cabins; i++) {
    const a = (i / cabins) * Math.PI * 2;
    const spoke = box(0.16, r * 2, 0.16, color);
    spoke.rotation.z = a;
    g.add(spoke);
    const cab = box(2.2, 2.2, 2.2, accent, { transparent: true, opacity: 0.8 });
    cab.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
    g.add(cab);
  }
  const hub = cylinder(0.8, 0.8, 1.4, 0x2a1418);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  g.position.set(x, y, z);
  return g;
}

/** 纸灯笼（发光球 + 上下箍） */
export function lantern({ x = 0, y = 0, z = -12, scale = 1, color = 0xf0a04b } = {}) {
  const g = new THREE.Group();
  const body = sphere(0.55 * scale, color, { transparent: true, opacity: 0.85 });
  body.scale.set(1, 1.25, 1);
  const cap1 = cylinder(0.2 * scale, 0.2 * scale, 0.16 * scale, 0x2a1208);
  cap1.position.y = 0.72 * scale;
  const cap2 = cap1.clone();
  cap2.position.y = -0.72 * scale;
  const cord = cylinder(0.02, 0.02, 2.4 * scale, 0x1a1410);
  cord.position.y = 1.9 * scale;
  g.add(body, cap1, cap2, cord);
  g.position.set(x, y, z);
  return g;
}

/** 六角防火墙格栅（LineSegments） */
export function hexLattice({ x = 0, y = 0, z = -30, w = 22, h = 14, size = 1.6, color = 0x7cc7f0, opacity = 0.5 } = {}) {
  const pts = [];
  const cols = Math.ceil(w / (size * 1.5)) + 1;
  const rows = Math.ceil(h / (size * 0.9)) + 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * size * 1.5 - w / 2;
      const cy = r * size * 0.9 - h / 2 + (c % 2 ? size * 0.45 : 0);
      for (let i = 0; i < 6; i++) {
        const a1 = (i / 6) * Math.PI * 2 - Math.PI / 6;
        const a2 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 6;
        pts.push(
          cx + Math.cos(a1) * size * 0.5, cy + Math.sin(a1) * size * 0.5, 0,
          cx + Math.cos(a2) * size * 0.5, cy + Math.sin(a2) * size * 0.5, 0,
        );
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, fog: true });
  const lines = new THREE.LineSegments(geo, mat);
  lines.position.set(x, y, z);
  return lines;
}

/** 悬浮之眼 */
export function eye({ x = 0, y = 0, z = -25, scale = 1, color = 0x8fb8c8, iris = 0xd8eef2, pupil = 0x10161c } = {}) {
  const g = new THREE.Group();
  const outer = ring(1.9 * scale, 2.2 * scale, color, { opacity: 0.8 });
  const white = sphere(1.35 * scale, iris, { transparent: true, opacity: 0.95 });
  white.scale.set(1, 0.7, 0.6);
  const p = sphere(0.55 * scale, pupil);
  p.scale.set(1, 1.2, 0.6);
  p.position.z = 0.7 * scale;
  const halo = ring(2.24 * scale, 2.5 * scale, color, { opacity: 0.35 });
  g.add(outer, white, p, halo);
  g.position.set(x, y, z);
  return g;
}

/** 宝瓶（Lathe） */
export function bottle({ x = 0, y = 0, z = -22, scale = 1, color = 0x2a2a16, rim = 0xcfe8a0 } = {}) {
  const profile = [
    [0.9, 0], [1.7, 0.6], [2.0, 2.4], [1.6, 4.0], [0.6, 4.8], [0.45, 6.2],
    [0.85, 6.8], [0.85, 7.4], [0.2, 7.4], [0.2, 6.4], [0.55, 5.2], [0.9, 4.3],
    [1.4, 2.2], [1.2, 0.8], [0.6, 0],
  ];
  const g = new THREE.Group();
  const body = lathe(profile, color, { seg: 16 });
  const rimM = torus(0.86, 0.12, rim, { radial: 4, tubular: 16 });
  rimM.rotation.x = Math.PI / 2;
  rimM.position.y = 7.3;
  g.add(body, rimM);
  g.position.set(x, y, z);
  return g;
}

/** 巨门/词条门 */
export function gate({ x = 0, y = 0, z = -32, w = 14, h = 20, color = 0x1e1230, accent = 0xd94fd0 } = {}) {
  const g = new THREE.Group();
  const sideL = box(1.8, h, 1.6, color);
  sideL.position.set(-w / 2, h / 2, 0);
  const sideR = sideL.clone();
  sideR.position.x = w / 2;
  const top = box(w + 1.8, 1.8, 1.6, color);
  top.position.y = h + 0.9;
  const inner = panel(null, { w: w - 3, h: h - 1, z: 0.2, color: accent, opacity: 0.14 });
  inner.position.y = h / 2;
  g.add(sideL, sideR, top, inner);
  const trim = box(w + 0.6, 0.25, 0.25, accent, { transparent: true, opacity: 0.8 });
  trim.position.set(0, h, 0.85);
  g.add(trim);
  g.position.set(x, y, z);
  return g;
}

/** 粒子（Points，CPU 更新；type: snow/rain/paper/binary/spark/bubble/petal） */
export function points({
  count = 60, color = '#ffffff', size = 0.18, type = 'spark',
  xRange = 24, yRange = 16, zNear = -6, zFar = -70, speed = 3, seed = 1,
} = {}) {
  const positions = new Float32Array(count * 3);
  const meta = [];
  for (let i = 0; i < count; i++) {
    const s = seed * 131 + i * 17;
    positions[i * 3] = rr(s, -xRange / 2, xRange / 2);
    positions[i * 3 + 1] = rr(s + 1, -yRange / 2, yRange / 2);
    positions[i * 3 + 2] = rr(s + 2, zFar, zNear);
    meta.push({
      x: positions[i * 3],
      y: positions[i * 3 + 1],
      vx: rr(s + 3, -0.6, 0.6),
      vy: rr(s + 4, -0.8, 0.8),
      phase: rr(s + 5, 0, Math.PI * 2),
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color, size, transparent: true, opacity: 0.85, depthWrite: false, fog: true,
    blending: type === 'spark' || type === 'binary' ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const p = new THREE.Points(geo, mat);
  return { points: p, meta, type, speed, xRange, yRange, zNear, zFar, count };
}

/** 更新一个 points 组（由 Stage3D 每帧调用） */
export function updatePoints(entry, dt, t) {
  const { points: p, meta, type, speed } = entry;
  const arr = p.geometry.attributes.position.array;
  for (let i = 0; i < meta.length; i++) {
    const m = meta[i];
    if (type === 'rain') {
      m.y -= speed * dt * 6;
      if (m.y < -entry.yRange / 2) m.y += entry.yRange;
    } else if (type === 'binary') {
      m.y -= speed * dt * 2.2;
      if (m.y < -entry.yRange / 2) m.y += entry.yRange;
    } else if (type === 'bubble') {
      m.y += speed * dt * 0.6;
      if (m.y > entry.yRange / 2) m.y -= entry.yRange;
    } else if (type === 'paper' || type === 'petal' || type === 'snow') {
      m.y -= speed * dt * 0.5;
      m.x += Math.sin(t * 0.6 + m.phase) * dt * 1.2;
      if (m.y < -entry.yRange / 2) m.y += entry.yRange;
    } else {
      m.y += m.vy * dt;
      m.x += m.vx * dt;
      if (m.y > entry.yRange / 2) m.y -= entry.yRange;
      if (m.y < -entry.yRange / 2) m.y += entry.yRange;
    }
    arr[i * 3] = m.x;
    arr[i * 3 + 1] = m.y;
  }
  p.geometry.attributes.position.needsUpdate = true;
}
