/**
 * 战斗帧更新与资源/得分（从 Game 抽出）
 * @param {import('./game.js').Game} game
 */
import { BALANCE, LOGICAL_W, nextExtendThreshold } from './config.js';
import { Item, Particle } from './entities.js';
import {
  spawnPlayerShot, fullScreenClear, clearBulletsToItems, spawnBombOrbs,
} from './patterns.js';
import { runCollisions, rebuildBulletLists } from './collision.js';
import {
  debugBlocksHit, debugLocksLives, debugLocksBombs, debugAutoEdit,
} from './debug.js';

/**
 * 消费 collision 事件：得分 / 掉落 / 粒子 / onDeath / 擦弹 / 中弹
 * 须在 runCollisions 之后、purge 敌机之前调用（onDeath 依赖实体仍在场上）
 * @param {import('./game.js').Game} game
 * @param {import('./collision.js').CollisionEvent[]} events
 */
export function applyCollisionEvents(game, events) {
  if (!events || !events.length) return;
  const p = game.player;
  for (const ev of events) {
    if (ev.type === 'kill') {
      const e = ev.enemy;
      game.addScore(e.score);
      game._burst(e.x, e.y, e.color, 12);
      const drop = e.drop || game._defaultKillDrop(e);
      if (drop) game.spawnItem(e.x, e.y, drop);
      else if (Math.random() < 0.35) game.spawnItem(e.x, e.y, 'score');
      e.fireOnDeath?.(game);
    } else if (ev.type === 'graze') {
      if (!p) continue;
      p.edit = Math.min(BALANCE.editMax, p.edit + BALANCE.editPerGraze * (game.grazeMul || 1));
      game.addScore(BALANCE.score.graze);
      // 擦弹白粒子：自机附近较大范围、正圆；出生 100% 不透明，飞出后非线性淡出
      for (let i = 0; i < 12; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spread = 6 + Math.random() * 22;
        const gx = p.x + Math.cos(ang) * spread * 0.35;
        const gy = p.y + Math.sin(ang) * spread * 0.35;
        const pt = new Particle(gx, gy, '#ffffff', 0.28 + Math.random() * 0.16);
        // 正圆半径（绘制仅用 arc，禁止非等比缩放）
        pt.r = 2.0 + Math.random() * 1.6;
        const spd = 1.4 + Math.random() * 2.4;
        pt.vx = Math.cos(ang) * spd;
        pt.vy = Math.sin(ang) * spd;
        pt.grazeFade = true;
        game.particles.push(pt);
      }
      if (Math.random() < 0.2) game.audio.sfx('graze');
    } else if (ev.type === 'playerHit') {
      game._hitPlayer();
    }
  }
}

/**
 * 场上敌弹 → 得分道具，并锁定吸引（章间/Bomb 同款手感）
 * 不重置自机位置，不抹掉自机弹与已有道具。
 */
export function bulletsToPointsAndAttract(game) {
  fullScreenClear(game);
  if (game.items?.length) {
    for (const it of game.items) {
      if (!it.dead) it.attract = true;
    }
  }
}

export function updateStageTransit(game, dt) {
  const p = game.player;
  if (p) {
    p.update(dt, game.input);
    // 过渡中仍可移动，但不射击/不碰伤
    for (const it of game.items) {
      it.update(dt, p, true);
      if (Math.hypot(it.x - p.x, it.y - p.y) < it.r + (BALANCE.itemPickupRadius ?? 20)) {
        it.dead = true;
        collectItem(game, it);
      }
    }
    for (const b of game.bullets) {
      if (b.from === 'player') b.update(dt, p, null);
    }
    for (const pt of game.particles) pt.update(dt);
    game._purgeDead(game.bullets);
    game.items = game.items.filter((i) => !i.dead);
    game.particles = game.particles.filter((pt) => !pt.dead);
  }

  tickChapterBanner(game, dt);

  if (game.stageTransit) {
    game.stageTransit.t += dt;
    if (game.stageTransit.t >= game.stageTransit.duration) {
      const begin = game._pendingChapterBegin;
      game.stageTransit = null;
      game._pendingChapterBegin = null;
      begin?.();
    }
  }
  game._updateHUD();
}

