/**
 * Extra 道中图案 0–31
 * 由 E03d1 从 ex_mid.js 拆出；数值与顺序不变
 */
import { mob, elite, timer, installMidWave } from './_shared.js';
import { LOGICAL_W, LOGICAL_H } from '../config.js';
import {
  spawnAimed, spawnRingAt, spawnAimedLaser, spawnGravityRain, spawnHLaser, spawnCrossFall,
} from '../patterns.js';
import { acquireBullet } from '../bulletPool.js';
import { C, exHp, exSp, exN, exFire, EX } from './ex_shared.js';

const SI = (s) => s * EX.spawn;

export function mid_altSides(g) {
  installMidWave(g, {
    interval: SI(0.9),
    maxWaves: 7,
    onWave: (g, wave) => {
      g.waveCount = wave;
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
      g.spawnEnemy(e);
    },
  });
}

export function mid_randomEven(g) {
  installMidWave(g, {
    interval: SI(0.85),
    maxWaves: 7,
    onWave: (g, wave) => {
      g.waveCount = wave;
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
      g.spawnEnemy(e);
    },
  });
}

export function mid_dualFlank(g) {
  installMidWave(g, {
    interval: SI(1.0),
    maxWaves: 5,
    onWave: (g, wave) => {
      g.waveCount = wave;
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
        g.spawnEnemy(e);
      }
    },
  });
}

export function mid_hoverRing(g) {
  installMidWave(g, {
    interval: SI(1.35),
    maxWaves: 4,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const x = 90 + ((g.waveCount - 1) % 3) * 130;
      const e = mob(x, -20, exHp(50), C.gold);
      e.vy = 1.0;
      e.script = (en, d, game) => {
        if (en.y > 100 && en.y < 160) en.vy = 0.12;
        timer(en, 'r', exFire(1.5), d, () => {
          spawnRingAt(game, en.x, en.y, exN(12), exSp(1.85), 'talisman', C.gold, en.age);
        });
      };
      g.spawnEnemy(e);
    },
  });
}

export function mid_rainSparse(g) {
  installMidWave(g, {
    interval: SI(1.2),
    maxWaves: 4,
    continuous: (g, dt) => {
      g.rainT = (g.rainT || 0) + dt;
      if (g.rainT >= exFire(0.4)) {
        g.rainT = 0;
        spawnGravityRain(g, 2, 'rice', C.violet, exSp(1.7));
      }
    },
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = mob(60 + Math.random() * (LOGICAL_W - 120), -18, exHp(34), C.violet);
      e.vy = 1.0;
      e.script = (en, d, game) => {
        timer(en, 's', exFire(1.15), d, () => {
          spawnAimed(game, en, game.player, {
            n: 1, parity: 'odd', type: 'dot', speed: exSp(2.25), color: C.pink,
          });
        });
      };
      g.spawnEnemy(e);
    },
  });
}

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

export function mid_hoverElite(g) {
  installMidWave(g, {
    interval: SI(2.2),
    maxWaves: 3,
    onWave: (g, wave) => {
      g.waveCount = wave;
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
      g.spawnEnemy(e);
    },
  });
}

export function mid_laserSniper(g) {
  installMidWave(g, {
    interval: SI(1.4),
    maxWaves: 5,
    onWave: (g, wave) => {
      g.waveCount = wave;
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
      g.spawnEnemy(e);
    },
  });
}

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
      g.spawnBullet(acquireBullet({
        x: Math.random() * LOGICAL_W, y: -10,
        vx: (Math.random() - 0.5) * 0.35, vy: exSp(1.55 + Math.random() * 0.4),
        type: 'rice', color: C.orange, from: 'enemy', gravity: 0.012,
      }));
    }
  };
}

export function mid_vForm(g) {
  installMidWave(g, {
    interval: SI(1.5),
    maxWaves: 4,
    onWave: (g, wave) => {
      g.waveCount = wave;
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
        g.spawnEnemy(e);
      }
    },
  });
}

export function mid_sideStream(g) {
  installMidWave(g, {
    interval: SI(0.55),
    maxWaves: 10,
    onWave: (g, wave) => {
      g.waveCount = wave;
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
      g.spawnEnemy(e);
    },
  });
}

