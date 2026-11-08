/**
 * 道中敌机原型（B2 起步）：把「一只怪的开火表」从章节函数里抽出来。
 * 仅覆盖已迁移的 aim 系；特殊章仍可直接写 tracks/raw script。
 */
import { mob, elite, timer } from './_shared.js';
import { LOGICAL_W } from '../config.js';
import { acquireBullet } from '../bulletPool.js';
import { spawnAimed, spawnAimedLaser, spawnRingAt } from '../patterns.js';
import { exHp, exSp, exN, exFire, C } from './ex_shared.js';

export const ARCHETYPES = {
  aimGreen: {
    hp: () => exHp(34),
    color: C.green,
    vy: 1.2,
    fire: {
      key: 's',
      interval: () => exFire(0.9),
      pattern: 'aimed',
      options: (game, en) => ({
        n: 1, parity: 'odd', type: 'dot', speed: exSp(2.3), color: en.color,
      }),
    },
  },
  aimFlank: {
    hp: () => exHp(32),
    color: C.blue,
    vy: 1.15,
    fire: {
      key: 's',
      interval: () => exFire(1.0),
      pattern: 'aimed',
      options: (game, en) => ({
        n: exN(2, 'even'), parity: 'even', type: 'dot',
        speed: exSp(2.2), spread: 0.22, color: en.color,
      }),
    },
  },
  aimBlue28: {
    hp: () => exHp(28),
    color: C.blue,
    vy: 1.15,
    fire: {
      key: 's',
      interval: () => exFire(1.05),
      pattern: 'aimed',
      options: (game, en) => ({
        n: 1, parity: 'odd', type: 'dot', speed: exSp(2.2), color: en.color,
      }),
    },
  },
  aimEcho: {
    hp: () => exHp(30),
    color: C.green,
    vy: 1.0,
    fire: {
      key: 's',
      interval: () => exFire(0.85),
      pattern: 'aimed',
      options: (game, en) => ({
        n: 1, parity: 'odd', type: 'dot', speed: exSp(2.3), color: en.color,
      }),
    },
  },
  aimWhite: {
    hp: () => exHp(28),
    color: C.white,
    vy: 1.25,
    fire: {
      key: 's',
      interval: () => exFire(1.0),
      pattern: 'aimed',
      options: (game, en) => ({
        n: 1, parity: 'odd', type: 'dot', speed: exSp(2.2), color: en.color,
      }),
    },
  },
  streamPink: {
    hp: () => exHp(30),
    color: C.pink,
    vx: 1.6,
    vy: 0.15,
    fire: {
      key: 's',
      interval: () => exFire(0.85),
      pattern: 'aimed',
      options: (game, en) => ({
        n: 1, parity: 'odd', type: 'rice', speed: exSp(2.4), color: en.color,
      }),
    },
  },
  laserCyan: {
    hp: () => exHp(38),
    color: C.cyan,
    vy: 0.2,
    fire: { key: 'L', interval: () => exFire(1.2), pattern: 'aimedLaser', color: C.cyan },
  },
  ringGold: {
    hp: () => exHp(50),
    color: C.gold,
    vy: 1.0,
    tick: (en) => {
      if (en.y > 100 && en.y < 160) en.vy = 0.12;
    },
    fire: {
      key: 'r',
      interval: () => exFire(1.5),
      pattern: 'ringAt',
      options: (game, en) => ({
        n: exN(12), speed: exSp(1.85), type: 'talisman', color: en.color, angle: en.age,
      }),
    },
  },
  ringDuoGold: {
    hp: () => exHp(45),
    color: C.gold,
    vy: 1.0,
    tick: (en) => { if (en.y > 115) en.vy = 0.15; },
    fire: {
      key: 'r',
      interval: () => exFire(1.3),
      pattern: 'ringAt',
      options: (game, en) => ({
        n: exN(10), speed: exSp(1.8), type: 'talisman', color: en.color, angle: en.age,
      }),
    },
  },
  ringDuoViolet: {
    hp: () => exHp(45),
    color: C.violet,
    vy: 1.0,
    tick: (en) => { if (en.y > 165) en.vy = 0.15; },
    fire: {
      key: 'r',
      interval: () => exFire(1.3),
      pattern: 'ringAt',
      options: (game, en) => ({
        n: exN(10), speed: exSp(1.8), type: 'dot', color: en.color, angle: en.age,
      }),
    },
  },
  hoverElitePink: {
    elite: true,
    hp: () => exHp(200),
    color: C.pink,
    vy: 0.25,
    fire: {
      key: 'a', interval: () => exFire(0.95), pattern: 'aimed',
      options: (game, en) => ({
        n: exN(3, 'even'), parity: 'even', type: 'medium',
        speed: exSp(2.0), spread: 0.22, color: en.color,
      }),
    },
  },
  coreGold: {
    elite: true,
    label: '议程核',
    hp: () => exHp(280),
    color: C.gold,
    vy: 0.1,
    fire: {
      key: 'a', interval: () => exFire(1.0), pattern: 'aimed',
      options: (game, en) => ({
        n: exN(3, 'odd'), parity: 'odd', type: 'talisman',
        speed: exSp(2.1), spread: 0.14, color: en.color,
      }),
    },
  },
  laserSniper: {
    hp: () => exHp(40),
    color: C.gold,
    vy: 0.2,
    fires: [
      { key: 'L', interval: () => exFire(1.7), pattern: 'aimedLaser', color: C.gold },
      {
        key: 's', interval: () => exFire(0.7), pattern: 'aimed',
        options: (game, en) => ({
          n: exN(2, 'even'), parity: 'even', type: 'dot',
          speed: exSp(2.3), spread: 0.28, color: C.white,
        }),
      },
    ],
  },
  aimHeavyBlue: {
    hp: () => exHp(26),
    color: C.blue,
    vy: 1.15,
    fire: {
      key: 's', interval: () => exFire(0.5), pattern: 'aimed',
      options: (game, en) => ({
        n: 1, parity: 'odd', type: 'dot', speed: exSp(2.3), color: en.color,
      }),
    },
  },
  aimHeavyPink: {
    hp: () => exHp(26),
    color: C.pink,
    vy: 1.15,
    fire: {
      key: 's', interval: () => exFire(0.5), pattern: 'aimed',
      options: (game, en) => ({
        n: 1, parity: 'odd', type: 'dot', speed: exSp(2.3), color: en.color,
      }),
    },
  },
  crossGreen: {
    hp: () => exHp(32),
    color: C.green,
    vx: 1.8,
    vy: 0.1,
    fire: {
      key: 's', interval: () => exFire(0.7), pattern: 'aimed',
      options: (game, en) => ({
        n: exN(2, 'even'), parity: 'even', type: 'rice',
        speed: exSp(2.2), spread: 0.2, color: en.color,
      }),
    },
  },
  aimViolet30: {
    hp: () => exHp(30),
    color: C.violet,
    vy: 0.9,
    fire: {
      key: 's', interval: () => exFire(0.5), pattern: 'aimed',
      options: (game, en) => ({
        n: 1, parity: 'odd', type: 'dot', speed: exSp(2.4), color: en.color,
      }),
    },
  },
  zigzagRed: {
    hp: () => exHp(34),
    color: C.red,
    vy: 1.1,
    tick: (en, game, dt) => {
      en.data.phase = (en.data.phase || 0) + dt * 2.2;
      en.x = LOGICAL_W / 2 + Math.sin(en.data.phase) * 110;
    },
    fire: {
      key: 's', interval: () => exFire(0.85), pattern: 'aimed',
      options: (game, en) => ({
        n: 1, parity: 'odd', type: 'rice', speed: exSp(2.3), color: en.color,
      }),
    },
  },
  fanBlue: {
    hp: () => exHp(38),
    color: C.blue,
    vy: 0.95,
    tick: (en) => { if (en.y > 90) en.vy = 0.18; },
    fire: {
      key: 'f', interval: () => exFire(0.75), pattern: 'fan',
      options: (game, en) => ({
        step: 0.12, spread: 0.2, count: 1, speed: exSp(2.1),
        type: 'rice', color: C.blue,
      }),
    },
  },
  rainSniperViolet: {
    elite: true,
    hp: () => exHp(150),
    color: C.violet,
    vy: 0.2,
    fire: {
      key: 'a', interval: () => exFire(1.0), pattern: 'aimed',
      options: (game, en) => ({
        n: exN(1, 'odd'), parity: 'odd', type: 'medium',
        speed: exSp(2.4), spread: 0.12, color: en.color,
      }),
    },
  },
  eliteFanGold: {
    elite: true,
    hp: () => exHp(220),
    color: C.gold,
    vy: 0.15,
    fires: [
      {
        key: 'f', interval: () => exFire(0.7), pattern: 'fan',
        options: () => ({
          step: 0.12, spread: 0.15, count: 2, speed: exSp(2.0),
          type: 'rice', color: C.gold,
        }),
      },
      {
        key: 'a', interval: () => exFire(1.2), pattern: 'aimed',
        options: (game, en) => ({
          n: exN(2, 'odd'), parity: 'odd', type: 'talisman',
          speed: exSp(2.3), spread: 0.12, color: C.white,
        }),
      },
    ],
  },
  aimCyan: {
    hp: () => exHp(36),
    color: C.cyan,
    vy: 1.05,
    fire: {
      key: 's',
      interval: () => exFire(0.95),
      pattern: 'aimed',
      options: (game, en) => ({
        n: exN(2, 'even'), parity: 'even', type: 'rice',
        speed: exSp(2.15), spread: 0.2, color: en.color,
      }),
    },
  },
};

