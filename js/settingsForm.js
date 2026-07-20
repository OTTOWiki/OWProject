/**
 * 设置表单：音量 / 自机弹不透明度 / 单击发射 / FPS 上限
 * 从 ui.js 抽出（E06a）；键位绑定仍在 UI。
 */
import {
  PLAYER_BULLET_OPACITY_MIN,
  FPS_LIMIT_MIN, FPS_LIMIT_CAP, FPS_SLIDER_UNLIMITED,
} from './config.js';
import {
  loadSettings, saveSettings,
  normalizeFpsLimit, fpsLimitToSlider, sliderToFpsLimit,
} from './storage.js';

function fpsLabel(limit) {
  const n = normalizeFpsLimit(limit, 0);
  if (n <= 0) return '无限制';
  return `${n} FPS`;
}

/**
 * @param {{ onChange?: (settings: object) => void }} [opts]
 */
export class SettingsForm {
  constructor({ onChange } = {}) {
    this.onChange = onChange || null;
    /** 上次有限 FPS，供「无限制」切回 */
    this._fpsLastLimited = 60;
    this._els = null;
    this._bound = false;
  }

  /**
   * 绑定 DOM 与事件（可重复调用，第二次 no-op）
   * @returns {boolean} 控件是否齐全
   */
  init() {
    if (this._bound) return !!this._els;
    const vol = document.getElementById('set-music-volume');
    const op = document.getElementById('set-bullet-opacity');
    const toggle = document.getElementById('set-shot-toggle');
    const fps = document.getElementById('set-fps-limit');
    if (!vol || !op || !toggle || !fps) {
      this._els = null;
      return false;
    }
    this._els = { vol, op, toggle, fps };
    this._bound = true;

    const opMinPct = Math.round(PLAYER_BULLET_OPACITY_MIN * 100);
    op.min = String(opMinPct);
    fps.min = String(FPS_LIMIT_MIN);
    fps.max = String(FPS_SLIDER_UNLIMITED);
    fps.step = '1';

    this.refresh();

    vol.addEventListener('input', () => this.commit());
    op.addEventListener('input', () => this.commit());
    toggle.addEventListener('change', () => this.commit());

    // 仅指针拖到最右可设无限制；键盘加减到不了
    let fpsFromPointer = false;
    let fpsPointerDisarmTimer = 0;
    const armFpsPointer = () => {
      if (fpsPointerDisarmTimer) {
        clearTimeout(fpsPointerDisarmTimer);
        fpsPointerDisarmTimer = 0;
      }
      fpsFromPointer = true;
    };
    const scheduleDisarmFpsPointer = () => {
      if (fpsPointerDisarmTimer) clearTimeout(fpsPointerDisarmTimer);
      fpsPointerDisarmTimer = window.setTimeout(() => {
        fpsFromPointer = false;
        fpsPointerDisarmTimer = 0;
      }, 0);
    };
    fps.addEventListener('pointerdown', armFpsPointer);
    fps.addEventListener('mousedown', armFpsPointer);
    fps.addEventListener('touchstart', armFpsPointer, { passive: true });
    window.addEventListener('pointerup', scheduleDisarmFpsPointer);
    window.addEventListener('mouseup', scheduleDisarmFpsPointer);
    window.addEventListener('touchend', scheduleDisarmFpsPointer);

    const onFpsInput = () => {
      if (!fpsFromPointer && Number(fps.value) >= FPS_SLIDER_UNLIMITED) {
        fps.value = String(FPS_LIMIT_CAP);
      }
      this.commit();
    };
    fps.addEventListener('input', onFpsInput);
    fps.addEventListener('change', onFpsInput);

    fps.addEventListener('keydown', (e) => {
      const inc = e.code === 'ArrowRight' || e.code === 'ArrowUp'
        || e.code === 'PageUp' || e.code === 'End';
      if (!inc) return;
      if (e.code === 'End') {
        e.preventDefault();
        fps.value = String(FPS_LIMIT_CAP);
        this.commit();
        return;
      }
      if (Number(fps.value) >= FPS_LIMIT_CAP) {
        e.preventDefault();
        fps.value = String(FPS_LIMIT_CAP);
      }
    });

    return true;
  }

