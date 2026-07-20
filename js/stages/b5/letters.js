/**
 * B5 Boss Letter（E06b 从 b5_gundian.js 拆出，数值不变）
 */
import {
  timer, pushBossRef,
} from '../_shared.js';
import { LOGICAL_W } from '../../config.js';
import {
  spawnAimed, spawnRingAt, spawnGravityRain, spawnAimedLaser,
} from '../../patterns.js';
import { acquireBullet } from '../../bulletPool.js';

const BOSS_B5 = {
  x: LOGICAL_W / 2, y: 95, kind: 'gundian',
  color: '#fb923c', color2: '#fdba74', label: '棍电噢哆', enterY: 95,
};


export function chapter_gundian_1(g) {
  pushBossRef(g, { ...BOSS_B5, y: 95, enterY: 95, hp: 3200 }, (en, d, game) => {
    timer(en, 'a', 0.25, d, () => {
      const a = Math.atan2(game.player.y - en.y, game.player.x - en.x);
      game.spawnBullet(acquireBullet({
        x: en.x - 20, y: en.y, angle: a, speed: 3.2, type: 'rice', color: '#fb923c', from: 'enemy',
      }));
      game.spawnBullet(acquireBullet({
        x: en.x + 20, y: en.y, angle: a, speed: 3.2, type: 'rice', color: '#fdba74', from: 'enemy',
      }));
    });
    timer(en, 'slide', 0.8, d, () => {
      spawnAimed(game, en, game.player, { n: 5, parity: 'even', type: 'dot', speed: 2.5, color: '#f97316' });
    });
  });
}

export function chapter_gundian_2(g) {
  pushBossRef(g, { ...BOSS_B5, y: 95, enterY: 95, hp: 3400 }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.5) * 60;
    en.y = 95 + Math.cos(en.age * 0.8) * 15;
    timer(en, 'aim', 0.3, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'talisman', speed: 2.8, color: '#fb923c' });
    });
    timer(en, 'spin', 0.12, d, () => {
      en.data.a = (en.data.a || 0) + 0.45;
      for (const side of [-1, 1]) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 2.2, type: 'rice', color: '#f97316', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.4, d, () => spawnRingAt(game, en.x, en.y, 12, 1.6, 'dot', '#fdba74', en.age));
  });
}

export function chapter_gundian_3(g) {
  pushBossRef(g, { ...BOSS_B5, y: 95, enterY: 95, hp: 3600 }, (en, d, game) => {
    timer(en, 'laser', 0.35, d, () => {
      const side = en.data.side ? 1 : -1;
      en.data.side = !en.data.side;
      spawnAimedLaser(game, { x: en.x + side * 50, y: en.y }, game.player, '#f97316', 45);
    });
    timer(en, 'aim', 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: 4, parity: 'odd', type: 'talisman', speed: 2.8, color: '#fb923c' });
    });
    timer(en, 'ring', 1.2, d, () => {
      spawnRingAt(game, en.x, en.y, 14, 2.0, 'medium', '#fdba74', en.age);
    });
  });
}

export function chapter_gundian_4(g) {
  pushBossRef(g, { ...BOSS_B5, y: 95, enterY: 95, hp: 3800 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (hpRatio < 0.5 ? 2.2 : 1.5)) * 90;
    en.y = 95 + Math.cos(en.age * 1.2) * 20;
    timer(en, 'aim', 0.3, d, () => {
      spawnAimed(game, en, game.player, { n: hpRatio < 0.5 ? 5 : 4, parity: 'even', type: 'rice', speed: 2.8, color: '#f97316' });
    });
    timer(en, 'ring', 1.1, d, () => spawnRingAt(game, en.x, en.y, 16, 2.2, 'talisman', '#fdba74', en.age));
    timer(en, 'laser', 0.8, d, () => spawnAimedLaser(game, en, game.player, '#fb923c', 45));
    timer(en, 'rain', 0.18, d, () => spawnGravityRain(game, 2, 'rice', '#fdba74', 1.6));
  });
}

export function chapter_gundian_5(g) {
  pushBossRef(g, { ...BOSS_B5, y: 95, enterY: 95, hp: 4000 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (hpRatio < 0.4 ? 2.5 : 1.8)) * 105;
    en.y = 95 + Math.cos(en.age * (hpRatio < 0.4 ? 1.8 : 1.3)) * 25;
    timer(en, 'a', 0.22, d, () => {
      const a = Math.atan2(game.player.y - en.y, game.player.x - en.x);
      for (const ox of [-20, 0, 20]) {
        game.spawnBullet(acquireBullet({
          x: en.x + ox, y: en.y, angle: a + (Math.random() - 0.5) * 0.15, speed: 3.2, type: 'rice', color: '#fb923c', from: 'enemy',
        }));
      }
    });
    timer(en, 'spin', 0.1, d, () => {
      en.data.a = (en.data.a || 0) + 0.5;
      for (const side of [-1, 1]) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 2.5, type: 'talisman', color: '#f97316', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.3, d, () => spawnRingAt(game, en.x, en.y, 18, 2.2, 'dot', '#fdba74', en.age * 0.6));
  });
}

