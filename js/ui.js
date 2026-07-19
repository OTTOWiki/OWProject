import {
  MANUAL_CHAPTERS, displayKey, DEFAULT_KEYS, DEFAULT_SETTINGS,
  DIFFICULTIES, DIFFICULTY_ORDER,
  PLAYER_BULLET_OPACITY_MIN,
  FPS_LIMIT_MIN, FPS_LIMIT_CAP, FPS_SLIDER_UNLIMITED,
} from './config.js';
import {
  loadKeys, saveKeys, loadSettings, saveSettings,
  normalizeFpsLimit, fpsLimitToSlider, sliderToFpsLimit,
} from './storage.js';
import { stageSelectEntries, buildChapterList } from './stages/index.js';
import { stageSelectStartMode, isExtraRestrictedMode, extraDifficultyIds } from './startMode.js';
import {
  handleListKey,
  handleStageGridKey,
  handleFormListKey,
  handleManualKey,
  adjustFocusItem,
  activateFocusItem,
  clampIndex,
  highlightButtons,
} from './menuNav.js';
import { HistoryScreen } from './historyScreen.js';

export class UI {
  constructor({ onStartGame, onSettingsChange, audio }) {
    this.onStartGame = onStartGame;
    this.onSettingsChange = onSettingsChange || null;
    this.audio = audio;
    this.menuIndex = 0;
    this.pendingStart = null;
    this.pendingDifficulty = 'normal';
    this.binding = null;
    this.diffIndex = 1;
    this.playerIndex = 0;
    this.stageIndex = 0;
    this.manualIndex = 1;
    this.practiceIndex = 0;
    this.settingsIndex = 0;
    /** 从暂停菜单进入设置时的返回回调 */
    this.settingsReturn = null;
    this._fpsLastLimited = 60;

    this.screens = {
      menu: document.getElementById('screen-menu'),
      difficulty: document.getElementById('screen-difficulty'),
      player: document.getElementById('screen-player-select'),
      stage: document.getElementById('screen-stage-select'),
      practice: document.getElementById('screen-practice'),
      settings: document.getElementById('screen-settings'),
      manual: document.getElementById('screen-manual'),
      history: document.getElementById('screen-history'),
      game: document.getElementById('screen-game'),
    };

    this.history = new HistoryScreen({
      audio,
      isActive: () => !!this.screens.history?.classList.contains('active'),
      onBack: () => this._action('back'),
    });

    this._navHandlers = this._buildNavHandlers();

    this._initManual();
    this._initStageGrid();
    this._initPractice();
    this._initDifficulty();
    this._initKeys();
    this._initSettings();
    this._bindClicks();
    this._bindKeyboardNav();
    this.refreshKeyLabels();
  }

  _sfx(name) {
    this.audio.sfx(name);
  }

  _activeScreenName() {
    for (const [name, el] of Object.entries(this.screens)) {
      if (el?.classList.contains('active')) return name;
    }
    return null;
  }

