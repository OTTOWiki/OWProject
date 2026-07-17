/** Extra 共用：强度 ×0.8、章时 ×0.5 */
import { elite, boss, timer } from './_shared.js';
import { LOGICAL_W } from '../config.js';
import {
  spawnAimed, spawnRingAt, spawnAimedLaser, spawnGravityRain,
} from '../patterns.js';
import { Bullet } from '../entities.js';

export const EX = {
  hp: 0.8,
  speed: 0.8,
  count: 0.8,
  fire: 1.25,
  spawn: 1.25,
  time: 0.5,
};

export const C = {
  red: '#f87171',
  orange: '#fb923c',
  gold: '#fbbf24',
  green: '#4ade80',
  cyan: '#22d3ee',
  blue: '#60a5fa',
  violet: '#a78bfa',
  pink: '#f472b6',
  white: '#e2e8f0',
  dark: '#64748b',
};

export function exHp(n) {
  return Math.max(1, Math.floor(n * EX.hp));
}

export function exSp(n) {
  return n * EX.speed;
}

export function exN(n, parity = null) {
  let c = Math.max(1, Math.round(n * EX.count));
  if (parity === 'odd' && c % 2 === 0) c = Math.max(1, c - 1);
  if (parity === 'even' && c % 2 === 1) c = c + 1;
  if (parity === 'even' && c < 2) c = 2;
  return c;
}

export function exFire(interval) {
  return interval * EX.fire;
}

export function exDur(mainlineSec) {
  return Math.max(8, Math.round(mainlineSec * EX.time));
}

export function exLetter(mainlineSec) {
  return Math.max(14, Math.round(mainlineSec * EX.time));
}

// 道中波次：现网由 ex_mid.js 的 MID_PATTERNS + buildExMid 承担（已无 buildMid* 调用方）

export function pushMidboss(g, opts = {}) {
  const {
    hp = 900,
    label = '键政精英',
    color = C.pink,
    tier = 1,
  } = opts;
  const e = elite({
    x: LOGICAL_W / 2, y: 100, hp: exHp(hp), kind: 'ex_mid',
    color, label, enterY: 100,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 0.7) * (40 + tier * 8);
    timer(en, 'aim', exFire(0.75 - tier * 0.05), d, () => {
      spawnAimed(game, en, game.player, {
        n: exN(3 + tier, 'odd'), parity: 'odd', type: 'talisman',
        speed: exSp(2.2 + tier * 0.15), spread: 0.14, color,
      });
    });
    timer(en, 'ring', exFire(1.6 - tier * 0.1), d, () => {
      spawnRingAt(game, en.x, en.y, exN(12 + tier * 2), exSp(1.9), 'rice', C.white, en.age);
    });
    if (tier >= 3) {
      timer(en, 'laser', exFire(1.2), d, () => {
        spawnAimedLaser(game, en, game.player, color);
      });
    }
  };
  g.enemies.push(e);
  g.bossRef = e;
}

/**
 * van / 伪 Boss Letter
 * style: aim | ring | rain | laser | dual | wall | spiral | frenzy | final
 */
