/**
 * HUD DOM 更新 + 章标题/结算 Canvas 绘制（从 game.js 拆出）
 * DOM 仅在脏字段变化时写入，避免每帧 innerHTML
 */
import { BALANCE, LOGICAL_W, LOGICAL_H, calcLetterBonus } from './config.js';

/** @returns {object} 脏缓存 */
export function createHudCache() {
  return {
    score: null,
    scoreCompact: null,
    scoreDetails: null,
    hiscore: null,
    lives: null,
    bombs: null,
    editPct: null,
    editFull: null,
    unstable: null,
    chapterTendency: null,
    chapterTendencyVisible: null,
    tendency: null,
    combo: null,
    comboActive: null,
    chapter: null,
    difficulty: null,
    mode: null,
    playerName: null,
    letterRemain: null,
    letterTimer: null,
    letterBonusOpacity: null,
  };
}
function finiteInteger(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function resourceParts(el, cache, cacheKey, resourceClass) {
  if (!el) return null;
  const refsKey = `${cacheKey}Refs`;
  if (cache[refsKey]) return cache[refsKey];
  const host = el.querySelector('.resource-cells');
  const countEl = el.querySelector('.resource-count');
  const overflowEl = el.querySelector('.resource-overflow');
  if (!host || !countEl || !overflowEl) return null;
  host.setAttribute('aria-hidden', 'true');
  while (host.children.length > 8) host.lastElementChild.remove();
  while (host.children.length < 8) {
    const cell = document.createElement('span');
    cell.className = `resource-cell ${resourceClass}`;
    host.appendChild(cell);
  }
  cache[refsKey] = { cells: [...host.children], countEl, overflowEl };
  return cache[refsKey];
}

function updateResource(el, count, cacheKey, cache, resourceClass) {
  const refs = resourceParts(el, cache, cacheKey, resourceClass);
  if (!refs) return;
  const n = finiteInteger(count);
  if (cache[cacheKey] === n) return;
  cache[cacheKey] = n;

  const filled = Math.min(8, n);
  for (let i = 0; i < refs.cells.length; i++) {
    refs.cells[i].classList.toggle('filled', i < filled);
  }
  refs.countEl.textContent = String(n);
  const overflow = n > 8 ? `+${n - 8}` : '';
  refs.overflowEl.textContent = overflow;
  refs.overflowEl.classList.toggle('hidden', !overflow);
}

function setText(el, value, cacheKey, cache) {
  if (!el) return;
  if (cache[cacheKey] === value) return;
  cache[cacheKey] = value;
  el.textContent = value;
}

function fullScore(value) {
  return String(finiteInteger(value));
}

function compactScore(value) {
  const n = finiteInteger(value);
  if (n < 1000) return String(n);
  const units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [unit, suffix] of units) {
    if (n < unit) continue;
    const scaled = n / unit;
    const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
    const shown = Number(scaled.toFixed(digits));
    return `${shown}${suffix}`;
  }
  return String(n);
}

function tendencyText(value) {
  const n = Number(value);
  const v = Number.isFinite(n) && Math.abs(n) >= 0.05 ? n : 0;
  if (v < 0) return `A ${v.toFixed(1)}%`;
  if (v > 0) return `B +${v.toFixed(1)}%`;
  return '中立 0.0%';
}

function updateModeMarkers(el, game, cache) {
  if (!el.mode) return;
  const mode = String(game.mode || 'story');
  const key = `${game.replaying ? 'replay' : ''}|${mode}`;
  if (cache.mode === key) return;
  cache.mode = key;
  const markers = [
    [el.modeReplay, !!game.replaying],
    [el.modeNomiss, mode === 'nomiss'],
    [el.modePractice, mode === 'practice'],
    [el.modeStage, mode === 'stage'],
  ];
  let active = false;
  for (const [marker, show] of markers) {
    if (!marker) continue;
    marker.classList.toggle('hidden', !show);
    active ||= show;
  }
  el.mode.classList.toggle('hidden', !active);
}

/**
 * 刷新右侧分数板等（脏更新）
 * @param {import('./game.js').Game} game
 */