export function chapter_gundian_6(g) {
  pushBossRef(g, { ...BOSS_B5, y: 95, enterY: 95, hp: 4200 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const fast = hpRatio < 0.35;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (fast ? 3 : 2)) * (fast ? 120 : 100);
    en.y = 95 + Math.cos(en.age * (fast ? 2.2 : 1.5)) * (fast ? 30 : 20);
    timer(en, 'laser', fast ? 0.3 : 0.45, d, () => {
      spawnAimedLaser(game, en, game.player, fast ? '#f97316' : '#fb923c', 45);
    });
    timer(en, 'aim', fast ? 0.25 : 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: fast ? 6 : 4, parity: 'odd', type: 'talisman', speed: fast ? 3.2 : 2.8, color: fast ? '#f97316' : '#fb923c' });
    });
    timer(en, 'ring', fast ? 0.9 : 1.3, d, () => spawnRingAt(game, en.x, en.y, fast ? 18 : 14, fast ? 2.4 : 2.0, 'rice', '#fdba74', en.age));
    if (fast) {
      timer(en, 'spin', 0.1, d, () => {
        en.data.a = (en.data.a || 0) + 0.6;
        for (const side of [-1, 1]) {
          game.spawnBullet(acquireBullet({
            x: en.x + side * 15, y: en.y, angle: en.data.a * side, speed: 2.8, type: 'dot', color: '#fdba74', from: 'enemy',
          }));
        }
      });
    }
  });
}

export function chapter_gundian_7(g) {
  pushBossRef(g, { ...BOSS_B5, y: 95, enterY: 95, hp: 4600 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.25;
    timer(en, 'a', frenzy ? 0.12 : 0.25, d, () => {
      const a = Math.atan2(game.player.y - en.y, game.player.x - en.x);
      for (const ox of [-25, 0, 25]) {
        game.spawnBullet(acquireBullet({
          x: en.x + ox, y: en.y, angle: a + (Math.random() - 0.5) * 0.2, speed: frenzy ? 4.0 : 3.2, type: 'rice', color: '#fb923c', from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', frenzy ? 0.35 : 0.7, d, () => {
      spawnAimed(game, en, game.player, { n: frenzy ? 7 : 5, parity: 'odd', type: 'dot', speed: frenzy ? 3.5 : 2.8, color: '#f97316' });
    });
    timer(en, 'ring', frenzy ? 0.8 : 1.5, d, () => {
      spawnRingAt(game, en.x, en.y, frenzy ? 20 : 14, frenzy ? 2.6 : 2.0, 'talisman', '#fdba74', en.age);
    });
    if (frenzy) {
      timer(en, 'rain', 0.2, d, () => spawnGravityRain(game, 3, 'rice', '#fb923c', 2.0));
    }
  });
}

export function chapter_gundian_last(g) {
  pushBossRef(g, { ...BOSS_B5, y: 95, enterY: 95, hp: 5400 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.2;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (frenzy ? 3.5 : 2.5)) * (frenzy ? 140 : 115);
    en.y = 95 + Math.cos(en.age * (frenzy ? 2.8 : 1.8)) * (frenzy ? 40 : 30);
    timer(en, 'storm', frenzy ? 0.05 : 0.12, d, () => {
      for (let i = 0; i < (frenzy ? 4 : 2); i++) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: Math.random() * Math.PI * 2,
          speed: 2 + Math.random() * (frenzy ? 3.5 : 2.5),
          type: Math.random() < 0.35 ? 'large' : 'rice', color: Math.random() < 0.5 ? '#fb923c' : '#f97316', from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', frenzy ? 0.18 : 0.32, d, () => {
      spawnAimed(game, en, game.player, { n: frenzy ? 9 : 7, parity: 'odd', type: frenzy ? 'laser' : 'talisman', speed: frenzy ? 5 : 3.5, color: '#f97316', laserLen: 200 });
    });
    timer(en, 'ring', frenzy ? 0.7 : 1.2, d, () => {
      spawnRingAt(game, en.x, en.y, frenzy ? 24 : 18, frenzy ? 2.8 : 2.2, 'rice', '#fdba74', en.age);
    });
    if (frenzy) {
      timer(en, 'spin', 0.06, d, () => {
        en.data.a = (en.data.a || 0) + 0.8;
        for (const side of [-1, 1]) {
          for (const off of [-1, 1]) {
            game.spawnBullet(acquireBullet({
              x: en.x + side * 20, y: en.y + off * 15, angle: en.data.a * side * off, speed: 3.0, type: 'dot', color: '#fdba74', from: 'enemy',
            }));
          }
        }
      });
      timer(en, 'rain', 0.15, d, () => spawnGravityRain(game, 3, 'medium', '#fb923c', 2.4));
    }
  });
}

