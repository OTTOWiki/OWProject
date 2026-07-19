import {
  LOGICAL_W, PLAYER_DEFS,
  getDifficulty,
} from './config.js';
import { Player } from './entities.js';
import { drawPlayer } from './draw/index.js';
import { drawGameFrame, drawFps } from './gameDraw.js';
import {
  bindOverlayClicks, hideOverlay, openPause, openResult,
  runOverlayAction, handleOverlayInput, highlightOverlay, overlayButtons,
} from './gameOverlay.js';
import * as chapterFlow from './chapterFlow.js';
import * as combat from './gameCombat.js';
import { buildChapterList } from './stages/index.js';
import { getDialogues } from './dialogue.js';
import { loadHiscore, loadSettings } from './storage.js';
import { PlayfieldBackground } from './playfieldBg.js';
import {
  createHudCache, updateGameHud, updateLetterHud,
} from './hud.js';
import { getDebugTimeScale, debugTick } from './debug.js';
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

  _bulletsToPointsAndAttract() {
    combat.bulletsToPointsAndAttract(this);
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

    // ---- 逻辑推进：固定 60fps（判定/碰撞/刷怪/物理） ----
    const LOGIC_FRAME_MS = 1000 / 60;
    this._fpsBankMs += elapsedMs;
    if (this._fpsBankMs > LOGIC_FRAME_MS * 4) this._fpsBankMs = LOGIC_FRAME_MS * 4;

    let steps = 0;
    while (this._fpsBankMs >= LOGIC_FRAME_MS * 0.92 && steps < 3) {
      this._fpsBankMs -= LOGIC_FRAME_MS;
      steps++;
    }

    if (steps <= 0) return;

    let dt = (1 / 60) * steps;

    const dbgScale = getDebugTimeScale();
    if (dbgScale !== 1) {
      dt *= dbgScale;
      const capDt = 0.05 * Math.max(1, dbgScale);
      if (dt > capDt) dt = capDt;
    }

    try {
      this._handleGlobalInput();
      // 章间推进用游戏时间；暂停冻结
      if (!this.paused) this._tickAdvance(dt);
      if (this.state === 'stageTransit' && !this.paused) {
        this._updateStageTransit(dt);
      } else if (this.state === 'playing' && !this.paused) {
        this._update(dt);
      }
      debugTick();

      // 背景滚动跟逻辑时间（对话/过渡时也缓慢前推）
      const bgMul = this.paused ? 0
        : this.state === 'dialogue' || this.state === 'stageTransit' ? 0.35
          : 1;
      this.playBg?.update(dt * bgMul);
      this.background?.setTendency(this.totalTendency);
      this.background?.update();

      // ---- 描画节流（墙钟）：与逻辑 dt 脱钩，设置 30 时角标应≈30 ----
      // 无限制时每逻辑步进出一帧（≈60，受 rAF/屏刷限制，不是逻辑计数器伪装）
      let shouldDraw = true;
      const cap = this.fpsLimit > 0 ? Math.max(24, Math.min(240, this.fpsLimit)) : 0;
      if (cap > 0) {
        const minDrawMs = 1000 / cap;
        if (this._lastDrawT > 0 && (t - this._lastDrawT) < minDrawMs * 0.92) {
          shouldDraw = false;
        }
      }
      if (shouldDraw) {
        this._draw();
        // 描画帧率：只按实际 _draw 的墙钟间隔统计
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
      // 保底：避免异常后版面永久黑屏
      try {
        if (this.ctx) {
          this.ctx.fillStyle = '#0c1018';
          this.ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
          if (this.player) drawPlayer(this.ctx, this.player);
          this._drawFps(this.ctx);
        }
      } catch (_) { /* ignore */ }
    }

    // 每个逻辑步进帧都清边沿，避免描画跳帧时 shot/bomb/对话连触发
    this.input.endFrame();
  }

  _drawFps(ctx) {
    drawFps(this, ctx);
  }

  /** 关卡过渡页计时；期间继续吸点，不刷怪 */
  _updateStageTransit(dt) {
    combat.updateStageTransit(this, dt);
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
    combat.updateCombat(this, dt);
  }


  _tickChapterBanner(dt) {
    combat.tickChapterBanner(this, dt);
  }


  _tryBomb(isDeath) {
    return combat.tryBomb(this, isDeath);
  }


  _miss() {
    combat.miss(this);
  }


  _hitPlayer() {
    combat.hitPlayer(this);
  }


  _collectItem(it) {
    combat.collectItem(this, it);
  }


  addScore(n) {
    combat.addScore(this, n);
  }


  _checkExtend() {
    combat.checkExtend(this);
  }


  _flashMsg(text, sec = 1.2) {
    combat.flashMsg(this, text, sec);
  }


  /** 击破默认掉落：道中 midboss 章主敌 → bomb（难度可关） */
  _defaultKillDrop(e) {
    return combat.defaultKillDrop(this, e);
  }


  /** 是否为本 stage 最后一张 Letter（boss 章） */
  _isLastLetterOfStage(ch) {
    return combat.isLastLetterOfStage(this, ch);
  }


  _letterProgressInStage(ch) {
    return combat.letterProgressInStage(this, ch);
  }


  /** Letter NMNB 资源掉落（midboss 已在击破时固定掉 B，此处只处理 boss Letter） */
  _grantLetterResource(ch, perfect, success) {
    combat.grantLetterResource(this, ch, perfect, success);
  }


  spawnItem(x, y, kind = 'score') {
    combat.spawnItem(this, x, y, kind);
  }


  _burst(x, y, color, n) {
    combat.burst(this, x, y, color, n);
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