export function updateGameHud(game) {
  const p = game.player;
  const el = game.el;
  if (!p || !el) return;
  const cache = game._hudCache || (game._hudCache = createHudCache());

  const score = fullScore(game.score);
  setText(el.score, score, 'score', cache);
  setText(el.scoreDetails, score, 'scoreDetails', cache);
  const compact = compactScore(game.score);
  setText(el.scoreCompact, compact, 'scoreCompact', cache);
  if (el.scoreCompact && el.scoreCompact.title !== score) el.scoreCompact.title = score;

  setText(el.hiscore, fullScore(game.hiscore), 'hiscore', cache);
  updateResource(el.lives, p.lives, 'lives', cache, 'life');
  updateResource(el.bombs, p.bombs, 'bombs', cache, 'bomb');

  const rawPct = (Number(p.edit) / Number(BALANCE.editMax || 100)) * 100;
  const pct = Math.max(0, Math.min(100, Number.isFinite(rawPct) ? rawPct : 0));
  const pctKey = pct.toFixed(1);
  if (cache.editPct !== pctKey) {
    cache.editPct = pctKey;
    const pctDisplay = pctKey.endsWith('.0') ? pctKey.slice(0, -2) : pctKey;
    if (el.edit) el.edit.style.width = `${pct}%`;
    if (el.editValue) el.editValue.textContent = `${pctDisplay}%`;
    if (el.editMeter) {
      el.editMeter.setAttribute('aria-valuenow', pctKey);
      el.editMeter.setAttribute('aria-valuetext', `${pctDisplay}%`);
    }
  }
  const full = pct >= 100;
  if (cache.editFull !== full) {
    cache.editFull = full;
    el.edit?.classList.toggle('full', full);
  }

  setText(el.playerName, game.player?.def?.name || '—', 'playerName', cache);
  setText(el.unstable, game.unstableFx ? game.unstableFx.label : '关', 'unstable', cache);
  setText(el.tendency, tendencyText(game.totalTendency), 'tendency', cache);
  const comboActive = game.combo > 1;
  const comboText = comboActive
    ? `${game.combo} ×${(1 + game.combo * BALANCE.combo.perPercent).toFixed(2)}`
    : '—';
  setText(el.combo, comboText, 'combo', cache);
  if (cache.comboActive !== comboActive) {
    cache.comboActive = comboActive;
    el.comboRow?.classList.toggle('active', comboActive);
  }

  const ch = game.chapters[game.chapterIndex];
  const showChapterTendency = typeof ch?.stage === 'number' && ch.stage <= 3;
  setText(el.chapterTendency, `本章 ${tendencyText(game.chapterTendency)}`, 'chapterTendency', cache);
  if (cache.chapterTendencyVisible !== showChapterTendency) {
    cache.chapterTendencyVisible = showChapterTendency;
    el.chapterTendency?.classList.toggle('hidden', !showChapterTendency);
  }
  setText(el.chapter, ch ? ch.name : '—', 'chapter', cache);

  if (el.difficulty && game.diff) {
    const dLabel = `${game.diff.rank} ${game.diff.name}`;
    if (cache.difficulty !== dLabel) {
      cache.difficulty = dLabel;
      el.difficulty.textContent = dLabel;
    }
  }

  updateModeMarkers(el, game, cache);
  updateLetterHud(game);
}

/**
 * Letter 横幅（脏更新）
 * @param {import('./game.js').Game} game
 */
export function updateLetterHud(game) {
  const el = game.el;
  const banner = el?.letterBanner;
  if (!banner || banner.classList.contains('hidden')) return;
  const cache = game._hudCache || (game._hudCache = createHudCache());
  const ch = game.chapters[game.chapterIndex];
  const tLeft = Math.max(0, game.letterTimeLeft);

  if (el.letterRemain && ch) {
    // 经 Game 薄入口，避免 hud ↔ gameCombat 循环依赖
    const { idx, total, remain } = game._letterProgressInStage(ch);
    const text = total > 0 ? `LETTER ${idx}/${total} · 剩余 ${remain}` : '';
    setText(el.letterRemain, text, 'letterRemain', cache);
  }

  if (el.letterTimer) {
    setText(el.letterTimer, `TIME ${tLeft.toFixed(1)}`, 'letterTimer', cache);
  }

  if (el.letterBonus && ch && game.letterTimeMax > 0) {
    const eligible = !game.chapterMiss && !game.chapterBomb && !game.chapterDone;
    const bonus = eligible
      ? calcLetterBonus(ch.stageKey, tLeft, game.letterTimeMax)
      : 0;
    setText(el.letterBonus, `BONUS ${bonus}`, 'letterBonus', cache);
    const op = eligible ? '1' : '0.45';
    if (cache.letterBonusOpacity !== op) {
      cache.letterBonusOpacity = op;
      el.letterBonus.style.opacity = op;
    }
  }

  // 注：letterRate 收率文本由 chapterFlow.startChapter 章首一次性写入 DOM，
  // 不在此每帧读取 localStorage（移动端存储 I/O 会阻塞主线程）。
}

