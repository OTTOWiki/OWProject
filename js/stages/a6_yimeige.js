/**
 * A6 一美个 — mid/midboss 走 installMidWave + pushBossRef；Letter 脚本不变
 */
import {
  mob, elite, timer, faceDefaults, midChapter, letterChapter,
  installMidWave, pushBossRef,
} from './_shared.js';
import { LOGICAL_W } from '../config.js';
import {
  spawnAimed, spawnRingAt, spawnGravityRain, spawnAimedLaser, spawnHLaser, spawnCrossFall,
} from '../patterns.js';
import { acquireBullet } from '../bulletPool.js';

const PINK = '#e879f9';
const PINK_L = '#f0abfc';
const PINK_D = '#d946ef';
const VIOLET = '#c084fc';
const AMBER = '#fbbf24';

const BOSS_A6 = {
  x: LOGICAL_W / 2, y: 95, kind: 'yimeige',
  color: PINK, color2: PINK_L, label: '一美个', enterY: 95,
};

/* ---------- 道中 ---------- */

function chapter_a6_mid_1(g) {
  installMidWave(g, {
    interval: 0.7, maxWaves: 12,
    onWave: (game) => {
      const e = mob(60 + Math.random() * (LOGICAL_W - 120), -20, 30, PINK);
      e.vy = 0.8;
      e.script = (en, d, gm) => {
        timer(en, 's', 0.7, d, () => {
          spawnAimed(gm, en, gm.player, { n: 2, parity: 'even', type: 'dot', speed: 1.85, spread: 0.28, color: PINK_L });
        });
        timer(en, 'ring', 2.2, d, () => spawnRingAt(gm, en.x, en.y, 6, 1.25, 'rice', PINK));
      };
      game.spawnEnemy(e);
    },
  });
}

function chapter_a6_mid_2(g) {
  installMidWave(g, {
    interval: 0.7, maxWaves: 13,
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.3) {
        game.rainT = 0;
        for (let i = 0; i < 2; i++) {
          game.spawnBullet(acquireBullet({
            x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 0.4, vy: 2.4,
            type: 'talisman', color: PINK_D, from: 'enemy',
          }));
        }
      }
    },
    onWave: (game) => {
      const e = mob(40 + Math.random() * (LOGICAL_W - 80), -15, 28, PINK_L);
      e.vy = 1.3;
      e.onDeath = (en, gm) => {
        spawnAimed(gm, en, gm.player, { n: 3, parity: 'even', type: 'rice', speed: 2.8, spread: 0.16, color: PINK });
      };
      game.spawnEnemy(e);
    },
  });
}

function chapter_a6_mid_3(g) {
  installMidWave(g, {
    interval: 0.75, maxWaves: 13,
    onWave: (game, wave) => {
      const side = wave % 2 ? 35 : LOGICAL_W - 35;
      const e = elite({ x: side, y: 65, hp: 190, kind: 'generic', color: PINK });
      e.vy = 0.35;
      e.script = (en, d, gm) => {
        timer(en, 's', 0.6, d, () => {
          spawnAimed(gm, en, gm.player, { n: 2, parity: 'even', type: 'dot', speed: 2.2, spread: 0.28, color: PINK_L });
        });
        timer(en, 'ring', 1.5, d, () => spawnRingAt(gm, en.x, en.y, 6, 1.35, 'talisman', PINK, en.age));
      };
      game.spawnEnemy(e);
    },
  });
}

