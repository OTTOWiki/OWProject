/**
 * 版面绘制（从 Game 抽出，行为与原先 _draw* 一致）
 * @param {import('./game.js').Game} game
 */
import { BALANCE, LOGICAL_W, LOGICAL_H } from './config.js';
import {
  drawBullet, drawPlayer, drawEnemy, drawItem, drawCollectLine, setDrawFrameTime,
} from './draw/index.js';

import { drawChapterBanner } from './hud.js';

/** 版面左上角：描画帧率（rAF/设置上限；与固定 60 逻辑步进无关） */
export function drawFps(game, ctx) {
  const fps = game._fps || 0;
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.font = 'bold 12px ui-monospace, Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.fillStyle = fps > 0 && fps < 50 ? '#fbbf24' : '#e2e8f0';
  ctx.strokeText(`${fps} FPS`, 8, 8);
  ctx.fillText(`${fps} FPS`, 8, 8);
  ctx.restore();
}

/** Boss / 道中精英：版面外黑色区域、与 boss 同 x 的 Enemy 标记 */
export function updateBossEnemyMarker(game) {
  const el = game.el?.bossEnemyMarker;
  if (!el) return;

  const boss = game.bossRef;
  const show = !game.endingCinematic
    && boss
    && !boss.dead
    && (game.state === 'playing' || game.state === 'dialogue');

  if (!show) {
    el.classList.add('hidden');
    return;
  }

  const pct = (Math.max(0, Math.min(LOGICAL_W, boss.x)) / LOGICAL_W) * 100;
  el.style.left = `${pct}%`;
  el.classList.remove('hidden');
}