export function updateCombat(game, dt) {
  const p = game.player;
  const ch = game.chapters[game.chapterIndex];
  const settling = !!game.chapterDone;

  if (debugAutoEdit() && p) p.edit = BALANCE.editMax;

  // 决死 Bomb：在审核窗口内优先处理
  let deathSaved = false;
  if (!settling && p.arbitration > 0) {
    game.el.flash.classList.remove('hidden');
    game.el.flash.textContent = '违规编辑！';
    game._flashTimer = 0;
    if (game.input.bombPressed() && tryBomb(game, true)) {
      p.arbitration = 0;
      deathSaved = true;
      game.el.flash.classList.add('hidden');
    }
  } else if (game._flashTimer > 0) {
    game._flashTimer -= dt;
    if (game._flashTimer <= 0) {
      game._flashTimer = 0;
      game.el.flash.classList.add('hidden');
    }
  }

  const arbBefore = p.arbitration;
  p.update(dt, game.input);

  // 审核窗口结束且未决死成功 → Miss
  if (!settling && arbBefore > 0 && p.arbitration <= 0 && !deathSaved) {
    game.el.flash.classList.add('hidden');
    miss(game);
    if (!game.running || game.player.lives < 0) return;
  }

  // tendency (stage 1-3 only): pointer drifts toward side based on player position
  if (!settling && typeof ch.stage === 'number' && ch.stage <= 3) {
    const cx = LOGICAL_W / 2;
    const offset = p.x - cx;
    if (Math.abs(offset) > 2) {
      const dir = offset > 0 ? 1 : -1;
      const speed = (Math.abs(offset) / cx) * BALANCE.tendencySpeed * dt;
      game.chapterTendency += dir * speed;
    }
    game.chapterTendency = Math.max(-BALANCE.tendencyMaxPerChapter,
      Math.min(BALANCE.tendencyMaxPerChapter, game.chapterTendency));
  }

  // 章结算期间：可移动、吸点；不射击、不刷怪、不受伤
  if (!settling) {
    // shot（toggle 模式在此帧更新锁存）
    game.input.updateShotToggle();
    if (game.input.shotHeld() && p.shotCd <= 0 && p.arbitration <= 0) {
      spawnPlayerShot(game, p);
      p.shotCd = BALANCE.playerShotCooldown;
      if (Math.random() < 0.15) game.audio.sfx('shot');
    }

    // bomb（非决死）
    if (game.input.bombPressed() && p.arbitration <= 0) {
      tryBomb(game, false);
    }

    // item / edit war
    if (game.input.itemPressed() && p.edit >= BALANCE.editMax && p.arbitration <= 0) {
      p.edit = 0;
      clearBulletsToItems(game, p.x, p.y, BALANCE.editClearRadius);
      game.audio.sfx('item');
      burst(game, p.x, p.y, p.def.color, 24);
    }

    // waves
    game.waveFn?.(dt);

    // enemies（击杀 onDeath 在 applyCollisionEvents 触发；此处不跑，避免屏外消失误触发）
    for (const e of game.enemies) {
      try {
        e.update(dt, game);
      } catch (err) {
        console.error('[enemy script]', e?.label || e?.kind, err);
        e.script = null;
      }
    }
  }

  // 最近敌机 → 子机追踪目标；Bomb 巨弹按 slot 分摊（本帧复用给碰撞）
  let homeTarget = null;
  let bestD = Infinity;
  const homeList = [];
  for (const e of game.enemies) {
    if (e.dead || e.isSpawning) continue;
    homeList.push(e);
    const d = Math.hypot(e.x - p.x, e.y - p.y) + (e.y > p.y ? 80 : 0);
    if (d < bestD) {
      bestD = d;
      homeTarget = e;
    }
  }
  game._homeList = homeList;
  game._homeTarget = homeTarget;

  // bullets：分表更新，避免每发扫 from
  rebuildBulletLists(game);
  for (const b of game.playerBullets) {
    let ht = null;
    if (b.homing) {
      if (b.type === 'bomb' && homeList.length) {
        ht = homeList[(b._homeSlot || 0) % homeList.length];
      } else {
        ht = homeTarget;
      }
    }
    b.update(dt, p, ht);
  }
  for (const b of game.enemyBullets) {
    b.update(dt, p, null);
  }

  // items（结算中强制吸引）
  for (const it of game.items) {
    it.update(dt, p, settling || p.bombTimer > 0);
    if (Math.hypot(it.x - p.x, it.y - p.y) < it.r + (BALANCE.itemPickupRadius ?? 20)) {
      it.dead = true;
      collectItem(game, it);
    }
  }

  // particles
  for (const pt of game.particles) pt.update(dt);

  // collisions：几何命中 → 事件 → 得分/掉落/onDeath（purge 前）
  if (!settling) {
    const colEvents = runCollisions(game);
    applyCollisionEvents(game, colEvents);
  }

  // chapter 结束判定
  // 本章所有怪打完 → 强制 _finishChapter（残弹变点）→ 0.8s 后进下一章
  // 波间暂时无怪不结束（必须 wavesExhausted：刷怪脚本确认不再出怪）
  if (!settling) {
    game.chapterTime += dt;

    const living = game.enemies.some((e) => !e.dead);

    // Letter 限时：超时未击破 → 失败（强制击破收场）
    if (game.letterTimeMax > 0) {
      game.letterTimeLeft -= dt;
      game._updateLetterHud();
      if (game.letterTimeLeft <= 0 && !game.chapterDone) {
        if (game.bossRef && !game.bossRef.dead) {
          game.bossRef.hp = 0;
          game.bossRef.dead = true;
        }
        game._finishChapter(false);
      }
    } else if (ch.duration && game.chapterTime >= ch.duration && !game.chapterDone) {
      // 有 bossRef 的限时章（道中精英/midboss）：到时未击破 → 失败收场
      // 纯道中：存活到时即成功（无限刷怪/纯弹幕保底）
      if (game.bossRef && !game.bossRef.dead) {
        game.bossRef.hp = 0;
        game.bossRef.dead = true;
        game._finishChapter(false);
      } else {
        game._finishChapter(true);
      }
    }

    // Boss / Letter：击破即本章结束（以 dead 为准，避免阶段切血误伤）
    if (!game.chapterDone && game.bossRef && game.bossRef.dead) {
      game._finishChapter(true);
    }

    // 道中：刷怪已耗尽 + 场上无存活敌机 = 本章敌人全部打完
    if (!game.chapterDone && !game.bossRef && (ch.kind === 'mid' || ch.kind === 'midboss')) {
      if (game.wavesExhausted && !living && game.chapterTime > 0.4) {
        game._finishChapter(true);
      }
    }
  }

  // 非阻塞章标题/结算条
  tickChapterBanner(game, dt);

  // cleanup（原地 splice，避免每帧重建大数组）
  game._purgeDead(game.bullets);
  game._purgeDead(game.enemies);
  game.items = game.items.filter((i) => !i.dead);
  game.particles = game.particles.filter((pt) => !pt.dead);

  game._updateHUD();
}