function chapter_a6_mid_4(g) {
  installMidWave(g, {
    interval: 0.52, maxWaves: 14,
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.22) { game.rainT = 0; spawnGravityRain(game, 1, 'dot', PINK_L, 1.3); }
    },
    onWave: (game) => {
      const e = mob(50 + Math.random() * (LOGICAL_W - 100), -20, 32, PINK_D);
      e.vy = 1.2;
      e.script = (en, d, gm) => {
        timer(en, 's', 0.5, d, () => {
          spawnAimed(gm, en, gm.player, { n: 3, parity: 'odd', type: 'rice', speed: 2.45, spread: 0.16, color: PINK });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

function chapter_a6_midboss(g) {
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 2300, kind: 'yimeige', color: PINK, color2: PINK_L,
    label: '乐园守护者', enterY: 100,
  }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.0) * 60;
    timer(en, 'aim', 0.7, d, () => {
      spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'medium', speed: 2.2, spread: 0.3, color: PINK_D });
    });
    timer(en, 'ring', 1.4, d, () => spawnRingAt(game, en.x, en.y, 12, 1.6, 'dot', PINK_L, en.age));
    timer(en, 'split', 1.8, d, () => {
      game.spawnBullet(acquireBullet({
        x: en.x, y: en.y + 10, vx: 0, vy: 1.0, type: 'large', color: PINK, from: 'enemy', gravity: 0.008, life: 4,
        onSplit: (self) => spawnRingAt(game, self.x, self.y, 8, 1.6, 'dot', PINK_L),
      }));
    });
    timer(en, 'laser', 1.05, d, () => spawnAimedLaser(game, en, game.player, PINK_D));
  }, 'elite');
}

function chapter_a6_mid_5(g) {
  installMidWave(g, {
    interval: 0.6, maxWaves: 14,
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.12) {
        game.rainT = 0;
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10, vx: 0, vy: 2.2 + Math.random(),
          type: 'dot', color: PINK, from: 'enemy', gravity: 0.006,
        }));
      }
    },
    onWave: (game, wave) => {
      const side = wave % 2 ? 40 : LOGICAL_W - 40;
      const e = mob(side, 60 + (wave % 3) * 50, 35, PINK_L);
      e.script = (en, d, gm) => {
        timer(en, 's', 0.5, d, () => {
          spawnAimed(gm, en, gm.player, { n: 3, parity: 'even', type: 'rice', speed: 2.75, spread: 0.14, color: VIOLET });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

function chapter_a6_mid_6(g) {
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.4) {
      g.laserT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const y = 70 + (g.waveCount * 30) % 400;
      spawnHLaser(g, y, g.waveCount % 2 === 0 ? 1 : -1, VIOLET);
    }
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.18) {
      g.rainT = 0;
      spawnGravityRain(g, 1, 'talisman', PINK, 1.4);
    }
    g.aimT = (g.aimT || 0) + dt;
    if (g.aimT > 0.7) {
      g.aimT = 0;
      spawnAimedLaser(g, { x: LOGICAL_W / 2, y: 30 }, g.player, PINK_D);
    }
  };
}

function chapter_a6_mid_7(g) {
  installMidWave(g, {
    interval: 0.95, maxWaves: 13,
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.28) {
        game.rainT = 0;
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -5, vx: 0, vy: 1.6,
          type: 'rice', color: PINK_L, from: 'enemy', gravity: 0.012, life: 8,
          onSplit: (self) => spawnRingAt(game, self.x, self.y, 6, 1.25, 'dot', PINK),
        }));
      }
    },
    onWave: (game) => {
      const e = elite({ x: 50 + Math.random() * (LOGICAL_W - 100), y: 75, hp: 260, kind: 'generic', color: VIOLET });
      e.vy = 0.25;
      e.script = (en, d, gm) => {
        timer(en, 'aim', 0.6, d, () => {
          spawnAimed(gm, en, gm.player, { n: 4, parity: 'even', type: 'talisman', speed: 2.4, spread: 0.2, color: PINK_D });
        });
        timer(en, 'ring', 1.8, d, () => spawnRingAt(gm, en.x, en.y, 10, 1.5, 'medium', PINK, en.age));
      };
      game.spawnEnemy(e);
    },
  });
}

function chapter_a6_mid_8(g) {
  g.waveFn = (dt) => {
    g.crossT = (g.crossT || 0) + dt;
    if (g.crossT > 1.2) {
      g.crossT = 0;
      spawnCrossFall(g, { type: 'rice', color: VIOLET, speed: 1.8, lanes: 6 });
    }
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.35) {
      g.laserT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const y = (g.waveCount * 36) % 600;
      spawnHLaser(g, y, g.waveCount % 3 === 0 ? 1 : -1, PINK_D);
    }
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.16) {
      g.rainT = 0;
      for (let i = 0; i < 2; i++) {
        g.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -8,
          vx: (Math.random() - 0.5) * 0.6, vy: 1.8 + Math.random(),
          type: 'talisman', color: PINK, from: 'enemy', gravity: 0.01,
        }));
      }
    }
  };
}

