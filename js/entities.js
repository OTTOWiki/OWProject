import { BALANCE, LOGICAL_W, LOGICAL_H } from './config.js';

let _id = 1;
const nid = () => _id++;

/* ========== Bullets ========== */
const OFF_MARGIN = 40;
const LASER_OFF_MARGIN = 80;
const OFF_MIN_X = -OFF_MARGIN;
const OFF_MAX_X = LOGICAL_W + OFF_MARGIN;
const OFF_MIN_Y = -OFF_MARGIN;
const OFF_MAX_Y = LOGICAL_H + OFF_MARGIN;
const LASER_OFF_MIN_X = -LASER_OFF_MARGIN;
const LASER_OFF_MAX_X = LOGICAL_W + LASER_OFF_MARGIN;
const LASER_OFF_MIN_Y = -LASER_OFF_MARGIN;
const LASER_OFF_MAX_Y = LOGICAL_H + LASER_OFF_MARGIN;

export class Bullet {
  constructor(opts) {
    this.reset(opts);
  }

  /** 池化复用：与 constructor 语义一致 */
  reset(opts) {
    this._pooled = false;
    this.id = nid();
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.vx || 0;
    this.vy = opts.vy || 0;
    this.speed = opts.speed ?? 0;
    this.angle = opts.angle ?? 0;
    this.type = opts.type || 'dot';
    this.from = opts.from || 'enemy';
    this.damage = opts.damage || 1;
    this.r = opts.r ?? hitR(this.type);
    const vs = visualSize(this.type);
    this.w = opts.w || vs.w;
    this.h = opts.h || vs.h;
    this.color = opts.color || '#f472b6';
    this.color2 = opts.color2 || '#fff';
    // 敌方激光：未显式传 life 时不按时间销毁（Infinity，只靠出屏）
    if (opts.life != null) {
      this.life = opts.life;
    } else if (this.type === 'laser' && this.from === 'enemy') {
      this.life = Infinity;
    } else {
      this.life = 20;
    }
    this.grazed = false;
    this.dead = false;
    this.accel = opts.accel || 0;
    this.spin = opts.spin || 0;
    this.homing = opts.homing || 0;
    this.delay = opts.delay || 0;
    this.laserLenMax = opts.laserLenMax ?? opts.laserLen ?? 0;
    this.laserLen = opts.laserLenCur ?? (
      (this.type === 'laser' && this.from === 'enemy' && this.laserLenMax > 0)
        ? 0
        : (opts.laserLen || 0)
    );
    this.laserExtending = this.type === 'laser'
      && this.from === 'enemy'
      && this.laserLenMax > 0
      && this.laserLen < this.laserLenMax
      && opts.laserExtending !== false;
    this.owner = opts.owner || null;
    this.gravity = opts.gravity || 0;
    this.onSplit = opts.onSplit || null;
    this.age = 0;
    this._hitIds = null;
    this._homeSlot = opts._homeSlot;
    this._diffScaled = false;
    this._grazeNear = false;
    if (this.speed && !opts.vx && !opts.vy) {
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
    }
    return this;
  }

