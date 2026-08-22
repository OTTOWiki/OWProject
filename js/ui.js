import {
  MANUAL_CHAPTERS, displayKey, DEFAULT_KEYS, DEFAULT_SETTINGS,
  BALANCE, DIFFICULTIES, DIFFICULTY_ORDER,
} from './config.js';
import {
  loadKeys, saveKeys, saveSettings,
  loadPracticePrefs, savePracticePrefs,
  loadNomissProgress, loadPracticeBest,
} from './storage.js';
import { stageSelectEntries, practiceChapterGroups } from './stages/index.js';
import { stageSelectStartMode, isExtraRestrictedMode, extraDifficultyIds } from './startMode.js';
import {
  handleListScreen,
  handleStageGridKey,
  handleFormScreen,
  handleManualKey,
  adjustFocusItem,
  activateFocusItem,
  clampIndex,
  wrapIndex,
  highlightButtons,
} from './menuNav.js';
import { HistoryScreen } from './historyScreen.js';
import { SettingsForm } from './settingsForm.js';
import { RankingScreen } from './rankingScreen.js';
import { ReplayScreen } from './replayScreen.js';

const UI_ACTION_HANDLERS = {
  start(ui) {
    ui.pendingStart = { startChapter: 1, mode: 'story' };
    ui.show('difficulty');
  },
  'extra-start'(ui) {
    ui.pendingStart = { startChapter: ui._extraStartChapter(), mode: 'extra' };
    ui.show('difficulty');
  },
  'stage-select'(ui) {
    ui.show('stage');
  },
  manual(ui) {
    ui.show('manual');
  },
  history(ui) {
    ui.show('history');
    ui.history.load();
  },
  'history-refresh'(ui) {
    ui.history.load(true);
  },
  ranking(ui) {
    ui.show('ranking');
  },
  replay(ui) {
    ui.show('replay');
  },
  'replay-import'(ui) {
    ui.replay._importReplays();
  },
  settings(ui) {
    ui.settingsReturn = null;
    ui.binding = null;
    document.querySelectorAll('.key-row').forEach((r) => r.classList.remove('listening'));
    ui.refreshSettingsForm();
    ui.refreshKeyLabels();
    ui.show('settings');
  },
  'key-config'(ui) {
    UI_ACTION_HANDLERS.settings(ui);
  },
  practice(ui) {
    ui.show('practice');
  },
  'practice-start'(ui) {
    const rawLives = Number(document.getElementById('practice-lives').value);
    // 练习残机不封顶（仅下限 0）；空/非法回落 2
    const lives = Number.isFinite(rawLives) ? Math.max(0, Math.floor(rawLives)) : 2;
    const unstable = document.getElementById('practice-unstable').checked;
    ui.pendingStart = {
      startChapter: ui.practiceChapterId,
      mode: 'practice',
      lives,
      unstable,
      singleChapter: true,
    };
    ui.pendingDifficulty = ui.practiceDiffId;
    ui.show('player');
  },
  'settings-reset'(ui) {
    const next = saveSettings({ ...DEFAULT_SETTINGS });
    ui.refreshSettingsForm();
    ui.onSettingsChange?.(next);
    saveKeys({ ...DEFAULT_KEYS });
    ui.refreshKeyLabels();
  },
  exit(ui) {
    if (confirm('确定退出 OTTOWiki Project？')) {
      window.close();
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0c10;color:#c9b896;font-family:serif">已退出 · 可关闭标签页</div>';
    }
  },
  back(ui) {
    if (ui.settingsReturn) {
      const cb = ui.settingsReturn;
      ui.settingsReturn = null;
      cb();
    } else {
      ui.show('menu');
    }
  },
  'back-diff'(ui) {
    // 练习难度内联在练习页，返回直接回练习屏
    if (ui.pendingStart?.mode === 'practice') {
      ui.show('practice');
    } else {
      ui.show('difficulty');
    }
  },
};

