/**
 * 关卡背景 3D 舞台工具包 v2 —— 超写实 · 超现实主义。
 *
 * 方向（2026-11-22 用户第二次修正）：在「持续深入的 3D + Billboard + 真 3D + 超现实」基础上，
 * 升级为**超写实**（PBR 材质、程序化法线/粗糙度纹理、IBL 环境光、实时阴影、体积光、泛光/色调映射等
 * 电影级后处理）与更强烈的超现实构图（无限鸟居回廊、巨眼、悬浮巨月、镜像神殿、融化的糖果、无限门等）。
 *
 * 约定：
 * - 顶层不访问 THREE.Xxx（node 导入安全）；所有 THREE 使用都在函数调用期；
 * - 随机全部走 hash01/rr（确定性、不消费玩法种子流）；
 * - 材质纹理为程序化生成（Canvas → sRGB/线性），不新增外部素材依赖；
 * - 现有素材（绘制绘卷 plate / 材质 strip）继续作为「真实表面上的绘卷/壁毯/招牌」使用。
 *
 * 设计说明：docs/level-background-redesign.md §8。
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

// ===========================================================================
// 0. 程序化材质（超写实的核心：albedo / normal / roughness 三张图）
// ===========================================================================

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** 二维值噪声（确定性），返回 Float32Array 0..1 */
function valueNoise(w, h, seed, cells, octaves = 4, persistence = 0.55) {
  const out = new Float32Array(w * h);
  const rand = (ix, iy, s) => hash01((ix * 73856093) ^ (iy * 19349663) ^ (s * 83492791));
  const smooth = (t) => t * t * (3 - 2 * t);
  for (let o = 0; o < octaves; o++) {
    const cell = Math.max(1, Math.floor(cells * Math.pow(2, o)));
    const amp = Math.pow(persistence, o);
    const gw = cell + 1;
    const gy = cell + 1;
    const grid = new Float32Array(gw * gy);
    for (let y = 0; y < gy; y++) {
      for (let x = 0; x < gw; x++) grid[y * gw + x] = rand(x, y, seed + o * 977);
    }
    for (let y = 0; y < h; y++) {
      const fy = (y / h) * cell;
      const y0 = Math.min(cell - 1, fy | 0);
      const y1 = y0 + 1;
      const ty = smooth(fy - y0);
      for (let x = 0; x < w; x++) {
        const fx = (x / w) * cell;
        const x0 = Math.min(cell - 1, fx | 0);
        const x1 = x0 + 1;
        const tx = smooth(fx - x0);
        const a = grid[y0 * gw + x0] * (1 - tx) + grid[y0 * gw + x1] * tx;
        const b = grid[y1 * gw + x0] * (1 - tx) + grid[y1 * gw + x1] * tx;
        out[y * w + x] += (a * (1 - ty) + b * ty) * amp;
      }
    }
  }
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < out.length; i++) {
    if (out[i] < min) min = out[i];
    if (out[i] > max) max = out[i];
  }
  const inv = max > min ? 1 / (max - min) : 1;
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - min) * inv;
  return out;
}

/** 方向性条纹噪声（木纹/拉丝金属） */
function streakNoise(w, h, seed, freq = 26, wobble = 0.35) {
  const out = new Float32Array(w * h);
  const base = valueNoise(w, h, seed, 6, 4, 0.6);
  for (let y = 0; y < h; y++) {
    const shift = Math.sin((y / h) * Math.PI * 2 * 3) * wobble;
    for (let x = 0; x < w; x++) {
      const nx = (x / w + shift) % 1;
      const grain = Math.sin(nx * Math.PI * 2 * freq + base[y * w + x] * 4.2);
      out[y * w + x] = 0.55 + grain * 0.28 + (base[y * w + x] - 0.5) * 0.4;
    }
  }
  return out;
}

