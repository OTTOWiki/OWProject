/**
 * 版面 3D 舞台渲染器 v2 —— 超写实 · 超现实主义。
 *
 * 渲染链：PBR 场景（IBL 环境 + 阴影）→ HDR 半浮点 RT → 亮部提取 → 两级高斯泛光 →
 *         合成（ACES 色调映射 + 分级 + 色散 + 暗角 + 胶片颗粒）→ sRGB 输出。
 * 场景设计：持续深入的 3D 空间 + Billboard 绘卷 + 真 3D 物体 + 超现实构图。
 * 失败兜底：Three/WebGL/后处理任一失败 → 直出渲染；整体构造失败由工厂回退 2D 绘卷。
 *
 * 设计说明：docs/level-background-redesign.md §8。
 */
import { getThree } from '../backgrounds/threeLoader.js';
import { resolveBgMode } from '../bgModes.js';
import { SCENES3D } from './scenes/index.js';
import { sceneFor } from '../bg/scenes/index.js';
import { STAGE_PALETTES } from '../bg/scenes/_stub.js';
import * as K from './kit.js';

const W = 450;
const H = 600;
const BLOOM_DIV = 4;

/** 测试/低配减压参数（只缩内部渲染分辨率/阴影图，不改变构图与观感；缺省 1.0 / 1024） */
function runtimeOptions() {
  try {
    if (typeof location === 'undefined') return { scale: 1, shadowSize: 1024, post: true };
    const q = new URLSearchParams(location.search);
    const scale = Math.min(1, Math.max(0.5, Number(q.get('bgscale') || 1) || 1));
    const shadowSize = Math.min(1024, Math.max(256, Number(q.get('bgshadow') || 1024) || 1024));
    const post = q.get('bgpost') !== '0';
    return { scale, shadowSize, post };
  } catch {
    return { scale: 1, shadowSize: 1024, post: true };
  }
}

function cssToHex(color) {
  if (typeof color === 'number') return color;
  const c = String(color || '#000000').trim();
  if (c.startsWith('#')) {
    const hex = c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
    return parseInt(hex.slice(1), 16);
  }
  return 0x000000;
}

function mixHex(a, b, t) {
  const ar = (a >> 16) & 255; const ag = (a >> 8) & 255; const ab = a & 255;
  const br = (b >> 16) & 255; const bg = (b >> 8) & 255; const bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

/** 按 mode 取该面调色板（boss 覆盖） */
export function paletteForMode(mode) {
  const scene = sceneFor(mode);
  const stage = scene?.stage || 's1';
  const base = STAGE_PALETTES[stage] || STAGE_PALETTES.s1;
  const merged = /_boss$/.test(mode) ? { ...base, ...(base.boss || {}) } : base;
  return {
    skyTop: cssToHex(merged.sky?.[0] || '#07080c'),
    skyBot: cssToHex(merged.sky?.[1] || '#12161c'),
    ink: cssToHex(merged.ink || '#05070a'),
    accent: cssToHex(merged.accent || '#ffffff'),
    accent2: cssToHex(merged.accent2 || '#cccccc'),
    glow: cssToHex(merged.glow || '#ffffff'),
    fog: cssToHex(merged.fog || '#555555'),
    seal: cssToHex(merged.seal || '#b3342e'),
    ambient: mixHex(cssToHex(merged.ink || '#05070a'), 0x6a7488, 0.55),
  };
}

/**
 * 叙事运镜配置：「主角正在前往某处」——相机单向推进，按「出发→赶路→抵达→驻留」分段，
 * 不再是来回呼吸式推拉。dist=本段旅程推进距离；dur=抵达耗时；destX/destY=目的地大致方向（用于视线与偏移）；
 * boss 面推进更远更快、抵达后驻留，给 Boss 战稳定构图。
 */
const JOURNEY = {
  s1: { dist: 20, dur: 30, destX: 4.5, destY: 9 },
  s2: { dist: 18, dur: 28, destX: 0, destY: 8 },
  s3: { dist: 18, dur: 28, destX: 0, destY: 11 },
  patrol: { dist: 16, dur: 26, destX: 0, destY: 15 },
  a4: { dist: 18, dur: 28, destX: 0, destY: 8 },
  a5: { dist: 18, dur: 28, destX: 0, destY: 9 },
  a6: { dist: 16, dur: 26, destX: -8, destY: 11 },
  b4: { dist: 20, dur: 30, destX: 0, destY: 8 },
  b5: { dist: 18, dur: 28, destX: 0, destY: 7 },
  b6: { dist: 18, dur: 28, destX: 0, destY: 10 },
  ex: { dist: 22, dur: 32, destX: 0, destY: 10 },
};

/** 出发→赶路→抵达：速度先慢后快再收住，同时保证 0..1 单调 */
function journeyProgress(k) {
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, k)));
}