export class UI {
  constructor({ onStartGame, onSettingsChange, audio, onPlayReplay }) {
    this.onStartGame = onStartGame;
    this.onSettingsChange = onSettingsChange || null;
    this.onPlayReplay = onPlayReplay || null;
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
    /** 练习：所选章节 id（默认第 1 章） */
    this.practiceChapterId = 1;
    /** 练习：所选难度 id（DIFFICULTIES，默认 normal） */
    this.practiceDiffId = 'normal';
    /** 从暂停菜单进入设置时的返回回调 */
    this.settingsReturn = null;
    this.settingsForm = new SettingsForm({
      onChange: (s) => this.onSettingsChange?.(s),
    });

    this.screens = {
      menu: document.getElementById('screen-menu'),
      difficulty: document.getElementById('screen-difficulty'),
      player: document.getElementById('screen-player-select'),
      stage: document.getElementById('screen-stage-select'),
      practice: document.getElementById('screen-practice'),
      settings: document.getElementById('screen-settings'),
      manual: document.getElementById('screen-manual'),
      history: document.getElementById('screen-history'),
      ranking: document.getElementById('screen-ranking'),
      replay: document.getElementById('screen-replay'),
      game: document.getElementById('screen-game'),
    };

    this.history = new HistoryScreen({
      audio,
      isActive: () => !!this.screens.history?.classList.contains('active'),
      onBack: () => this._action('back'),
    });

    this.ranking = new RankingScreen({
      audio,
      isActive: () => !!this.screens.ranking?.classList.contains('active'),
      onBack: () => this._action('back'),
    });

    this.replay = new ReplayScreen({
      audio,
      isActive: () => !!this.screens.replay?.classList.contains('active'),
      onBack: () => this._action('back'),
      onPlay: (replayId) => this.onPlayReplay?.(replayId),
    });

    this._navHandlers = this._buildNavHandlers();

    this._initManual();
    this._initStageGrid();
    this._initPractice();
    this._initDifficulty();
    this._initKeys();
    this.settingsForm.init();
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

  /**
   * 屏描述符 → keydown。
   * 列表：handleListScreen；表单：handleFormScreen。
   */
  _buildNavHandlers() {
    return {
      menu: (e) => handleListScreen(e, {
        getItems: () => [...document.querySelectorAll('#main-menu-nav .menu-btn')],
        index: this.menuIndex,
        setIndex: (i) => { this.menuIndex = i; },
        highlight: (list) => this._highlightMenu(list),
      }),
      difficulty: (e) => handleListScreen(e, {
        getItems: () => this._diffItems(),
        index: this.diffIndex,
        setIndex: (i) => { this.diffIndex = i; },
        highlight: () => this._highlightDiff(),
        onBack: () => this._action('back'),
      }),
      player: (e) => handleListScreen(e, {
        getItems: () => this._playerItems(),
        index: this.playerIndex,
        setIndex: (i) => { this.playerIndex = i; },
        highlight: () => this._highlightPlayer(),
        onBack: () => this._action('back-diff'),
      }),
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
      practice: (e) => handleFormScreen(e, {
        mode: 'practice',
        getItems: () => this._practiceItems(),
        index: this.practiceIndex,
        setIndex: (i) => { this.practiceIndex = i; },
        highlight: () => this._highlightPractice(),
        adjustItem: (item, dir, mods) => this._adjustFocusItem(item, dir, mods),
        activateItem: (item) => this._activateFocusItem(item),
        onBack: () => this._action('back'),
      }),
      settings: (e) => handleFormScreen(e, {
        mode: 'settings',
        getItems: () => this._settingsItems(),
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
      }),
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
      ranking: (e) => this.ranking.handleKey(e),
      replay: (e) => this.replay.handleKey(e),
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
        <div class="diff-meta">残机 ${BALANCE.startLives} · Bomb ${BALANCE.startBombs} · 得分×${d.scoreMul}</div>
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
    const nomiss = document.getElementById('player-nomiss');
    const back = document.querySelector('#screen-player-select [data-action="back-diff"]');
    const items = cards.map((el) => ({ type: 'card', el }));
    if (nomiss && !document.getElementById('player-nomiss-row')?.classList.contains('hidden')) {
      items.push({
        type: 'checkbox',
        el: nomiss,
        wrap: document.getElementById('player-nomiss-row'),
      });
    }
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
    this._practiceStages = practiceChapterGroups();
    this._practiceStageKeys = this._practiceStages.map((g) => String(g.chapters[0].stageKey));

    const diffBox = document.getElementById('practice-diffs');
    if (diffBox) {
      diffBox.innerHTML = '';
      for (const id of DIFFICULTY_ORDER) {
        const d = DIFFICULTIES[id];
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'ptab';
        tab.dataset.diff = id;
        tab.role = 'radio';
        tab.setAttribute('aria-checked', 'false');
        tab.style.setProperty('--dc', d.color);
        tab.textContent = `${d.rank} ${d.name}`;
        tab.addEventListener('click', () => this._selectPracticeDiff(id));
        diffBox.appendChild(tab);
      }
    }
    const stageBox = document.getElementById('practice-stages');
    if (stageBox) {
      stageBox.innerHTML = '';
      this._practiceStages.forEach((g, i) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'ptab';
        chip.dataset.stage = this._practiceStageKeys[i];
        chip.role = 'radio';
        chip.setAttribute('aria-checked', 'false');
        chip.textContent = g.label;
        chip.addEventListener('click', () => this._selectPracticeStage(this._practiceStageKeys[i]));
        stageBox.appendChild(chip);
      });
    }
    this._restorePracticePrefs();
    this._rebuildPracticeChapters();
    const unstableCb = document.getElementById('practice-unstable');
    const unstableVal = document.getElementById('practice-unstable-val');
    const syncUnstableLabel = () => {
      if (unstableVal) unstableVal.textContent = unstableCb?.checked ? '开启' : '关闭';
    };
    unstableCb?.addEventListener('change', syncUnstableLabel);
    syncUnstableLabel();
    this._refreshPracticeChapter();
    this._refreshPracticeStage();
    this._refreshPracticeDiff();
  }

  /** 恢复上次选择（难度/关卡/章节）；无存档或数据失效回落默认 */
  _restorePracticePrefs() {
    this.practiceDiffId = 'normal';
    this.practiceStageKey = this._practiceStageKeys[0] ?? null;
    this.practiceChapterId = this._practiceStages[0]?.chapters[0]?.id ?? 1;
    const prefs = loadPracticePrefs();
    if (!prefs) return;
    if (DIFFICULTY_ORDER.includes(prefs.diff)) this.practiceDiffId = prefs.diff;
    const stageIdx = this._practiceStages.findIndex((g) => g.chapters.some((c) => c.id === prefs.chapter));
    if (stageIdx >= 0) {
      this.practiceStageKey = this._practiceStageKeys[stageIdx];
      this.practiceChapterId = prefs.chapter;
    }
  }

  /** 只渲染当前关卡的章节列表（短列表，无需整表滚动） */
  _rebuildPracticeChapters() {
    const list = document.getElementById('practice-chapter-list');
    if (!list) return;
    list.innerHTML = '';
    const stage = this._practiceStages.find(
      (g) => String(g.chapters[0].stageKey) === this.practiceStageKey,
    ) || this._practiceStages[0];
    for (const ch of stage?.chapters || []) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pc-item';
      btn.dataset.id = ch.id;
      btn.role = 'option';
      btn.setAttribute('aria-selected', 'false');
      btn.innerHTML = `#${ch.id} ${ch.name}<span class="pc-best"></span>`;
      btn.addEventListener('click', () => this._selectPracticeChapter(ch.id));
      list.appendChild(btn);
    }
    this._refreshPracticeBests();
  }

