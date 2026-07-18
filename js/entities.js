import { BALANCE, LOGICAL_W, LOGICAL_H } from './config.js';

let _id = 1;
const nid = () => _id++;

/* ========== Bullets ========== */
export class Bullet {
  constructor(opts) {
    this.id = nid();
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.vx || 0;
    this.vy = opts.vy || 0;
    this.speed = opts.speed ?? 0;
    this.angle = opts.angle ?? 0;
    this.type = opts.type || 'dot'; // dot, rice, talisman, medium, large, laser
    this.from = opts.from || 'enemy'; // enemy | player
    this.damage = opts.damage || 1;
    this.r = opts.r ?? hitR(this.type);
    this.w = opts.w || visualSize(this.type).w;
    this.h = opts.h || visualSize(this.type).h;
    this.color = opts.color || '#f472b6';
    this.color2 = opts.color2 || '#fff';
    this.life = opts.life ?? 20;
    this.grazed = false;
    this.dead = false;
    this.accel = opts.accel || 0;
    this.spin = opts.spin || 0;
    this.homing = opts.homing || 0;
    this.delay = opts.delay || 0;
    this.laserLen = opts.laserLen || 0;
    this.owner = opts.owner || null;
    this.gravity = opts.gravity || 0;
    this.onSplit = opts.onSplit || null;
    this.age = 0;
    if (this.speed && !opts.vx && !opts.vy) {
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
    }
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
    this.life -= dt;
    if (this.life <= 0) {
      if (this.onSplit) this.onSplit(this);
      this.dead = true;
      return;
    }
    if (this.spin) this.angle += this.spin * dt;
    if (this.accel) {
      const sp = Math.hypot(this.vx, this.vy) + this.accel * dt;
      const a = Math.atan2(this.vy, this.vx);
      this.vx = Math.cos(a) * sp;
      this.vy = Math.sin(a) * sp;
    }
    if (this.gravity) this.vy += this.gravity * dt;
    if (this.homing) {
      const target = this.from === 'player' ? homeTarget : player;
      if (target) {
        const ta = Math.atan2(target.y - this.y, target.x - this.x);
        const ca = Math.atan2(this.vy, this.vx);
        let da = ta - ca;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        const na = ca + Math.sign(da) * Math.min(Math.abs(da), this.homing * dt);
        const sp = Math.hypot(this.vx, this.vy) || this.speed || 2;
        this.vx = Math.cos(na) * sp;
        this.vy = Math.sin(na) * sp;
        this.angle = na;
      }
    }
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;

    if (this.type === 'laser') {
      // laser is a segment from (x,y) along angle
      if (this.x < -80 || this.x > LOGICAL_W + 80 || this.y < -80 || this.y > LOGICAL_H + 80) this.dead = true;
    } else {
      if (this.x < -40 || this.x > LOGICAL_W + 40 || this.y < -40 || this.y > LOGICAL_H + 40) this.dead = true;
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
    this.id = nid();
    this.x = x;
    this.y = y;
    this.kind = kind; // score, scoreL, life, bomb, power
    this.vy = BALANCE.itemPopVy ?? -0.55;
    this.vx = (Math.random() - 0.5) * 0.55;
    this.r = kind === 'scoreL' ? 10 : 8;
    this.dead = false;
    this.attract = false; // 永久吸引标记：一旦为 true 不会再下落
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
  }
  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    if (this.life <= 0) this.dead = true;
  }
}

/* Drawing: js/draw/* — re-export for stable imports */
export {
  drawBullet,
  drawPlayer,
  drawEnemy,
  drawItem,
  drawCollectLine,
} from './draw/index.js';
