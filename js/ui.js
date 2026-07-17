import {
  MANUAL_CHAPTERS, displayKey, DEFAULT_KEYS,
  DIFFICULTIES, DIFFICULTY_ORDER, getDifficulty,
} from './config.js';
import { loadKeys, saveKeys, loadUnlocked } from './storage.js';
import { stageSelectEntries, buildChapterList } from './stages/index.js';

export class UI {
  constructor({ onStartGame, audio }) {
    this.onStartGame = onStartGame;
    this.audio = audio;
    this.menuIndex = 0;
    this.pendingStart = null;
    this.pendingDifficulty = 'normal';
    this.lastResult = null;
    this.binding = null;
    this.diffIndex = 1;

    this.screens = {
      menu: document.getElementById('screen-menu'),
      difficulty: document.getElementById('screen-difficulty'),
      player: document.getElementById('screen-player-select'),
      stage: document.getElementById('screen-stage-select'),
      practice: document.getElementById('screen-practice'),
      keys: document.getElementById('screen-keys'),
      manual: document.getElementById('screen-manual'),
      game: document.getElementById('screen-game'),
      result: document.getElementById('screen-result'),
    };

    this._initManual();
    this._initStageGrid();
    this._initPractice();
    this._initDifficulty();
    this._initKeys();
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

  _initDifficulty() {
    const list = document.getElementById('diff-list');
    list.innerHTML = '';
    DIFFICULTY_ORDER.forEach((id, i) => {
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
        this.binding = row.dataset.bind;
        document.querySelectorAll('.key-row').forEach((r) => r.classList.remove('listening'));
        row.classList.add('listening');
      });
    });
    window.addEventListener('keydown', (e) => {
      if (!this.binding || !this.screens.keys.classList.contains('active')) return;
      e.preventDefault();
      const keys = loadKeys();
      keys[this.binding] = e.code;
      saveKeys(keys);
      this.refreshKeyLabels();
      document.querySelectorAll('.key-row').forEach((r) => r.classList.remove('listening'));
      this.binding = null;
      this.audio.sfx('ok');
    });
  }

  refreshKeyLabels() {
    const keys = loadKeys();
    document.getElementById('key-shot').textContent = displayKey(keys.shot);
    document.getElementById('key-bomb').textContent = displayKey(keys.bomb);
    document.getElementById('key-item').textContent = displayKey(keys.item);
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
    } else if (action === 'key-config') {
      this.refreshKeyLabels();
      this.show('keys');
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
    } else if (action === 'keys-reset') {
      saveKeys({ ...DEFAULT_KEYS });
      this.refreshKeyLabels();
    } else if (action === 'exit') {
      if (confirm('确定退出棍维Project？')) {
        window.close();
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0c10;color:#c9b896;font-family:serif">已退出 · 可关闭标签页</div>';
      }
    } else if (action === 'back') {
      this.audio.sfx('cancel');
      this.show('menu');
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

  _refreshStageLocks() {
    document.querySelectorAll('.stage-btn').forEach((btn) => {
      btn.disabled = false;
    });
  }

  _bindKeyboardNav() {
    window.addEventListener('keydown', (e) => {
      // 主菜单
      if (this.screens.menu.classList.contains('active')) {
        const list = [...document.querySelectorAll('#main-menu-nav .menu-btn')];
        if (e.code === 'ArrowDown') {
          e.preventDefault();
          this.menuIndex = (this.menuIndex + 1) % list.length;
          this._highlightMenu(list);
        } else if (e.code === 'ArrowUp') {
          e.preventDefault();
          this.menuIndex = (this.menuIndex - 1 + list.length) % list.length;
          this._highlightMenu(list);
        } else if (e.code === 'Enter' || e.code === 'KeyZ') {
          e.preventDefault();
          list[this.menuIndex]?.click();
        }
        return;
      }

      // 难度选择
      if (this.screens.difficulty?.classList.contains('active')) {
        if (e.code === 'ArrowDown') {
          e.preventDefault();
          this.diffIndex = (this.diffIndex + 1) % DIFFICULTY_ORDER.length;
          this._highlightDiff();
        } else if (e.code === 'ArrowUp') {
          e.preventDefault();
          this.diffIndex = (this.diffIndex - 1 + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length;
          this._highlightDiff();
        } else if (e.code === 'Enter' || e.code === 'KeyZ') {
          e.preventDefault();
          document.querySelectorAll('.diff-btn')[this.diffIndex]?.click();
        } else if (e.code === 'Escape') {
          e.preventDefault();
          this.show('menu');
        }
      }
    });
    this._highlightMenu([...document.querySelectorAll('#main-menu-nav .menu-btn')]);
  }

  _highlightMenu(list) {
    list.forEach((b, i) => b.classList.toggle('selected', i === this.menuIndex));
  }

  show(name) {
    Object.values(this.screens).forEach((s) => s?.classList.remove('active'));
    this.screens[name]?.classList.add('active');
    if (name === 'difficulty') this._highlightDiff();
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
