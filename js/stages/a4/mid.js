/**
 * A4 道中 / midboss（E06b 从 a4_menbailiang.js 拆出，数值不变）
 */
import {
  mob, elite, timer, installMidWave, pushBossRef,
} from '../_shared.js';
import { LOGICAL_W } from '../../config.js';
import {
  spawnAimed, spawnRingAt, spawnHLaser, spawnGravityRain, spawnAimedLaser, spawnCrossFall,
} from '../../patterns.js';
import { acquireBullet } from '../../bulletPool.js';



export function chapter_a4_mid_1(g) {
  installMidWave(g, {
    interval: 0.7,
    maxWaves: 13,
    onWave: (game) => {
      const e = mob(40 + Math.random() * (LOGICAL_W - 80), -20, 35, '#fbbf24');
      e.vy = 1.1;
      e.script = (en, d, gm) => {
        timer(en, 's', 0.75, d, () => {
          spawnAimed(gm, en, gm.player, { n: 2, parity: 'odd', type: 'dot', speed: 2.3, color: '#fbbf24' });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_a4_mid_2(g) {
  installMidWave(g, {
    interval: 0.55,
    maxWaves: 14,
    onWave: (game) => {
      const e = mob(30 + Math.random() * (LOGICAL_W - 60), -20, 38, '#fcd34d');
      e.vy = 1.0;
      e.script = (en, d, gm) => {
        timer(en, 's', 0.6, d, () => {
          spawnAimed(gm, en, gm.player, { n: 3, parity: 'even', type: 'rice', speed: 2.5, spread: 0.18, color: '#fde68a' });
        });
        timer(en, 'ring', 1.8, d, () => {
          spawnRingAt(gm, en.x, en.y, 8, 1.5, 'talisman', '#fbbf24');
        });
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_a4_mid_3(g) {
  installMidWave(g, {
    interval: 0.65,
    maxWaves: 13,
    onWave: (game) => {
      for (const side of [-1, 1]) {
        const x = LOGICAL_W / 2 + side * 90;
        const e = mob(x, -15, 34, side === -1 ? '#f59e0b' : '#fbbf24');
        e.vy = 1.3;
        e.script = (en, d, gm) => {
          timer(en, 's', 0.7, d, () => {
            spawnAimed(gm, en, gm.player, { n: 2, parity: 'even', type: 'dot', speed: 2.6, spread: 0.26, color: en.color });
          });
        };
        game.spawnEnemy(e);
      }
    },
  });
}

export function chapter_a4_midboss(g) {
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 1900, kind: 'menbailiang', color: '#fbbf24', color2: '#fde68a',
    label: '客服部精英', enterY: 100,
  }, (en, d, game) => {
    timer(en, 'aim', 0.8, d, () => {
      spawnAimed(game, en, game.player, { n: 5, parity: 'odd', type: 'talisman', speed: 2.4, spread: 0.16, color: '#fbbf24' });
    });
    timer(en, 'ring', 1.4, d, () => {
      spawnRingAt(game, en.x, en.y, 12, 1.8, 'medium', '#fcd34d', en.age);
    });
    timer(en, 'big', 1.8, d, () => {
      game.spawnBullet(acquireBullet({
        x: en.x + (Math.random() - 0.5) * 60, y: en.y, vx: 0, vy: 1.3,
        type: 'large', color: '#f59e0b', from: 'enemy', gravity: 0.008, life: 6,
        onSplit: (self) => spawnRingAt(game, self.x, self.y, 8, 1.6, 'dot', '#fde68a'),
      }));
    });
  }, 'elite');
}

export function chapter_a4_mid_4(g) {
  // 纯辅压（激光墙 + 变周期雨），无刷怪波；waveCount 仅作图案相位
  installMidWave(g, {
    continuous: (game, dt) => {
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.45) {
        game.laserT = 0;
        game.waveCount = (game.waveCount || 0) + 1;
        const y = 70 + (game.waveCount * 32) % 400;
        spawnHLaser(game, y, game.waveCount % 2 === 0 ? 1 : -1, '#fbbf24');
      }
      game.rainT = (game.rainT || 0) + dt;
      game.rainPhase = (game.rainPhase || 0) + dt;
      const interval = 0.135 + 0.045 * Math.sin(game.rainPhase * 1.5);
      if (game.rainT > interval) {
        game.rainT = 0;
        for (let i = 0; i < 2; i++) {
          game.spawnBullet(acquireBullet({
            x: Math.random() * LOGICAL_W, y: -10,
            vx: (Math.random() - 0.5) * 0.3, vy: 1.6 + Math.random(),
            type: 'rice', color: '#fde68a', from: 'enemy', gravity: 0.012,
          }));
        }
      }
    },
  });
}

export function chapter_a4_mid_5(g) {
  installMidWave(g, {
    interval: 0.9,
    maxWaves: 12,
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.25) {
        game.rainT = 0;
        spawnGravityRain(game, 1, 'rice', '#fde68a', 1.4);
      }
    },
    onWave: (game) => {
      const e = elite({
        x: 50 + Math.random() * (LOGICAL_W - 100), y: 70, hp: 240, kind: 'generic', color: '#fcd34d',
      });
      e.vy = 0.3;
      e.script = (en, d, gm) => {
        timer(en, 'aim', 0.8, d, () => {
          spawnAimed(gm, en, gm.player, { n: 3, parity: 'even', type: 'medium', speed: 2.2, spread: 0.24, color: '#f59e0b' });
        });
        timer(en, 'ring', 1.6, d, () => {
          spawnRingAt(gm, en.x, en.y, 10, 1.6, 'talisman', '#fbbf24', en.age);
        });
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_a4_mid_6(g) {
  // 纯辅压：雨 + 狙激光 + 十字落；waveCount 仅相位
  installMidWave(g, {
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.14) {
        game.rainT = 0;
        game.waveCount = (game.waveCount || 0) + 1;
        for (let i = 0; i < 2; i++) {
          game.spawnBullet(acquireBullet({
            x: Math.random() * LOGICAL_W, y: -5,
            vx: (Math.random() - 0.5) * 0.6, vy: 1.8 + Math.random() * 0.5,
            type: 'talisman', color: '#fde68a', from: 'enemy', gravity: 0.01,
          }));
        }
      }
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.5) {
        game.laserT = 0;
        const dummy = { x: LOGICAL_W / 2, y: 30 };
        spawnAimedLaser(game, dummy, game.player, '#fbbf24', 58, 4.5);
      }
      game.crossT = (game.crossT || 0) + dt;
      if (game.crossT > 1.4) {
        game.crossT = 0;
        spawnCrossFall(game, { type: 'dot', color: '#fcd34d', speed: 1.6, columns: 6 });
      }
    },
  });
}

