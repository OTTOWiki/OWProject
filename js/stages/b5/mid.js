/**
 * B5 道中 / midboss（E06b 从 b5_gundian.js 拆出，数值不变）
 */
import {
  mob, elite, timer, installMidWave, pushBossRef,
} from '../_shared.js';
import { LOGICAL_W } from '../../config.js';
import {
  spawnAimed, spawnRingAt, spawnHLaser, spawnGravityRain, spawnAimedLaser, spawnCrossFall,
} from '../../patterns.js';
import { acquireBullet } from '../../bulletPool.js';



export function chapter_b5_mid_1(g) {
  installMidWave(g, {
    interval: 0.8,
    maxWaves: 12,
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.5) {
        game.rainT = 0;
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -5, vx: 0, vy: 2.0,
          type: 'rice', color: '#fdba74', from: 'enemy', gravity: 0.015,
        }));
      }
    },
    onWave: (game, wave) => {
      const x = 40 + (wave * 35) % (LOGICAL_W - 80);
      const e = mob(x, -20, 32, '#fb923c');
      e.vy = 0.8 + (wave % 3) * 0.3;
      e.script = (en, d, gm) => {
        timer(en, 's', 0.7, d, () => {
          spawnAimed(gm, en, gm.player, { n: 1, parity: 'odd', type: 'dot', speed: 2.6, color: '#fb923c' });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_b5_mid_2(g) {
  installMidWave(g, {
    interval: 0.55,
    maxWaves: 14,
    onWave: (game, wave) => {
      const e = mob(50 + Math.random() * (LOGICAL_W - 100), -20, 36, '#f97316');
      e.vy = 1.0;
      e.script = (en, d, gm) => {
        timer(en, 's', 0.6, d, () => {
          spawnAimed(gm, en, gm.player, { n: 2, parity: 'even', type: 'talisman', speed: 2.5, color: '#fb923c' });
        });
        timer(en, 'ring', 1.6, d, () => {
          spawnRingAt(gm, en.x, en.y, 8, 1.4, 'dot', '#fdba74', wave * 0.5);
        });
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_b5_mid_3(g) {
  installMidWave(g, {
    interval: 0.65,
    maxWaves: 13,
    continuous: (game, dt) => {
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.7) {
        game.laserT = 0;
        spawnAimedLaser(game, { x: LOGICAL_W / 2, y: 30 }, game.player, '#fb923c');
      }
    },
    onWave: (game, wave) => {
      const side = wave % 2 ? 38 : LOGICAL_W - 38;
      const e = mob(side, 50 + (wave % 3) * 40, 34, '#f97316');
      e.script = (en, d, gm) => {
        timer(en, 's', 0.55, d, () => {
          spawnAimed(gm, en, gm.player, { n: 2, parity: 'even', type: 'rice', speed: 2.5, spread: 0.2, color: '#fdba74' });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_b5_mid_4(g) {
  installMidWave(g, {
    interval: 0.7,
    maxWaves: 14,
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.3) {
        game.rainT = 0;
        spawnGravityRain(game, 1, 'rice', '#fdba74', 1.4);
      }
    },
    onWave: (game) => {
      const e = elite({
        x: 50 + Math.random() * (LOGICAL_W - 100), y: 75, hp: 230, kind: 'generic', color: '#f97316',
      });
      e.vy = 0.3;
      e.script = (en, d, gm) => {
        timer(en, 'aim', 0.6, d, () => {
          spawnAimed(gm, en, gm.player, { n: 3, parity: 'even', type: 'talisman', speed: 2.6, spread: 0.18, color: '#fdba74' });
        });
        timer(en, 'ring', 1.6, d, () => spawnRingAt(gm, en.x, en.y, 8, 1.5, 'dot', '#fb923c', en.age));
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_b5_midboss(g) {
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 2000, kind: 'gundian', color: '#fb923c', color2: '#fdba74',
    label: '中单影卫', enterY: 100,
  }, (en, d, game) => {
    timer(en, 'ring', 1.4, d, () => {
      spawnRingAt(game, en.x, en.y, 12, 1.8, 'talisman', '#fb923c', en.age);
    });
    timer(en, 'side', 0.5, d, () => {
      const side = en.data.side ? -1 : 1;
      en.data.side = !en.data.side;
      spawnAimed(game, { x: en.x + side * 40, y: en.y }, game.player, { n: 2, parity: 'even', type: 'rice', speed: 2.8, color: '#f97316' });
    });
    timer(en, 'laser', 0.8, d, () => spawnAimedLaser(game, en, game.player, '#fdba74'));
    timer(en, 'big', 2.0, d, () => {
      game.spawnBullet(acquireBullet({
        x: en.x + (Math.random() - 0.5) * 70, y: en.y, vx: 0, vy: 1.0,
        type: 'large', color: '#fb923c', from: 'enemy', gravity: 0.005, life: 6,
        onSplit: (self) => spawnRingAt(game, self.x, self.y, 6, 1.4, 'dot', '#fdba74'),
      }));
    });
  }, 'elite');
}

export function chapter_b5_mid_5(g) {
  installMidWave(g, {
    interval: 0.85,
    maxWaves: 16,
    onWave: (game, wave) => {
      const side = wave % 2 ? 1 : -1;
      const y = 60 + (wave * 23) % 380;
      const e = mob(side > 0 ? -20 : LOGICAL_W + 20, y, 30, side > 0 ? '#fb923c' : '#fdba74');
      e.hp = 30;
      e.vx = -side * 2.2;
      e.vy = Math.sin(wave * 1.3) * 0.6;
      e.script = (en, d, gm) => {
        timer(en, 'aim', 0.35, d, () => {
          spawnAimed(gm, en, gm.player, { n: 2, parity: 'even', type: 'rice', speed: 2.4, spread: 0.15, color: '#f97316' });
        });
        timer(en, 'ring', 0.7, d, () => {
          spawnRingAt(gm, en.x, en.y, { n: 8, speed: 1.6 + Math.random() * 0.4, color: '#fdba74', type: 'dot' });
        });
        timer(en, 'reverse', 1.2, d, () => {
          en.vx = -en.vx;
        });
      };
      game.spawnEnemy(e);
      if (wave % 2 === 0) {
        const filler = mob(side > 0 ? -20 : LOGICAL_W + 20, 60 + Math.random() * 380, 15, '#fda4af');
        filler.hp = 12;
        filler.vx = -side * 3.0;
        filler.script = (en, d2, gm) => {
          timer(en, 'f', 0.5, d2, () => {
            spawnAimed(gm, en, gm.player, { n: 2, type: 'talisman', speed: 2.8, color: '#fda4af' });
          });
        };
        game.spawnEnemy(filler);
      }
    },
  });
}

export function chapter_b5_mid_6(g) {
  installMidWave(g, {
    interval: 0.7,
    maxWaves: 13,
    continuous: (game, dt) => {
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.6) {
        game.laserT = 0;
        spawnHLaser(game, 80 + ((game.waveCount || 0) * 35) % 380, (game.waveCount || 0) % 3 === 0 ? 1 : -1, '#f97316');
      }
    },
    onWave: (game) => {
      for (const side of [-1, 1]) {
        const x = LOGICAL_W / 2 + side * 80;
        const e = mob(x, -15, 36, side === -1 ? '#fb923c' : '#fdba74');
        e.vy = 1.2;
        e.script = (en, d, gm) => {
          timer(en, 's', 0.5, d, () => {
            spawnAimed(gm, en, gm.player, { n: 2, parity: 'even', type: 'rice', speed: 2.6, spread: 0.2, color: en.color });
          });
        };
        game.spawnEnemy(e);
      }
    },
  });
}

export function chapter_b5_mid_7(g) {
  // 纯辅压：三色符雨 + 十字落
  installMidWave(g, {
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.12) {
        game.rainT = 0;
        game.waveCount = (game.waveCount || 0) + 1;
        const col = ['#fb923c', '#f97316', '#fdba74'][game.waveCount % 3];
        for (let i = 0; i < 2; i++) {
          game.spawnBullet(acquireBullet({
            x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 0.7, vy: 1.8 + Math.random() * 0.5,
            type: 'talisman', color: col, from: 'enemy', gravity: 0.012,
          }));
        }
      }
      game.crossT = (game.crossT || 0) + dt;
      if (game.crossT > 1.4) {
        game.crossT = 0;
        spawnCrossFall(game, { type: 'dot', color: '#fb923c', speed: 1.5, columns: 6 });
      }
    },
  });
}

export function chapter_b5_mid_8(g) {
  // 纯辅压：横扫 + 双符雨 + 双侧狙激光
  installMidWave(g, {
    continuous: (game, dt) => {
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.4) {
        game.laserT = 0;
        game.waveCount = (game.waveCount || 0) + 1;
        const y = 70 + (game.waveCount * 30) % 400;
        spawnHLaser(game, y, game.waveCount % 3 === 0 ? 1 : -1, '#f97316');
      }
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.1) {
        game.rainT = 0;
        for (let i = 0; i < 2; i++) {
          game.spawnBullet(acquireBullet({
            x: Math.random() * LOGICAL_W, y: -8, vx: (Math.random() - 0.5) * 0.8, vy: 2.0 + Math.random() * 0.6,
            type: 'rice', color: '#fdba74', from: 'enemy', gravity: 0.01,
          }));
        }
      }
      game.aimT = (game.aimT || 0) + dt;
      if (game.aimT > 0.55) {
        game.aimT = 0;
        for (const side of [-1, 1]) {
          spawnAimedLaser(game, { x: LOGICAL_W / 2 + side * 70, y: 40 }, game.player, '#fb923c', 45);
        }
      }
    },
  });
}

