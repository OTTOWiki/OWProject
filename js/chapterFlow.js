/**
 * 章节生命周期 / 对话 / 路线与结局（从 Game 抽出）
 * @param {import('./game.js').Game} game
 */
import {
  BALANCE, SPEAKER_COLORS,
  rollUnstableEffects, unstableStackCount, calcLetterBonus, unstableCompMul,
} from './config.js';
import { stageIntroFor } from './stages/index.js';
import { getEndingDialogue } from './dialogue.js';
import { saveHiscore, unlockStage, unlockRoute, saveNomissProgress } from './storage.js';
import { loadRanking, rankFor, loadName } from './ranking.js';
import { openScoreRanking } from './scoreRanking.js';
import { trackForStage } from './audio.js';
import { bgModeFor } from './bgModes.js';
import { portraitFor } from './assets.js';
import { unstableHintFor, updateGameHud, updateLetterHud } from './hud.js';
import { debugSkipDialogue } from './debug.js';
import { releaseBulletList } from './bulletPool.js';
import { releaseItemList } from './itemPool.js';
import { releaseParticleList } from './particlePool.js';
import { bulletsToPointsAndAttract, checkExtend, grantLetterResource, addScore } from './gameCombat.js';
import { openResult, localStatsText } from './gameOverlay.js';

export function wrapWaveFn(game, raw) {
  return (dt) => {
    const beforeLen = game.enemies.length;
    const beforeWc = game.waveCount || 0;
    raw.call(game, dt);
    const afterLen = game.enemies.length;
    const afterWc = game.waveCount || 0;
    if (afterLen > beforeLen) {
      game._hadWaveEnemySpawn = true;
      game._lastEnemySpawnChapterTime = game.chapterTime;
      game.wavesExhausted = false;
      game._dryWaveTicks = 0;
    } else if (afterWc > beforeWc) {
      game._dryWaveTicks = (game._dryWaveTicks || 0) + 1;
      if (game._hadWaveEnemySpawn && game._dryWaveTicks >= 1) {
        game.wavesExhausted = true;
      }
    }
  };
}

export function softClearForNextChapter(game, { convert = true } = {}) {
  if (convert) {
    // 敌弹变点 + 吸道具；随后清空敌弹表并归还池
    bulletsToPointsAndAttract(game);
  }
  releaseBulletList(game.enemyBullets);
  game._purgeDeadBullets?.();
  if (game.enemies) game.enemies.length = 0;
  else game.enemies = [];
  game.bossRef = null;
}