export function mid_splitLarge(g) {
  installMidWave(g, {
    interval: SI(1.6),
    maxWaves: 4,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = elite({
        x: 70 + Math.random() * (LOGICAL_W - 140), y: 90,
        hp: exHp(180), color: C.orange, kind: 'generic',
      });
      e.vy = 0.2;
      e.script = (en, d, game) => {
        timer(en, 'big', exFire(1.9), d, () => {
          game.spawnBullet(acquireBullet({
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
      g.spawnEnemy(e);
    },
  });
}

export function mid_diagCross(g) {
  installMidWave(g, {
    interval: SI(0.75),
    maxWaves: 8,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const fromLeft = g.waveCount % 2 === 1;
      const e = mob(fromLeft ? -10 : LOGICAL_W + 10, -10, exHp(32), C.cyan);
      e.vx = fromLeft ? 1.4 : -1.4;
      e.vy = 1.5;
      e.script = (en, d, game) => {
        timer(en, 's', exFire(0.8), d, () => {
          const ang = Math.atan2(game.player.y - en.y, game.player.x - en.x);
          game.spawnBullet(acquireBullet({
            x: en.x, y: en.y, angle: ang, speed: exSp(2.35),
            type: 'dot', color: C.cyan, from: 'enemy',
          }));
        });
      };
      g.spawnEnemy(e);
    },
  });
}

export function mid_ringEven(g) {
  installMidWave(g, {
    interval: SI(1.5),
    maxWaves: 4,
    onWave: (g, wave) => {
      g.waveCount = wave;
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
      g.spawnEnemy(e);
    },
  });
}

export function mid_zigzag(g) {
  installMidWave(g, {
    interval: SI(0.95),
    maxWaves: 6,
    onWave: (g, wave) => {
      g.waveCount = wave;
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
      g.spawnEnemy(e);
    },
  });
}

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
  g.spawnEnemy(core);
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
    g.spawnEnemy(e);
  };
}

export function mid_fixedFan(g) {
  installMidWave(g, {
    interval: SI(1.1),
    maxWaves: 5,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = mob(70 + (g.waveCount % 4) * 90, -18, exHp(38), C.blue);
      e.vy = 0.95;
      e.script = (en, d, game) => {
        if (en.y > 90) en.vy = 0.18;
        timer(en, 'f', exFire(0.75), d, () => {
          en.data.a = (en.data.a || Math.PI * 0.55) + 0.12;
          const base = en.data.a;
          for (let i = -1; i <= 1; i++) {
            game.spawnBullet(acquireBullet({
              x: en.x, y: en.y, angle: base + i * 0.2, speed: exSp(2.1),
              type: 'rice', color: C.blue, from: 'enemy',
            }));
          }
        });
      };
      g.spawnEnemy(e);
    },
  });
}

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
      g.spawnBullet(acquireBullet({
        x, y: -12, vx: 0, vy: exSp(1.9),
        type: 'rice', color: C.dark, from: 'enemy',
      }));
    }

    const e = mob(gapX, -18, exHp(28), C.cyan);
    e.vy = 0.9;
    e.script = (en, d, game) => {
      timer(en, 's', exFire(0.55), d, () => {
        spawnAimed(game, en, game.player, {
          n: 1, parity: 'odd', type: 'dot', speed: exSp(2.4), color: C.cyan,
        });
      });
    };
    g.spawnEnemy(e);
  };
}

export function mid_sideBarrage(g) {
  installMidWave(g, {
    interval: SI(1.3),
    maxWaves: 5,
    onWave: (g, wave) => {
      g.waveCount = wave;
      for (const side of [-1, 1]) {
        const e = mob(side < 0 ? 40 : LOGICAL_W - 40, 60 + g.waveCount * 8, exHp(36), C.orange);
        e.vy = 0.7;
        e.script = (en, d, game) => {
          timer(en, 's', exFire(0.65), d, () => {
            const dir = en.x < LOGICAL_W / 2 ? 1 : -1;
            for (let i = -1; i <= 1; i++) {
              game.spawnBullet(acquireBullet({
                x: en.x, y: en.y,
                vx: dir * exSp(2.3), vy: i * exSp(0.55),
                type: 'dot', color: C.orange, from: 'enemy',
              }));
            }
          });
        };
        g.spawnEnemy(e);
      }
    },
  });
}

