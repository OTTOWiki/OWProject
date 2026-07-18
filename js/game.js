import {
  BALANCE, LOGICAL_W, LOGICAL_H, PLAYER_DEFS,
  getDifficulty, nextExtendThreshold,
} from './config.js';
import {
  Player, Item, Particle,
  drawPlayer,
} from './entities.js';
import { drawGameFrame, drawFps } from './gameDraw.js';
import {
  bindOverlayClicks, hideOverlay, openPause, openResult,
  runOverlayAction, handleOverlayInput, highlightOverlay, overlayButtons,
} from './gameOverlay.js';
import * as chapterFlow from './chapterFlow.js';
import { spawnPlayerShot, fullScreenClear, clearBulletsToItems, spawnBombOrbs } from './patterns.js';
import { buildChapterList } from './stages/index.js';
import { getDialogues } from './dialogue.js';
import { loadHiscore, loadSettings } from './storage.js';
import { PlayfieldBackground } from './playfieldBg.js';
import { runCollisions, rebuildBulletLists } from './collision.js';
import {
  createHudCache, updateGameHud, updateLetterHud,
} from './hud.js';
import {
  getDebugTimeScale, debugBlocksHit, debugLocksLives, debugLocksBombs,
  debugTick, debugAutoEdit,
} from './debug.js';
import { applyEnemyDifficulty, applyEnemyBulletDifficulty } from './spawnScale.js';

export class Game {
  constructor({ canvas, input, audio, background, ui }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;
    this.audio = audio;
    this.background = background;
    this.ui = ui;

    this.chapters = buildChapterList();
    /** @type {Map<number, number>} chapter id → chapters 下标 */
    this.chapterIndexById = new Map(this.chapters.map((c, i) => [c.id, i]));
    /** stageKey+kind 快速定位（跳线用） */
    this._chapterIndexByStageMid = new Map();
    this._chapterIndexByStageAny = new Map();
    for (let i = 0; i < this.chapters.length; i++) {
      const c = this.chapters[i];
      const sk = String(c.stageKey);
      if (c.kind === 'mid' && !this._chapterIndexByStageMid.has(sk)) {
        this._chapterIndexByStageMid.set(sk, i);
      }
      if (!this._chapterIndexByStageAny.has(sk)) {
        this._chapterIndexByStageAny.set(sk, i);
      }
    }

    this.running = false;
    this.paused = false;
    this.mode = 'story'; // story | practice | stage
    this.raf = 0;
    this.lastT = 0;
    this.playBg = new PlayfieldBackground();
    this._lastBgMode = null;
    const initSettings = loadSettings();
    this.playerBulletOpacity = initSettings.playerBulletOpacity;
    /** 0 = 不限制；>0 为目标 FPS 上限 */
    this.fpsLimit = initSettings.fpsLimit || 0;
    /** 限帧时间银行（ms），累加 rAF 间隔后按 1000/cap 扣款 */
    this._fpsBankMs = 0;
    this._hudCache = createHudCache();
    this.playerBullets = [];
    this.enemyBullets = [];
    this._homeList = null;
    this._homeTarget = null;
    /** 版面左上角帧率（约 0.5s 平滑，统计逻辑/绘制帧） */
    this._fps = 0;
    this._fpsFrames = 0;
    this._fpsAccum = 0;

    this._bindUI();
  }

  /** 按章节 id 取下标；未知 id → 0 */
  _indexForChapterId(id) {
    const idx = this.chapterIndexById.get(id);
    return idx != null ? idx : 0;
  }

  /** 从设置同步运行时参数（菜单改设置后 / 开局） */
  applySettings(settings) {
    const s = settings || loadSettings();
    this.playerBulletOpacity = s.playerBulletOpacity ?? 0.3;
    const nextCap = Number(s.fpsLimit) > 0 ? Math.round(Number(s.fpsLimit)) : 0;
    if (nextCap !== this.fpsLimit) {
      this.fpsLimit = nextCap;
      this._fpsBankMs = 0;
    } else {
      this.fpsLimit = nextCap;
    }
    this.input.applySettings(s);
    this.audio.setMusicVolume(s.musicVolume ?? 1);
  }

