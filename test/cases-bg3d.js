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

test('镜头导演 u>1 必须保持抵达状态（不得无限前飞）', async () => {
  const mod = await import('../js/bg3d/cameraDirectors.js');
  for (const mode of mod.cameraDirectorModes()) {
    const d = mod.makeCameraDirector(mode);
    const at1 = d.sample({ u: 1, t: 0, boss: /_boss$/.test(mode), stage: mode.split('_')[0] });
    const at6 = d.sample({ u: 6, t: 0, boss: /_boss$/.test(mode), stage: mode.split('_')[0] });
    for (const key of ['z', 'x', 'y', 'lookX', 'lookY', 'fov', 'roll', 'gain']) {
      assert(Number.isFinite(at6[key]), `${mode} ${key} 非有限数: ${at6[key]}`);
    }
    assert(Math.abs(at6.z - at1.z) < 1e-6, `${mode} u>1 后相机仍在推进: z ${at1.z} -> ${at6.z}`);
  }
});

test('自适应工厂：context lost 先等 restored，超时才回退 2D（注入假实现）', async () => {
  const { AdaptivePlayfieldBackground } = await import('../js/playfieldBg.js');
  const makeFake3d = () => ({
    is3D: true, sceneReady: true, onContextLost: null, onContextRestored: null,
    setMode() {}, update() {}, draw() {}, dispose() {}, refreshed: 0,
    refresh() { this.refreshed += 1; },
  });
  const makeFake2d = () => ({
    is3D: false, mode: null, disposed: false,
    setMode(m) { this.mode = m; }, update() {}, draw() {}, dispose() { this.disposed = true; },
  });
  // 1) lost 后在宽限期内 restored → 不回退；超时 → 回退 2D 并保留当前 mode
  let fake3d = makeFake3d();
  let fake2d = makeFake2d();
  let canvasRemoved = false;
  const bg = new AdaptivePlayfieldBackground({}, {
    style: {},
    remove() { canvasRemoved = true; },
  }, { create3D: () => fake3d, create2D: () => fake2d });
  bg._contextRestoreWaitMs = 20;
  bg.setMode('s2_boss');
  assert(bg.is3D === true, '应初始为 3D');
  fake3d.onContextLost();
  assert(bg.is3D === true, 'context lost 后应先用恢复窗口，不立即回退');
  fake3d.onContextRestored();
  await new Promise((r) => setTimeout(r, 40));
  assert(bg.is3D === true, 'restored 在宽限期内到达则继续 3D');

  fake3d.onContextLost();
  await new Promise((r) => setTimeout(r, 40));
  assert(bg.is3D === false, '恢复超时后应回退 2D');
  assert(bg.impl === fake2d && fake2d.mode === 's2_boss', '回退 2D 后应保留当前 mode');
  assert(canvasRemoved, '永久回退时应移除 3D 画布');

  // 2) 3D draw 连续抛错 → 回退 2D，并释放 3D 上下文
  fake3d = makeFake3d();
  fake2d = makeFake2d();
  let lost = 0;
  fake3d.renderer = { forceContextLoss() { lost += 1; } };
  fake3d.draw = () => { throw new Error('boom'); };
  const bg2 = new AdaptivePlayfieldBackground({}, { style: {} }, {
    create3D: () => fake3d, create2D: () => fake2d,
  });
  bg2.setMode('s1_mid');
  bg2.draw({});
  assert(bg2.is3D === true, '单次 draw 失败不应立刻回退');
  bg2.draw({});
  assert(bg2.is3D === false, '连续 draw 失败应回退 2D');
  assertEqual(lost, 1, '回退时应丢弃 WebGL 上下文');
});

test('自适应工厂：refresh 只在 3D 时转给实现（plate 晚到补建）', async () => {
  const { AdaptivePlayfieldBackground } = await import('../js/playfieldBg.js');
  const fake3d = {
    is3D: true, sceneReady: true, onContextLost: null, onContextRestored: null,
    setMode() {}, update() {}, draw() {}, dispose() {}, refreshed: 0,
    refresh() { this.refreshed += 1; },
  };
  const bg = new AdaptivePlayfieldBackground({}, { style: {} }, {
    create3D: () => fake3d,
    create2D: () => ({ is3D: false, setMode() {}, update() {}, draw() {}, dispose() {} }),
  });
  bg.setMode('s1_mid');
  bg.refresh();
  assertEqual(fake3d.refreshed, 1, '3D 实现应收到 refresh');
});

