/**
 * B4 道中 / midboss（E06b 从 b4_duren.js 拆出，数值不变）
 */
import {
  mob, elite, timer, installMidWave, pushBossRef,
} from '../_shared.js';
import { LOGICAL_W } from '../../config.js';
import {
  spawnAimed, spawnRingAt, spawnHLaser, spawnGravityRain, spawnAimedLaser, spawnCrossFall,
} from '../../patterns.js';
import { acquireBullet } from '../../bulletPool.js';



export function chapter_b4_mid_1(g) {
  installMidWave(g, {
    interval: 0.7,
    maxWaves: 13,
    onWave: (game, wave) => {
      const e = mob(30 + Math.random() * (LOGICAL_W - 60), -10, 32, '#fb7185');
      e.vy = 1.3;
      e.vx = (wave % 2 ? 0.8 : -0.8);
      e.script = (en, d, gm) => {
        timer(en, 's', 0.55, d, () => {
          spawnAimed(gm, en, gm.player, { n: 1, parity: 'odd', type: 'dot', speed: 2.5, color: '#fb7185' });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_b4_mid_2(g) {
  installMidWave(g, {
    interval: 0.5,
    maxWaves: 14,
    onWave: (game) => {
      const e = mob(40 + Math.random() * (LOGICAL_W - 80), -20, 38, '#f43f5e');
      e.vy = 1.0;
      e.vx = (Math.random() - 0.5) * 1.5;
      e.script = (en, d, gm) => {
        timer(en, 'ring', 1.5, d, () => {
          spawnRingAt(gm, en.x, en.y, 10, 1.8, 'talisman', '#fb7185', en.age);
        });
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_b4_mid_3(g) {
  installMidWave(g, {
    interval: 0.65,
    maxWaves: 13,
    onWave: (game) => {
      for (const side of [-1, 1]) {
        const x = LOGICAL_W / 2 + side * 80;
        const e = mob(x, -18, 35, side === -1 ? '#fb7185' : '#f43f5e');
        e.vy = 1.2;
        e.script = (en, d, gm) => {
          timer(en, 's', 0.6, d, () => {
            spawnAimed(gm, en, gm.player, { n: 2, parity: 'even', type: 'rice', speed: 2.4, spread: 0.2, color: en.color });
          });
        };
        game.spawnEnemy(e);
      }
    },
  });
}

export function chapter_b4_midboss(g) {
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 1900, kind: 'duren', color: '#fb7185', color2: '#fda4af',
    label: '创车精英', enterY: 100,
  }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 2.5) * 130;
    timer(en, 'aim', 0.7, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'even', type: 'talisman', speed: 2.8, color: '#f43f5e' });
    });
    timer(en, 'ring', 1.4, d, () => {
      spawnRingAt(game, en.x, en.y, 14, 1.6, 'dot', '#fda4af', en.age);
    });
    timer(en, 'spin', 0.15, d, () => {
      en.data.a = (en.data.a || 0) + 0.5;
      game.spawnBullet(acquireBullet({
        x: en.x, y: en.y, angle: en.data.a, speed: 2.2, type: 'rice', color: '#e11d48', from: 'enemy',
      }));
      game.spawnBullet(acquireBullet({
        x: en.x, y: en.y, angle: en.data.a + Math.PI, speed: 2.2, type: 'rice', color: '#f43f5e', from: 'enemy',
      }));
    });
  }, 'elite');
}

export function chapter_b4_mid_4(g) {
  // 纯辅压：雨 + 狙激光
  installMidWave(g, {
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.14) {
        game.rainT = 0;
        game.waveCount = (game.waveCount || 0) + 1;
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10,
          vx: (Math.random() - 0.5) * 1.2, vy: 1.6 + Math.random(),
          type: 'rice', color: '#fda4af', from: 'enemy', gravity: 0.01,
        }));
      }
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.6) {
        game.laserT = 0;
        spawnAimedLaser(game, { x: LOGICAL_W / 2, y: 30 }, game.player, '#f43f5e');
      }
    },
  });
}

export function chapter_b4_mid_5(g) {
  installMidWave(g, {
    interval: 0.8,
    maxWaves: 13,
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.2) {
        game.rainT = 0;
        spawnGravityRain(game, 1, 'rice', '#fb7185', 1.3);
      }
    },
    onWave: (game) => {
      const e = elite({
        x: 40 + Math.random() * (LOGICAL_W - 80), y: 70, hp: 240, kind: 'generic', color: '#fb7185',
      });
      e.vy = 0.35;
      e.vx = (Math.random() - 0.5) * 1.0;
      e.script = (en, d, gm) => {
        timer(en, 'aim', 0.55, d, () => {
          spawnAimed(gm, en, gm.player, { n: 3, parity: 'odd', type: 'talisman', speed: 2.6, spread: 0.16, color: '#f43f5e' });
        });
        timer(en, 'ring', 1.6, d, () => spawnRingAt(gm, en.x, en.y, 8, 1.5, 'dot', '#fda4af', en.age));
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_b4_mid_6(g) {
  // 纯辅压：横扫 + 双符雨 + 十字落
  installMidWave(g, {
    continuous: (game, dt) => {
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.45) {
        game.laserT = 0;
        game.waveCount = (game.waveCount || 0) + 1;
        const y = 70 + (game.waveCount * 30) % 400;
        spawnHLaser(game, y, game.waveCount % 2 ? 1 : -1, '#f43f5e');
      }
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.12) {
        game.rainT = 0;
        for (let i = 0; i < 2; i++) {
          game.spawnBullet(acquireBullet({
            x: Math.random() * LOGICAL_W, y: -5, vx: (Math.random() - 0.5) * 0.7, vy: 1.8 + Math.random() * 0.5,
            type: 'talisman', color: '#fda4af', from: 'enemy', gravity: 0.01,
          }));
        }
      }
      game.crossT = (game.crossT || 0) + dt;
      if (game.crossT > 1.5) {
        game.crossT = 0;
        spawnCrossFall(game, { type: 'dot', color: '#fb7185', speed: 1.6, columns: 5 });
      }
    },
  });
}