  _bindUI() {
    this.el = {
      score: document.getElementById('ui-score'),
      hiscore: document.getElementById('ui-hiscore'),
      lives: document.getElementById('ui-lives'),
      bombs: document.getElementById('ui-bombs'),
      edit: document.getElementById('ui-edit'),
      unstable: document.getElementById('ui-unstable'),
      tendency: document.getElementById('ui-tendency'),
      chapter: document.getElementById('ui-chapter'),
      bonus: document.getElementById('ui-bonus'),
      playerName: document.getElementById('ui-player-name'),
      difficulty: document.getElementById('ui-difficulty'),
      stageLabel: document.getElementById('stage-label'),
      dialogueBox: document.getElementById('dialogue-box'),
      dialogueName: document.getElementById('dialogue-name'),
      dialogueText: document.getElementById('dialogue-text'),
      dialoguePortrait: document.getElementById('dialogue-portrait'),
      overlay: document.getElementById('game-overlay'),
      overlayTitle: document.getElementById('overlay-title'),
      overlayBody: document.getElementById('overlay-body'),
      overlayActions: document.getElementById('overlay-actions'),
      overlayHint: document.getElementById('overlay-hint'),

      letterBanner: document.getElementById('letter-banner'),
      letterName: document.getElementById('letter-name'),
      letterRemain: document.getElementById('letter-remain'),
      letterBonus: document.getElementById('letter-bonus'),
      letterTimer: document.getElementById('letter-timer'),
      flash: document.getElementById('flash-msg'),
      bossEnemyMarker: document.getElementById('boss-enemy-marker'),
    };
  }

  start(opts) {
    const {
      playerId = 'yinquan',
      startChapter = 1,
      mode = 'story',
      lives = null,
      unstable = true,
      singleChapter = false,
      difficulty = 'normal',
    } = opts;

    this.diff = getDifficulty(difficulty);
    this.difficultyId = this.diff.id;
    this.mode = mode;
    this.singleChapter = singleChapter;
    this.practiceUnstable = unstable;
    this.playerId = playerId;
    this.dialogues = getDialogues(playerId);

    this.player = new Player(PLAYER_DEFS[playerId]);
    this.player.lives = lives != null ? lives : this.diff.startLives;
    this.player.bombs = this.diff.startBombs;
    this.deathBombWindow = this.diff.deathBombWindow;
    this.playerAtkMul = this.diff.playerAtk;
    this.diffScoreMul = this.diff.scoreMul;
    this.grazeMul = this.diff.grazeMul;
    this.enemyHpMul = this.diff.enemyHp;
    this.bulletSpeedMul = this.diff.bulletSpeed;
    this.fireIntervalMul = this.diff.fireInterval;
    this.spawnMul = this.diff.spawnMul;
    this.bulletCountMul = this.diff.bulletCount ?? 1;

    this.score = 0;
    this.baseScore = 0;
    this.extendCount = 0;
    this.hiscore = loadHiscore();
    this.totalTendency = 0;
    this.chapterTendency = 0;
    this._flashTimer = 0;

    this.bullets = [];
    this.enemies = [];
    this.items = [];
    this.particles = [];

    this.bossRef = null;
    this.waveFn = null;
    this.waveTimer = 0;
    this.waveCount = 0;
    this.rainT = 0;
    this.laserT = 0;

    this.chapterIndex = this._indexForChapterId(startChapter);
    this._hudCache = createHudCache();
    this.playerBullets = [];
    this.enemyBullets = [];
    this._homeList = null;
    this._homeTarget = null;

    this.chapterTime = 0;
    this.chapterScore = 0;
    this.chapterMiss = false;
    this.chapterBomb = false;
    this.chapterDone = false;
    this.letterTimeLeft = 0;
    this.letterTimeMax = 0;
    this.atkMul = 1;
    this.scoreMul = 1;
    this.unstableFx = null;
    this.fog = false;
    this.noBomb = false;
    this.bombCost = 1;

    this.state = 'playing'; // playing | dialogue | routeSelect | gameover | ending | paused
    this.dialogueQueue = [];
    this.dialogueIdx = 0;
    this.pendingAfterDialogue = null;
    this.routeChoice = null;
    this.resultPayload = null;
    this.settlement = null; // 兼容旧引用
    this.chapterBanner = null; // 非阻塞章标题/结算条
    this._queuedStartTitle = null; // 结束条播完后显示的新章标题
    this.nextUnstableFx = null;
    this.stageIntro = null; // 旧版兼容；现用 stageTransit
    this.stageTransit = null; // 关卡（面）间过渡页
    this._pendingChapterBegin = null;
    this._cancelAdvance();
    this.lastStageKey = null;

    this.running = true;
    this.paused = false;
    this.endingCinematic = false;
    this.overlayMode = null; // pause | result
    this.overlayActionIndex = 0;
    this.applySettings();
    this.input.resetShotLatch();
    this._setEndingCinematic(false);
    this._hideOverlay();
    this.el.flash.classList.add('hidden');
    this.el.dialogueBox.classList.add('hidden');
    this.el.hiscore.textContent = String(this.hiscore);
    this.el.playerName.textContent = this.player.def.name;
    if (this.el.difficulty) {
      this.el.difficulty.textContent = `${this.diff.rank} ${this.diff.name}`;
      this.el.difficulty.style.color = this.diff.color;
    }

    this._bindOverlayClicks();
    this.input.bindCanvas(this.canvas, () => ({ x: this.player.x, y: this.player.y }));
    this.audio.ensure();
    this._startChapter();
    this.lastT = performance.now();
    this._fpsBankMs = 0;
    this._fpsLastT = null;
    this._fpsFrames = 0;
    this._fpsAccum = 0;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame((t) => this._loop(t));
  }

