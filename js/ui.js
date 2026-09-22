import {
  MANUAL_CHAPTERS, displayKey, DEFAULT_KEYS, DEFAULT_SETTINGS,
  BALANCE, DIFFICULTIES, DIFFICULTY_ORDER,
} from './config.js';
import {
  loadKeys, saveKeys, saveSettings,
  loadPracticePrefs, savePracticePrefs,
  loadPracticeBest, loadNomissProgress,
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
  isConfirm,
  isBack,
  isNavNext,
  isNavPrev,
  isNavLeft,
  isNavRight,
} from './menuNav.js';
import { HistoryScreen } from './historyScreen.js';
import { SettingsForm } from './settingsForm.js';
import { RankingScreen } from './rankingScreen.js';
import { ReplayScreen } from './replayScreen.js';


const UI_ACTION_HANDLERS = {
  start(ui) {
    ui.pendingStart = { startChapter: 1, mode: 'story' };
    ui.modeIndex = 0;
    ui.modeBandAngle = 0;
    ui._difficultyBackTarget = 'mode';
    ui.playerIndex = 0;
    ui.show('mode');
  },
  'extra-start'(ui) {
    ui.pendingStart = { startChapter: ui._extraStartChapter(), mode: 'extra' };
    ui._difficultyBackTarget = 'menu';
    ui.show('difficulty');
  },
  'stage-select'(ui) {
    ui._difficultyBackTarget = 'stage';
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
    ui._playerBackTarget = 'practice';
    ui.playerIndex = 0;
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
    // 浏览器不能可靠地关闭当前标签页，改为可兑现的退出提示页。
    ui.show('exit');
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
  'back-mode'(ui) {
    ui.show('menu');
  },
  'back-difficulty'(ui) {
    if (ui._difficultyBackTarget === 'mode') ui.show('mode');
    else if (ui._difficultyBackTarget === 'stage') ui.show('stage');
    else ui.show('menu');
  },
  'back-diff'(ui) {
    if (ui._playerBackTarget === 'practice' || ui.pendingStart?.mode === 'practice') {
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
    this.menuEntering = false;
    this._menuAnimations = [];
    this._menuAnimationGeneration = 0;
    this._menuStarted = false;
    this._menuHeldConfirm = null;
    this._menuSkipPointer = null;
    this._menuMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._menuMotionQuery.addEventListener('change', () => {
      if (this._menuMotionQuery.matches) this._finishMenuEntrance();
    });
    this.pendingStart = null;
    this.pendingDifficulty = 'normal';
    this.binding = null;
    this.modeIndex = 0;
    this.modeBandAngle = 0;
    this.diffIndex = 1;
    this.playerIndex = 0;
    this.stageIndex = 0;
    this.manualIndex = 1;
    this.practiceIndex = 0;
    this.settingsIndex = 0;
    this._difficultyBackTarget = 'menu';
    this._playerBackTarget = 'difficulty';
    this._selectionTransition = null;
    this._playerConfirmTransition = null;
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
      mode: document.getElementById('screen-mode-select'),
      difficulty: document.getElementById('screen-difficulty'),
      player: document.getElementById('screen-player-select'),
      stage: document.getElementById('screen-stage-select'),
      practice: document.getElementById('screen-practice'),
      settings: document.getElementById('screen-settings'),
      manual: document.getElementById('screen-manual'),
      history: document.getElementById('screen-history'),
      ranking: document.getElementById('screen-ranking'),
      replay: document.getElementById('screen-replay'),
      exit: document.getElementById('screen-exit'),
      game: document.getElementById('screen-game'),
    };
    // BootFlow 在所有初始化完成后通过 showMenu() 解除 inert 并开始首次入场。
    if (this.screens.menu) this.screens.menu.inert = true;

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
    this._initMode();
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
        onBack: () => this._action('exit'),
      }),
      exit: (e) => {
        if (isBack(e) || isConfirm(e)) {
          e.preventDefault();
          this._action('back');
        }
      },
      mode: (e) => {
        const dir = (isNavNext(e) || isNavRight(e)) ? 1 : (isNavPrev(e) || isNavLeft(e)) ? -1 : 0;
        handleListScreen(e, {
          getItems: () => this._modeItems(),
          index: this.modeIndex,
          setIndex: (i) => {
            if (dir) this.modeBandAngle += dir * 180;
            this.modeIndex = i;
          },
          highlight: () => this._highlightMode(),
          onBack: () => this._action('back-mode'),
          useHorizontal: true,
        });
      },
      difficulty: (e) => handleListScreen(e, {
        getItems: () => this._diffItems(),
        index: this.diffIndex,
        setIndex: (i) => { this.diffIndex = i; },
        highlight: () => this._highlightDiff(),
        onBack: () => this._action('back-difficulty'),
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

  _modeItems() {
    return [...document.querySelectorAll('#mode-list .mode-btn')].map(el => ({ type: 'mode', el }));
  }

  _initMode() {
    const list = document.getElementById('mode-list');
    if (!list) return;
    [...list.querySelectorAll('.mode-btn')].forEach((btn, index) => {
      btn.addEventListener('click', () => {
        if (this._selectionTransition || this._playerConfirmTransition) return;
        const dir = index === this.modeIndex ? 0 : index > this.modeIndex ? 1 : -1;
        this.modeIndex = index;
        this.modeBandAngle += dir * 180;
        this._highlightMode();
        this._sfx('ok');
        this._selectMode(btn.dataset.mode);
      });
    });
    this._highlightMode();
  }

  _selectMode(mode) {
    this.pendingStart = mode === 'nomiss'
      ? { startChapter: loadNomissProgress() ?? 1, mode: 'nomiss' }
      : { startChapter: 1, mode: 'story' };
    this._difficultyBackTarget = 'mode';
    this.show('difficulty');
  }

  _highlightMode() {
    const items = this._modeItems();
    if (!items.length) return;
    this.modeIndex = clampIndex(this.modeIndex, items.length);
    this.screens.mode.style.setProperty('--mode-band-angle', `${this.modeBandAngle}deg`);
    items.forEach((it, i) => {
      const offset = i - this.modeIndex;
      it.el.classList.toggle('selected', offset === 0);
      it.el.style.setProperty('--mode-y', `${offset * Math.max(180, window.innerHeight * .3)}px`);
      it.el.style.setProperty('--mode-opacity', offset === 0 ? '1' : Math.abs(offset) === 1 ? '.32' : '.1');
    });
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
    this._difficultySizeObserver?.disconnect();
    this._difficultySizeObserver ??= new ResizeObserver(entries => {
      for (const { target } of entries) {
        if (target.dataset.diff !== 'extra') continue;
        document.getElementById('screen-difficulty').style.setProperty('--extra-band-height', `${Math.ceil(target.getBoundingClientRect().height) + 24}px`);
      }
    });
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
      `;
      btn.addEventListener('click', () => {
        if (this._selectionTransition) return;
        this._sfx('ok');
        this.pendingDifficulty = id;
        this.diffIndex = i;
        this._highlightDiff();
        this._playerBackTarget = 'difficulty';
        this.show('player');
      });
      list.appendChild(btn);
      if (id === 'extra') this._difficultySizeObserver.observe(btn);
    });
    const di = avail.indexOf(this.pendingDifficulty);
    if (di >= 0) this.diffIndex = di;
    this._highlightDiff();
  }

  _diffItems() {
    return [...document.querySelectorAll('#diff-list .diff-btn')].map(el => ({ type: 'diff', el }));
  }

  _highlightDiff() {
    const items = this._diffItems();
    if (!items.length) return;
    this.diffIndex = clampIndex(this.diffIndex, items.length);
    document.getElementById('screen-difficulty').style.setProperty('--band-angle', `${items.length > 1 ? -12 + 24 * this.diffIndex / (items.length - 1) : 0}deg`);
    const mobile = window.matchMedia('(max-width: 560px)').matches;
    const spacing = Math.max(mobile ? 180 : 240, window.innerHeight * (mobile ? .30 : .32));
    items.forEach((it, i) => {
      const offset = i - this.diffIndex;
      it.el.classList.toggle('selected', offset === 0);
      it.el.style.setProperty('--rank-x', `${offset * 24}vw`);
      it.el.style.setProperty('--rank-y', `${offset * spacing}px`);
      it.el.style.setProperty('--rank-opacity', offset === 0 ? 1 : Math.abs(offset) === 1 ? .32 : .1);
    });
  }

  _playerItems() {
    return [...document.querySelectorAll('#screen-player-select .player-card')].map(el => ({ type: 'card', el }));
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
    for (const [i, s] of stageSelectEntries().entries()) {
      const btn = document.createElement('button');
      btn.className = 'stage-btn';
      btn.dataset.stage = s.id;
      btn.dataset.start = s.startChapter;
      btn.innerHTML = `<strong>${s.label}</strong><small>${s.desc}</small>`;
      btn.addEventListener('click', () => {
        this._sfx('ok');
        this.stageIndex = i;
        this._highlightStage();
        this._difficultyBackTarget = 'stage';
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
      e.stopImmediatePropagation();
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
        if (this._selectionTransition || this._playerConfirmTransition) return;
        if (!card.classList.contains('current-player')) {
          this.playerIndex = [...document.querySelectorAll('.player-card')].indexOf(card);
          this._highlightPlayer();
          this._sfx('select');
          return;
        }
        this._confirmPlayer(card);
      });
    });
  }

  _startGameForPlayer(card) {
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
  }

  _cancelPlayerConfirm() {
    const transition = this._playerConfirmTransition;
    if (!transition) return;
    this._playerConfirmTransition = null;
    transition.animations.forEach((animation) => animation.cancel());
  }

  _confirmPlayer(card) {
    if (this._playerConfirmTransition) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this._startGameForPlayer(card);
      return;
    }
    const transition = { animations: [] };
    this._playerConfirmTransition = transition;
    const animation = card.animate([
      { opacity: 1, offset: 0, easing: 'steps(1, end)' },
      { opacity: 0, offset: .5, easing: 'steps(1, end)' },
      { opacity: 1, offset: 1 },
    ], { fill: 'both', duration: 120, iterations: 3 });
    transition.animations.push(animation);
    animation.finished.then(() => {
      if (this._playerConfirmTransition !== transition) return;
      this._cancelPlayerConfirm();
      this._startGameForPlayer(card);
    }).catch(() => {
      if (this._playerConfirmTransition === transition) this._cancelPlayerConfirm();
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
    const menu = this.screens.menu;
    const items = [...document.querySelectorAll('#main-menu-nav .menu-btn')];
    const select = (button, focus = false) => {
      const index = items.indexOf(button);
      if (index < 0 || menu.inert) return;
      this.menuIndex = index;
      this._highlightMenu(items, focus);
    };
    items.forEach((button) => {
      button.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'mouse' && !this.menuEntering) select(button, true);
      });
      button.addEventListener('focus', () => select(button));
    });
    menu.addEventListener('pointerdown', (e) => {
      this._menuSkipPointer = null;
      if (e.button !== 0 || !this.menuEntering) return;
      this._menuSkipPointer = e.pointerId;
      this._finishMenuEntrance();
      e.preventDefault();
      e.stopPropagation();
    }, true);
    menu.addEventListener('pointercancel', () => { this._menuSkipPointer = null; });
    menu.addEventListener('click', (e) => {
      if ((this._menuSkipPointer !== null && e.detail > 0) || this.menuEntering) {
        this._menuSkipPointer = null;
        this._finishMenuEntrance();
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      const button = e.target.closest('.menu-btn');
      if (button) select(button);
    }, true);
    window.addEventListener('keyup', (e) => {
      if (e.code === this._menuHeldConfirm) this._menuHeldConfirm = null;
    }, true);
    window.addEventListener('blur', () => {
      this._menuHeldConfirm = null;
      this._menuSkipPointer = null;
    });
    window.addEventListener('keydown', (e) => {
      if (this._selectionTransition || this._playerConfirmTransition) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (isBack(e)) {
          if (this._selectionTransition) this._selectionTransition.returnRequested = true;
          else { this._cancelPlayerConfirm(); this._action('back-diff'); }
        }
        return;
      }
      const name = this._activeScreenName();
      if (!name || name === 'game') return;
      if (name === 'menu' && menu.inert) return;
      if ((name === 'menu' || name === 'exit') && e.repeat && (isConfirm(e) || isBack(e))) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (this._menuHeldConfirm === e.code) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      if (this.binding && name === 'settings') return;
      if (isBack(e) || (name === 'exit' && isConfirm(e))) this._menuHeldConfirm = e.code;
      if (name === 'menu') {
        if (isConfirm(e)) {
          this._menuHeldConfirm = e.code;
          if (this.menuEntering) {
            this._finishMenuEntrance();
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
          }
        } else if (isNavNext(e) || isNavPrev(e) || isNavLeft(e) || isNavRight(e)) {
          this._finishMenuEntrance();
        }
      }
      this._navHandlers[name]?.(e);
    }, true);
    this._highlightMenu(items, false);
  }

  _highlightMenu(list, focus = true) {
    highlightButtons(list, this.menuIndex);
    const selected = list[this.menuIndex];
    list.forEach((button, index) => { button.tabIndex = index === this.menuIndex ? 0 : -1; });
    if (focus && selected && !this.screens.menu.inert) {
      selected.focus({ preventScroll: true });
      selected.scrollIntoView({ block: 'nearest' });
    }
  }

  _finishMenuEntrance() {
    this._menuAnimationGeneration += 1;
    this.menuEntering = false;
    this.screens.menu.classList.remove('menu-entering');
    this._menuAnimations.forEach((animation) => animation.cancel());
    this._menuAnimations = [];
  }

  _enterMenu() {
    this._finishMenuEntrance();
    this._menuStarted = true;
    this._highlightMenu([...document.querySelectorAll('#main-menu-nav .menu-btn')]);
    if (this._menuMotionQuery.matches) return;
    this.menuEntering = true;
    this.screens.menu.classList.add('menu-entering');
    this._menuAnimations = this.screens.menu.getAnimations({ subtree: true });
    const generation = this._menuAnimationGeneration;
    Promise.allSettled(this._menuAnimations.map((animation) => animation.finished)).then(() => {
      if (generation === this._menuAnimationGeneration) this._finishMenuEntrance();
    });
  }

  _highlightPlayer() {
    const items = this._playerItems();
    this.playerIndex = clampIndex(this.playerIndex, items.length);
    items.forEach((it, i) => {
      const on = i === this.playerIndex;
      it.el.classList.toggle('current-player', on);
      it.el.classList.toggle('selected', on);
      it.el.setAttribute('aria-pressed', String(on));
    });
  }

  _cancelSelectionTransition({ restore = false } = {}) {
    const transition = this._selectionTransition;
    if (!transition) return;
    this._selectionTransition = null;
    transition.animations.forEach((animation) => animation.cancel());
    transition.to.classList.remove('selection-arriving');
    transition.from.inert = false;
    transition.to.inert = true;
    if (restore) {
      transition.to.classList.remove('active');
      transition.from.classList.add('active');
    }
  }

  _selectionParts(screen, name) {
    if (name === 'mode') return [...screen.querySelectorAll('.mode-btn, .mode-focus-band')];
    if (name === 'difficulty') return [...screen.querySelectorAll('.diff-btn, .difficulty-focus-band')];
    if (name === 'player') return [screen.querySelector('.player-cards')].filter(Boolean);
    return [];
  }

  async _transitionSelection(fromName, toName, direction) {
    if (this._selectionTransition) return;
    const from = this.screens[fromName];
    const to = this.screens[toName];
    if (!from || !to) {
      this.show(toName, true);
      return;
    }
    const transition = { fromName, toName, from, to, direction, animations: [] };
    this._selectionTransition = transition;
    from.inert = true;
    const animate = (el, frames, options) => {
      if (!el) return null;
      const animation = el.animate(frames, { fill: 'both', ...options });
      transition.animations.push(animation);
      return animation;
    };
    const wait = (animation) => animation?.finished || Promise.resolve();
    try {
      if (direction > 0) {
        const chosen = from.querySelector('.mode-btn.selected, .diff-btn.selected');
        await wait(animate(chosen, [
          { opacity: 1, offset: 0, easing: 'steps(1, end)' },
          { opacity: 0, offset: .5, easing: 'steps(1, end)' },
          { opacity: 1, offset: 1 },
        ], { duration: 120, iterations: 3 }));
      }
      if (this._selectionTransition !== transition) return;
      if (toName === 'difficulty') this._rebuildDifficulty();
      if (toName === 'mode') this._highlightMode();
      if (toName === 'difficulty') this._highlightDiff();
      if (toName === 'player') this._highlightPlayer();
      to.classList.add('active', 'selection-arriving');
      to.inert = true;
      const easing = 'cubic-bezier(0.22, 1, 0.36, 1)';
      const sourceParts = this._selectionParts(from, fromName);
      const targetParts = this._selectionParts(to, toName);
      const sourceX = direction > 0
        ? (el) => `${-el.getBoundingClientRect().right - 40}px`
        : (el) => `${innerWidth - el.getBoundingClientRect().left + 40}px`;
      const targetX = direction > 0 ? () => `${innerWidth + 240}px` : () => `${-innerWidth - 240}px`;
      const exit = sourceParts.map((el) => {
        const rect = el.getBoundingClientRect();
        const opacity = rect.right <= 0 || rect.left >= innerWidth || rect.bottom <= 0 || rect.top >= innerHeight
          ? 0 : getComputedStyle(el).opacity;
        return animate(el, [
          { translate: '0px 0px', opacity },
          { translate: `${sourceX(el)} ${innerHeight / 2 - rect.y - rect.height / 2}px`, opacity },
        ], { duration: 760, easing });
      });
      const title = from.querySelector('.panel-title');
      if (title) {
        exit.push(animate(title, [
          { opacity: 1, translate: '0px' },
          { opacity: 0, translate: `${direction > 0 ? -180 : 180}px` },
        ], { duration: 560, easing }));
      }
      const enter = targetParts.map((el) => {
        const rect = el.getBoundingClientRect();
        const y = direction < 0 ? innerHeight / 2 - rect.y - rect.height / 2 : 0;
        return animate(el, [
          { translate: `${targetX(el)} ${y}px` },
          { translate: '0px 0px' },
        ], { duration: 450, easing });
      });
      const targetTitle = to.querySelector('.panel-title');
      if (targetTitle) {
        enter.push(animate(targetTitle, [
          { opacity: 0, translate: `${direction > 0 ? 180 : -180}px` },
          { opacity: 1, translate: '0px' },
        ], { duration: 560, easing }));
      }
      await Promise.all([...exit, ...enter].filter(Boolean).map((animation) => animation.finished));
      if (this._selectionTransition !== transition) return;
      this._cancelSelectionTransition();
      this.show(toName, true);
      if (transition.returnRequested) this.show(fromName);
    } catch (error) {
      if (this._selectionTransition !== transition) return;
      this._cancelSelectionTransition();
      this.show(fromName, true);
    }
  }

  _highlightStage() {
    const items = this._stageItems();
    document.querySelectorAll('#stage-grid .stage-btn').forEach((b) => b.classList.remove('selected'));
    document.querySelector('#screen-stage-select [data-action="back"]')?.classList.remove('selected');
    if (!items.length) return;
    this.stageIndex = clampIndex(this.stageIndex, items.length);
    items.forEach((it, i) => it.el.classList.toggle('selected', i === this.stageIndex));
    items[this.stageIndex]?.el?.scrollIntoView?.({ block: 'nearest' });
  }

  show(name, selectionComplete = false) {
    this._cancelPlayerConfirm();
    const active = this._activeScreenName();
    if (!selectionComplete && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const forward = (active === 'mode' && name === 'difficulty')
        || (active === 'difficulty' && name === 'player');
      const reverse = (active === 'player' && name === 'difficulty')
        || (active === 'difficulty' && name === 'mode');
      if (forward || reverse) {
        void this._transitionSelection(active, name, forward ? 1 : -1);
        return;
      }
    }
    this._cancelPlayerConfirm();
    this._cancelSelectionTransition();
    const enteringMenu = name === 'menu'
      && (!this._menuStarted || this._activeScreenName() !== 'menu');
    if (name !== 'menu') this._finishMenuEntrance();
    if (name === 'difficulty' && !selectionComplete) this._rebuildDifficulty();
    Object.entries(this.screens).forEach(([key, screen]) => {
      if (!screen) return;
      screen.classList.toggle('active', key === name);
      screen.inert = key !== name;
    });
    if (enteringMenu) this._enterMenu();
    if (name === 'exit') this.screens.exit.querySelector('button')?.focus();
    if (name === 'difficulty') this._highlightDiff();
    if (name === 'mode') this._highlightMode();
    if (name === 'player') {
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
