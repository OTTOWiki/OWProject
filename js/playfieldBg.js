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
 * 自适应版面背景：首次使用时才构造 3D 舞台（避免启动期双 WebGL 上下文/隐藏画布问题），
 * 3D 构造或场景构建失败时自动销毁 3D 并回退 Canvas 2D 绘卷。
 * 对外保持 setMode/update/draw 契约。
 */
class AdaptivePlayfieldBackground {
  constructor(canvas2d, canvas3d) {
    this.canvas2d = canvas2d;
    this.canvas3d = canvas3d;
    this.impl = null;
    this.is3D = false;
    this._pendingMode = null;
    this._pendingTransition = false;
    this._force2d = typeof location !== 'undefined' && /[?&]bg2d=1/.test(location.search);
  }

  _ensure(mode) {
    if (this.impl) return;
    if (!this._force2d && this.canvas3d && getThree()) {
      try {
        const bg = new PlayfieldStage3D(this.canvas3d);
        bg.setMode(mode || 's1_mid', { transition: false });
        if (bg.sceneReady) {
          this.impl = bg;
          this.is3D = true;
          this.canvas3d.hidden = false;
          this.canvas3d.style.display = 'block';
          return;
        }
        console.warn('[playfield3d] scene not ready at init, fallback 2D');
        bg.dispose?.();
      } catch (err) {
        console.warn('[playfield3d] init failed, fallback 2D:', err);
      }
    }
    if (this.canvas3d) {
      this.canvas3d.hidden = true;
      this.canvas3d.style.display = 'none';
    }
    this.impl = new PlayfieldBackground();
    this.is3D = false;
  }

  setMode(mode, opts = {}) {
    this._pendingMode = mode;
    this._pendingTransition = opts.transition !== false;
    this._ensure(mode);
    try {
      this.impl.setMode(mode, opts);
    } catch (err) {
      console.warn('[playfield3d] setMode failed, fallback 2D:', err);
      this._fallback2d();
      this.impl.setMode(mode, opts);
    }
    // 3D 场景构建失败（未 throw 但未 ready）也回退
    if (this.is3D && this.impl.sceneReady === false) {
      console.warn('[playfield3d] scene failed after setMode, fallback 2D');
      this._fallback2d();
      this.impl.setMode(mode, opts);
    }
  }

  _fallback2d() {
    try { this.impl?.dispose?.(); } catch (err) { /* ignore */ }
    if (this.canvas3d) {
      this.canvas3d.hidden = true;
      this.canvas3d.style.display = 'none';
    }
    const bg = new PlayfieldBackground();
    this.impl = bg;
    this.is3D = false;
  }

  update(dt) { this.impl?.update?.(dt); }
  draw(ctx) { this.impl?.draw?.(ctx); }
  dispose() { try { this.impl?.dispose?.(); } catch (err) { /* ignore */ } }
}

/**
 * 关卡版面背景工厂：3D 舞台优先（首次 setMode 时构造），失败/无 WebGL 时回退 Canvas 2D 绘卷。
 * 两者共享同一套 setMode/update/draw API（draw 对 3D 忽略 ctx 参数）。
 * @param {HTMLCanvasElement} canvas2d 版面 canvas（2D）
 * @param {HTMLCanvasElement|null} [canvas3d] 版面 3D canvas
 */
export function createPlayfieldBackground(canvas2d, canvas3d) {
  return new AdaptivePlayfieldBackground(canvas2d, canvas3d);
}