  /**
   * 敌机入场（难度 HP / 开火间隔 + 刷怪记账）。
   * 关卡与 patterns 应走此 API，勿直接 enemies.push。
   */
  spawnEnemy(e) {
    if (!e) return e;
    applyEnemyDifficulty(e, this.enemyHpMul ?? 1, this.fireIntervalMul ?? 1);
    if (this.state === 'playing') {
      this._hadWaveEnemySpawn = true;
      this._lastEnemySpawnChapterTime = this.chapterTime;
      this.wavesExhausted = false;
      this._dryWaveTicks = 0;
    }
    this.enemies.push(e);
    return e;
  }

  /**
   * 子弹入场：敌弹乘 bulletSpeedMul；自机弹原样。
   * 关卡与 patterns 应走此 API，勿直接 bullets.push。
   */
  spawnBullet(b) {
    if (!b) return b;
    applyEnemyBulletDifficulty(b, this.bulletSpeedMul ?? 1);
    this.bullets.push(b);
    return b;
  }

  _wrapWaveFn(raw) {
    return chapterFlow.wrapWaveFn(this, raw);
  }

  _purgeDead(arr) {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].dead) arr.splice(i, 1);
    }
  }

  stop() {
    this.running = false;
    this.input.resetShotLatch();
    this._cancelAdvance();
    this._setEndingCinematic(false);
    this._hideOverlay();
    this.el.bossEnemyMarker?.classList.add('hidden');
    cancelAnimationFrame(this.raf);
    this.audio.stopMusic(0.5);
  }

  /**
   * 场上敌弹 → 得分道具，并锁定吸引（章间/Bomb 同款手感）
   * 不重置自机位置，不抹掉自机弹与已有道具。
   */
  _bulletsToPointsAndAttract() {
    fullScreenClear(this);
    if (this.items?.length) {
      for (const it of this.items) {
        if (!it.dead) it.attract = true;
      }
    }
  }

  _softClearForNextChapter(opts) {
    chapterFlow.softClearForNextChapter(this, opts);
  }

  _startChapter() {
    chapterFlow.startChapter(this);
  }

  _openDialogue(lines, after) {
    chapterFlow.openDialogue(this, lines, after);
  }

  _showDialogueLine() {
    chapterFlow.showDialogueLine(this);
  }

  _advanceDialogue() {
    chapterFlow.advanceDialogue(this);
  }

  _loop(t) {
    if (!this.running) return;
    // 先挂下一帧，避免中途 return 断链
    this.raf = requestAnimationFrame((nt) => this._loop(nt));

    if (!this.lastT) this.lastT = t;
    const elapsedMs = Math.max(0, t - this.lastT);
    this.lastT = t;

    const cap = this.fpsLimit > 0 ? this.fpsLimit : 0;
    let dt;

    if (cap > 0) {
      const frameMs = 1000 / cap;
      const frameDt = 1 / cap;
      this._fpsBankMs += elapsedMs;
      // 防止切后台后一次补太多帧
      if (this._fpsBankMs > frameMs * 4) this._fpsBankMs = frameMs * 4;

      if (this._fpsBankMs < frameMs * 0.92) {
        // 未攒够一帧：不推进逻辑（避免半帧抖动）
        return;
      }

      // 可追上最多 3 个逻辑步，合并为一次 update（保持墙钟时间）
      let steps = 0;
      while (this._fpsBankMs >= frameMs * 0.92 && steps < 3) {
        this._fpsBankMs -= frameMs;
        steps++;
      }
      if (this._fpsBankMs < 0) this._fpsBankMs = 0;
      dt = Math.min(0.05, frameDt * Math.max(1, steps));
    } else {
      this._fpsBankMs = 0;
      dt = Math.min(0.05, elapsedMs / 1000);
    }

    // Debug 整体加速（只乘逻辑 dt；不改变 rAF 本身）
    const dbgScale = getDebugTimeScale();
    if (dbgScale !== 1) {
      dt *= dbgScale;
      // 加速时放宽单帧上限，避免 5× 时被 0.05 卡成「并没快多少」
      const capDt = 0.05 * Math.max(1, dbgScale);
      if (dt > capDt) dt = capDt;
    }

    // 帧率统计（仅统计实际推进的逻辑帧）
    if (this._fpsLastT != null) {
      const rawDt = Math.max(1e-4, (t - this._fpsLastT) / 1000);
      this._fpsFrames += 1;
      this._fpsAccum += rawDt;
      if (this._fpsAccum >= 0.5) {
        this._fps = Math.round(this._fpsFrames / this._fpsAccum);
        this._fpsFrames = 0;
        this._fpsAccum = 0;
      }
    }
    this._fpsLastT = t;

    try {
      this._handleGlobalInput();
      // 章间推进用游戏时间；暂停冻结（见 _scheduleAdvance）
      if (!this.paused) this._tickAdvance(dt);
      if (this.state === 'stageTransit' && !this.paused) {
        this._updateStageTransit(dt);
      } else if (this.state === 'playing' && !this.paused) {
        this._update(dt);
      }
      debugTick();
      // 背景始终滚动（对话/过渡时也缓慢前推）
      const bgMul = this.paused ? 0
        : this.state === 'dialogue' || this.state === 'stageTransit' ? 0.35
          : 1;
      this.playBg?.update(dt * bgMul);
      this._draw();
      this.background?.setTendency(this.totalTendency);
      this.background?.update();
      this.input.endFrame();
    } catch (err) {
      console.error('[game loop]', err);
      // 保底：避免异常后 rAF 断链导致版面永久黑屏
      try {
        if (this.ctx) {
          this.ctx.fillStyle = '#0c1018';
          this.ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
          if (this.player) drawPlayer(this.ctx, this.player);
          this._drawFps(this.ctx);
        }
      } catch (_) { /* ignore */ }
    }
  }

  _drawFps(ctx) {
    drawFps(this, ctx);
  }

  /** 关卡过渡页计时；期间继续吸点，不刷怪 */
  _updateStageTransit(dt) {
    const p = this.player;
    if (p) {
      p.update(dt, this.input);
      // 过渡中仍可移动，但不射击/不碰伤
      for (const it of this.items) {
        it.update(dt, p, true);
        if (Math.hypot(it.x - p.x, it.y - p.y) < it.r + (BALANCE.itemPickupRadius ?? 20)) {
          it.dead = true;
          this._collectItem(it);
        }
      }
      for (const b of this.bullets) {
        if (b.from === 'player') b.update(dt, p, null);
      }
      for (const pt of this.particles) pt.update(dt);
      this._purgeDead(this.bullets);
      this.items = this.items.filter((i) => !i.dead);
      this.particles = this.particles.filter((pt) => !pt.dead);
    }

    this._tickChapterBanner(dt);

    if (this.stageTransit) {
      this.stageTransit.t += dt;
      if (this.stageTransit.t >= this.stageTransit.duration) {
        const begin = this._pendingChapterBegin;
        this.stageTransit = null;
        this._pendingChapterBegin = null;
        begin?.();
      }
    }
    this._updateHUD();
  }

  _bindOverlayClicks() {
    bindOverlayClicks(this);
  }

  _overlayButtons() {
    return overlayButtons(this);
  }

  _highlightOverlay() {
    highlightOverlay(this);
  }

  _showOverlay(opts) {
    showOverlay(this, opts);
  }

  _hideOverlay() {
    hideOverlay(this);
  }

  _openPause() {
    openPause(this);
  }

  _openResult(opts) {
    openResult(this, opts);
  }

  _runOverlayAction(action) {
    runOverlayAction(this, action);
  }

  _handleGlobalInput() {
    // 设置页等非游戏屏时不吃输入（避免 Esc 误开暂停）
    if (!document.getElementById('screen-game')?.classList.contains('active')) {
      this.input.consumePause();
      return;
    }

    const wantPause = this.input.consumePause();

    // 叠加层（暂停 / 结束）优先
    if (handleOverlayInput(this, wantPause)) return;

    // 暂停：playing / dialogue / 关卡过渡 均可
    if (wantPause && (this.state === 'playing' || this.state === 'dialogue' || this.state === 'stageTransit')) {
      this._openPause();
      return;
    }

    if (this.state === 'dialogue') {
      // Shot 默认即 KeyZ：只走一条确认路径，避免同帧连跳两句
      if (
        this.input.shotPressed()
        || this.input.justPressed('Enter')
        || this.input.justPressed('Space')
      ) {
        this._advanceDialogue();
      }
      return;
    }

    if (this.state === 'routeSelect') {
      if (this.input.justPressed('ArrowLeft') || this.input.justPressed('KeyA')) {
        this._chooseRoute('A');
      } else if (this.input.justPressed('ArrowRight') || this.input.justPressed('KeyD')) {
        this._chooseRoute('B');
      } else if (this.input.tap) {
        this._chooseRoute(this.input.tap.x < LOGICAL_W * 0.5 ? 'A' : 'B');
      }
    }
  }

  _update(dt) {
    const p = this.player;
    const ch = this.chapters[this.chapterIndex];
    const settling = !!this.chapterDone;

    if (debugAutoEdit() && p) p.edit = BALANCE.editMax;

    // 决死 Bomb：在审核窗口内优先处理
    let deathSaved = false;
    if (!settling && p.arbitration > 0) {
      this.el.flash.classList.remove('hidden');
      this.el.flash.textContent = '违规编辑！';
      this._flashTimer = 0;
      if (this.input.bombPressed() && this._tryBomb(true)) {
        p.arbitration = 0;
        deathSaved = true;
        this.el.flash.classList.add('hidden');
      }
    } else if (this._flashTimer > 0) {
      this._flashTimer -= dt;
      if (this._flashTimer <= 0) {
        this._flashTimer = 0;
        this.el.flash.classList.add('hidden');
      }
    }

    const arbBefore = p.arbitration;
    p.update(dt, this.input);

    // 审核窗口结束且未决死成功 → Miss
    if (!settling && arbBefore > 0 && p.arbitration <= 0 && !deathSaved) {
      this.el.flash.classList.add('hidden');
      this._miss();
      if (!this.running || this.player.lives < 0) return;
    }

    // tendency (stage 1-3 only): pointer drifts toward side based on player position
    if (!settling && typeof ch.stage === 'number' && ch.stage <= 3) {
      const cx = LOGICAL_W / 2;
      const offset = p.x - cx;
      if (Math.abs(offset) > 2) {
        const dir = offset > 0 ? 1 : -1;
        const speed = (Math.abs(offset) / cx) * BALANCE.tendencySpeed * dt;
        this.chapterTendency += dir * speed;
      }
      this.chapterTendency = Math.max(-BALANCE.tendencyMaxPerChapter,
        Math.min(BALANCE.tendencyMaxPerChapter, this.chapterTendency));
    }

    // 章结算期间：可移动、吸点；不射击、不刷怪、不受伤
    if (!settling) {
      // shot（toggle 模式在此帧更新锁存）
      this.input.updateShotToggle();
      if (this.input.shotHeld() && p.shotCd <= 0 && p.arbitration <= 0) {
        spawnPlayerShot(this, p);
        p.shotCd = BALANCE.playerShotCooldown;
        if (Math.random() < 0.15) this.audio.sfx('shot');
      }

      // bomb（非决死）
      if (this.input.bombPressed() && p.arbitration <= 0) {
        this._tryBomb(false);
      }

      // item / edit war
      if (this.input.itemPressed() && p.edit >= BALANCE.editMax && p.arbitration <= 0) {
        p.edit = 0;
        clearBulletsToItems(this, p.x, p.y, BALANCE.editClearRadius);
        this.audio.sfx('item');
        this._burst(p.x, p.y, p.def.color, 24);
      }

      // waves
      this.waveFn?.(dt);

      // enemies（击杀 onDeath 在 collision 击破路径触发；此处不跑，避免屏外消失误触发）
      for (const e of this.enemies) {
        try {
          e.update(dt, this);
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
    for (const e of this.enemies) {
      if (e.dead || e.isSpawning) continue;
      homeList.push(e);
      const d = Math.hypot(e.x - p.x, e.y - p.y) + (e.y > p.y ? 80 : 0);
      if (d < bestD) {
        bestD = d;
        homeTarget = e;
      }
    }
    this._homeList = homeList;
    this._homeTarget = homeTarget;

    // bullets：分表更新，避免每发扫 from
    rebuildBulletLists(this);
    for (const b of this.playerBullets) {
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
    for (const b of this.enemyBullets) {
      b.update(dt, p, null);
    }

    // items（结算中强制吸引）
    for (const it of this.items) {
      it.update(dt, p, settling || p.bombTimer > 0);
      if (Math.hypot(it.x - p.x, it.y - p.y) < it.r + (BALANCE.itemPickupRadius ?? 20)) {
        it.dead = true;
        this._collectItem(it);
      }
    }

    // particles
    for (const pt of this.particles) pt.update(dt);

    // collisions（网格粗筛 + 分弹表，见 collision.js）
    if (!settling) runCollisions(this);

    // chapter 结束判定
    // 本章所有怪打完 → 强制 _finishChapter（残弹变点）→ 0.8s 后进下一章
    // 波间暂时无怪不结束（必须 wavesExhausted：刷怪脚本确认不再出怪）
    if (!settling) {
      this.chapterTime += dt;

      const living = this.enemies.some((e) => !e.dead);

      // Letter 限时：超时未击破 → 失败（强制击破收场）
      if (this.letterTimeMax > 0) {
        this.letterTimeLeft -= dt;
        this._updateLetterHud();
        if (this.letterTimeLeft <= 0 && !this.chapterDone) {
          if (this.bossRef && !this.bossRef.dead) {
            this.bossRef.hp = 0;
            this.bossRef.dead = true;
          }
          this._finishChapter(false);
        }
      } else if (ch.duration && this.chapterTime >= ch.duration && !this.chapterDone) {
        // 有 bossRef 的限时章（道中精英/midboss）：到时未击破 → 失败收场
        // 纯道中：存活到时即成功（无限刷怪/纯弹幕保底）
        if (this.bossRef && !this.bossRef.dead) {
          this.bossRef.hp = 0;
          this.bossRef.dead = true;
          this._finishChapter(false);
        } else {
          this._finishChapter(true);
        }
      }

      // Boss / Letter：击破即本章结束（以 dead 为准，避免阶段切血误伤）
      if (!this.chapterDone && this.bossRef && this.bossRef.dead) {
        this._finishChapter(true);
      }

      // 道中：刷怪已耗尽 + 场上无存活敌机 = 本章敌人全部打完
      if (!this.chapterDone && !this.bossRef && (ch.kind === 'mid' || ch.kind === 'midboss')) {
        if (this.wavesExhausted && !living && this.chapterTime > 0.4) {
          this._finishChapter(true);
        }
      }
    }

    // 非阻塞章标题/结算条
    this._tickChapterBanner(dt);

    // cleanup（原地 splice，避免每帧重建大数组）
    this._purgeDead(this.bullets);
    this._purgeDead(this.enemies);
    this.items = this.items.filter((i) => !i.dead);
    this.particles = this.particles.filter((pt) => !pt.dead);

    this._updateHUD();
  }

  _tickChapterBanner(dt) {
    const b = this.chapterBanner;
    if (!b) {
      if (this._queuedStartTitle) {
        this.chapterBanner = this._queuedStartTitle;
        this._queuedStartTitle = null;
      }
      return;
    }
    b.t += dt;
    if (b.t >= b.duration) {
      this.chapterBanner = null;
      if (this._queuedStartTitle) {
        this.chapterBanner = this._queuedStartTitle;
        this._queuedStartTitle = null;
      }
    }
  }

  _tryBomb(isDeath) {
    const p = this.player;
    if (this.noBomb && !isDeath) return false;
    const cost = this.bombCost;
    const freeBomb = debugLocksBombs();
    if (!freeBomb && p.bombs < cost) return false;
    if (p.bombTimer > 0 && !isDeath) return false;

    if (!freeBomb) p.bombs -= cost;
    p.bombTimer = BALANCE.bombDuration;
    p.invuln = BALANCE.bombInvuln;
    this.chapterBomb = true;
    fullScreenClear(this);
    // 清屏后放出 8 发巨型追踪弹（避免被 fullScreenClear 清掉）
    spawnBombOrbs(this, p);
    this.audio.sfx('bomb');
    this._burst(p.x, p.y, p.def?.color || '#c4b5fd', 40);
    return true;
  }

  _miss() {
    const p = this.player;
    this.chapterMiss = true;
    if (!debugLocksLives()) p.lives -= 1;
    p.arbitration = 0;
    p.edit = Math.min(p.edit, BALANCE.editMax * 0.3);
    this.audio.sfx('dead');
    this._burst(p.x, p.y, '#f87171', 30);
    fullScreenClear(this);

    if (p.lives < 0) {
      this._gameOver();
      return;
    }
    const floor = this.diff.missBombFloor ?? BALANCE.resource.missBombFloor ?? 2;
    p.bombs = Math.max(p.bombs, floor);
    p.invuln = 3;
    p.resetPos();
  }

  _hitPlayer() {
    const p = this.player;
    if (debugBlocksHit()) return;
    if (p.invuln > 0 || p.arbitration > 0 || p.bombTimer > 0) return;
    p.arbitration = this.deathBombWindow || BALANCE.deathBombWindow;
    this.audio.sfx('hit');
  }

  _collectItem(it) {
    if (it.kind === 'score') this.addScore(BALANCE.score.itemSmall);
    else if (it.kind === 'scoreL') this.addScore(BALANCE.score.itemLarge);
    else if (it.kind === 'life') {
      this.player.lives = Math.min(BALANCE.maxLives, this.player.lives + 1);
      this.audio.sfx('ok');
    } else if (it.kind === 'bomb') {
      this.player.bombs = Math.min(BALANCE.maxBombs, this.player.bombs + 1);
      this.audio.sfx('item');
    }
  }

  addScore(n) {
    const raw = Math.floor(n * (this.scoreMul || 1));
    const v = Math.floor(raw * (this.diffScoreMul || 1));
    this.score += v;
    this.chapterScore += v;
    this.baseScore += raw;
    if (this.score > this.hiscore) {
      this.hiscore = this.score;
    }
    this._checkExtend();
  }

  _checkExtend() {
    let th = nextExtendThreshold(this.extendCount);
    while (this.baseScore >= th) {
      this.extendCount += 1;
      this.player.lives = Math.min(BALANCE.maxLives, this.player.lives + 1);
      this.audio.sfx('extend');
      this._flashMsg('EXTEND', 1.4);
      th = nextExtendThreshold(this.extendCount);
    }
  }

  _flashMsg(text, sec = 1.2) {
    if (!this.el.flash) return;
    this.el.flash.textContent = text;
    this.el.flash.classList.remove('hidden');
    this._flashTimer = sec;
  }

  /** 击破默认掉落：道中 midboss 章主敌 → bomb（难度可关） */
  _defaultKillDrop(e) {
    if (e.drop) return e.drop;
    const ch = this.chapters[this.chapterIndex];
    if (!ch) return null;
    if (
      ch.kind === 'midboss'
      && this.diff.midbossDrop !== false
      && (e.type === 'boss' || e.type === 'elite')
    ) {
      return 'bomb';
    }
    return null;
  }

  /** 是否为本 stage 最后一张 Letter（boss 章） */
  _isLastLetterOfStage(ch) {
    if (!ch || ch.kind !== 'boss') return false;
    return this._letterProgressInStage(ch).remain <= 1;
  }

  /**
   * 当前 stage 内 Letter（boss 章）进度
   * @returns {{ idx: number, total: number, remain: number }}
   * idx 从 1 起；remain 含当前这张
   */
  _letterProgressInStage(ch = this.chapters[this.chapterIndex]) {
    if (!ch || ch.kind !== 'boss') return { idx: 0, total: 0, remain: 0 };
    const sk = String(ch.stageKey);
    let start = this.chapterIndex;
    while (start > 0 && String(this.chapters[start - 1].stageKey) === sk) start--;
    let end = this.chapterIndex;
    while (end + 1 < this.chapters.length && String(this.chapters[end + 1].stageKey) === sk) end++;
    let total = 0;
    let idx = 0;
    let seen = 0;
    for (let i = start; i <= end; i++) {
      const n = this.chapters[i];
      if (n.kind !== 'boss') continue;
      total++;
      if (i <= this.chapterIndex) {
        seen++;
        if (i === this.chapterIndex) idx = seen;
      }
    }
    return { idx, total, remain: Math.max(0, total - idx + 1) };
  }

  /** Letter NMNB 资源掉落（midboss 已在击破时固定掉 B，此处只处理 boss Letter） */
  _grantLetterResource(ch, perfect, success) {
    if (!success || !perfect) return;
    if (ch.kind !== 'boss' || !(this.letterTimeMax > 0)) return;

    const bx = this.bossRef ? this.bossRef.x : LOGICAL_W / 2;
    const by = this.bossRef ? this.bossRef.y : 120;
    const res = BALANCE.resource;

    if (this._isLastLetterOfStage(ch)) {
      this.spawnItem(bx, by + 20, 'life');
      return;
    }

    const chance = this.diff.letterNmnbBombChance ?? res.letterNmnbBombChance ?? 0.4;
    if (Math.random() < chance) {
      this.spawnItem(bx + (Math.random() - 0.5) * 30, by + 18, 'bomb');
    }
  }

  spawnItem(x, y, kind = 'score') {
    this.items.push(new Item(x, y, kind));
  }

  _burst(x, y, color, n) {
    for (let i = 0; i < n; i++) this.particles.push(new Particle(x, y, color));
  }

  _finishChapter(success) {
    chapterFlow.finishChapter(this, success);
  }

  _scheduleAdvance(sec, fn) {
    chapterFlow.scheduleAdvance(this, sec, fn);
  }

  _cancelAdvance() {
    chapterFlow.cancelAdvance(this);
  }

  _tickAdvance(dt) {
    chapterFlow.tickAdvance(this, dt);
  }

  _nextChapterOrEnd(ch) {
    chapterFlow.nextChapterOrEnd(this, ch);
  }

  _skipToValidChapter() {
    chapterFlow.skipToValidChapter(this);
  }

  _afterStage3() {
    chapterFlow.afterStage3(this);
  }

  _enterRouteSelect() {
    chapterFlow.enterRouteSelect(this);
  }

  _chooseRoute(route) {
    chapterFlow.chooseRoute(this, route);
  }

  _jumpToStage(stageKey) {
    chapterFlow.jumpToStage(this, stageKey);
  }

  _setEndingCinematic(on) {
    chapterFlow.setEndingCinematic(this, on);
  }

  _showEnding(which) {
    chapterFlow.showEnding(this, which);
  }

  _gameOver() {
    chapterFlow.gameOver(this);
  }

  _gameClear() {
    chapterFlow.gameClear(this);
  }

  _updateLetterHud() {
    updateLetterHud(this);
  }

  _updateHUD() {
    updateGameHud(this);
  }

  _draw() {
    drawGameFrame(this);
  }
}