export function startChapter(game) {
  const ch = game.chapters[game.chapterIndex];
  if (!ch) {
    gameClear(game);
    return;
  }

  softClearForNextChapter(game, { convert: false });

  game.waveFn = null;
  game.waveTimer = 0;
  game.waveCount = 0;
  game._lastWaveCount = 0;
  game._waveStall = 0;
  game.wavesExhausted = false;
  game._hadWaveEnemySpawn = false;
  game._dryWaveTicks = 0;
  game._lastEnemySpawnChapterTime = -999;
  game.rainT = 0;
  game.laserT = 0;
  game.chapterTime = 0;
  game.chapterScore = 0;
  game.chapterMiss = false;
  game.chapterBomb = false;
  game.chapterDone = false;
  game.chapterClearTimer = 0;
  game.chapterTendency = 0;
  game.stageTransit = null;
  game._pendingChapterBegin = null;

  game.unstableFx = null;
  game.fog = false;
  game.noBomb = false;
  game.bombCost = 1;
  game.atkMul = 1;
  game.scoreMul = 1;
  const useUnstable = ch.unstable && (game.mode === 'practice' ? game.practiceUnstable : true);
  if (useUnstable) {
    game.unstableFx = game.nextUnstableFx
      || rollUnstableEffects(unstableStackCount(ch.stageKey));
    game.nextUnstableFx = null;
    game.atkMul = game.unstableFx.atkMul || 1;
    game.scoreMul = game.unstableFx.scoreMul || 1;
    game.fog = !!game.unstableFx.fog;
    game.noBomb = !!game.unstableFx.noBomb;
    game.bombCost = game.unstableFx.bombCost || 1;
  }

  // Nomiss：快照本章开头的 Unstable 异常，被弹重开时经 nextUnstableFx 还原（BGM 位置由 game.js 逐帧记录）
  if (game.mode === 'nomiss') game._nomissSnapshot = { unstableFx: game.unstableFx };

  game.letterTimeMax = ch.letterTime || 0;
  game.letterTimeLeft = game.letterTimeMax;
  game.isBossChapter = ch.kind === 'boss' || ch.kind === 'midboss';

  const isBoss = ch.kind === 'boss';
  game.audio.playTrack(ch.music || trackForStage(ch.stageKey, isBoss), isBoss);
  const bgMode = ch.bg || bgModeFor(ch.stageKey, isBoss);
  game.background?.setMode(bgMode);
  const doTrans = game._lastBgMode != null && game._lastBgMode !== bgMode;
  game.playBg.setMode(bgMode, { transition: doTrans });
  game._lastBgMode = bgMode;
  game.el.stageLabel.textContent = typeof ch.stage === 'number' ? `Stage ${ch.stage}` : String(ch.stage);

  if (ch.letter) {
    game.el.letterBanner.classList.remove('hidden');
    game.el.letterBanner.style.opacity = '1';
    game.el.letterName.textContent = ch.letter;
    updateLetterHud(game);
    game.audio.sfx('letter');
  } else {
    game.el.letterBanner.classList.add('hidden');
    if (game.el.letterBonus) game.el.letterBonus.textContent = '';
  }

  const afterBuild = () => {
    try {
      ch.build(game);
    } catch (err) {
      console.error('[chapter build]', ch?.id, ch?.name, err);
      game.waveFn = null;
    }
    if (game.waveFn) {
      const raw = game.waveFn;
      const scaled = (dt) => {
        try {
          raw.call(game, dt / game.spawnMul);
        } catch (err) {
          console.error('[waveFn]', ch?.id, err);
          game.waveFn = null;
        }
      };
      game.waveFn = wrapWaveFn(game, scaled);
    } else {
      game.wavesExhausted = true;
    }
    if (game.enemies.length > 0) {
      game._hadWaveEnemySpawn = true;
      game._lastEnemySpawnChapterTime = game.chapterTime;
    }
    for (const e of game.enemies) {
      e._fireMul = game.fireIntervalMul;
    }
  };

  const showStartTitle = () => {
    const fx = game.unstableFx;
    const title = {
      kind: 'start',
      name: ch.name,
      letter: ch.letter || '',
      unstable: fx ? fx.label : '',
      unstableHint: fx ? unstableHintFor(fx) : '',
      unstableNegative: !!(fx && fx.negative),
      t: 0,
      duration: fx ? 2.4 : 2.0,
    };
    if (game.chapterBanner && game.chapterBanner.kind === 'end') {
      game._queuedStartTitle = title;
      return;
    }
    game._queuedStartTitle = null;
    game.chapterBanner = title;
  };

  const beginChapterContent = () => {
    game._pendingChapterBegin = null;
    game.stageTransit = null;
    showStartTitle();
    if (ch.dialogue && game.dialogues[ch.dialogue]) {
      openDialogue(game, game.dialogues[ch.dialogue], afterBuild);
    } else {
      game.state = 'playing';
      afterBuild();
    }
  };

  const sk = String(ch.stageKey);
  if (sk !== game.lastStageKey) {
    game.lastStageKey = sk;
    const info = stageIntroFor(sk);
    if (info) {
      game.stageTransit = {
        arc: info.arc || '',
        label: info.label || '',
        poem: info.poem || '',
        t: 0,
        duration: 3.6,
      };
      game.state = 'stageTransit';
      game._pendingChapterBegin = beginChapterContent;
      updateGameHud(game);
      return;
    }
  }

  beginChapterContent();
  updateGameHud(game);
}