/** 高度场 → 切线空间法线贴图（RGBA） */
function heightToNormal(height, w, h, strength = 2.2) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = height[y * w + ((x - 1 + w) % w)];
      const r = height[y * w + ((x + 1) % w)];
      const u = height[((y - 1 + h) % h) * w + x];
      const d = height[((y + 1) % h) * w + x];
      let nx = (l - r) * strength;
      let ny = (u - d) * strength;
      let nz = 1;
      const inv = 1 / Math.hypot(nx, ny, nz);
      nx *= inv;
      ny *= inv;
      nz *= inv;
      const i = (y * w + x) * 4;
      data[i] = Math.round((nx * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  return data;
}

function grayTexture(height, w, h, lo = 0.25, hi = 0.95) {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const v = Math.round((lo + height[i] * (hi - lo)) * 255);
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  return data;
}

function canvasTexture(canvas, repeat = 1, srgb = false) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  if (srgb && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const MATERIAL_TEXTURE_CACHE = new Map();

const MATERIAL_KINDS = {
  wood: { seed: 11, cells: 5, repeat: 2, rough: [150, 235], metal: 0, normal: 2.4, srgbLo: 0.32, srgbHi: 0.95 },
  lacquer: { seed: 23, cells: 7, repeat: 3, rough: [60, 150], metal: 0.15, normal: 1.0, srgbLo: 0.55, srgbHi: 1.0 },
  stone: { seed: 37, cells: 9, repeat: 2, rough: [190, 255], metal: 0.02, normal: 3.2, srgbLo: 0.35, srgbHi: 1.0 },
  granite: { seed: 41, cells: 14, repeat: 2, rough: [170, 250], metal: 0.02, normal: 2.6, srgbLo: 0.3, srgbHi: 1.0 },
  metal: { seed: 53, cells: 4, repeat: 2, rough: [55, 150], metal: 0.92, normal: 1.4, srgbLo: 0.35, srgbHi: 0.9 },
  rust: { seed: 67, cells: 7, repeat: 3, rough: [130, 240], metal: 0.55, normal: 3.4, srgbLo: 0.25, srgbHi: 0.9 },
  gold: { seed: 71, cells: 6, repeat: 2, rough: [50, 120], metal: 1.0, normal: 1.8, srgbLo: 0.4, srgbHi: 1.0 },
  asphalt: { seed: 83, cells: 18, repeat: 4, rough: [190, 255], metal: 0.05, normal: 3.0, srgbLo: 0.2, srgbHi: 0.85 },
  paper: { seed: 97, cells: 10, repeat: 2, rough: [200, 255], metal: 0, normal: 1.2, srgbLo: 0.55, srgbHi: 1.0 },
  ceramic: { seed: 101, cells: 8, repeat: 2, rough: [40, 110], metal: 0.05, normal: 0.9, srgbLo: 0.5, srgbHi: 1.0 },
  water: { seed: 113, cells: 9, repeat: 4, rough: [18, 48], metal: 0.28, normal: 2.2, srgbLo: 0.5, srgbHi: 0.9 },
  fabric: { seed: 127, cells: 12, repeat: 3, rough: [180, 250], metal: 0, normal: 2.0, srgbLo: 0.35, srgbHi: 0.95 },
};

/** 取某类程序化材质的三张贴图（缓存；同 kind 共享） */
export function materialTextureSet(kind = 'stone') {
  const cfg = MATERIAL_KINDS[kind] || MATERIAL_KINDS.stone;
  if (MATERIAL_TEXTURE_CACHE.has(kind)) return MATERIAL_TEXTURE_CACHE.get(kind);
  const S = 256;
  const isStreak = kind === 'wood' || kind === 'metal';
  const height = isStreak
    ? streakNoise(S, S, cfg.seed, 30, 0.3)
    : valueNoise(S, S, cfg.seed, cfg.cells, 5, 0.58);
  // 补一层细颗粒，避免拉伸模糊
  const grain = valueNoise(S, S, cfg.seed + 7, 64, 2, 0.5);
  for (let i = 0; i < height.length; i++) height[i] = Math.min(1, Math.max(0, height[i] * 0.82 + grain[i] * 0.18));

  const albedo = makeCanvas(S, S);
  const ac = albedo.getContext('2d');
  const img = ac.createImageData(S, S);
  const alb = grayTexture(height, S, S, cfg.srgbLo, cfg.srgbHi);
  img.data.set(alb);
  ac.putImageData(img, 0, 0);

  const normal = makeCanvas(S, S);
  const nc = normal.getContext('2d');
  const nData = nc.createImageData(S, S);
  nData.data.set(heightToNormal(height, S, S, cfg.normal));
  nc.putImageData(nData, 0, 0);

  const rough = makeCanvas(S, S);
  const rc = rough.getContext('2d');
  const roughData = new Uint8Array(S * S * 4);
  for (let i = 0; i < S * S; i++) {
    const v = Math.round(cfg.rough[0] + height[i] * (cfg.rough[1] - cfg.rough[0]));
    roughData[i * 4] = v;
    roughData[i * 4 + 1] = v;
    roughData[i * 4 + 2] = v;
    roughData[i * 4 + 3] = 255;
  }
  const rData = rc.createImageData(S, S);
  rData.data.set(roughData);
  rc.putImageData(rData, 0, 0);

  const set = {
    map: canvasTexture(albedo, cfg.repeat, true),
    normalMap: canvasTexture(normal, cfg.repeat, false),
    roughnessMap: canvasTexture(rough, cfg.repeat, false),
    metalness: cfg.metal,
  };
  MATERIAL_TEXTURE_CACHE.set(kind, set);
  return set;
}

/** PBR 材质：默认带程序化 albedo/normal/roughness；envMapIntensity 打开 IBL 反应 */
export function pbr(color, opts = {}) {
  const kind = opts.kind || 'stone';
  const tex = materialTextureSet(kind);
  const mat = new THREE.MeshStandardMaterial({
    color,
    map: opts.map !== undefined ? opts.map : tex.map,
    normalMap: opts.normalMap !== undefined ? opts.normalMap : tex.normalMap,
    roughnessMap: opts.roughnessMap !== undefined ? opts.roughnessMap : tex.roughnessMap,
    roughness: opts.roughness ?? 1,
    metalness: opts.metalness ?? tex.metalness,
    envMapIntensity: opts.envMapIntensity ?? 0.9,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    flatShading: !!opts.flatShading,
  });
  if (opts.normalScale) mat.normalScale = new THREE.Vector2(opts.normalScale, opts.normalScale);
  return mat;
}

/** 发光材质（招牌/霓虹；交给 bloom 处理） */
export function emissive(color, intensity = 1.6) {
  return new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.4,
    metalness: 0,
    toneMapped: false,
  });
}

/** 玻璃/宝瓶（物理材质；transmission 在小屏可接受） */
export function glass(color, opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0,
    roughness: opts.roughness ?? 0.06,
    transmission: opts.transmission ?? 0.82,
    thickness: opts.thickness ?? 0.6,
    ior: opts.ior ?? 1.45,
    transparent: true,
    opacity: 1,
    envMapIntensity: opts.envMapIntensity ?? 1.3,
    clearcoat: opts.clearcoat ?? 0.6,
    clearcoatRoughness: 0.1,
    attenuationColor: opts.attenuationColor,
    attenuationDistance: opts.attenuationDistance ?? 2,
    side: opts.side ?? THREE.FrontSide,
    depthWrite: false,
  });
}

// ===========================================================================
// 1. 素材（既有 PD 绘卷/材质）与纹理
// ===========================================================================

const plateTexCache = new Map();
const matTexCache = new Map();

function texFromImage(img) {
  const tex = new THREE.CanvasTexture(img);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
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
  if (!img) return null; // 不缓存 null：预热/弱网恢复后再次 setMode 仍可取得纹理
  const tex = texFromImage(img);
  plateTexCache.set(path, tex);
  return tex;
}

