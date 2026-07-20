/**
 * A6 道中 / midboss（E06b 从 a6_yimeige.js 拆出，数值不变）
 */
import {
  mob, elite, timer, installMidWave, pushBossRef,
} from '../_shared.js';
import { LOGICAL_W } from '../../config.js';
import {
  spawnAimed, spawnRingAt, spawnHLaser, spawnGravityRain, spawnAimedLaser, spawnCrossFall,
} from '../../patterns.js';
import { acquireBullet } from '../../bulletPool.js';

const PINK = '#e879f9';
const PINK_L = '#f0abfc';
const PINK_D = '#d946ef';
const VIOLET = '#c084fc';


/* ---------- 道中 ---------- */


export function chapter_a6_mid_1(g) {
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

export function chapter_a6_mid_2(g) {
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

export function chapter_a6_mid_3(g) {
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

export function chapter_a6_mid_4(g) {
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

export function chapter_a6_midboss(g) {
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

export function chapter_a6_mid_5(g) {
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

export function chapter_a6_mid_6(g) {
  // 纯辅压：横扫 + 重力雨 + 狙激光
  installMidWave(g, {
    continuous: (game, dt) => {
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.4) {
        game.laserT = 0;
        game.waveCount = (game.waveCount || 0) + 1;
        const y = 70 + (game.waveCount * 30) % 400;
        spawnHLaser(game, y, game.waveCount % 2 === 0 ? 1 : -1, VIOLET);
      }
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.18) {
        game.rainT = 0;
        spawnGravityRain(game, 1, 'talisman', PINK, 1.4);
      }
      game.aimT = (game.aimT || 0) + dt;
      if (game.aimT > 0.7) {
        game.aimT = 0;
        spawnAimedLaser(game, { x: LOGICAL_W / 2, y: 30 }, game.player, PINK_D);
      }
    },
  });
}

export function chapter_a6_mid_7(g) {
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

export function chapter_a6_mid_8(g) {
  // 纯辅压：十字落 + 横扫 + 双符雨
  installMidWave(g, {
    continuous: (game, dt) => {
      game.crossT = (game.crossT || 0) + dt;
      if (game.crossT > 1.2) {
        game.crossT = 0;
        spawnCrossFall(game, { type: 'rice', color: VIOLET, speed: 1.8, columns: 6 });
      }
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.35) {
        game.laserT = 0;
        game.waveCount = (game.waveCount || 0) + 1;
        const y = (game.waveCount * 36) % 600;
        spawnHLaser(game, y, game.waveCount % 3 === 0 ? 1 : -1, PINK_D);
      }
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.16) {
        game.rainT = 0;
        for (let i = 0; i < 2; i++) {
          game.spawnBullet(acquireBullet({
            x: Math.random() * LOGICAL_W, y: -8,
            vx: (Math.random() - 0.5) * 0.6, vy: 1.8 + Math.random(),
            type: 'talisman', color: PINK, from: 'enemy', gravity: 0.01,
          }));
        }
      }
    },
  });
}

export function chapter_a6_mid_9(g) {
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

export function chapter_a6_mid_10(g) {
  // 纯辅压：三色符雨 + H/狙激光交替
  installMidWave(g, {
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.1) {
        game.rainT = 0;
        game.waveCount = (game.waveCount || 0) + 1;
        const col = [PINK, VIOLET, PINK_L][game.waveCount % 3];
        for (let i = 0; i < 2; i++) {
          game.spawnBullet(acquireBullet({
            x: Math.random() * LOGICAL_W, y: -10,
            vx: (Math.random() - 0.5) * 0.8, vy: 2.0 + Math.random() * 0.6,
            type: 'talisman', color: col, from: 'enemy', gravity: 0.01,
          }));
        }
      }
      /* H 激光与 aimed 交替，密度接近原双发 */
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.42) {
        game.laserT = 0;
        game._a6Alt = ((game._a6Alt || 0) + 1) % 2;
        if (game._a6Alt === 0) {
          for (const side of [-1, 1]) {
            spawnHLaser(game, 80 + ((game.waveCount || 0) * 35) % 380, side, side === -1 ? PINK_D : VIOLET);
          }
        } else {
          for (const side of [-1, 1]) {
            spawnAimedLaser(game, { x: LOGICAL_W / 2 + side * 70, y: 45 }, game.player, PINK);
          }
        }
      }
    },
  });
}

/* ---------- Boss Letter（强度≈原版，保留 even 缝 / 主题） ---------- */