export function mid_spiralLite(g) {
  installMidWave(g, {
    interval: SI(1.8),
    maxWaves: 3,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = elite({
        x: LOGICAL_W / 2 + (g.waveCount % 2 ? -60 : 60), y: 100,
        hp: exHp(220), color: C.pink, kind: 'generic',
      });
      e.vy = 0.12;
      e.script = (en, d, game) => {
        timer(en, 'sp', exFire(0.22), d, () => {
          en.data.a = (en.data.a || 0) + 0.45;
          game.spawnBullet(acquireBullet({
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
      g.spawnEnemy(e);
    },
  });
}

export function mid_echoSides(g) {
  installMidWave(g, {
    interval: SI(0.8),
    maxWaves: 6,
    onWave: (g, wave) => {
      g.waveCount = wave;
      for (const side of [-1, 1]) {
        const e = mob(LOGICAL_W / 2 + side * 160, -18, exHp(30), C.green);
        e.vy = 1.0;
        e.script = (en, d, game) => {
          timer(en, 's', exFire(0.85), d, () => {
            spawnAimed(game, en, game.player, {
              n: 1, parity: 'odd', type: 'dot', speed: exSp(2.3), color: C.green,
            });
          });
        };
        g.spawnEnemy(e);
      }
    },
  });
}

export function mid_randomGap(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.gapTimer = 0;
  g.gapX = LOGICAL_W / 2;
  g.waveFn = (dt) => {
    g.gapTimer += dt;
    if (g.gapTimer > exFire(1.5)) {
      g.gapTimer = 0;
      g.gapX = 70 + Math.random() * (LOGICAL_W - 140);
    }
    g.waveTimer += dt;
    if (g.waveTimer < exFire(1.15)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 5) return;
    const gap = 70;
    const gapX = g.gapX;
    for (let x = 16; x < LOGICAL_W - 16; x += 20) {
      if (x > gapX - gap / 2 && x < gapX + gap / 2) continue;
      g.spawnBullet(acquireBullet({
        x, y: -12, vx: 0, vy: exSp(1.9),
        type: 'rice', color: C.dark, from: 'enemy',
      }));
    }
    const e = mob(gapX, -18, exHp(28), C.cyan);
    e.vy = 0.9;
    e.script = (en, d, game) => {
      timer(en, 's', exFire(0.55), d, () => {
        spawnAimed(game, en, game.player, {
          n: 1, parity: 'odd', type: 'dot', speed: exSp(2.4), color: C.cyan,
        });
      });
    };
    g.spawnEnemy(e);
  };
}

export function mid_dualColor(g) {
  installMidWave(g, {
    interval: SI(2.0),
    maxWaves: 3,
    onWave: (g, wave) => {
      g.waveCount = wave;
      [-1, 1].forEach((side, i) => {
        const e = elite({
          x: LOGICAL_W / 2 + side * 145, y: 80,
          hp: exHp(180), kind: 'generic',
          color: i ? C.cyan : C.orange,
        });
        e.vy = 0.2;
        e.script = (en, d, game) => {
          const idx = en.x > LOGICAL_W / 2 ? 1 : 0;
          const color = idx ? C.cyan : C.orange;
          const type = idx ? 'dot' : 'talisman';
          timer(en, 'f', exFire(idx ? 0.7 : 0.9), d, () => {
            const base = Math.atan2(LOGICAL_H / 2 - en.y, LOGICAL_W / 2 - en.x);
            for (let i = -1; i <= 1; i++) {
              game.spawnBullet(acquireBullet({
                x: en.x, y: en.y, angle: base + i * 0.18, speed: exSp(2.2),
                type, color, from: 'enemy',
              }));
            }
          });
        };
        g.spawnEnemy(e);
      });
    },
  });
}

export function mid_hoverRingDuo(g) {
  installMidWave(g, {
    interval: SI(1.4),
    maxWaves: 3,
    onWave: (g, wave) => {
      g.waveCount = wave;
      for (let i = 0; i < 2; i++) {
        const x = 100 + i * 200 + (g.waveCount % 2) * 30;
        const e = mob(x, -20, exHp(45), i ? C.violet : C.gold);
        e.vy = 1.0;
        e.script = (en, d, game) => {
          const stopY = en.color === C.gold ? 120 : 170;
          if (en.y > stopY - 5) en.vy = 0.15;
          const type = en.color === C.gold ? 'talisman' : 'dot';
          timer(en, 'r', exFire(1.3), d, () => {
            spawnRingAt(game, en.x, en.y, exN(10), exSp(1.8), type, en.color, en.age);
          });
        };
        g.spawnEnemy(e);
      }
    },
  });
}

export function mid_rainSniper(g) {
  g.rainT = 0;
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > exFire(0.3)) {
      g.rainT = 0;
      spawnGravityRain(g, 1, 'rice', C.violet, exSp(1.7));
    }
    g.waveTimer += dt;
    if (g.waveTimer < SI(1.5)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 4) return;
    const e = elite({
      x: 60 + Math.random() * (LOGICAL_W - 120), y: 85,
      hp: exHp(150), color: C.violet, kind: 'generic',
    });
    e.vy = 0.2;
    e.script = (en, d, game) => {
      timer(en, 'a', exFire(1.0), d, () => {
        spawnAimed(game, en, game.player, {
          n: exN(1, 'odd'), parity: 'odd', type: 'medium',
          speed: exSp(2.4), spread: 0.12, color: C.violet,
        });
      });
    };
    g.spawnEnemy(e);
  };
}

export function mid_columnLane(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.aimTimer = 0;
  g.waveFn = (dt) => {
    g.aimTimer = (g.aimTimer || 0) + dt;
    if (g.aimTimer > exFire(0.8)) {
      g.aimTimer = 0;
      const rx = 30 + Math.random() * (LOGICAL_W - 60);
      g.spawnBullet(acquireBullet({
        x: rx, y: -10, vx: 0, vy: exSp(2.3),
        type: 'dot', color: C.red, from: 'enemy',
      }));
    }
    g.waveTimer += dt;
    if (g.waveTimer < exFire(1.0)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 6) return;
    const offset = (g.waveCount * 30) % 90;
    const cols = [40 + offset, 225, LOGICAL_W - 40 - offset];
    for (const x of cols) {
      for (let i = 0; i < 4; i++) {
        g.spawnBullet(acquireBullet({
          x, y: -12 - i * 28, vx: 0, vy: exSp(1.9),
          type: 'rice', color: C.blue, from: 'enemy',
        }));
      }
    }
  };
}

export function mid_eliteFan(g) {
  installMidWave(g, {
    interval: SI(2.0),
    maxWaves: 3,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = elite({
        x: LOGICAL_W / 2, y: 90,
        hp: exHp(220), color: C.gold, kind: 'generic',
      });
      e.vy = 0.15;
      e.script = (en, d, game) => {
        timer(en, 'f', exFire(0.7), d, () => {
          en.data.a = (en.data.a || Math.PI * 0.25) + 0.12;
          const base = en.data.a;
          for (let i = -2; i <= 2; i++) {
            game.spawnBullet(acquireBullet({
              x: en.x, y: en.y, angle: base + i * 0.15, speed: exSp(2.0),
              type: 'rice', color: C.gold, from: 'enemy',
            }));
          }
        });
        timer(en, 'a', exFire(1.2), d, () => {
          spawnAimed(game, en, game.player, {
            n: exN(2, 'odd'), parity: 'odd', type: 'talisman',
            speed: exSp(2.3), spread: 0.12, color: C.white,
          });
        });
      };
      g.spawnEnemy(e);
    },
  });
}

export function mid_laserDot(g) {
  g.rainT = 0;
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > exFire(0.2)) {
      g.rainT = 0;
      g.spawnBullet(acquireBullet({
        x: Math.random() * LOGICAL_W, y: -10,
        vx: (Math.random() - 0.5) * 0.4, vy: exSp(1.6 + Math.random() * 0.5),
        type: 'dot', color: C.cyan, from: 'enemy', gravity: 0.01,
      }));
    }
    g.waveTimer += dt;
    if (g.waveTimer < SI(1.5)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 4) return;
    const e = mob(50 + (g.waveCount * 80) % (LOGICAL_W - 100), 50, exHp(38), C.cyan);
    e.vy = 0.2;
    e.script = (en, d, game) => {
      timer(en, 'L', exFire(1.2), d, () => spawnAimedLaser(game, en, game.player, C.cyan));
    };
    g.spawnEnemy(e);
  };
}