function chapter_a6_mid_9(g) {
  installMidWave(g, {
    interval: 0.55, maxWaves: 14,
    continuous: (game, dt) => {
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.55) {
        game.laserT = 0;
        spawnAimedLaser(game, { x: LOGICAL_W / 2, y: 35 }, game.player, VIOLET);
      }
    },
    onWave: (game, wave) => {
      const side = wave % 2 ? -1 : 1;
      const x = LOGICAL_W / 2 + side * 85;
      const e = mob(x, -18, 36, side === -1 ? PINK_D : PINK);
      e.vy = 1.3; e.vx = side * 0.3;
      e.script = (en, d, gm) => {
        timer(en, 's', 0.45, d, () => {
          spawnAimed(gm, en, gm.player, { n: 3, parity: 'even', type: 'rice', speed: 2.8, spread: 0.14, color: en.color });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

function chapter_a6_mid_10(g) {
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.1) {
      g.rainT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const col = [PINK, VIOLET, PINK_L][g.waveCount % 3];
      for (let i = 0; i < 2; i++) {
        g.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10,
          vx: (Math.random() - 0.5) * 0.8, vy: 2.0 + Math.random() * 0.6,
          type: 'talisman', color: col, from: 'enemy', gravity: 0.01,
        }));
      }
    }
    /* H 激光与 aimed 交替，密度接近原双发 */
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.42) {
      g.laserT = 0;
      g._a6Alt = ((g._a6Alt || 0) + 1) % 2;
      if (g._a6Alt === 0) {
        for (const side of [-1, 1]) {
          spawnHLaser(g, 80 + ((g.waveCount || 0) * 35) % 380, side, side === -1 ? PINK_D : VIOLET);
        }
      } else {
        for (const side of [-1, 1]) {
          spawnAimedLaser(g, { x: LOGICAL_W / 2 + side * 70, y: 45 }, g.player, PINK);
        }
      }
    }
  };
}

/* ---------- Boss Letter（强度≈原版，保留 even 缝 / 主题） ---------- */

function chapter_yimeige_1(g) {
  pushBossRef(g, { ...BOSS_A6, y: 95, enterY: 95, hp: 3800 }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.2) * 80;
    timer(en, 's', 0.4, d, () => {
      spawnAimed(game, en, game.player, {
        n: 4, parity: 'even', type: 'medium', speed: 2.4, spread: 0.22, color: PINK,
      });
    });
    timer(en, 'r', 1.5, d, () => {
      spawnRingAt(game, en.x, en.y, 10, 1.8, 'dot', PINK_L, en.age * 0.25);
    });
    timer(en, 'sweet', 1.2, d, () => {
      spawnCrossFall(game, { type: 'talisman', color: PINK_L, speed: 1.5, lanes: 6 });
    });
  });
}

function chapter_yimeige_2(g) {
  pushBossRef(g, { ...BOSS_A6, y: 95, enterY: 95, hp: 3900 }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.4) * 90;
    en.y = 95 + Math.cos(en.age * 0.8) * 20;
    timer(en, 'aim', 0.35, d, () => {
      spawnAimed(game, en, game.player, {
        n: 3, parity: 'odd', type: 'rice', speed: 2.6, color: PINK_D,
      });
    });
    timer(en, 'spin', 0.12, d, () => {
      en.data.a = (en.data.a || 0) + 0.38;
      for (const side of [-1, 1]) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 1.8,
          type: 'talisman', color: PINK, from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.4, d, () => {
      spawnRingAt(game, en.x, en.y, 12, 1.8, 'dot', PINK_L, en.age * 0.6);
    });
  });
}

function chapter_yimeige_3(g) {
  pushBossRef(g, { ...BOSS_A6, y: 95, enterY: 95, hp: 4000 }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.5) * 100;
    timer(en, 'aim', 0.32, d, () => {
      spawnAimed(game, en, game.player, {
        n: 4, parity: 'even', type: 'talisman', speed: 2.75, spread: 0.18, color: VIOLET,
      });
    });
    timer(en, 'laser', 0.55, d, () => spawnAimedLaser(game, en, game.player, PINK_D));
    timer(en, 'ring', 1.25, d, () => {
      spawnRingAt(game, en.x, en.y, 14, 2.0, 'rice', PINK, en.age);
    });
    timer(en, 'drop', 1.7, d, () => {
      spawnGravityRain(game, 1, 'medium', PINK_L, 1.4);
    });
  });
}