export function openDialogue(game, lines, after) {
  if (debugSkipDialogue()) {
    game.el.dialogueBox?.classList.add('hidden');
    game.state = 'playing';
    after?.();
    return;
  }
  game.state = 'dialogue';
  game.dialogueQueue = lines;
  game.dialogueIdx = 0;
  game.pendingAfterDialogue = after;
  showDialogueLine(game);
}

export function showDialogueLine(game) {
  const line = game.dialogueQueue[game.dialogueIdx];
  if (!line) {
    game.el.dialogueBox.classList.add('hidden');
    game.state = 'playing';
    const cb = game.pendingAfterDialogue;
    game.pendingAfterDialogue = null;
    cb?.();
    return;
  }
  game.el.dialogueBox.classList.remove('hidden');
  const name = line.name;
  game.el.dialogueName.textContent = name;
  game.el.dialogueName.style.color = SPEAKER_COLORS[name] || '#e2e8f0';
  game.el.dialogueText.innerHTML = line.text;

  const img = game.el.dialoguePortrait;
  if (img) {
    const path = portraitFor(name);
    if (path) {
      img.src = path;
      img.classList.remove('hidden');
      img.alt = name;
    } else {
      img.classList.add('hidden');
      img.removeAttribute('src');
    }
  }
}

export function advanceDialogue(game) {
  game.dialogueIdx++;
  showDialogueLine(game);
}