const VERT_QUAD = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG_BRIGHT = `
  uniform sampler2D tScene; uniform float uThreshold;
  varying vec2 vUv;
  void main(){
    vec3 c = texture2D(tScene, vUv).rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float k = max(l - uThreshold, 0.0) / max(l, 0.0001);
    gl_FragColor = vec4(c * k, 1.0);
  }`;

const FRAG_BLUR = `
  uniform sampler2D tImage; uniform vec2 uDirection; varying vec2 vUv;
  void main(){
    vec2 o = uDirection;
    vec3 c = texture2D(tImage, vUv).rgb * 0.227027;
    c += texture2D(tImage, vUv + o * 1.384615).rgb * 0.316216;
    c += texture2D(tImage, vUv - o * 1.384615).rgb * 0.316216;
    c += texture2D(tImage, vUv + o * 3.230769).rgb * 0.070270;
    c += texture2D(tImage, vUv - o * 3.230769).rgb * 0.070270;
    gl_FragColor = vec4(c, 1.0);
  }`;

const FRAG_COMPOSITE = `
  uniform sampler2D tScene; uniform sampler2D tBloom;
  uniform vec2 uResolution; uniform float uTime;
  uniform float uBloom; uniform float uExposure; uniform float uVignette;
  uniform float uGrain; uniform float uCA; uniform float uGrade;
  uniform vec3 uShadow; uniform vec3 uHigh; uniform vec3 uTint;
  varying vec2 vUv;

  vec3 aces(vec3 x){
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec3 linearToSRGB(vec3 c){
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  }
  void main(){
    vec2 uv = vUv;
    vec2 dir = uv - 0.5;
    // 色散（镜头质感）
    vec3 scene;
    scene.r = texture2D(tScene, uv + dir * uCA).r;
    scene.g = texture2D(tScene, uv).g;
    scene.b = texture2D(tScene, uv - dir * uCA).b;
    vec3 bloom = texture2D(tBloom, uv).rgb;
    vec3 color = scene + bloom * uBloom;
    color *= uExposure;
    color = aces(color);
    // 分级：阴影/高光双色映射 + 轻微整体染色
    float l = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(color * uShadow, color * uHigh, smoothstep(0.0, 0.75, l));
    color = mix(color, color * uTint, uGrade);
    // 暗角
    float vig = smoothstep(0.85, 0.15, length(dir) * 1.25);
    color *= mix(1.0, vig, uVignette);
    // 胶片颗粒
    float g = hash(uv * uResolution + fract(uTime) * 97.0) - 0.5;
    color += g * uGrain;
    gl_FragColor = vec4(linearToSRGB(max(color, 0.0)), 1.0);
  }`;


