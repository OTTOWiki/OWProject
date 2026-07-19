/**
 * HUD DOM 更新 + 章标题/结算 Canvas 绘制（从 game.js 拆出）
 * DOM 仅在脏字段变化时写入，避免每帧 innerHTML
 */
import { BALANCE, LOGICAL_W, LOGICAL_H, calcLetterBonus } from './config.js';

/** @returns {object} 脏缓存 */
export function createHudCache() {
  return {
    score: null,
    hiscore: null,
    lives: null,
    bombs: null,
    editPct: null,
    editFull: null,
    unstable: null,
    tendency: null,
    chapter: null,
    difficulty: null,
    difficultyColor: null,
    letterRemain: null,
    letterTimer: null,
    letterBonus: null,
    letterBonusOpacity: null,
    letterBannerOpacity: null,
  };
}

function setDots(el, count, className, cacheKey, cache) {
  if (!el) return;
  const n = Math.max(0, count | 0);
  if (cache[cacheKey] === n) return;
  cache[cacheKey] = n;
  if (n === 0) {
    el.textContent = '';
    return;
  }
  let html = '';
  for (let i = 0; i < n; i++) html += `<span class="icon-dot ${className}"></span>`;
  el.innerHTML = html;
}

function setText(el, value, cacheKey, cache) {
  if (!el) return;
  if (cache[cacheKey] === value) return;
  cache[cacheKey] = value;
  el.textContent = value;
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

  setText(el.score, String(Math.floor(game.score)), 'score', cache);
  setText(el.hiscore, String(Math.floor(game.hiscore)), 'hiscore', cache);
  setDots(el.lives, p.lives, 'life', 'lives', cache);
  setDots(el.bombs, p.bombs, 'bomb', 'bombs', cache);

  const pct = (p.edit / BALANCE.editMax) * 100;
  const pctKey = pct.toFixed(1);
  if (cache.editPct !== pctKey) {
    cache.editPct = pctKey;
    if (el.edit) el.edit.style.width = `${pct}%`;
  }
  const full = p.edit >= BALANCE.editMax;
  if (cache.editFull !== full) {
    cache.editFull = full;
    el.edit?.classList.toggle('full', full);
  }

  setText(el.unstable, game.unstableFx ? game.unstableFx.label : '关', 'unstable', cache);
  setText(el.tendency, `${game.totalTendency.toFixed(0)}%`, 'tendency', cache);

  const ch = game.chapters[game.chapterIndex];
  setText(el.chapter, ch ? ch.name : '—', 'chapter', cache);

  if (el.difficulty && game.diff) {
    const dLabel = `${game.diff.rank} ${game.diff.name}`;
    if (cache.difficulty !== dLabel) {
      cache.difficulty = dLabel;
      el.difficulty.textContent = dLabel;
    }
    if (cache.difficultyColor !== game.diff.color) {
      cache.difficultyColor = game.diff.color;
      el.difficulty.style.color = game.diff.color;
    }
  }

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

  const p = game.player;
  if (p) {
    const rx = p.x / LOGICAL_W;
    const ry = p.y / LOGICAL_H;
    const near = Math.max(0, (rx - 0.55) / 0.45) * Math.max(0, (0.42 - ry) / 0.42);
    const op = String(1 - 0.78 * Math.min(1, near));
    if (cache.letterBannerOpacity !== op) {
      cache.letterBannerOpacity = op;
      banner.style.opacity = op;
    }
  }
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
