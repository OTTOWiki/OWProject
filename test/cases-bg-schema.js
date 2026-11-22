/**
 * 关卡背景绘卷系统守卫（P6）。
 *
 * 覆盖：
 * - 21 mode 全部有合法 Scene2D（schema / 原子 / 粒子 / fx）；
 * - plate / backdrop 路径登记在 bgModes（唯一权威）且与 stage 对应；
 * - 共享 + 专属原子在 fake ctx 下可绘制（含素材缺失兜底分支）；
 * - 粒子配置确定性（同 seed 同结果）；
 * - 材质注册表路径合法。
 *
 * 设计说明：docs/level-background-redesign.md。
 */
import { getAllBgModes, PLAYFIELD_BG_TEX, STAGE_BACKDROP, backdropFor } from '../js/bgModes.js';
import { getPlayfieldBgPaths, getPlayfieldBgModes } from '../js/playfieldBg.js';
import { BackgroundRenderer } from '../js/bg/renderer.js';
import { SCENES2D, SCENE_ATOMS, sceneFor, atomsFor } from '../js/bg/scenes/index.js';
import { ATOMS } from '../js/bg/atoms.js';
import { validateScene, sceneDefaults, STAGE_KEYS } from '../js/bg/schema.js';
import { MATERIALS, MATERIAL_NAMES } from '../js/bg/materials.js';
import { PARTICLE_KINDS, ParticleField } from '../js/bg/particles.js';
import { test, assert, assertEqual } from './assert.js';

const MODES = getAllBgModes();

test('背景场景：21 mode 全部登记且有合法 Scene2D', () => {
  assertEqual(MODES.length, 21, '应有 21 个 mode（11 stage × mid/boss，patrol 单 mode）');
  assert(MODES.includes('patrol'), 'patrol 单 mode 必须存在');
  for (const mode of MODES) {
    const raw = SCENES2D[mode];
    assert(raw, `${mode}: 缺少场景数据`);
    assertEqual(raw.mode, mode, `${mode}: scene.mode 不一致`);
    assert(STAGE_KEYS.includes(raw.stage), `${mode}: 非法 stage ${raw.stage}`);
    const scene = sceneDefaults(raw);
    const atoms = new Set([...Object.keys(ATOMS), ...Object.keys(atomsFor(mode))]);
    const errs = validateScene(mode, scene, atoms);
    assertEqual(errs.length, 0, `${mode}: ${errs.join('; ')}`);
    assert(scene.layers.length > 0, `${mode}: layers 为空`);
    assert(scene.palette.sky.length === 2, `${mode}: palette.sky 非法`);
  }
});

test('背景场景：sceneFor / atomsFor 与注册表一致，未知 mode 兜底', () => {
  for (const mode of MODES) {
    assertEqual(sceneFor(mode)?.mode, mode);
    assert(typeof atomsFor(mode) === 'object');
  }
  assertEqual(sceneFor('__no_such_mode__')?.mode, SCENES2D.s1_mid.mode);
  assertEqual(Math.max(1, Object.keys(SCENE_ATOMS).length), 11, '每个 stage 应有专属原子表（可为空对象）');
});

test('背景路径：plate / backdrop 由 bgModes 唯一登记且与 stage 对应', () => {
  for (const mode of MODES) {
    const plate = PLAYFIELD_BG_TEX[mode];
    const backdrop = STAGE_BACKDROP[mode];
    assert(plate?.startsWith('assets/bg/scene/'), `${mode}: plate 路径非法`);
    assert(backdrop?.startsWith('assets/bg/backdrop/'), `${mode}: backdrop 路径非法`);
    const scene = sceneFor(mode);
    assert(plate.includes(`/${scene.stage}.avif`), `${mode}: plate 与 stage 不一致`);
    assert(backdrop.includes(`/${scene.stage}.avif`), `${mode}: backdrop 与 stage 不一致`);
    assertEqual(backdropFor(mode), backdrop);
  }
  assertEqual(backdropFor('__no_such_mode__'), STAGE_BACKDROP.s1_mid);
});

test('背景材质：注册表字段与路径合法', () => {
  assert(MATERIAL_NAMES.length >= 8, '至少 8 个材质');
  for (const name of MATERIAL_NAMES) {
    const meta = MATERIALS[name];
    assert(meta.path.startsWith('assets/bg/mat/'), `${name}: 路径非法`);
    assert(meta.path.endsWith('.avif'), `${name}: 必须 AVIF`);
    assertEqual(typeof meta.tile, 'boolean');
  }
});