  /**
   * @param {number} dt
   * @param {object|null} player 自机（敌弹追踪用）
   * @param {object|null} homeTarget 可选追踪目标（玩家子弹打怪）
   */
  update(dt, player, homeTarget = null) {
    if (this.delay > 0) {
      this.delay -= dt;
      return;
    }
    this.age += dt;

    const isLaser = this.type === 'laser';
    const extending = isLaser && this.laserExtending;
    const spin = this.spin;
    const accel = this.accel;
    const gravity = this.gravity;
    const homing = this.homing;

    // 直飞快路径：无 spin/accel/homing/gravity/激光
    if (!isLaser && !spin && !accel && !gravity && !homing) {
      this.life -= dt;
      if (this.life <= 0) {
        if (this.onSplit) this.onSplit(this);
        this.dead = true;
        return;
      }
      const step = dt * 60;
      this.x += this.vx * step;
      this.y += this.vy * step;
      if (
        this.x < OFF_MIN_X || this.x > OFF_MAX_X
        || this.y < OFF_MIN_Y || this.y > OFF_MAX_Y
      ) {
        this.dead = true;
      }
      return;
    }

    if (!extending) {
      this.life -= dt;
      if (this.life <= 0) {
        if (this.onSplit) this.onSplit(this);
        this.dead = true;
        return;
      }
    }

    if (spin) this.angle += spin * dt;
    if (accel) {
      const vx = this.vx;
      const vy = this.vy;
      const sp = Math.sqrt(vx * vx + vy * vy) + accel * dt;
      const a = Math.atan2(vy, vx);
      this.vx = Math.cos(a) * sp;
      this.vy = Math.sin(a) * sp;
    }
    if (gravity) this.vy += gravity * dt;
    if (homing) {
      const target = this.from === 'player' ? homeTarget : player;
      if (target) {
        const ta = Math.atan2(target.y - this.y, target.x - this.x);
        const ca = Math.atan2(this.vy, this.vx);
        let da = ta - ca;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        const na = ca + Math.sign(da) * Math.min(Math.abs(da), homing * dt);
        const vx = this.vx;
        const vy = this.vy;
        const sp = Math.sqrt(vx * vx + vy * vy) || this.speed || 2;
        this.vx = Math.cos(na) * sp;
        this.vy = Math.sin(na) * sp;
        this.angle = na;
      }
    }

    if (extending) {
      const maxL = this.laserLenMax || 200;
      const baseSp = this.speed || Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 4;
      const p = Math.min(1, this.laserLen / maxL);
      const mul = 0.4 + 2.2 * p * p;
      this.laserLen = Math.min(maxL, this.laserLen + baseSp * mul * dt * 60);
      if (this.laserLen >= maxL) {
        this.laserLen = maxL;
        this.laserExtending = false;
      }
    } else {
      const step = dt * 60;
      this.x += this.vx * step;
      this.y += this.vy * step;
    }

    if (isLaser) {
      const len = this.laserLen || 0;
      const ang = this.angle || 0;
      const hx = this.x + Math.cos(ang) * len;
      const hy = this.y + Math.sin(ang) * len;
      const minX = this.x < hx ? this.x : hx;
      const maxX = this.x > hx ? this.x : hx;
      const minY = this.y < hy ? this.y : hy;
      const maxY = this.y > hy ? this.y : hy;
      if (maxX < LASER_OFF_MIN_X || minX > LASER_OFF_MAX_X
        || maxY < LASER_OFF_MIN_Y || minY > LASER_OFF_MAX_Y) {
        this.dead = true;
      }
    } else if (
      this.x < OFF_MIN_X || this.x > OFF_MAX_X
      || this.y < OFF_MIN_Y || this.y > OFF_MAX_Y
    ) {
      this.dead = true;
    }
  }
}

function hitR(type) {
  return {
    dot: 3, rice: 2, talisman: 4, medium: 6, large: 12, laser: 5,
    player: 5, option: 6, bomb: 18,
  }[type] || 3;
}
function visualSize(type) {
  return {
    dot: { w: 8, h: 8 },
    rice: { w: 12, h: 6 },
    talisman: { w: 16, h: 8 },
    medium: { w: 16, h: 16 },
    large: { w: 32, h: 32 },
    laser: { w: 10, h: 80 },
    player: { w: 10, h: 22 },
    option: { w: 12, h: 12 },
    bomb: { w: 40, h: 40 },
  }[type] || { w: 8, h: 8 };
}

/* ========== Player ========== */
export class Player {
  constructor(def) {
    this.def = def;
    this.x = LOGICAL_W / 2;
    this.y = LOGICAL_H * 0.82;
    this.r = BALANCE.playerRadius;
    this.lives = BALANCE.startLives;
    this.bombs = BALANCE.startBombs;
    this.invuln = 0;
    this.shotCd = 0;
    this.bombTimer = 0;
    this.arbitration = 0; // 审核中
    this.dead = false;
    this.slow = false;
    this.edit = 0;
    this.focused = false;
  }

  resetPos() {
    this.x = LOGICAL_W / 2;
    this.y = LOGICAL_H * 0.82;
  }

  update(dt, input, opts = {}) {
    if (this.arbitration > 0) {
      this.arbitration -= dt;
      return;
    }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.bombTimer > 0) this.bombTimer -= dt;
    if (this.shotCd > 0) this.shotCd -= dt;