export function finishChapter(game, success) {
  if (game.chapterDone) return;
  game.chapterDone = true;
  const ch = game.chapters[game.chapterIndex];
  const clean = !game.chapterMiss && !game.chapterBomb;
  const perfect = success && clean;

  const baseChapter = game.chapterScore;
  let settleMul = 1;
  let unstableComp = 1;
  if (perfect) {
    settleMul *= BALANCE.chapterPerfectMul;
    unstableComp = unstableCompMul(game.unstableFx);
    if (unstableComp > 1) settleMul *= unstableComp;
    if (settleMul > 1 && baseChapter > 0) {
      const bonus = Math.floor(baseChapter * (settleMul - 1));
      if (bonus > 0) {
        game.score += bonus;
        game.chapterScore += bonus;
        const dm = game.diffScoreMul || 1;
        game.baseScore += Math.floor(bonus / dm);
        if (game.score > game.hiscore) game.hiscore = game.score;
        checkExtend(game);
      }
    }
  }

  let letterBonus = 0;
  if (perfect && game.letterTimeMax > 0 && (ch.kind === 'boss' || ch.kind === 'midboss')) {
    letterBonus = calcLetterBonus(ch.stageKey, game.letterTimeLeft, game.letterTimeMax);
    if (letterBonus > 0) addScore(game, letterBonus);
    grantLetterResource(game, ch, true, true);
  }

  if (perfect && unstableComp >= (BALANCE.resource.unstableCompBombMin ?? 1.15)) {
    game.player.bombs = Math.min(BALANCE.maxBombs, game.player.bombs + 1);
    game.audio.sfx('item');
  }

  if (letterBonus > 0) {
    game.el.bonus.textContent = `Letter +${letterBonus}`;
  } else if (perfect && unstableComp > 1) {
    game.el.bonus.textContent = `NMNB ×${settleMul.toFixed(2)}`;
  } else if (perfect) {
    game.el.bonus.textContent = 'Perfect ×1.05';
  } else {
    game.el.bonus.textContent = '—';
  }

  let tendencyContrib = null;
  if (typeof ch.stage === 'number' && ch.stage <= 3) {
    if (Math.abs(game.chapterTendency) < BALANCE.tendencyMinPerChapter) {
      tendencyContrib = 0;
    } else {
      tendencyContrib = game.chapterTendency;
    }
    game.totalTendency += tendencyContrib;
    game.chapterTendency = 0;
  }

  game.chapterBanner = {
    kind: 'end',
    name: ch.name,
    score: game.chapterScore,
    perfect,
    letterBonus,
    unstableComp: perfect && unstableComp > 1 ? unstableComp : 0,
    settleMul: perfect ? settleMul : 1,
    tendency: tendencyContrib,
    t: 0,
    duration: 2.1,
  };

  game.nextUnstableFx = null;
  let nextIdx = game.chapterIndex + 1;
  while (nextIdx < game.chapters.length) {
    const nc = game.chapters[nextIdx];
    if (!game.routeChoice) break;
    const sk = String(nc.stageKey);
    if ((sk.startsWith('A') && game.routeChoice !== 'A') ||
        (sk.startsWith('B') && game.routeChoice !== 'B') ||
        sk === 'patrol') { nextIdx++; continue; }
    break;
  }
  if (nextIdx < game.chapters.length && game.chapters[nextIdx].unstable) {
    const nc = game.chapters[nextIdx];
    game.nextUnstableFx = rollUnstableEffects(unstableStackCount(nc.stageKey));
    game.chapterBanner.nextUnstable = game.nextUnstableFx.label;
  }

  softClearForNextChapter(game, { convert: true });

  const NEXT_DELAY_SEC = 0.8;

  if (game.singleChapter || game.mode === 'practice') {
    scheduleAdvance(game, NEXT_DELAY_SEC, () => {
      openResult(game, {
        title: '练习结束',
        body: `难度：${game.diff.rank} ${game.diff.name}\n章节：${ch.name}\n得分：${game.score}\n${perfect ? 'Perfect Clear!' : ''}`,
        retryChapter: ch.id,
      });
    });
    return;
  }

  if (typeof ch.stage === 'number' && !game.replaying) unlockStage(ch.stage + 1);

  if (ch.onClear === 'routeCheck') {
    scheduleAdvance(game, NEXT_DELAY_SEC, () => afterStage3(game));
    return;
  }
  if (ch.onClear === 'routeSelect') {
    scheduleAdvance(game, NEXT_DELAY_SEC, () => {
      openDialogue(game, game.dialogues.patrol_win || [], () => enterRouteSelect(game));
    });
    return;
  }

  if (ch.winDialogue && game.dialogues[ch.winDialogue]) {
    scheduleAdvance(game, NEXT_DELAY_SEC, () => {
      openDialogue(game, game.dialogues[ch.winDialogue], () => nextChapterOrEnd(game, ch));
    });
    return;
  }

  if (ch.ending) {
    scheduleAdvance(game, NEXT_DELAY_SEC, () => showEnding(game, ch.ending));
    return;
  }

  scheduleAdvance(game, NEXT_DELAY_SEC, () => {
    game.chapterIndex++;
    skipToValidChapter(game);
    // Nomiss：进度持久化为下一章 id（到末尾无章则 null）
    if (game.mode === 'nomiss' && !game.replaying) {
      saveNomissProgress(game.chapters[game.chapterIndex]?.id ?? null);
    }
    startChapter(game);
  });
}

export function scheduleAdvance(game, sec, fn) {
  game._advanceWait = {
    left: Math.max(0, Number(sec) || 0),
    fn,
  };
}

export function cancelAdvance(game) {
  game._advanceWait = null;
}

export function tickAdvance(game, dt) {
  const w = game._advanceWait;
  if (!w) return;
  w.left -= dt;
  if (w.left > 0) return;
  game._advanceWait = null;
  if (!game.running) return;
  w.fn?.();
}

export function nextChapterOrEnd(game, ch) {
  if (ch.ending) {
    showEnding(game, ch.ending);
    return;
  }
  game.chapterIndex++;
  skipToValidChapter(game);
  startChapter(game);
}

