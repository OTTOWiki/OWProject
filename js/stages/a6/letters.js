/**
 * A6 Boss Letter（E06b 从 a6_yimeige.js 拆出，数值不变）
 */
import {
  timer, pushBossRef,
} from '../_shared.js';
import { LOGICAL_W } from '../../config.js';
import {
  spawnAimed, spawnRingAt, spawnGravityRain, spawnAimedLaser, spawnCrossFall,
} from '../../patterns.js';
import { acquireBullet } from '../../bulletPool.js';

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


export function chapter_yimeige_1(g) {
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

export function chapter_yimeige_2(g) {
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

export function chapter_yimeige_3(g) {
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

export function chapter_yimeige_4(g) {
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

export function chapter_yimeige_5(g) {
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

export function chapter_yimeige_6(g) {
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

export function chapter_yimeige_7(g) {
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

export function chapter_yimeige_8(g) {
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

export function chapter_yimeige_last(g) {
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

