import {
  LOGICAL_W, PLAYER_DEFS, BALANCE,
  getDifficulty,
} from './config.js';
import { Player } from './entities.js';
import { drawPlayer } from './draw/index.js';
import { drawGameFrame, drawFps } from './gameDraw.js';
import {
  bindOverlayClicks, hideOverlay, openPause, openResult,
  handleOverlayInput,
} from './gameOverlay.js';
import {
  startChapter, softClearForNextChapter, openDialogue, showDialogueLine,
  advanceDialogue, finishChapter, scheduleAdvance, cancelAdvance, tickAdvance,
  nextChapterOrEnd, skipToValidChapter, afterStage3, enterRouteSelect,
  chooseRoute, jumpToStage, setEndingCinematic, showEnding, gameOver, gameClear,
  wrapWaveFn,
} from './chapterFlow.js';
import {
  updateCombat, updateStageTransit, bulletsToPointsAndAttract,
  tickChapterBanner, tryBomb, miss, hitPlayer, collectItem, addScore,
  checkExtend, flashMsg, defaultKillDrop, isLastLetterOfStage,
  letterProgressInStage, grantLetterResource, spawnItem, burst,
} from './gameCombat.js';
import { buildChapterList } from './stages/index.js';
import { getDialogues } from './dialogue.js';
import { loadHiscore, loadSettings } from './storage.js';
import { PlayfieldBackground } from './playfieldBg.js';
import {
  createHudCache, updateGameHud, updateLetterHud,
} from './hud.js';
import { getDebugTimeScale, debugTick } from './debug.js';
import { applyEnemyDifficulty, applyEnemyBulletDifficulty } from './spawnScale.js';
import { purgeDeadBullets, releaseBulletList } from './bulletPool.js';
import { releaseParticleList, releaseParticle } from './particlePool.js';
import { purgeDeadItems, releaseItemList } from './itemPool.js';

