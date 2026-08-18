/**
 * 排行榜屏：难度切换 + top10 列表 + 键盘导航。
 * 数据来自 ranking.js 的 localStorage（与录像完全独立）。
 */
import { DIFFICULTIES, DIFFICULTY_ORDER } from './config.js';
import { loadRanking } from './ranking.js';
import {
  isBack, isNavNext, isNavPrev, isNavLeft, isNavRight,
  clampIndex, wrapIndex,
} from './menuNav.js';

const ROUTE_LABEL = { A: 'A线', B: 'B线', EX: 'EX' };

export class RankingScreen {
  constructor({ audio, isActive, onBack }) {
    this.audio = audio;
    this.isActive = isActive;
    this.onBack = onBack;
    this.diffIds = [...DIFFICULTY_ORDER, 'extra'];
    this.diffIndex = 0;
    this.index = 0;
  }

  resetFocus() {
    this.index = 0;
  }

  _entries() {
    const ranking = loadRanking();
    return ranking[this.diffIds[this.diffIndex]] || [];
  }

  render() {
    const diffEl = document.getElementById('ranking-diffs');
    if (diffEl) {
      diffEl.innerHTML = '';
      this.diffIds.forEach((id, i) => {
        const d = DIFFICULTIES[id];
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ranking-diff-btn';
        b.textContent = d.rank;
        b.title = d.name;
        b.addEventListener('click', () => {
          this.audio.sfx('ok');
          this.diffIndex = i;
          this.index = 0;
          this.render();
        });
        diffEl.appendChild(b);
      });
    }

    const listEl = document.getElementById('ranking-list');
    if (listEl) {
      listEl.innerHTML = '';
      const list = this._entries();
      if (!list.length) {
        const empty = document.createElement('p');
        empty.className = 'ranking-empty';
        empty.textContent = '暂无记录';
        listEl.appendChild(empty);
      } else {
        list.forEach((e, i) => listEl.appendChild(this._row(e, i)));
      }
    }
    this.highlight();
  }

  _row(e, i) {
    const row = document.createElement('div');
    row.className = 'ranking-row';
    row.setAttribute('role', 'listitem');

    const rank = document.createElement('span');
    rank.className = 'ranking-rank';
    rank.textContent = `${i + 1}`;

    const name = document.createElement('span');
    name.className = 'ranking-name';
    name.textContent = e.name;

    const player = document.createElement('span');
    player.className = 'ranking-player';
    player.textContent = e.playerName || '';

    const route = document.createElement('span');
    route.className = 'ranking-route';
    route.textContent = ROUTE_LABEL[e.route] || (e.cleared ? '通关' : '—');

    const score = document.createElement('span');
    score.className = 'ranking-score';
    score.textContent = String(e.score ?? 0);

    const date = document.createElement('span');
    date.className = 'ranking-date';
    date.textContent = e.date ? new Date(e.date).toLocaleDateString('zh-CN') : '';

    row.append(rank, name, player, route, score, date);
    return row;
  }

  _rows() {
    return [...document.querySelectorAll('#ranking-list .ranking-row')];
  }

  highlight() {
    const rows = this._rows();
    this.index = clampIndex(this.index, rows.length);
    rows.forEach((r, i) => r.classList.toggle('selected', i === this.index));
    const tabs = [...document.querySelectorAll('#ranking-diffs .ranking-diff-btn')];
    tabs.forEach((t, i) => t.classList.toggle('selected', i === this.diffIndex));
  }

  handleKey(e) {
    if (isBack(e)) {
      e.preventDefault();
      this.onBack();
      return true;
    }
    if (isNavLeft(e)) {
      e.preventDefault();
      this.diffIndex = wrapIndex(this.diffIndex - 1, this.diffIds.length);
      this.index = 0;
      this.audio.sfx('ok');
      this.render();
      return true;
    }
    if (isNavRight(e)) {
      e.preventDefault();
      this.diffIndex = wrapIndex(this.diffIndex + 1, this.diffIds.length);
      this.index = 0;
      this.audio.sfx('ok');
      this.render();
      return true;
    }
    const rows = this._rows();
    if (isNavNext(e)) {
      e.preventDefault();
      this.index = Math.min(this.index + 1, Math.max(0, rows.length - 1));
      this.highlight();
      return true;
    }
    if (isNavPrev(e)) {
      e.preventDefault();
      this.index = Math.max(0, this.index - 1);
      this.highlight();
      return true;
    }
    return false;
  }
}