test('背景粒子：schema 依赖的 kind 集合可用', () => {
  assert(PARTICLE_KINDS.size >= 8, '粒子 kind 过少');
  for (const kind of ['paper', 'snow', 'petal', 'ember', 'coin', 'rain', 'bubble', 'binary']) {
    assert(PARTICLE_KINDS.has(kind), `缺少粒子 kind=${kind}`);
  }
});

function fakeCtx() {
  const gradient = { addColorStop() {} };
  const store = {
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    shadowBlur: 0,
    globalCompositeOperation: 'source-over',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  };
  const gradientFactories = new Set(['createLinearGradient', 'createRadialGradient', 'createPattern']);
  return new Proxy(store, {
    get(t, k) {
      if (k in t) return t[k];
      if (gradientFactories.has(k)) return () => gradient;
      if (k === 'measureText') return () => ({ width: 8 });
      return () => {};
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    },
  });
}

function makeEnv(scene, mode) {
  return {
    W: 450,
    H: 600,
    t: 1.2,
    dt: 1 / 60,
    rand: (seed) => {
      const x = Math.sin((seed | 0) * 12.9898 + 4.1414) * 43758.5453;
      return x - Math.floor(x);
    },
    mat: () => null,
    tint: () => null,
    palette: scene.palette,
    stage: scene.stage,
    mode,
    plate: null,
  };
}

test('背景原子：21 mode 全层在 fake ctx（素材缺失）下可绘制', () => {
  const ctx = fakeCtx();
  for (const mode of MODES) {
    const scene = sceneDefaults(sceneFor(mode));
    const atoms = { ...ATOMS, ...atomsFor(mode) };
    const env = makeEnv(scene, mode);
    for (const layer of scene.layers) {
      const fn = atoms[layer.atom];
      assert(typeof fn === 'function', `${mode}: 原子 ${layer.atom} 不存在`);
      fn(ctx, layer.params || {}, env);
    }
  }
});

test('背景原子：注册表均为函数（渲染器统一调用）', () => {
  for (const [name, fn] of Object.entries(ATOMS)) {
    assertEqual(typeof fn, 'function', `ATOMS.${name}`);
  }
  assert(Object.keys(ATOMS).length >= 18, '共享原子过少');
});

test('背景粒子：同 seed 配置确定，update/draw 不抛错', () => {
  const ctx = fakeCtx();
  const specs = [
    { kind: 'paper', count: 6, colors: ['#fff'] },
    { kind: 'rain', count: 5 },
    { kind: 'binary', count: 4 },
  ];
  const make = () => {
    const f = new ParticleField(450, 600);
    f.configure(specs, { seed: 1234 });
    return f;
  };
  const a = make();
  const b = make();
  assertEqual(a.items.length, 15, '粒子数量');
  const sig = (f) => f.items.map((p) => `${p.kind}:${p.x.toFixed(3)}:${p.y.toFixed(3)}`).join('|');
  assertEqual(sig(a), sig(b), '同 seed 粒子初始状态必须一致');
  for (let i = 0; i < 30; i++) a.update(1 / 60);
  a.draw(ctx);
  assert(a.items.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)), '粒子坐标必须有限');
});

test('背景路径：11 stage 的 plate/backdrop 去重且完整，兼容层导出一致', () => {
  const plates = new Set(Object.values(PLAYFIELD_BG_TEX));
  const backdrops = new Set(Object.values(STAGE_BACKDROP));
  assertEqual(plates.size, 11, 'plate 应每 stage 一张（11 张）');
  assertEqual(backdrops.size, 11, 'backdrop 应每 stage 一张（11 张）');
  assertEqual(getPlayfieldBgPaths().length, 11, '兼容层 plate 路径数');
  assertEqual(getPlayfieldBgModes().length, MODES.length, '兼容层 mode 数与 bgModes 一致');
  assertEqual(Object.keys(STAGE_BACKDROP).length, MODES.length, 'backdrop 登记覆盖全部 mode');
});

test('渲染器：node 环境可安全构造/更新/绘制（无 DOM 时不抛错）', () => {
  const r = new BackgroundRenderer();
  r.update(1 / 60);
  const ctx = fakeCtx();
  r.draw(ctx);
  assert(r.mode === null || typeof r.mode === 'string');
});

test('场景数据：逐 mode 的静态/动态层数量在预算内', () => {
  for (const mode of MODES) {
    const scene = sceneDefaults(sceneFor(mode));
    const anim = scene.layers.filter((l) => l.animate).length;
    assert(anim <= 4, `${mode}: animate 层 ${anim} > 4`);
    const pcount = scene.particles.reduce((n, p) => n + (p.count | 0), 0);
    assert(pcount <= 110, `${mode}: 粒子 ${pcount} > 110`);
  }
});