  _buildNavHandlers() {
    return {
      menu: (e) => {
        const list = [...document.querySelectorAll('#main-menu-nav .menu-btn')];
        handleListKey(e, {
          count: list.length,
          index: this.menuIndex,
          setIndex: (i) => { this.menuIndex = i; },
          highlight: () => this._highlightMenu(list),
          onConfirm: () => list[this.menuIndex]?.click(),
        });
      },
      difficulty: (e) => {
        const items = this._diffItems();
        handleListKey(e, {
          count: items.length,
          index: this.diffIndex,
          setIndex: (i) => { this.diffIndex = i; },
          highlight: () => this._highlightDiff(),
          onConfirm: () => items[this.diffIndex]?.el?.click(),
          onBack: () => this._action('back'),
        });
      },
      player: (e) => {
        const items = this._playerItems();
        handleListKey(e, {
          count: items.length,
          index: this.playerIndex,
          setIndex: (i) => { this.playerIndex = i; },
          highlight: () => this._highlightPlayer(),
          onConfirm: () => items[this.playerIndex]?.el?.click(),
          onBack: () => this._action('back-diff'),
        });
      },
      stage: (e) => {
        const items = this._stageItems();
        handleStageGridKey(e, {
          items,
          index: this.stageIndex,
          setIndex: (i) => { this.stageIndex = i; },
          highlight: () => this._highlightStage(),
          onConfirm: () => items[this.stageIndex]?.el?.click(),
          onBack: () => this._action('back'),
          gridEl: document.getElementById('stage-grid'),
        });
      },
      practice: (e) => {
        const items = this._practiceItems();
        handleFormListKey(e, {
          mode: 'practice',
          items,
          index: this.practiceIndex,
          setIndex: (i) => { this.practiceIndex = i; },
          highlight: () => this._highlightPractice(),
          adjustItem: (item, dir, mods) => this._adjustFocusItem(item, dir, mods),
          activateItem: (item) => this._activateFocusItem(item),
          onBack: () => this._action('back'),
        });
      },
      settings: (e) => {
        const items = this._settingsItems();
        handleFormListKey(e, {
          mode: 'settings',
          items,
          index: this.settingsIndex,
          setIndex: (i) => { this.settingsIndex = i; },
          highlight: () => this._highlightSettings(),
          adjustItem: (item, dir, mods) => this._adjustFocusItem(item, dir, mods),
          activateItem: (item) => this._activateFocusItem(item),
          onBack: () => {
            this.binding = null;
            document.querySelectorAll('.key-row').forEach((r) => r.classList.remove('listening'));
            this._action('back');
          },
        });
      },
      manual: (e) => {
        const items = this._manualItems();
        handleManualKey(e, {
          items,
          index: this.manualIndex,
          setIndex: (i) => { this.manualIndex = i; },
          highlight: () => this._highlightManual(),
          onBack: () => this._action('back'),
        });
      },
      history: (e) => this.history.handleKey(e),
    };
  }

  _initManual() {
    const el = document.getElementById('manual-body');
    el.innerHTML = MANUAL_CHAPTERS.map((ch) => {
      const body = ch.body
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      return `<section class="manual-chapter"><h3>${ch.title}</h3><p>${body}</p></section>`;
    }).join('');
  }

  _isExtraStart() {
    return isExtraRestrictedMode(this.pendingStart?.mode);
  }

  _extraStartChapter() {
    const ex = stageSelectEntries().find((e) => e.id === 'EX');
    return ex?.startChapter ?? 1;
  }

  _availableDifficulties() {
    if (this._isExtraStart()) return extraDifficultyIds(DIFFICULTY_ORDER);
    return DIFFICULTY_ORDER;
  }

  _initDifficulty() {
    this._rebuildDifficulty();
  }

  _rebuildDifficulty() {
    const list = document.getElementById('diff-list');
    list.innerHTML = '';
    const avail = this._availableDifficulties();
    if (this._isExtraStart()) {
      this.pendingDifficulty = 'extra';
    }
    avail.forEach((id, i) => {
      const d = DIFFICULTIES[id];
      const btn = document.createElement('button');
      btn.className = 'diff-btn';
      btn.dataset.diff = id;
      btn.style.setProperty('--diff-color', d.color);
      btn.innerHTML = `
        <div class="diff-rank" style="color:${d.color}">${d.rank}</div>
        <div class="diff-name">${d.name}</div>
        <div class="diff-desc">${d.desc}</div>
        <div class="diff-meta">残机 ${d.startLives} · Bomb ${d.startBombs} · 得分×${d.scoreMul}</div>
      `;
      btn.addEventListener('click', () => {
        this._sfx('ok');
        this.pendingDifficulty = id;
        this.diffIndex = i;
        this._highlightDiff();
        this.show('player');
      });
      list.appendChild(btn);
    });
    const di = avail.indexOf(this.pendingDifficulty);
    if (di >= 0) this.diffIndex = di;
    this._highlightDiff();
  }

  _diffItems() {
    const diffs = [...document.querySelectorAll('#diff-list .diff-btn')];
    const back = document.querySelector('#screen-difficulty [data-action="back"]');
    const items = diffs.map((el) => ({ type: 'diff', el }));
    if (back) items.push({ type: 'button', el: back });
    return items;
  }

