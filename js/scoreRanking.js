/**
 * 成绩排行结算弹层：游戏结束且入榜时，先展示排行榜 + 本局名次（高亮）+ 可编辑机签，
 * 保存/取消后再进入常规 game over / all clear / 结局 结算。
 */
import { DIFFICULTIES, RANKING_LIMIT } from './config.js';
import { loadRanking, commitRankingEntry, loadName } from './ranking.js';

const ROUTE_LABEL = { A: 'A线', B: 'B线', EX: 'EX' };

let bound = false;
let done = null;

/** 绑定保存/取消按钮（一次） */
export function bindScoreRanking(game) {
  if (bound) return;
  bound = true;
  document.querySelector('[data-sr-action="save"]')?.addEventListener('click', () => save(game));
  document.querySelector('[data-sr-action="cancel"]')?.addEventListener('click', () => cancel(game));
}

/** 是否正在展示成绩排行弹层 */
export function isScoreRankingOpen() {
  const el = document.getElementById('score-ranking');
  return !!el && !el.classList.contains('hidden');
}

/** 打开成绩排行弹层；未入榜则直接 onDone */
export function openScoreRanking(game, onDone) {
  const res = game._rankingResult;
  if (!res || !res.qualifies) {
    onDone?.();
    return;
  }
  done = onDone || null;
  game.paused = true;
  game.state = 'gameover';
  render(game);
  document.getElementById('score-ranking')?.classList.remove('hidden');
  game._srFocusIndex = 0;
  highlight(game);
}

/** 键盘导航：↑↓ 选择 · Z/Enter 确认 · Esc/X 取消。返回是否已处理。 */
export function handleScoreRankingKey(game) {
  if (document.activeElement?.classList.contains('sr-name-input')) return false;
  const btns = [...document.querySelectorAll('[data-sr-action]')];
  if (!btns.length) return false;
  const i = game._srFocusIndex || 0;
  const input = game.input;

  if (input.justPressed('ArrowDown') || input.justPressed('KeyS')) {
    game._srFocusIndex = (i + 1) % btns.length;
    highlight(game);
    return true;
  }
  if (input.justPressed('ArrowUp') || input.justPressed('KeyW')) {
    game._srFocusIndex = (i - 1 + btns.length) % btns.length;
    highlight(game);
    return true;
  }
  if (input.justPressed('Enter') || input.justPressed('KeyZ') || input.justPressed('Space')) {
    btns[i]?.click();
    return true;
  }
  if (input.justPressed('Escape') || input.justPressed('KeyX')) {
    document.querySelector('[data-sr-action="cancel"]')?.click();
    return true;
  }
  return false;
}

function save(game) {
  const name = document.querySelector('#score-ranking .sr-name-input')?.value ?? '';
  commitRankingEntry(game._rankingResult, name);
  close(game);
}

function cancel(game) {
  if (game._rankingResult) game._rankingResult.qualifies = false; // 跳过，不写盘
  close(game);
}

function close(game) {
  document.getElementById('score-ranking')?.classList.add('hidden');
  const cb = done;
  done = null;
  cb?.();
}

function render(game) {
  const res = game._rankingResult;
  const diff = DIFFICULTIES[res.difficultyId];
  const diffEl = document.getElementById('sr-diff');
  if (diffEl) diffEl.textContent = `${diff.rank} ${diff.name}`;

  const entry = { ...res.entry, name: loadName(res.entry.playerName) };
  const list = (loadRanking()[res.difficultyId] || []).slice();
  list.splice(res.rank, 0, entry);
  const top = list.slice(0, RANKING_LIMIT);

  const listEl = document.getElementById('sr-list');
  if (listEl) {
    listEl.innerHTML = '';
    top.forEach((e, i) => listEl.appendChild(row(e, i, i === res.rank)));
  }
}

function row(e, i, isCurrent) {
  const r = document.createElement('div');
  r.className = 'sr-row' + (isCurrent ? ' is-current' : '');
  const rank = document.createElement('span');
  rank.className = 'sr-rank';
  rank.textContent = String(i + 1);

  let name;
  if (isCurrent) {
    // 本局机签直接在排行榜行内可编辑
    name = document.createElement('input');
    name.type = 'text';
    name.className = 'sr-name sr-name-input';
    name.maxLength = 3;
    name.autocomplete = 'off';
    name.value = e.name;
  } else {
    name = document.createElement('span');
    name.className = 'sr-name';
    name.textContent = e.name;
  }

  const player = document.createElement('span');
  player.className = 'sr-player';
  player.textContent = e.playerName || '';
  const route = document.createElement('span');
  route.className = 'sr-route';
  route.textContent = ROUTE_LABEL[e.route] || (e.cleared ? '通关' : '—');
  const score = document.createElement('span');
  score.className = 'sr-score';
  score.textContent = String(e.score ?? 0);
  r.append(rank, name, player, route, score);
  return r;
}

function highlight(game) {
  const btns = [...document.querySelectorAll('[data-sr-action]')];
  btns.forEach((b, i) => b.classList.toggle('selected', i === (game._srFocusIndex || 0)));
}
