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
 * 自适应版面背景：首次使用时才构造 3D 舞台（避免启动期双 WebGL 上下文/隐藏画布问题）。
 * 3D 构造/场景构建/运行期 draw/update 异常/WebGL context lost 时自动销毁 3D 并回退 Canvas 2D 绘卷。
 * 对外保持 setMode/update/draw 契约；`factories` 仅供测试注入。
 */
export class AdaptivePlayfieldBackground {
  constructor(canvas2d, canvas3d, factories = {}) {
    this.canvas2d = canvas2d;
    this.canvas3d = canvas3d;
    this.impl = null;
    this.is3D = false;
    this._mode = null;
    this._drawFails = 0;
    this._updateFails = 0;
    this._force2d = typeof location !== 'undefined' && /[?&]bg2d=1/.test(location.search);
    this._factories = factories || {};
    // 自测钩子（只读；不影响运行）：便于外部读取 3D/2D 状态与渲染统计
    if (typeof window !== 'undefined') window.__playfieldBg = this;
  }

  _hide3dCanvas() {
    if (!this.canvas3d) return;
    this.canvas3d.hidden = true;
    try { this.canvas3d.style.display = 'none'; } catch (err) { /* fake canvas */ }
  }

  _make3d() {
    return this._factories.create3D
      ? this._factories.create3D(this.canvas3d)
      : new PlayfieldStage3D(this.canvas3d);
  }

  _make2d() {
    return this._factories.create2D ? this._factories.create2D() : new PlayfieldBackground();
  }

  _ensure(mode) {
    if (this.impl) return;
    const can3D = !this._force2d && this.canvas3d && (this._factories.create3D || getThree());
    if (can3D) {
      try {
        const bg = this._make3d();
        // WebGL context lost 时立即切 2D，避免背景永久黑屏（Android 退后台/内存压力会触发）
        bg.onContextLost = () => this._fallback2d('webglcontextlost');
        bg.setMode(mode || 's1_mid', { transition: false });
        if (bg.sceneReady !== false) {
          this.impl = bg;
          this.is3D = true;
          if (this.canvas3d) {
            this.canvas3d.hidden = false;
            this.canvas3d.style.display = 'block';
          }
          return;
        }
        console.warn('[playfield3d] scene not ready at init, fallback 2D');
        bg.dispose?.();
      } catch (err) {
        console.warn('[playfield3d] init failed, fallback 2D:', err);
      }
    }
    this._hide3dCanvas();
    this.impl = this._make2d();
    this.is3D = false;
  }

  setMode(mode, opts = {}) {
    this._mode = mode;
    this._ensure(mode);
    try {
      this.impl.setMode(mode, opts);
    } catch (err) {
      console.warn('[playfield3d] setMode failed, fallback 2D:', err);
      this._fallback2d('setMode threw');
      try {
        this.impl.setMode(mode, opts);
      } catch (err2) {
        console.warn('[playfield3d] 2D setMode also failed:', err2);
      }
    }
    // 3D 场景构建失败（未 throw 但未 ready）也回退
    if (this.is3D && this.impl.sceneReady === false) {
      console.warn('[playfield3d] scene failed after setMode, fallback 2D');
      this._fallback2d('scene not ready');
      try {
        this.impl.setMode(mode, opts);
      } catch (err) {
        console.warn('[playfield3d] 2D setMode failed:', err);
      }
    }
  }

  _fallback2d(reason = 'unknown') {
    if (!this.is3D) return;
    console.warn('[playfield3d] fallback to 2D:', reason);
    const old = this.impl;
    this.impl = null;
    this.is3D = false;
    this._drawFails = 0;
    this._updateFails = 0;
    if (old) {
      old.onContextLost = null;
      try { old.dispose?.(); } catch (err) { /* ignore */ }
    }
    this._hide3dCanvas();
    this.impl = this._make2d();
    if (this._mode) {
      try { this.impl.setMode(this._mode, { transition: false }); } catch (err) {
        console.warn('[playfield3d] 2D recover setMode failed:', err);
      }
    }
  }

  update(dt) {
    if (!this.impl) return;
    try {
      this.impl.update?.(dt);
      this._updateFails = 0;
    } catch (err) {
      if (!this.is3D) return;
      this._updateFails += 1;
      console.warn('[playfield3d] update failed:', err);
      if (this._updateFails >= 2) this._fallback2d('update threw');
    }
  }

  draw(ctx) {
    if (!this.impl) return;
    try {
      this.impl.draw?.(ctx);
      this._drawFails = 0;
    } catch (err) {
      if (!this.is3D) {
        console.warn('[playfield] 2D draw failed:', err);
        return;
      }
      this._drawFails += 1;
      console.warn('[playfield3d] draw failed:', err);
      if (this._drawFails >= 2) {
        this._fallback2d('draw threw');
        try { this.impl.draw?.(ctx); } catch (err2) { console.warn('[playfield] 2D draw failed:', err2); }
      }
    }
  }

  dispose() {
    if (this.impl) {
      this.impl.onContextLost = null;
      try { this.impl.dispose?.(); } catch (err) { /* ignore */ }
    }
    this.impl = null;
  }
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