export function mid_wallRain(g) {
  g.rainT = 0;
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > exFire(0.3)) {
      g.rainT = 0;
      for (let i = 0; i < 3; i++) {
        spawnGravityRain(g, 1, 'rice', C.violet, exSp(1.8));
      }
    }
    g.waveTimer += dt;
    if (g.waveTimer < exFire(1.3)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 4) return;
    const gap = 70;
    const gapX = 80 + Math.random() * (LOGICAL_W - 160);
    for (let x = 16; x < LOGICAL_W - 16; x += 20) {
      if (x > gapX - gap / 2 && x < gapX + gap / 2) continue;
      g.spawnBullet(acquireBullet({
        x, y: -12, vx: 0, vy: exSp(1.9),
        type: 'rice', color: C.dark, from: 'enemy',
      }));
    }
    const e = mob(gapX, -18, exHp(30), C.violet);
    e.vy = 0.9;
    e.script = (en, d, game) => {
      timer(en, 's', exFire(0.5), d, () => {
        spawnAimed(game, en, game.player, {
          n: 1, parity: 'odd', type: 'dot', speed: exSp(2.4), color: C.violet,
        });
      });
    };
    g.spawnEnemy(e);
  };
}

export function mid_vFormHeavy(g) {
  installMidWave(g, {
    interval: SI(1.4),
    maxWaves: 3,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const cx = LOGICAL_W / 2;
      for (let k = -2; k <= 2; k++) {
        const e = mob(cx + k * 35, -20 - Math.abs(k) * 10, exHp(26), C.blue);
        e.vy = 1.15;
        e.script = (en, d, game) => {
          timer(en, 's', exFire(0.5), d, () => {
            spawnAimed(game, en, game.player, {
              n: 1, parity: 'odd', type: 'dot', speed: exSp(2.3), color: C.blue,
            });
          });
        };
        g.spawnEnemy(e);
      }
      for (const side of [-1, 1]) {
        const e = mob(cx + side * 15, -45, exHp(26), C.pink);
        e.vy = 1.15;
        e.script = (en, d, game) => {
          timer(en, 's', exFire(0.5), d, () => {
            spawnAimed(game, en, game.player, {
              n: 1, parity: 'odd', type: 'dot', speed: exSp(2.3), color: C.pink,
            });
          });
        };
        g.spawnEnemy(e);
      }
    },
  });
}