function chapter_yimeige_4(g) {
  pushBossRef(g, { ...BOSS_A6, y: 95, enterY: 95, hp: 4100 }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.6) * 110;
    en.y = 95 + Math.cos(en.age * 1.0) * 25;
    timer(en, 'a', 0.28, d, () => {
      spawnAimed(game, en, game.player, {
        n: 3, parity: 'even', type: 'medium', speed: 2.7, spread: 0.24, color: PINK_D,
      });
    });
    timer(en, 'spin', 0.1, d, () => {
      en.data.a = (en.data.a || 0) + 0.45;
      for (const s of [-1, 1]) {
        game.spawnBullet(acquireBullet({
          x: en.x + s * 20, y: en.y, angle: en.data.a * s, speed: 2.2,
          type: 'talisman', color: VIOLET, from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.3, d, () => {
      spawnRingAt(game, en.x, en.y, 16, 2.0, 'dot', PINK, en.age * 0.7);
    });
    timer(en, 'cross', 1.8, d, () => {
      spawnCrossFall(game, { type: 'rice', color: PINK_L, speed: 1.6, lanes: 5 });
    });
  });
}

function chapter_yimeige_5(g) {
  pushBossRef(g, { ...BOSS_A6, y: 95, enterY: 95, hp: 4200 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const peeled = hpRatio < 0.5;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (peeled ? 1.5 : 1.1)) * (peeled ? 85 : 60);
    timer(en, 'aim', 0.35, d, () => {
      spawnAimed(game, en, game.player, {
        n: 5,
        parity: peeled ? 'odd' : 'even',
        type: 'rice',
        speed: 2.8,
        spread: peeled ? 0.15 : 0.24,
        color: PINK_D,
      });
    });
    timer(en, 'ring', 1.0, d, () => {
      spawnRingAt(game, en.x, en.y, 14, 2.0, 'talisman', PINK, en.age);
    });
    timer(en, 'laser', 0.8, d, () => spawnAimedLaser(game, en, game.player, VIOLET));
  });
}

function chapter_yimeige_6(g) {
  pushBossRef(g, { ...BOSS_A6, y: 95, enterY: 95, hp: 4400 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const low = hpRatio < 0.4;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (low ? 2.2 : 1.7)) * (low ? 115 : 100);
    en.y = 95 + Math.cos(en.age * (low ? 1.8 : 1.2)) * (low ? 30 : 22);
    timer(en, 'a', 0.3, d, () => {
      spawnAimed(game, en, game.player, {
        n: low ? 6 : 4,
        parity: low ? 'odd' : 'even',
        type: 'talisman',
        speed: low ? 3.15 : 2.6,
        spread: low ? 0.14 : 0.22,
        color: PINK_D,
      });
    });
    timer(en, 'ring', 0.9, d, () => {
      spawnRingAt(game, en.x, en.y, low ? 18 : 14, low ? 2.35 : 2.0, 'rice', PINK, en.age);
    });
    timer(en, 'laser', low ? 0.45 : 0.6, d, () => spawnAimedLaser(game, en, game.player, VIOLET));
    if (low) {
      timer(en, 'rain', 0.35, d, () => spawnGravityRain(game, 2, 'dot', PINK_L, 1.8));
    }
  });
}

function chapter_yimeige_7(g) {
  pushBossRef(g, { ...BOSS_A6, y: 95, enterY: 95, hp: 4600 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const fast = hpRatio < 0.35;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (fast ? 2.8 : 2.0)) * (fast ? 125 : 110);
    en.y = 95 + Math.cos(en.age * (fast ? 2.2 : 1.5)) * (fast ? 32 : 25);
    timer(en, 'aim', fast ? 0.24 : 0.35, d, () => {
      spawnAimed(game, en, game.player, {
        n: fast ? 6 : 5, parity: 'even', type: 'rice',
        speed: fast ? 3.3 : 2.8, spread: 0.18, color: PINK_D,
      });
    });
    timer(en, 'spin', fast ? 0.09 : 0.13, d, () => {
      en.data.a = (en.data.a || 0) + (fast ? 0.52 : 0.4);
      const arms = fast ? 3 : 2;
      for (let i = 0; i < arms; i++) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y,
          angle: en.data.a + (i * Math.PI * 2) / arms,
          speed: fast ? 2.4 : 1.85,
          type: 'talisman', color: PINK, from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', fast ? 0.85 : 1.2, d, () => {
      spawnRingAt(game, en.x, en.y, fast ? 18 : 16, fast ? 2.35 : 2.0, 'medium', VIOLET, en.age);
    });
    timer(en, 'laser', fast ? 0.42 : 0.6, d, () => spawnAimedLaser(game, en, game.player, PINK_L));
  });
}

