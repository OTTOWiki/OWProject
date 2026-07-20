/**
 * A5 道中 / midboss（E06b 从 a5_rival.js 拆出，数值不变）
 */
import {
  mob, elite, timer, installMidWave, pushBossRef,
} from '../_shared.js';
import { LOGICAL_W } from '../../config.js';
import {
  spawnAimed, spawnRingAt, spawnHLaser, spawnAimedLaser, spawnCrossFall,
} from '../../patterns.js';
import { acquireBullet } from '../../bulletPool.js';

export function chapter_a5_mid_1(g) {
  installMidWave(g, {
    interval: 1.0,
    maxWaves: 11,
    onWave: (game, wave) => {
      const side = wave % 2 ? 50 : LOGICAL_W - 50;
      const color = wave % 2 ? '#7dd3fc' : '#f9a8d4';
      const e = elite({ x: side, y: 70, hp: 200, color, kind: 'generic' });
      e.vy = 0.4;
      e.script = (en, d, gm) => {
        timer(en, 's', 0.9, d, () => {
          spawnAimed(gm, en, gm.player, { n: 2, parity: 'even', type: 'dot', speed: 2.4, spread: 0.25, color: en.color });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_a5_mid_2(g) {
  installMidWave(g, {
    interval: 0.6,
    maxWaves: 14,
    onWave: (game) => {
      for (const side of [-1, 1]) {
        const x = LOGICAL_W / 2 + side * 80;
        const color = side === -1 ? '#7dd3fc' : '#f9a8d4';
        const e = mob(x, -20, 35, color);
        e.vy = 1.2;
        e.script = (en, d, gm) => {
          timer(en, 's', 0.5, d, () => {
            spawnAimed(gm, en, gm.player, { n: 3, parity: 'even', type: 'rice', speed: 2.6, spread: 0.14, color: en.color });
          });
        };
        game.spawnEnemy(e);
      }
    },
  });
}

export function chapter_a5_mid_3(g) {
  installMidWave(g, {
    interval: 0.7,
    maxWaves: 13,
    onWave: (game, wave) => {
      const x = 40 + (wave * 35) % (LOGICAL_W - 80);
      const col = wave % 3 === 0 ? '#c4b5fd' : (wave % 2 ? '#7dd3fc' : '#f9a8d4');
      const e = mob(x, -20, 36, col);
      e.vy = 1.0;
      e.script = (en, d, gm) => {
        timer(en, 's', 0.65, d, () => {
          spawnAimed(gm, en, gm.player, { n: 2, parity: 'odd', type: 'talisman', speed: 2.5, color: col });
        });
        if (wave % 3 === 0) {
          timer(en, 'ring', 1.5, d, () => spawnRingAt(gm, en.x, en.y, 6, 1.4, 'dot', '#c4b5fd'));
        }
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_a5_mid_4(g) {
  installMidWave(g, {
    interval: 0.65,
    maxWaves: 14,
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.32) {
        game.rainT = 0;
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10, vx: 0, vy: 1.5,
          type: 'dot', color: '#a78bfa', from: 'enemy',
        }));
      }
    },
    onWave: (game, wave) => {
      const side = wave % 2 ? 45 : LOGICAL_W - 45;
      const color = wave % 2 ? '#7dd3fc' : '#f9a8d4';
      const e = elite({ x: side, y: 70, hp: 220, color, kind: 'generic' });
      e.vy = 0.35;
      e.script = (en, d, gm) => {
        timer(en, 'aim', 0.55, d, () => {
          spawnAimed(gm, en, gm.player, { n: 3, parity: 'even', type: 'rice', speed: 2.7, spread: 0.16, color: en.color });
        });
        timer(en, 'ring', 1.6, d, () => spawnRingAt(gm, en.x, en.y, 8, 1.5, 'talisman', '#c4b5fd', en.age));
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_a5_midboss(g) {
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 2100, kind: 'rival', color: '#c4b5fd', color2: '#e0f2fe',
    label: '编辑伦理审查', enterY: 100,
  }, (en, d, game) => {
    timer(en, 'ring', 1.8, d, () => {
      spawnRingAt(game, en.x, en.y, 18, 1.6, 'medium', '#c4b5fd', en.age * 0.3);
    });
    timer(en, 'laser', 0.8, d, () => {
      for (const side of [-1, 1]) {
        spawnAimedLaser(game, { x: en.x + side * 30, y: en.y }, game.player, '#a78bfa');
      }
    });
    timer(en, 'drop', 2.0, d, () => {
      game.spawnBullet(acquireBullet({
        x: en.x + (Math.random() - 0.5) * 80, y: en.y, vx: 0, vy: 1.2,
        type: 'large', color: '#a78bfa', from: 'enemy', gravity: 0.006, life: 5,
        onSplit: (self) => spawnRingAt(game, self.x, self.y, 8, 1.5, 'dot', '#c4b5fd'),
      }));
    });
  }, 'elite');
}

export function chapter_a5_mid_5(g) {
  // 纯辅压：横扫激光 + 双色雨 + 十字落
  installMidWave(g, {
    continuous: (game, dt) => {
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.5) {
        game.laserT = 0;
        game.waveCount = (game.waveCount || 0) + 1;
        const y = 60 + (game.waveCount * 35) % 400;
        spawnHLaser(game, y, game.waveCount % 3 === 0 ? 1 : -1, '#7dd3fc');
      }
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.16) {
        game.rainT = 0;
        const col = Math.random() < 0.5 ? '#7dd3fc' : '#f9a8d4';
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10,
          vx: (Math.random() - 0.5) * 0.5, vy: 1.8,
          type: 'rice', color: col, from: 'enemy', gravity: 0.01,
        }));
      }
      game.crossT = (game.crossT || 0) + dt;
      if (game.crossT > 1.5) {
        game.crossT = 0;
        spawnCrossFall(game, { type: 'dot', color: '#c4b5fd', speed: 1.5, columns: 6 });
      }
    },
  });
}

export function chapter_a5_mid_6(g) {
  // 纯辅压：双色雨 + 狙激光
  installMidWave(g, {
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.18) {
        game.rainT = 0;
        game.waveCount = (game.waveCount || 0) + 1;
        const col = game.waveCount % 2 === 0 ? '#7dd3fc' : '#f9a8d4';
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10,
          vx: (Math.random() - 0.5) * 0.8, vy: 1.8 + Math.random(),
          type: 'rice', color: col, from: 'enemy', gravity: 0.008,
        }));
      }
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.7) {
        game.laserT = 0;
        const dummy = { x: LOGICAL_W / 2, y: 40 };
        spawnAimedLaser(game, dummy, game.player, game.waveCount % 2 ? '#38bdf8' : '#e879f9');
      }
    },
  });
}

