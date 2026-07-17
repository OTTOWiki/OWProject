import {
  BALANCE, LOGICAL_W, LOGICAL_H, PLAYER_DEFS, SPEAKER_COLORS,
  getDifficulty, rollUnstableEffects, unstableStackCount, calcLetterBonus, unstableCompMul,
  nextExtendThreshold,
} from './config.js';
import {
  Player, Bullet, Item, Particle,
  drawBullet, drawPlayer, drawEnemy, drawItem, drawCollectLine,
} from './entities.js';
import { spawnPlayerShot, fullScreenClear, clearBulletsToItems, spawnBombOrbs } from './patterns.js';
import { buildChapterList, stageIntroFor } from './stages/index.js';
import { getDialogues, getEndingDialogue } from './dialogue.js';
import { saveHiscore, loadHiscore, unlockStage, unlockRoute, loadSettings } from './storage.js';
import { trackForStage } from './audio.js';
import { bgModeFor } from './backgrounds.js';
import { portraitFor } from './assets.js';
import { PlayfieldBackground } from './playfieldBg.js';

export class Game {
  constructor({ canvas, input, audio, background, ui }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = input;
    this.audio = audio;
    this.background = background;
    this.ui = ui;

    this.chapters = buildChapterList();
    this.running = false;
    this.paused = false;
    this.mode = 'story'; // story | practice | stage
    this.raf = 0;
    this.lastT = 0;
    this.playBg = new PlayfieldBackground();
    this._lastBgMode = null;
    this.playerBulletOpacity = loadSettings().playerBulletOpacity;

    this._bindUI();
  }

  /** 从设置同步运行时参数（菜单改设置后 / 开局） */
  applySettings(settings) {
    const s = settings || loadSettings();
    this.playerBulletOpacity = s.playerBulletOpacity ?? 0.3;
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
    this._installEntityHooks();

    this.bossRef = null;
    this.waveFn = null;
    this.waveTimer = 0;
    this.waveCount = 0;
    this.rainT = 0;
    this.laserT = 0;

    this.chapterIndex = this.chapters.findIndex((c) => c.id === startChapter);
    if (this.chapterIndex < 0) this.chapterIndex = 0;

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
    if (this._pendingAdvance) {
      clearTimeout(this._pendingAdvance);
      this._pendingAdvance = null;
    }
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
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame((t) => this._loop(t));
  }

  /** 难度缩放：敌机血量 / 弹速 / 开火间隔；刷怪节奏通过 waveFn 时间缩放 */
  _installEntityHooks() {
    const enemies = this.enemies;
    const bullets = this.bullets;
    const self = this;

    const ePush = Array.prototype.push;
    enemies.push = function pushEnemy(...items) {
      let spawned = 0;
      for (const e of items) {
        if (!e._diffScaled) {
          e.hp = Math.max(1, Math.floor(e.hp * self.enemyHpMul));
          e.maxHp = Math.max(1, Math.floor(e.maxHp * self.enemyHpMul));
          e._fireMul = self.fireIntervalMul;
          e._diffScaled = true;
        }
        spawned++;
      }
      // 真实出怪：刷新「刷怪未耗尽」；勿用 waveCount 空转当活动
      if (spawned > 0 && self.state === 'playing') {
        self._hadWaveEnemySpawn = true;
        self._lastEnemySpawnChapterTime = self.chapterTime;
        self.wavesExhausted = false;
        self._dryWaveTicks = 0;
      }
      return ePush.apply(this, items);
    };

    bullets.push = function pushBullet(...items) {
      for (const b of items) {
        if (b.from === 'enemy' && !b._diffScaled) {
          const m = self.bulletSpeedMul;
          b.vx *= m;
          b.vy *= m;
          if (b.speed) b.speed *= m;
          b._diffScaled = true;
        }
      }
      return ePush.apply(this, items);
    };
  }

  /**
   * 包装 waveFn：区分「波次计数空转」与「真实出怪」
   * 常见写法 waveCount++ 后 if (waveCount > N) return —— 计数仍增但不出怪 → 判刷怪耗尽
   */
  _wrapWaveFn(raw) {
    return (dt) => {
      const beforeLen = this.enemies.length;
      const beforeWc = this.waveCount || 0;
      raw.call(this, dt);
      const afterLen = this.enemies.length;
      const afterWc = this.waveCount || 0;
      if (afterLen > beforeLen) {
        this._hadWaveEnemySpawn = true;
        this._lastEnemySpawnChapterTime = this.chapterTime;
        this.wavesExhausted = false;
        this._dryWaveTicks = 0;
      } else if (afterWc > beforeWc) {
        // waveCount 增加但没有新敌机（刷怪上限后的空转，或纯激光波）
        this._dryWaveTicks = (this._dryWaveTicks || 0) + 1;
        if (this._hadWaveEnemySpawn && this._dryWaveTicks >= 1) {
          this.wavesExhausted = true;
        }
      }
    };
  }

