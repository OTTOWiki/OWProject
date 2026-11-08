/**
 * 道中敌机原型（B2 起步）：把「一只怪的开火表」从章节函数里抽出来。
 * 仅覆盖已迁移的 aim 系；特殊章仍可直接写 tracks/raw script。
 */
import { mob, timer } from './_shared.js';
import { spawnAimed } from '../patterns.js';
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
export function spawnArch(g, id, { x, y = -18, color, hp, vx, vy } = {}) {
  const a = ARCHETYPES[id];
  if (!a) throw new Error(`unknown archetype: ${id}`);
  const e = mob(x, y, hp ?? a.hp(g), color ?? a.color);
  e.vx = vx ?? a.vx ?? 0;
  e.vy = vy ?? a.vy;
  const f = a.fire;
  e.script = (en, d, game) => {
    timer(en, f.key, f.interval(game), d, () => {
      const opts = f.options(game, en);
      if (f.pattern === 'aimed') spawnAimed(game, en, game.player, opts);
    });
  };
  g.spawnEnemy(e);
  return e;
}