/** 材质纹理（共享缓存，不要 dispose）；color 传入时取染色版 */
export function matTexture(name, color = null) {
  const key = color ? `${name}|${color}` : name;
  if (matTexCache.has(key)) return matTexCache.get(key);
  const img = color ? getTintedMaterial(name, color, 0.85) : getMaterialImage(name);
  if (!img) return null; // 不缓存 null，允许素材晚到后重建
  const tex = texFromImage(img);
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

export function clearKitTextureCache() {
  for (const tex of plateTexCache.values()) tex?.dispose?.();
  for (const tex of matTexCache.values()) tex?.dispose?.();
  plateTexCache.clear();
  matTexCache.clear();
  for (const set of MATERIAL_TEXTURE_CACHE.values()) {
    set.map?.dispose?.();
    set.normalMap?.dispose?.();
    set.roughnessMap?.dispose?.();
  }
  MATERIAL_TEXTURE_CACHE.clear();
}

/** 释放某 renderer 的 PMREM 生成器与全局 IBL 环境缓存（Stage3D dispose 时调用） */
export function disposeEnvironment(renderer) {
  try {
    const pm = pmremGeneratorCache.get(renderer);
    pm?.dispose?.();
    pmremGeneratorCache.delete(renderer);
  } catch (err) {
    /* ignore */
  }
  for (const rec of ENV_CACHE.values()) {
    try {
      rec.envMap?.dispose?.();
      rec.background?.dispose?.();
    } catch (err) {
      /* ignore */
    }
  }
  ENV_CACHE.clear();
}

// ===========================================================================
// 2. 环境光照（IBL）与超现实天空
// ===========================================================================

const ENV_CACHE = new Map();
const pmremGeneratorCache = new WeakMap();

function envCanvas(palette, opts = {}) {
  const W = 512;
  const H = 256;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const top = '#' + (palette.skyTop >>> 0).toString(16).padStart(6, '0');
  const bot = '#' + (palette.skyBot >>> 0).toString(16).padStart(6, '0');
  const glow = '#' + (palette.glow >>> 0).toString(16).padStart(6, '0');
  const fog = '#' + (palette.fog >>> 0).toString(16).padStart(6, '0');
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, top);
  grad.addColorStop(0.45, bot);
  grad.addColorStop(0.52, fog);
  grad.addColorStop(0.58, '#050506');
  grad.addColorStop(1, '#030304');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  // 天体（超现实：巨大月亮/多重月）
  const moonCount = opts.moons === undefined ? 2 : opts.moons;
  for (let i = 0; i < moonCount; i++) {
    const mx = (0.16 + i * 0.33 + (hash01(i * 11 + 3) - 0.5) * 0.1) * W;
    const my = (0.16 + (hash01(i * 13 + 5) - 0.5) * 0.08) * H;
    const mr = (opts.moonR ?? 0.1) * W * (0.7 + hash01(i * 17) * 0.7);
    const mg = g.createRadialGradient(mx, my, mr * 0.2, mx, my, mr * 3.6);
    mg.addColorStop(0, glow);
    mg.addColorStop(0.25, fog);
    mg.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.55;
    g.fillStyle = mg;
    g.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    g.globalAlpha = 0.9;
    g.fillStyle = glow;
    g.beginPath();
    g.arc(mx, my, mr, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 0.25;
    g.fillStyle = '#000';
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      g.arc(mx + (hash01(i * 31 + k) - 0.5) * mr * 1.2, my + (hash01(i * 37 + k) - 0.5) * mr * 1.2, mr * (0.1 + hash01(i * 41 + k) * 0.14), 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  // 云带（多层值噪声）
  const noise = valueNoise(256, 128, 991 + (opts.cloudSeed || 0), 5, 4, 0.6);
  const img = g.getImageData(0, 0, W, H);
  for (let y = 0; y < H * 0.3; y++) {
    for (let x = 0; x < W; x++) {
      const ny = (y / H) * 128;
      const nx = (x / W) * 256;
      const n = noise[((ny | 0) % 128) * 256 + ((nx | 0) % 256)];
      if (n > 0.6) {
        const i = (y * W + x) * 4;
        const a = (n - 0.6) * 1.6;
        img.data[i] = Math.min(255, img.data[i] + a * 40);
        img.data[i + 1] = Math.min(255, img.data[i + 1] + a * 36);
        img.data[i + 2] = Math.min(255, img.data[i + 2] + a * 34);
      }
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/**
 * 每 mode 生成/复用 IBL 环境（PMREM）与背景 equirect。
 * @param {THREE.WebGLRenderer} renderer
 * @param {string} key 唯一 key（通常 mode，可加质量后缀）
 * @param {object} palette
 */
export function environment(renderer, key, palette) {
  if (ENV_CACHE.has(key)) return ENV_CACHE.get(key);
  if (!pmremGeneratorCache.has(renderer)) pmremGeneratorCache.set(renderer, new THREE.PMREMGenerator(renderer));
  const pmrem = pmremGeneratorCache.get(renderer);
  const canvas = envCanvas(palette);
  const equirect = canvasTexture(canvas, 1, true);
  equirect.mapping = THREE.EquirectangularReflectionMapping;
  equirect.generateMipmaps = false;
  equirect.minFilter = THREE.LinearFilter;
  const envMap = pmrem.fromEquirectangular(equirect).texture;
  const rec = { envMap, background: equirect };
  // 缓存上限：保留最近 3 个（场景切换不频繁，且切换时可释放旧的）
  if (ENV_CACHE.size >= 3) {
    const first = ENV_CACHE.keys().next().value;
    const old = ENV_CACHE.get(first);
    ENV_CACHE.delete(first);
    old?.envMap?.dispose?.();
    old?.background?.dispose?.();
  }
  ENV_CACHE.set(key, rec);
  return rec;
}

// ===========================================================================
// 3. 基础材质/网格工厂（全部 PBR）
// ===========================================================================

export function basic(color, opts = {}) {
  const { fog = true, transparent = false, opacity = 1, ...rest } = opts;
  return new THREE.MeshBasicMaterial({ color, fog, transparent, opacity, ...rest });
}

/** 兼容旧名：PBR 漫反射材质 */
export function lambert(color, opts = {}) {
  return pbr(color, opts);
}

function configureMesh(mesh, opts = {}) {
  if (opts.castShadow !== false) mesh.castShadow = !!opts.castShadow;
  mesh.receiveShadow = opts.receiveShadow !== false;
  return mesh;
}

export function box(w, h, d, color, opts = {}) {
  return configureMesh(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), pbr(color, opts)), opts);
}

export function cylinder(rTop, rBot, h, color, opts = {}) {
  return configureMesh(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, opts.seg ?? 16, 1), pbr(color, opts)), opts);
}

export function cone(r, h, color, opts = {}) {
  return configureMesh(new THREE.Mesh(new THREE.ConeGeometry(r, h, opts.seg ?? 12, 1), pbr(color, opts)), opts);
}

export function sphere(r, color, opts = {}) {
  return configureMesh(new THREE.Mesh(new THREE.SphereGeometry(r, opts.seg ?? 24, opts.seg2 ?? 16), pbr(color, opts)), opts);
}

export function torus(r, tube, color, opts = {}) {
  return configureMesh(new THREE.Mesh(new THREE.TorusGeometry(r, tube, opts.radial ?? 10, opts.tubular ?? 40), pbr(color, opts)), opts);
}

export function ring(rInner, rOuter, color, opts = {}) {
  return new THREE.Mesh(new THREE.RingGeometry(rInner, rOuter, opts.seg ?? 48), basic(color, {
    transparent: true, side: THREE.DoubleSide, opacity: opts.opacity ?? 1, fog: opts.fog,
  }));
}

export function lathe(points, color, opts = {}) {
  const vecs = points.map(([x, y]) => new THREE.Vector2(x, y));
  return configureMesh(new THREE.Mesh(new THREE.LatheGeometry(vecs, opts.seg ?? 32), pbr(color, opts)), opts);
}

/** 沿曲线的管（注连绳/电缆/藤蔓/弯曲笠木） */
export function tube(points, radius, color, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, opts.seg ?? 24, radius, opts.radial ?? 8, false);
  return configureMesh(new THREE.Mesh(geo, pbr(color, opts)), opts);
}

// ===========================================================================
// 4. Billboard / 画幅 / 文字（超写实空间中的「不可解图像」）
// ===========================================================================

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
    toneMapped: true,
  });
  if (blending !== null) mat.blending = blending;
  const s = new THREE.Sprite(mat);
  s.position.set(x, y, z);
  s.scale.set(w, h, 1);
  return s;
}

