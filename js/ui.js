import {
  MANUAL_CHAPTERS, displayKey, DEFAULT_KEYS, DEFAULT_SETTINGS,
  DIFFICULTIES, DIFFICULTY_ORDER, getDifficulty,
} from './config.js';
import { loadKeys, saveKeys, loadUnlocked, loadSettings, saveSettings } from './storage.js';
import { stageSelectEntries, buildChapterList } from './stages/index.js';
import {
  fetchHistoryVersions,
  isCurrentDeployment,
  formatDeployTime,
} from './historyVersions.js';

export class UI {
  constructor({ onStartGame, onSettingsChange, audio }) {
    this.onStartGame = onStartGame;
    this.onSettingsChange = onSettingsChange || null;
    this.audio = audio;
    this.menuIndex = 0;
    this.pendingStart = null;
    this.pendingDifficulty = 'normal';
    this.lastResult = null;
    this.binding = null;
    this.diffIndex = 1;
    this.playerIndex = 0; // 自机选择：0 饮泉 / 1 沙玛
    this.stageIndex = 0;
    this.practiceBtnIndex = 0; // 0 开始练习 / 1 返回
    this.resultIndex = 0; // 0 再试 / 1 主菜单
    this.settingsBtnIndex = 0; // 0 恢复默认 / 1 完成
    this.historyIndex = 0;
    this.historyFocus = 'list'; // list | actions
    this.historyActionIndex = 1; // 0 刷新 / 1 返回
    this.historyItems = [];
    this.historyLoading = false;
    /** 从暂停菜单进入设置时的返回回调 */
    this.settingsReturn = null;

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
      result: document.getElementById('screen-result'),
    };

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

  _availableDifficulties() {
    if (this.pendingStart?.mode === 'extra' || this.pendingStart?.startChapter === 129) {
      return DIFFICULTY_ORDER.filter(id => id === 'hard' || id === 'lunatic');
    }
    return DIFFICULTY_ORDER;
  }

  _initDifficulty() {
    this._rebuildDifficulty();
  }