/**
 * 按原型生成一只 mob 并挂开火 script。
 * @param {object} g
 * @param {keyof typeof ARCHETYPES} id
 * @param {{ x: number, y?: number }} opts
 */
export function spawnArch(g, id, { x, y = -18, color, hp, vx, vy, data } = {}) {
  const a = ARCHETYPES[id];
  if (!a) throw new Error(`unknown archetype: ${id}`);
  const c = color ?? a.color;
  const made = a.elite
    ? elite({
      x, y, hp: hp ?? a.hp(g), color: c, kind: 'generic',
      ...(a.label ? { label: a.label } : {}),
    })
    : mob(x, y, hp ?? a.hp(g), c);
  const e = made;
  e.vx = vx ?? a.vx ?? 0;
  e.vy = vy ?? a.vy;
  if (data) e.data = { ...e.data, ...data };
  const fires = a.fires || [a.fire];
  e.script = (en, d, game) => {
    a.tick?.(en, game, d);
    for (const f of fires) {
      timer(en, f.key, f.interval(game), d, () => {
        if (f.pattern === 'aimed') {
          spawnAimed(game, en, game.player, f.options(game, en));
        } else if (f.pattern === 'aimedLaser') {
          spawnAimedLaser(game, en, game.player, f.color ?? en.color);
        } else if (f.pattern === 'ringAt') {
          const o = f.options(game, en);
          spawnRingAt(game, en.x, en.y, o.n, o.speed, o.type, o.color, o.angle);
        } else if (f.pattern === 'fan') {
          const o = f.options(game, en);
          en.data.a = (en.data.a ?? Math.PI * 0.55) + o.step;
          for (let i = -o.count; i <= o.count; i += 1) {
            game.spawnBullet(acquireBullet({
              x: en.x, y: en.y, angle: en.data.a + i * o.spread,
              speed: o.speed, type: o.type, color: o.color, from: 'enemy',
            }));
          }
        }
      });
    }
  };
  g.spawnEnemy(e);
  return e;
}
