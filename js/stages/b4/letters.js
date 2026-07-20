/**
 * B4 Boss Letter（E06b 从 b4_duren.js 拆出，数值不变）
 */
import {
  timer, pushBossRef,
} from '../_shared.js';
import { LOGICAL_W } from '../../config.js';
import {
  spawnAimed, spawnRingAt, spawnGravityRain, spawnAimedLaser,
} from '../../patterns.js';
import { acquireBullet } from '../../bulletPool.js';

const BOSS_B4 = {
  x: LOGICAL_W / 2, y: 100, kind: 'duren',
  color: '#fb7185', color2: '#fda4af', label: '赌人时尚', enterY: 100,
};


export function chapter_duren_1(g) {
  pushBossRef(g, { ...BOSS_B4, hp: 3100 }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 2) * 100;
    en.y = 100 + Math.cos(en.age * 1.5) * 30;
    timer(en, 's', 0.3, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'large', speed: 2.5, color: '#fb7185' });
    });
    timer(en, 'spin', 0.1, d, () => {
      en.data.a = (en.data.a || 0) + 0.5;
      game.spawnBullet(acquireBullet({
        x: en.x, y: en.y, angle: en.data.a, speed: 2.8, type: 'talisman', color: '#f43f5e', from: 'enemy',
      }));
    });
  });
}

export function chapter_duren_2(g) {
  pushBossRef(g, { ...BOSS_B4, hp: 3300 }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 2.2) * 110;
    en.y = 100 + Math.cos(en.age * 1.8) * 35;
    timer(en, 'aim', 0.28, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'even', type: 'rice', speed: 2.6, spread: 0.22, color: '#fb7185' });
    });
    timer(en, 'spin', 0.12, d, () => {
      en.data.a = (en.data.a || 0) + 0.45;
      for (const side of [-1, 1]) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 2.4, type: 'talisman', color: '#e11d48', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.6, d, () => spawnRingAt(game, en.x, en.y, 12, 1.8, 'dot', '#fda4af', en.age));
  });
}

export function chapter_duren_3(g) {
  pushBossRef(g, { ...BOSS_B4, hp: 3500 }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 2.5) * 115;
    en.y = 100 + Math.cos(en.age * 2) * 40;
    timer(en, 's', 0.25, d, () => {
      spawnAimed(game, en, game.player, { n: 4, parity: 'even', type: 'medium', speed: 2.8, color: '#fb7185' });
    });
    timer(en, 'spin', 0.08, d, () => {
      en.data.a = (en.data.a || 0) + 0.55;
      game.spawnBullet(acquireBullet({
        x: en.x, y: en.y, angle: en.data.a, speed: 3.0, type: 'talisman', color: '#e11d48', from: 'enemy',
      }));
    });
    timer(en, 'ring', 1.8, d, () => {
      spawnRingAt(game, en.x, en.y, 14, 2.0, 'rice', '#fda4af', en.age * 0.5);
    });
    timer(en, 'laser', 0.7, d, () => spawnAimedLaser(game, en, game.player, '#f43f5e'));
  });
}

export function chapter_duren_4(g) {
  pushBossRef(g, { ...BOSS_B4, hp: 3700 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const fast = hpRatio < 0.5 ? 0.7 : 1.0;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 2.8) * 120;
    en.y = 100 + Math.cos(en.age * 2.2) * 45;
    timer(en, 'a', fast * 0.25, d, () => {
      spawnAimed(game, en, game.player, { n: hpRatio < 0.5 ? 5 : 4, parity: 'odd', type: 'talisman', speed: 2.8, color: '#fb7185' });
    });
    timer(en, 'spin', fast * 0.09, d, () => {
      en.data.a = (en.data.a || 0) + (hpRatio < 0.5 ? 0.65 : 0.5);
      for (const side of [-1, 1]) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 3.2, type: 'rice', color: '#f43f5e', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', fast * 1.4, d, () => spawnRingAt(game, en.x, en.y, 16, 2.2, 'medium', '#fda4af', en.age));
    if (hpRatio < 0.5) {
      timer(en, 'rain', 0.25, d, () => spawnGravityRain(game, 2, 'dot', '#e11d48', 1.6));
    }
  });
}

export function chapter_duren_5(g) {
  pushBossRef(g, { ...BOSS_B4, hp: 3900 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 3) * 120;
    en.y = 100 + Math.cos(en.age * 2.5) * 40;
    timer(en, 's', 0.2, d, () => {
      spawnAimed(game, en, game.player, { n: hpRatio < 0.4 ? 5 : 3, parity: 'even', type: 'large', speed: 3.0, spread: 0.3, color: '#fb7185' });
    });
    timer(en, 'spin', 0.07, d, () => {
      en.data.a = (en.data.a || 0) + 0.6;
      for (let i = 0; i < (hpRatio < 0.4 ? 3 : 1); i++) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: en.data.a + (i * Math.PI * 2) / 3, speed: hpRatio < 0.4 ? 3.5 : 2.6, type: 'talisman', color: '#e11d48', from: 'enemy',
        }));
      }
    });
    timer(en, 'laser', 0.55, d, () => spawnAimedLaser(game, en, game.player, '#f43f5e', 45));
    timer(en, 'ring', 1.5, d, () => spawnRingAt(game, en.x, en.y, 18, 2.4, 'rice', '#fda4af', en.age));
  });
}