  /** 从 storage 刷新控件与标签 */
  refresh() {
    this.syncLabels(loadSettings());
  }

  /**
   * @param {object} s settings
   */
  syncLabels(s) {
    const els = this._els;
    if (!els) return;
    const { vol, op, toggle, fps } = els;
    const opMinPct = Math.round(PLAYER_BULLET_OPACITY_MIN * 100);

    const volPct = Math.round((s.musicVolume ?? 1) * 100);
    const opPct = Math.round((s.playerBulletOpacity ?? 0.3) * 100);
    vol.value = String(volPct);
    op.value = String(Math.max(opMinPct, opPct));
    toggle.checked = !!s.shotToggle;
    const volLab = document.getElementById('set-music-volume-val');
    const opLab = document.getElementById('set-bullet-opacity-val');
    const togLab = document.getElementById('set-shot-toggle-val');
    if (volLab) volLab.textContent = `${volPct}%`;
    if (opLab) opLab.textContent = `${Math.max(opMinPct, opPct)}%`;
    if (togLab) togLab.textContent = s.shotToggle ? '开启' : '关闭';

    const limit = normalizeFpsLimit(s.fpsLimit, 0);
    fps.value = String(fpsLimitToSlider(limit));
    if (limit > 0) this._fpsLastLimited = limit;
    const lab = document.getElementById('set-fps-limit-val');
    if (lab) lab.textContent = fpsLabel(limit);
  }

  /** 读控件 → saveSettings → 刷新标签 → onChange */
  commit() {
    const els = this._els;
    if (!els) return null;
    const { vol, op, toggle, fps } = els;
    const opMinPct = Math.round(PLAYER_BULLET_OPACITY_MIN * 100);

    let opVal = Number(op.value) / 100;
    if (opVal < PLAYER_BULLET_OPACITY_MIN) {
      opVal = PLAYER_BULLET_OPACITY_MIN;
      op.value = String(opMinPct);
    }
    const fpsLimit = sliderToFpsLimit(fps.value);
    if (fpsLimit > 0) this._fpsLastLimited = fpsLimit;
    const next = saveSettings({
      musicVolume: Number(vol.value) / 100,
      playerBulletOpacity: opVal,
      shotToggle: toggle.checked,
      fpsLimit,
    });
    this.syncLabels(next);
    this.onChange?.(next);
    return next;
  }

  /**
   * 键盘左右调 FPS（不到无限制档）
   * @param {number} dir -1 | 1
   * @param {{ shiftKey?: boolean }} [mods]
   */
  adjustFps(dir, mods = {}) {
    const fps = this._els?.fps || document.getElementById('set-fps-limit');
    if (!fps) return;
    const step = mods.shiftKey ? 1 : 5;
    let cur = sliderToFpsLimit(fps.value);
    if (cur <= 0) cur = this._fpsLastLimited || 60;
    const next = Math.max(FPS_LIMIT_MIN, Math.min(FPS_LIMIT_CAP, cur + dir * step));
    fps.value = String(next);
    this.commit();
  }

  /** 在「有限上限」与「无限制」之间切换 */
  toggleFpsUnlimited() {
    const fps = this._els?.fps || document.getElementById('set-fps-limit');
    if (!fps) return;
    const cur = sliderToFpsLimit(fps.value);
    if (cur <= 0) {
      const back = this._fpsLastLimited || 60;
      fps.value = String(Math.max(FPS_LIMIT_MIN, Math.min(FPS_LIMIT_CAP, back)));
    } else {
      this._fpsLastLimited = cur;
      fps.value = String(FPS_SLIDER_UNLIMITED);
    }
    this.commit();
  }
}