    this.slow = input.slowHeld();
    const speed = this.slow ? BALANCE.playerSlowSpeed : BALANCE.playerSpeed;

    if (input.virtualMove) {
      this.x = input.virtualMove.x;
      this.y = input.virtualMove.y;
    } else {
      const axis = input.moveAxis();
      this.x += axis.x * speed * dt * 60;
      this.y += axis.y * speed * dt * 60;
    }
    this.x = Math.max(8, Math.min(LOGICAL_W - 8, this.x));
    this.y = Math.max(8, Math.min(LOGICAL_H - 8, this.y));
  }
}

/* ========== Enemy ========== */
export class Enemy {
  constructor(opts) {
    this.id = nid();
    this.hp = opts.hp;
    this.maxHp = opts.hp;
    this.r = opts.r || 18;
    this.type = opts.type || 'mob'; // mob, elite, boss
    this.kind = opts.kind || 'generic';
    this.label = opts.label || '';
    this.color = opts.color || '#f472b6';
    this.color2 = opts.color2 || '#67e8f9';
    this.dead = false;
    this.vx = opts.vx || 0;
    this.vy = opts.vy || 0;
    this.age = 0;
    this.phase = 0;
    this.timers = {};
    this.script = opts.script || null;
    this.onDeath = opts.onDeath || null;
    this.drop = opts.drop || null;
    this.invuln = opts.invuln || 0;
    this.score = opts.score || BALANCE.score.killSmall;
    this.spin = 0;
    this.data = opts.data || {};
    /** 受击闪白计时（>0 时绘制叠加白闪；纯视觉） */
    this.hurtT = 0;

    // 入场目标（脚本/移动生效前的落位）
    this.enterX = opts.x;
    // 负 Y / 过顶的目标点默认收到场内，避免屏外就结束入场
    let holdY = opts.enterY != null && Number.isFinite(opts.enterY) ? opts.enterY : opts.y;
    if (!(holdY > 8)) holdY = 40;
    this.enterY = holdY;
    this.spawnFxT = 0; // >0 时播出现特效，结束后才可行动
    this.spawnFxDur = 0;
    this.entering = false;

    if (opts.skipEnter) {
      this.x = opts.x;
      this.y = opts.y;
      this.enterY = opts.y;
    } else if (opts.spawnFx) {
      // 特效入场：原地法阵/涟漪后现身（落在 hold 点）
      this.x = opts.x;
      this.y = this.enterY;
      this.spawnFxDur = opts.spawnFxDur ?? (this.type === 'boss' ? 0.7 : 0.45);
      this.spawnFxT = this.spawnFxDur;
      this.invuln = Math.max(this.invuln, this.spawnFxT + 0.15);
    } else {
      // 屏外飞入 → enterX/enterY
      this.entering = true;
      const from = opts.enterFrom || this._autoEnterFrom(opts.x, this.enterY);
      if (from === 'left') {
        this.x = -40 - Math.random() * 30;
        this.y = this.enterY;
      } else if (from === 'right') {
        this.x = LOGICAL_W + 40 + Math.random() * 30;
        this.y = this.enterY;
      } else if (from === 'bottom') {
        this.x = opts.x;
        this.y = LOGICAL_H + 40;
      } else {
        // top
        this.x = opts.x + (Math.random() - 0.5) * 20;
        this.y = -35 - Math.random() * 40;
      }
      // 非线性入场：ease-in 后段猛冲，像一下子跳进场
      this.enterFromX = this.x;
      this.enterFromY = this.y;
      this.enterT = 0;
      this.enterDur = this.type === 'boss' ? 0.4 : (this.type === 'elite' ? 0.32 : 0.26);
      this.invuln = Math.max(this.invuln, this.enterDur + 0.08);
    }
  }

  _autoEnterFrom(x, y) {
    if (x < LOGICAL_W * 0.18) return 'left';
    if (x > LOGICAL_W * 0.82) return 'right';
    if (y > LOGICAL_H * 0.55) return 'bottom';
    return 'top';
  }

  /** easeInQuint：前段几乎不动，后段猛冲到位 */
  static _easeInQuint(t) {
    return t * t * t * t * t;
  }

  /** 是否仍在入场/现身中（不可行动、脚本不跑） */
  get isSpawning() {
    return this.entering || this.spawnFxT > 0;
  }