export function skipToValidChapter(game) {
  while (game.chapterIndex < game.chapters.length) {
    const c = game.chapters[game.chapterIndex];
    if (!game.routeChoice) break;
    const sk = String(c.stageKey);
    if (sk.startsWith('A') && game.routeChoice !== 'A') {
      game.chapterIndex++;
      continue;
    }
    if (sk.startsWith('B') && game.routeChoice !== 'B') {
      game.chapterIndex++;
      continue;
    }
    if (sk === 'patrol') {
      game.chapterIndex++;
      continue;
    }
    break;
  }
}

export function afterStage3(game) {
  const t = game.totalTendency;
  const need = BALANCE.tendencyThreshold;
  if (t <= -need) {
    game.routeChoice = 'A';
    if (!game.replaying) unlockRoute('A');
    jumpToStage(game, 'A4');
  } else if (t >= need) {
    game.routeChoice = 'B';
    if (!game.replaying) unlockRoute('B');
    jumpToStage(game, 'B4');
  } else {
    const patrolIdx = game._chapterIndexByStageAny.get('patrol');
    if (patrolIdx != null) {
      game.chapterIndex = patrolIdx;
      startChapter(game);
    } else {
      enterRouteSelect(game);
    }
  }
}

export function enterRouteSelect(game) {
  game.state = 'routeSelect';
  game.el.dialogueBox.classList.remove('hidden');
  game.el.dialogueName.textContent = '系统';
  game.el.dialogueName.style.color = SPEAKER_COLORS['系统'];
  game.el.dialogueText.textContent = '← A线 门构皮蒂娅　　B线 善雅乡 →\n（点左侧 A / 右侧 B，或方向键）';
}

export function chooseRoute(game, route) {
  game.routeChoice = route;
  if (!game.replaying) unlockRoute(route);
  game.el.dialogueBox.classList.add('hidden');
  game.state = 'playing';
  jumpToStage(game, route === 'A' ? 'A4' : 'B4');
}

export function jumpToStage(game, stageKey) {
  const sk = String(stageKey);
  let idx = game._chapterIndexByStageMid.get(sk);
  if (idx == null) idx = game._chapterIndexByStageAny.get(sk);
  game.chapterIndex = idx != null ? idx : 0;
  startChapter(game);
}

export function setEndingCinematic(game, on) {
  game.endingCinematic = !!on;
  document.getElementById('screen-game')?.classList.toggle('ending-cinematic', !!on);
  if (on) {
    game.el.letterBanner?.classList.add('hidden');
    game.enemies.length = 0;
    releaseBulletList(game.playerBullets);
    releaseBulletList(game.enemyBullets);
    releaseItemList(game.items);
    releaseParticleList(game.particles);
    game._grazeParticleCount = 0;
    game.bossRef = null;
    game.waveFn = null;
    game.chapterDone = true;
  }
}

export function showEnding(game, which) {
  if (game.replaying) { game._showReplayEnd(); return; }
  saveHiscore(game.score);
  const isNomiss = game.mode === 'nomiss';
  if (!isNomiss) submitRanking(game, { cleared: true });
  game.audio.stopMusic(0.8);
  const title = which === 'A'
    ? '结局A · 不倒闭的真理'
    : which === 'EX'
      ? 'Extra 结局 · 清出键政'
      : '结局B · 散去的幻影';
  const lines = getEndingDialogue(which, game.playerId);
  setEndingCinematic(game, true);
  openDialogue(game, lines, () => {
    setEndingCinematic(game, false);
    if (isNomiss) {
      // 通关后清空进度，下轮从头
      saveNomissProgress(null);
      openResult(game, {
        title: 'Nomiss 完成',
        body: `难度：${game.diff.rank} ${game.diff.name}\n最终得分：${game.score}\n${localStatsText(game.stats)}`,
        actions: ['menu'],
      });
      return;
    }
    let retryChapter = 1;
    if (which === 'EX') {
      const exIdx = game._chapterIndexByStageAny.get('EX');
      retryChapter = exIdx != null ? game.chapters[exIdx]?.id : 1;
    }
    const openFinal = () => openResult(game, {
      title,
      body: `难度：${game.diff.rank} ${game.diff.name}\n最终得分：${game.score}`,
      retryChapter,
    });
    openScoreRanking(game, openFinal);
  });
}