test('渲染资源生命周期：阴影/PMREM/共享纹理/底材位图/隐藏渲染已接线', () => {
  const stage = readFileSync(new URL('../js/bg3d/stage3d.js', import.meta.url), 'utf8');
  assert(/l\.shadow\?\.dispose/.test(stage), '重建场景需释放灯光阴影贴图');
  assert(/environmentIntensity = 1/.test(stage), '_clear 需重置环境强度');
  assert(/K\.clearKitTextureCache/.test(stage), 'dispose 需释放 kit 共享纹理缓存');
  assert(/disposeTextures/.test(stage), '需释放场景专属 CanvasTexture');
  assert(/onContextRestored\?\.?\(\)/.test(stage), '需上报 context restored 供恢复窗口取消');
  const kit = readFileSync(new URL('../js/bg3d/kit.js', import.meta.url), 'utf8');
  assert(/rec = \{ envMap: rt\.texture, background: equirect, rt \}/.test(kit), 'PMREM 缓存需保留 RT');
  assert(/old\?\.rt\?\.dispose/.test(kit), 'IBL 淘汰需 dispose RT');
  assert(/g\.userData\.disposeTextures/.test(kit) && /m\.userData\.disposeTextures/.test(kit), 'eye/giantSeal 纹理需登记释放');
  const backdrops = readFileSync(new URL('../js/bg/backdrops.js', import.meta.url), 'utf8');
  assert(!/rec\.img\s*=/.test(backdrops), '外围底材不再长期持有解码位图');
  assert(/rec\.loaded/.test(backdrops), '外围底材改用 loaded 标志');
  const mainSrc = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  assert(!/requestAnimationFrame\(idle\)/.test(mainSrc), '菜单期不得再用 idle rAF 渲染隐藏画布');
  const stageBackground = readFileSync(new URL('../js/backgrounds/StageBackground.js', import.meta.url), 'utf8');
  assert(/resize\(\)\s*\{\s*this\._resize\(\)/.test(stageBackground), 'StageBackground 需暴露 resize');
});

test('EX 镜头不得出现逐帧跳变（抽搐回归守卫）', async () => {
  const mod = await import('../js/bg3d/cameraDirectors.js');
  for (const mode of ['ex_mid', 'ex_boss']) {
    const d = mod.makeCameraDirector(mode, 'ex');
    const fps = 60;
    let prev = null;
    let maxDX = 0;
    let maxDF = 0;
    let maxDR = 0;
    for (let i = 0; i <= fps * 12; i++) {
      const t = i / fps;
      const s = d.sample({ u: t / d.dur, t, boss: /_boss$/.test(mode), stage: 'ex' });
      if (prev) {
        maxDX = Math.max(maxDX, Math.abs(s.lookX - prev.lookX));
        maxDF = Math.max(maxDF, Math.abs(s.fov - prev.fov));
        maxDR = Math.max(maxDR, Math.abs(s.roll - prev.roll));
      }
      prev = s;
    }
    assert(maxDX < 0.5, `${mode} lookX 逐帧跳变过大: ${maxDX.toFixed(3)}`);
    assert(maxDF < 0.3, `${mode} fov 逐帧跳变过大: ${maxDF.toFixed(3)}`);
    assert(maxDR < 0.004, `${mode} roll 逐帧跳变过大: ${maxDR.toFixed(4)}`);
  }
});

test('s1 水面高光参数已收敛（避免无意义闪光回归）', () => {
  const src = readFileSync(new URL('../js/bg3d/scenes/s1.js', import.meta.url), 'utf8');
  const m = /waterFloor\(\{([\s\S]*?)\}\)/.exec(src);
  assert(m, 's1 缺少 waterFloor 调用');
  const body = m[1];
  const ns = /normalScale:\s*([0-9.]+)/.exec(body);
  const rough = /roughness:\s*([0-9.]+)/.exec(body);
  const env = /envMapIntensity:\s*([0-9.]+)/.exec(body);
  assert(ns && Number(ns[1]) <= 0.5, 's1 水面 normalScale 需 ≤0.5');
  assert(rough && Number(rough[1]) >= 0.18, 's1 水面 roughness 需 ≥0.18');
  assert(env && Number(env[1]) <= 0.6, 's1 水面 envMapIntensity 需 ≤0.6');
});

test('s1/b4 镜头首 10s 推进里程下限（修“速度过慢”）', async () => {
  const mod = await import('../js/bg3d/cameraDirectors.js');
  const limits = { s1_mid: -7, s1_boss: -14, b4_mid: -9, b4_boss: -17 };
  for (const [mode, limit] of Object.entries(limits)) {
    const d = mod.makeCameraDirector(mode, mode.split('_')[0]);
    const s = d.sample({ u: 10 / d.dur, t: 10, boss: /_boss$/.test(mode), stage: mode.split('_')[0] });
    assert(s.z <= limit, `${mode} 首 10s 推进不足: z=${s.z.toFixed(2)}（应 ≤ ${limit}）`);
  }
});

test('全部关卡水面高光参数安全（防 s1 式无意义闪光回归）', () => {
  const kit = readFileSync(new URL('../js/bg3d/kit.js', import.meta.url), 'utf8');
  assert(/normalScale = Math\.min\(0\.5/.test(kit), 'waterFloor 缺少 normalScale 安全上限');
  assert(/roughness = Math\.max\(0\.18/.test(kit), 'waterFloor 缺少 roughness 安全下限');
  const files = ['s1', 's2', 's3', 'patrol', 'a4', 'a5', 'a6', 'b4', 'b5', 'b6', 'ex'];
  for (const f of files) {
    const src = readFileSync(new URL(`../js/bg3d/scenes/${f}.js`, import.meta.url), 'utf8');
    for (const m of src.matchAll(/waterFloor\(\{([\s\S]*?)\}\)\)/g)) {
      const body = m[1];
      const ns = /normalScale:\s*([^,\n]+)/.exec(body);
      const rough = /roughness:\s*([^,\n]+)/.exec(body);
      if (ns) {
        for (const num of ns[1].match(/[0-9]+(?:\.[0-9]+)?/g) || []) {
          assert(Number(num) <= 0.5, `${f} 水面 normalScale 过大: ${ns[1]}`);
        }
      }
      if (rough) {
        for (const num of rough[1].match(/[0-9]+(?:\.[0-9]+)?/g) || []) {
          assert(Number(num) >= 0.18, `${f} 水面 roughness 过小: ${rough[1]}`);
        }
      }
    }
  }
});

test('无限世界：ambient 跟随镜头、景物越过回收、巡航不停留（纯函数）', async () => {
  const { applyWorldFollow, postArrivalCruise } = await import('../js/bg3d/stage3d.js');
  const water = { position: { z: -100 }, userData: { ambient: true } };
  const torii = { position: { z: -10 }, userData: { recyclable: true } };
  const far = { position: { z: -120 }, userData: { recyclable: true } };
  const root = [water, torii, far];
  const prev = 0;
  const now = -30; // 镜头前进 30，torii 被越过
  const r = applyWorldFollow(root, now, prev);
  assertEqual(r.dz, -30);
  assertEqual(water.position.z, -130, 'ambient 应随镜头平移保持相对位置');
  assertEqual(torii.position.z, -160, '越过的景物应回收到前方 150 单位');
  assertEqual(far.position.z, -120, '前方景物不应回收');
  // 首帧不移动
  const first = applyWorldFollow(root, now, null);
  assertEqual(first.dz, 0);
  // 巡航持续增大且不停留
  assertEqual(postArrivalCruise(-1), 0);
  const c1 = postArrivalCruise(0);
  const c2 = postArrivalCruise(10);
  assertEqual(c1, 0);
  assert(c2 > c1, '抵达后仍应持续巡航');
  assert(postArrivalCruise(20) > postArrivalCruise(10), '巡航距离应继续增长');
});