/**
 * 非阻塞章标题 / 结算条
 * @param {CanvasRenderingContext2D} ctx
 * @param {object|null} s chapterBanner
 * @param {number} W
 * @param {number} H
 */
export function drawChapterBanner(ctx, s, W, H) {
  if (!s) return;
  const dur = s.duration || 2.1;
  const t = Math.min(s.t, dur);
  const fadeIn = 0.35;
  const fadeOut = 0.55;
  let alpha = 1;
  if (t < fadeIn) alpha = t / fadeIn;
  else if (t > dur - fadeOut) alpha = Math.max(0, (dur - t) / fadeOut);
  alpha = alpha * alpha * (3 - 2 * alpha);

  ctx.save();
  ctx.globalAlpha = alpha;

  const cx = W / 2;
  const isStart = s.kind === 'start';
  const cy = isStart ? H * 0.28 : H / 2 - 48;

  const drawTitle = (text, y, size = 20, color = '#fbbf24') => {
    ctx.font = `bold ${size}px "Songti SC","SimSun",serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(text, cx, y);
    ctx.fillStyle = color;
    ctx.fillText(text, cx, y);
  };

  drawTitle(s.name || '', cy, 20, '#fbbf24');

  if (isStart) {
    let nextY = cy + 26;
    if (s.letter) {
      drawTitle(s.letter, nextY, 14, '#e9d5ff');
      nextY += 22;
    }
    if (s.unstable) {
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      const line = `Unstable · ${s.unstable}`;
      ctx.strokeText(line, cx, nextY);
      ctx.fillStyle = s.unstableNegative ? '#f9a8d4' : '#c4b5fd';
      ctx.fillText(line, cx, nextY);
      nextY += 16;
      if (s.unstableHint) {
        ctx.font = '11px sans-serif';
        ctx.strokeText(s.unstableHint, cx, nextY);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(s.unstableHint, cx, nextY);
      }
    }
    ctx.restore();
    return;
  }

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  const scoreStr = `${Math.floor(s.score || 0)}`;
  ctx.strokeText(scoreStr, cx, cy + 26);
  ctx.fillText(scoreStr, cx, cy + 26);

  let nextY = cy + 48;

  if (s.letterBonus > 0) {
    ctx.fillStyle = '#f472b6';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`LETTER +${Math.floor(s.letterBonus)}`, cx, nextY);
    nextY += 18;
  }
  if (s.perfect) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 13px sans-serif';
    const mul = s.settleMul > 1 ? s.settleMul : 1.05;
    ctx.fillText(`PERFECT ×${Number(mul).toFixed(2)}`, cx, nextY);
    nextY += 18;
  }
  if (s.unstableComp > 1) {
    ctx.fillStyle = '#c4b5fd';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`Unstable 补偿 ×${s.unstableComp.toFixed(2)}`, cx, nextY);
    nextY += 16;
  }

  if (s.tendency != null) {
    const pct = s.tendency;
    const col = pct < 0 ? '#38bdf8' : pct > 0 ? '#fb923c' : '#94a3b8';
    ctx.fillStyle = col;
    ctx.font = '12px sans-serif';
    ctx.fillText(`倾向 ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, cx, nextY);
    nextY += 16;
  }

  if (s.nextUnstable) {
    ctx.fillStyle = '#a78bfa';
    ctx.font = '12px sans-serif';
    ctx.fillText(`次章: ${s.nextUnstable}`, cx, nextY);
  }

  ctx.restore();
}

/** Unstable 简短操作提示 */
export function unstableHintFor(fx) {
  if (!fx) return '';
  const bits = [];
  if (fx.stack) {
    for (const f of fx.stack) {
      const h = singleUnstableHint(f);
      if (h) bits.push(h);
    }
  } else {
    const h = singleUnstableHint(fx);
    if (h) bits.push(h);
  }
  return bits.join(' · ');
}

function singleUnstableHint(f) {
  if (!f) return '';
  if (f.fog) return '视野受限，贴身看清弹幕';
  if (f.noBomb) return '本章无法使用 Bomb（决死仍可用）';
  if (f.bombCost && f.bombCost > 1) return `Bomb 消耗 ×${f.bombCost}`;
  if (f.atkMul && f.atkMul < 1) return '攻击下降，优先擦弹与走位';
  if (f.atkMul && f.atkMul > 1) return '攻击提升';
  if (f.scoreMul && f.scoreMul < 1) return '得分下降';
  if (f.scoreMul && f.scoreMul > 1) return '得分提升';
  return '';
}
