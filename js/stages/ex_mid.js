/**
 * Extra 道中图案库 — 难度均匀，只换机制不加压
 * 数值已按 EX 0.8 强度 / 适配 12s 章时
 */
import { mob, elite, timer } from './_shared.js';
import { LOGICAL_W, LOGICAL_H } from '../config.js';
import {
  spawnAimed, spawnRingAt, spawnAimedLaser, spawnGravityRain, spawnHLaser, spawnCrossFall,
} from '../patterns.js';
import { Bullet } from '../entities.js';
import { C, exHp, exSp, exN, exFire, EX } from './ex_shared.js';

const SI = (s) => s * EX.spawn;

/** 0 左右交替 · 单路 odd 狙 */
export function mid_altSides(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(0.9)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 7) return;
    const left = g.waveCount % 2 === 1;
    const e = mob(left ? 70 : LOGICAL_W - 70, -18, exHp(34), C.green);
    e.vy = 1.2;
    e.script = (en, d, game) => {
      timer(en, 's', exFire(0.9), d, () => {
        spawnAimed(game, en, game.player, {
          n: 1, parity: 'odd', type: 'dot', speed: exSp(2.3), color: C.green,
        });
      });
    };
    g.enemies.push(e);
  };
}

/** 1 随机下降 · even 夹缝 */
export function mid_randomEven(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(0.85)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 7) return;
    const e = mob(50 + Math.random() * (LOGICAL_W - 100), -18, exHp(36), C.cyan);
    e.vy = 1.05;
    e.script = (en, d, game) => {
      timer(en, 's', exFire(0.95), d, () => {
        spawnAimed(game, en, game.player, {
          n: exN(2, 'even'), parity: 'even', type: 'rice',
          speed: exSp(2.15), spread: 0.2, color: C.cyan,
        });
      });
    };
    g.enemies.push(e);
  };
}

/** 2 双侧同时 · even */
export function mid_dualFlank(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(1.0)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 5) return;
    for (const side of [-1, 1]) {
      const e = mob(LOGICAL_W / 2 + side * 100, -15, exHp(32), side < 0 ? C.blue : C.orange);
      e.vy = 1.15;
      e.script = (en, d, game) => {
        timer(en, 's', exFire(1.0), d, () => {
          spawnAimed(game, en, game.player, {
            n: exN(2, 'even'), parity: 'even', type: 'dot',
            speed: exSp(2.2), spread: 0.22, color: en.color,
          });
        });
      };
      g.enemies.push(e);
    }
  };
}

/** 3 悬停环弹 */
export function mid_hoverRing(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(1.35)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 4) return;
    const x = 90 + ((g.waveCount - 1) % 3) * 130;
    const e = mob(x, -20, exHp(50), C.gold);
    e.vy = 1.0;
    e.script = (en, d, game) => {
      if (en.y > 100 && en.y < 160) en.vy = 0.12;
      timer(en, 'r', exFire(1.5), d, () => {
        spawnRingAt(game, en.x, en.y, exN(12), exSp(1.85), 'talisman', C.gold, en.age);
      });
    };
    g.enemies.push(e);
  };
}

/** 4 竖落雨 + 稀疏 odd 狙 */
export function mid_rainSparse(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.rainT = 0;
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT >= exFire(0.4)) {
      g.rainT = 0;
      spawnGravityRain(g, 2, 'rice', C.violet, exSp(1.7));
    }
    g.waveTimer += dt;
    if (g.waveTimer < SI(1.2)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 4) return;
    const e = mob(60 + Math.random() * (LOGICAL_W - 120), -18, exHp(34), C.violet);
    e.vy = 1.0;
    e.script = (en, d, game) => {
      timer(en, 's', exFire(1.15), d, () => {
        spawnAimed(game, en, game.player, {
          n: 1, parity: 'odd', type: 'dot', speed: exSp(2.25), color: C.pink,
        });
      });
    };
    g.enemies.push(e);
  };
}