  _highlightDiff() {
    const items = this._diffItems();
    if (!items.length) return;
    this.diffIndex = clampIndex(this.diffIndex, items.length);
    items.forEach((it, i) => it.el.classList.toggle('selected', i === this.diffIndex));
    items[this.diffIndex]?.el?.scrollIntoView?.({ block: 'nearest' });
  }

  _playerItems() {
    const cards = [...document.querySelectorAll('#screen-player-select .player-card')];
    const back = document.querySelector('#screen-player-select [data-action="back-diff"]');
    const items = cards.map((el) => ({ type: 'card', el }));
    if (back) items.push({ type: 'button', el: back });
    return items;
  }

  _stageItems() {
    const stages = [...document.querySelectorAll('#stage-grid .stage-btn')];
    const back = document.querySelector('#screen-stage-select [data-action="back"]');
    const items = stages.map((el) => ({ type: 'stage', el }));
    if (back) items.push({ type: 'button', el: back });
    return items;
  }

  _manualItems() {
    const body = document.getElementById('manual-body');
    const back = document.querySelector('#screen-manual [data-action="back"]');
    const items = [];
    if (body) items.push({ type: 'scroll', el: body });
    if (back) items.push({ type: 'button', el: back });
    return items;
  }

  _highlightManual() {
    const items = this._manualItems();
    if (!items.length) return;
    this.manualIndex = clampIndex(this.manualIndex, items.length);
    items.forEach((it, i) => {
      const on = i === this.manualIndex;
      if (it.type === 'button') it.el.classList.toggle('selected', on);
      else it.el.classList.toggle('kb-focus', on);
    });
  }

  _initStageGrid() {
    const grid = document.getElementById('stage-grid');
    grid.innerHTML = '';
    for (const s of stageSelectEntries()) {
      const btn = document.createElement('button');
      btn.className = 'stage-btn';
      btn.dataset.stage = s.id;
      btn.dataset.start = s.startChapter;
      btn.innerHTML = `<strong>${s.label}</strong><small>${s.desc}</small>`;
      btn.addEventListener('click', () => {
        this._sfx('ok');
        // EX 与 Extra Start 同限：Hard/Lunatic only（靠 mode === 'extra'）
        this.pendingStart = {
          startChapter: s.startChapter,
          mode: stageSelectStartMode(s.id),
        };
        this.show('difficulty');
      });
      grid.appendChild(btn);
    }
  }

  _initPractice() {
    const sel = document.getElementById('practice-chapter');
    sel.innerHTML = '';
    for (const ch of buildChapterList()) {
      const opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = `#${ch.id} ${ch.name}`;
      sel.appendChild(opt);
    }
    const unstableCb = document.getElementById('practice-unstable');
    const unstableVal = document.getElementById('practice-unstable-val');
    const syncUnstableLabel = () => {
      if (unstableVal) unstableVal.textContent = unstableCb?.checked ? '开启' : '关闭';
    };
    unstableCb?.addEventListener('change', syncUnstableLabel);
    syncUnstableLabel();
  }