  _rebuildDifficulty() {
    const list = document.getElementById('diff-list');
    list.innerHTML = '';
    const avail = this._availableDifficulties();
    if ((this.pendingStart?.mode === 'extra' || this.pendingStart?.startChapter === 129) && this.pendingDifficulty !== 'hard' && this.pendingDifficulty !== 'lunatic') {
      this.pendingDifficulty = 'hard';
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
        this.audio.sfx('ok');
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

  _highlightDiff() {
    document.querySelectorAll('.diff-btn').forEach((b, i) => {
      b.classList.toggle('selected', i === this.diffIndex);
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
        this.audio.sfx('ok');
        this.pendingStart = { startChapter: s.startChapter, mode: 'stage' };
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
      // 仅在设置页等待绑定时捕获；Esc 取消绑定
      if (!this.binding || !this.screens.settings?.classList.contains('active')) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape') {
        document.querySelectorAll('.key-row').forEach((r) => r.classList.remove('listening'));
        this.binding = null;
        this.audio.sfx('cancel');
        return;
      }
      const keys = loadKeys();
      keys[this.binding] = e.code;
      saveKeys(keys);
      this.refreshKeyLabels();
      document.querySelectorAll('.key-row').forEach((r) => r.classList.remove('listening'));
      this.binding = null;
      this.audio.sfx('ok');
    }, true);
  }

  refreshKeyLabels() {
    const keys = loadKeys();
    document.getElementById('key-shot').textContent = displayKey(keys.shot);
    document.getElementById('key-bomb').textContent = displayKey(keys.bomb);
    document.getElementById('key-item').textContent = displayKey(keys.item);
  }

  _initSettings() {
    const vol = document.getElementById('set-music-volume');
    const op = document.getElementById('set-bullet-opacity');
    const toggle = document.getElementById('set-shot-toggle');
    if (!vol || !op || !toggle) return;

    const syncLabels = (s) => {
      const volPct = Math.round((s.musicVolume ?? 1) * 100);
      const opPct = Math.round((s.playerBulletOpacity ?? 0.3) * 100);
      vol.value = String(volPct);
      op.value = String(opPct);
      toggle.checked = !!s.shotToggle;
      const volLab = document.getElementById('set-music-volume-val');
      const opLab = document.getElementById('set-bullet-opacity-val');
      const togLab = document.getElementById('set-shot-toggle-val');
      if (volLab) volLab.textContent = `${volPct}%`;
      if (opLab) opLab.textContent = `${opPct}%`;
      if (togLab) togLab.textContent = s.shotToggle ? '开启' : '关闭';
    };

    this._refreshSettingsForm = () => syncLabels(loadSettings());
    this._refreshSettingsForm();

    const commit = () => {
      const next = saveSettings({
        musicVolume: Number(vol.value) / 100,
        playerBulletOpacity: Number(op.value) / 100,
        shotToggle: toggle.checked,
      });
      syncLabels(next);
      this.onSettingsChange?.(next);
    };

    vol.addEventListener('input', commit);
    op.addEventListener('input', commit);
    toggle.addEventListener('change', commit);
  }

  refreshSettingsForm() {
    this._refreshSettingsForm?.();
  }

  /** 暂停菜单进入设置；onBack 在点「完成/返回」时调用 */
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
        this.audio.sfx('ok');
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
    this.audio.sfx('ok');
    if (action === 'start') {
      this.pendingStart = { startChapter: 1, mode: 'story' };
      this.show('difficulty');
    } else if (action === 'extra-start') {
      this.pendingStart = { startChapter: 129, mode: 'extra' };
      this.show('difficulty');
    } else if (action === 'stage-select') {
      this._refreshStageLocks();
      this.show('stage');
    } else if (action === 'manual') {
      this.show('manual');
    } else if (action === 'history') {
      this.show('history');
      this._loadHistory();
    } else if (action === 'history-refresh') {
      this._loadHistory(true);
    } else if (action === 'settings' || action === 'key-config') {
      // key-config 兼容旧入口 → 设置页
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
      const lives = Number(document.getElementById('practice-lives').value);
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
      if (confirm('确定退出棍维Project？')) {
        window.close();
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0c10;color:#c9b896;font-family:serif">已退出 · 可关闭标签页</div>';
      }
    } else if (action === 'back') {
      this.audio.sfx('cancel');
      if (this.settingsReturn) {
        const cb = this.settingsReturn;
        this.settingsReturn = null;
        cb();
      } else {
        this.show('menu');
      }
    } else if (action === 'back-diff') {
      this.audio.sfx('cancel');
      this.show('difficulty');
    } else if (action === 'result-retry') {
      const r = this.lastResult;
      this.pendingStart = {
        startChapter: r?.retryChapter || 1,
        mode: 'story',
        difficulty: r?.difficulty || this.pendingDifficulty,
      };
      if (r?.difficulty) this.pendingDifficulty = r.difficulty;
      this.show('player');
    } else if (action === 'result-menu') {
      this.show('menu');
    }
  }

  /**
   * 选关解锁：与 storage.gunwei_unlocked 对齐
   * - 1/2/3 面：unlocked.stage
   * - 巡查姬：通关 3 面后 stage>=4
   * - A/B 线：对应 route
   * - Extra：任一路线解锁后可进
   */
  _isStageUnlocked(stageId, unlocked) {
    const id = String(stageId);
    const st = Number(unlocked?.stage) || 1;
    const routes = unlocked?.routes || {};
    if (id === '1') return true;
    if (id === '2') return st >= 2;
    if (id === '3') return st >= 3;
    if (id === 'patrol') return st >= 4;
    if (id.startsWith('A')) return !!routes.A;
    if (id.startsWith('B')) return !!routes.B;
    if (id === 'EX') return !!(routes.A || routes.B);
    return true;
  }