/** 5 横向通道 · cross fall */
export function mid_crossLanes(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < exFire(0.7)) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    spawnCrossFall(g, {
      y: -10,
      speed: exSp(1.7),
      type: 'rice',
      color: g.waveCount % 2 ? C.cyan : C.blue,
      lanes: 6,
      evenOffset: true,
    });
  };
}

/** 6 慢悬精英 · even 扇 */
export function mid_hoverElite(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(2.2)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 3) return;
    const e = elite({
      x: 80 + Math.random() * (LOGICAL_W - 160), y: 75,
      hp: exHp(200), color: C.pink, kind: 'generic',
    });
    e.vy = 0.25;
    e.script = (en, d, game) => {
      timer(en, 'a', exFire(0.95), d, () => {
        spawnAimed(game, en, game.player, {
          n: exN(3, 'even'), parity: 'even', type: 'medium',
          speed: exSp(2.0), spread: 0.22, color: C.pink,
        });
      });
    };
    g.enemies.push(e);
  };
}

/** 7 稀疏激光 + even 副压 */
export function mid_laserSniper(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(1.4)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 5) return;
    const e = mob(50 + (g.waveCount * 70) % (LOGICAL_W - 100), 55, exHp(40), C.gold);
    e.vy = 0.2;
    e.script = (en, d, game) => {
      timer(en, 'L', exFire(1.7), d, () => spawnAimedLaser(game, en, game.player, C.gold));
      timer(en, 's', exFire(0.7), d, () => {
        spawnAimed(game, en, game.player, {
          n: exN(2, 'even'), parity: 'even', type: 'dot',
          speed: exSp(2.3), spread: 0.28, color: C.white,
        });
      });
    };
    g.enemies.push(e);
  };
}

/** 8 横扫激光墙 + 轻雨 */
export function mid_hLaserRain(g) {
  g.laserT = 0;
  g.rainT = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > exFire(0.85)) {
      g.laserT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const y = 90 + (g.waveCount * 48) % 320;
      spawnHLaser(g, y, g.waveCount % 2 === 0 ? 1 : -1, C.red);
    }
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > exFire(0.35)) {
      g.rainT = 0;
      g.bullets.push(new Bullet({
        x: Math.random() * LOGICAL_W, y: -10,
        vx: (Math.random() - 0.5) * 0.35, vy: exSp(1.55 + Math.random() * 0.4),
        type: 'rice', color: C.orange, from: 'enemy', gravity: 0.012,
      }));
    }
  };
}

/** 9 V 字编队下降 · odd */
export function mid_vForm(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(1.5)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 4) return;
    const cx = LOGICAL_W / 2;
    for (let k = -2; k <= 2; k++) {
      const e = mob(cx + k * 38, -20 - Math.abs(k) * 12, exHp(28), C.blue);
      e.vy = 1.15;
      e.script = (en, d, game) => {
        timer(en, 's', exFire(1.05), d, () => {
          spawnAimed(game, en, game.player, {
            n: 1, parity: 'odd', type: 'dot', speed: exSp(2.2), color: C.blue,
          });
        });
      };
      g.enemies.push(e);
    }
  };
}

/** 10 侧边横移流 */
export function mid_sideStream(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(0.55)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 10) return;
    const fromLeft = g.waveCount <= 5;
    const e = mob(fromLeft ? -15 : LOGICAL_W + 15, 80 + (g.waveCount % 4) * 35, exHp(30), C.pink);
    e.vx = fromLeft ? 1.6 : -1.6;
    e.vy = 0.15;
    e.script = (en, d, game) => {
      timer(en, 's', exFire(0.85), d, () => {
        spawnAimed(game, en, game.player, {
          n: 1, parity: 'odd', type: 'rice', speed: exSp(2.4), color: C.pink,
        });
      });
    };
    g.enemies.push(e);
  };
}