function chapter_yimeige_8(g) {
  pushBossRef(g, { ...BOSS_A6, y: 100, enterY: 100, hp: 5500 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.3;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.4) * 75;
    timer(en, 'chaos', frenzy ? 0.08 : 0.16, d, () => {
      game.spawnBullet(acquireBullet({
        x: en.x, y: en.y,
        angle: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * (frenzy ? 2.8 : 2.0),
        type: ['dot', 'rice', 'talisman', 'medium'][Math.floor(Math.random() * 4)],
        color: Math.random() < 0.5 ? PINK : AMBER,
        from: 'enemy',
      }));
    });
    timer(en, 'aim', frenzy ? 0.4 : 0.6, d, () => {
      spawnAimed(game, en, game.player, {
        n: frenzy ? 9 : 7, parity: 'odd', type: 'rice',
        speed: frenzy ? 3.4 : 3.0, color: PINK_D,
      });
    });
    timer(en, 'ring', frenzy ? 0.75 : 1.2, d, () => {
      spawnRingAt(game, en.x, en.y, frenzy ? 22 : 18, frenzy ? 2.5 : 2.0, 'talisman', PINK_L, en.age);
    });
    if (frenzy) {
      timer(en, 'laser', 0.42, d, () => spawnAimedLaser(game, en, game.player, PINK));
    }
  });
}

function chapter_yimeige_last(g) {
  pushBossRef(g, { ...BOSS_A6, y: 100, enterY: 100, hp: 6500 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.2;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (frenzy ? 3.4 : 2.5)) * (frenzy ? 135 : 120);
    en.y = 100 + Math.cos(en.age * (frenzy ? 2.7 : 1.8)) * (frenzy ? 38 : 30);
    timer(en, 'storm', frenzy ? 0.055 : 0.1, d, () => {
      const n = frenzy ? 4 : 2;
      for (let i = 0; i < n; i++) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y,
          angle: Math.random() * Math.PI * 2,
          speed: 2.0 + Math.random() * (frenzy ? 3.2 : 2.5),
          type: Math.random() < 0.3 ? 'large' : ['dot', 'rice', 'talisman'][Math.floor(Math.random() * 3)],
          color: [PINK, PINK_D, AMBER][Math.floor(Math.random() * 3)],
          from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', frenzy ? 0.28 : 0.4, d, () => {
      spawnAimed(game, en, game.player, {
        n: frenzy ? 9 : 7, parity: 'odd', type: 'rice',
        speed: frenzy ? 3.8 : 3.4, color: PINK_D,
      });
    });
    timer(en, 'ring', frenzy ? 0.65 : 1.0, d, () => {
      spawnRingAt(game, en.x, en.y, frenzy ? 26 : 22, frenzy ? 2.85 : 2.4, 'talisman', PINK, en.age);
    });
    if (frenzy) {
      timer(en, 'laser', 0.32, d, () => {
        for (const side of [-1, 1]) {
          spawnAimedLaser(game, { x: en.x + side * 45, y: en.y }, game.player, PINK_L);
        }
      });
      timer(en, 'rain', 0.22, d, () => spawnGravityRain(game, 3, 'medium', VIOLET, 2.2));
    }
  });
}

const FACE = faceDefaults('A6');