  _initKeys() {
    document.querySelectorAll('.key-row').forEach((row) => {
      row.addEventListener('click', () => {
        if (!this.screens.settings?.classList.contains('active')) return;
        this.binding = row.dataset.bind;
        document.querySelectorAll('.key-row').forEach((r) => r.classList.remove('listening'));
        row.classList.add('listening');
      });
    });
    window.addEventListener('keydown', (e) => {
      if (!this.binding || !this.screens.settings?.classList.contains('active')) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        document.querySelectorAll('.key-row').forEach((r) => r.classList.remove('listening'));
        this.binding = null;
        this._sfx('cancel');
        return;
      }
      const keys = loadKeys();
      keys[this.binding] = e.code;
      saveKeys(keys);
      this.refreshKeyLabels();
      document.querySelectorAll('.key-row').forEach((r) => r.classList.remove('listening'));
      this.binding = null;
      this._sfx('ok');
    }, true);
  }

  refreshKeyLabels() {
    const keys = loadKeys();
    document.getElementById('key-shot').textContent = displayKey(keys.shot);
    document.getElementById('key-bomb').textContent = displayKey(keys.bomb);
    document.getElementById('key-item').textContent = displayKey(keys.item);
  }

  _adjustFpsSetting(dir, mods = {}) {
    const fps = document.getElementById('set-fps-limit');
    if (!fps) return;
    const step = mods.shiftKey ? 1 : 5;
    let cur = sliderToFpsLimit(fps.value);
    if (cur <= 0) cur = this._fpsLastLimited || 60;
    const next = Math.max(FPS_LIMIT_MIN, Math.min(FPS_LIMIT_CAP, cur + dir * step));
    fps.value = String(next);
    this._commitSettingsForm?.();
  }

  _toggleFpsUnlimited() {
    const fps = document.getElementById('set-fps-limit');
    if (!fps) return;
    const cur = sliderToFpsLimit(fps.value);
    if (cur <= 0) {
      const back = this._fpsLastLimited || 60;
      fps.value = String(Math.max(FPS_LIMIT_MIN, Math.min(FPS_LIMIT_CAP, back)));
    } else {
      this._fpsLastLimited = cur;
      fps.value = String(FPS_SLIDER_UNLIMITED);
    }
    this._sfx('ok');
    this._commitSettingsForm?.();
  }

  _initSettings() {
    const vol = document.getElementById('set-music-volume');
    const op = document.getElementById('set-bullet-opacity');
    const toggle = document.getElementById('set-shot-toggle');
    const fps = document.getElementById('set-fps-limit');
    if (!vol || !op || !toggle || !fps) return;

    const opMinPct = Math.round(PLAYER_BULLET_OPACITY_MIN * 100);
    op.min = String(opMinPct);

    fps.min = String(FPS_LIMIT_MIN);
    fps.max = String(FPS_SLIDER_UNLIMITED);
    fps.step = '1';

    const fpsLabel = (limit) => {
      const n = normalizeFpsLimit(limit, 0);
      if (n <= 0) return '无限制';
      return `${n} FPS`;
    };

    const syncFpsUi = (s) => {
      const limit = normalizeFpsLimit(s.fpsLimit, 0);
      fps.value = String(fpsLimitToSlider(limit));
      if (limit > 0) this._fpsLastLimited = limit;
      const lab = document.getElementById('set-fps-limit-val');
      if (lab) lab.textContent = fpsLabel(limit);
    };

    const syncLabels = (s) => {
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
      syncFpsUi(s);
    };

    this._refreshSettingsForm = () => syncLabels(loadSettings());
    this._refreshSettingsForm();

    const commit = () => {
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
      syncLabels(next);
      this.onSettingsChange?.(next);
    };
    this._commitSettingsForm = commit;

    vol.addEventListener('input', commit);
    op.addEventListener('input', commit);
    toggle.addEventListener('change', commit);

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
      commit();
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
        commit();
        return;
      }
      if (Number(fps.value) >= FPS_LIMIT_CAP) {
        e.preventDefault();
        fps.value = String(FPS_LIMIT_CAP);
      }
    });
  }

  refreshSettingsForm() {
    this._refreshSettingsForm?.();
  }

  openSettingsFromPause(onBack) {
    this.settingsReturn = typeof onBack === 'function' ? onBack : null;
    this.refreshSettingsForm();
    this.refreshKeyLabels();
    this.show('settings');
  }

  _bindClicks() {
    document.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => this._action(btn.dataset.action));
    });
    document.querySelectorAll('.player-card').forEach((card) => {
      card.addEventListener('click', () => {
        this._sfx('ok');
        const playerId = card.dataset.player;
        const start = this.pendingStart || { startChapter: 1, mode: 'story' };
        this.showGame();
        this.onStartGame({
          playerId,
          startChapter: start.startChapter,
          mode: start.mode,
          lives: start.lives,
          unstable: start.unstable,
          singleChapter: start.singleChapter,
          difficulty: this.pendingDifficulty || 'normal',
        });
      });
    });
  }

  _action(action) {
    // 返回类只播 cancel；确认/进入类播 ok（避免 back 叠两声）
    const isCancel = action === 'back' || action === 'back-diff';
    this._sfx(isCancel ? 'cancel' : 'ok');

    if (action === 'start') {
      this.pendingStart = { startChapter: 1, mode: 'story' };
      this.show('difficulty');
    } else if (action === 'extra-start') {
      this.pendingStart = { startChapter: this._extraStartChapter(), mode: 'extra' };
      this.show('difficulty');
    } else if (action === 'stage-select') {
      this.show('stage');
    } else if (action === 'manual') {
      this.show('manual');
    } else if (action === 'history') {
      this.show('history');
      this.history.load();
    } else if (action === 'history-refresh') {
      this.history.load(true);
    } else if (action === 'settings' || action === 'key-config') {
      this.settingsReturn = null;
      this.binding = null;
      document.querySelectorAll('.key-row').forEach((r) => r.classList.remove('listening'));
      this.refreshSettingsForm();
      this.refreshKeyLabels();
      this.show('settings');
    } else if (action === 'practice') {
      this.show('practice');
    } else if (action === 'practice-start') {
      const ch = Number(document.getElementById('practice-chapter').value);
      const rawLives = Number(document.getElementById('practice-lives').value);
      // 练习残机不封顶（仅下限 0）；空/非法回落 2
      const lives = Number.isFinite(rawLives) ? Math.max(0, Math.floor(rawLives)) : 2;
      const unstable = document.getElementById('practice-unstable').checked;
      this.pendingStart = {
        startChapter: ch,
        mode: 'practice',
        lives,
        unstable,
        singleChapter: true,
      };
      this.show('difficulty');
    } else if (action === 'settings-reset') {
      const next = saveSettings({ ...DEFAULT_SETTINGS });
      this.refreshSettingsForm();
      this.onSettingsChange?.(next);
      saveKeys({ ...DEFAULT_KEYS });
      this.refreshKeyLabels();
    } else if (action === 'exit') {
      if (confirm('确定退出 OTTOWiki Project？')) {
        window.close();
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0c10;color:#c9b896;font-family:serif">已退出 · 可关闭标签页</div>';
      }
    } else if (action === 'back') {
      if (this.settingsReturn) {
        const cb = this.settingsReturn;
        this.settingsReturn = null;
        cb();
      } else {
        this.show('menu');
      }
    } else if (action === 'back-diff') {
      this.show('difficulty');
    }
  }

  _practiceItems() {
    return [
      { type: 'select', el: document.getElementById('practice-chapter'), wrap: null },
      // max: null = 左右调值不封顶（练习可自定义任意残机）
      { type: 'number', el: document.getElementById('practice-lives'), min: 0, max: null, wrap: null },
      { type: 'checkbox', el: document.getElementById('practice-unstable'), wrap: null },
      { type: 'button', el: document.querySelector('#screen-practice [data-action="practice-start"]') },
      { type: 'button', el: document.querySelector('#screen-practice [data-action="back"]') },
    ].filter((it) => it.el).map((it) => {
      if (it.type !== 'button') {
        it.wrap = it.el.closest('.settings-row') || it.el.closest('label') || it.el;
      }
      return it;
    });
  }

  _settingsItems() {
    return [
      { type: 'range', el: document.getElementById('set-music-volume'), wrap: null },
      { type: 'range', el: document.getElementById('set-bullet-opacity'), wrap: null },
      { type: 'fps', el: document.getElementById('set-fps-limit'), wrap: null },
      { type: 'checkbox', el: document.getElementById('set-shot-toggle'), wrap: null },
      { type: 'keybind', el: document.querySelector('#key-list .key-row[data-bind="shot"]') },
      { type: 'keybind', el: document.querySelector('#key-list .key-row[data-bind="bomb"]') },
      { type: 'keybind', el: document.querySelector('#key-list .key-row[data-bind="item"]') },
      { type: 'button', el: document.querySelector('#screen-settings [data-action="settings-reset"]') },
      { type: 'button', el: document.querySelector('#screen-settings [data-action="back"]') },
    ].filter((it) => it.el).map((it) => {
      if (it.type === 'range' || it.type === 'checkbox' || it.type === 'fps') {
        it.wrap = it.el.closest('.settings-row') || it.el.closest('label') || it.el;
      }
      return it;
    });
  }

  _highlightPractice() {
    const items = this._practiceItems();
    if (!items.length) return;
    this.practiceIndex = clampIndex(this.practiceIndex, items.length);
    items.forEach((it, i) => {
      const on = i === this.practiceIndex;
      it.el.classList.toggle('selected', on && (it.type === 'button' || it.type === 'keybind'));
      it.wrap?.classList.toggle('selected', on);
    });
    const cur = items[this.practiceIndex];
    (cur?.wrap || cur?.el)?.scrollIntoView?.({ block: 'nearest' });
  }

  _highlightSettings() {
    const items = this._settingsItems();
    if (!items.length) return;
    this.settingsIndex = clampIndex(this.settingsIndex, items.length);
    items.forEach((it, i) => {
      const on = i === this.settingsIndex;
      if (it.type === 'button' || it.type === 'keybind') {
        it.el.classList.toggle('selected', on);
      }
      it.wrap?.classList.toggle('selected', on);
    });
    const cur = items[this.settingsIndex];
    (cur?.wrap || cur?.el)?.scrollIntoView?.({ block: 'nearest' });
  }

  _adjustFocusItem(item, dir, mods = {}) {
    return adjustFocusItem(item, dir, mods, {
      sfx: (n) => this._sfx(n),
      adjustFps: (d, m) => this._adjustFpsSetting(d, m),
    });
  }

  _activateFocusItem(item) {
    activateFocusItem(item, {
      sfx: (n) => this._sfx(n),
      toggleFps: () => this._toggleFpsUnlimited(),
    });
  }

  _bindKeyboardNav() {
    window.addEventListener('keydown', (e) => {
      if (this.screens.game?.classList.contains('active')) return;
      if (this.binding && this.screens.settings?.classList.contains('active')) return;
      const name = this._activeScreenName();
      if (!name || name === 'game') return;
      this._navHandlers[name]?.(e);
    });
    this._highlightMenu([...document.querySelectorAll('#main-menu-nav .menu-btn')]);
  }

  _highlightMenu(list) {
    highlightButtons(list, this.menuIndex);
  }

  _highlightPlayer() {
    const items = this._playerItems();
    if (!items.length) return;
    this.playerIndex = clampIndex(this.playerIndex, items.length);
    items.forEach((it, i) => it.el.classList.toggle('selected', i === this.playerIndex));
  }

  _highlightStage() {
    const items = this._stageItems();
    document.querySelectorAll('#stage-grid .stage-btn').forEach((b) => b.classList.remove('selected'));
    document.querySelector('#screen-stage-select [data-action="back"]')
      ?.classList.remove('selected');
    if (!items.length) return;
    this.stageIndex = clampIndex(this.stageIndex, items.length);
    items.forEach((it, i) => it.el.classList.toggle('selected', i === this.stageIndex));
    items[this.stageIndex]?.el?.scrollIntoView?.({ block: 'nearest' });
  }

  show(name) {
    if (name === 'difficulty') this._rebuildDifficulty();
    Object.values(this.screens).forEach((s) => s?.classList.remove('active'));
    this.screens[name]?.classList.add('active');
    if (name === 'difficulty') this._highlightDiff();
    if (name === 'player') {
      this.playerIndex = 0;
      this._highlightPlayer();
    }
    if (name === 'stage') {
      this.stageIndex = 0;
      this._highlightStage();
    }
    if (name === 'practice') {
      this.practiceIndex = 0;
      this._highlightPractice();
    }
    if (name === 'settings') {
      this.binding = null;
      document.querySelectorAll('.key-row').forEach((r) => r.classList.remove('listening'));
      this.refreshKeyLabels();
      this.settingsIndex = Math.max(0, this._settingsItems().length - 1);
      this._highlightSettings();
    }
    if (name === 'manual') {
      this.manualIndex = 1;
      this._highlightManual();
    }
    if (name === 'history') {
      this.history.resetFocus();
    }
  }

  showMenu() {
    this.show('menu');
  }

  showGame() {
    this.show('game');
  }
}