export function mid_sideCross(g) {
  installMidWave(g, {
    interval: SI(0.65),
    maxWaves: 6,
    onWave: (g, wave) => {
      g.waveCount = wave;
      for (const [dir, y] of [[1, 80], [-1, 180]]) {
        const e = mob(dir > 0 ? -15 : LOGICAL_W + 15, y, exHp(32), C.green);
        e.vx = dir * 1.8;
        e.vy = 0.1;
        e.script = (en, d, game) => {
          timer(en, 's', exFire(0.7), d, () => {
            spawnAimed(game, en, game.player, {
              n: exN(2, 'even'), parity: 'even', type: 'rice',
              speed: exSp(2.2), spread: 0.2, color: C.green,
            });
          });
        };
        g.spawnEnemy(e);
      }
    },
  });
}

export function mid_splitRing(g) {
  installMidWave(g, {
    interval: SI(1.6),
    maxWaves: 4,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = elite({
        x: 70 + Math.random() * (LOGICAL_W - 140), y: 80,
        hp: exHp(200), color: C.cyan, kind: 'generic',
      });
      e.vy = 0.2;
      e.script = (en, d, game) => {
        timer(en, 'big', exFire(2.0), d, () => {
          game.spawnBullet(acquireBullet({
            x: en.x, y: en.y, vx: 0, vy: exSp(1.2),
            type: 'large', color: C.cyan, from: 'enemy', gravity: 0.01, life: 5,
            onSplit: (self) => spawnRingAt(game, self.x, self.y, exN(10), exSp(1.6), 'dot', C.white),
          }));
        });
        timer(en, 'a', exFire(0.8), d, () => {
          spawnAimed(game, en, game.player, {
            n: 1, parity: 'odd', type: 'talisman', speed: exSp(2.3), color: C.white,
          });
        });
      };
      g.spawnEnemy(e);
    },
  });
}