export function gameOver(game) {
  if (game.replaying) { game._showReplayEnd(); return; }
  if (game.mode === 'nomiss') {
    // 不应走到（miss 已被 nomissRestart 劫持）；兜底为手动结算语义
    const ch = game.chapters[game.chapterIndex];
    saveHiscore(game.score);
    openResult(game, {
      title: 'Nomiss 结算',
      body: `难度：${game.diff.rank} ${game.diff.name}\n章节：${ch?.name ?? '—'}\n得分：${game.score}\n${localStatsText(game.stats)}`,
      retryChapter: ch?.id ?? 1,
    });
    return;
  }
  const ch = game.chapters[game.chapterIndex];
  saveHiscore(game.score);
  submitRanking(game, { cleared: false });
  const body = `难度：${game.diff.rank} ${game.diff.name}\n章节：${ch.name}\n得分：${game.score}\n倾向：${game.totalTendency.toFixed(0)}%`;
  const show = () => {
    game.audio.stopMusic(0.6);
    const openFinal = () => openResult(game, {
      title: 'Game Over',
      body,
      retryChapter: ch.id,
    });
    openScoreRanking(game, openFinal);
  };
  if (ch.loseDialogue && game.dialogues[ch.loseDialogue]) {
    openDialogue(game, game.dialogues[ch.loseDialogue], show);
  } else {
    show();
  }
}

export function gameClear(game) {
  if (game.replaying) { game._showReplayEnd(); return; }
  saveHiscore(game.score);
  game.audio.stopMusic(0.8);
  if (game.mode === 'nomiss') {
    // Nomiss：不入榜、不弹排行榜，直接结算
    openResult(game, {
      title: 'All Clear',
      body: `全关卡完成！\n难度：${game.diff.rank} ${game.diff.name}\n得分：${game.score}\n${localStatsText(game.stats)}`,
      retryChapter: 1,
    });
    return;
  }
  submitRanking(game, { cleared: true });
  const openFinal = () => openResult(game, {
    title: 'All Clear',
    body: `全关卡完成！\n难度：${game.diff.rank} ${game.diff.name}\n得分：${game.score}`,
    retryChapter: 1,
  });
  openScoreRanking(game, openFinal);
}

/* ========== 本地排行榜（与录像完全独立） ========== */

/**
 * 对局结束统一入榜判定。练习 / Nomiss 不入榜。
 * 仅预判名次并暂存到 game._rankingResult，真正写盘在成绩排行屏「保存」时（scoreRanking → ranking.js commitRankingEntry）。
 */
export function submitRanking(game, { cleared = false } = {}) {
  game._endCleared = !!cleared;
  if (game.mode === 'practice' || game.mode === 'nomiss') {
    game._rankingResult = null;
    return null;
  }
  const difficultyId = game.difficultyId;
  const playerName = game.player?.def?.name || '';
  const entry = {
    score: game.score,
    name: loadName(playerName),
    playerId: game.playerId,
    playerName,
    difficultyId,
    mode: game.mode,
    route: game.routeChoice || (game.mode === 'extra' ? 'EX' : null),
    cleared: !!cleared,
    stageReached: game.el?.stageLabel?.textContent || '',
    date: Date.now(),
  };
  const list = loadRanking()[difficultyId] || [];
  const rank = rankFor(list, entry.score);
  if (rank < 0) {
    game._rankingResult = { qualifies: false };
    return null;
  }
  game._rankingResult = { qualifies: true, difficultyId, entry, rank };
  return entry;
}