/**
 * Game 门面：构造 / start / stop / 主循环 / spawn API。
 * 章节与战斗逻辑在 chapterFlow / gameCombat；debug 与 main 仍可经本类薄入口调用。
 */
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
    /** 描画帧率上限：0 = 不限制；>0 = 24–240（仅限描画，逻辑固定 60） */
    this.fpsLimit = Number(initSettings.fpsLimit) > 0 ? Math.round(Number(initSettings.fpsLimit)) : 0;
    /** 逻辑步进银行（ms），累加 rAF 间隔后按固定 60fps 扣款 */
    this._fpsBankMs = 0;
    /** 描画节流：上次实际出帧的 performance.now()；0 表示尚未出过帧 */
    this._lastDrawT = 0;
    this._hudCache = createHudCache();
    this.playerBullets = [];
    this.enemyBullets = [];
    this._homeList = null;
    this._homeTarget = null;
    /** 版面左上角：描画帧率（约 0.5s 平滑，仅统计实际 _draw 次数） */
    this._fps = 0;
    this._fpsFrames = 0;
    this._fpsAccum = 0;
    this._fpsLastDrawT = null;

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
      this._lastDrawT = 0;
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
      startChapter: startId = 1,
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
    this.player.lives = lives != null ? lives : BALANCE.startLives;
    this.player.bombs = BALANCE.startBombs;
    this.deathBombWindow = BALANCE.deathBombWindow;
    this.playerAtkMul = 1;
    this.diffScoreMul = this.diff.scoreMul;
    this.grazeMul = this.diff.grazeMul;
    this.enemyHpMul = 1;
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

    releaseItemList(this.items);
    releaseParticleList(this.particles);
    this.enemies = [];
    this.items = this.items || [];
    this.particles = this.particles || [];
    this._grazeParticleCount = 0;

    this.bossRef = null;
    this.waveFn = null;
    this.waveTimer = 0;
    this.waveCount = 0;
    this.rainT = 0;
    this.laserT = 0;

    this.chapterIndex = this._indexForChapterId(startId);
    this._hudCache = createHudCache();
    releaseBulletList(this.playerBullets);
    releaseBulletList(this.enemyBullets);
    this.playerBullets = this.playerBullets || [];
    this.enemyBullets = this.enemyBullets || [];
    this._homeList = null;
    this._homeTarget = null;
    this._colEvents = [];

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
    this.chapterBanner = null; // 非阻塞章标题/结算条
    this._queuedStartTitle = null; // 结束条播完后显示的新章标题
    this.nextUnstableFx = null;
    this.stageTransit = null; // 关卡（面）间过渡页
    this._pendingChapterBegin = null;
    cancelAdvance(this);
    this.lastStageKey = null;

    this.running = true;
    this.paused = false;
    this.endingCinematic = false;
    this.overlayMode = null; // pause | result
    this.overlayActionIndex = 0;
    this.applySettings();
    this.input.resetShotLatch();
    setEndingCinematic(this, false);
    hideOverlay(this);
    this.el.flash.classList.add('hidden');
    this.el.dialogueBox.classList.add('hidden');
    this.el.hiscore.textContent = String(this.hiscore);
    this.el.playerName.textContent = this.player.def.name;
    if (this.el.difficulty) {
      this.el.difficulty.textContent = `${this.diff.rank} ${this.diff.name}`;
      this.el.difficulty.style.color = this.diff.color;
    }

    bindOverlayClicks(this);
    this.input.bindCanvas(this.canvas, () => ({ x: this.player.x, y: this.player.y }));
    this.audio.ensure();
    startChapter(this);
    this.lastT = performance.now();
    this._fpsBankMs = 0;
    this._lastDrawT = 0;
    this._fpsLastDrawT = null;
    this._fpsFrames = 0;
    this._fpsAccum = 0;
    this._fps = 0;
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
   * 写入 playerBullets / enemyBullets 分表（权威）；勿直接 push 数组。
   */
  spawnBullet(b) {
    if (!b) return b;
    applyEnemyBulletDifficulty(b, this.bulletSpeedMul ?? 1);
    if (b.from === 'player') this.playerBullets.push(b);
    else this.enemyBullets.push(b);
    return b;
  }

  addScore(n) {
    addScore(this, n);
  }

  spawnItem(x, y, kind = 'score') {
    spawnItem(this, x, y, kind);
  }

  /** 敌机等：swap-remove 删 dead（O(n)，无中间 splice） */
  _purgeDead(arr) {
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      if (!arr[i].dead) arr[w++] = arr[i];
    }
    arr.length = w;
  }

  /** 子弹分表：dead → 归还对象池 */
  _purgeDeadBullets() {
    purgeDeadBullets(this.playerBullets);
    purgeDeadBullets(this.enemyBullets);
  }

  /** 道具：dead → 归还对象池 */
  _purgeDeadItems() {
    purgeDeadItems(this.items);
  }

  /** 粒子：dead → 归还对象池；同步擦弹粒子计数 */
  _purgeDeadParticles() {
    const arr = this.particles;
    if (!arr) return;
    let grazeN = 0;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const pt = arr[i];
      if (pt.dead) {
        releaseParticle(pt);
      } else {
        if (pt.grazeFade) grazeN++;
        arr[w++] = pt;
      }
    }
    arr.length = w;
    this._grazeParticleCount = grazeN;
  }

  stop() {
    this.running = false;
    this.input.resetShotLatch();
    cancelAdvance(this);
    setEndingCinematic(this, false);
    hideOverlay(this);
    this.el.bossEnemyMarker?.classList.add('hidden');
    cancelAnimationFrame(this.raf);
    this.audio.stopMusic(0.5);
  }

  _loop(t) {
    if (!this.running) return;
    // 先挂下一帧，避免中途 return 断链
    this.raf = requestAnimationFrame((nt) => this._loop(nt));

    if (!this.lastT) this.lastT = t;
    const elapsedMs = Math.max(0, t - this.lastT);
    this.lastT = t;

    // ---- 逻辑：固定 60Hz 步进（与显示器刷新无关）----
    const LOGIC_FRAME_MS = 1000 / 60;
    this._fpsBankMs += elapsedMs;
    if (this._fpsBankMs > LOGIC_FRAME_MS * 4) this._fpsBankMs = LOGIC_FRAME_MS * 4;

    let steps = 0;
    while (this._fpsBankMs >= LOGIC_FRAME_MS * 0.92 && steps < 3) {
      this._fpsBankMs -= LOGIC_FRAME_MS;
      steps++;
    }

    try {
      if (steps > 0) {
        let dt = (1 / 60) * steps;
        const dbgScale = getDebugTimeScale();
        if (dbgScale !== 1) {
          dt *= dbgScale;
          const capDt = 0.05 * Math.max(1, dbgScale);
          if (dt > capDt) dt = capDt;
        }

        this._handleGlobalInput();
        if (!this.paused) tickAdvance(this, dt);
        if (this.state === 'stageTransit' && !this.paused) {
          updateStageTransit(this, dt);
        } else if (this.state === 'playing' && !this.paused) {
          updateCombat(this, dt);
        }
        debugTick();

        try {
          const bgMul = this.paused ? 0
            : this.state === 'dialogue' || this.state === 'stageTransit' ? 0.35
              : 1;
          this.playBg?.update(dt * bgMul);
          this.background?.setTendency(this.totalTendency);
          this.background?.update();
        } catch (err) {
          console.error('[game bg]', err);
        } finally {
          // 仅逻辑帧清边沿；失败也必须清，否则 justPressed 卡死 → 暂停连闪
          this.input.endFrame();
        }
      }

      // ---- 描画：跟 rAF / 设置上限，与逻辑 60 完全独立 ----
      let shouldDraw = true;
      const cap = this.fpsLimit > 0 ? Math.max(24, Math.min(240, this.fpsLimit)) : 0;
      if (cap > 0) {
        const minDrawMs = 1000 / cap;
        if (this._lastDrawT > 0 && (t - this._lastDrawT) < minDrawMs * 0.92) {
          shouldDraw = false;
        }
      }
      if (shouldDraw) {
        try {
          drawGameFrame(this);
        } catch (err) {
          console.error('[game draw]', err);
        }
        if (this._fpsLastDrawT != null) {
          const rawDt = Math.max(1e-4, (t - this._fpsLastDrawT) / 1000);
          this._fpsFrames += 1;
          this._fpsAccum += rawDt;
          if (this._fpsAccum >= 0.5) {
            this._fps = Math.round(this._fpsFrames / this._fpsAccum);
            this._fpsFrames = 0;
            this._fpsAccum = 0;
          }
        }
        this._fpsLastDrawT = t;
        this._lastDrawT = t;
      }
    } catch (err) {
      console.error('[game loop]', err);
      try {
        if (this.ctx) {
          this.ctx.fillStyle = '#0c1018';
          this.ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
          if (this.player) drawPlayer(this.ctx, this.player);
          drawFps(this, this.ctx);
        }
      } catch (_) { /* ignore */ }
      try { this.input.endFrame(); } catch (_) { /* ignore */ }
    }
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
      openPause(this);
      return;
    }

    if (this.state === 'dialogue') {
      // Shot 默认即 KeyZ：只走一条确认路径，避免同帧连跳两句
      if (
        this.input.shotPressed()
        || this.input.justPressed('Enter')
        || this.input.justPressed('Space')
      ) {
        advanceDialogue(this);
      }
      return;
    }

    if (this.state === 'routeSelect') {
      if (this.input.justPressed('ArrowLeft') || this.input.justPressed('KeyA')) {
        chooseRoute(this, 'A');
      } else if (this.input.justPressed('ArrowRight') || this.input.justPressed('KeyD')) {
        chooseRoute(this, 'B');
      } else if (this.input.tap) {
        chooseRoute(this, this.input.tap.x < LOGICAL_W * 0.5 ? 'A' : 'B');
      }
    }
  }

  /* ========== 对外 / debug / main 薄入口（模块内已直调，不再经此绕圈） ========== */

  _startChapter() { startChapter(this); }
  _softClearForNextChapter(opts) { softClearForNextChapter(this, opts); }
  _openDialogue(lines, after) { openDialogue(this, lines, after); }
  _showDialogueLine() { showDialogueLine(this); }
  _advanceDialogue() { advanceDialogue(this); }
  _finishChapter(success) { finishChapter(this, success); }
  _scheduleAdvance(sec, fn) { scheduleAdvance(this, sec, fn); }
  _cancelAdvance() { cancelAdvance(this); }
  _tickAdvance(dt) { tickAdvance(this, dt); }
  _nextChapterOrEnd(ch) { nextChapterOrEnd(this, ch); }
  _skipToValidChapter() { skipToValidChapter(this); }
  _afterStage3() { afterStage3(this); }
  _enterRouteSelect() { enterRouteSelect(this); }
  _chooseRoute(route) { chooseRoute(this, route); }
  _jumpToStage(stageKey) { jumpToStage(this, stageKey); }
  _setEndingCinematic(on) { setEndingCinematic(this, on); }
  _showEnding(which) { showEnding(this, which); }
  _gameOver() { gameOver(this); }
  _gameClear() { gameClear(this); }
  _wrapWaveFn(raw) { return wrapWaveFn(this, raw); }

  _bulletsToPointsAndAttract() { bulletsToPointsAndAttract(this); }
  _updateStageTransit(dt) { updateStageTransit(this, dt); }
  _update(dt) { updateCombat(this, dt); }
  _tickChapterBanner(dt) { tickChapterBanner(this, dt); }
  _tryBomb(isDeath) { return tryBomb(this, isDeath); }
  _miss() { miss(this); }
  _hitPlayer() { hitPlayer(this); }
  _collectItem(it) { collectItem(this, it); }
  _checkExtend() { checkExtend(this); }
  _flashMsg(text, sec = 1.2) { flashMsg(this, text, sec); }
  _defaultKillDrop(e) { return defaultKillDrop(this, e); }
  _isLastLetterOfStage(ch) { return isLastLetterOfStage(this, ch); }
  _letterProgressInStage(ch) { return letterProgressInStage(this, ch); }
  _grantLetterResource(ch, perfect, success) { grantLetterResource(this, ch, perfect, success); }
  _burst(x, y, color, n) { burst(this, x, y, color, n); }

  _hideOverlay() { hideOverlay(this); }
  _openPause() { openPause(this); }
  _openResult(opts) { openResult(this, opts); }

  _updateLetterHud() { updateLetterHud(this); }
  _updateHUD() { updateGameHud(this); }
  _draw() { drawGameFrame(this); }
  _drawFps(ctx) { drawFps(this, ctx); }
}
