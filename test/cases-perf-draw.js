/**
 * 热路径性能（审计第七轮 #42–#49）：缓存命中、变换栈、DOM 节流、平方距离
 *
 * 全部用「记录型 fake canvas/ctx」在 Node 跑，不依赖真实 canvas / Three：
 * - withFakeCanvas 注入最小 document.createElement('canvas')，离屏绘制落到 mockCtx
 * - 断言第二次绘制不再新建 canvas / 主画布调用数下降
 * 视觉等价性靠「同参数同烘焙产物 + 主画布仅 drawImage」的调用形状保证；像素级由 e2e 截图另行核对。
 */
import {
  BALANCE, DEFAULT_SETTINGS, FPS_LIMIT_MIN, FPS_LIMIT_CAP,
} from '../js/config.js';
import { loadSettings, normalizeFpsLimit } from '../js/storage.js';
import { Bullet } from '../js/entities.js';
import { runCollisions } from '../js/collision.js';
import { isEnemyInGrazeRange } from '../js/draw/drawUtils.js';
import { drawBullet } from '../js/draw/bulletDraw.js';
import { drawItem } from '../js/draw/itemDraw.js';
import { drawEnemy } from '../js/draw/enemyDraw.js';
import { drawSpriteCirc } from '../js/sprites.js';
import { updateGameHud } from '../js/hud.js';
import { updateBossEnemyMarker } from '../js/gameDraw.js';
import {
  test, assert, assertEqual, assertClose,
} from './assert.js';

/* ========== 记录型 fake ctx / fake canvas ========== */

