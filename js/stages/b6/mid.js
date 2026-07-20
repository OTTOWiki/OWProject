/**
 * B6 道中 / midboss（E06b 从 b6_lastgod.js 拆出，数值不变）
 */
import {
  mob, elite, timer, installMidWave, pushBossRef,
} from '../_shared.js';
import { LOGICAL_W } from '../../config.js';
import {
  spawnAimed, spawnRingAt, spawnHLaser, spawnAimedLaser, spawnCrossFall,
} from '../../patterns.js';
import { acquireBullet } from '../../bulletPool.js';



export function chapter_b6_mid_1(g) {
  installMidWave(g, {
    interval: 1.0, maxWaves: 12,
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.4) {
        game.rainT = 0;
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10, angle: Math.PI / 2, speed: 1.0,
          type: 'medium', color: '#bef264', from: 'enemy', gravity: 0.004,
        }));
      }
    },
    onWave: (game) => {
      const e = mob(60 + Math.random() * (LOGICAL_W - 120), -20, 34, '#bef264');
      e.vy = 0.6;
      e.script = (en, d, gm) => {
        timer(en, 's', 0.7, d, () => {
          spawnAimed(gm, en, gm.player, { n: 2, parity: 'even', type: 'dot', speed: 1.6, spread: 0.22, color: '#a3e635' });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_b6_mid_2(g) {
  installMidWave(g, {
    interval: 0.7, maxWaves: 13,
    onWave: (game) => {
      const e = elite({ x: 60 + Math.random() * (LOGICAL_W - 120), y: 80, hp: 210, color: '#65a30d', kind: 'generic' });
      e.vy = 0.2;
      e.script = (en, d, gm) => {
        timer(en, 'laser', 0.8, d, () => spawnAimedLaser(gm, en, gm.player, '#84cc16'));
        timer(en, 'ring', 2.0, d, () => spawnRingAt(gm, en.x, en.y, 10, 1.4, 'talisman', '#a3e635', en.age));
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_b6_mid_3(g) {
  installMidWave(g, {
    interval: 0.8, maxWaves: 13,
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.35) {
        game.rainT = 0;
        game.spawnBullet(acquireBullet({ x: Math.random() * LOGICAL_W, y: -8, vx: 0, vy: 1.3, type: 'rice', color: '#65a30d', from: 'enemy' }));
      }
    },
    onWave: (game) => {
      const e = mob(40 + Math.random() * (LOGICAL_W - 80), -15, 30, '#84cc16');
      e.vy = 1.0;
      e.script = (en, d, gm) => {
        timer(en, 's', 0.65, d, () => spawnAimed(gm, en, gm.player, { n: 2, parity: 'odd', type: 'talisman', speed: 2.0, color: '#a3e635' }));
        timer(en, 'ring', 2.0, d, () => spawnRingAt(gm, en.x, en.y, 6, 1.3, 'dot', '#bef264'));
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_b6_mid_4(g) {
  installMidWave(g, {
    interval: 0.7, maxWaves: 14,
    onWave: (game) => {
      const e = elite({ x: 50 + Math.random() * (LOGICAL_W - 100), y: 70, hp: 225, kind: 'generic', color: '#65a30d' });
      e.vy = 0.25;
      e.script = (en, d, gm) => {
        timer(en, 'aim', 0.6, d, () => spawnAimed(gm, en, gm.player, { n: 2, parity: 'even', type: 'rice', speed: 2.0, spread: 0.3, color: '#84cc16' }));
        timer(en, 'ring', 1.5, d, () => spawnRingAt(gm, en.x, en.y, 8, 1.4, 'talisman', '#a3e635', en.age));
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_b6_midboss(g) {
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 2500, kind: 'lastgod', color: '#a3e635', color2: '#d9f99d',
    label: '神炫祭司', enterY: 100,
  }, (en, d, game) => {
    timer(en, 'ring', 1.2, d, () => spawnRingAt(game, en.x, en.y, 14, 1.6, 'medium', '#bef264', en.age * 0.4));
    timer(en, 'aim', 0.6, d, () => spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'talisman', speed: 2.6, color: '#84cc16' }));
    timer(en, 'big', 1.8, d, () => {
      game.spawnBullet(acquireBullet({
        x: en.x + (Math.random() - 0.5) * 60, y: en.y, vx: 0, vy: 1.2,
        type: 'large', color: '#65a30d', from: 'enemy', gravity: 0.006, life: 8,
        onSplit: (self) => spawnRingAt(game, self.x, self.y, 10, 1.8, 'dot', '#a3e635'),
      }));
    });
    timer(en, 'laser', 0.9, d, () => spawnAimedLaser(game, en, game.player, '#84cc16'));
  }, 'elite');
}

export function chapter_b6_mid_5(g) {
  // 纯辅压：横扫 + 雨 + 双侧狙激光
  installMidWave(g, {
    continuous: (game, dt) => {
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.45) {
        game.laserT = 0;
        game.waveCount = (game.waveCount || 0) + 1;
        const y = 60 + (game.waveCount * 28) % 400;
        spawnHLaser(game, y, game.waveCount % 3 === 0 ? 1 : -1, '#65a30d');
      }
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.16) {
        game.rainT = 0;
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10,
          vx: (Math.random() - 0.5) * 0.6, vy: 1.8,
          type: 'rice', color: '#84cc16', from: 'enemy', gravity: 0.01,
        }));
      }
      game.aimT = (game.aimT || 0) + dt;
      if (game.aimT > 0.6) {
        game.aimT = 0;
        for (const side of [-1, 1]) {
          const src = { x: LOGICAL_W / 2 + side * 80, y: 40 };
          spawnAimedLaser(game, src, game.player, '#a3e635');
        }
      }
    },
  });
}

export function chapter_b6_mid_6(g) {
  installMidWave(g, {
    interval: 0.55, maxWaves: 14,
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.1) {
        game.rainT = 0;
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 0.8,
          vy: 2.2 + Math.random(), type: 'dot', color: '#65a30d', from: 'enemy', gravity: 0.008,
        }));
      }
    },
    onWave: (game, wave) => {
      const sz = wave % 2 ? 40 : LOGICAL_W - 40;
      const e = mob(sz, 50 + (wave % 3) * 60, 36, '#84cc16');
      e.script = (en, d, gm) => {
        timer(en, 's', 0.4, d, () => {
          spawnAimed(gm, en, gm.player, { n: 4, parity: 'even', type: 'rice', speed: 2.8, spread: 0.1, color: '#a3e635' });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_b6_mid_7(g) {
  installMidWave(g, {
    interval: 0.8, maxWaves: 14,
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.22) {
        game.rainT = 0;
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -5, vx: 0, vy: 1.5,
          type: 'large', color: '#4d7c0f', from: 'enemy', gravity: 0.004, life: 7,
          onSplit: (self) => spawnRingAt(game, self.x, self.y, 8, 1.4, 'dot', '#a3e635'),
        }));
      }
    },
    onWave: (game) => {
      const e = elite({ x: 45 + Math.random() * (LOGICAL_W - 90), y: 80, hp: 280, color: '#65a30d', kind: 'generic' });
      e.vy = 0.2;
      e.script = (en, d, gm) => {
        timer(en, 'aim', 0.55, d, () => {
          spawnAimed(gm, en, gm.player, { n: 3, parity: 'odd', type: 'talisman', speed: 2.8, spread: 0.15, color: '#84cc16' });
        });
        timer(en, 'ring', 1.8, d, () => spawnRingAt(gm, en.x, en.y, 10, 1.6, 'medium', '#a3e635', en.age));
      };
      game.spawnEnemy(e);
    },
  });
}

export function chapter_b6_mid_8(g) {
  // 纯辅压：横扫 + 双符雨 + 十字落
  installMidWave(g, {
    continuous: (game, dt) => {
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.35) {
        game.laserT = 0;
        game.waveCount = (game.waveCount || 0) + 1;
        const y = 50 + (game.waveCount * 25) % 430;
        spawnHLaser(game, y, game.waveCount % 3 === 0 ? 1 : -1, '#4d7c0f');
      }
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.12) {
        game.rainT = 0;
        for (let i = 0; i < 2; i++) {
          game.spawnBullet(acquireBullet({
            x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 0.8, vy: 1.8 + Math.random() * 0.5,
            type: 'talisman', color: '#bef264', from: 'enemy', gravity: 0.008,
          }));
        }
      }
      game.crossT = (game.crossT || 0) + dt;
      if (game.crossT > 1.3) {
        game.crossT = 0;
        spawnCrossFall(game, { type: 'rice', color: '#84cc16', speed: 1.7, columns: 6 });
      }
    },
  });
}

export function chapter_b6_mid_9(g) {
  installMidWave(g, {
    interval: 0.65, maxWaves: 14,
    continuous: (game, dt) => {
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.55) {
        game.laserT = 0;
        spawnAimedLaser(game, { x: LOGICAL_W / 2, y: 40 }, game.player, '#a3e635');
      }
    },
    onWave: (game) => {
      for (const side of [-1, 1]) {
        const x = LOGICAL_W / 2 + side * 85;
        const e = mob(x, -15, 38, side === -1 ? '#65a30d' : '#84cc16');
        e.vy = 1.2;
        e.script = (en, d, gm) => {
          timer(en, 's', 0.5, d, () => {
            spawnAimed(gm, en, gm.player, { n: 3, parity: 'even', type: 'rice', speed: 2.6, spread: 0.15, color: en.color });
          });
        };
        game.spawnEnemy(e);
      }
    },
  });
}

export function chapter_b6_mid_10(g) {
  // 纯辅压：三色符雨 + 双横扫 + 双侧狙激光
  installMidWave(g, {
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.08) {
        game.rainT = 0;
        game.waveCount = (game.waveCount || 0) + 1;
        for (let i = 0; i < 3; i++) {
          game.spawnBullet(acquireBullet({
            x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 0.9, vy: 2.0 + Math.random() * 0.7,
            type: 'talisman', color: ['#a3e635', '#bef264', '#65a30d'][game.waveCount % 3], from: 'enemy', gravity: 0.008,
          }));
        }
      }
      game.laserT = (game.laserT || 0) + dt;
      if (game.laserT > 0.35) {
        game.laserT = 0;
        for (const side of [-1, 1]) {
          spawnHLaser(game, 80 + (game.waveCount * 32) % 380, side, side === -1 ? '#65a30d' : '#4d7c0f');
        }
      }
      game.aimT = (game.aimT || 0) + dt;
      if (game.aimT > 0.45) {
        game.aimT = 0;
        for (const side of [-1, 1]) {
          spawnAimedLaser(game, { x: LOGICAL_W / 2 + side * 75, y: 45 }, game.player, '#84cc16');
        }
      }
    },
  });
}