export function panel(texture, {
  x = 0, y = 0, z = -60, w = 60, h = 60, color = 0xffffff, opacity = 1, rotationY = 0, fog = false,
} = {}) {
  const mat = new THREE.MeshStandardMaterial({
    map: texture || null,
    color,
    transparent: true,
    opacity,
    fog,
    depthWrite: false,
    side: THREE.DoubleSide,
    roughness: 0.85,
    metalness: 0,
    emissive: 0x0a0a0c,
    emissiveIntensity: 0.35,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotationY;
  return m;
}

/** 文字 sprite（招牌/幢幡）；用 emissive 以参与 bloom */
export function textSprite(lines, {
  x = 0, y = 0, z = -12, w = 4, h = 2,
  fill = '#efe6d0', bg = 'rgba(8,6,10,0.55)', font = 'bold 40px "Noto Serif CJK SC", "Microsoft YaHei", serif',
  opacity = 0.95,
} = {}) {
  const texture = makeTextTexture(lines, { w: 512, h: 256, fill, bg, font });
  const s = sprite(texture, { x, y, z, w, h, opacity, fog: false });
  s.material.toneMapped = false;
  return { sprite: s, texture };
}

// ===========================================================================
// 5. 光照 / 大气
// ===========================================================================

/**
 * 三点式光照 + 阴影 + 半球环境光。
 * 返回的 dir 会被 stage3d 配置为投射阴影。
 */
export function atmosphere(scene, {
  bg = 0x0a0c10, fogColor = null, fogDensity = 0.02,
  ambient = 0x4a5468, ambientIntensity = 0.6,
  hemiSky = 0x8899bb, hemiGround = 0x201810, hemiIntensity = 0.55,
  dirColor = 0xffffff, dirIntensity = 2.2,
  shadow = true, shadowSize = 1024,
} = {}) {
  scene.background = new THREE.Color(bg);
  scene.fog = new THREE.FogExp2(fogColor ?? bg, fogDensity);
  const hemi = new THREE.HemisphereLight(hemiSky, hemiGround, hemiIntensity);
  const amb = new THREE.AmbientLight(ambient, ambientIntensity);
  const dir = new THREE.DirectionalLight(dirColor, dirIntensity);
  dir.position.set(9, 20, 6);
  dir.castShadow = shadow;
  if (shadow) {
    dir.shadow.mapSize.set(shadowSize, shadowSize);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 90;
    dir.shadow.camera.left = -26;
    dir.shadow.camera.right = 26;
    dir.shadow.camera.top = 26;
    dir.shadow.camera.bottom = -26;
    dir.shadow.bias = -0.0006;
    dir.shadow.normalBias = 0.03;
  }
  const rim = new THREE.DirectionalLight(dirColor, dirIntensity * 0.35);
  rim.position.set(-8, 6, -14);
  scene.add(hemi, amb, dir, rim);
  return { amb, dir, hemi, rim };
}

/** 镜面/湿滑地面（PBR 水面 + 程序化法线；超写实反射） */
export function waterFloor({ y = -6, size = [260, 320], color = 0x03050a, normalScale = 0.16, roughness = 0.14 } = {}) {
  const tex = materialTextureSet('water');
  const mat = new THREE.MeshStandardMaterial({
    color,
    map: null,
    normalMap: tex.normalMap,
    normalScale: new THREE.Vector2(normalScale, normalScale),
    roughness,
    metalness: 0.35,
    envMapIntensity: 0.8,
    transparent: true,
    opacity: 0.96,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1], 1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, y, -100);
  mesh.receiveShadow = true;
  mesh.userData.water = { tex, speed: 0.008 };
  return mesh;
}

/** 干地/石地面（可叠绘卷材质作为「地衣/壁画」） */
export function ground({
  y = -11, w = 240, d = 280, color = 0x0a0c10, texture = null, kind = 'asphalt', opacity = 1,
} = {}) {
  const mat = pbr(color, { kind, map: texture || undefined, roughness: 0.9, transparent: opacity < 1, opacity });
  const geo = new THREE.PlaneGeometry(w, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, y, -95);
  mesh.receiveShadow = true;
  return mesh;
}

/** 体积光柱（锥体 + 自定义衰减 shader；超写实「神光」） */
export function volumetricBeam({
  x = 0, y = 0, z = -20, length = 26, radius = 3.2, color = 0xffe6b0, opacity = 0.14,
  tilt = 0, spin = 0, dir = -1,
} = {}) {
  const geo = new THREE.ConeGeometry(radius, length, 24, 1, true);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main(){
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; uniform float uTime;
      varying vec2 vUv; varying vec3 vNormal;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        float edge = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
        float endFade = smoothstep(0.0, 0.38, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
        float dust = 0.72 + 0.28 * sin(vUv.y * 18.0 + uTime * 0.7 + hash(vUv) * 6.28);
        float a = edge * endFade * dust * uOpacity;
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.z = Math.PI + tilt;
  mesh.userData.beam = { spin, phase: hash01((x * 13 + y * 7 + z * 3) | 0) * 6.28 };
  return mesh;
}

/** 雾墙/雾层（shader 滚动噪声，遮住地平线，超写实空气感） */
export function mistSheet({
  x = 0, y = 0, z = -40, w = 120, h = 40, color = 0xb8c8c8, opacity = 0.32, seed = 1, speed = 0.02,
} = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
      uSeed: { value: seed },
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; uniform float uTime; uniform float uSeed;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p); vec2 f = fract(p);
        float a = hash(i); float b = hash(i+vec2(1.0,0.0));
        float c = hash(i+vec2(0.0,1.0)); float d = hash(i+vec2(1.0,1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
      }
      void main(){
        vec2 p = vUv * vec2(4.0, 2.2) + vec2(uTime*0.03, uTime*0.01) + uSeed;
        float n = noise(p) * 0.55 + noise(p*2.3) * 0.3 + noise(p*5.1) * 0.15;
        float edge = smoothstep(0.0,0.28,vUv.y) * smoothstep(1.0,0.55,vUv.y);
        float side = smoothstep(0.0,0.12,vUv.x) * smoothstep(1.0,0.88,vUv.x);
        float a = smoothstep(0.32,0.82,n) * edge * side * uOpacity;
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.userData.mist = { speed };
  return m;
}

/** 悬浮尘埃 / 花瓣 / 雨（Points，带软圆贴图，参与 bloom） */
let POINT_TEXTURE = null;
function pointTexture() {
  if (POINT_TEXTURE) return POINT_TEXTURE;
  const c = makeCanvas(64, 64);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  POINT_TEXTURE = new THREE.CanvasTexture(c);
  return POINT_TEXTURE;
}

export function points({
  count = 60, color = '#ffffff', size = 0.14, type = 'spark',
  xRange = 24, yRange = 16, zNear = -16, zFar = -70, speed = 3, seed = 1,
} = {}) {
  zNear = Math.min(zNear, -14);
  const positions = new Float32Array(count * 3);
  const meta = [];
  for (let i = 0; i < count; i++) {
    const s = seed * 131 + i * 17;
    positions[i * 3] = rr(s, -xRange / 2, xRange / 2);
    positions[i * 3 + 1] = rr(s + 1, -yRange / 2, yRange / 2);
    positions[i * 3 + 2] = rr(s + 2, zFar, zNear);
    meta.push({
      x: positions[i * 3], y: positions[i * 3 + 1],
      vx: rr(s + 3, -0.6, 0.6), vy: rr(s + 4, -0.8, 0.8),
      phase: rr(s + 5, 0, Math.PI * 2),
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const glowTypes = type === 'spark' || type === 'binary' || type === 'rain';
  const mat = new THREE.PointsMaterial({
    color,
    size,
    map: pointTexture(),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    fog: true,
    sizeAttenuation: true,
    alphaTest: 0.02,
    blending: glowTypes ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
  });
  const p = new THREE.Points(geo, mat);
  return { points: p, meta, type, speed, xRange, yRange, zNear, zFar, count };
}

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

// ===========================================================================
// 6. 超现实景物部件（全部 PBR + 细节）
// ===========================================================================

/** 鸟居（风化木/朱漆，带注连绳与笠木曲线） */
export function torii({
  x = 0, y = 0, z = -20, scale = 1, color = 0x7a1f26, dark = 0x2a0d12, wood = false,
} = {}) {
  const g = new THREE.Group();
  const pw = 0.55 * scale;
  const gap = 4.2 * scale;
  const ph = 7.4 * scale;
  const kind = wood ? 'wood' : 'lacquer';
  for (const side of [-1, 1]) {
    const p = cylinder(pw * 0.5, pw * 0.62, ph, color, { seg: 20, kind, roughness: 0.75 });
    p.position.set(side * gap, ph / 2, 0);
    g.add(p);
    // 柱脚石
    const base = cylinder(pw * 0.85, pw * 0.95, 0.4 * scale, 0x30302c, { seg: 14, kind: 'granite' });
    base.position.set(side * gap, 0.2 * scale, 0);
    g.add(base);
  }
  // 贯
  const nuki = box(gap * 2 + pw * 2.6, 0.45 * scale, 0.5 * scale, dark, { kind, roughness: 0.8 });
  nuki.position.y = ph * 0.78;
  // 笠木：用管道做出两端上翘的曲线
  const kasagiPts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const xx = (t - 0.5) * (gap * 2 + pw * 4.2);
    const yy = ph * 1.02 + Math.pow(Math.abs(t - 0.5) * 2, 2.2) * 0.55 * scale;
    kasagiPts.push([xx, yy, 0]);
  }
  const kasagi = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(kasagiPts.map((p) => new THREE.Vector3(...p))), 26, 0.28 * scale, 10, false),
    pbr(color, { kind, roughness: 0.6 }),
  );
  kasagi.castShadow = true;
  const shimaki = box(gap * 2 + pw * 2.8, 0.26 * scale, 0.55 * scale, color, { kind, roughness: 0.7 });
  shimaki.position.y = ph * 0.955;
  g.add(nuki, kasagi, shimaki);
  // 注连绳 + 纸垂
  const ropePts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const sag = Math.sin(t * Math.PI) * 1.05 * scale;
    ropePts.push([(t - 0.5) * gap * 1.9, ph * 0.92 - sag, 0]);
  }
  const rope = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ropePts.map((p) => new THREE.Vector3(...p))), 22, 0.075 * scale, 8, false),
    pbr(0xcbbd93, { kind: 'fabric', roughness: 0.95 }),
  );
  rope.castShadow = true;
  g.add(rope);
  for (let i = -2; i <= 2; i++) {
    const shide = box(0.16 * scale, 0.62 * scale, 0.02, 0xf1ead6, { kind: 'paper', roughness: 1 });
    shide.position.set(i * 1.3 * scale, ph * 0.9 - 0.36 * scale, 0.04);
    g.add(shide);
  }
  g.position.set(x, y, z);
  return g;
}

/** 宝塔（石/木结构，层叠屋檐 + 发光窗与风铎） */
export function pagoda({
  x = 0, y = 0, z = -30, scale = 1, tiers = 3,
  body = 0x2a2420, roof = 0x141210, window = 0xd8c07a, flip = false, glow = false,
} = {}) {
  const g = new THREE.Group();
  const tierH = 2.7 * scale;
  const bodyW = 3.6 * scale;
  for (let i = 0; i < tiers; i++) {
    const bw = bodyW * (1 - i * 0.14);
    const b = box(bw, tierH, bw, body, { kind: 'wood', roughness: 0.8 });
    b.position.y = tierH * (i + 0.5);
    // 窗（发光纸窗）
    const winMat = glow ? emissive(window, 1.1) : pbr(window, { kind: 'paper', emissive: window, emissiveIntensity: 0.25 });
    const win = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.18, tierH * 0.34, 0.06), winMat);
    win.position.set(0, tierH * (i + 0.55), bw * 0.5 + 0.03);
    g.add(b, win);
    // 屋檐（四坡，带檐口厚度与起翘）
    const roofMat = pbr(roof, { kind: 'stone', roughness: 0.75, metalness: 0.05 });
    const roofMesh = new THREE.Mesh(new THREE.ConeGeometry(bw * 0.9, tierH * 0.5, 4, 1, false), roofMat);
    roofMesh.rotation.y = Math.PI / 4;
    roofMesh.position.y = tierH * (i + 1.15);
    roofMesh.castShadow = true;
    g.add(roofMesh);
    const eave = box(bw * 1.24, 0.16 * scale, bw * 1.24, roof, { kind: 'wood', roughness: 0.8 });
    eave.position.y = tierH * (i + 0.98);
    g.add(eave);
    // 风铎
    const bell = sphere(0.07 * scale, 0xd8b45a, { kind: 'gold', seg: 8, seg2: 6 });
    bell.position.set(bw * 0.6, tierH * (i + 0.85), bw * 0.6);
    g.add(bell);
  }
  const finial = cylinder(0.05 * scale, 0.16 * scale, 1.8 * scale, 0xc9a44e, { kind: 'gold', seg: 10 });
  finial.position.y = tierH * (tiers + 0.9);
  g.add(finial);
  g.position.set(x, y, z);
  if (flip) g.rotation.z = Math.PI;
  return g;
}