export function tickChapterBanner(game, dt) {
  const b = game.chapterBanner;
  if (!b) {
    if (game._queuedStartTitle) {
      game.chapterBanner = game._queuedStartTitle;
      game._queuedStartTitle = null;
    }
    return;
  }
  b.t += dt;
  if (b.t >= b.duration) {
    game.chapterBanner = null;
    if (game._queuedStartTitle) {
      game.chapterBanner = game._queuedStartTitle;
      game._queuedStartTitle = null;
    }
  }
}

export function tryBomb(game, isDeath) {
  const p = game.player;
  if (game.noBomb && !isDeath) return false;
  const cost = game.bombCost;
  const freeBomb = debugLocksBombs();
  if (!freeBomb && p.bombs < cost) return false;
  if (p.bombTimer > 0 && !isDeath) return false;

  if (!freeBomb) p.bombs -= cost;
  p.bombTimer = BALANCE.bombDuration;
  p.invuln = BALANCE.bombInvuln;
  game.chapterBomb = true;
  fullScreenClear(game);
  // 清屏后放出 8 发巨型追踪弹（避免被 fullScreenClear 清掉）
  spawnBombOrbs(game, p);
  game.audio.sfx('bomb');
  burst(game, p.x, p.y, p.def?.color || '#c4b5fd', 40);
  return true;
}

export function miss(game) {
  const p = game.player;
  game.chapterMiss = true;
  if (!debugLocksLives()) p.lives -= 1;
  p.arbitration = 0;
  p.edit = Math.min(p.edit, BALANCE.editMax * 0.3);
  game.audio.sfx('dead');
  burst(game, p.x, p.y, '#f87171', 30);
  fullScreenClear(game);

  if (p.lives < 0) {
    game._gameOver();
    return;
  }
  const floor = game.diff.missBombFloor ?? BALANCE.resource.missBombFloor ?? 2;
  p.bombs = Math.max(p.bombs, floor);
  p.invuln = 3;
  p.resetPos();
}