  _purgeDead(arr) {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].dead) arr.splice(i, 1);
    }
  }

  stop() {
    this.running = false;
    this.input.resetShotLatch();
    if (this._pendingAdvance) {
      clearTimeout(this._pendingAdvance);
      this._pendingAdvance = null;
    }
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

  /**
   * 软过渡进下一章：清敌机；可选敌弹变点。
   * convert=true：章末结算（变点收取）；false：仅开章清理，不再二次变点计分。
   */
  _softClearForNextChapter({ convert = true } = {}) {
    if (convert) {
      this._bulletsToPointsAndAttract();
    } else if (this.bullets?.length) {
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        if (b.from !== 'player' || b.dead) this.bullets.splice(i, 1);
      }
    }
    if (this.enemies) this.enemies.length = 0;
    else this.enemies = [];
    this.bossRef = null;
    if (convert && this.bullets?.length) {
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        if (b.from !== 'player' || b.dead) this.bullets.splice(i, 1);
      }
    }
    this._installEntityHooks();
  }

  _startChapter() {
    const ch = this.chapters[this.chapterIndex];
    if (!ch) {
      this._gameClear();
      return;
    }

    // 开章清理：不二次变点计分（章末已 convert）；保留自机位置/自机弹/道具
    this._softClearForNextChapter({ convert: false });

    this.waveFn = null;
    this.waveTimer = 0;
    this.waveCount = 0;
    this._lastWaveCount = 0;
    this._waveStall = 0;
    this.wavesExhausted = false;
    this._hadWaveEnemySpawn = false;
    this._dryWaveTicks = 0;
    this._lastEnemySpawnChapterTime = -999;
    this.rainT = 0;
    this.laserT = 0;
    this.chapterTime = 0;
    this.chapterScore = 0;
    this.chapterMiss = false;
    this.chapterBomb = false;
    this.chapterDone = false;
    this.chapterClearTimer = 0;
    this.chapterTendency = 0;
    this.settlement = null;
    // chapterBanner 跨章保留（结束条可多显示一会，不挡下一章）
    this.stageTransit = null;
    this.stageIntro = null;
    this._pendingChapterBegin = null;

    // unstable
    this.unstableFx = null;
    this.fog = false;
    this.noBomb = false;
    this.bombCost = 1;
    this.atkMul = 1;
    this.scoreMul = 1;
    const useUnstable = ch.unstable && (this.mode === 'practice' ? this.practiceUnstable : true);
    if (useUnstable) {
      this.unstableFx = this.nextUnstableFx
        || rollUnstableEffects(unstableStackCount(ch.stageKey));
      this.nextUnstableFx = null;
      this.atkMul = this.unstableFx.atkMul || 1;
      this.scoreMul = this.unstableFx.scoreMul || 1;
      this.fog = !!this.unstableFx.fog;
      this.noBomb = !!this.unstableFx.noBomb;
      this.bombCost = this.unstableFx.bombCost || 1;
    }

    // Letter 限时与道中 duration 分离：仅 letterTime 走失败超时；duration 见 _update 保底成功
    this.letterTimeMax = ch.letterTime || 0;
    this.letterTimeLeft = this.letterTimeMax;
    this.isBossChapter = ch.kind === 'boss' || ch.kind === 'midboss';

    // audio & bg
    const isBoss = ch.kind === 'boss';
    this.audio.playTrack(ch.music || trackForStage(ch.stageKey, isBoss), isBoss);
    const bgMode = ch.bg || bgModeFor(ch.stageKey, isBoss);
    this.background?.setMode(bgMode);
    // 战斗区伪3D背景：进入新阶段时转场
    const doTrans = this._lastBgMode != null && this._lastBgMode !== bgMode;
    this.playBg.setMode(bgMode, { transition: doTrans });
    this._lastBgMode = bgMode;
    this.el.stageLabel.textContent = typeof ch.stage === 'number' ? `Stage ${ch.stage}` : String(ch.stage);

    if (ch.letter) {
      this.el.letterBanner.classList.remove('hidden');
      this.el.letterBanner.style.opacity = '1';
      this.el.letterName.textContent = ch.letter;
      this._updateLetterHud();
      this.audio.sfx('letter');
    } else {
      this.el.letterBanner.classList.add('hidden');
      if (this.el.letterBonus) this.el.letterBonus.textContent = '';
    }

    const afterBuild = () => {
      try {
        ch.build(this);
      } catch (err) {
        console.error('[chapter build]', ch?.id, ch?.name, err);
        this.waveFn = null;
      }
      // 刷怪节奏：Easy 更慢，Lunatic 更快；并检测刷怪耗尽
      if (this.waveFn) {
        const raw = this.waveFn;
        const scaled = (dt) => {
          try {
            raw.call(this, dt / this.spawnMul);
          } catch (err) {
            console.error('[waveFn]', ch?.id, err);
            this.waveFn = null;
          }
        };
        this.waveFn = this._wrapWaveFn(scaled);
      } else {
        // 无 waveFn：开场已放完怪，清完即本章敌人打完
        this.wavesExhausted = true;
      }
      // build 里同步 push 的敌机也算本章出怪
      if (this.enemies.length > 0) {
        this._hadWaveEnemySpawn = true;
        this._lastEnemySpawnChapterTime = this.chapterTime;
      }
      // 已在场敌机补 fireMul（build 内同步 push 已缩放）
      for (const e of this.enemies) {
        e._fireMul = this.fireIntervalMul;
      }
    };

    const showStartTitle = () => {
      const title = {
        kind: 'start',
        name: ch.name,
        letter: ch.letter || '',
        t: 0,
        duration: 2.0,
      };
      // 结束条还在播：排队，不打断渐隐
      if (this.chapterBanner && this.chapterBanner.kind === 'end') {
        this._queuedStartTitle = title;
        return;
      }
      this._queuedStartTitle = null;
      this.chapterBanner = title;
    };

    const beginChapterContent = () => {
      this._pendingChapterBegin = null;
      this.stageTransit = null;
      showStartTitle();
      if (ch.dialogue && this.dialogues[ch.dialogue]) {
        this._openDialogue(this.dialogues[ch.dialogue], afterBuild);
      } else {
        this.state = 'playing';
        afterBuild();
      }
    };

    // 换「面」时先播过渡页，再进入对话/刷怪
    const sk = String(ch.stageKey);
    if (sk !== this.lastStageKey) {
      this.lastStageKey = sk;
      const info = stageIntroFor(sk);
      if (info) {
        this.stageTransit = {
          arc: info.arc || '',
          label: info.label || '',
          poem: info.poem || info.desc || '',
          t: 0,
          duration: 3.6,
        };
        this.state = 'stageTransit';
        this._pendingChapterBegin = beginChapterContent;
        this._updateHUD();
        return;
      }
    }

    beginChapterContent();
    this._updateHUD();
  }

  _openDialogue(lines, after) {
    this.state = 'dialogue';
    this.dialogueQueue = lines;
    this.dialogueIdx = 0;
    this.pendingAfterDialogue = after;
    this._showDialogueLine();
  }

  _showDialogueLine() {
    const line = this.dialogueQueue[this.dialogueIdx];
    if (!line) {
      this.el.dialogueBox.classList.add('hidden');
      this.state = 'playing';
      const cb = this.pendingAfterDialogue;
      this.pendingAfterDialogue = null;
      cb?.();
      return;
    }
    this.el.dialogueBox.classList.remove('hidden');
    const name = line.name;
    this.el.dialogueName.textContent = name;
    this.el.dialogueName.style.color = SPEAKER_COLORS[name] || '#e2e8f0';
    this.el.dialogueText.textContent = line.text;

    // 东方风立绘（原创资源）
    const img = this.el.dialoguePortrait;
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

  _advanceDialogue() {
    this.dialogueIdx++;
    this._showDialogueLine();
  }

  _loop(t) {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;

    try {
      this._handleGlobalInput();
      if (this.state === 'stageTransit' && !this.paused) {
        this._updateStageTransit(dt);
      } else if (this.state === 'playing' && !this.paused) {
        this._update(dt);
      }
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
        }
      } catch (_) { /* ignore */ }
    }
    this.raf = requestAnimationFrame((nt) => this._loop(nt));
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
    if (this._overlayBound) return;
    this._overlayBound = true;
    this.el.overlayActions?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-overlay]');
      if (!btn || !this.overlayMode) return;
      this._runOverlayAction(btn.dataset.overlay);
    });
  }

  _overlayButtons() {
    return [...(this.el.overlayActions?.querySelectorAll('[data-overlay]') || [])]
      .filter((b) => !b.classList.contains('hidden'));
  }

  _highlightOverlay() {
    const btns = this._overlayButtons();
    btns.forEach((b, i) => b.classList.toggle('selected', i === this.overlayActionIndex));
  }

  _showOverlay({ mode, title, body = '', actions, hint }) {
    this.overlayMode = mode;
    this.overlayActionIndex = 0;
    this.el.overlay?.classList.remove('hidden');
    this.el.overlay?.classList.toggle('mode-result', mode === 'result');
    this.el.overlay?.classList.toggle('mode-pause', mode === 'pause');
    if (this.el.overlayTitle) this.el.overlayTitle.textContent = title;
    if (this.el.overlayBody) this.el.overlayBody.textContent = body || '';
    if (this.el.overlayHint) this.el.overlayHint.textContent = hint || '';

    const all = [...(this.el.overlayActions?.querySelectorAll('[data-overlay]') || [])];
    const want = new Set(actions);
    for (const btn of all) {
      const id = btn.dataset.overlay;
      const show = want.has(id);
      btn.classList.toggle('hidden', !show);
      if (id === 'resume') btn.textContent = '继续';
      if (id === 'settings') btn.textContent = '设置';
      if (id === 'retry') btn.textContent = mode === 'pause' ? '重开本章' : '再试一次';
      if (id === 'menu') btn.textContent = '主菜单';
    }
    this._highlightOverlay();
  }

  _hideOverlay() {
    this.overlayMode = null;
    this.paused = false;
    this.el.overlay?.classList.add('hidden');
  }

  _openPause() {
    if (this.overlayMode === 'result' || this.overlayMode === 'pause') return;
    if (this.state !== 'playing' && this.state !== 'dialogue' && this.state !== 'stageTransit') return;
    this.paused = true;
    this._showOverlay({
      mode: 'pause',
      title: 'PAUSED',
      body: '',
      actions: ['resume', 'settings', 'retry', 'menu'],
      hint: 'Esc/暂停 继续 · ↑↓ 选择 · Z 确认',
    });
  }

  _openResult({ title, body, retryChapter }) {
    this.paused = true;
    this.state = 'gameover';
    this.resultPayload = {
      retryChapter: retryChapter ?? this.chapters[this.chapterIndex]?.id ?? 1,
      difficulty: this.difficultyId,
    };
    this._showOverlay({
      mode: 'result',
      title,
      body,
      actions: ['retry', 'menu'],
      hint: '↑↓ 选择 · Z 确认',
    });
    this.ui?.showGame?.();
  }

  _runOverlayAction(action) {
    if (!this.overlayMode) return;
    if (action === 'resume') {
      if (this.overlayMode === 'pause') this._hideOverlay();
      return;
    }
    if (action === 'settings') {
      if (this.overlayMode !== 'pause') return;
      // 保持暂停，切到设置页；返回后回到暂停菜单
      this.overlayMode = null;
      this.el.overlay?.classList.add('hidden');
      this.paused = true;
      this.ui?.openSettingsFromPause?.(() => {
        this.ui.showGame();
        this._openPause();
      });
      return;
    }
    if (action === 'retry') {
      const chId = this.overlayMode === 'result'
        ? (this.resultPayload?.retryChapter ?? this.chapters[this.chapterIndex]?.id)
        : this.chapters[this.chapterIndex]?.id;
      const keepLives = this.overlayMode === 'pause' ? this.player.lives : undefined;
      this._hideOverlay();
      this.start({
        playerId: this.playerId,
        startChapter: chId,
        mode: this.mode,
        lives: keepLives,
        unstable: this.practiceUnstable,
        singleChapter: this.singleChapter,
        difficulty: this.difficultyId,
      });
      return;
    }
    if (action === 'menu') {
      saveHiscore(this.score);
      this._hideOverlay();
      this.stop();
      this.ui.showMenu();
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
    if (this.overlayMode) {
      const btns = this._overlayButtons();
      if (wantPause && this.overlayMode === 'pause') {
        this._hideOverlay();
        return;
      }
      if (this.input.justPressed('ArrowDown') || this.input.justPressed('KeyS')) {
        this.overlayActionIndex = (this.overlayActionIndex + 1) % Math.max(1, btns.length);
        this._highlightOverlay();
        return;
      }
      if (this.input.justPressed('ArrowUp') || this.input.justPressed('KeyW')) {
        this.overlayActionIndex = (this.overlayActionIndex - 1 + btns.length) % Math.max(1, btns.length);
        this._highlightOverlay();
        return;
      }
      if (
        this.input.shotPressed()
        || this.input.justPressed('Enter')
        || this.input.justPressed('Space')
        || this.input.justPressed('KeyZ')
      ) {
        const id = btns[this.overlayActionIndex]?.dataset.overlay;
        if (id) this._runOverlayAction(id);
        return;
      }
      if (this.overlayMode === 'pause' && this.input.justPressed('KeyR')) {
        this._runOverlayAction('retry');
        return;
      }
      if (this.overlayMode === 'pause' && this.input.justPressed('KeyQ')) {
        this._runOverlayAction('menu');
      }
      return;
    }

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

      // enemies
      for (const e of this.enemies) {
        try {
          e.update(dt, this);
        } catch (err) {
          console.error('[enemy script]', e?.label || e?.kind, err);
          e.script = null;
        }
        if (e.dead && e.onDeath) {
          try {
            e.onDeath(e, this);
          } catch (err) {
            console.error('[enemy onDeath]', err);
          }
        }
      }
    }

    // 最近敌机 → 子机追踪目标；Bomb 巨弹按 slot 分摊目标
    let homeTarget = null;
    let bestD = Infinity;
    const homeList = [];
    for (const e of this.enemies) {
      if (e.dead || e.isSpawning) continue;
      homeList.push(e);
      // 优先画面中前方目标
      const d = Math.hypot(e.x - p.x, e.y - p.y) + (e.y > p.y ? 80 : 0);
      if (d < bestD) {
        bestD = d;
        homeTarget = e;
      }
    }

    // bullets
    for (const b of this.bullets) {
      let ht = null;
      if (b.from === 'player' && b.homing) {
        if (b.type === 'bomb' && homeList.length) {
          ht = homeList[(b._homeSlot || 0) % homeList.length];
        } else {
          ht = homeTarget;
        }
      }
      b.update(dt, p, ht);
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

    // collisions
    if (!settling) this._collisions();

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
        // 道中时长保底（无限刷怪/纯弹幕等）：存活到时即成功
        this._finishChapter(true);
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

    // cleanup（原地删除，避免重建数组丢失难度 push 钩子）
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
    if (p.bombs < cost) return false;
    if (p.bombTimer > 0 && !isDeath) return false;

    p.bombs -= cost;
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
    p.lives -= 1;
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
    if (p.invuln > 0 || p.arbitration > 0 || p.bombTimer > 0) return;
    p.arbitration = this.deathBombWindow || BALANCE.deathBombWindow;
    this.audio.sfx('hit');
  }

  /** 点到线段最短距离（激光判定用） */
  _distPointSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-8) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  /** 敌弹相对自机的有效距离（圆弹=圆心；激光=线段） */
  _bulletDistToPlayer(b, p) {
    if (b.type === 'laser') {
      const len = b.laserLen || 200;
      const ang = b.angle || 0;
      const x2 = b.x + Math.cos(ang) * len;
      const y2 = b.y + Math.sin(ang) * len;
      return this._distPointSeg(p.x, p.y, b.x, b.y, x2, y2);
    }
    return Math.hypot(b.x - p.x, b.y - p.y);
  }

  _collisions() {
    const p = this.player;

    // player bullets vs enemies（bomb 巨弹可穿透并分摊伤害）
    for (const b of this.bullets) {
      if (b.from !== 'player' || b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead || e.isSpawning) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
          if (b.type === 'bomb') {
            if (!b._hitIds) b._hitIds = new Set();
            if (b._hitIds.has(e.id)) continue;
            b._hitIds.add(e.id);
          } else {
            b.dead = true;
          }
          const killed = e.hurt(b.damage);
          if (killed) {
            this.addScore(e.score);
            this._burst(e.x, e.y, e.color, 12);
            const drop = e.drop || this._defaultKillDrop(e);
            if (drop) this.spawnItem(e.x, e.y, drop);
            else if (Math.random() < 0.35) this.spawnItem(e.x, e.y, 'score');
          }
          if (b.type !== 'bomb') break;
        }
      }
    }

    // enemy bullets vs player
    for (const b of this.bullets) {
      if (b.from !== 'enemy' || b.dead || b.delay > 0) continue;

      const dist = this._bulletDistToPlayer(b, p);
      const hitR = b.type === 'laser' ? (b.w || 10) * 0.5 : b.r;

      // graze
      if (!b.grazed && dist < BALANCE.grazeRadius + hitR && dist > p.r + hitR) {
        b.grazed = true;
        p.edit = Math.min(BALANCE.editMax, p.edit + BALANCE.editPerGraze * (this.grazeMul || 1));
        this.addScore(BALANCE.score.graze);
        if (Math.random() < 0.2) this.audio.sfx('graze');
      }

      if (dist < p.r + hitR) {
        b.dead = true;
        this._hitPlayer();
      }
    }

    // body collision with enemies（入场/现身中不碰伤）
    for (const e of this.enemies) {
      if (e.dead || e.isSpawning) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < p.r + e.r * 0.5) {
        this._hitPlayer();
      }
    }
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
    if (this.chapterDone) return;
    this.chapterDone = true;
    const ch = this.chapters[this.chapterIndex];
    const perfect = !this.chapterMiss && !this.chapterBomb;

    // NMNB 结算：Perfect ×1.05 + 负面 Unstable 补偿倍率（仅负面，乘在章分上）
    // chapterScore 已含 scoreMul / diffScoreMul，加成直接加算，禁止再走 addScore 二次乘倍率
    const baseChapter = this.chapterScore;
    let settleMul = 1;
    let unstableComp = 1;
    if (perfect) {
      settleMul *= BALANCE.chapterPerfectMul;
      unstableComp = unstableCompMul(this.unstableFx);
      if (unstableComp > 1) settleMul *= unstableComp;
      if (settleMul > 1 && baseChapter > 0) {
        const bonus = Math.floor(baseChapter * (settleMul - 1));
        if (bonus > 0) {
          this.score += bonus;
          this.chapterScore += bonus;
          const dm = this.diffScoreMul || 1;
          this.baseScore += Math.floor(bonus / dm);
          if (this.score > this.hiscore) this.hiscore = this.score;
          this._checkExtend();
        }
      }
    }

    // Letter 符卡红利：无 Miss/Bomb 且限时内击破；随剩余时间线性递减，随关卡进程抬高
    let letterBonus = 0;
    if (success && perfect && this.letterTimeMax > 0 && (ch.kind === 'boss' || ch.kind === 'midboss')) {
      letterBonus = calcLetterBonus(ch.stageKey, this.letterTimeLeft, this.letterTimeMax);
      if (letterBonus > 0) this.addScore(letterBonus);
      this._grantLetterResource(ch, perfect, success);
    }

    // 负面 Unstable 高补偿 NMNB → 额外 +1 Bomb
    if (perfect && unstableComp >= (BALANCE.resource.unstableCompBombMin ?? 1.15)) {
      this.player.bombs = Math.min(BALANCE.maxBombs, this.player.bombs + 1);
      this.audio.sfx('item');
    }

    if (letterBonus > 0) {
      this.el.bonus.textContent = `Letter +${letterBonus}`;
    } else if (perfect && unstableComp > 1) {
      this.el.bonus.textContent = `NMNB ×${settleMul.toFixed(2)}`;
    } else if (perfect) {
      this.el.bonus.textContent = 'Perfect ×1.05';
    } else {
      this.el.bonus.textContent = '—';
    }

    // tendency award：|偏移| 过小视为中立（贡献 0），不强制偏向 B
    let tendencyContrib = null;
    if (typeof ch.stage === 'number' && ch.stage <= 3) {
      if (Math.abs(this.chapterTendency) < BALANCE.tendencyMinPerChapter) {
        tendencyContrib = 0;
      } else {
        tendencyContrib = this.chapterTendency;
      }
      this.totalTendency += tendencyContrib;
      this.chapterTendency = 0;
    }

    // 非阻塞结算/标题条（渐显渐隐，不拖住下一章）
    this.chapterBanner = {
      kind: 'end',
      name: ch.name,
      score: this.chapterScore,
      perfect,
      letterBonus,
      unstableComp: perfect && unstableComp > 1 ? unstableComp : 0,
      settleMul: perfect ? settleMul : 1,
      tendency: tendencyContrib,
      t: 0,
      duration: 2.1,
    };
    this.settlement = this.chapterBanner; // 兼容旧引用

    // preview next chapter's unstable effect
    this.nextUnstableFx = null;
    let nextIdx = this.chapterIndex + 1;
    while (nextIdx < this.chapters.length) {
      const nc = this.chapters[nextIdx];
      if (!this.routeChoice) break;
      const sk = String(nc.stageKey);
      if ((sk.startsWith('A') && this.routeChoice !== 'A') ||
          (sk.startsWith('B') && this.routeChoice !== 'B') ||
          sk === 'patrol') { nextIdx++; continue; }
      break;
    }
    if (nextIdx < this.chapters.length && this.chapters[nextIdx].unstable) {
      const nc = this.chapters[nextIdx];
      this.nextUnstableFx = rollUnstableEffects(unstableStackCount(nc.stageKey));
      this.chapterBanner.nextUnstable = this.nextUnstableFx.label;
    }

    // 本章结束：敌弹变点并吸引（唯一变点入口）
    this._softClearForNextChapter({ convert: true });

    /** 清场后固定 0.8s 再进下一流程 */
    const NEXT_DELAY = 800;

    if (this.singleChapter || this.mode === 'practice') {
      this._scheduleAdvance(NEXT_DELAY, () => {
        this._openResult({
          title: '练习结束',
          body: `难度：${this.diff.rank} ${this.diff.name}\n章节：${ch.name}\n得分：${this.score}\n${(!this.chapterMiss && !this.chapterBomb) ? 'Perfect Clear!' : ''}`,
          retryChapter: ch.id,
        });
      });
      return;
    }

    // stage unlocks
    if (typeof ch.stage === 'number') unlockStage(ch.stage + 1);

    // after stage 3 chapter 22 → route check
    if (ch.id === 22) {
      this._scheduleAdvance(NEXT_DELAY, () => this._afterStage3());
      return;
    }

    // after patrol 24 → route select
    if (ch.id === 24) {
      this._scheduleAdvance(NEXT_DELAY, () => {
        this._openDialogue(this.dialogues.patrol_win || [], () => this._enterRouteSelect());
      });
      return;
    }

    // win dialogue on route bosses
    if (ch.winDialogue && this.dialogues[ch.winDialogue]) {
      this._scheduleAdvance(NEXT_DELAY, () => {
        this._openDialogue(this.dialogues[ch.winDialogue], () => this._nextChapterOrEnd(ch));
      });
      return;
    }

    if (ch.ending) {
      this._scheduleAdvance(NEXT_DELAY, () => this._showEnding(ch.ending));
      return;
    }

    // 所有怪打完 → 强制结束本章 → 0.8s → 下一章
    this._scheduleAdvance(NEXT_DELAY, () => {
      this.chapterIndex++;
      this._skipToValidChapter();
      this._startChapter();
    });
  }

  /** 短延迟推进；可被 stop/新调度取消。不阻塞标题条动画。 */
  _scheduleAdvance(ms, fn) {
    if (this._pendingAdvance) {
      clearTimeout(this._pendingAdvance);
      this._pendingAdvance = null;
    }
    this._pendingAdvance = setTimeout(() => {
      this._pendingAdvance = null;
      if (!this.running) return;
      fn();
    }, ms);
  }

  _nextChapterOrEnd(ch) {
    if (ch.ending) {
      this._showEnding(ch.ending);
      return;
    }
    this.chapterIndex++;
    this._skipToValidChapter();
    this._startChapter();
  }

  _skipToValidChapter() {
    // if we have routeChoice, only play matching route
    while (this.chapterIndex < this.chapters.length) {
      const c = this.chapters[this.chapterIndex];
      if (!this.routeChoice) break;
      const sk = String(c.stageKey);
      if (sk.startsWith('A') && this.routeChoice !== 'A') {
        this.chapterIndex++;
        continue;
      }
      if (sk.startsWith('B') && this.routeChoice !== 'B') {
        this.chapterIndex++;
        continue;
      }
      if (sk === 'patrol') {
        this.chapterIndex++;
        continue;
      }
      break;
    }
  }

  /** Boss / 道中精英：版面外黑色区域、与 boss 同 x 的 Enemy 标记 */
  _updateBossEnemyMarker() {
    const el = this.el.bossEnemyMarker;
    if (!el) return;

    const boss = this.bossRef;
    const show = !this.endingCinematic
      && boss
      && !boss.dead
      && (this.state === 'playing' || this.state === 'dialogue');

    if (!show) {
      el.classList.add('hidden');
      return;
    }

    const pct = (Math.max(0, Math.min(LOGICAL_W, boss.x)) / LOGICAL_W) * 100;
    el.style.left = `${pct}%`;
    el.classList.remove('hidden');
  }

  _drawTendencyGauge(ctx) {
    const H = LOGICAL_H;
    const W = LOGICAL_W;
    const barW = 280;
    const barH = 8;
    const barX = (W - barW) / 2;
    const barY = H - 18;
    const centerX = W / 2;

    const val = this.chapterTendency;
    const clamped = Math.max(-BALANCE.tendencyMaxPerChapter, Math.min(BALANCE.tendencyMaxPerChapter, val));
    const pointerX = centerX + (clamped / BALANCE.tendencyMaxPerChapter) * (barW / 2);

    ctx.globalAlpha = 0.85;

    // bar background
    const bgGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    bgGrad.addColorStop(0, 'rgba(56,189,248,0.5)');
    bgGrad.addColorStop(0.5, 'rgba(148,163,184,0.3)');
    bgGrad.addColorStop(1, 'rgba(251,146,60,0.5)');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(barX, barY, barW, barH, 4);
    else ctx.rect(barX, barY, barW, barH);
    ctx.fill();

    // center line
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, barY - 2);
    ctx.lineTo(centerX, barY + barH + 2);
    ctx.stroke();

    // tick marks
    for (const pct of [-10, -5, 5, 10]) {
      const tx = centerX + (pct / BALANCE.tendencyMaxPerChapter) * (barW / 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${pct}%`, tx, barY - 8);
    }

    // labels
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('A', barX - 8, barY + barH / 2 + 4);

    ctx.fillStyle = '#fb923c';
    ctx.textAlign = 'left';
    ctx.fillText('B', barX + barW + 8, barY + barH / 2 + 4);

    // pointer diamond
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

    // percentage number next to pointer
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    const numY = barY + barH + pd * 2 + 12;
    ctx.fillText(`${val.toFixed(1)}%`, pointerX, numY);

    ctx.globalAlpha = 1;
  }

  /** 非阻塞章标题 / 结算条（渐显·停留·渐隐，无底框） */
  _drawChapterBanner(ctx, W, H) {
    const s = this.chapterBanner || this.settlement;
    if (!s) return;
    const dur = s.duration || 2.1;
    const t = Math.min(s.t, dur);
    const fadeIn = 0.35;
    const fadeOut = 0.55;
    let alpha = 1;
    if (t < fadeIn) alpha = t / fadeIn;
    else if (t > dur - fadeOut) alpha = Math.max(0, (dur - t) / fadeOut);
    // ease
    alpha = alpha * alpha * (3 - 2 * alpha);

    ctx.save();
    ctx.globalAlpha = alpha;

    const cx = W / 2;
    const isStart = s.kind === 'start';
    const cy = isStart ? H * 0.28 : H / 2 - 48;

    // 标题文字轻描边，无底框
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
      if (s.letter) {
        drawTitle(s.letter, cy + 26, 14, '#e9d5ff');
      }
      ctx.restore();
      return;
    }

    // chapter score
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
      ctx.fillText('PERFECT ×1.05', cx, nextY);
      nextY += 18;
    }
    if (s.unstableComp > 1) {
      ctx.fillStyle = '#c4b5fd';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`UNSTABLE 补偿 ×${s.unstableComp.toFixed(2)}`, cx, nextY);
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

  _drawSettlement(ctx, W, H) {
    this._drawChapterBanner(ctx, W, H);
  }

  /** 关卡（面）过渡页：诗意文案 + 右下角「少女祈祷中...」 */
  _drawStageTransit(ctx, W, H) {
    const st = this.stageTransit;
    if (!st) return;
    const dur = st.duration;
    const t = st.t;
    let alpha = 1;
    const fadeIn = 0.45;
    const fadeOut = 0.7;
    if (t < fadeIn) alpha = t / fadeIn;
    else if (t > dur - fadeOut) alpha = Math.max(0, (dur - t) / fadeOut);

    // 全版压暗
    ctx.save();
    ctx.globalAlpha = 0.72 * alpha;
    ctx.fillStyle = '#06050c';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;

    const cx = W / 2;
    const cy = H * 0.38;

    // 篇章名
    if (st.arc) {
      ctx.fillStyle = '#d4b56a';
      ctx.font = '18px "Songti SC","SimSun",serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.arc, cx, cy - 36);
    }

    // 饰线
    ctx.strokeStyle = 'rgba(212,181,106,0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 90, cy - 18);
    ctx.lineTo(cx + 90, cy - 18);
    ctx.stroke();

    // 关卡名
    ctx.fillStyle = '#f1e6c8';
    ctx.font = 'bold 24px "Songti SC","SimSun",serif';
    ctx.textAlign = 'center';
    ctx.fillText(st.label || '', cx, cy + 14);

    // 诗意过场（按 \n 分行，过长再折）
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

    // 右下角：少女祈祷中...
    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(performance.now() / 700));
    ctx.globalAlpha = alpha * pulse;
    ctx.fillStyle = '#c9b896';
    ctx.font = '13px "Songti SC","SimSun",serif';
    ctx.textAlign = 'right';
    ctx.fillText('少女祈祷中...', W - 18, H - 22);

    ctx.restore();
  }

  _drawStageIntro(ctx, W, H) {
    // 兼容旧 stageIntro 字段；正式路径走 stageTransit
    if (this.stageTransit) {
      this._drawStageTransit(ctx, W, H);
      return;
    }
    const si = this.stageIntro;
    if (!si) return;
    this.stageTransit = {
      arc: si.arc,
      label: si.label,
      poem: si.poem || si.desc || '',
      t: si.t,
      duration: si.duration,
    };
    this._drawStageTransit(ctx, W, H);
    this.stageTransit = null;
  }

  _afterStage3() {
    const t = this.totalTendency;
    const need = BALANCE.tendencyThreshold;
    if (t <= -need) {
      this.routeChoice = 'A';
      unlockRoute('A');
      this._jumpToStage('A4');
    } else if (t >= need) {
      this.routeChoice = 'B';
      unlockRoute('B');
      this._jumpToStage('B4');
    } else {
      this.chapterIndex = this.chapters.findIndex((c) => c.id === 23);
      this._startChapter();
    }
  }

  _enterRouteSelect() {
    this.state = 'routeSelect';
    this.el.dialogueBox.classList.remove('hidden');
    this.el.dialogueName.textContent = '系统';
    this.el.dialogueName.style.color = SPEAKER_COLORS['系统'];
    this.el.dialogueText.textContent = '← A线 门构皮蒂娅　　B线 善雅乡 →\n（点左侧 A / 右侧 B，或方向键）';
  }

  _chooseRoute(route) {
    this.routeChoice = route;
    unlockRoute(route);
    this.el.dialogueBox.classList.add('hidden');
    this.state = 'playing';
    this._jumpToStage(route === 'A' ? 'A4' : 'B4');
  }

  _jumpToStage(stageKey) {
    this.chapterIndex = this.chapters.findIndex((c) => c.stageKey === stageKey && c.kind === 'mid');
    if (this.chapterIndex < 0) {
      this.chapterIndex = this.chapters.findIndex((c) => c.stageKey === stageKey);
    }
    this._startChapter();
  }

  _setEndingCinematic(on) {
    this.endingCinematic = !!on;
    document.getElementById('screen-game')?.classList.toggle('ending-cinematic', !!on);
    if (on) {
      this.el.letterBanner?.classList.add('hidden');
      this.enemies.length = 0;
      this.bullets.length = 0;
      this.items = [];
      this.particles = [];
      this.bossRef = null;
      this.waveFn = null;
      this.chapterDone = true;
      this.settlement = null;
      this.stageIntro = null;
    }
  }

  _showEnding(which) {
    saveHiscore(this.score);
    this.audio.stopMusic(0.8);
    const title = which === 'A'
      ? '结局A · 不倒闭的真理'
      : which === 'EX'
        ? 'Extra 结局 · 清出键政'
        : '结局B · 散去的幻影';
    const lines = getEndingDialogue(which, this.playerId);
    this._setEndingCinematic(true);
    this._openDialogue(lines, () => {
      this._setEndingCinematic(false);
      this._openResult({
        title,
        body: `难度：${this.diff.rank} ${this.diff.name}\n最终得分：${this.score}`,
        retryChapter: which === 'EX' ? 129 : 1,
      });
    });
  }

  _gameOver() {
    const ch = this.chapters[this.chapterIndex];
    saveHiscore(this.score);
    const body = `难度：${this.diff.rank} ${this.diff.name}\n章节：${ch.name}\n得分：${this.score}\n倾向：${this.totalTendency.toFixed(0)}%`;
    const show = () => {
      this.audio.stopMusic(0.6);
      this._openResult({
        title: 'Game Over',
        body,
        retryChapter: ch.id,
      });
    };
    if (ch.loseDialogue && this.dialogues[ch.loseDialogue]) {
      this._openDialogue(this.dialogues[ch.loseDialogue], show);
    } else {
      show();
    }
  }

  _gameClear() {
    saveHiscore(this.score);
    this.audio.stopMusic(0.8);
    this._openResult({
      title: 'All Clear',
      body: `全关卡完成！\n难度：${this.diff.rank} ${this.diff.name}\n得分：${this.score}`,
      retryChapter: 1,
    });
  }

  _updateLetterHud() {
    const banner = this.el.letterBanner;
    if (!banner || banner.classList.contains('hidden')) return;
    const ch = this.chapters[this.chapterIndex];
    const tLeft = Math.max(0, this.letterTimeLeft);
    if (this.el.letterRemain && ch) {
      const { idx, total, remain } = this._letterProgressInStage(ch);
      if (total > 0) {
        this.el.letterRemain.textContent = `LETTER ${idx}/${total} · 剩余 ${remain}`;
      } else {
        this.el.letterRemain.textContent = '';
      }
    }
    if (this.el.letterTimer) {
      this.el.letterTimer.textContent = `TIME ${tLeft.toFixed(1)}`;
    }
    if (this.el.letterBonus && ch && this.letterTimeMax > 0) {
      const eligible = !this.chapterMiss && !this.chapterBomb && !this.chapterDone;
      const bonus = eligible
        ? calcLetterBonus(ch.stageKey, tLeft, this.letterTimeMax)
        : 0;
      this.el.letterBonus.textContent = `BONUS ${bonus}`;
      this.el.letterBonus.style.opacity = eligible ? '1' : '0.45';
    }
    // 自机靠近版面右上时降低不透明度，避免挡弹
    const p = this.player;
    if (p) {
      const rx = p.x / LOGICAL_W;
      const ry = p.y / LOGICAL_H;
      const near = Math.max(0, (rx - 0.55) / 0.45) * Math.max(0, (0.42 - ry) / 0.42);
      banner.style.opacity = String(1 - 0.78 * Math.min(1, near));
    }
  }

  _updateHUD() {
    const p = this.player;
    this.el.score.textContent = String(Math.floor(this.score));
    this.el.hiscore.textContent = String(Math.floor(this.hiscore));
    this.el.lives.innerHTML = Array.from({ length: Math.max(0, p.lives) }, () =>
      '<span class="icon-dot life"></span>').join('');
    this.el.bombs.innerHTML = Array.from({ length: Math.max(0, p.bombs) }, () =>
      '<span class="icon-dot bomb"></span>').join('');
    const pct = (p.edit / BALANCE.editMax) * 100;
    this.el.edit.style.width = `${pct}%`;
    this.el.edit.classList.toggle('full', p.edit >= BALANCE.editMax);
    this.el.unstable.textContent = this.unstableFx ? this.unstableFx.label : 'OFF';
    this.el.tendency.textContent = `${this.totalTendency.toFixed(0)}%`;
    const ch = this.chapters[this.chapterIndex];
    this.el.chapter.textContent = ch ? ch.name : '—';
    if (this.el.difficulty && this.diff) {
      this.el.difficulty.textContent = `${this.diff.rank} ${this.diff.name}`;
      this.el.difficulty.style.color = this.diff.color;
    }
    this._updateLetterHud();
  }

  _draw() {
    const ctx = this.ctx;
    const W = LOGICAL_W;
    const H = LOGICAL_H;

    // 结局故事：纯黑空白，不画版面/实体
    if (this.endingCinematic) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
      return;
    }

    // 伪 3D 前推战斗背景
    if (this.playBg) {
      this.playBg.draw(ctx);
    } else {
      ctx.fillStyle = '#0c1018';
      ctx.fillRect(0, 0, W, H);
    }

    // 收点线（浅色虚线）
    drawCollectLine(ctx, W);

    // items
    for (const it of this.items) drawItem(ctx, it);

    // enemies
    for (const e of this.enemies) drawEnemy(ctx, e);

    // enemy bullets
    for (const b of this.bullets) {
      if (b.from === 'enemy') drawBullet(ctx, b);
    }

    // player
    if (this.player) drawPlayer(ctx, this.player);

    // player bullets（可调不透明度）
    const pAlpha = this.playerBulletOpacity ?? 0.3;
    for (const b of this.bullets) {
      if (b.from === 'player') drawBullet(ctx, b, pAlpha);
    }

    // particles
    for (const pt of this.particles) {
      ctx.globalAlpha = pt.life / pt.max;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // fog unstable
    if (this.fog && this.player) {
      const g = ctx.createRadialGradient(
        this.player.x, this.player.y, 60,
        this.player.x, this.player.y, 220
      );
      g.addColorStop(0, 'transparent');
      g.addColorStop(1, 'rgba(5,8,14,0.88)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // bomb flash
    if (this.player?.bombTimer > 0) {
      ctx.fillStyle = `rgba(196,181,253,${0.15 * (this.player.bombTimer / BALANCE.bombDuration)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // tendency gauge (stages 1-3, during gameplay)
    if (this.state === 'playing' && !this.chapterDone) {
      const ch = this.chapters[this.chapterIndex];
      if (ch && typeof ch.stage === 'number' && ch.stage <= 3) {
        this._drawTendencyGauge(ctx);
      }
    }

    // Boss 水平位置标记（版面外 DOM）
    this._updateBossEnemyMarker();

    // route select portals
    if (this.state === 'routeSelect') {
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

    // 关卡过渡页（压在结算之上）
    if (this.stageTransit) {
      this._drawStageTransit(ctx, W, H);
    } else if (this.stageIntro) {
      this._drawStageIntro(ctx, W, H);
    }

    // 章标题/结算条（非阻塞；关卡过渡页期间仍可淡出显示）
    if (this.chapterBanner || this.settlement) {
      if (!this.stageTransit) this._drawChapterBanner(ctx, W, H);
    }
  }
}
