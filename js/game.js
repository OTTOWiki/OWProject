import {
  BALANCE, LOGICAL_W, LOGICAL_H, PLAYER_DEFS, SPEAKER_COLORS, UNSTABLE_POOL,
  getDifficulty,
} from './config.js';
import {
  Player, Bullet, Item, Particle,
  drawBullet, drawPlayer, drawEnemy, drawItem, drawCollectLine,
} from './entities.js';
import { spawnPlayerShot, fullScreenClear, clearBulletsToItems } from './patterns.js';
import { buildChapterList } from './stages.js';
import { getDialogues, ENDING_A, ENDING_B } from './dialogue.js';
import { saveHiscore, loadHiscore, unlockStage, unlockRoute } from './storage.js';
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

    this._bindUI();
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
      pause: document.getElementById('pause-overlay'),
      letterBanner: document.getElementById('letter-banner'),
      letterName: document.getElementById('letter-name'),
      letterTimer: document.getElementById('letter-timer'),
      flash: document.getElementById('flash-msg'),
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

    this.score = 0;
    this.hiscore = loadHiscore();
    this.tendencyA = 0;
    this.tendencyB = 0;
    this.tendencyProgressA = 0;
    this.tendencyProgressB = 0;

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

    this.running = true;
    this.paused = false;
    this.el.pause.classList.add('hidden');
    this.el.flash.classList.add('hidden');
    this.el.dialogueBox.classList.add('hidden');
    this.el.hiscore.textContent = String(this.hiscore);
    this.el.playerName.textContent = this.player.def.name;
    if (this.el.difficulty) {
      this.el.difficulty.textContent = `${this.diff.rank} ${this.diff.name}`;
      this.el.difficulty.style.color = this.diff.color;
    }

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
      for (const e of items) {
        if (!e._diffScaled) {
          e.hp = Math.max(1, Math.floor(e.hp * self.enemyHpMul));
          e.maxHp = Math.max(1, Math.floor(e.maxHp * self.enemyHpMul));
          e._fireMul = self.fireIntervalMul;
          e._diffScaled = true;
        }
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

  _purgeDead(arr) {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].dead) arr.splice(i, 1);
    }
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.audio.stopMusic(0.5);
  }

  _startChapter() {
    const ch = this.chapters[this.chapterIndex];
    if (!ch) {
      this._gameClear();
      return;
    }

    if (this.bullets) this.bullets.length = 0;
    else this.bullets = [];
    if (this.enemies) this.enemies.length = 0;
    else this.enemies = [];
    this._installEntityHooks();
    this.items = [];
    this.bossRef = null;
    this.waveFn = null;
    this.waveTimer = 0;
    this.waveCount = 0;
    this.rainT = 0;
    this.laserT = 0;
    this.chapterTime = 0;
    this.chapterScore = 0;
    this.chapterMiss = false;
    this.chapterBomb = false;
    this.chapterDone = false;
    this.chapterClearTimer = 0;

    // unstable
    this.unstableFx = null;
    this.fog = false;
    this.noBomb = false;
    this.bombCost = 1;
    this.atkMul = 1;
    this.scoreMul = 1;
    const useUnstable = ch.unstable && (this.mode === 'practice' ? this.practiceUnstable : true);
    if (useUnstable) {
      this.unstableFx = UNSTABLE_POOL[Math.floor(Math.random() * UNSTABLE_POOL.length)];
      this.atkMul = this.unstableFx.atkMul || 1;
      this.scoreMul = this.unstableFx.scoreMul || 1;
      this.fog = !!this.unstableFx.fog;
      this.noBomb = !!this.unstableFx.noBomb;
      this.bombCost = this.unstableFx.bombCost || 1;
    }

    this.letterTimeLeft = ch.letterTime || ch.duration || 0;
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
      this.el.letterName.textContent = ch.letter;
      this.audio.sfx('letter');
    } else {
      this.el.letterBanner.classList.add('hidden');
    }

    const afterBuild = () => {
      ch.build(this);
      // 刷怪节奏：Easy 更慢，Lunatic 更快
      if (this.waveFn) {
        const raw = this.waveFn;
        this.waveFn = (dt) => raw.call(this, dt / this.spawnMul);
      }
      // 已在场敌机补 fireMul（build 内同步 push 已缩放）
      for (const e of this.enemies) {
        e._fireMul = this.fireIntervalMul;
      }
    };

    if (ch.dialogue && this.dialogues[ch.dialogue]) {
      this._openDialogue(this.dialogues[ch.dialogue], afterBuild);
    } else {
      afterBuild();
    }

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

    this._handleGlobalInput();
    if (this.state === 'playing' && !this.paused) {
      this._update(dt);
    }
    // 背景始终滚动（对话时也缓慢前推）
    this.playBg?.update(this.paused ? 0 : dt * (this.state === 'dialogue' ? 0.35 : 1));
    this._draw();
    this.background?.setTendency(this.tendencyA, this.tendencyB);
    this.background?.update();
    this.input.endFrame();
    this.raf = requestAnimationFrame((nt) => this._loop(nt));
  }

  _handleGlobalInput() {
    if (this.state === 'dialogue') {
      if (this.input.shotPressed() || this.input.justPressed('Enter') || this.input.justPressed('Space')) {
        this._advanceDialogue();
      }
      // touch on dialogue
      if (this.input.justPressed('KeyZ')) this._advanceDialogue();
      return;
    }

    if (this.state === 'routeSelect') {
      if (this.input.justPressed('ArrowLeft') || this.input.justPressed('KeyA')) {
        this._chooseRoute('A');
      } else if (this.input.justPressed('ArrowRight') || this.input.justPressed('KeyD')) {
        this._chooseRoute('B');
      }
      return;
    }

    if (this.input.justPressed('Escape')) {
      if (this.state === 'playing') {
        this.paused = !this.paused;
        this.el.pause.classList.toggle('hidden', !this.paused);
      }
    }
    if (this.paused) {
      if (this.input.justPressed('KeyR')) {
        this.start({
          playerId: this.playerId,
          startChapter: this.chapters[this.chapterIndex].id,
          mode: this.mode,
          lives: this.player.lives,
          unstable: this.practiceUnstable,
          singleChapter: this.singleChapter,
          difficulty: this.difficultyId,
        });
      }
      if (this.input.justPressed('KeyQ')) {
        this.stop();
        this.ui.showMenu();
      }
    }
  }

  _update(dt) {
    const p = this.player;
    const ch = this.chapters[this.chapterIndex];

    // 决死 Bomb：在审核窗口内优先处理
    let deathSaved = false;
    if (p.arbitration > 0) {
      this.el.flash.classList.remove('hidden');
      this.el.flash.textContent = '违规编辑！';
      if (this.input.bombPressed() && this._tryBomb(true)) {
        p.arbitration = 0;
        deathSaved = true;
        this.el.flash.classList.add('hidden');
      }
    }

    const arbBefore = p.arbitration;
    p.update(dt, this.input);

    // 审核窗口结束且未决死成功 → Miss
    if (arbBefore > 0 && p.arbitration <= 0 && !deathSaved) {
      this.el.flash.classList.add('hidden');
      this._miss();
      if (!this.running || this.player.lives < 0) return;
    }

    // tendency (stage 1-3 only)
    if (typeof ch.stage === 'number' && ch.stage <= 3 && ch.tendencyPoints) {
      if (p.x < BALANCE.tendencyLeftBound) {
        this.tendencyProgressA += BALANCE.tendencyPerSec * dt;
      } else if (p.x > BALANCE.tendencyRightBound) {
        this.tendencyProgressB += BALANCE.tendencyPerSec * dt;
      }
    }

    // shot
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
      e.update(dt, this);
      if (e.dead && e.onDeath) e.onDeath(e, this);
    }

    // 最近敌机 → 子机追踪目标
    let homeTarget = null;
    let bestD = Infinity;
    for (const e of this.enemies) {
      if (e.dead) continue;
      // 优先画面中前方目标
      const d = Math.hypot(e.x - p.x, e.y - p.y) + (e.y > p.y ? 80 : 0);
      if (d < bestD) {
        bestD = d;
        homeTarget = e;
      }
    }

    // bullets
    for (const b of this.bullets) {
      b.update(dt, p, b.from === 'player' && b.homing ? homeTarget : null);
    }

    // items
    for (const it of this.items) {
      it.update(dt, p, p.bombTimer > 0);
      if (Math.hypot(it.x - p.x, it.y - p.y) < it.r + 10) {
        it.dead = true;
        this._collectItem(it);
      }
    }

    // particles
    for (const pt of this.particles) pt.update(dt);

    // collisions
    this._collisions();

    // chapter timer
    this.chapterTime += dt;
    if (this.letterTimeLeft > 0) {
      this.letterTimeLeft -= dt;
      this.el.letterTimer.textContent = `TIME ${Math.max(0, this.letterTimeLeft).toFixed(1)}`;
      if (this.letterTimeLeft <= 0 && !this.chapterDone) {
        // timeout: for boss, force damage or end card
        if (this.bossRef && !this.bossRef.dead) {
          this.bossRef.hp = 0;
          this.bossRef.dead = true;
        }
        this._finishChapter(false);
      }
    } else if (ch.duration && this.chapterTime >= ch.duration && !this.chapterDone) {
      // mid chapter time end — clear remaining mobs
      this._finishChapter(true);
    }

    // boss/elite dead
    if (!this.chapterDone && this.bossRef && this.bossRef.dead) {
      this._finishChapter(true);
    }

    // mid chapters: all waves done + no enemies
    if (!this.chapterDone && ch.kind === 'mid' && ch.duration && this.chapterTime > 3) {
      const expected = 8;
      if ((this.waveCount || 0) >= expected && this.enemies.length === 0 && this.chapterTime > 8) {
        // allow natural duration end
      }
    }

    // cleanup（原地删除，避免重建数组丢失难度 push 钩子）
    this._purgeDead(this.bullets);
    this._purgeDead(this.enemies);
    this.items = this.items.filter((i) => !i.dead);
    this.particles = this.particles.filter((pt) => !pt.dead);

    this._updateHUD();
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
    this.audio.sfx('bomb');
    this._burst(p.x, p.y, '#c4b5fd', 40);
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
    p.bombs = Math.max(p.bombs, 3);
    p.invuln = 3;
    p.resetPos();
  }

  _hitPlayer() {
    const p = this.player;
    if (p.invuln > 0 || p.arbitration > 0 || p.bombTimer > 0) return;
    p.arbitration = this.deathBombWindow || BALANCE.deathBombWindow;
    this.audio.sfx('hit');
  }

  _collisions() {
    const p = this.player;

    // player bullets vs enemies
    for (const b of this.bullets) {
      if (b.from !== 'player' || b.dead) continue;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
          b.dead = true;
          const killed = e.hurt(b.damage);
          if (killed) {
            this.addScore(e.score);
            this._burst(e.x, e.y, e.color, 12);
            if (e.drop) this.spawnItem(e.x, e.y, e.drop);
            else if (Math.random() < 0.35) this.spawnItem(e.x, e.y, 'score');
            if (e.type === 'boss') this.addScore(BALANCE.score.letterBonus * 0.3);
          }
          break;
        }
      }
    }

    // enemy bullets vs player
    for (const b of this.bullets) {
      if (b.from !== 'enemy' || b.dead || b.delay > 0) continue;

      const dist = Math.hypot(b.x - p.x, b.y - p.y);

      // graze
      if (!b.grazed && dist < BALANCE.grazeRadius + b.r && dist > p.r + b.r) {
        b.grazed = true;
        p.edit = Math.min(BALANCE.editMax, p.edit + BALANCE.editPerGraze * (this.grazeMul || 1));
        this.addScore(BALANCE.score.graze);
        if (Math.random() < 0.2) this.audio.sfx('graze');
      }

      // hit
      let hit = dist < p.r + b.r;
      if (b.type === 'laser') {
        // approximate laser as moving orb with length (simplified)
        hit = dist < p.r + b.r;
      }
      if (hit) {
        b.dead = true;
        this._hitPlayer();
      }
    }

    // body collision with enemies
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < p.r + e.r * 0.5) {
        this._hitPlayer();
      }
    }
  }

  _collectItem(it) {
    if (it.kind === 'score') this.addScore(BALANCE.score.itemSmall);
    else if (it.kind === 'scoreL') this.addScore(BALANCE.score.itemLarge);
    else if (it.kind === 'life') this.player.lives = Math.min(BALANCE.maxLives, this.player.lives + 1);
    else if (it.kind === 'bomb') this.player.bombs = Math.min(BALANCE.maxBombs, this.player.bombs + 1);
  }

  addScore(n) {
    const v = Math.floor(n * this.scoreMul * (this.diffScoreMul || 1));
    this.score += v;
    this.chapterScore += v;
    if (this.score > this.hiscore) {
      this.hiscore = this.score;
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

    // perfect bonus
    let mul = 1;
    if (!this.chapterMiss && !this.chapterBomb) {
      mul = BALANCE.chapterPerfectMul;
      this.addScore(this.chapterScore * (mul - 1));
    }
    // apply remaining chapter score already counted; show bonus
    this.el.bonus.textContent = (!this.chapterMiss && !this.chapterBomb) ? 'Perfect ×1.05' : '—';

    // tendency award
    if (ch.tendencyPoints && typeof ch.stage === 'number' && ch.stage <= 3) {
      const total = this.tendencyProgressA + this.tendencyProgressB + 0.001;
      const aShare = this.tendencyProgressA / total;
      // award whole points toward A or B based on dominance; split if close
      if (aShare > 0.55) this.tendencyA += ch.tendencyPoints;
      else if (aShare < 0.45) this.tendencyB += ch.tendencyPoints;
      else {
        // split
        this.tendencyA += Math.floor(ch.tendencyPoints / 2);
        this.tendencyB += Math.ceil(ch.tendencyPoints / 2);
      }
      this.tendencyProgressA = 0;
      this.tendencyProgressB = 0;
    }

    // clear field briefly（保留 hooks）
    this.enemies.length = 0;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (this.bullets[i].from !== 'player') this.bullets.splice(i, 1);
    }

    if (this.singleChapter || this.mode === 'practice') {
      setTimeout(() => {
        if (!this.running) return;
        this.stop();
        this.ui.showResult({
          title: '练习结束',
          body: `难度：${this.diff.rank} ${this.diff.name}\n章节：${ch.name}\n得分：${this.score}\n${(!this.chapterMiss && !this.chapterBomb) ? 'Perfect Clear!' : ''}`,
          difficulty: this.difficultyId,
        });
      }, 800);
      return;
    }

    // stage unlocks
    if (typeof ch.stage === 'number') unlockStage(ch.stage + 1);

    // after stage 3 chapter 22 → route check
    if (ch.id === 22) {
      setTimeout(() => this._afterStage3(), 1000);
      return;
    }

    // after patrol 24 → route select
    if (ch.id === 24) {
      setTimeout(() => {
        if (!this.running) return;
        this._openDialogue(this.dialogues.patrol_win || [], () => this._enterRouteSelect());
      }, 800);
      return;
    }

    // win dialogue on route bosses
    if (ch.winDialogue && this.dialogues[ch.winDialogue]) {
      setTimeout(() => {
        if (!this.running) return;
        this._openDialogue(this.dialogues[ch.winDialogue], () => this._nextChapterOrEnd(ch));
      }, 600);
      return;
    }

    if (ch.ending) {
      setTimeout(() => this._showEnding(ch.ending), 1000);
      return;
    }

    setTimeout(() => {
      if (!this.running) return;
      this.chapterIndex++;
      // skip wrong route chapters
      this._skipToValidChapter();
      this._startChapter();
    }, 900);
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

  _afterStage3() {
    const need = 14;
    if (this.tendencyA >= need && this.tendencyA >= this.tendencyB) {
      this.routeChoice = 'A';
      unlockRoute('A');
      this._jumpToStage('A4');
    } else if (this.tendencyB >= need && this.tendencyB > this.tendencyA) {
      this.routeChoice = 'B';
      unlockRoute('B');
      this._jumpToStage('B4');
    } else {
      // neutral intercept
      this.chapterIndex = this.chapters.findIndex((c) => c.id === 23);
      this._startChapter();
    }
  }

  _enterRouteSelect() {
    this.state = 'routeSelect';
    this.el.dialogueBox.classList.remove('hidden');
    this.el.dialogueName.textContent = '系统';
    this.el.dialogueName.style.color = SPEAKER_COLORS['系统'];
    this.el.dialogueText.textContent = '← A线 门构皮蒂娅　　B线 善雅乡 →\n（方向键选择）';
    // also draw portals in game via state
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

  _showEnding(which) {
    saveHiscore(this.score);
    const text = which === 'A' ? ENDING_A : ENDING_B;
    this.stop();
    this.ui.showResult({
      title: which === 'A' ? '结局A · 不倒闭的真理' : '结局B · 散去的幻影',
      body: `${text}\n\n难度：${this.diff.rank} ${this.diff.name}\n最终得分：${this.score}`,
      difficulty: this.difficultyId,
    });
  }

  _gameOver() {
    const ch = this.chapters[this.chapterIndex];
    saveHiscore(this.score);
    const body = `难度：${this.diff.rank} ${this.diff.name}\n章节：${ch.name}\n得分：${this.score}\n倾向 A/B：${this.tendencyA} / ${this.tendencyB}`;
    if (ch.loseDialogue && this.dialogues[ch.loseDialogue]) {
      this._openDialogue(this.dialogues[ch.loseDialogue], () => {
        this.stop();
        this.ui.showResult({
          title: 'Game Over',
          body,
          retryChapter: ch.id,
          difficulty: this.difficultyId,
        });
      });
    } else {
      this.stop();
      this.ui.showResult({
        title: 'Game Over',
        body,
        retryChapter: ch.id,
        difficulty: this.difficultyId,
      });
    }
  }

  _gameClear() {
    saveHiscore(this.score);
    this.stop();
    this.ui.showResult({
      title: 'All Clear',
      body: `全关卡完成！\n难度：${this.diff.rank} ${this.diff.name}\n得分：${this.score}`,
      difficulty: this.difficultyId,
    });
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
    this.el.tendency.textContent = `${this.tendencyA.toFixed(0)} / ${this.tendencyB.toFixed(0)}`;
    const ch = this.chapters[this.chapterIndex];
    this.el.chapter.textContent = ch ? ch.name : '—';
    if (this.el.difficulty && this.diff) {
      this.el.difficulty.textContent = `${this.diff.rank} ${this.diff.name}`;
      this.el.difficulty.style.color = this.diff.color;
    }
  }

  _draw() {
    const ctx = this.ctx;
    const W = LOGICAL_W;
    const H = LOGICAL_H;

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

    // player bullets
    for (const b of this.bullets) {
      if (b.from === 'player') drawBullet(ctx, b);
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
  }
}
