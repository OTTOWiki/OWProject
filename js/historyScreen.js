/**
 * History 构建列表屏：加载、渲染、焦点高亮、键盘导航。
 */
import {
  fetchHistoryVersions,
  isCurrentDeployment,
  formatDeployTime,
} from './historyVersions.js';
import {
  isBack,
  isConfirm,
  isNavLeft,
  isNavNext,
  isNavPrev,
  isNavRight,
  clampIndex,
  wrapIndex,
} from './menuNav.js';

function envLabel(env) {
  if (env === 'production') return '生产';
  if (env === 'preview') return '预览';
  return env || '';
}

export class HistoryScreen {
  /**
   * @param {{ audio: { sfx: (n:string)=>void }, isActive: ()=>boolean, onBack: ()=>void }} opts
   */
  constructor({ audio, isActive, onBack }) {
    this.audio = audio;
    this.isActive = isActive;
    this.onBack = onBack;
    this.index = 0;
    this.focus = 'list'; // list | actions
    this.actionIndex = 1; // 0 刷新 / 1 返回
    this.items = [];
    this.loading = false;
  }

  resetFocus() {
    this.index = 0;
    this.focus = 'list';
    this.actionIndex = 1;
    this.highlight();
  }

  _listButtons() {
    return [...document.querySelectorAll('#history-list .history-item')];
  }

  _actionButtons() {
    return [
      document.querySelector('#screen-history [data-action="history-refresh"]'),
      document.querySelector('#screen-history [data-action="back"]'),
    ].filter(Boolean);
  }

  highlight() {
    const listBtns = this._listButtons();
    const actionBtns = this._actionButtons();
    this.index = clampIndex(this.index, listBtns.length);
    this.actionIndex = clampIndex(this.actionIndex, actionBtns.length || 1);

    listBtns.forEach((b, i) => {
      b.classList.toggle('selected', this.focus === 'list' && i === this.index);
    });
    actionBtns.forEach((b, i) => {
      b.classList.toggle('selected', this.focus === 'actions' && i === this.actionIndex);
    });

    if (this.focus === 'list') {
      listBtns[this.index]?.scrollIntoView?.({ block: 'nearest' });
    }
  }

  async load(force = false) {
    if (this.loading && !force) return;
    this.loading = true;
    const statusEl = document.getElementById('history-status');
    const listEl = document.getElementById('history-list');
    if (statusEl) statusEl.textContent = '加载中…';
    if (listEl && force) listEl.innerHTML = '';

    const data = await fetchHistoryVersions();
    this.loading = false;
    if (!this.isActive()) return;

    this.items = data.versions || [];
    this.index = 0;
    this.focus = this.items.length ? 'list' : 'actions';
    this.actionIndex = this.items.length ? 1 : 0;

    if (statusEl) {
      if (!data.ok) {
        statusEl.textContent = data.error || '加载失败';
        statusEl.classList.add('error');
      } else if (!this.items.length) {
        statusEl.textContent = '暂无成功部署记录';
        statusEl.classList.remove('error');
      } else {
        statusEl.textContent = `共 ${this.items.length} 次构建` +
          (data.project ? ` · ${data.project}` : '');
        statusEl.classList.remove('error');
      }
    }

    if (!listEl) return;
    listEl.innerHTML = '';
    for (const v of this.items) {
      listEl.appendChild(this._createItemButton(v, statusEl));
    }
    this.highlight();
  }

  _createItemButton(v, statusEl) {
    const current = isCurrentDeployment(v.url);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'history-item' + (current ? ' is-current' : '');
    if (v.url) btn.dataset.url = v.url;
    btn.setAttribute('role', 'listitem');

    const top = document.createElement('div');
    top.className = 'history-item-top';

    const time = document.createElement('span');
    time.className = 'history-time';
    time.textContent = formatDeployTime(v.createdAt);
    top.appendChild(time);

    const meta = document.createElement('span');
    meta.className = 'history-meta';

    const env = document.createElement('span');
    env.className = 'history-env';
    env.textContent = envLabel(v.env);
    meta.appendChild(env);

    if (v.branch) {
      const branch = document.createElement('span');
      branch.className = 'history-branch';
      branch.textContent = v.branch;
      meta.appendChild(branch);
    }
    if (v.commit) {
      const commit = document.createElement('code');
      commit.className = 'history-commit';
      commit.textContent = v.commit;
      meta.appendChild(commit);
    }
    if (current) {
      const tag = document.createElement('span');
      tag.className = 'history-current-tag';
      tag.textContent = '当前';
      meta.appendChild(tag);
    }
    top.appendChild(meta);
    btn.appendChild(top);

    const msg = document.createElement('div');
    msg.className = 'history-msg';
    msg.textContent = v.message || '';
    btn.appendChild(msg);

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
    return btn;
  }

  /**
   * @returns {boolean} 是否已处理
   */
  handleKey(e) {
    const listBtns = this._listButtons();
    const actionBtns = this._actionButtons();

    if (isBack(e)) {
      e.preventDefault();
      this.onBack();
      return true;
    }

    if (this.focus === 'list' && listBtns.length) {
      if (isNavNext(e)) {
        e.preventDefault();
        if (this.index >= listBtns.length - 1) {
          this.focus = 'actions';
          this.actionIndex = 0;
        } else {
          this.index += 1;
        }
        this.highlight();
        return true;
      }
      if (isNavPrev(e)) {
        e.preventDefault();
        this.index = Math.max(0, this.index - 1);
        this.highlight();
        return true;
      }
      if (isNavLeft(e) || isNavRight(e)) {
        e.preventDefault();
        this.focus = 'actions';
        this.actionIndex = isNavRight(e) ? 1 : 0;
        this.highlight();
        return true;
      }
      if (isConfirm(e)) {
        e.preventDefault();
        listBtns[this.index]?.click();
        return true;
      }
      return false;
    }

    // 底部按钮，或列表为空
    if (isNavLeft(e) || isNavPrev(e)) {
      e.preventDefault();
      if (this.focus === 'actions' && this.actionIndex === 0 && listBtns.length) {
        this.focus = 'list';
        this.index = listBtns.length - 1;
      } else if (actionBtns.length) {
        this.focus = 'actions';
        this.actionIndex = wrapIndex(this.actionIndex - 1, actionBtns.length);
      }
      this.highlight();
      return true;
    }
    if (isNavRight(e) || isNavNext(e)) {
      e.preventDefault();
      if (actionBtns.length) {
        this.focus = 'actions';
        this.actionIndex = wrapIndex(this.actionIndex + 1, actionBtns.length);
      }
      this.highlight();
      return true;
    }
    if (isConfirm(e)) {
      e.preventDefault();
      actionBtns[this.actionIndex]?.click();
      return true;
    }
    return false;
  }
}