/** 方尖碑（抛光金属/石，阶梯基座） */
export function obelisk({ x = 0, y = 0, z = -20, scale = 1, color = 0x8a6a1e, gold = 0xd8a94a, kind = 'gold' } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.95 * scale, 10 * scale, 4, 1), pbr(color, { kind, roughness: 0.35, metalness: kind === 'gold' ? 1 : 0.2 }));
  body.position.y = 5 * scale;
  body.castShadow = true;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.72 * scale, 1.6 * scale, 4), pbr(gold, { kind: 'gold', roughness: 0.18, metalness: 1, envMapIntensity: 1.8 }));
  tip.position.y = 10.9 * scale;
  tip.castShadow = true;
  g.add(body, tip);
  for (let s = 0; s < 3; s++) {
    const base = box((2.6 - s * 0.45) * scale, 0.36 * scale, (2.6 - s * 0.45) * scale, 0x2a241c, { kind: 'granite' });
    base.position.y = (0.18 + s * 0.36) * scale;
    g.add(base);
  }
  g.position.set(x, y, z);
  return g;
}

/** 棘轮/独轮（锈蚀金属 + 发光轮缘） */
export function spokedWheel({ x = 0, y = 0, z = -20, r = 6, tube = 0.35, color = 0x8a2a32, spikes = 12, glow = 0xff3a45 } = {}) {
  const g = new THREE.Group();
  const rim = torus(r, tube, color, { kind: 'rust', radial: 10, tubular: 48, roughness: 0.6 });
  g.add(rim);
  for (let i = 0; i < 10; i++) {
    const spoke = cylinder(0.08, 0.12, r * 2, color, { kind: 'rust', seg: 8 });
    spoke.rotation.z = (i / 10) * Math.PI * 2;
    g.add(spoke);
  }
  for (let i = 0; i < spikes; i++) {
    const sp = cone(0.32, r * 0.4, 0x6a2028, { kind: 'metal', seg: 6 });
    const a = (i / spikes) * Math.PI * 2;
    sp.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
    sp.rotation.z = a - Math.PI / 2;
    g.add(sp);
  }
  const hub = cylinder(r * 0.14, r * 0.14, 0.8, 0x201416, { kind: 'rust', seg: 16 });
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  // 发光线环（bloom）
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(r * 1.03, 0.035, 6, 64), emissive(glow, 2.2));
  g.add(glowRing);
  g.position.set(x, y, z);
  return g;
}