  _practiceChapterIds() {
    return [...document.querySelectorAll('#practice-chapter-list .pc-item')].map((b) => Number(b.dataset.id));
  }

  _selectPracticeStage(key) {
    this.practiceStageKey = key;
    const stage = this._practiceStages.find((g) => String(g.chapters[0].stageKey) === key);
    this.practiceChapterId = stage?.chapters[0]?.id ?? this.practiceChapterId;
    this._rebuildPracticeChapters();
    this._refreshPracticeChapter();
    this._refreshPracticeStage();
    this._savePracticePrefs();
    this._sfx('ok');
  }

  _cyclePracticeStage(dir) {
    const keys = this._practiceStageKeys;
    if (!keys.length) return;
    const i = keys.indexOf(this.practiceStageKey);
    this._selectPracticeStage(keys[wrapIndex(i < 0 ? 0 : i + dir, keys.length)]);
  }

  _refreshPracticeStage() {
    document.querySelectorAll('#practice-stages .ptab').forEach((b) => {
      const isSelected = b.dataset.stage === this.practiceStageKey;
      b.classList.toggle('selected', isSelected);
      b.setAttribute('aria-checked', String(isSelected));
    });
  }

  _selectPracticeChapter(id) {
    this.practiceChapterId = Number(id);
    this._refreshPracticeChapter();
    this._savePracticePrefs();
    this._sfx('ok');
  }

  _cyclePracticeChapter(dir) {
    const ids = this._practiceChapterIds();
    if (!ids.length) return;
    const i = ids.indexOf(this.practiceChapterId);
    this.practiceChapterId = ids[wrapIndex(i < 0 ? 0 : i + dir, ids.length)];
    this._refreshPracticeChapter();
    this._savePracticePrefs();
    this._sfx('ok');
  }

