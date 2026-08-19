/**
 * threeLoader 懒代理契约（Node / 浏览器均跑）。
 *
 * 回归背景：main.js 曾在未调用 loadThreeModule 的情况下直接 new StageBackground，
 * 此时懒代理 THREE.Xxx 全部为 undefined，`new THREE.WebGLRenderer(...)` 抛
 * TypeError → 左侧印象场景刷新后永远无显示且无占位提示。
 * 本用例锁定代理契约：加载（setThree）前不可用、加载后即时解析、镜像回退顺序。
 */
import {
  THREE, getThree, setThree, threeMirrors,
} from '../js/backgrounds/threeLoader.js';
import { StageBackground } from '../js/backgrounds/StageBackground.js';
import { test, assert, assertEqual } from './assert.js';

test('未 setThree 时 THREE.Xxx 为 undefined（构造场景前必须先加载 three）', () => {
  setThree(null);
  assert(getThree() === null, '初始 _three 应为 null');
  assertEqual(THREE.WebGLRenderer, undefined);
  assertEqual(THREE.Scene, undefined);
});

test('setThree 后懒代理即时解析且 getThree 返回注入模块', () => {
  const fake = { WebGLRenderer: 'Renderer', Scene: 'Scene' };
  setThree(fake);
  assertEqual(THREE.WebGLRenderer, 'Renderer');
  assertEqual(THREE.Scene, 'Scene');
  assert(getThree() === fake, 'getThree 应返回注入模块');
  // 恢复初始态，避免影响同进程其它用例
  setThree(null);
});

test('镜像回退顺序 jsdelivr → unpkg → esm.sh', () => {
  const m = threeMirrors();
  assertEqual(m.length, 3);
  assert(m[0].includes('jsdelivr'), '首选 jsdelivr');
  assert(m[1].includes('unpkg'), '次选 unpkg');
  assert(m[2].includes('esm.sh'), '三选 esm.sh');
});

test('StageBackground 初始 mode 为 null：首次 setMode（含 s1_mid）必触发重建', () => {
  const hadWindow = typeof globalThis.window !== 'undefined';
  if (!hadWindow) globalThis.window = globalThis;
  try {
    // 最小 THREE 假实现：只覆盖构造器 _resize 所需成员，不跑真实场景构建
    setThree({
      WebGLRenderer: class { setPixelRatio() {} setSize() {} render() {} },
      Scene: class { add() {} },
      PerspectiveCamera: class {
        constructor() { this.position = {}; }
        updateProjectionMatrix() {}
      },
      Group: class {},
      Timer: class { update() {} getElapsed() { return 0; } getDelta() { return 0; } },
    });
    const bg = new StageBackground({ clientWidth: 300, clientHeight: 500 });
    assert(bg.mode === null, '构造后 mode 应为 null（尚未构建任何场景）');

    let rebuilt = 0;
    bg._rebuild = () => { rebuilt += 1; };
    bg.setMode('s1_mid');
    assertEqual(rebuilt, 1, '首次 setMode("s1_mid") 必须触发重建（修复刷新后第一面空白）');
    bg.setMode('s1_mid');
    assertEqual(rebuilt, 1, '同 mode 重复 setMode 仍应去重');
    bg.setMode('s1_boss');
    assertEqual(rebuilt, 2, '切换 mode 应触发重建');
  } finally {
    setThree(null);
    if (!hadWindow) delete globalThis.window;
  }
});