export function chapter_duren_6(g) {
  pushBossRef(g, { ...BOSS_B4, hp: 4200 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 3.2) * 125;
    en.y = 100 + Math.cos(en.age * 2.8) * 45;
    timer(en, 'burst', 0.35, d, () => {
      for (let i = 0; i < (hpRatio < 0.4 ? 8 : 5); i++) {
        const rx = Math.random() * LOGICAL_W;
        const ry = Math.random() * 300;
        game.spawnBullet(acquireBullet({
          x: rx, y: ry, angle: Math.random() * Math.PI * 2, speed: 1.8 + Math.random() * 1.5,
          type: 'talisman', color: hpRatio < 0.4 && i % 2 ? '#e11d48' : '#f43f5e', from: 'enemy',
        }));
      }
    });
    timer(en, 'fall', 0.6, d, () => {
      for (let i = 0; i < (hpRatio < 0.4 ? 6 : 4); i++) {
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 1.2, vy: 1.5 + Math.random() * 1.0,
          type: 'rice', color: '#fda4af', from: 'enemy', gravity: 0.008,
        }));
      }
    });
    timer(en, 'ring', 1.4, d, () => {
      const rx = 60 + Math.random() * (LOGICAL_W - 120);
      const ry = 60 + Math.random() * 300;
      spawnRingAt(game, rx, ry, hpRatio < 0.4 ? 20 : 14, 2.2, 'medium', '#fb7185', en.age);
    });
  });
}

export function chapter_duren_7(g) {
  pushBossRef(g, { ...BOSS_B4, hp: 4800 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.25;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (frenzy ? 4 : 2.5)) * (frenzy ? 140 : 120);
    en.y = 100 + Math.cos(en.age * (frenzy ? 3 : 2)) * (frenzy ? 50 : 40);
    timer(en, 's', frenzy ? 0.14 : 0.25, d, () => {
      spawnAimed(game, en, game.player, { n: frenzy ? 5 : 3, parity: 'odd', type: frenzy ? 'large' : 'medium', speed: frenzy ? 3.5 : 2.8, color: '#fb7185' });
    });
    timer(en, 'spin', frenzy ? 0.04 : 0.08, d, () => {
      en.data.a = (en.data.a || 0) + (frenzy ? 0.8 : 0.55);
      for (let i = 0; i < (frenzy ? 2 : 1); i++) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: en.data.a + i * Math.PI, speed: frenzy ? 3.5 : 2.8, type: 'talisman', color: '#e11d48', from: 'enemy',
        }));
      }
    });
    if (frenzy) {
      timer(en, 'rain', 0.2, d, () => spawnGravityRain(game, 3, 'rice', '#fda4af', 1.8));
    }
  });
}

export function chapter_duren_last(g) {
  pushBossRef(g, { ...BOSS_B4, hp: 5600 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.2;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (frenzy ? 4.5 : 3)) * (frenzy ? 150 : 130);
    en.y = 100 + Math.cos(en.age * (frenzy ? 3.5 : 2.5)) * (frenzy ? 55 : 45);
    timer(en, 'storm', frenzy ? 0.06 : 0.14, d, () => {
      for (let i = 0; i < (frenzy ? 3 : 1); i++) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: Math.random() * Math.PI * 2, speed: 2 + Math.random() * (frenzy ? 3.5 : 2.5),
          type: ['dot', 'rice', 'talisman'][Math.floor(Math.random() * 3)], color: Math.random() < 0.5 ? '#fb7185' : '#e11d48', from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', frenzy ? 0.15 : 0.28, d, () => {
      spawnAimed(game, en, game.player, { n: frenzy ? 7 : 5, parity: 'odd', type: frenzy ? 'large' : 'talisman', speed: frenzy ? 3.8 : 3.0, color: '#f43f5e' });
    });
    timer(en, 'spin', frenzy ? 0.05 : 0.1, d, () => {
      en.data.a = (en.data.a || 0) + (frenzy ? 0.8 : 0.55);
      for (const side of [-1, 1]) {
        for (const off of [-1, 1]) {
          game.spawnBullet(acquireBullet({
            x: en.x + side * 20, y: en.y + off * 10, angle: en.data.a * side * off, speed: frenzy ? 3.2 : 2.4, type: 'rice', color: '#fda4af', from: 'enemy',
          }));
        }
      }
    });
    if (frenzy) {
      timer(en, 'laser', 0.3, d, () => {
        for (const side of [-1, 1]) {
          spawnAimedLaser(game, { x: en.x + side * 35, y: en.y }, game.player, '#e11d48');
        }
      });
      timer(en, 'rain', 0.15, d, () => spawnGravityRain(game, 4, 'medium', '#fb7185', 2.2));
    }
  });
}

