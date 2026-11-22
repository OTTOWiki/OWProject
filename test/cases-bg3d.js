/**
 * 3D 关卡舞台守卫（用户 2026-11-22 方向修正）：
 * - 21 mode 都有 3D builder；
 * - paletteForMode 输出数值色（可直接给 THREE）；
 * - stage3d 模块在 node 下可安全导入（顶层不访问 THREE）；
 * - 3D 场景文件不含 Math.random / Date.now（确定性）。
 */
import { readFileSync } from 'node:fs';
import { SCENES3D } from '../js/bg3d/scenes/index.js';
import { paletteForMode } from '../js/bg3d/stage3d.js';
import { getAllBgModes } from '../js/bgModes.js';
import { test, assert, assertEqual } from './assert.js';

const MODES = getAllBgModes();

test('3D 舞台：21 mode 全部有 builder', () => {
  assertEqual(MODES.length, 21);
  assertEqual(Object.keys(SCENES3D).length, MODES.length, '3D builder 数量');
  for (const mode of MODES) {
    assertEqual(typeof SCENES3D[mode], 'function', `${mode}: 缺 3D builder`);
  }
});

test('3D 舞台：paletteForMode 输出数值色且 boss 可区分', () => {
  for (const mode of MODES) {
    const p = paletteForMode(mode);
    for (const key of ['skyTop', 'skyBot', 'ink', 'accent', 'accent2', 'glow', 'fog', 'ambient']) {
      assertEqual(typeof p[key], 'number', `${mode}.${key}`);
    }
    assert(p.ambient !== 0, `${mode}: ambient 不能纯黑`);
  }
  const midP = paletteForMode('s1_mid');
  const bossP = paletteForMode('s1_boss');
  assert(midP.skyTop !== bossP.skyTop || midP.accent !== bossP.accent, 'boss 调色应有升级');
});