/** 摩天轮（金属桁架 + 玻璃吊舱 + 灯串） */
export function ferrisWheel({
  x = 0, y = 0, z = -30, r = 10, color = 0x5a3a2e, accent = 0xf2a6c0, cabins = 12, glow = 0xffd0e0,
} = {}) {
  const g = new THREE.Group();
  const ring1 = torus(r, 0.22, color, { kind: 'rust', radial: 8, tubular: 64 });
  const ring2 = torus(r * 0.92, 0.14, color, { kind: 'metal', radial: 6, tubular: 48 });
  g.add(ring1, ring2);
  for (let i = 0; i < cabins; i++) {
    const a = (i / cabins) * Math.PI * 2;
    const spoke = cylinder(0.06, 0.08, r * 2, color, { kind: 'metal', seg: 6 });
    spoke.rotation.z = a;
    g.add(spoke);
    const cab = new THREE.Group();
    const frame = box(1.9, 1.9, 1.9, color, { kind: 'rust', roughness: 0.7 });
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 1.92), emissive(glow, 0.8));
    win.position.y = 0.1;
    cab.add(frame, win);
    cab.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
    cab.rotation.z = -a;
    g.add(cab);
  }
  const hub = cylinder(1.0, 1.0, 2.0, 0x2a1c18, { kind: 'rust', seg: 20 });
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  g.position.set(x, y, z);
  return g;
}

/** 纸灯笼（发光纸 + 点光源） */
export function lantern({ x = 0, y = 0, z = -12, scale = 1, color = 0xf0a04b, light = false, intensity = 8 } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55 * scale, 18, 12), new THREE.MeshStandardMaterial({
    color: 0x502010,
    emissive: color,
    emissiveIntensity: 1.5,
    roughness: 0.6,
    transparent: true,
    opacity: 0.96,
    toneMapped: false,
  }));
  body.scale.set(1, 1.28, 1);
  const top = cylinder(0.22 * scale, 0.22 * scale, 0.14 * scale, 0x1a120c, { kind: 'wood', seg: 12 });
  top.position.y = 0.74 * scale;
  const bot = top.clone();
  bot.position.y = -0.74 * scale;
  const cord = cylinder(0.015, 0.015, 2.6 * scale, 0x14100c, { kind: 'fabric', seg: 4 });
  cord.position.y = 2.0 * scale;
  g.add(body, top, bot, cord);
  if (light) {
    const pl = new THREE.PointLight(color, intensity, 14 * scale, 2);
    pl.position.y = 0;
    g.add(pl);
  }
  g.position.set(x, y, z);
  return g;
}

/** 巨眼（湿润巩膜 + 纤维虹膜 + 角膜） */
export function eye({ x = 0, y = 0, z = -25, scale = 1, color = 0x8fb8c8, iris = 0xd8eef2, pupil = 0x10161c } = {}) {
  const g = new THREE.Group();
  const sclera = new THREE.Mesh(new THREE.SphereGeometry(1.7 * scale, 32, 24), new THREE.MeshPhysicalMaterial({
    color: 0xd8d4c8,
    roughness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.2,
  }));
  sclera.scale.set(1, 0.78, 0.6);
  // 虹膜（程序化放射纤维）
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  const ic = '#' + (iris >>> 0).toString(16).padStart(6, '0');
  ctx.fillStyle = ic;
  ctx.beginPath();
  ctx.arc(128, 128, 126, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 220; i++) {
    const a = hash01(i * 7) * Math.PI * 2;
    const len = 60 + hash01(i * 11) * 62;
    ctx.strokeStyle = `rgba(10,20,30,${0.08 + hash01(i * 13) * 0.22})`;
    ctx.lineWidth = 0.6 + hash01(i * 17) * 1.6;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * 26, 128 + Math.sin(a) * 26);
    ctx.lineTo(128 + Math.cos(a) * (26 + len), 128 + Math.sin(a) * (26 + len));
    ctx.stroke();
  }
  const irisTex = new THREE.CanvasTexture(c);
  const irisMesh = new THREE.Mesh(new THREE.CircleGeometry(0.95 * scale, 32), new THREE.MeshStandardMaterial({
    map: irisTex, roughness: 0.25, metalness: 0.05, emissive: iris, emissiveIntensity: 0.18,
  }));
  irisMesh.position.set(0, 0, 1.02 * scale);
  const pupilMesh = new THREE.Mesh(new THREE.CircleGeometry(0.34 * scale, 28), new THREE.MeshStandardMaterial({
    color: pupil, roughness: 0.15, metalness: 0.2,
  }));
  pupilMesh.position.set(0, 0, 1.045 * scale);
  const cornea = new THREE.Mesh(new THREE.SphereGeometry(1.72 * scale, 28, 20), new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.02, transmission: 0.96, thickness: 0.4, ior: 1.35,
    transparent: true, opacity: 0.35, depthWrite: false, envMapIntensity: 1.5,
  }));
  cornea.scale.set(1, 0.78, 0.62);
  const ringMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.7 });
  const outer = new THREE.Mesh(new THREE.TorusGeometry(1.95 * scale, 0.09 * scale, 8, 64), ringMat);
  g.add(sclera, irisMesh, pupilMesh, cornea, outer);
  g.position.set(x, y, z);
  return g;
}

