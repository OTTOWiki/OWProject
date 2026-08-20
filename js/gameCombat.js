/**
 * 战斗帧更新与资源/得分（从 Game 抽出）
 * @param {import('./game.js').Game} game
 */
import { BALANCE, LOGICAL_W, nextExtendThreshold } from './config.js';
import {
  spawnPlayerShot, fullScreenClear, clearBulletsToItems, spawnBombOrbs,
} from './patterns.js';
import { runCollisions } from './collision.js';
import {
  debugBlocksHit, debugLocksLives, debugLocksBombs, debugAutoEdit,
} from './debug.js';
import { acquireParticle } from './particlePool.js';
import { acquireItem, releaseItemList } from './itemPool.js';
import { updateGameHud, updateLetterHud } from './hud.js';
import { finishChapter, gameOver, startChapter, softClearForNextChapter } from './chapterFlow.js';
import { evaluateChapterEnd, chapterEndSnapFromGame } from './chapterEnd.js';

/**
 * 消费 collision 事件：得分 / 掉落 / 粒子 / onDeath / 擦弹 / 中弹
 * 须在 runCollisions 之后、purge 敌机之前调用（onDeath 依赖实体仍在场上）
 * @param {import('./game.js').Game} game
 * @param {import('./collision.js').CollisionEvent[]} events
 */

/* ========== 打击反馈（纯视觉；不影响判定/回放） ========== */

/** 停帧：max 语义 + cap，不叠加（Boss 连中只保留最长一次） */
export function addHitStop(game, dur) {
  game._hitStop = Math.min(BALANCE.feedback.hitStopCap, Math.max(game._hitStop || 0, dur));
}

/** 震屏：直接覆盖幅度与时长，T 重置到 dur（新震动盖旧震动） */
export function addShake(game, mag, dur) {
  game._shakeMag = mag;
  game._shakeDur = dur;
  game._shakeT = dur;
}

/** 冲击波：扩张淡出圆环（r 由 vr 匀速增大，alpha 随 life/maxLife 衰减） */
export function addShockwave(game, x, y, color, maxR, life) {
  if (!game._shockwaves) game._shockwaves = [];
  game._shockwaves.push({
    x, y, r: 0, vr: maxR / life, color, life, maxLife: life, dead: false,
  });
}

/** 单次擦弹生成粒子数 / 场上擦弹粒子上限 */
const GRAZE_PARTICLES_PER = 8;
const GRAZE_PARTICLE_MAX = 48;
const GRAZE_PARTICLE_R = 1.55;

/** 自机旁白粒子：统一正圆半径；出生不透明、飞出 ease-out 淡出；受场上上限约束 */
function spawnGrazeParticles(game, p) {
  let room = GRAZE_PARTICLE_MAX - (game._grazeParticleCount || 0);
  if (room <= 0) return;
  const n = Math.min(GRAZE_PARTICLES_PER, room);
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spread = 4 + Math.random() * 12;
    const gx = p.x + Math.cos(ang) * spread * 0.45;
    const gy = p.y + Math.sin(ang) * spread * 0.45;
    // 寿命略长 → 整体消失更慢
    const pt = acquireParticle(gx, gy, '#ffffff', 0.38 + Math.random() * 0.14);
    pt.r = GRAZE_PARTICLE_R;
    const spd = 0.85 + Math.random() * 1.25;
    pt.vx = Math.cos(ang) * spd;
    pt.vy = Math.sin(ang) * spd;
    pt.grazeFade = true;
    game.particles.push(pt);
    game._grazeParticleCount = (game._grazeParticleCount || 0) + 1;
  }
}