export function pushBossLetter(g, opts = {}) {
  const {
    hp = 2200,
    label = 'van♂',
    color = C.red,
    color2 = C.gold,
    style = 'aim',
    tier = 1,
  } = opts;
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: exHp(hp), kind: 'van',
    color, color2, label, enterY: 95,
  });
  const tMul = 1 + (tier - 1) * 0.08;
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 0.65) * (50 + tier * 4);
    en.y = 95 + Math.cos(en.age * 0.5) * 12;
    const frenzy = en.hp / en.maxHp < 0.35;

    if (style === 'aim' || style === 'final') {
      timer(en, 'aim', exFire(frenzy ? 0.32 : 0.48) / tMul, d, () => {
        spawnAimed(game, en, game.player, {
          n: exN(frenzy ? 7 : 5, 'odd'), parity: 'odd', type: 'rice',
          speed: exSp((frenzy ? 3.2 : 2.6) * tMul), spread: 0.12, color,
        });
      });
      timer(en, 'ring', exFire(1.1), d, () => {
        spawnRingAt(game, en.x, en.y, exN(14 + tier), exSp(2.0), 'talisman', color2, en.age);
      });
    }
    if (style === 'ring') {
      timer(en, 'ring', exFire(frenzy ? 0.55 : 0.85), d, () => {
        spawnRingAt(game, en.x, en.y, exN(frenzy ? 20 : 16), exSp(2.2), 'talisman', color, en.age * 1.2);
        spawnRingAt(game, en.x, en.y, exN(12), exSp(1.6), 'dot', color2, en.age * -0.8);
      });
      timer(en, 'aim', exFire(0.7), d, () => {
        spawnAimed(game, en, game.player, {
          n: exN(2, 'even'), parity: 'even', type: 'rice', speed: exSp(2.8), color: color2,
        });
      });
    }
    if (style === 'rain') {
      timer(en, 'rain', exFire(frenzy ? 0.22 : 0.35), d, () => {
        spawnGravityRain(game, exN(frenzy ? 4 : 3), 'medium', color, exSp(2.0));
      });
      timer(en, 'aim', exFire(0.55), d, () => {
        spawnAimed(game, en, game.player, {
          n: exN(3, 'odd'), parity: 'odd', type: 'rice', speed: exSp(2.5), color: color2,
        });
      });
    }
    if (style === 'laser') {
      timer(en, 'laser', exFire(frenzy ? 0.55 : 0.9), d, () => {
        spawnAimedLaser(game, en, game.player, color);
        if (frenzy || tier >= 4) {
          for (const side of [-1, 1]) {
            spawnAimedLaser(game, { x: en.x + side * 50, y: en.y }, game.player, color2);
          }
        }
      });
      timer(en, 'aim', exFire(0.5), d, () => {
        spawnAimed(game, en, game.player, {
          n: exN(4, 'even'), parity: 'even', type: 'dot', speed: exSp(2.4), color,
        });
      });
    }
    if (style === 'dual') {
      timer(en, 'L', exFire(0.45), d, () => {
        spawnAimed(game, { x: en.x - 40, y: en.y }, game.player, {
          n: exN(3, 'odd'), parity: 'odd', type: 'rice', speed: exSp(2.5), color: C.blue,
        });
      });
      timer(en, 'R', exFire(0.5), d, () => {
        spawnAimed(game, { x: en.x + 40, y: en.y }, game.player, {
          n: exN(2, 'even'), parity: 'even', type: 'talisman', speed: exSp(2.3), color: C.orange,
        });
      });
      timer(en, 'ring', exFire(1.3), d, () => {
        spawnRingAt(game, en.x, en.y, exN(10), exSp(1.8), 'dot', C.white, en.age);
      });
    }
    if (style === 'wall') {
      timer(en, 'wall', exFire(frenzy ? 0.7 : 1.0), d, () => {
        const y = 40 + Math.random() * 80;
        const gap = 70 + Math.random() * 40;
        const gapX = 80 + Math.random() * (LOGICAL_W - 160);
        for (let x = 20; x < LOGICAL_W - 20; x += 18) {
          if (x > gapX - gap / 2 && x < gapX + gap / 2) continue;
          game.bullets.push(new Bullet({
            x, y: -10, vx: 0, vy: exSp(2.0 + Math.random() * 0.4),
            type: 'rice', color, from: 'enemy',
          }));
        }
        void y;
      });
      timer(en, 'aim', exFire(0.6), d, () => {
        spawnAimed(game, en, game.player, {
          n: exN(1, 'odd'), parity: 'odd', type: 'medium', speed: exSp(2.8), color: color2,
        });
      });
    }
    if (style === 'spiral') {
      timer(en, 'sp', exFire(frenzy ? 0.12 : 0.18), d, () => {
        en.data.a = (en.data.a || 0) + 0.35;
        const a = en.data.a;
        for (let i = 0; i < exN(3); i++) {
          const ang = a + (i / 3) * Math.PI * 2;
          game.bullets.push(new Bullet({
            x: en.x, y: en.y, angle: ang, speed: exSp(2.4),
            type: 'dot', color: i % 2 ? color : color2, from: 'enemy',
          }));
        }
      });
      timer(en, 'aim', exFire(0.8), d, () => {
        spawnAimed(game, en, game.player, {
          n: exN(2, 'even'), parity: 'even', type: 'rice', speed: exSp(2.6), color,
        });
      });
    }
    if (style === 'frenzy' || (style === 'final' && frenzy)) {
      timer(en, 'fz', exFire(0.4), d, () => {
        spawnRingAt(game, en.x, en.y, exN(18), exSp(2.5), 'talisman', color, Math.random() * 6);
        spawnAimed(game, en, game.player, {
          n: exN(5, 'odd'), parity: 'odd', type: 'rice', speed: exSp(3.0), color: color2,
        });
      });
      if (style === 'final') {
        timer(en, 'rain2', exFire(0.28), d, () => {
          spawnGravityRain(game, exN(3), 'rice', C.violet, exSp(2.1));
        });
      }
    }
  };
  g.enemies.push(e);
  g.bossRef = e;
}

export {
  elite, boss, timer, LOGICAL_W,
  spawnAimed, spawnRingAt, spawnAimedLaser, spawnGravityRain, Bullet,
};