/** 宝瓶（物理玻璃 + 破损碎片由 builder 自行添加） */
export function bottle({ x = 0, y = 0, z = -22, scale = 1, color = 0x3a3020, rim = 0xcfe8a0, cracked = false } = {}) {
  const profile = [
    [0.9, 0], [1.7, 0.6], [2.0, 2.4], [1.6, 4.0], [0.6, 4.8], [0.45, 6.2],
    [0.85, 6.8], [0.85, 7.4], [0.2, 7.4], [0.2, 6.4], [0.55, 5.2], [0.9, 4.3],
    [1.4, 2.2], [1.2, 0.8], [0.6, 0],
  ];
  const g = new THREE.Group();
  const body = lathe(profile, color, { kind: 'ceramic', roughness: 0.25, metalness: 0.1, envMapIntensity: 1.2 });
  g.add(body);
  // 瓶口金属环
  const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.11, 10, 32), pbr(rim, { kind: 'gold', roughness: 0.2, metalness: 1 }));
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = 7.32;
  g.add(rimMesh);
  // 裂纹（发光线）
  if (cracked) {
    const crackMat = emissive(rim, 2.4);
    for (let i = 0; i < 5; i++) {
      const a = hash01(i * 13) * Math.PI * 2;
      const len = 2.2 + hash01(i * 17) * 3.2;
      const crack = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.01, len, 4), crackMat);
      crack.position.set(Math.sin(a) * 0.8, 2 + hash01(i * 19) * 3.6, Math.cos(a) * 0.8);
      crack.rotation.z = (hash01(i * 23) - 0.5) * 1.6;
      crack.rotation.x = (hash01(i * 29) - 0.5) * 1.2;
      g.add(crack);
    }
  }
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  return g;
}

/** 巨门/词条门（石/金属结构 + 发光门芯 + 体积光） */
export function gate({ x = 0, y = 0, z = -32, w = 14, h = 20, color = 0x1e1a1c, accent = 0xd94fd0, glow = true } = {}) {
  const g = new THREE.Group();
  const sideL = box(1.7, h, 1.8, color, { kind: 'stone', roughness: 0.8 });
  sideL.position.set(-w / 2, h / 2, 0);
  const sideR = sideL.clone();
  sideR.position.x = w / 2;
  const top = box(w + 1.7, 1.7, 1.8, color, { kind: 'stone', roughness: 0.8 });
  top.position.y = h + 0.85;
  g.add(sideL, sideR, top);
  // 门芯（发光面）
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(w - 3, h - 1), new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: accent, emissiveIntensity: 0.55, roughness: 0.5, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false,
  }));
  inner.position.set(0, h / 2, 0.2);
  g.add(inner);
  // 金属饰边
  const trim = box(w + 0.5, 0.16, 0.16, accent, { kind: 'metal', emissive: accent, emissiveIntensity: 1.8 });
  trim.position.set(0, h, 0.9);
  g.add(trim);
  if (glow) {
    const light = new THREE.PointLight(accent, 30, 40, 2);
    light.position.set(0, h / 2, 2);
    g.add(light);
  }
  g.position.set(x, y, z);
  return g;
}

/** 悬浮岩块（超现实漂浮岛/碎岩） */
export function floatingRocks({ x = 0, y = 0, z = -20, count = 5, spread = 8, color = 0x2a2a28, seed = 1 } = {}) {
  const g = new THREE.Group();
  const kind = 'granite';
  for (let i = 0; i < count; i++) {
    const r = 0.8 + hash01(seed + i * 7) * 2.4;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), pbr(color, { kind, roughness: 0.9 }));
    rock.position.set(
      (hash01(seed + i * 11) - 0.5) * spread,
      (hash01(seed + i * 13) - 0.5) * spread * 0.7,
      (hash01(seed + i * 17) - 0.5) * spread * 1.6,
    );
    rock.rotation.set(hash01(seed + i * 19) * 3, hash01(seed + i * 23) * 3, hash01(seed + i * 29) * 3);
    rock.castShadow = true;
    rock.receiveShadow = true;
    g.add(rock);
  }
  g.position.set(x, y, z);
  return g;
}

/** 铜钱堆 / 硬币（实例化） */
export function coinField({ x = 0, y = 0, z = -14, count = 70, spread = 9, seed = 1 } = {}) {
  const geo = new THREE.CylinderGeometry(0.28, 0.28, 0.05, 16);
  const mat = pbr(0xd8ad4e, { kind: 'gold', roughness: 0.32, metalness: 1, envMapIntensity: 1.5 });
  const inst = new THREE.InstancedMesh(geo, mat, count);
  inst.castShadow = true;
  inst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    dummy.position.set(
      (hash01(seed + i * 5) - 0.5) * spread,
      hash01(seed + i * 7) * 0.6,
      (hash01(seed + i * 11) - 0.5) * spread,
    );
    dummy.rotation.set((hash01(seed + i * 13) - 0.5) * 0.4, hash01(seed + i * 17) * 6.28, (hash01(seed + i * 19) - 0.5) * 0.4);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.position.set(x, y, z);
  return inst;
}

/** 镜片/碎玻璃悬浮群 */
export function shardField({ x = 0, y = 0, z = -18, count = 12, spread = 10, color = 0xbfe0ff, seed = 2 } = {}) {
  const g = new THREE.Group();
  const mat = glass(color, { transmission: 0.7, roughness: 0.05, side: THREE.DoubleSide, thickness: 0.2 });
  for (let i = 0; i < count; i++) {
    const geo = new THREE.PlaneGeometry(0.6 + hash01(seed + i * 5) * 2.2, 0.6 + hash01(seed + i * 7) * 2.8);
    const m = new THREE.Mesh(geo, mat);
    m.position.set((hash01(seed + i * 11) - 0.5) * spread, (hash01(seed + i * 13) - 0.5) * spread, (hash01(seed + i * 17) - 0.5) * spread);
    m.rotation.set(hash01(seed + i * 19) * 3.14, hash01(seed + i * 23) * 3.14, hash01(seed + i * 29) * 3.14);
    g.add(m);
  }
  g.position.set(x, y, z);
  return g;
}

