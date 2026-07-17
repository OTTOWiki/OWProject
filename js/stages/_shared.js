import { Enemy } from '../entities.js';
import { BALANCE } from '../config.js';
import { scaleBulletCount } from '../patterns.js';

export { scaleBulletCount };

export function mob(x, y, hp, color = '#86efac') {
  return new Enemy({
    x, y, hp, r: 14, type: 'mob', color, score: BALANCE.score.killSmall,
    enterY: y > 0 ? y : 40,
  });
}

export function elite(opts) {
  return new Enemy({
    type: 'elite', r: 22, score: BALANCE.score.killElite, ...opts,
  });
}

export function boss(opts) {
  return new Enemy({
    type: 'boss', r: 36, score: BALANCE.score.killBoss, invuln: 1.2, ...opts,
  });
}

export function timer(e, key, interval, dt, fn) {
  e.timers[key] = (e.timers[key] || 0) - dt;
  if (e.timers[key] <= 0) {
    e.timers[key] = interval * (e._fireMul ?? 1);
    fn();
  }
}

/** 关卡内手写环/扇发数：scaleN(game, n) / scaleN(game, n, 'odd'|'even') */
export function scaleN(game, n, parity = null) {
  return scaleBulletCount(game, n, parity);
}
