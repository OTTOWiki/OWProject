/**
 * Extra 道中图案 32–61
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

export function mid_diagReturn(g) {
  installMidWave(g, {
    interval: SI(0.7),
    maxWaves: 8,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = mob(-15, -15, exHp(30), C.blue);
      e.vx = 1.5;
      e.vy = 1.8;
      e.script = (en, d, game) => {
        if (en.vy > 0 && en.y > 180) en.vy = -0.5;
        else if (en.vy < 0 && en.y < 60) en.vy = 0.2;
        timer(en, 's', exFire(0.6), d, () => {
          if (en.vy > 0) {
            spawnAimed(game, en, game.player, {
              n: 1, parity: 'odd', type: 'dot', speed: exSp(2.4), color: C.blue,
            });
          }
        });
      };
      g.spawnEnemy(e);
    },
  });
}

export function mid_ringGap(g) {
  installMidWave(g, {
    interval: SI(1.5),
    maxWaves: 4,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = elite({
        x: LOGICAL_W / 2, y: 90,
        hp: exHp(220), color: C.violet, kind: 'generic',
      });
      e.vy = 0.12;
      e.script = (en, d, game) => {
        timer(en, 'r', exFire(0.7), d, () => {
          en.data.tog = !en.data.tog;
          spawnRingAt(game, en.x, en.y, exN(12), exSp(1.7), 'talisman', C.violet, en.data.tog ? 0.15 : 0);
          spawnRingAt(game, en.x, en.y, exN(12), exSp(1.5), 'talisman', C.white, en.data.tog ? 0.15 + Math.PI / 12 : Math.PI / 12);
        });
      };
      g.spawnEnemy(e);
      const gap = 75;
      const gapX = 70 + Math.random() * (LOGICAL_W - 140);
      for (let x = 16; x < LOGICAL_W - 16; x += 20) {
        if (x > gapX - gap / 2 && x < gapX + gap / 2) continue;
        g.spawnBullet(acquireBullet({
          x, y: -12, vx: 0, vy: exSp(1.9),
          type: 'rice', color: C.dark, from: 'enemy',
        }));
      }
    },
  });
}

export function mid_zigzagDual(g) {
  installMidWave(g, {
    interval: SI(1.1),
    maxWaves: 5,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const cx = LOGICAL_W / 2;
      for (const [dx, col] of [[-70, C.cyan], [70, C.orange]]) {
        const e = mob(cx + dx, -18, exHp(30), col);
        e.vy = 1.1;
        e.data = { phase: g.waveCount * 0.5 + (dx < 0 ? 0 : Math.PI) };
        e.script = (en, d, game) => {
          en.data.phase += d * 2.0;
          en.x = cx + Math.sin(en.data.phase) * 90;
          timer(en, 's', exFire(0.85), d, () => {
            spawnAimed(game, en, game.player, {
              n: 1, parity: 'odd', type: 'rice', speed: exSp(2.3), color: en.color,
            });
          });
        };
        g.spawnEnemy(e);
      }
    },
  });
}

export function mid_coreSpin(g) {
  const core = elite({
    x: LOGICAL_W / 2, y: 95, hp: exHp(250), color: C.gold, kind: 'generic', label: '旋核',
  });
  core.vy = 0.08;
  core.script = (en, d, game) => {
    timer(en, 'a', exFire(0.9), d, () => {
      spawnAimed(game, en, game.player, {
        n: exN(3, 'odd'), parity: 'odd', type: 'talisman',
        speed: exSp(2.0), spread: 0.15, color: C.gold,
      });
    });
    timer(en, 'r', exFire(1.2), d, () => {
      en.data.a = (en.data.a || 0) + 0.3;
      spawnRingAt(game, en.x, en.y, exN(10), exSp(1.8), 'dot', C.white, en.data.a);
    });
  };
  g.spawnEnemy(core);
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < SI(1.0)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 5) return;
    const side = g.waveCount % 2 ? 50 : LOGICAL_W - 50;
    const e = mob(side, -15, exHp(26), C.white);
    e.vy = 1.3;
    e.script = (en, d, game) => {
      timer(en, 's', exFire(0.9), d, () => {
        spawnAimed(game, en, game.player, {
          n: 1, parity: 'odd', type: 'dot', speed: exSp(2.2), color: C.white,
        });
      });
    };
    g.spawnEnemy(e);
  };
}

export function mid_fanEcho(g) {
  installMidWave(g, {
    interval: SI(1.0),
    maxWaves: 5,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = mob(80 + (g.waveCount % 4) * 85, -18, exHp(36), C.pink);
      e.vy = 0.9;
      e.script = (en, d, game) => {
        if (en.y > 90) en.vy = 0.15;
        en.data.a = (en.data.a || 0) + d * 0.6;
        en.x += Math.sin(en.data.a) * 0.6;
        timer(en, 'f', exFire(0.7), d, () => {
          const base = Math.atan2(game.player.y - en.y, game.player.x - en.x);
          for (let i = -2; i <= 2; i++) {
            game.spawnBullet(acquireBullet({
              x: en.x, y: en.y, angle: base + i * 0.18, speed: exSp(2.1),
              type: 'rice', color: C.pink, from: 'enemy',
            }));
          }
        });
        timer(en, 'a', exFire(0.6), d, () => {
          spawnAimed(game, en, game.player, {
            n: 1, parity: 'odd', type: 'rice', speed: exSp(2.3), color: C.white,
          });
        });
      };
      g.spawnEnemy(e);
    },
  });
}

export function mid_wallRebuild(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < exFire(1.2)) return;
    g.waveTimer = 0;
    const gap = 55;
    const gapX = 70 + Math.random() * (LOGICAL_W - 140);
    for (let x = 16; x < LOGICAL_W - 16; x += 22) {
      if (x > gapX - gap / 2 && x < gapX + gap / 2) continue;
      g.spawnBullet(acquireBullet({
        x, y: -12, vx: 0, vy: exSp(1.9),
        type: 'medium', color: C.dark, from: 'enemy',
      }));
    }
    const e = mob(gapX, -18, exHp(30), C.orange);
    e.vy = 0.9;
    e.script = (en, d, game) => {
      timer(en, 's', exFire(0.5), d, () => {
        spawnAimed(game, en, game.player, {
          n: 1, parity: 'odd', type: 'medium', speed: exSp(2.4), color: C.orange,
        });
      });
    };
    g.spawnEnemy(e);
  };
}

export function mid_barrageRing(g) {
  installMidWave(g, {
    interval: SI(1.2),
    maxWaves: 5,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const yL = 70 + (g.waveCount * 25) % 200;
      const yR = 60 + (g.waveCount * 35) % 200;
      const left = mob(30, yL, exHp(34), C.red);
      left.vy = 0.25;
      left.script = (en, d, game) => {
        timer(en, 's', exFire(0.55), d, () => {
          game.spawnBullet(acquireBullet({
            x: en.x, y: en.y,
            vx: exSp(2.6), vy: (yR - en.y) * 0.008,
            type: 'rice', color: C.red, from: 'enemy',
          }));
        });
      };
      g.spawnEnemy(left);
      const right = mob(LOGICAL_W - 30, yR, exHp(34), C.blue);
      right.vy = 0.25;
      right.script = (en, d, game) => {
        timer(en, 's', exFire(0.55), d, () => {
          game.spawnBullet(acquireBullet({
            x: en.x, y: en.y,
            vx: -exSp(2.6), vy: (yL - en.y) * 0.008,
            type: 'rice', color: C.blue, from: 'enemy',
          }));
        });
      };
      g.spawnEnemy(right);
      if (g.waveCount % 2 === 0) {
        spawnRingAt(g, LOGICAL_W / 2, 130, exN(10), exSp(1.5), 'dot', C.gold);
      }
    },
  });
}

export function mid_spiralAfter(g) {
  installMidWave(g, {
    interval: SI(1.8),
    maxWaves: 3,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = elite({
        x: LOGICAL_W / 2 + (g.waveCount % 2 ? -50 : 50), y: 100,
        hp: exHp(230), color: C.violet, kind: 'generic',
      });
      e.vy = 0.1;
      e.script = (en, d, game) => {
        timer(en, 'sp', exFire(0.18), d, () => {
          en.data.a = (en.data.a || 0) + 0.4;
          for (let i = 0; i < 2; i++) {
            game.spawnBullet(acquireBullet({
              x: en.x, y: en.y, angle: en.data.a + i * Math.PI, speed: exSp(2.1),
              type: 'dot', color: i ? C.white : C.violet, from: 'enemy',
            }));
          }
        });
        timer(en, 'a', exFire(0.9), d, () => {
          spawnAimed(game, en, game.player, {
            n: exN(2, 'even'), parity: 'even', type: 'rice',
            speed: exSp(2.4), spread: 0.2, color: C.white,
          });
        });
      };
      g.spawnEnemy(e);
    },
  });
}

export function mid_altAfter(g) {
  installMidWave(g, {
    interval: SI(1.0),
    maxWaves: 6,
    onWave: (g, wave) => {
      g.waveCount = wave;
      for (const side of [-1, 1]) {
        const e = mob(LOGICAL_W / 2 + side * 150, -18, exHp(32), C.green);
        e.vy = 1.1;
        e.script = (en, d, game) => {
          timer(en, 's', exFire(0.8), d, () => {
            spawnAimed(game, en, game.player, {
              n: exN(2, 'even'), parity: 'even', type: 'rice',
              speed: exSp(2.2), spread: 0.18, color: C.green,
            });
          });
        };
        g.spawnEnemy(e);
      }
    },
  });
}

export function mid_randomAfter(g) {
  installMidWave(g, {
    interval: SI(0.9),
    maxWaves: 6,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = mob(50 + Math.random() * (LOGICAL_W - 100), -18, exHp(34), C.cyan);
      e.vy = 1.0;
      e.script = (en, d, game) => {
        timer(en, 's', exFire(0.85), d, () => {
          spawnAimed(game, en, game.player, {
            n: exN(1, 'odd'), parity: 'odd', type: 'talisman',
            speed: exSp(2.3), spread: 0.12, color: C.cyan,
          });
        });
      };
      g.spawnEnemy(e);
      if (g.waveCount % 2 === 0) {
        const e2 = mob(Math.random() * (LOGICAL_W - 100) + 50, -18, exHp(28), C.white);
        e2.vy = 1.2;
        e2.script = (en, d, game) => {
          timer(en, 's', exFire(0.7), d, () => {
            spawnAimed(game, en, game.player, {
              n: 1, parity: 'odd', type: 'dot', speed: exSp(2.1), color: C.white,
            });
          });
        };
        g.spawnEnemy(e2);
      }
    },
  });
}

export function mid_dualAfter(g) {
  installMidWave(g, {
    interval: SI(1.0),
    maxWaves: 5,
    onWave: (g, wave) => {
      g.waveCount = wave;
      for (const side of [-1, 1]) {
        const e = mob(LOGICAL_W / 2 + side * 100, -15, exHp(30), side < 0 ? C.blue : C.orange);
        e.vy = 1.1;
        e.script = (en, d, game) => {
          game.spawnBullet(acquireBullet({
            x: en.x, y: en.y, angle: Math.PI / 2, speed: exSp(1.5),
            type: 'dot', color: C.gold, from: 'enemy',
          }));
          timer(en, 's', exFire(0.9), d, () => {
            spawnAimed(game, en, game.player, {
              n: exN(2, 'even'), parity: 'even', type: 'dot',
              speed: exSp(2.1), spread: 0.2, color: en.color,
            });
          });
        };
        g.spawnEnemy(e);
      }
    },
  });
}

export function mid_hoverRingAfter(g) {
  installMidWave(g, {
    interval: SI(1.3),
    maxWaves: 4,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const x = 90 + ((g.waveCount - 1) % 3) * 130;
      const e = mob(x, -20, exHp(48), C.gold);
      e.vy = 1.0;
      e.script = (en, d, game) => {
        if (en.y > 100 && en.y < 150) en.vy = 0.12;
        timer(en, 'r', exFire(1.0), d, () => {
          spawnRingAt(game, en.x, en.y, exN(10), exSp(1.7), 'talisman', C.gold, en.age);
          spawnRingAt(game, en.x, en.y, exN(8), exSp(1.4), 'dot', C.white, en.age * 0.6);
        });
      };
      g.spawnEnemy(e);
    },
  });
}

export function mid_rainAfter(g) {
  g.rainT = 0;
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT >= exFire(0.35)) {
      g.rainT = 0;
      for (let i = 0; i < 3; i++) {
        spawnGravityRain(g, 1, 'medium', C.pink, exSp(1.6));
      }
    }
    g.waveTimer += dt;
    if (g.waveTimer < SI(1.5)) return;
    g.waveTimer = 0;
    g.waveCount++;
    if (g.waveCount > 4) return;
    const e = mob(60 + Math.random() * (LOGICAL_W - 120), -18, exHp(34), C.pink);
    e.vy = 1.0;
    e.script = (en, d, game) => {
      timer(en, 's', exFire(0.9), d, () => {
        spawnAimed(game, en, game.player, {
          n: exN(2, 'even'), parity: 'even', type: 'rice',
          speed: exSp(2.3), spread: 0.18, color: C.white,
        });
      });
    };
    g.spawnEnemy(e);
  };
}

export function mid_crossAfter(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < exFire(0.6)) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    spawnCrossFall(g, {
      y: -10, speed: exSp(1.8), type: 'rice',
      color: g.waveCount % 2 ? C.cyan : C.blue,
      lanes: 8, evenOffset: true,
    });
  };
}

export function mid_hoverEliteAfter(g) {
  installMidWave(g, {
    interval: SI(2.0),
    maxWaves: 3,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = elite({
        x: 80 + Math.random() * (LOGICAL_W - 160), y: 75,
        hp: exHp(200), color: C.pink, kind: 'generic',
      });
      e.vy = 0.25;
      e.script = (en, d, game) => {
        timer(en, 'a', exFire(0.7), d, () => {
          spawnAimed(game, en, game.player, {
            n: exN(3, 'even'), parity: 'even', type: 'medium',
            speed: exSp(2.2), spread: 0.2, color: C.pink,
          });
        });
      };
      g.spawnEnemy(e);
      const side = g.waveCount % 2 ? 50 : LOGICAL_W - 50;
      const escort = mob(side, -15, exHp(24), C.white);
      escort.vy = 1.2;
      escort.script = (en, d, game) => {
        timer(en, 's', exFire(0.9), d, () => {
          spawnAimed(game, en, game.player, {
            n: 1, parity: 'odd', type: 'dot', speed: exSp(2.2), color: C.white,
          });
        });
      };
      g.spawnEnemy(escort);
    },
  });
}

export function mid_laserAfter(g) {
  installMidWave(g, {
    interval: SI(1.4),
    maxWaves: 4,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = mob(50 + (g.waveCount * 70) % (LOGICAL_W - 100), 55, exHp(40), C.violet);
      e.vy = 0.2;
      e.script = (en, d, game) => {
        timer(en, 'L', exFire(1.3), d, () => spawnAimedLaser(game, en, game.player, C.violet));
        timer(en, 's', exFire(0.6), d, () => {
          spawnAimed(game, en, game.player, {
            n: exN(1, 'odd'), parity: 'odd', type: 'talisman',
            speed: exSp(2.4), color: C.white,
          });
        });
      };
      g.spawnEnemy(e);
    },
  });
}

export function mid_hLaserAfter(g) {
  g.laserT = 0;
  g.rainT = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > exFire(0.65)) {
      g.laserT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const y = 90 + (g.waveCount * 48) % 320;
      spawnHLaser(g, y, g.waveCount % 2 === 0 ? 1 : -1, C.gold);
    }
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > exFire(0.25)) {
      g.rainT = 0;
      for (let i = 0; i < 2; i++) {
        g.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10,
          vx: (Math.random() - 0.5) * 0.35, vy: exSp(1.6 + Math.random() * 0.4),
          type: 'rice', color: C.orange, from: 'enemy', gravity: 0.012,
        }));
      }
    }
  };
}

export function mid_vFormAfter(g) {
  installMidWave(g, {
    interval: SI(1.4),
    maxWaves: 4,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const cx = LOGICAL_W / 2;
      for (let k = -2; k <= 2; k++) {
        const e = mob(cx + k * 38, -20 - Math.abs(k) * 12, exHp(28), C.blue);
        e.vy = 1.2;
        e.script = (en, d, game) => {
          timer(en, 's', exFire(0.9), d, () => {
            spawnAimed(game, en, game.player, {
              n: exN(2, 'even'), parity: 'even', type: 'rice',
              speed: exSp(2.3), spread: 0.16, color: C.blue,
            });
          });
        };
        g.spawnEnemy(e);
      }
      for (const side of [-1, 1]) {
        const e = mob(cx + side * 100, -15, exHp(26), C.orange);
        e.vy = 1.3;
        e.script = (en, d, game) => {
          timer(en, 's', exFire(0.8), d, () => {
            spawnAimed(game, en, game.player, {
              n: 1, parity: 'odd', type: 'dot', speed: exSp(2.2), color: C.orange,
            });
          });
        };
        g.spawnEnemy(e);
      }
    },
  });
}

export function mid_sideStreamAfter(g) {
  installMidWave(g, {
    interval: SI(0.5),
    maxWaves: 10,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const fromLeft = g.waveCount <= 5;
      const e = mob(fromLeft ? -15 : LOGICAL_W + 15, 60 + ((g.waveCount - 1) % 5) * 30, exHp(30), C.pink);
      e.vx = fromLeft ? 1.8 : -1.8;
      e.vy = 0.15;
      e.script = (en, d, game) => {
        timer(en, 's', exFire(0.5), d, () => {
          spawnAimed(game, en, game.player, {
            n: exN(2, 'even'), parity: 'even', type: 'rice',
            speed: exSp(2.4), spread: 0.18, color: C.pink,
          });
        });
      };
      g.spawnEnemy(e);
    },
  });
}

export function mid_splitAfter(g) {
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
            onSplit: (self) => spawnRingAt(game, self.x, self.y, exN(12), exSp(1.5), 'dot', C.gold),
          }));
        });
        timer(en, 'a', exFire(1.1), d, () => {
          spawnAimed(game, en, game.player, {
            n: 1, parity: 'odd', type: 'talisman', speed: exSp(2.2), color: C.white,
          });
        });
      };
      g.spawnEnemy(e);
      if (g.waveCount >= 3) {
        const e2 = elite({
          x: Math.random() * (LOGICAL_W - 140) + 70, y: 75,
          hp: exHp(140), color: C.gold, kind: 'generic',
        });
        e2.vy = 0.2;
        e2.script = (en, d, game) => {
          timer(en, 'big', exFire(1.6), d, () => {
            game.spawnBullet(acquireBullet({
              x: en.x, y: en.y, vx: 0, vy: exSp(1.0),
              type: 'large', color: C.gold, from: 'enemy', gravity: 0.01, life: 5,
              onSplit: (self) => spawnRingAt(game, self.x, self.y, exN(10), exSp(1.8), 'dot', C.orange),
            }));
          });
        };
        g.spawnEnemy(e2);
      }
    },
  });
}

export function mid_diagAfter(g) {
  installMidWave(g, {
    interval: SI(0.7),
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
          for (let i = 0; i < 4; i++) {
            game.spawnBullet(acquireBullet({
              x: en.x, y: en.y,
              angle: ang + (i * Math.PI / 2) + Math.PI / 4,
              speed: exSp(2.0), type: 'dot', color: C.cyan, from: 'enemy',
            }));
          }
        });
      };
      g.spawnEnemy(e);
    },
  });
}

export function mid_ringEvenAfter(g) {
  installMidWave(g, {
    interval: SI(1.5),
    maxWaves: 5,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = elite({
        x: LOGICAL_W * (0.3 + (g.waveCount % 3) * 0.2), y: 95,
        hp: exHp(210), color: C.violet, kind: 'generic',
      });
      e.vy = 0.15;
      e.data = { alt: 0 };
      e.script = (en, d, game) => {
        timer(en, 'r', exFire(0.9), d, () => {
          en.data.alt = (en.data.alt || 0) + 1;
          if (en.data.alt % 2) {
            spawnRingAt(game, en.x, en.y, exN(12), exSp(1.7), 'talisman', C.violet, en.age);
          } else {
            spawnAimed(game, en, game.player, {
              n: exN(2, 'even'), parity: 'even', type: 'rice',
              speed: exSp(2.25), spread: 0.18, color: C.white,
            });
          }
        });
      };
      g.spawnEnemy(e);
    },
  });
}

export function mid_zigzagAfter(g) {
  installMidWave(g, {
    interval: SI(0.95),
    maxWaves: 6,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = mob(LOGICAL_W / 2, -18, exHp(34), C.red);
      e.vy = 1.1;
      e.data = { phase: g.waveCount * 0.7 };
      e.script = (en, d, game) => {
        en.data.phase = (en.data.phase || 0) + d * 2.8;
        en.x = LOGICAL_W / 2 + Math.sin(en.data.phase) * 110;
        timer(en, 's', exFire(0.85), d, () => {
          spawnAimed(game, en, game.player, {
            n: exN(2, 'even'), parity: 'even', type: 'rice',
            speed: exSp(2.3), spread: 0.18, color: C.red,
          });
        });
      };
      g.spawnEnemy(e);
    },
  });
}

export function mid_centerAfter(g) {
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
    if (g.waveCount > 4) return;
    for (const side of [-1, 1]) {
      const e = mob(LOGICAL_W / 2 + side * 70, -15, exHp(28), C.white);
      e.vy = 1.25;
      e.script = (en, d, game) => {
        timer(en, 's', exFire(1.0), d, () => {
          spawnRingAt(game, en.x, en.y, exN(5), exSp(1.8), 'dot', C.white);
        });
      };
      g.spawnEnemy(e);
    }
  };
}

export function mid_fanAfter(g) {
  installMidWave(g, {
    interval: SI(1.1),
    maxWaves: 6,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = mob(70 + (g.waveCount % 4) * 90, -18, exHp(38), C.blue);
      e.vy = 0.95;
      e.script = (en, d, game) => {
        if (en.y > 90) en.vy = 0.18;
        timer(en, 'f', exFire(0.75), d, () => {
          en.data.a = (en.data.a || Math.PI * 0.55) + 0.12;
          const base = en.data.a;
          for (let i = -2; i <= 1; i++) {
            game.spawnBullet(acquireBullet({
              x: en.x, y: en.y, angle: base + i * 0.28, speed: exSp(2.1),
              type: 'rice', color: C.blue, from: 'enemy',
            }));
          }
        });
        timer(en, 'a', exFire(1.0), d, () => {
          spawnAimed(game, en, game.player, {
            n: 1, parity: 'odd', type: 'rice', speed: exSp(2.3), color: C.white,
          });
        });
      };
      g.spawnEnemy(e);
    },
  });
}

export function mid_wallAfter(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < exFire(1.15)) return;
    g.waveTimer = 0;
    g.waveCount++;
    const gap = 75;
    const positions = [LOGICAL_W * 0.2, LOGICAL_W / 2, LOGICAL_W * 0.8];
    const gapX = positions[(g.waveCount - 1) % 3];
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
          n: exN(2, 'even'), parity: 'even', type: 'talisman',
          speed: exSp(2.4), spread: 0.2, color: C.cyan,
        });
      });
    };
    g.spawnEnemy(e);
  };
}

export function mid_barrageAfter(g) {
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
            for (let i = -2; i <= 2; i++) {
              game.spawnBullet(acquireBullet({
                x: en.x, y: en.y,
                vx: dir * exSp(2.3), vy: i * exSp(0.5),
                type: 'dot', color: C.orange, from: 'enemy',
              }));
            }
          });
        };
        g.spawnEnemy(e);
      }
      if (g.waveCount % 2 === 0) {
        const ls = mob(g.waveCount % 4 === 0 ? 40 : LOGICAL_W - 40, 60 + g.waveCount * 8, exHp(40), C.red);
        ls.vy = 0.3;
        ls.script = (en, d, game) => {
          timer(en, 'L', 0.4, d, () => spawnAimedLaser(game, en, game.player, C.red));
        };
        g.spawnEnemy(ls);
      }
    },
  });
}

export function mid_spiralFinale(g) {
  installMidWave(g, {
    interval: SI(1.8),
    maxWaves: 3,
    onWave: (g, wave) => {
      g.waveCount = wave;
      const e = elite({
        x: LOGICAL_W / 2 + (g.waveCount % 2 ? -60 : 60), y: 100,
        hp: exHp(240), color: C.pink, kind: 'generic',
      });
      e.vy = 0.12;
      e.script = (en, d, game) => {
        timer(en, 'sp', exFire(0.15), d, () => {
          en.data.a = (en.data.a || 0) + 0.5;
          const a = en.data.a;
          game.spawnBullet(acquireBullet({
            x: en.x, y: en.y, angle: a, speed: exSp(2.0),
            type: 'dot', color: C.pink, from: 'enemy',
          }));
          game.spawnBullet(acquireBullet({
            x: en.x, y: en.y, angle: a + Math.PI / 2, speed: exSp(2.0),
            type: 'dot', color: C.gold, from: 'enemy',
          }));
        });
        timer(en, 'a', exFire(0.8), d, () => {
          spawnAimed(game, en, game.player, {
            n: exN(3 + (Math.random() < 0.5 ? 1 : 0), 'odd'), parity: 'odd', type: 'rice',
            speed: exSp(2.5), spread: 0.15, color: C.white,
          });
        });
      };
      g.spawnEnemy(e);
    },
  });
}

export function mid_sanctuary(g) {
  g.waveTimer = 0;
  g.waveCount = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < exFire(0.6)) return;
    g.waveTimer = 0;
    g.waveCount++;
    const dir = g.waveCount % 2 === 0 ? 1 : -1;
    spawnHLaser(g, 100, dir, C.red);
    spawnHLaser(g, 250, -dir, C.cyan);
    spawnHLaser(g, 400, dir, C.gold);
    if (g.waveCount % 2 === 1) {
      const gap = 60 + Math.random() * 30;
      const gapX = 60 + Math.random() * (LOGICAL_W - 120);
      for (let x = 16; x < LOGICAL_W - 16; x += 20) {
        if (x > gapX - gap / 2 && x < gapX + gap / 2) continue;
        g.spawnBullet(acquireBullet({
          x, y: -12, vx: 0, vy: exSp(2.2),
          type: 'rice', color: C.dark, from: 'enemy',
        }));
      }
    }
  };
}

export function mid_overwriteEve(g) {
  const e1 = elite({
    x: LOGICAL_W * 0.25, y: 90, hp: exHp(350), color: C.violet, kind: 'generic',
  });
  e1.vy = 0.15;
  e1.script = (en, d, game) => {
    timer(en, 'L', exFire(1.0), d, () => spawnAimedLaser(game, en, game.player, C.violet));
    timer(en, 'r', exFire(2.5), d, () => {
      spawnRingAt(game, en.x, en.y, exN(16), exSp(2.0), 'talisman', C.gold, en.age);
    });
  };
  g.spawnEnemy(e1);
  const e2 = elite({
    x: LOGICAL_W * 0.75, y: 90, hp: exHp(350), color: C.violet, kind: 'generic',
  });
  e2.vy = 0.15;
  e2.script = (en, d, game) => {
    timer(en, 'L', exFire(1.2), d, () => spawnAimedLaser(game, en, game.player, C.violet));
    timer(en, 'r', exFire(2.8), d, () => {
      spawnRingAt(game, en.x, en.y, exN(14), exSp(1.8), 'dot', C.pink, en.age * 0.5);
    });
  };
  g.spawnEnemy(e2);
  g.rainT = 0;
  g.wallT = 0;
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT >= exFire(0.25)) {
      g.rainT = 0;
      spawnGravityRain(g, 3, 'rice', C.violet, exSp(1.8));
    }
    g.wallT = (g.wallT || 0) + dt;
    if (g.wallT >= exFire(1.2)) {
      g.wallT = 0;
      const gap = 60 + Math.random() * 40;
      const gapX = 60 + Math.random() * (LOGICAL_W - 120);
      for (let x = 16; x < LOGICAL_W - 16; x += 20) {
        if (x > gapX - gap / 2 && x < gapX + gap / 2) continue;
        g.spawnBullet(acquireBullet({
          x, y: -12, vx: 0, vy: exSp(2.5),
          type: 'rice', color: C.dark, from: 'enemy',
        }));
      }
    }
  };
}
void LOGICAL_H;
