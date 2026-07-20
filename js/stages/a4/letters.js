/**
 * A4 Boss Letter（E06b 从 a4_menbailiang.js 拆出，数值不变）
 */
import {
  timer, pushBossRef,
} from '../_shared.js';
import { LOGICAL_W } from '../../config.js';
import {
  spawnAimed, spawnRingAt, spawnGravityRain, spawnAimedLaser,
} from '../../patterns.js';
import { acquireBullet } from '../../bulletPool.js';

const BOSS_A4 = {
  x: LOGICAL_W / 2, y: 95, kind: 'menbailiang',
  color: '#fbbf24', color2: '#fde68a', label: '门百梁', enterY: 95,
};


export function chapter_menbailiang_1(g) {
  pushBossRef(g, { ...BOSS_A4, hp: 2800 }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age) * 70;
    timer(en, 'fan', 0.5, d, () => {
      spawnAimed(game, en, game.player, { n: 9, parity: 'odd', type: 'talisman', speed: 2.6, color: '#fbbf24' });
    });
    timer(en, 'ring', 2.0, d, () => spawnRingAt(game, en.x, en.y, 36, 2.0, 'medium', '#fcd34d'));
  });
}

export function chapter_menbailiang_2(g) {
  pushBossRef(g, { ...BOSS_A4, hp: 3000 }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.1) * 80;
    en.y = 95 + Math.cos(en.age * 0.7) * 25;
    en.data.aimT = (en.data.aimT || 0) - d;
    if (en.data.aimT <= 0) {
      const base = 0.30 + 0.15 * Math.sin(en.age * 1.2);
      en.data.aimT = base * (en._fireMul ?? 1);
      spawnAimed(game, en, game.player, { n: 4, parity: 'even', type: 'rice', speed: 2.6, spread: 0.22, color: '#fcd34d' });
    }
    timer(en, 'spin', 0.12, d, () => {
      en.data.a = (en.data.a || 0) + 0.4;
      for (const side of [-1, 1]) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 1.8, type: 'dot', color: '#f59e0b', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.8, d, () => spawnRingAt(game, en.x, en.y, 14, 1.8, 'talisman', '#fde68a', en.age * 0.7));
    timer(en, 'bloom', 1.2, d, () => {
      const bx = 30 + Math.random() * (LOGICAL_W - 60);
      const by = 60 + Math.random() * 150;
      game.spawnBullet(acquireBullet({
        x: bx, y: by, vx: 0, vy: 0, type: 'large', color: '#f59e0b', from: 'enemy',
        life: 0.8, r: 12,
        onSplit: (self) => spawnRingAt(game, self.x, self.y, 12, 1.8, 'talisman', '#fde68a'),
      }));
    });
  });
}

export function chapter_menbailiang_3(g) {
  pushBossRef(g, { ...BOSS_A4, hp: 3200 }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.3) * 90;
    timer(en, 'dual', 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'medium', speed: 2.8, spread: 0.35, color: '#fbbf24' });
      spawnAimed(game, { x: LOGICAL_W - en.x, y: en.y }, game.player, { n: 2, parity: 'even', type: 'medium', speed: 2.8, spread: 0.35, color: '#fbbf24' });
    });
    timer(en, 'ring', 1.3, d, () => spawnRingAt(game, en.x, en.y, 16, 2.0, 'talisman', '#fde68a', en.age * 0.5));
    timer(en, 'drop', 1.6, d, () => {
      const bx = 30 + Math.random() * (LOGICAL_W - 60);
      game.spawnBullet(acquireBullet({
        x: bx, y: -10, vx: 0, vy: 1.4, type: 'large', color: '#f59e0b', from: 'enemy', gravity: 0.01, life: 10,
        onSplit: (self) => spawnRingAt(game, self.x, self.y, 10, 1.8, 'dot', '#fde68a'),
      }));
    });
  });
}

export function chapter_menbailiang_4(g) {
  pushBossRef(g, { ...BOSS_A4, hp: 3400 }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.5) * 100;
    en.y = 95 + Math.cos(en.age * 1.2) * 30;
    timer(en, 'aim', 0.35, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'talisman', speed: 2.8, spread: 0.15, color: '#f59e0b' });
    });
    timer(en, 'laser', 0.6, d, () => {
      spawnAimedLaser(game, en, game.player, '#fbbf24', 45);
    });
    timer(en, 'ring', 1.5, d, () => {
      spawnRingAt(game, en.x, en.y, 16, 2.0, 'rice', '#fde68a', en.age * 0.8);
    });
  });
}