/** 场景过渡合成：旧场景快照 → 新场景，推镜 + 闪光 + 轻微墨迹扰动 */
const FRAG_PRESENT = `
  uniform sampler2D tPrev; uniform sampler2D tCurr;
  uniform float uMix; uniform float uFlash; uniform vec2 uResolution;
  varying vec2 vUv;
  void main(){
    float m = clamp(uMix, 0.0, 1.0);
    float e = m * m * (3.0 - 2.0 * m);
    vec2 uv = vUv;
    // 推镜：新场景由远及近（轻微放大），旧场景向外散开
    vec2 uvC = (uv - 0.5) * (1.0 - 0.07 * (1.0 - e)) + 0.5;
    vec2 uvP = (uv - 0.5) * (1.0 + 0.06 * e) + 0.5;
    vec3 a = texture2D(tPrev, uvP).rgb;
    vec3 b = texture2D(tCurr, uvC).rgb;
    vec3 col = mix(a, b, e);
    // 闪白（进入新场景瞬间的高光）
    float flash = uFlash * (1.0 - e) * (1.0 - e);
    col += flash * vec3(0.92, 0.90, 0.86);
    // 墨迹带（超现实过渡：中段轻微横向噪声，不遮挡弹幕）
    float band = smoothstep(0.02, 0.10, m) * smoothstep(0.92, 0.35, m);
    float n = fract(sin(dot(uv * uResolution, vec2(12.9898, 78.233))) * 43758.5453);
    col += band * (n - 0.5) * 0.05;
    gl_FragColor = vec4(max(col, 0.0), 1.0);
  }`;

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1e-6)));
  return t * t * (3 - 2 * t);
}

export class PlayfieldStage3D {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    const THREE = getThree();
    if (!THREE) throw new Error('three not loaded');
    if (!canvas) throw new Error('missing 3d canvas');
    this.THREE = THREE;
    this.canvas = canvas;
    this.runtime = runtimeOptions();
    this._renderW = Math.round(W * this.runtime.scale);
    this._renderH = Math.round(H * this.runtime.scale);
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, alpha: false, powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this._renderW, this._renderH, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    if (THREE.SRGBColorSpace) this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(54, W / H, 0.05, 240);
    this.camera.position.set(0, 1.4, 0);
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.mode = null;
    this.stage = null;
    this.sceneReady = false;
    this.is3D = true;
    this.t = 0;
    this.speed = 10;
    this.swayX = 0.4;
    this.swayY = 0.25;
    this.palette = paletteForMode('s1_mid');
    this.animated = [];
    this.fields = [];
    this.pointSets = [];
    this.lights = [];
    this.ownedTextures = [];
    this.specials = { water: [], mist: [], beam: [], cloth: [] };
    this._lastRender = 0;
    this._renderEvery = 1000 / 40;
    this._warned = false;
    this._contextLost = false;
    this._reduceMotion = typeof matchMedia === 'function'
      ? matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    this._transition = null;
    this._motion = null;
    this._approachGain = 1;