/** 11 大弹分裂环 */
export function mid_splitLarge(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(1.6)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 4) return;
    const e = elite({
      x: 70 + Math.random() * (LOGICAL_W - 140), y: 90,
      hp: exHp(180), color: C.orange, kind: 'generic',
    });
    e.vy = 0.2;
    e.script = (en, d, game) => {
      timer(en, 'big', exFire(1.9), d, () => {
        game.bullets.push(new Bullet({
          x: en.x, y: en.y, vx: 0, vy: exSp(1.2),
          type: 'large', color: C.orange, from: 'enemy', gravity: 0.01, life: 5,
          onSplit: (self) => spawnRingAt(game, self.x, self.y, exN(8), exSp(1.5), 'dot', C.gold),
        }));
      });
      timer(en, 'a', exFire(1.1), d, () => {
        spawnAimed(game, en, game.player, {
          n: 1, parity: 'odd', type: 'rice', speed: exSp(2.2), color: C.white,
        });
      });
    };
    g.enemies.push(e);
  };
}

/** 12 对角穿越 · 固定角 */
export function mid_diagCross(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(0.75)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 8) return;
    const fromLeft = g.waveCount % 2 === 1;
    const e = mob(fromLeft ? -10 : LOGICAL_W + 10, -10, exHp(32), C.cyan);
    e.vx = fromLeft ? 1.4 : -1.4;
    e.vy = 1.5;
    e.script = (en, d, game) => {
      timer(en, 's', exFire(0.8), d, () => {
        const ang = Math.atan2(game.player.y - en.y, game.player.x - en.x);
        game.bullets.push(new Bullet({
          x: en.x, y: en.y, angle: ang, speed: exSp(2.35),
          type: 'dot', color: C.cyan, from: 'enemy',
        }));
      });
    };
    g.enemies.push(e);
  };
}

/** 13 环 + even 缝双层 */
export function mid_ringEven(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(1.5)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 4) return;
    const e = elite({
      x: LOGICAL_W * (0.3 + (g.waveCount % 3) * 0.2), y: 95,
      hp: exHp(210), color: C.violet, kind: 'generic',
    });
    e.vy = 0.15;
    e.script = (en, d, game) => {
      timer(en, 'r', exFire(1.55), d, () => {
        spawnRingAt(game, en.x, en.y, exN(10), exSp(1.7), 'talisman', C.violet, en.age);
      });
      timer(en, 'a', exFire(0.9), d, () => {
        spawnAimed(game, en, game.player, {
          n: exN(2, 'even'), parity: 'even', type: 'rice',
          speed: exSp(2.25), spread: 0.18, color: C.white,
        });
      });
    };
    g.enemies.push(e);
  };
}

/** 14 锯齿路径下降 */
export function mid_zigzag(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(0.95)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 6) return;
    const e = mob(LOGICAL_W / 2, -18, exHp(34), C.red);
    e.vy = 1.1;
    e.data = { phase: g.waveCount * 0.7 };
    e.script = (en, d, game) => {
      en.data.phase = (en.data.phase || 0) + d * 2.2;
      en.x = LOGICAL_W / 2 + Math.sin(en.data.phase) * 110;
      timer(en, 's', exFire(0.85), d, () => {
        spawnAimed(game, en, game.player, {
          n: 1, parity: 'odd', type: 'rice', speed: exSp(2.3), color: C.red,
        });
      });
    };
    g.enemies.push(e);
  };
}

/** 15 中央精英 + 两侧杂鱼 */
export function mid_centerSides(g) {
  const core = elite({
    x: LOGICAL_W / 2, y: 100, hp: exHp(280), color: C.gold, kind: 'generic', label: '议程核',
  });
  core.vy = 0.1;
  core.script = (en, d, game) => {
    timer(en, 'a', exFire(1.0), d, () => {
      spawnAimed(game, en, game.player, {
        n: exN(3, 'odd'), parity: 'odd', type: 'talisman',
        speed: exSp(2.1), spread: 0.14, color: C.gold,
      });
    });
  };
  g.enemies.push(core);
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(1.1)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 5) return;
    const side = g.waveCount % 2 ? 55 : LOGICAL_W - 55;
    const e = mob(side, -15, exHp(28), C.white);
    e.vy = 1.25;
    e.script = (en, d, game) => {
      timer(en, 's', exFire(1.0), d, () => {
        spawnAimed(game, en, game.player, {
          n: 1, parity: 'odd', type: 'dot', speed: exSp(2.2), color: C.white,
        });
      });
    };
    g.enemies.push(e);
  };
}