export function hitPlayer(game) {
  const p = game.player;
  if (debugBlocksHit()) return;
  if (p.invuln > 0 || p.arbitration > 0 || p.bombTimer > 0) return;
  p.arbitration = game.deathBombWindow || BALANCE.deathBombWindow;
  game.audio.sfx('hit');
}

export function collectItem(game, it) {
  if (it.kind === 'score') addScore(game, BALANCE.score.itemSmall);
  else if (it.kind === 'scoreL') addScore(game, BALANCE.score.itemLarge);
  else if (it.kind === 'life') {
    game.player.lives = Math.min(BALANCE.maxLives, game.player.lives + 1);
    game.audio.sfx('ok');
  } else if (it.kind === 'bomb') {
    game.player.bombs = Math.min(BALANCE.maxBombs, game.player.bombs + 1);
    game.audio.sfx('item');
  }
}

export function addScore(game, n) {
  const raw = Math.floor(n * (game.scoreMul || 1));
  const v = Math.floor(raw * (game.diffScoreMul || 1));
  game.score += v;
  game.chapterScore += v;
  game.baseScore += raw;
  if (game.score > game.hiscore) {
    game.hiscore = game.score;
  }
  checkExtend(game);
}

export function checkExtend(game) {
  let th = nextExtendThreshold(game.extendCount);
  while (game.baseScore >= th) {
    game.extendCount += 1;
    game.player.lives = Math.min(BALANCE.maxLives, game.player.lives + 1);
    game.audio.sfx('extend');
    flashMsg(game, 'EXTEND', 1.4);
    th = nextExtendThreshold(game.extendCount);
  }
}

export function flashMsg(game, text, sec = 1.2) {
  if (!game.el.flash) return;
  game.el.flash.textContent = text;
  game.el.flash.classList.remove('hidden');
  game._flashTimer = sec;
}

export function defaultKillDrop(game, e) {
  if (e.drop) return e.drop;
  const ch = game.chapters[game.chapterIndex];
  if (!ch) return null;
  if (
    ch.kind === 'midboss'
    && game.diff.midbossDrop !== false
    && (e.type === 'boss' || e.type === 'elite')
  ) {
    return 'bomb';
  }
  return null;
}

export function isLastLetterOfStage(game, ch) {
  if (!ch || ch.kind !== 'boss') return false;
  return letterProgressInStage(game, ch).remain <= 1;
}

/**
 * 当前 stage 内 Letter（boss 章）进度
 * @returns {{ idx: number, total: number, remain: number }}
 * idx 从 1 起；remain 含当前这张
 */
export function letterProgressInStage(game, ch) {
  if (ch === undefined) ch = game.chapters[game.chapterIndex];
  if (!ch || ch.kind !== 'boss') return { idx: 0, total: 0, remain: 0 };
  const sk = String(ch.stageKey);
  let start = game.chapterIndex;
  while (start > 0 && String(game.chapters[start - 1].stageKey) === sk) start--;
  let end = game.chapterIndex;
  while (end + 1 < game.chapters.length && String(game.chapters[end + 1].stageKey) === sk) end++;
  let total = 0;
  let idx = 0;
  let seen = 0;
  for (let i = start; i <= end; i++) {
    const n = game.chapters[i];
    if (n.kind !== 'boss') continue;
    total++;
    if (i <= game.chapterIndex) {
      seen++;
      if (i === game.chapterIndex) idx = seen;
    }
  }
  return { idx, total, remain: Math.max(0, total - idx + 1) };
}

export function grantLetterResource(game, ch, perfect, success) {
  if (!success || !perfect) return;
  if (ch.kind !== 'boss' || !(game.letterTimeMax > 0)) return;

  const bx = game.bossRef ? game.bossRef.x : LOGICAL_W / 2;
  const by = game.bossRef ? game.bossRef.y : 120;
  const res = BALANCE.resource;

  if (isLastLetterOfStage(game, ch)) {
    spawnItem(game, bx, by + 20, 'life');
    return;
  }

  const chance = game.diff.letterNmnbBombChance ?? res.letterNmnbBombChance ?? 0.4;
  if (Math.random() < chance) {
    spawnItem(game, bx + (Math.random() - 0.5) * 30, by + 18, 'bomb');
  }
}

export function spawnItem(game, x, y, kind = 'score') {
  game.items.push(new Item(x, y, kind));
}

export function burst(game, x, y, color, n) {
  for (let i = 0; i < n; i++) game.particles.push(new Particle(x, y, color));
}