    this._postOk = false;
    if (this.runtime.post) {
      try {
        this._initPost();
        this._postOk = true;
      } catch (err) {
        console.warn('[bg3d] post-processing unavailable, direct render:', err);
      }
    }

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this._contextLost = true;
    }, false);
    this.canvas.addEventListener('webglcontextrestored', () => {
      this._contextLost = false;
      this.sceneReady = false;
      try {
        this.setMode(this.mode || 's1_mid', { transition: false });
      } catch (err) {
        this._warn(err);
      }
    }, false);
  }

  _warn(err) {
    if (this._warned) return;
    this._warned = true;
    console.warn('[bg3d] scene failed:', err && err.stack ? err.stack : err);
  }

  _initPost() {
    const THREE = this.THREE;
    const half = this.renderer.capabilities.isWebGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this._rt = new THREE.WebGLRenderTarget(this._renderW, this._renderH, {
      type: half, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: true, stencilBuffer: false, samples: 0,
    });
    const bw = Math.max(1, Math.ceil(this._renderW / BLOOM_DIV));
    const bh = Math.max(1, Math.ceil(this._renderH / BLOOM_DIV));
    const base = { type: half, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
    this._brightRT = new THREE.WebGLRenderTarget(bw, bh, base);
    this._blurA = new THREE.WebGLRenderTarget(bw, bh, base);
    this._blurB = new THREE.WebGLRenderTarget(bw, bh, base);

    this._quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const makePass = (fragmentShader, uniforms, scene) => {
      const mat = new THREE.ShaderMaterial({ vertexShader: VERT_QUAD, fragmentShader, uniforms, depthTest: false, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
      scene.add(mesh);
      return mat;
    };
    this._brightScene = new THREE.Scene();
    this._brightMat = makePass(FRAG_BRIGHT, {
      tScene: { value: this._rt.texture },
      uThreshold: { value: 0.82 },
    }, this._brightScene);

    this._blurScene = new THREE.Scene();
    this._blurMat = makePass(FRAG_BLUR, {
      tImage: { value: this._brightRT.texture },
      uDirection: { value: new THREE.Vector2(1 / bw, 0) },
    }, this._blurScene);

    // 过渡/展示用：合成结果先进入 RGBA8 RT，再由 present pass 混合旧快照输出到屏幕
    this._outRT = new THREE.WebGLRenderTarget(this._renderW, this._renderH, {
      type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: false, stencilBuffer: false,
    });
    this._prevOutRT = null;
    this._presentScene = new THREE.Scene();
    this._presentMat = makePass(FRAG_PRESENT, {
      tPrev: { value: null },
      tCurr: { value: this._outRT.texture },
      uMix: { value: 1 },
      uFlash: { value: 0 },
      uResolution: { value: new THREE.Vector2(this._renderW, this._renderH) },
    }, this._presentScene);

    this._compositeScene = new THREE.Scene();
    this._compositeMat = makePass(FRAG_COMPOSITE, {
      tScene: { value: this._rt.texture },
      tBloom: { value: this._blurB.texture },
      uResolution: { value: new THREE.Vector2(this._renderW, this._renderH) },
      uTime: { value: 0 },
      uBloom: { value: 0.62 },
      uExposure: { value: 1.04 },
      uVignette: { value: 0.46 },
      uGrain: { value: 0.011 },
      uCA: { value: 0.001 },
      uGrade: { value: 0.35 },
      uShadow: { value: new THREE.Vector3(1, 1, 1) },
      uHigh: { value: new THREE.Vector3(1, 1, 1) },
      uTint: { value: new THREE.Vector3(1, 1, 1) },
    }, this._compositeScene);
  }

  _makeCtx() {
    const self = this;
    const THREE = this.THREE;
    const stage = sceneFor(this.mode)?.stage || 's1';
    const palette = this.palette;
    const ctx = {
      THREE,
      mode: this.mode,
      stage,
      palette,
      scene: this.scene,
      root: this.root,
      camera: this.camera,
      K,
      renderer: this.renderer,
      add(obj) {
        if (!obj) return obj;
        self.root.add(obj);
        const ud = obj.userData || {};
        if (ud.water) self.specials.water.push(obj);
        if (ud.mist) self.specials.mist.push(obj);
        if (ud.beam) self.specials.beam.push(obj);
        if (ud.cloth) self.specials.cloth.push(obj);
        return obj;
      },
      animate(obj, spec) {
        if (obj && spec) self.animated.push({ o: obj, spec });
        return obj;
      },
      field(factory, {
        count = 4, zNear = -14, zFar = -120, xRange = 10, yRange = 4,
        y = null, speedMul = 1, jitter = 0.4, xAbsMin = 0,
      } = {}) {
        const range = zNear - zFar;
        const items = [];
        for (let i = 0; i < count; i++) {
          const r = ((i / Math.max(1, count - 1)) + (K.hash01(i * 31 + 7) - 0.5) * jitter) * range;
          const z = zFar + ((r % range) + range) % range;
          const obj = factory(i, z);
          if (!obj) continue;
          let px = (K.hash01(i * 53 + 11) - 0.5) * xRange;
          if (xAbsMin > 0 && Math.abs(px) < xAbsMin) {
            px = (px < 0 ? -1 : 1) * (xAbsMin + K.hash01(i * 59 + 5) * xAbsMin);
          }
          obj.position.x = px;
          obj.position.y = y === null ? (K.hash01(i * 71 + 3) - 0.5) * yRange : y;
          obj.position.z = z;
          self.root.add(obj);
          items.push({ o: obj });
        }
        const f = { items, range, speedMul };
        self.fields.push(f);
        return f;
      },
      points(opts) {
        const ps = K.points(opts);
        self.root.add(ps.points);
        self.pointSets.push(ps);
        return ps;
      },
      atmosphere(opts = {}) {
        const lights = K.atmosphere(self.scene, { ...opts, shadowSize: self.runtime.shadowSize });
        self.lights.push(lights.amb, lights.dir, lights.hemi, lights.rim);
        return lights;
      },
      environment() {
        return K.environment(self.renderer, self.mode, self.palette);
      },
      /** 注册逐帧更新（水面/布幔/光束等特殊动画由 ctx.add 自动注册，也可手动追加） */
      updater(fn) {
        if (typeof fn === 'function') self.animated.push({ custom: fn });
      },
      setSpeed(v) { self.speed = v; },
      setSway(x, y) { self.swayX = x; self.swayY = y; },
      plateTexture() { return K.plateTexture(self.mode); },
      matTexture(name, color) { return K.matTexture(name, color); },
      plateCrop(sx, sy, sw, sh) {
        const raw = K.plateTexture(self.mode);
        const tex = raw ? K.cropTexture(raw, sx, sy, sw, sh) : null;
        if (tex) self.ownedTextures.push(tex);
        return tex;
      },
      textSprite(lines, opts = {}) {
        const { sprite, texture } = K.textSprite(lines, opts);
        self.ownedTextures.push(texture);
        return sprite;
      },
    };
    return ctx;
  }

  /** 跑完整后处理链，输出到 target（null=屏幕） */
  _renderPostTo(target) {
    const r = this.renderer;
    r.setRenderTarget(this._rt);
    r.clear();
    r.render(this.scene, this.camera);
    this._brightMat.uniforms.tScene.value = this._rt.texture;
    r.setRenderTarget(this._brightRT);
    r.clear();
    r.render(this._brightScene, this._quadCamera);
    const bw = this._blurA.width;
    const bh = this._blurA.height;
    this._blurMat.uniforms.tImage.value = this._brightRT.texture;
    this._blurMat.uniforms.uDirection.value.set(1 / bw, 0);
    r.setRenderTarget(this._blurA);
    r.clear();
    r.render(this._blurScene, this._quadCamera);
    this._blurMat.uniforms.tImage.value = this._blurA.texture;
    this._blurMat.uniforms.uDirection.value.set(0, 1 / bh);
    r.setRenderTarget(this._blurB);
    r.clear();
    r.render(this._blurScene, this._quadCamera);
    this._blurMat.uniforms.tImage.value = this._blurB.texture;
    this._blurMat.uniforms.uDirection.value.set(2.2 / bw, 0);
    r.setRenderTarget(this._blurA);
    r.clear();
    r.render(this._blurScene, this._quadCamera);
    this._blurMat.uniforms.tImage.value = this._blurA.texture;
    this._blurMat.uniforms.uDirection.value.set(0, 2.2 / bh);
    r.setRenderTarget(this._blurB);
    r.clear();
    r.render(this._blurScene, this._quadCamera);
    this._compositeMat.uniforms.tScene.value = this._rt.texture;
    this._compositeMat.uniforms.tBloom.value = this._blurB.texture;
    r.setRenderTarget(target || null);
    r.clear();
    r.render(this._compositeScene, this._quadCamera);
  }

  /** 捕获当前画面快照（后处理后的 sRGB），用于场景过渡 */
  _capturePrev() {
    if (!this._postOk || !this.sceneReady) return false;
    try {
      const THREE = this.THREE;
      if (!this._prevOutRT) {
        this._prevOutRT = new THREE.WebGLRenderTarget(this._renderW, this._renderH, {
          type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
          depthBuffer: false, stencilBuffer: false,
        });
      }
      this._renderPostTo(this._prevOutRT);
      return true;
    } catch (err) {
      console.warn('[bg3d] transition capture failed:', err);
      return false;
    }
  }

  /**
   * 叙事运镜：这一章是「一段旅程」——相机从出发位单向推进到目的地并驻留。
   * 不来回呼吸：推近后不退回，靠切面的场景过渡进入下一段旅程。
   */
  _setupCameraMotion(mode) {
    const stage = this.stage || 's1';
    const boss = /_boss$/.test(mode);
    const base = JOURNEY[stage] || JOURNEY.s1;
    // 三面（分歧的十字路口）特殊运镜：mid = 抵达路口后左右「张望」两条路线；
    // boss = 选定路线后加速冲入防火墙门的压迫感推进。
    const special = stage === 's3' ? (boss ? 'rush' : 'fork') : null;
    this._motion = {
      t: 0,
      dist: base.dist * (boss ? 1.18 : 1) * (special === 'fork' ? 0.78 : 1) * (special === 'rush' ? 1.02 : 1),
      dur: base.dur * (boss ? 0.8 : 1) * (special === 'fork' ? 1.05 : 1) * (special === 'rush' ? 0.72 : 1),
      destX: base.destX,
      destY: base.destY,
      progress: 0,
      speed: 0,
      boss,
      special,
    };
    this._approachGain = 1;
    this.camera.position.set(0, 1.4, 0);
    this.camera.fov = boss ? 58 : 56;
    this.camera.updateProjectionMatrix();
  }

  _applyCameraMotion(dt) {
    const m = this._motion;
    if (!m) return 1;
    m.t += dt;
    const k = Math.min(1, m.t / m.dur);
    const prog = journeyProgress(k);
    m.progress = prog;
    // 速度剖面：出发慢 → 赶路快 → 抵达收住（抵达后驻留，不再退回）
    const speed = Math.sin(Math.PI * k);
    m.speed = speed;
    // 单向推进的距离（不回头）；抵达后停在目的地前
    let z = -m.dist * prog;
    let transZ = 0;
    if (this._transition) {
      const tk = Math.min(1, this._transition.t / this._transition.dur);
      const te = 1 - Math.pow(1 - tk, 3);
      transZ = (1 - te) * 7.0; // 从机位后方推入，形成「进入这一幕」
      z += transZ;
    }
    const t = this.t;
    let xOff = Math.sin(t * 0.17) * this.swayX + m.destX * 0.14 * prog;
    let lookX = m.destX * 0.10 * prog;
    let lookY = 1.3 + (m.destY - 1.3) * 0.16 * prog;
    let fovBase = m.boss ? 58 : 56;
    // 三面 mid「抉择路口」：抵达路口后向左、再向右张望两条路，再收回中心凝视石门
    if (m.special === 'fork') {
      const u = Math.min(1, Math.max(0, (k - 0.30) / 0.52));
      const pan = Math.sin(Math.PI * 2 * u);            // 先左后右再回中
      const settle = Math.min(1, Math.max(0, (k - 0.78) / 0.22));
      const amp = 1 - settle * 0.65;
      xOff += pan * 4.4 * amp;
      lookX += pan * 7.2 * amp;
      lookY += 0.6 * amp * Math.abs(pan);
      fovBase = 56 - 1.5 * Math.abs(pan) * amp;
    }
    // 三面 boss「冲入门内」：更强推镜 + 轻微加速震动，抵达后收住
    if (m.special === 'rush') {
      fovBase = 60 - 5.4 * prog;
      const shake = Math.sin(t * 23.0) * 0.006 * speed * (1 - prog);
      this.camera.rotation.z = shake;
      lookY += 0.9 * prog;
    } else {
      this.camera.rotation.z = Math.sin(t * 0.11) * 0.0035 + m.destX * 0.002 * prog;
    }
    // 路线感：横向缓缓贴近目的地，高度略降（像在向低处的目标前进）
    this.camera.position.x = xOff;
    this.camera.position.y = 1.4
      + Math.sin(t * 0.147 + 1.1) * this.swayY
      - 0.28 * prog;
    this.camera.position.z = z;
    this.camera.fov = fovBase - 4.2 * prog + (transZ ? (transZ / 7.0) * 3.0 : 0);
    this.camera.lookAt(lookX, lookY, z - 18);
    this._approachGain = 0.42 + 1.55 * speed + (transZ ? 1.4 * (transZ / 7.0) : 0);
    return this._approachGain;
  }

  setMode(mode, { transition = true } = {}) {
    const next = resolveBgMode(mode);
    if (this.sceneReady && next === this.mode) return;
    const canTrans = !!(transition && this.sceneReady && this._postOk && !this._reduceMotion && this.runtime.post);
    const captured = canTrans ? this._capturePrev() : false;
    this._clear();
    this._transition = null;
    this.mode = next;
    this.stage = sceneFor(next)?.stage || 's1';
    this.palette = paletteForMode(next);
    const THREE = this.THREE;
    try {
      const builder = SCENES3D[next];
      if (typeof builder !== 'function') throw new Error(`missing 3D scene: ${next}`);
      builder(this._makeCtx());
      // IBL 环境 + 可见天空（PMREM 失败则回退纯色）
      try {
        const env = K.environment(this.renderer, next, this.palette);
        this.scene.environment = env.envMap;
        this.scene.background = env.background;
      } catch (err) {
        console.warn('[bg3d] environment failed:', err);
      }
      this.sceneReady = true;
      if (this._compositeMat) {
        const accent = new THREE.Color(this.palette.accent);
        const glow = new THREE.Color(this.palette.glow);
        const ink = new THREE.Color(this.palette.ink);
        this._compositeMat.uniforms.uShadow.value.set(0.92 + ink.r * 0.2, 0.94 + ink.g * 0.2, 1.0);
        this._compositeMat.uniforms.uHigh.value.set(1.0, 0.98 + glow.g * 0.03, 0.94 + glow.b * 0.05);
        this._compositeMat.uniforms.uTint.value.set(0.9 + accent.r * 0.12, 0.92 + accent.g * 0.1, 0.95 + accent.b * 0.1);
      }
      this._setupCameraMotion(next);
      if (captured) {
        this._transition = { t: 0, dur: 1.05, flash: 0.34 };
        this._presentMat.uniforms.tPrev.value = this._prevOutRT.texture;
        this._presentMat.uniforms.uMix.value = 0;
        this._presentMat.uniforms.uFlash.value = 0.34;
      } else if (transition) {
        this.flash(0.5);
      }
    } catch (err) {
      this._warn(err);
      this.sceneReady = false;
    }
  }

  flash(strength = 0.4) {
    const el = this.canvas;
    if (!el || typeof el.classList === 'undefined') return;
    el.style.setProperty('--bg3d-flash', String(strength));
    el.classList.remove('bg3d-flash');
    void el.offsetWidth;
    el.classList.add('bg3d-flash');
  }

  _clear() {
    if (!this.scene) return;
    for (const l of this.lights) {
      this.scene.remove(l);
      l.dispose?.();
    }
    this.lights.length = 0;
    for (const tex of this.ownedTextures) tex?.dispose?.();
    this.ownedTextures.length = 0;
    while (this.root.children.length) {
      const o = this.root.children[0];
      this.root.remove(o);
      o.traverse?.((c) => {
        c.geometry?.dispose?.();
        if (c.material) {
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          for (const m of mats) {
            m.map?.dispose?.();
            m.normalMap?.dispose?.();
            m.roughnessMap?.dispose?.();
            m.dispose?.();
          }
        }
      });
    }
    this.animated.length = 0;
    this.fields.length = 0;
    this.pointSets.length = 0;
    this.specials = { water: [], mist: [], beam: [], cloth: [] };
    this.scene.fog = null;
    this.sceneReady = false;
  }

  _updateSpecials(dt, t) {
    for (const m of this.specials.water) {
      const mat = m.material;
      if (mat?.normalMap) {
        mat.normalMap.offset.x += dt * (m.userData.water?.speed || 0.01);
        mat.normalMap.offset.y += dt * (m.userData.water?.speed || 0.01) * 0.7;
      }
    }
    for (const m of this.specials.mist) {
      if (m.material?.uniforms?.uTime) m.material.uniforms.uTime.value += dt * (m.userData.mist?.speed || 0.02) * 30;
    }
    for (const m of this.specials.beam) {
      if (m.material?.uniforms?.uTime) m.material.uniforms.uTime.value = t;
      const spec = m.userData.beam;
      if (spec?.spin) m.rotation.z = Math.sin(t * spec.spin + (spec.phase || 0)) * 0.5;
    }
    for (const m of this.specials.cloth) {
      const cloth = m.userData.cloth;
      const geo = m.geometry;
      if (!cloth || !geo) continue;
      const base = cloth.base;
      const pos = geo.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        const x = base[i];
        const y = base[i + 1];
        pos[i + 2] = Math.sin(y * 0.9 + t * 1.2 + cloth.phase) * cloth.amp * (0.4 + (y + 5) * 0.08)
          + Math.sin(x * 1.7 + t * 0.6) * cloth.amp * 0.4;
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals?.();
    }
  }

  update(dt) {
    this.t += dt;
    if (!this.sceneReady) return;
    if (this._transition) {
      this._transition.t += dt;
      if (this._transition.t >= this._transition.dur) this._transition = null;
    }
    const t = this.t;
    for (const item of this.animated) {
      if (item.custom) { item.custom(dt, t); continue; }
      const { o, spec } = item;
      if (spec.spinZ) o.rotation.z += spec.spinZ * dt;
      if (spec.spinY) o.rotation.y += spec.spinY * dt;
      if (spec.spinX) o.rotation.x += spec.spinX * dt;
      if (spec.bob) o.position.y += Math.sin(t * (spec.bob.speed || 1) + (spec.bob.phase || 0)) * (spec.bob.amp || 0.3) * dt * 2;
      if (spec.pulse) {
        const s = 1 + Math.sin(t * (spec.pulse.speed || 2) + (spec.pulse.phase || 0)) * (spec.pulse.amp || 0.06);
        o.scale.setScalar(s);
      }
      if (spec.orbit) {
        const orb = spec.orbit;
        const a = t * (orb.speed || 0.4) + (orb.phase || 0);
        o.position.x = Math.cos(a) * (orb.r || 6);
        o.position.z = -18 + Math.sin(a) * (orb.r || 6) * 0.5;
        if (orb.yAmp) o.position.y = Math.sin(a * 1.3) * orb.yAmp;
      }
    }
    const gain = Math.min(1.9, this._approachGain * 1);
    for (const f of this.fields) {
      for (const it of f.items) {
        it.o.position.z += this.speed * dt * f.speedMul * gain;
        if (it.o.position.z > -10) it.o.position.z -= f.range;
      }
    }
    for (const ps of this.pointSets) K.updatePoints(ps, dt * Math.min(1.8, gain), t);
    this._updateSpecials(dt, t);
    // 运镜：推近/保持/缓退 + 转场推镜 + 极轻微手持漂浮
    this._applyCameraMotion(dt);
    if (this._postOk && this._compositeMat) this._compositeMat.uniforms.uTime.value = t;
  }

  draw() {
    if (!this.sceneReady || this._contextLost) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : 0);
    if (now - this._lastRender < this._renderEvery) return;
    this._lastRender = now;
    const r = this.renderer;
    if (!this._postOk) {
      r.setRenderTarget(null);
      r.render(this.scene, this.camera);
      return;
    }
    try {
      if (this._transition && this._prevOutRT) {
        // 场景过渡：新画面渲染到 outRT，再与旧快照混合（推镜 + 闪白），不中断游戏绘制
        this._renderPostTo(this._outRT);
        const m = this._presentMat.uniforms;
        const k = Math.min(1, this._transition.t / this._transition.dur);
        m.tPrev.value = this._prevOutRT.texture;
        m.tCurr.value = this._outRT.texture;
        m.uMix.value = k;
        m.uFlash.value = this._transition.flash * (1 - k) * (1 - k);
        r.setRenderTarget(null);
        r.clear();
        r.render(this._presentScene, this._quadCamera);
      } else {
        this._renderPostTo(null);
      }
    } catch (err) {
      this._postOk = false;
      this._transition = null;
      console.warn('[bg3d] post render failed, fallback direct:', err);
      r.setRenderTarget(null);
      r.render(this.scene, this.camera);
    }
  }

  dispose() {
    this._clear();
    this._rt?.dispose?.();
    this._brightRT?.dispose?.();
    this._blurA?.dispose?.();
    this._blurB?.dispose?.();
    this._brightMat?.dispose?.();
    this._blurMat?.dispose?.();
    this._compositeMat?.dispose?.();
    this._outRT?.dispose?.();
    this._prevOutRT?.dispose?.();
    this._presentMat?.dispose?.();
    this.renderer?.dispose?.();
    this.is3D = false;
  }
}