  _refreshStageLocks() {
    const u = loadUnlocked();
    document.querySelectorAll('.stage-btn').forEach((btn) => {
      const id = btn.dataset.stage;
      const ok = this._isStageUnlocked(id, u);
      btn.disabled = !ok;
      btn.title = ok ? '' : '未解锁';
      const small = btn.querySelector('small');
      if (small) {
        if (!btn.dataset.desc) btn.dataset.desc = small.textContent;
        small.textContent = ok ? btn.dataset.desc : '未解锁';
      }
    });
    this.stageIndex = 0;
  }

  _isConfirm(e) {
    return e.code === 'Enter' || e.code === 'KeyZ' || e.code === 'Space';
  }

  _isBack(e) {
    return e.code === 'Escape';
  }

  _bindKeyboardNav() {
    window.addEventListener('keydown', (e) => {
      // 游戏中由 Game 处理；设置页键位绑定中由 _initKeys 独占
      if (this.screens.game?.classList.contains('active')) return;
      if (this.binding && this.screens.settings?.classList.contains('active')) return;

      // 主菜单
      if (this.screens.menu?.classList.contains('active')) {
        const list = [...document.querySelectorAll('#main-menu-nav .menu-btn')];
        if (e.code === 'ArrowDown' || e.code === 'ArrowRight') {
          e.preventDefault();
          this.menuIndex = (this.menuIndex + 1) % list.length;
          this._highlightMenu(list);
        } else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
          e.preventDefault();
          this.menuIndex = (this.menuIndex - 1 + list.length) % list.length;
          this._highlightMenu(list);
        } else if (this._isConfirm(e)) {
          e.preventDefault();
          list[this.menuIndex]?.click();
        }
        return;
      }

      // 难度选择
      if (this.screens.difficulty?.classList.contains('active')) {
        const diffLen = this._availableDifficulties().length;
        if (e.code === 'ArrowDown' || e.code === 'ArrowRight') {
          e.preventDefault();
          this.diffIndex = (this.diffIndex + 1) % Math.max(1, diffLen);
          this._highlightDiff();
        } else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
          e.preventDefault();
          this.diffIndex = (this.diffIndex - 1 + diffLen) % Math.max(1, diffLen);
          this._highlightDiff();
        } else if (this._isConfirm(e)) {
          e.preventDefault();
          document.querySelectorAll('.diff-btn')[this.diffIndex]?.click();
        } else if (this._isBack(e)) {
          e.preventDefault();
          this._action('back');
        }
        return;
      }

      // 自机选择：默认高亮 + 方向键切换 + Z/Enter 确认 + Esc 返回难度
      if (this.screens.player?.classList.contains('active')) {
        const cards = [...document.querySelectorAll('.player-card')];
        if (!cards.length) return;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
          e.preventDefault();
          if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
            this.playerIndex = (this.playerIndex - 1 + cards.length) % cards.length;
          } else {
            this.playerIndex = (this.playerIndex + 1) % cards.length;
          }
          this._highlightPlayer();
        } else if (this._isConfirm(e)) {
          e.preventDefault();
          cards[this.playerIndex]?.click();
        } else if (this._isBack(e)) {
          e.preventDefault();
          this._action('back-diff');
        }
        return;
      }

      // 关卡选择
      if (this.screens.stage?.classList.contains('active')) {
        const btns = [...document.querySelectorAll('#stage-grid .stage-btn:not(:disabled)')];
        if (!btns.length) {
          if (this._isBack(e)) {
            e.preventDefault();
            this._action('back');
          }
          return;
        }
        const cols = Math.max(1, Math.min(btns.length, Math.floor(
          (document.getElementById('stage-grid')?.clientWidth || 400) / 150,
        ) || 2));
        if (e.code === 'ArrowRight') {
          e.preventDefault();
          this.stageIndex = (this.stageIndex + 1) % btns.length;
          this._highlightStage(btns);
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          this.stageIndex = (this.stageIndex - 1 + btns.length) % btns.length;
          this._highlightStage(btns);
        } else if (e.code === 'ArrowDown') {
          e.preventDefault();
          this.stageIndex = Math.min(btns.length - 1, this.stageIndex + cols);
          this._highlightStage(btns);
        } else if (e.code === 'ArrowUp') {
          e.preventDefault();
          this.stageIndex = Math.max(0, this.stageIndex - cols);
          this._highlightStage(btns);
        } else if (this._isConfirm(e)) {
          e.preventDefault();
          btns[this.stageIndex]?.click();
        } else if (this._isBack(e)) {
          e.preventDefault();
          this._action('back');
        }
        return;
      }

      // 练习模式
      if (this.screens.practice?.classList.contains('active')) {
        const rowBtns = [
          document.querySelector('#screen-practice [data-action="practice-start"]'),
          document.querySelector('#screen-practice [data-action="back"]'),
        ].filter(Boolean);
        if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
          e.preventDefault();
          this.practiceBtnIndex = (this.practiceBtnIndex - 1 + rowBtns.length) % rowBtns.length;
          this._highlightButtons(rowBtns, this.practiceBtnIndex);
        } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
          e.preventDefault();
          this.practiceBtnIndex = (this.practiceBtnIndex + 1) % rowBtns.length;
          this._highlightButtons(rowBtns, this.practiceBtnIndex);
        } else if (this._isConfirm(e)) {
          // 表单控件内 Enter 交给原生；Z 仍确认当前按钮
          if (e.code === 'Enter' && this._isFormField(e.target)) return;
          e.preventDefault();
          rowBtns[this.practiceBtnIndex]?.click();
        } else if (this._isBack(e)) {
          e.preventDefault();
          this._action('back');
        }
        return;
      }

      // 设置（含键位；绑定中已提前 return）
      if (this.screens.settings?.classList.contains('active')) {
        const rowBtns = [
          document.querySelector('#screen-settings [data-action="settings-reset"]'),
          document.querySelector('#screen-settings [data-action="back"]'),
        ].filter(Boolean);
        if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
          e.preventDefault();
          this.settingsBtnIndex = (this.settingsBtnIndex - 1 + rowBtns.length) % rowBtns.length;
          this._highlightButtons(rowBtns, this.settingsBtnIndex);
        } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
          e.preventDefault();
          this.settingsBtnIndex = (this.settingsBtnIndex + 1) % rowBtns.length;
          this._highlightButtons(rowBtns, this.settingsBtnIndex);
        } else if (this._isConfirm(e)) {
          if (e.code === 'Enter' && this._isFormField(e.target)) return;
          e.preventDefault();
          rowBtns[this.settingsBtnIndex]?.click();
        } else if (this._isBack(e)) {
          e.preventDefault();
          this.binding = null;
          document.querySelectorAll('.key-row').forEach((r) => r.classList.remove('listening'));
          this._action('back');
        }
        return;
      }

      // Manual
      if (this.screens.manual?.classList.contains('active')) {
        if (this._isBack(e) || this._isConfirm(e)) {
          e.preventDefault();
          this._action('back');
        }
        return;
      }

      // 历史构建
      if (this.screens.history?.classList.contains('active')) {
        const listBtns = [...document.querySelectorAll('#history-list .history-item')];
        const actionBtns = [
          document.querySelector('#screen-history [data-action="history-refresh"]'),
          document.querySelector('#screen-history [data-action="back"]'),
        ].filter(Boolean);

        if (this._isBack(e)) {
          e.preventDefault();
          this._action('back');
          return;
        }

        if (this.historyFocus === 'list' && listBtns.length) {
          if (e.code === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex >= listBtns.length - 1) {
              this.historyFocus = 'actions';
              this.historyActionIndex = 0;
              this._highlightHistory();
            } else {
              this.historyIndex += 1;
              this._highlightHistory();
            }
          } else if (e.code === 'ArrowUp') {
            e.preventDefault();
            this.historyIndex = Math.max(0, this.historyIndex - 1);
            this._highlightHistory();
          } else if (this._isConfirm(e)) {
            e.preventDefault();
            listBtns[this.historyIndex]?.click();
          }
          return;
        }

        // 底部按钮，或列表为空
        if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
          e.preventDefault();
          if (this.historyFocus === 'actions' && this.historyActionIndex === 0 && listBtns.length) {
            this.historyFocus = 'list';
            this.historyIndex = listBtns.length - 1;
          } else {
            this.historyFocus = 'actions';
            this.historyActionIndex =
              (this.historyActionIndex - 1 + actionBtns.length) % actionBtns.length;
          }
          this._highlightHistory();
        } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
          e.preventDefault();
          this.historyFocus = 'actions';
          this.historyActionIndex = (this.historyActionIndex + 1) % actionBtns.length;
          this._highlightHistory();
        } else if (this._isConfirm(e)) {
          e.preventDefault();
          actionBtns[this.historyActionIndex]?.click();
        }
        return;
      }

      // 结果页
      if (this.screens.result?.classList.contains('active')) {
        const rowBtns = [
          document.querySelector('#screen-result [data-action="result-retry"]'),
          document.querySelector('#screen-result [data-action="result-menu"]'),
        ].filter(Boolean);
        if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
          e.preventDefault();
          this.resultIndex = (this.resultIndex - 1 + rowBtns.length) % rowBtns.length;
          this._highlightButtons(rowBtns, this.resultIndex);
        } else if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
          e.preventDefault();
          this.resultIndex = (this.resultIndex + 1) % rowBtns.length;
          this._highlightButtons(rowBtns, this.resultIndex);
        } else if (this._isConfirm(e)) {
          e.preventDefault();
          rowBtns[this.resultIndex]?.click();
        } else if (this._isBack(e)) {
          e.preventDefault();
          this._action('result-menu');
        }
      }
    });
    this._highlightMenu([...document.querySelectorAll('#main-menu-nav .menu-btn')]);
  }

  _isFormField(el) {
    if (!el || el === document.body) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || el.isContentEditable;
  }

  _highlightMenu(list) {
    list.forEach((b, i) => b.classList.toggle('selected', i === this.menuIndex));
  }

  _highlightPlayer() {
    document.querySelectorAll('.player-card').forEach((c, i) => {
      c.classList.toggle('selected', i === this.playerIndex);
    });
  }

  _highlightStage(btns) {
    const list = btns || [...document.querySelectorAll('#stage-grid .stage-btn')];
    list.forEach((b, i) => b.classList.toggle('selected', i === this.stageIndex));
  }

  _highlightButtons(btns, index) {
    btns.forEach((b, i) => b?.classList.toggle('selected', i === index));
  }

  async _loadHistory(force = false) {
    if (this.historyLoading && !force) return;
    this.historyLoading = true;
    const statusEl = document.getElementById('history-status');
    const listEl = document.getElementById('history-list');
    if (statusEl) statusEl.textContent = '加载中…';
    if (listEl && force) listEl.innerHTML = '';

    const data = await fetchHistoryVersions();
    this.historyLoading = false;
    if (!this.screens.history?.classList.contains('active')) return;

    this.historyItems = data.versions || [];
    this.historyIndex = 0;
    this.historyFocus = this.historyItems.length ? 'list' : 'actions';
    this.historyActionIndex = this.historyItems.length ? 1 : 0;

    if (statusEl) {
      if (!data.ok) {
        statusEl.textContent = data.error || '加载失败';
        statusEl.classList.add('error');
      } else if (!this.historyItems.length) {
        statusEl.textContent = '暂无成功部署记录';
        statusEl.classList.remove('error');
      } else {
        statusEl.textContent = `共 ${this.historyItems.length} 次构建` +
          (data.project ? ` · ${data.project}` : '');
        statusEl.classList.remove('error');
      }
    }

    if (!listEl) return;
    listEl.innerHTML = '';
    for (const v of this.historyItems) {
      const current = isCurrentDeployment(v.url);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-item' + (current ? ' is-current' : '');
      btn.dataset.url = v.url;
      btn.setAttribute('role', 'listitem');
      const envLabel = v.env === 'production' ? '生产' : v.env === 'preview' ? '预览' : v.env;
      btn.innerHTML = `
        <div class="history-item-top">
          <span class="history-time">${formatDeployTime(v.createdAt)}</span>
          <span class="history-meta">
            <span class="history-env">${envLabel}</span>
            ${v.branch ? `<span class="history-branch">${v.branch}</span>` : ''}
            ${v.commit ? `<code class="history-commit">${v.commit}</code>` : ''}
            ${current ? '<span class="history-current-tag">当前</span>' : ''}
          </span>
        </div>
        <div class="history-msg">${escapeHtml(v.message || '')}</div>
      `;
      btn.addEventListener('click', () => {
        this.audio.sfx('ok');
        if (!v.url) return;
        if (current) {
          if (statusEl) {
            statusEl.textContent = '这就是当前正在打开的构建';
            statusEl.classList.remove('error');
          }
          return;
        }
        window.open(v.url, '_blank', 'noopener,noreferrer');
      });
      listEl.appendChild(btn);
    }
    this._highlightHistory();
  }

  _highlightHistory() {
    const listBtns = [...document.querySelectorAll('#history-list .history-item')];
    const actionBtns = [
      document.querySelector('#screen-history [data-action="history-refresh"]'),
      document.querySelector('#screen-history [data-action="back"]'),
    ].filter(Boolean);

    listBtns.forEach((b, i) => {
      b.classList.toggle('selected', this.historyFocus === 'list' && i === this.historyIndex);
    });
    actionBtns.forEach((b, i) => {
      b.classList.toggle('selected', this.historyFocus === 'actions' && i === this.historyActionIndex);
    });

    const sel = this.historyFocus === 'list' ? listBtns[this.historyIndex] : null;
    sel?.scrollIntoView?.({ block: 'nearest' });
  }

  show(name) {
    if (name === 'difficulty') this._rebuildDifficulty();
    Object.values(this.screens).forEach((s) => s?.classList.remove('active'));
    this.screens[name]?.classList.add('active');
    if (name === 'difficulty') this._highlightDiff();
    if (name === 'player') this._highlightPlayer();
    if (name === 'stage') {
      this.stageIndex = 0;
      this._highlightStage();
    }
    if (name === 'practice') {
      this.practiceBtnIndex = 0;
      const rowBtns = [
        document.querySelector('#screen-practice [data-action="practice-start"]'),
        document.querySelector('#screen-practice [data-action="back"]'),
      ].filter(Boolean);
      this._highlightButtons(rowBtns, this.practiceBtnIndex);
    }
    if (name === 'settings') {
      this.binding = null;
      document.querySelectorAll('.key-row').forEach((r) => r.classList.remove('listening'));
      this.refreshKeyLabels();
      this.settingsBtnIndex = 1; // 默认「完成」
      const rowBtns = [
        document.querySelector('#screen-settings [data-action="settings-reset"]'),
        document.querySelector('#screen-settings [data-action="back"]'),
      ].filter(Boolean);
      this._highlightButtons(rowBtns, this.settingsBtnIndex);
    }
    if (name === 'history') {
      this.historyIndex = 0;
      this.historyFocus = 'list';
      this.historyActionIndex = 1;
      this._highlightHistory();
    }
    if (name === 'result') {
      this.resultIndex = 0;
      const rowBtns = [
        document.querySelector('#screen-result [data-action="result-retry"]'),
        document.querySelector('#screen-result [data-action="result-menu"]'),
      ].filter(Boolean);
      this._highlightButtons(rowBtns, this.resultIndex);
    }
  }

  showMenu() {
    this.show('menu');
  }

  showGame() {
    this.show('game');
  }

  showResult({ title, body, retryChapter, difficulty }) {
    this.lastResult = {
      title,
      body,
      retryChapter,
      difficulty: difficulty || this.pendingDifficulty,
    };
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-body').textContent = body;
    this.show('result');
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