  update(dt, game) {
    this.age += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    this.spin += dt;

    // 特效现身
    if (this.spawnFxT > 0) {
      this.spawnFxT -= dt;
      if (this.spawnFxT < 0) this.spawnFxT = 0;
      this.x = this.enterX;
      this.y = this.enterY;
      return;
    }

    // 屏外非线性跳入目标点
    if (this.entering) {
      this.enterT = (this.enterT || 0) + dt;
      const dur = this.enterDur || 0.28;
      let u = Math.min(1, this.enterT / dur);
      const e = Enemy._easeInQuint(u);
      const x0 = this.enterFromX ?? this.x;
      const y0 = this.enterFromY ?? this.y;
      this.x = x0 + (this.enterX - x0) * e;
      this.y = y0 + (this.enterY - y0) * e;
      if (u >= 1) {
        this.x = this.enterX;
        this.y = this.enterY;
        this.entering = false;
      }
      return; // 入场完成前不跑 script / 自由移动
    }

    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    if (this.script) this.script(this, dt, game);
    if (this.y > LOGICAL_H + 60 || this.x < -80 || this.x > LOGICAL_W + 80) {
      if (this.type !== 'boss') this.dead = true;
    }
  }

  hurt(dmg) {
    if (this.invuln > 0 || this.isSpawning) return false;
    this.hurtT = 0.06;
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  /**
   * 击破时触发一次 onDeath（死亡散射等），之后清空避免重复。
   * 须在击杀路径调用；屏外消失不应走这里。
   */
  fireOnDeath(game) {
    if (!this.onDeath) return;
    const fn = this.onDeath;
    this.onDeath = null;
    try {
      fn(this, game);
    } catch (err) {
      console.error('[enemy onDeath]', err);
    }
  }
}

/* ========== Item drops ========== */
export class Item {
  constructor(x, y, kind = 'score') {
    this.reset(x, y, kind);
  }

  /** 池化复用 */
  reset(x, y, kind = 'score') {
    this._pooled = false;
    this.id = nid();
    this.x = x;
    this.y = y;
    this.kind = kind; // score, scoreL, life, bomb, power
    this.vy = BALANCE.itemPopVy ?? -0.55;
    this.vx = (Math.random() - 0.5) * 0.55;
    this.r = kind === 'scoreL' ? 10 : 8;
    this.dead = false;
    this.attract = false; // 永久吸引标记：一旦为 true 不会再下落
    return this;
  }

  update(dt, player, autoAttract) {
    const line = BALANCE.itemCollectLine ?? LOGICAL_H * 0.28;

    // 自机越过收点线 / Bomb 全收：锁定吸引，之后自机回到线下也不取消
    if (autoAttract || player.y < line) {
      this.attract = true;
    }

    if (this.attract) {
      const a = Math.atan2(player.y - this.y, player.x - this.x);
      const sp = BALANCE.itemAttractSpeed ?? 9.5;
      this.x += Math.cos(a) * sp * dt * 60;
      this.y += Math.sin(a) * sp * dt * 60;
      this.vx = 0;
      this.vy = 0;
    } else {
      // 缓慢下落（比原先明显更慢）
      const g = BALANCE.itemFallGravity ?? 0.022;
      const maxVy = BALANCE.itemFallMaxVy ?? 1.35;
      this.vy = Math.min(maxVy, this.vy + g * dt * 60);
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      this.vx *= 0.992;
    }
    if (this.y > LOGICAL_H + 20) this.dead = true;
  }
}

/* ========== Particles ========== */
export class Particle {
  constructor(x, y, color, life = 0.4) {
    this.reset(x, y, color, life);
  }

  /** 池化复用 */
  reset(x, y, color, life = 0.4) {
    this._pooled = false;
    this.x = x;
    this.y = y;
    const a = Math.random() * Math.PI * 2;
    const s = 1 + Math.random() * 3;
    this.vx = Math.cos(a) * s;
    this.vy = Math.sin(a) * s;
    this.life = life;
    this.max = life;
    this.color = color;
    this.r = 2 + Math.random() * 3;
    this.dead = false;
    this.grazeFade = false;
    this.alphaMul = undefined;
    return this;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    if (this.life <= 0) this.dead = true;
  }
}