/** 16 固定角度扇扫（非瞄准） */
export function mid_fixedFan(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(1.1)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 5) return;
    const e = mob(70 + (g.waveCount % 4) * 90, -18, exHp(38), C.blue);
    e.vy = 0.95;
    e.script = (en, d, game) => {
      if (en.y > 90) en.vy = 0.18;
      timer(en, 'f', exFire(0.75), d, () => {
        en.data.a = (en.data.a || Math.PI * 0.55) + 0.12;
        const base = en.data.a;
        for (let i = -1; i <= 1; i++) {
          game.bullets.push(new Bullet({
            x: en.x, y: en.y, angle: base + i * 0.2, speed: exSp(2.1),
            type: 'rice', color: C.blue, from: 'enemy',
          }));
        }
      });
    };
    g.enemies.push(e);
  };
}

/** 17 窄缝墙（带 gap） */
export function mid_gapWall(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < exFire(1.15)) return;
    g.waveTimer = 0;
    g.waveCount++;
    const gap = 75;
    const gapX = 70 + Math.random() * (LOGICAL_W - 140);
    for (let x = 16; x < LOGICAL_W - 16; x += 20) {
      if (x > gapX - gap / 2 && x < gapX + gap / 2) continue;
      g.bullets.push(new Bullet({
        x, y: -12, vx: 0, vy: exSp(1.9),
        type: 'rice', color: C.dark, from: 'enemy',
      }));
    }
  };
}

/** 18 左右对射 · 非瞄准横弹 */
export function mid_sideBarrage(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(1.3)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 5) return;
    for (const side of [-1, 1]) {
      const e = mob(side < 0 ? 40 : LOGICAL_W - 40, 60 + g.waveCount * 8, exHp(36), C.orange);
      e.vy = 0.2;
      e.script = (en, d, game) => {
        timer(en, 's', exFire(0.65), d, () => {
          const dir = en.x < LOGICAL_W / 2 ? 1 : -1;
          for (let i = -1; i <= 1; i++) {
            game.bullets.push(new Bullet({
              x: en.x, y: en.y,
              vx: dir * exSp(2.3), vy: i * exSp(0.55),
              type: 'dot', color: C.orange, from: 'enemy',
            }));
          }
        });
      };
      g.enemies.push(e);
    }
  };
}

/** 19 螺旋点缀 + 单 odd */
export function mid_spiralLite(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(1.8)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 3) return;
    const e = elite({
      x: LOGICAL_W / 2 + (g.waveCount % 2 ? -60 : 60), y: 100,
      hp: exHp(220), color: C.pink, kind: 'generic',
    });
    e.vy = 0.12;
    e.script = (en, d, game) => {
      timer(en, 'sp', exFire(0.22), d, () => {
        en.data.a = (en.data.a || 0) + 0.45;
        game.bullets.push(new Bullet({
          x: en.x, y: en.y, angle: en.data.a, speed: exSp(2.0),
          type: 'dot', color: C.pink, from: 'enemy',
        }));
      });
      timer(en, 'a', exFire(1.0), d, () => {
        spawnAimed(game, en, game.player, {
          n: 1, parity: 'odd', type: 'rice', speed: exSp(2.35), color: C.white,
        });
      });
    };
    g.enemies.push(e);
  };
}

/** 按索引取图案（循环，难度同档） */
export const MID_PATTERNS = [
  mid_altSides,
  mid_randomEven,
  mid_dualFlank,
  mid_hoverRing,
  mid_rainSparse,
  mid_crossLanes,
  mid_hoverElite,
  mid_laserSniper,
  mid_hLaserRain,
  mid_vForm,
  mid_sideStream,
  mid_splitLarge,
  mid_diagCross,
  mid_ringEven,
  mid_zigzag,
  mid_centerSides,
  mid_fixedFan,
  mid_gapWall,
  mid_sideBarrage,
  mid_spiralLite,
];

export function buildExMid(g, index) {
  const fn = MID_PATTERNS[index % MID_PATTERNS.length];
  fn(g);
}

void LOGICAL_H;