/** 悬挂布幔（可摆动；文告/帷幕） */
export function curtain({ x = 0, y = 0, z = -16, w = 6, h = 10, color = 0x7a1f26, texture = null, opacity = 1 } = {}) {
  const geo = new THREE.PlaneGeometry(w, h, 10, 12);
  const mat = new THREE.MeshStandardMaterial({
    color, map: texture || null, side: THREE.DoubleSide, roughness: 0.95, metalness: 0,
    transparent: opacity < 1, opacity,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.userData.cloth = { base: geo.attributes.position.array.slice(), phase: hash01((x * 31 + z * 7) | 0) * 6.28, amp: 0.08 + hash01((y * 13 + w * 3) | 0) * 0.12 };
  return m;
}

/** 灯串（沿路径的发光小球；参与 bloom） */
export function lightString(pointsArr, { color = 0xffd0a0, size = 0.09 } = {}) {
  const g = new THREE.Group();
  const mat = emissive(color, 2.4);
  for (const p of pointsArr) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), mat);
    b.position.set(p[0], p[1], p[2]);
    g.add(b);
  }
  return g;
}

/** 平滑吸附的悬浮画幅（绘卷碎片，超现实「漂浮的绘卷」） */
export function artPanel(texture, { x = 0, y = 0, z = -20, w = 8, h = 10, rotationY = 0, rotationZ = 0, opacity = 0.9, tint = 0xffffff } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    map: texture || null, color: tint, transparent: true, opacity, side: THREE.DoubleSide,
    roughness: 0.7, metalness: 0.05, envMapIntensity: 0.4,
    emissive: 0x141210, emissiveIntensity: 0.1,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 4, 4), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotationY;
  m.rotation.z = rotationZ;
  return m;
}

/** 阴刻/发光印章（超大，超现实「封印」） */
export function giantSeal({ x = 0, y = 0, z = -25, size = 6, color = 0x8a1f1f, text = '封', glow = 0xff4040 } = {}) {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#' + (color >>> 0).toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(240,225,200,0.85)';
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, 224, 224);
  ctx.fillStyle = 'rgba(240,225,200,0.92)';
  ctx.font = 'bold 150px "Noto Serif CJK SC", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 140);
  const tex = new THREE.CanvasTexture(c);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    map: tex, color: 0xffffff, transparent: true, opacity: 0.92,
    roughness: 0.6, metalness: 0.1, emissive: glow, emissiveIntensity: 0.35, side: THREE.DoubleSide, toneMapped: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.position.set(x, y, z);
  return m;
}

/** 巨月（真实陨石坑 + 大气光晕；超现实尺度） */
export function moon({ x = 6, y = 12, z = -110, r = 9, color = 0xe8e2d0, halo = 0xcfe0e8, haloOpacity = 0.28 } = {}) {
  const g = new THREE.Group();
  const tex = materialTextureSet('granite');
  const body = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), new THREE.MeshStandardMaterial({
    color,
    map: tex.map,
    normalMap: tex.normalMap,
    roughness: 1,
    metalness: 0,
    emissive: color,
    emissiveIntensity: 0.42,
    envMapIntensity: 0.2,
  }));
  // 陨石坑（压暗凹点）
  for (let i = 0; i < 14; i++) {
    const a = hash01(i * 7) * Math.PI * 2;
    const b = (hash01(i * 11) - 0.5) * Math.PI;
    const rr2 = r * 0.98;
    const crater = new THREE.Mesh(new THREE.SphereGeometry(r * (0.05 + hash01(i * 13) * 0.09), 10, 8), new THREE.MeshStandardMaterial({
      color: 0x8a8578, roughness: 1, metalness: 0,
    }));
    crater.position.set(
      Math.cos(a) * Math.cos(b) * rr2,
      Math.sin(b) * rr2,
      Math.sin(a) * Math.cos(b) * rr2,
    );
    g.add(crater);
  }
  g.add(body);
  // 大气光晕（billboard additive）
  const haloMat = new THREE.SpriteMaterial({
    map: pointTexture(), color: halo, transparent: true, opacity: haloOpacity,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false,
  });
  const hs = new THREE.Sprite(haloMat);
  hs.scale.set(r * 6.5, r * 6.5, 1);
  g.position.set(x, y, z);
  hs.position.set(x, y, z);
  const wrap = new THREE.Group();
  wrap.add(g, hs);
  return wrap;
}

/** 巨型发光眼（kit.eye 之外的氛围用大眼，简化） */
export function skyEye({ x = 0, y = 8, z = -60, r = 3.5, color = 0xd8e0e8, iris = 0x8fb8c8, pupil = 0x080a0c } = {}) {
  const g = new THREE.Group();
  const white = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24), new THREE.MeshPhysicalMaterial({
    color, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.4,
  }));
  white.scale.set(1, 0.62, 0.4);
  const irisMesh = new THREE.Mesh(new THREE.SphereGeometry(r * 0.42, 24, 18), new THREE.MeshStandardMaterial({
    color: iris, roughness: 0.3, metalness: 0.1, emissive: iris, emissiveIntensity: 0.25,
  }));
  irisMesh.position.z = r * 0.62;
  irisMesh.scale.set(1, 1, 0.5);
  const pupilMesh = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 18, 14), new THREE.MeshStandardMaterial({
    color: pupil, roughness: 0.1, metalness: 0.4,
  }));
  pupilMesh.position.z = r * 0.86;
  pupilMesh.scale.set(1, 1, 0.5);
  g.add(white, irisMesh, pupilMesh);
  g.position.set(x, y, z);
  return g;
}

/** 发光六角格栅（超写实冷光电路墙） */
export function hexLattice({ x = 0, y = 0, z = -30, w = 22, h = 14, size = 1.6, color = 0x7cc7f0, opacity = 0.7 } = {}) {
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
        pts.push(cx + Math.cos(a1) * size * 0.5, cy + Math.sin(a1) * size * 0.5, 0);
        pts.push(cx + Math.cos(a2) * size * 0.5, cy + Math.sin(a2) * size * 0.5, 0);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({
    color, transparent: true, opacity, fog: true, toneMapped: false,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.position.set(x, y, z);
  return lines;
}

/** 悬挂纸垂/灯笼串（沿一条水平线） */
export function hangingLights({ x = 0, y = 8, z = -16, count = 8, span = 20, sag = 2.2, color = 0xffb15c, lanternScale = 0.7, seed = 1 } = {}) {
  const g = new THREE.Group();
  const curvePts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    curvePts.push([(t - 0.5) * span, -Math.sin(t * Math.PI) * sag, 0]);
  }
  const curve = new THREE.CatmullRomCurve3(curvePts.map((p) => new THREE.Vector3(...p)));
  const line = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.02, 5, false), pbr(0x1a1410, { kind: 'fabric', roughness: 1 }));
  g.add(line);
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const p = curve.getPoint(t);
    const l = lantern({ x: 0, y: 0, z: 0, scale: lanternScale * (0.85 + hash01(seed + i * 7) * 0.3), color, light: false });
    l.position.set(p.x, p.y - 0.7, p.z);
    g.add(l);
  }
  g.position.set(x, y, z);
  return g;
}