function mockCtx() {
  const calls = [];
  const gradient = { addColorStop() {} };
  const rec = (name) => (...args) => { calls.push([name, ...args]); };
  const ctx = {
    calls,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    shadowColor: '',
    shadowBlur: 0,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    imageSmoothingEnabled: true,
    save: rec('save'),
    restore: rec('restore'),
    translate: rec('translate'),
    rotate: rec('rotate'),
    scale: rec('scale'),
    clip: rec('clip'),
    beginPath: rec('beginPath'),
    closePath: rec('closePath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    arc: rec('arc'),
    ellipse: rec('ellipse'),
    rect: rec('rect'),
    roundRect: rec('roundRect'),
    fill: rec('fill'),
    stroke: rec('stroke'),
    fillRect: rec('fillRect'),
    strokeRect: rec('strokeRect'),
    fillText: rec('fillText'),
    strokeText: rec('strokeText'),
    drawImage: rec('drawImage'),
    setLineDash: rec('setLineDash'),
    clearRect: rec('clearRect'),
    setTransform: rec('setTransform'),
    createRadialGradient: (...args) => {
      calls.push(['createRadialGradient', ...args]);
      return gradient;
    },
    createLinearGradient: (...args) => {
      calls.push(['createLinearGradient', ...args]);
      return gradient;
    },
    measureText: () => ({ width: 0 }),
  };
  return ctx;
}

const count = (ctx, name) => ctx.calls.filter((c) => c[0] === name).length;

/** 临时注入离屏 canvas 工厂；返回本次新建的 canvas 列表（用于断言「只建一次」） */
function withFakeCanvas(fn) {
  const prevDoc = globalThis.document;
  const made = [];
  globalThis.document = {
    createElement(tag) {
      made.push(tag);
      const canvas = {
        width: 0,
        height: 0,
        _ctx: null,
        getContext() {
          if (!this._ctx) this._ctx = mockCtx();
          return this._ctx;
        },
      };
      return canvas;
    },
  };
  try {
    return fn(made);
  } finally {
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
  }
}

/* ========== #45 默认描画上限 ========== */

test('#45 DEFAULT_SETTINGS.fpsLimit 默认 60（产品变更），手动无限制仍可用', () => {
  assertEqual(DEFAULT_SETTINGS.fpsLimit, 60, '默认描画上限应为 60fps');
  assert(
    DEFAULT_SETTINGS.fpsLimit >= FPS_LIMIT_MIN
    && DEFAULT_SETTINGS.fpsLimit <= FPS_LIMIT_CAP,
    '默认值必须在滑条有限区间内',
  );
  assertEqual(normalizeFpsLimit(0), 0, '0 仍是手动无限制');
  const prev = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => null, setItem() {}, removeItem() {},
  };
  try {
    assertEqual(loadSettings().fpsLimit, 60, '无存档时 loadSettings 套用新默认');
  } finally {
    if (prev === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prev;
  }
});

/* ========== #46 平方距离 / 擦弹 reach 缓存 ========== */

test('#46 Bullet.reset 缓存擦弹视觉外包半径，并清空绘制缓存/距离', () => {
  const talisman = new Bullet({
    x: 0, y: 0, type: 'talisman', from: 'enemy', w: 10, h: 14,
  });
  assertClose(talisman._grazeReach, Math.hypot(5, 7), 1e-9, 'talisman reach = hypot(w/2,h/2)');
  const rice = new Bullet({
    x: 0, y: 0, type: 'rice', from: 'enemy', w: 12, h: 6,
  });
  assertClose(rice._grazeReach, 12 * 0.55, 1e-9, 'rice reach = max(w,h)*0.55');
  const dot = new Bullet({ x: 0, y: 0, type: 'dot', from: 'enemy', r: 3 });
  assertEqual(dot._grazeReach, 3, 'dot reach = 判定半径');
  const laser = new Bullet({
    x: 0, y: 0, type: 'laser', from: 'enemy', w: 10, laserLen: 100,
  });
  assertEqual(laser._grazeReach, 5, 'laser reach = w/2');

  // 对象池复用：旧绘制缓存与旧碰撞距离必须清掉（防脏缓存）
  talisman._dc = { riceN: { pad: 1 } };
  talisman._dist2 = 123;
  talisman._grazeNear = true;
  talisman.reset({ x: 0, y: 0, type: 'talisman', from: 'enemy' });
  assertEqual(talisman._dc, null, 'reset 清绘制缓存');
  assertEqual(talisman._dist2, null, 'reset 清碰撞距离');
  assertEqual(talisman._grazeNear, false);
});

test('#46 runCollisions 保存同帧自机中心距离²（圆弹/激光）', () => {
  const p = { x: 100, y: 100, r: 3, edit: 0 };
  const round = new Bullet({ x: 140, y: 100, type: 'rice', from: 'enemy' });
  const laser = new Bullet({
    x: 0, y: 160, type: 'laser', from: 'enemy', angle: 0, laserLen: 200, laserLenCur: 200, w: 10,
  });
  runCollisions({
    player: p, enemies: [], playerBullets: [], enemyBullets: [round, laser], _colEvents: [],
  });
  assertClose(round._dist2, 40 * 40, 1e-9, '圆弹存中心距离²');
  assertEqual(round._distPx, p.x);
  assertEqual(round._distPy, p.y);
  assertClose(laser._dist2, 100 * 100 + 60 * 60, 1e-9, '激光绘制口径也是中心距离²');
});

test('#46 isEnemyInGrazeRange 平方比较与改前 hypot 口径一致（含 stale 保护）', () => {
  const grazeR = BALANCE.grazeRadius;
  const player = { x: 100, y: 100 };
  for (const type of ['rice', 'talisman']) {
    for (const off of [0, 5, grazeR - 1, grazeR + 1, 20, 60]) {
      const b = new Bullet({
        x: player.x + off, y: player.y, type, from: 'enemy',
      });
      b._grazeNear = false;
      b._dist2 = off * off;
      b._distPx = player.x;
      b._distPy = player.y;
      const expected = Math.hypot(off, 0) < grazeR + b._grazeReach;
      assertEqual(isEnemyInGrazeRange(b, player), expected, `${type} off=${off}`);
    }
  }
  // 自机被传送后，旧距离²不能复用（坐标不匹配 → 重算实际位置）
  const far = new Bullet({ x: 300, y: 100, type: 'rice', from: 'enemy' });
  far._grazeNear = false;
  far._dist2 = 0;
  far._distPx = 0;
  far._distPy = 0;
  assertEqual(isEnemyInGrazeRange(far, player), false, '过期 _dist2 不得复用');
});

test('#46 激光绘制擦弹仍按「中心距」口径（不复用撞线段距）', () => {
  const p = { x: 100, y: 100, r: 3, edit: 0 };
  // 线段从 (100,400) 向上穿过自机 → 碰撞线段距 0，但中心距 300
  const laser = new Bullet({
    x: 100, y: 400, type: 'laser', from: 'enemy', angle: -Math.PI / 2, laserLen: 400, laserLenCur: 400, w: 10,
  });
  runCollisions({
    player: p, enemies: [], playerBullets: [], enemyBullets: [laser], _colEvents: [],
  });
  assertClose(laser._dist2, 300 * 300, 1e-9, '激光存中心距²');
  laser._grazeNear = false; // 走精算分支（碰撞近邻快捷路径也会返回 true，与改前一致）
  assertEqual(isEnemyInGrazeRange(laser, p), false, '中心距 300 > 33+200，不应亮紫光');
});

/* ========== #42 弹 sprite entry 缓存在弹对象 ========== */

test('#42 rice/talisman/laser sprite entry 缓存在弹对象：只建一次、翻转 graze 只多一份', () => {
  withFakeCanvas((made) => {
    const cases = [
      { type: 'rice', color: '#411122', color2: '#423344' },
      { type: 'talisman', color: '#512233', color2: '#524455' },
      {
        type: 'laser', color: '#613344', color2: '#635566', laserLen: 120, angle: 0.3,
      },
    ];
    for (const c of cases) {
      const b = new Bullet({
        x: 200, y: 260, type: c.type, from: 'enemy',
        color: c.color, color2: c.color2, laserLen: c.laserLen, laserLenCur: c.laserLen, angle: c.angle,
      });
      const ctx = mockCtx();
      drawBullet(ctx, b, 1, null);
      const built = made.length;
      assert(built >= 1, `${c.type} 首帧应烘一份 sprite`);
      const bag = b._dc;
      assert(bag && Object.keys(bag).length >= 1, `${c.type} 缓存挂在弹对象上`);

      drawBullet(ctx, b, 1, null);
      assertEqual(made.length, built, `${c.type} 第二帧不得重建 canvas`);
      assert(b._dc === bag, `${c.type} 缓存袋身份不变`);
      assert(count(ctx, 'drawImage') >= 2, `${c.type} 走 drawImage`);

      // 进入擦弹态：紫色两态各烘一份；再切回原色复用旧 entry
      b._grazeNear = true;
      drawBullet(ctx, b, 1, { x: b.x, y: b.y });
      const grazeBuilt = made.length;
      assert(grazeBuilt > built, `${c.type} 擦弹态应烘第二份 sprite`);
      drawBullet(ctx, b, 1, { x: b.x, y: b.y });
      assertEqual(made.length, grazeBuilt, `${c.type} 擦弹态复用`);
      b._grazeNear = false;
      drawBullet(ctx, b, 1, { x: b.x, y: b.y });
      assertEqual(made.length, grazeBuilt, `${c.type} 切回原色复用原 entry`);
    }
  });
});

/* ========== #43 道具预渲染 ========== */

test('#43 5 种道具 × attract 两态预渲染：主画布只 drawImage', () => {
  withFakeCanvas((made) => {
    const ctx = mockCtx();
    const kinds = ['score', 'scoreL', 'life', 'bomb', 'power'];
    for (const kind of kinds) {
      for (const attract of [false, true]) {
        drawItem(ctx, {
          x: 40, y: 50, kind, attract,
        });
      }
    }
    assertEqual(made.length, 10, '5 种 × 2 态各一张离屏 canvas');
    assertEqual(count(ctx, 'drawImage'), 10);
    assertEqual(count(ctx, 'fillText'), 0, '主画布不再每道具 fillText');
    assertEqual(count(ctx, 'save'), 0, '主画布不再 save/translate');
    assertEqual(count(ctx, 'createRadialGradient'), 0);

    // 第二轮回：全部命中缓存，不新建 canvas
    for (const kind of kinds) {
      for (const attract of [false, true]) {
        drawItem(ctx, {
          x: 60, y: 70, kind, attract,
        });
      }
    }
    assertEqual(made.length, 10, '第二轮不得新建 canvas');
    assertEqual(count(ctx, 'drawImage'), 20);
  });
});

/* ========== #44 自机弹 sprite ========== */

test('#44 自机弹按两色烘一张 shot sprite：主画布无渐变/椭圆/模糊，缓存按色复用', () => {
  withFakeCanvas((made) => {
    const ctx = mockCtx();
    const makeShot = (angle) => new Bullet({
      x: 200, y: 400, type: 'player', from: 'player', angle,
      color: '#7a8b9c', color2: '#adbecf', r: 5, w: 10, h: 22, life: 2,
    });
    const b1 = makeShot(-Math.PI / 2);
    drawBullet(ctx, b1, 0.3);
    assertEqual(made.length, 1, '首帧烘一张 sprite');
    assert(b1._dc && b1._dc.shot, 'sprite entry 挂弹对象');
    assertEqual(count(ctx, 'createLinearGradient'), 0, '主画布不再建线性渐变');
    assertEqual(count(ctx, 'ellipse'), 0, '主画布不再画椭圆');
    assertEqual(count(ctx, 'drawImage'), 1);
    // 改前 player 型未排除在旋转分支外 → 必须保留 rotate(angle+π/2)
    assertEqual(count(ctx, 'rotate'), 1, '自机弹仍按 angle 旋转（视觉等价）');
    const rot = ctx.calls.find((c) => c[0] === 'rotate');
    assertClose(rot[1], -Math.PI / 2 + Math.PI / 2, 1e-9);

    const b2 = makeShot(-Math.PI / 2 + 0.14);
    drawBullet(ctx, b2, 0.3);
    assertEqual(made.length, 1, '同色第二发复用同一 sprite');
    assertEqual(count(ctx, 'drawImage'), 2);
  });
});

/* ========== #47 非旋转弹型跳过变换栈 ========== */

test('#47 dot/medium/large/option/bomb 绝对坐标绘制，不走 save/translate/rotate', () => {
  withFakeCanvas(() => {
    for (const type of ['dot', 'medium', 'large', 'option', 'bomb']) {
      const ctx = mockCtx();
      const b = new Bullet({
        x: 220, y: 300, type, from: 'enemy',
      });
      drawBullet(ctx, b, 1, null);
      assertEqual(count(ctx, 'save'), 0, `${type} 不应 save`);
      assertEqual(count(ctx, 'restore'), 0, `${type} 不应 restore`);
      assertEqual(count(ctx, 'translate'), 0, `${type} 不应 translate`);
      assertEqual(count(ctx, 'rotate'), 0, `${type} 不应 rotate`);
      assert(count(ctx, 'drawImage') >= 1, `${type} 应有光晕 drawImage`);
      // 绝对坐标锚点：sprite 绘制位置为 (中心 - pad)，应在版面附近而非本地 (0,0)
      const img = ctx.calls.find((c) => c[0] === 'drawImage');
      assert(Number.isFinite(img[2]) && Number.isFinite(img[3]), `${type} drawImage 使用绝对坐标`);
      assert(img[2] < 220 && img[3] < 300, `${type} drawImage 锚点以弹中心为基准`);
      assertEqual(count(ctx, 'createRadialGradient'), 0, `${type} 光晕已 sprite 化`);
    }
  });
});

test('#47 rice/talisman/laser 保留变换栈（锚点 = 弹中心，旋转 = angle+π/2）', () => {
  withFakeCanvas(() => {
    const cases = [
      { type: 'rice', color: '#714253', color2: '#726374' },
      { type: 'talisman', color: '#814364', color2: '#826385' },
      {
        type: 'laser', color: '#914475', color2: '#927396', laserLen: 90,
      },
    ];
    for (const c of cases) {
      const ctx = mockCtx();
      const b = new Bullet({
        x: 150, y: 260, type: c.type, from: 'enemy', angle: 0.5,
        color: c.color, color2: c.color2, laserLen: c.laserLen, laserLenCur: c.laserLen,
      });
      drawBullet(ctx, b, 1, null);
      assertEqual(count(ctx, 'save'), 1, `${c.type} save`);
      assertEqual(count(ctx, 'restore'), 1, `${c.type} restore`);
      const t = ctx.calls.find((x) => x[0] === 'translate');
      assertClose(t[1], 150);
      assertClose(t[2], 260);
      const r = ctx.calls.find((x) => x[0] === 'rotate');
      assertClose(r[1], 0.5 + Math.PI / 2, 1e-9, `${c.type} 旋转角不变`);
    }
  });
});

/* ========== #48 DOM 写入节流 ========== */

function mockMarker() {
  const state = { adds: 0, removes: 0 };
  const style = {};
  let leftWrites = 0;
  Object.defineProperty(style, 'left', {
    get() { return this._left; },
    set(v) {
      leftWrites += 1;
      this._left = v;
    },
  });
  return {
    state,
    leftWrites: () => leftWrites,
    el: {
      style,
      classList: {
        add() { state.adds += 1; },
        remove() { state.removes += 1; },
      },
    },
  };
}

test('#48 Boss 标记仅在 pct/显隐变化时写 DOM', () => {
  const marker = mockMarker();
  const game = {
    el: { bossEnemyMarker: marker.el },
    bossRef: { x: 100, dead: false },
    endingCinematic: false,
    state: 'playing',
  };
  updateBossEnemyMarker(game);
  assertEqual(marker.leftWrites(), 1, '首次写 left');
  assertEqual(marker.state.removes, 1, '首次显示 remove hidden');
  updateBossEnemyMarker(game);
  updateBossEnemyMarker(game);
  assertEqual(marker.leftWrites(), 1, '位置未变不重复写 left');
  assertEqual(marker.state.removes, 1, '显示态不重复 remove');

  game.bossRef.x = 140;
  updateBossEnemyMarker(game);
  assertEqual(marker.leftWrites(), 2, '位置变化才写');

  game.bossRef.dead = true;
  updateBossEnemyMarker(game);
  updateBossEnemyMarker(game);
  assertEqual(marker.state.adds, 1, '隐藏只写一次');
});

function scoreTextNode() {
  const node = { _text: '', title: '', writes: 0 };
  Object.defineProperty(node, 'textContent', {
    get() { return this._text; },
    set(v) {
      this.writes += 1;
      this._text = v;
    },
  });
  return node;
}

test('#48 HUD 分数文本大约 30Hz 写入，落定/非对局立即对齐真值', () => {
  const el = {
    score: scoreTextNode(),
    scoreDetails: scoreTextNode(),
    scoreCompact: scoreTextNode(),
    hiscore: scoreTextNode(),
  };
  const game = {
    player: {
      lives: 4, bombs: 4, edit: 0, def: { name: '饮泉思源' },
    },
    el,
    state: 'playing',
    paused: false,
    score: 1e9,
    hiscore: 0,
    _scoreShown: 0,
    _scoreSpeed: 0,
    chapters: [],
    chapterIndex: 0,
    chapterTendency: 0,
    totalTendency: 0,
    combo: 0,
    comboTimer: 0,
    mode: 'story',
    diff: null,
    unstableFx: null,
    letterTimeMax: 0,
  };
  const runs = 60;
  for (let i = 0; i < runs; i++) updateGameHud(game);
  // 60 个逻辑帧 → 最多约 30 次分数块写入（3 个文本节点各 1 次/写入轮）
  const compactWrites = el.scoreCompact.writes;
  assert(compactWrites > 0, '滚动期应有写入');
  assert(compactWrites <= runs / 2 + 1, `30Hz 节流生效，实际 ${compactWrites}/${runs}`);
  // 跑到落定：显示最终值必须等于真值（不改变最终显示值）
  for (let i = 0; i < 4000; i++) updateGameHud(game);
  assertEqual(el.scoreCompact.textContent, '1B', 'compact 文本落定到真值');
  assertEqual(el.scoreCompact.title, '1000000000', 'title 落定到真值');
  assertEqual(el.score.textContent, '1000000000');
  // 退出对局态：立即直对齐
  game.state = 'dialogue';
  game.score = 1.2e9;
  updateGameHud(game);
  assertEqual(el.scoreCompact.textContent, '1.2B', '非对局态立即写最终值');
  assertEqual(el.score.textContent, '1200000000');
});

/* ========== #49 敌机光环 / 圆形裁剪预渲染 ========== */

test('#49 敌机底层光环按 size/color 预渲染，主画布不再每帧建径向渐变', () => {
  withFakeCanvas((made) => {
    const ctx = mockCtx();
    const boss = {
      id: 1,
      x: 200,
      y: 150,
      r: 24,
      type: 'boss',
      kind: 'boss', // 未登记贴图 → 几何分支，不影响光环路径
      hp: 100,
      maxHp: 0,
      dead: false,
      isSpawning: false,
      spin: 0.3,
      color: '#0a1b2c',
      color2: '#fff',
      label: null,
      spawnFxT: 0,
      hurtT: 0,
    };
    drawEnemy(ctx, boss);
    assertEqual(made.length, 1, '光环 sprite 烘一张');
    assertEqual(count(ctx, 'createRadialGradient'), 0, '主画布不再建径向渐变');
    const after = ctx.calls.length;
    drawEnemy(ctx, boss);
    assertEqual(made.length, 1, '第二帧复用光环 sprite');
    assert(ctx.calls.length > after, '第二帧仍有绘制调用');
  });
});

test('#49 drawSpriteCirc 圆形裁剪+外圈光晕预渲染：主画布不再 clip/shadowBlur', () => {
  withFakeCanvas((made) => {
    const fakeImg = {
      complete: true, naturalWidth: 64, src: 'fake://perf-circ-a',
    };
    const ctx = mockCtx();
    const opts = { glow: '#0badf0', rot: 0.2 };
    assertEqual(drawSpriteCirc(ctx, fakeImg, 100, 120, 32, opts), true);
    assertEqual(made.length, 1, '裁剪贴图烘一张');
    assertEqual(count(ctx, 'clip'), 0, '主画布不再 clip');
    assertEqual(count(ctx, 'drawImage'), 1);
    assertEqual(count(ctx, 'rotate'), 1, '旋转仍由调用方施加');
    drawSpriteCirc(ctx, fakeImg, 50, 60, 32, opts);
    assertEqual(made.length, 1, '第二帧复用烘焙 sprite');
    assertEqual(count(ctx, 'drawImage'), 2);
  });
});

test('#49 无离屏 canvas 时保留原裁剪路径（Node/回退）', () => {
  if (typeof document !== 'undefined') return; // 浏览器始终有 canvas，跳过回退用例
  const fakeImg = {
    complete: true, naturalWidth: 64, src: 'fake://perf-circ-fallback',
  };
  const ctx = mockCtx();
  assertEqual(drawSpriteCirc(ctx, fakeImg, 10, 10, 32, { glow: '#0badf0' }), true);
  assertEqual(count(ctx, 'clip'), 1, '回退走原 clip 路径');
  assertEqual(count(ctx, 'drawImage'), 1);
});