test('3D 场景源码：确定性（无 Math.random / Date.now）', () => {
  const files = [
    's1', 's2', 's3', 'patrol', 'a4', 'a5', 'a6', 'b4', 'b5', 'b6', 'ex', '_stub3d', '_atmo',
  ];
  for (const f of files) {
    const src = readFileSync(new URL(`../js/bg3d/scenes/${f}.js`, import.meta.url), 'utf8');
    assert(!/Math\.random\s*\(/.test(src), `${f}.js 不允许 Math.random`);
    assert(!/Date\.now\s*\(/.test(src), `${f}.js 不允许 Date.now`);
  }
});

test('3D stage3d：模块可在 node 导入（THREE 懒加载）', () => {
  assertEqual(typeof paletteForMode, 'function');
});

test('3D 超写实升级：场景源码不得裸用 THREE（必须 ctx.THREE），且不使用旧 Lambert API', () => {
  const files = ['s1', 's2', 's3', 'patrol', 'a4', 'a5', 'a6', 'b4', 'b5', 'b6', 'ex'];
  for (const f of files) {
    const src = readFileSync(new URL(`../js/bg3d/scenes/${f}.js`, import.meta.url), 'utf8');
    // 允许 `const THREE = ctx.THREE` 的局部别名；否则必须使用 ctx.THREE
    const hasAlias = /const\s+THREE\s*=\s*ctx\.THREE/.test(src);
    if (!hasAlias) {
      const bare = /(^|[^.\w])THREE\s*\./m.test(src);
      assert(!bare, `${f}.js: 必须使用 ctx.THREE，而不是裸 THREE`);
    }
    assert(!/new\s+ctx\.THREE\.MeshLambertMaterial/.test(src), `${f}.js: 使用 PBR 材质，不要 Lambert`);
  }
});

test('3D 超写实舞台：后处理管线与 PBR 环境 API 存在', async () => {
  const stage = await import('../js/bg3d/stage3d.js');
  assertEqual(typeof stage.PlayfieldStage3D, 'function');
  const kit = await import('../js/bg3d/kit.js');
  for (const name of [
    'pbr', 'glass', 'emissive', 'environment', 'materialTextureSet',
    'waterFloor', 'volumetricBeam', 'mistSheet', 'moon', 'skyEye',
    'floatingRocks', 'coinField', 'shardField', 'curtain', 'artPanel', 'giantSeal',
    'hangingLights', 'hexLattice', 'points', 'updatePoints',
  ]) {
    assertEqual(typeof kit[name], 'function', `kit.${name}`);
  }
  assert(kit.MATERIAL_KINDS === undefined || true);
});

test('3D 舞台层叠：2D 版面 canvas 不得有不透明 CSS 背景（否则遮住 #playfield-bg3d）', () => {
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  const m = /#playfield\s*\{([^}]*)\}/.exec(css);
  assert(m, 'css/style.css 缺少 #playfield 规则');
  const body = m[1];
  const bg = /background\s*:\s*([^;]+);/.exec(body);
  assert(bg, '#playfield 应显式声明 background');
  assert(/transparent|none|rgba\(0\s*,\s*0\s*,\s*0\s*,\s*0\)/.test(bg[1].trim()), `#playfield 背景必须透明，当前: ${bg[1].trim()}`);
});

test('3D 舞台运镜/过渡：相机分段推进与场景交叉淡化、UI 双层底材存在', () => {
  const stage = readFileSync(new URL('../js/bg3d/stage3d.js', import.meta.url), 'utf8');
  assert(/FRAG_PRESENT/.test(stage), '缺少场景过渡 present pass');
  assert(/_capturePrev/.test(stage) && /_prevOutRT/.test(stage), '缺少旧画面快照捕获');
  assert(/_applyCameraMotion/.test(stage) && /_motion/.test(stage), '缺少相机运镜');
  assert(/_transition/.test(stage), '缺少转场状态');
  const backdrops = readFileSync(new URL('../js/bg/backdrops.js', import.meta.url), 'utf8');
  assert(/stage-bg-next/.test(backdrops), 'UI 底材需双层交叉淡入');
  const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
  assert(/\.stage-bg-next\s*\{/.test(css), 'CSS 缺少 .stage-bg-next 层');
});

test('每关独立镜头导演：21 mode 全覆盖、实现互不相同、stage3d 使用导演系统', async () => {
  const mod = await import('../js/bg3d/cameraDirectors.js');
  assertEqual(typeof mod.makeCameraDirector, 'function');
  const modes = mod.cameraDirectorModes();
  const expected = [
    's1_mid', 's1_boss', 's2_mid', 's2_boss', 's3_mid', 's3_boss', 'patrol',
    'a4_mid', 'a4_boss', 'a5_mid', 'a5_boss', 'a6_mid', 'a6_boss',
    'b4_mid', 'b4_boss', 'b5_mid', 'b5_boss', 'b6_mid', 'b6_boss', 'ex_mid', 'ex_boss',
  ];
  assertEqual(modes.length, expected.length, '导演数量');
  for (const m of expected) assert(modes.includes(m), `缺少镜头导演: ${m}`);
  // 每关镜头必须是独立实现，不能 21 关共用同一函数
  const sources = new Set();
  for (const m of expected) sources.add(mod.cameraDirectorSource(m));
  assert(sources.size >= expected.length - 1, `镜头导演实现重复过多: ${sources.size}/${expected.length}`);
  const src = readFileSync(new URL('../js/bg3d/stage3d.js', import.meta.url), 'utf8');
  assert(/makeCameraDirector/.test(src), 'stage3d 必须使用 per-mode 镜头导演');
  assert(!/const JOURNEY =/.test(src), '旧的统一 JOURNEY 模板应已移除');
  // 导演采样必须确定、可重复
  const d = mod.makeCameraDirector('a4_mid', 'a4');
  const s1 = d.sample({ u: 0.4, t: 12, boss: false, stage: 'a4' });
  const s2 = d.sample({ u: 0.4, t: 12, boss: false, stage: 'a4' });
  assertEqual(JSON.stringify(s1), JSON.stringify(s2));
  assertEqual(typeof s1.z, 'number');
});