export const chapters = [
  midChapter(FACE, {
    id: 57,
    name: 'A6-1 乐园入口',
    kind: 'mid',
    unstable: true,
    duration: 24,
    build: chapter_a6_mid_1,
  }),
  midChapter(FACE, {
    id: 58,
    name: 'A6-2 Unstable 糖衣炮弹',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_a6_mid_2,
  }),
  midChapter(FACE, {
    id: 59,
    name: 'A6-3 甜腻迷雾',
    kind: 'mid',
    unstable: true,
    duration: 24,
    build: chapter_a6_mid_3,
  }),
  midChapter(FACE, {
    id: 60,
    name: 'A6-4 虚假善意',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_a6_mid_4,
  }),
  midChapter(FACE, {
    id: 61,
    name: 'A6-5 乐园守护者',
    kind: 'midboss',
    duration: 34,
    build: chapter_a6_midboss,
  }),
  midChapter(FACE, {
    id: 62,
    name: 'A6-6 甜蜜陷阱',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_a6_mid_5,
  }),
  midChapter(FACE, {
    id: 63,
    name: 'A6-7 乐园暗流',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_a6_mid_6,
  }),
  midChapter(FACE, {
    id: 64,
    name: 'A6-8 剧情裂痕',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_a6_mid_7,
  }),
  midChapter(FACE, {
    id: 65,
    name: 'A6-9 乐园崩坏前兆',
    kind: 'mid',
    unstable: true,
    duration: 30,
    build: chapter_a6_mid_8,
  }),
  midChapter(FACE, {
    id: 66,
    name: 'A6-10 真相浮现',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_a6_mid_9,
  }),
  midChapter(FACE, {
    id: 67,
    name: 'A6-11 最终层切入',
    kind: 'mid',
    unstable: true,
    duration: 30,
    build: chapter_a6_mid_10,
  }),
  letterChapter(FACE, {
    id: 68,
    name: '一美个「哈机密·甜蜜陷阱」',
    dialogue: 'a6',
    letter: '哈机密 · 甜蜜陷阱',
    letterTime: 42,
    build: chapter_yimeige_1,
  }),
  letterChapter(FACE, {
    id: 69,
    name: '一美个「哈机密·糖衣外交」',
    letter: '哈机密 · 糖衣外交',
    letterTime: 42,
    build: chapter_yimeige_2,
  }),
  letterChapter(FACE, {
    id: 70,
    name: '一美个「哈机密·言论审查」',
    letter: '哈机密 · 言论审查',
    letterTime: 44,
    build: chapter_yimeige_3,
  }),
  letterChapter(FACE, {
    id: 71,
    name: '一美个「哈机密·数据篡改」',
    letter: '哈机密 · 数据篡改',
    letterTime: 44,
    build: chapter_yimeige_4,
  }),
  letterChapter(FACE, {
    id: 72,
    name: '一美个「哈机密·伪装剥离」',
    letter: '哈机密 · 伪装剥离',
    letterTime: 46,
    build: chapter_yimeige_5,
  }),
  letterChapter(FACE, {
    id: 73,
    name: '一美个「哈机密·苦口婆心」',
    letter: '哈机密 · 苦口婆心',
    letterTime: 46,
    build: chapter_yimeige_6,
  }),
  letterChapter(FACE, {
    id: 74,
    name: '一美个「哈机密·层层剥落」',
    letter: '哈机密 · 层层剥落',
    letterTime: 48,
    build: chapter_yimeige_7,
  }),
  letterChapter(FACE, {
    id: 75,
    name: '一美个「哈机密乐园·全面崩坏」',
    dialogue: 'a6_last',
    letter: '哈机密乐园 · 全面崩坏',
    letterTime: 50,
    build: chapter_yimeige_8,
  }),
  letterChapter(FACE, {
    id: 76,
    name: '一美个「哈机密乐园·回收站清空」',
    letter: '回收站清空 · 最终抹消',
    letterTime: 55,
    ending: 'A',
    build: chapter_yimeige_last,
  }),
]

export const stageSelectEntry = { id: 'A6', label: 'A线6面', desc: '一美个 — 哈机密乐园崩坏', startChapter: 57 };