  _refreshPracticeChapter() {
    document.querySelectorAll('#practice-chapter-list .pc-item').forEach((b) => {
      const isSelected = Number(b.dataset.id) === this.practiceChapterId;
      b.classList.toggle('selected', isSelected);
      b.setAttribute('aria-selected', String(isSelected));
    });
    document.querySelector(`#practice-chapter-list .pc-item[data-id="${this.practiceChapterId}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
    this._refreshPracticeBests();
  }

  /** 刷新练习章节列表里的各章最佳（当前难度） */
  _refreshPracticeBests() {
    const bests = loadPracticeBest();
    document.querySelectorAll('#practice-chapter-list .pc-item').forEach((b) => {
      const rec = bests[Number(b.dataset.id)]?.[this.practiceDiffId];
      const span = b.querySelector('.pc-best');
      if (!span) return;
      span.textContent = rec ? `最佳 ${rec.score}${rec.perfect ? ' · NMNB' : ''}` : '';
    });
  }

  _selectPracticeDiff(id) {
    this.practiceDiffId = id;
    this._refreshPracticeDiff();
    this._refreshPracticeBests();
    this._savePracticePrefs();
    this._sfx('ok');
  }

  _cyclePracticeDiff(dir) {
    const i = DIFFICULTY_ORDER.indexOf(this.practiceDiffId);
    const newId = DIFFICULTY_ORDER[wrapIndex(i < 0 ? 0 : i + dir, DIFFICULTY_ORDER.length)];
    this._selectPracticeDiff(newId);
  }

  _refreshPracticeDiff() {
    document.querySelectorAll('#practice-diffs .ptab').forEach((b) => {
      const isSelected = b.dataset.diff === this.practiceDiffId;
      b.classList.toggle('selected', isSelected);
      b.setAttribute('aria-checked', String(isSelected));
    });
  }

  _savePracticePrefs() {
    savePracticePrefs({ chapter: this.practiceChapterId, diff: this.practiceDiffId });
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
    this.settingsForm.adjustFps(dir, mods);
  }

  _toggleFpsUnlimited() {
    this.settingsForm.toggleFpsUnlimited();
    this._sfx('ok');
  }

  refreshSettingsForm() {
    this.settingsForm.refresh();
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
        let start = this.pendingStart || { startChapter: 1, mode: 'story' };
        // Nomiss：自机选择勾选 → 无存档从头（1）、有进度从下一章续
        const nomissEl = document.getElementById('player-nomiss');
        if (nomissEl?.checked && start.mode === 'story') {
          start = { startChapter: loadNomissProgress() ?? 1, mode: 'nomiss' };
        }
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
    // Nomiss 勾选行：开关值标签
    const nomissCb = document.getElementById('player-nomiss');
    const nomissVal = document.getElementById('player-nomiss-val');
    nomissCb?.addEventListener('change', () => {
      if (nomissVal) nomissVal.textContent = nomissCb.checked ? '开启' : '关闭';
    });
  }

  _action(action) {
    // 返回类只播 cancel；确认/进入类播 ok（避免 back 叠两声）
    const isCancel = action === 'back' || action === 'back-diff';
    this._sfx(isCancel ? 'cancel' : 'ok');
    const handler = UI_ACTION_HANDLERS[action];
    if (handler) handler(this);
  }

  _practiceItems() {
    return [
      { type: 'diffs', el: document.getElementById('practice-diffs'), wrap: null },
      { type: 'stages', el: document.getElementById('practice-stages'), wrap: null },
      { type: 'chapters', el: document.getElementById('practice-chapter-list'), wrap: null },
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
    if (item?.type === 'diffs') {
      this._cyclePracticeDiff(dir);
      return true;
    }
    if (item?.type === 'stages') {
      this._cyclePracticeStage(dir);
      return true;
    }
    if (item?.type === 'chapters') {
      this._cyclePracticeChapter(dir);
      return true;
    }
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
    items.forEach((it, i) => {
      const on = i === this.playerIndex;
      // 所有类型：wrapping element 切换 selected（含 checkbox 的 player-nomiss-row）
      it.wrap?.classList.toggle('selected', on);
      // card/button：element 自身也切换 selected
      it.el.classList.toggle('selected', on && (it.type === 'card' || it.type === 'button'));
    });
  }

  /** Nomiss 勾选行：仅常规故事流程显示；每次进入自机选择重置为关闭 */
  _syncNomissRow() {
    const row = document.getElementById('player-nomiss-row');
    const cb = document.getElementById('player-nomiss');
    if (!row || !cb) return;
    const mode = this.pendingStart?.mode || 'story';
    row.classList.toggle('hidden', mode !== 'story');
    cb.checked = false;
    const val = document.getElementById('player-nomiss-val');
    if (val) val.textContent = '关闭';
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
      this._syncNomissRow();
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
    if (name === 'ranking') {
      this.ranking.resetFocus();
      this.ranking.render();
    }
    if (name === 'replay') {
      this.replay.resetFocus();
      this.replay.load();
    }
  }

  showMenu() {
    this.show('menu');
  }

  showReplayScreen() {
    this.show('replay');
  }

  showGame() {
    this.show('game');
  }
}