// 受击白闪（hurtT）保留；命中停帧只给一次性大事件（击破/Bomb/Miss/Letter），
// 避免持续输出把逻辑压到低速（旧版每帧 addHitStop → _hitStop 恒 >0 → updateCombat 被节流）。
export function applyCollisionEvents(game, events) {
  if (!events || !events.length) return;
  const p = game.player;
  for (const ev of events) {
    if (ev.type === 'kill') {
      const e = ev.enemy;
      addScore(game, e.score);
      burst(game, e.x, e.y, e.color, 12);
      // 连击：击破 +1 并续窗口（窗口见 BALANCE.combo.window）
      game.combo = (game.combo || 0) + 1;
      game.comboTimer = BALANCE.combo.window;
      game.stats.kills++;
      game.stats.maxCombo = Math.max(game.stats.maxCombo, game.combo);
      const drop = e.drop || defaultKillDrop(game, e);
      if (drop) spawnItem(game, e.x, e.y, drop);
      else if (Math.random() < 0.35) spawnItem(game, e.x, e.y, 'score');
      e.fireOnDeath?.(game);
      if (e.type === 'boss' || e.type === 'elite') {
        // 击破不再停帧（仅保留震屏与冲击波）；停帧只给 Bomb/Miss/Letter
        addShake(game, ...BALANCE.feedback.shake.bossKill);
        addShockwave(game, e.x, e.y, e.color || '#ffffff', 90, 0.4);
      }
    } else if (ev.type === 'graze') {
      if (!p) continue;
      p.edit = Math.min(BALANCE.editMax, p.edit + BALANCE.editPerGraze * (game.grazeMul || 1));
      addScore(game, BALANCE.score.graze);
      game.stats.graze++;
      spawnGrazeParticles(game, p);
      // 擦弹音：每帧最多一次，避免弹幕墙时叠成噪声
      const now = performance.now();
      if (!game._lastGrazeSfxT || now - game._lastGrazeSfxT > 45) {
        game._lastGrazeSfxT = now;
        game.audio.sfx('graze');
      }
    } else if (ev.type === 'playerHit') {
      hitPlayer(game);
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
    for (const b of game.playerBullets) b.update(dt, p, null);
    for (const pt of game.particles) pt.update(dt);
    game._purgeDeadBullets();
    game._purgeDeadItems();
    game._purgeDeadParticles();
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
  updateGameHud(game);
}

export function updateCombat(game, dt) {
  const p = game.player;
  const ch = game.chapters[game.chapterIndex];
  const settling = !!game.chapterDone;

  // 连击窗口衰减：超时清零（击破时在 applyCollisionEvents 续期）
  if (game.combo > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) {
      game.combo = 0;
      game.comboTimer = 0;
    }
  }

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

  // bullets：分表权威，直接更新
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

  // shockwaves（打击反馈冲击波：扩张 + 计时）
  if (game._shockwaves) {
    for (const sw of game._shockwaves) {
      sw.r += sw.vr * dt;
      sw.life -= dt;
      if (sw.life <= 0) sw.dead = true;
    }
  }

  // collisions：几何命中 → 事件 → 得分/掉落/onDeath（purge 前）
  if (!settling) {
    const colEvents = runCollisions(game);
    applyCollisionEvents(game, colEvents);
  }

  // chapter 结束判定（纯函数 evaluateChapterEnd；时序：先扣时再判定）
  if (!settling) {
    game.chapterTime += dt;
    if (game.letterTimeMax > 0) {
      game.letterTimeLeft -= dt;
      updateLetterHud(game);
    }

    const end = evaluateChapterEnd(chapterEndSnapFromGame(game, ch));
    if (end) {
      if (end.killBoss && game.bossRef && !game.bossRef.dead) {
        game.bossRef.hp = 0;
        game.bossRef.dead = true;
      }
      finishChapter(game, end.success);
    }
  }

  // 非阻塞章标题/结算条
  tickChapterBanner(game, dt);

  // cleanup：分表 swap-remove + 对象池归还
  game._purgeDeadBullets();
  game._purgeDead(game.enemies);
  if (game._shockwaves) game._purgeDead(game._shockwaves);
  game._purgeDeadItems();
  game._purgeDeadParticles();

  updateGameHud(game);
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
  game.stats.bombs++;
  if (isDeath) game.stats.deathbombs++;
  fullScreenClear(game);
  // 清屏后放出 8 发巨型追踪弹（避免被 fullScreenClear 清掉）
  spawnBombOrbs(game, p);
  game.audio.sfx('bomb');
  burst(game, p.x, p.y, p.def?.color || '#c4b5fd', 40);
  addHitStop(game, BALANCE.feedback.hitStopBomb);
  addShake(game, ...BALANCE.feedback.shake.bomb);
  addShockwave(game, p.x, p.y, p.def?.color || '#c4b5fd', 120, 0.5);
  return true;
}

/**
 * Nomiss：被弹（决死未救回）→ 不扣残机不 Game Over，自动重开当前章节。
 * - 回滚到进章时状态（该次尝试作废）：Unstable 异常（经 nextUnstableFx）、
 *   分数 score/baseScore/extendCount、残机/Bomb（含尝试内 Extend/生命道具所得一并回滚）
 * - hiscore 保留峰值不降；combo 与 stats 不回滚（stats 为累计对局统计，非单章尝试）
 * - BGM 回带到进章位置（chapterFlow.startChapter 章首记录的 _nomissBgmPos）
 */
export function nomissRestart(game) {
  game.audio.sfx('dead');
  burst(game, game.player.x, game.player.y, '#f87171', 30);
  game.player.resetPos();
  game.player.invuln = 1.5;

  const snap = game._nomissSnapshot;
  if (snap) {
    if (snap.unstableFx) game.nextUnstableFx = snap.unstableFx;
    game.score = snap.score ?? game.score;
    game.baseScore = snap.baseScore ?? game.baseScore;
    game.extendCount = snap.extendCount ?? game.extendCount;
    game.player.lives = snap.lives ?? game.player.lives;
    game.player.bombs = snap.bombs ?? game.player.bombs;
  }
  if (game._nomissBgmPos != null) game.audio.seekMusic(game._nomissBgmPos);
  flashMsg(game, '无伤重开', 1.2);

  softClearForNextChapter(game, { convert: false });
  releaseItemList(game.items);
  startChapter(game);
}

export function miss(game) {
  // Nomiss：miss 被劫持为自动重开当前章节（不扣残机、不 GameOver）
  if (game.mode === 'nomiss' && !game.replaying) {
    nomissRestart(game);
    return;
  }
  const p = game.player;
  game.chapterMiss = true;
  game.stats.misses++;
  addHitStop(game, BALANCE.feedback.hitStopMiss);
  // 用户调整：Miss 不震屏（停帧保留）；Bomb/击破/Letter 仍震
  if (!debugLocksLives()) p.lives -= 1;
  p.arbitration = 0;
  p.edit = Math.min(p.edit, BALANCE.editMax * 0.3);
  game.audio.sfx('dead');
  burst(game, p.x, p.y, '#f87171', 30);
  fullScreenClear(game);

  if (p.lives < 0) {
    gameOver(game);
    return;
  }
  const floor = BALANCE.resource.missBombFloor ?? 2;
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
  game.stats.items++;
  if (it.kind === 'score') addScore(game, BALANCE.score.itemSmall);
  else if (it.kind === 'scoreL') addScore(game, BALANCE.score.itemLarge);
  else if (it.kind === 'life') {
    if (game.mode === 'nomiss') return; // 防御：nomiss 禁用生命道具（spawnItem 已拦截，此处兜底遗漏来源）
    game.player.lives = Math.min(BALANCE.maxLives, game.player.lives + 1);
    game.audio.sfx('ok');
  } else if (it.kind === 'bomb') {
    game.player.bombs = Math.min(BALANCE.maxBombs, game.player.bombs + 1);
    game.audio.sfx('item');
  }
}

export function addScore(game, n) {
  const raw = Math.floor(n * (game.scoreMul || 1));
  // Combo 倍率：每连击 +1%（仅乘实时得分，不计入 baseScore；combo=0 时为 1）
  const comboMul = 1 + (game.combo || 0) * BALANCE.combo.perPercent;
  const v = Math.floor(raw * (game.diffScoreMul || 1) * comboMul);
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
    && BALANCE.resource.midbossDrop !== false
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

  const chance = res.letterNmnbBombChance ?? 0.4;
  if (Math.random() < chance) {
    spawnItem(game, bx + (Math.random() - 0.5) * 30, by + 18, 'bomb');
  }
}

export function spawnItem(game, x, y, kind = 'score') {
  // nomiss 禁用生命道具（含 Letter 末卡 NMNB 奖励的 life 掉落）
  if (game.mode === 'nomiss' && kind === 'life') return;
  game.items.push(acquireItem(x, y, kind));
}

export function burst(game, x, y, color, n) {
  for (let i = 0; i < n; i++) game.particles.push(acquireParticle(x, y, color));
}