export function drawTendencyGauge(game, ctx) {
  const H = LOGICAL_H;
  const W = LOGICAL_W;
  const barW = 280;
  const barH = 8;
  const barX = (W - barW) / 2;
  const barY = H - 18;
  const centerX = W / 2;

  const val = game.chapterTendency;
  const clamped = Math.max(-BALANCE.tendencyMaxPerChapter, Math.min(BALANCE.tendencyMaxPerChapter, val));
  const pointerX = centerX + (clamped / BALANCE.tendencyMaxPerChapter) * (barW / 2);

  ctx.globalAlpha = 0.85;

  const bgGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
  bgGrad.addColorStop(0, 'rgba(56,189,248,0.5)');
  bgGrad.addColorStop(0.5, 'rgba(148,163,184,0.3)');
  bgGrad.addColorStop(1, 'rgba(251,146,60,0.5)');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(barX, barY, barW, barH, 4);
  else ctx.rect(barX, barY, barW, barH);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX, barY - 2);
  ctx.lineTo(centerX, barY + barH + 2);
  ctx.stroke();

  for (const pct of [-10, -5, 5, 10]) {
    const tx = centerX + (pct / BALANCE.tendencyMaxPerChapter) * (barW / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${pct}%`, tx, barY - 8);
  }

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('A', barX - 8, barY + barH / 2 + 4);

  ctx.fillStyle = '#fb923c';
  ctx.textAlign = 'left';
  ctx.fillText('B', barX + barW + 8, barY + barH / 2 + 4);

  const pd = 5;
  ctx.fillStyle = val < 0 ? '#38bdf8' : val > 0 ? '#fb923c' : '#e2e8f0';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pointerX, barY + barH + 3);
  ctx.lineTo(pointerX + pd, barY + barH + 3 + pd);
  ctx.lineTo(pointerX, barY + barH + 3 + pd * 2);
  ctx.lineTo(pointerX - pd, barY + barH + 3 + pd);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  const numY = barY + barH + pd * 2 + 12;
  ctx.fillText(`${val.toFixed(1)}%`, pointerX, numY);

  ctx.globalAlpha = 1;
}

export function drawGameChapterBanner(game, ctx, W, H) {
  drawChapterBanner(ctx, game.chapterBanner, W, H);
}

/** 关卡（面）过渡页：诗意文案 + 右下角「少女祈祷中...」 */
export function drawStageTransit(game, ctx, W, H) {
  const st = game.stageTransit;
  if (!st) return;
  const dur = st.duration;
  const t = st.t;
  let alpha = 1;
  const fadeIn = 0.45;
  const fadeOut = 0.7;
  if (t < fadeIn) alpha = t / fadeIn;
  else if (t > dur - fadeOut) alpha = Math.max(0, (dur - t) / fadeOut);

  ctx.save();
  ctx.globalAlpha = 0.72 * alpha;
  ctx.fillStyle = '#06050c';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha;

  const cx = W / 2;
  const cy = H * 0.38;

  if (st.arc) {
    ctx.fillStyle = '#d4b56a';
    ctx.font = '18px "Songti SC","SimSun",serif';
    ctx.textAlign = 'center';
    ctx.fillText(st.arc, cx, cy - 36);
  }

  ctx.strokeStyle = 'rgba(212,181,106,0.75)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 90, cy - 18);
  ctx.lineTo(cx + 90, cy - 18);
  ctx.stroke();

  ctx.fillStyle = '#f1e6c8';
  ctx.font = 'bold 24px "Songti SC","SimSun",serif';
  ctx.textAlign = 'center';
  ctx.fillText(st.label || '', cx, cy + 14);

  ctx.fillStyle = '#b8a888';
  ctx.font = '15px "Songti SC","SimSun",serif';
  const poem = String(st.poem || '');
  const lines = [];
  for (const raw of poem.split('\n')) {
    let remain = raw.trim();
    if (!remain) {
      lines.push('');
      continue;
    }
    const maxChars = 18;
    while (remain.length > maxChars) {
      lines.push(remain.slice(0, maxChars));
      remain = remain.slice(maxChars);
    }
    if (remain) lines.push(remain);
  }
  let lineY = cy + 48;
  for (const line of lines) {
    ctx.fillText(line, cx, lineY);
    lineY += 24;
  }

  const pulse = 0.55 + 0.45 * Math.abs(Math.sin((game._drawFrameT || performance.now()) / 700));
  ctx.globalAlpha = alpha * pulse;
  ctx.fillStyle = '#c9b896';
  ctx.font = '13px "Songti SC","SimSun",serif';
  ctx.textAlign = 'right';
  ctx.fillText('少女祈祷中...', W - 18, H - 22);

  ctx.restore();
}

/** 主绘制入口（原 Game._draw） */
export function drawGameFrame(game) {
  const ctx = game.ctx;
  const W = LOGICAL_W;
  const H = LOGICAL_H;
  const frameT = performance.now();
  game._drawFrameT = frameT;
  setDrawFrameTime(frameT);

  if (game.endingCinematic) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    drawFps(game, ctx);
    return;
  }

  if (game.playBg) {
    game.playBg.draw(ctx);
  } else {
    ctx.fillStyle = '#0c1018';
    ctx.fillRect(0, 0, W, H);
  }

  drawCollectLine(ctx, W);

  for (const it of game.items) drawItem(ctx, it);
  for (const e of game.enemies) drawEnemy(ctx, e);

  // 粒子在敌弹之下，避免遮挡弹幕
  for (const pt of game.particles) {
    const t = pt.max > 0 ? Math.max(0, Math.min(1, pt.life / pt.max)) : 0;
    if (pt.grazeFade) {
      // 出生 100% 不透明；ease-out 三次方淡出
      ctx.globalAlpha = 1 - (1 - t) ** 3;
    } else {
      const mul = pt.alphaMul != null ? pt.alphaMul : 1;
      ctx.globalAlpha = Math.min(1, t * mul);
    }
    ctx.fillStyle = pt.color;
    const rr = Math.max(0.5, pt.r);
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const b of game.enemyBullets) drawBullet(ctx, b, 1, game.player);

  if (game.player) drawPlayer(ctx, game.player);

  const pAlpha = game.playerBulletOpacity ?? 0.3;
  for (const b of game.playerBullets) drawBullet(ctx, b, pAlpha);

  if (game.fog && game.player) {
    const g = ctx.createRadialGradient(
      game.player.x, game.player.y, 60,
      game.player.x, game.player.y, 220,
    );
    g.addColorStop(0, 'transparent');
    g.addColorStop(1, 'rgba(5,8,14,0.88)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  if (game.player?.bombTimer > 0) {
    ctx.fillStyle = `rgba(196,181,253,${0.15 * (game.player.bombTimer / BALANCE.bombDuration)})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (game.state === 'playing' && !game.chapterDone) {
    const ch = game.chapters[game.chapterIndex];
    if (ch && typeof ch.stage === 'number' && ch.stage <= 3) {
      drawTendencyGauge(game, ctx);
    }
  }

  updateBossEnemyMarker(game);

  if (game.state === 'routeSelect') {
    ctx.fillStyle = 'rgba(125,211,252,0.25)';
    ctx.beginPath();
    ctx.arc(W * 0.25, H * 0.45, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(251,146,60,0.25)';
    ctx.beginPath();
    ctx.arc(W * 0.75, H * 0.45, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7dd3fc';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A 门构皮蒂娅', W * 0.25, H * 0.45 + 5);
    ctx.fillStyle = '#fb923c';
    ctx.fillText('B 善雅乡', W * 0.75, H * 0.45 + 5);
  }

  if (game.stageTransit) {
    drawStageTransit(game, ctx, W, H);
  }

  if (game.chapterBanner && !game.stageTransit) {
    drawGameChapterBanner(game, ctx, W, H);
  }

  drawFps(game, ctx);
}