export function chapter_menbailiang_5(g) {
  pushBossRef(g, { ...BOSS_A4, hp: 3600 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const speedup = hpRatio < 0.5 ? 0.6 : 0.85;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (hpRatio < 0.5 ? 2.2 : 1.5)) * 110;
    timer(en, 'aim', speedup * 0.55, d, () => {
      const parity = hpRatio < 0.5 ? 'even' : 'odd';
      spawnAimed(game, en, game.player, { n: 3, parity, type: 'medium', speed: 3.0, spread: 0.2, color: '#f59e0b' });
    });
    timer(en, 'ring', speedup * 1.4, d, () => {
      const rx = 40 + Math.random() * (LOGICAL_W - 80);
      const ry = 40 + Math.random() * 200;
      spawnRingAt(game, rx, ry, 18, 2.75, 'talisman', '#fde68a', en.age);
    });
    timer(en, 'drop', speedup * 1.5, d, () => {
      spawnGravityRain(game, 2, 'rice', '#fcd34d', 1.6);
    });
  });
}

export function chapter_menbailiang_6(g) {
  pushBossRef(g, { ...BOSS_A4, hp: 3800 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.8) * 100;
    en.y = 95 + Math.cos(en.age * 1.4) * 35;
    timer(en, 'fan', 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: hpRatio < 0.4 ? 7 : 5, parity: 'odd', type: 'rice', speed: hpRatio < 0.4 ? 3.2 : 2.6, color: '#fbbf24' });
    });
    timer(en, 'spin', 0.1, d, () => {
      en.data.a = (en.data.a || 0) + 0.45;
      for (const s of [-1, 1]) {
        game.spawnBullet(acquireBullet({
          x: en.x + s * 20, y: en.y, angle: en.data.a * s, speed: 2.2, type: 'talisman', color: '#f59e0b', from: 'enemy',
        }));
      }
    });
    timer(en, 'rain', 0.3, d, () => spawnGravityRain(game, 1, 'medium', '#fcd34d', 1.4));
    if (hpRatio < 0.4) {
      timer(en, 'laser', 0.5, d, () => spawnAimedLaser(game, en, game.player, '#fde68a'));
    }
  });
}

export function chapter_menbailiang_7(g) {
  pushBossRef(g, { ...BOSS_A4, hp: 4000 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzyMul = hpRatio < 0.3 ? 0.55 : 0.8;
    timer(en, 'laser', frenzyMul, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'laser', speed: 4.5, color: '#fbbf24', laserLen: 50 });
    });
    timer(en, 'aim', frenzyMul * 1.5, d, () => {
      spawnAimed(game, en, game.player, { n: 7, parity: 'odd', type: 'rice', speed: hpRatio < 0.3 ? 3.5 : 2.8, color: '#f59e0b' });
    });
    timer(en, 'ring', frenzyMul * 2.5, d, () => {
      spawnRingAt(game, en.x, en.y, 20, hpRatio < 0.3 ? 2.8 : 2.0, 'dot', '#fcd34d', en.age);
    });
  });
}

export function chapter_menbailiang_last(g) {
  pushBossRef(g, { ...BOSS_A4, hp: 4800 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.25;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (frenzy ? 3 : 2)) * (frenzy ? 140 : 110);
    en.y = 95 + Math.cos(en.age * (frenzy ? 2.5 : 1.8)) * (frenzy ? 45 : 30);
    timer(en, 'a', frenzy ? 0.12 : 0.25, d, () => {
      spawnAimed(game, en, game.player, { n: frenzy ? 7 : 5, parity: 'odd', type: frenzy ? 'large' : 'medium', speed: frenzy ? 3.8 : 3.0, color: '#f59e0b' });
    });
    timer(en, 'spin', frenzy ? 0.06 : 0.12, d, () => {
      en.data.a = (en.data.a || 0) + (frenzy ? 0.7 : 0.4);
      for (let i = 0; i < (frenzy ? 3 : 2); i++) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: en.data.a + (i * Math.PI * 2) / (frenzy ? 3 : 2), speed: frenzy ? 3.0 : 2.2, type: 'talisman', color: '#fbbf24', from: 'enemy',
        }));
      }
    });
    timer(en, 'laser', frenzy ? 0.3 : 0.5, d, () => {
      for (const side of [-1, 1]) {
        spawnAimedLaser(game, { x: en.x + side * 40, y: en.y }, game.player, '#fcd34d', 45);
      }
    });
    if (frenzy) {
      timer(en, 'rain', 0.15, d, () => spawnGravityRain(game, 3, 'rice', '#fde68a', 2.4));
    }
  });
}

