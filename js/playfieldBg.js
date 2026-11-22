/**
 * 关卡版面背景（兼容入口）。
 *
 * 自 P6 起由数据驱动绘卷系统实现：
 *   场景数据 `js/bg/scenes/` + 共享原子 `js/bg/atoms.js` + 渲染器 `js/bg/renderer.js`；
 *   mode / plate 路径权威仍是 `js/bgModes.js`。
 * 本文件保留原有公开 API（game.js / chapterFlow.js / 测试 / 启动预载均依赖）：
 *   PlayfieldBackground、preloadPlayfieldBg、getPlayfieldBgModes、getPlayfieldBgPaths。
 *
 * 设计说明：docs/level-background-redesign.md。
 */
import { BackgroundRenderer, loadScenePlate } from './bg/renderer.js';
import { getThree } from './backgrounds/threeLoader.js';
import { PlayfieldStage3D } from './bg3d/stage3d.js';
import { PLAYFIELD_BG_TEX, getAllBgModes } from './bgModes.js';
import { preloadMaterials } from './bg/materials.js';

/** 全部版面 plate 路径（去重；mid/boss 共用） */
export function getPlayfieldBgPaths() {
  return [...new Set(Object.values(PLAYFIELD_BG_TEX))];
}

/** 版面背景 mode id 列表（测试 / 校验章节 bg 用）— 与 bgModes 同源 */
export function getPlayfieldBgModes() {
  return getAllBgModes();
}

/** 预载全部版面 plate + 材质（启动期一次；失败项 resolve null，不阻塞启动） */
export function preloadPlayfieldBg() {
  const paths = getPlayfieldBgPaths();
  return Promise.all(paths.map((p) => loadScenePlate(p)))
    .then(async (imgs) => {
      await preloadMaterials();
      return imgs;
    });
}

/** 关卡版面背景（Canvas 2D 绘卷，450×600；3D 失败时兜底） */
export class PlayfieldBackground extends BackgroundRenderer {}

/**
 * 关卡版面背景工厂：3D 舞台优先，失败/无 WebGL 时回退 Canvas 2D 绘卷。
 * 两者共享同一套 setMode/update/draw API（draw 对 3D 忽略 ctx 参数）。
 * @param {HTMLCanvasElement} canvas2d 版面 canvas（2D）
 * @param {HTMLCanvasElement|null} [canvas3d] 版面 3D canvas
 */
export function createPlayfieldBackground(canvas2d, canvas3d) {
  const force2d = typeof location !== 'undefined' && /[?&]bg2d=1/.test(location.search);
  try {
    if (!force2d && canvas3d && getThree()) {
      const bg = new PlayfieldStage3D(canvas3d);
      canvas3d.hidden = false;
      canvas3d.style.display = 'block';
      return bg;
    }
  } catch (err) {
    console.warn('[playfield3d] fallback to 2D:', err);
  }
  if (canvas3d) { canvas3d.hidden = true; canvas3d.style.display = 'none'; }
  return new PlayfieldBackground();
}
