/**
 * 录像列表屏：列出本地已保存录像（含练习/部分），播放、删除 + 键盘导航。
 * 帧数据在 IndexedDB（replayStore），本屏只读 localStorage 索引。
 * 删除：每行右侧「删除」按钮，二次确认（首次点→「再按一次确认删除」，再点→删除）。
 */
import { DIFFICULTIES } from './config.js';
import { loadReplayIndex, deleteReplay, loadReplay, saveReplay } from './replayStore.js';
import { serializeReplay, deserializeReplay, makeReplayId } from './replay.js';
import {
  isBack, isConfirm, isNavNext, isNavPrev, clampIndex,
} from './menuNav.js';

const MODE_LABEL = { story: '故事', stage: '选关', extra: 'Extra', practice: '练习' };
const PLAYER_LABEL = { yinquan: '饮泉思源', shama: '誓约沙玛' };
const CONFIRM_RESET_MS = 3000;

/** 触发浏览器下载文本文件 */
function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class ReplayScreen {
  constructor({ audio, isActive, onBack, onPlay }) {
    this.audio = audio;
    this.isActive = isActive;
    this.onBack = onBack;
    this.onPlay = onPlay || null;
    this.items = [];
    this.index = 0;
    this._confirmTimer = null;
    this._importBound = false;
    this._bindImport();
  }

  resetFocus() {
    this.index = 0;
  }

  load() {
    this._resetConfirm();
    this.items = loadReplayIndex();
    this.index = 0;
    this.render();
  }

  render() {
    const listEl = document.getElementById('replay-list');
    const statusEl = document.getElementById('replay-status');
    if (listEl) listEl.innerHTML = '';
    if (!this.items.length) {
      if (statusEl) statusEl.textContent = '暂无录像（对局中在暂停菜单或结算界面点「保存录像」）';
      if (listEl) {
        const empty = document.createElement('p');
        empty.className = 'replay-empty';
        empty.textContent = '—';
        listEl.appendChild(empty);
      }
      return;
    }
    if (statusEl) statusEl.textContent = `共 ${this.items.length} 条录像 · Z/Enter 播放 · Del 删除`;
    this.items.forEach((m, i) => listEl?.appendChild(this._row(m, i)));
    this.highlight();
  }

  _row(m, i) {
    const wrap = document.createElement('div');
    wrap.className = 'replay-row';
    wrap.setAttribute('role', 'listitem');

    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'replay-item';

    const meta = document.createElement('span');
    meta.className = 'replay-meta';
    const d = DIFFICULTIES[m.difficultyId];
    meta.textContent = `${MODE_LABEL[m.mode] || m.mode} · ${d ? d.rank : m.difficultyId} · ${PLAYER_LABEL[m.playerId] || m.playerId}`;

    const score = document.createElement('span');
    score.className = 'replay-score';
    score.textContent = String(m.score ?? 0);

    const date = document.createElement('span');
    date.className = 'replay-date';
    date.textContent = m.date ? new Date(m.date).toLocaleString('zh-CN') : '';

    if (m.partial) {
      const tag = document.createElement('span');
      tag.className = 'replay-tag';
      tag.textContent = '部分';
      item.append(meta, score, tag, date);
    } else {
      const placeholder = document.createElement('span');
      item.append(meta, score, placeholder, date);
    }

    item.addEventListener('click', () => {
      this.audio.sfx('ok');
      this.onPlay?.(m.replayId);
    });

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'replay-del';
    del.textContent = '删除';
    del.setAttribute('aria-label', `删除 ${MODE_LABEL[m.mode] || m.mode} 录像`);
    del.addEventListener('click', () => this._onDelete(del, m));

    const exp = document.createElement('button');
    exp.type = 'button';
    exp.className = 'replay-del replay-export';
    exp.textContent = '导出';
    exp.setAttribute('aria-label', `导出 ${MODE_LABEL[m.mode] || m.mode} 录像`);
    exp.addEventListener('click', () => this._exportReplay(m));

    wrap.append(item, del, exp);
    return wrap;
  }

  _rows() {
    return [...document.querySelectorAll('#replay-list .replay-row')];
  }

  highlight() {
    const rows = this._rows();
    this.index = clampIndex(this.index, rows.length);
    rows.forEach((r, i) => r.classList.toggle('selected', i === this.index));
  }

  /** 删除按钮二次确认：首次→确认态，再点→删除 */
  _onDelete(btn, m) {
    if (btn.classList.contains('confirming')) {
      this._doDelete(m);
      return;
    }
    this._resetConfirm();
    btn.classList.add('confirming');
    btn.textContent = '再按一次确认删除';
    this._confirmTimer = setTimeout(() => this._resetConfirm(), CONFIRM_RESET_MS);
  }

  _resetConfirm() {
    if (this._confirmTimer) {
      clearTimeout(this._confirmTimer);
      this._confirmTimer = null;
    }
    document.querySelectorAll('#replay-list .replay-del.confirming').forEach((b) => {
      b.classList.remove('confirming');
      b.textContent = '删除';
    });
  }

  async _doDelete(m) {
    try {
      await deleteReplay(m.replayId);
      this.audio.sfx('cancel');
      this._resetConfirm();
      this.load();
    } catch (err) {
      console.error('[replay delete]', err);
    }
  }

  /** 导出单条录像为 JSON 文件 */
  async _exportReplay(m) {
    const statusEl = document.getElementById('replay-status');
    try {
      const replay = await loadReplay(m.replayId);
      if (!replay) throw new Error('not found');
      const text = serializeReplay(replay);
      const name = `owproject-replay-${m.replayId}.json`;
      downloadTextFile(name, text);
      this.audio.sfx('ok');
      if (statusEl) {
        statusEl.classList.remove('error');
        statusEl.textContent = `共 ${this.items.length} 条录像 · Z/Enter 播放 · Del 删除`;
      }
    } catch (err) {
      console.error('[replay export]', err);
      if (statusEl) { statusEl.textContent = '导出失败'; statusEl.classList.add('error'); }
    }
  }

  /** 绑定导入文件选择器（一次） */
  _bindImport() {
    const input = document.getElementById('replay-import-input');
    if (!input || this._importBound) return;
    this._importBound = true;
    input.addEventListener('change', () => {
      const files = [...input.files];
      input.value = '';
      this._importFiles(files);
    });
  }

  /** 触发文件选择器（导入） */
  _importReplays() {
    document.getElementById('replay-import-input')?.click();
  }

  /** 读取并导入若干 JSON 文件 */
  async _importFiles(files) {
    if (!files.length) return;
    let imported = 0;
    let failed = 0;
    const statusEl = document.getElementById('replay-status');
    for (const file of files) {
      try {
        const text = await file.text();
        const res = deserializeReplay(text);
        if (!res.ok) {
          failed++;
          continue;
        }
        // 导入为新的本地条目，避免 replayId 冲突覆盖
        const replay = { ...res.replay, replayId: makeReplayId() };
        await saveReplay(replay);
        imported++;
      } catch (err) {
        console.error('[replay import]', file.name, err);
        failed++;
      }
    }
    this.load();
    if (statusEl) {
      if (imported > 0) {
        statusEl.textContent = `已导入 ${imported} 条录像${failed ? `，${failed} 条失败` : ''}`;
        statusEl.classList.remove('error');
      } else {
        statusEl.textContent = `导入失败（${failed} 个文件无效或版本不符）`;
        statusEl.classList.add('error');
      }
    }
    if (imported > 0) this.audio.sfx('ok');
  }

  handleKey(e) {
    if (isBack(e)) {
      e.preventDefault();
      this.onBack();
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
    if (isConfirm(e)) {
      e.preventDefault();
      rows[this.index]?.querySelector('.replay-item')?.click();
      return true;
    }
    if (e.code === 'Delete' || e.code === 'Backspace') {
      e.preventDefault();
      rows[this.index]?.querySelector('.replay-del')?.click();
      return true;
    }
    return false;
  }
}