export function chapter_a5_mid_7(g) {
  installMidWave(g, {
    interval: 0.8,
    maxWaves: 13,
    continuous: (game, dt) => {
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.6) {
        game.laserT = 0;
        spawnAimedLaser(game, { x: LOGICAL_W / 2, y: 50 }, game.player, '#a78bfa');
      }
    },
    onWave: (game) => {
      for (const side of [-1, 1]) {
        const x = LOGICAL_W / 2 + side * 100;
        const color = side === -1 ? '#7dd3fc' : '#f9a8d4';
        const e = mob(x, -15, 38, color);
        e.vy = 1.1;
        e.script = (en, d, gm) => {
          timer(en, 's', 0.55, d, () => {
            spawnAimed(gm, en, gm.player, { n: 2, parity: 'even', type: 'dot', speed: 2.6, spread: 0.28, color: en.color });
          });
          timer(en, 'ring', 1.8, d, () => spawnRingAt(gm, en.x, en.y, 8, 1.4, 'talisman', '#c4b5fd'));
        };
        game.spawnEnemy(e);
      }
    },
  });
}

export function chapter_a5_mid_8(g) {
  // 纯辅压：三色符 + 横扫 + 双侧狙激光
  installMidWave(g, {
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.12) {
        game.rainT = 0;
        game.waveCount = (game.waveCount || 0) + 1;
        const col = ['#7dd3fc', '#f9a8d4', '#c4b5fd'][game.waveCount % 3];
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10,
          vx: (Math.random() - 0.5) * 0.7, vy: 2.0 + Math.random() * 0.5,
          type: 'talisman', color: col, from: 'enemy', gravity: 0.01,
        }));
      }
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.45) {
        game.laserT = 0;
        spawnHLaser(game, 80 + (game.waveCount * 30) % 380, game.waveCount % 2 ? 1 : -1, '#a78bfa');
      }
      game.aimT = (game.aimT || 0) + dt;
      if (game.aimT > 0.65) {
        game.aimT = 0;
        for (const side of [-1, 1]) {
          spawnAimedLaser(game, { x: LOGICAL_W / 2 + side * 80, y: 40 }, game.player, side === -1 ? '#38bdf8' : '#e879f9');
        }
      }
    },
  });
}

