/**
 * A5 Boss Letter（E06b 从 a5_rival.js 拆出，数值不变）
 */
import {
  timer, pushBossRef,
} from '../_shared.js';
import { LOGICAL_W } from '../../config.js';
import {
  spawnAimed, spawnRingAt, spawnGravityRain, spawnAimedLaser,
} from '../../patterns.js';
import { acquireBullet } from '../../bulletPool.js';

export function chapter_rival_1(g) {
  const isShama = g.player.def.id === 'shama';
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 3200, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  }, (en, d, game) => {
    timer(en, 'a', 0.35, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'dot', speed: 3.0, color: en.color });
    });
    timer(en, 'b', 1.2, d, () => {
      spawnRingAt(game, en.x, en.y, 14, 2.2, 'rice', en.color2, en.age);
    });
    timer(en, 'rand', 0.9, d, () => {
      const rx = 30 + Math.random() * (LOGICAL_W - 60);
      const ry = 30 + Math.random() * 150;
      for (let i = 0; i < 3; i++) {
        game.spawnBullet(acquireBullet({
          x: rx, y: ry, angle: Math.random() * Math.PI * 2, speed: 1.8 + Math.random() * 0.8,
          type: 'talisman', color: en.color2, from: 'enemy',
        }));
      }
    });
  });
}

export function chapter_rival_2(g) {
  const isShama = g.player.def.id === 'shama';
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 3300, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 0.9) * 60;
    timer(en, 'aim', 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: 4, parity: 'even', type: 'rice', speed: 2.8, spread: 0.2, color: en.color });
    });
    timer(en, 'spin', 0.14, d, () => {
      en.data.a = (en.data.a || 0) + 0.35;
      for (const side of [-1, 1]) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 2.0, type: 'talisman', color: en.color2, from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.5, d, () => spawnRingAt(game, en.x, en.y, 12, 1.8, 'medium', en.color, en.age * 0.5));
  });
}

export function chapter_rival_3(g) {
  const isShama = g.player.def.id === 'shama';
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 3400, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.2) * 75;
    en.y = 100 + Math.cos(en.age * 0.8) * 20;
    timer(en, 'aim', 0.35, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'talisman', speed: 3.0, color: en.color });
    });
    timer(en, 'laser', 0.55, d, () => spawnAimedLaser(game, en, game.player, en.color2, 45));
    timer(en, 'ring', 1.3, d, () => spawnRingAt(game, en.x, en.y, 14, 2.0, 'rice', en.color, en.age));
    timer(en, 'rain', 1.8, d, () => spawnGravityRain(game, 1, 'dot', en.color2, 1.3));
  });
}

export function chapter_rival_4(g) {
  const isShama = g.player.def.id === 'shama';
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 3600, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    timer(en, 'laser', 0.5, d, () => spawnAimedLaser(game, en, game.player, en.color, 45));
    timer(en, 'aim', 0.35, d, () => {
      const n = hpRatio < 0.4 ? 5 : 3;
      spawnAimed(game, en, game.player, { n, parity: 'odd', type: 'talisman', speed: 3.2, color: en.color2 });
    });
    timer(en, 'ring', 1.0, d, () => spawnRingAt(game, en.x, en.y, 16, 2.4, 'medium', en.color, en.age));
  });
}

export function chapter_rival_5(g) {
  const isShama = g.player.def.id === 'shama';
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 3800, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (hpRatio < 0.5 ? 3.5 : 2.625)) * 90;
    en.y = 100 + Math.cos(en.age * 2.275) * 25;
    timer(en, 'a', 0.3, d, () => {
      spawnAimed(game, en, game.player, { n: hpRatio < 0.5 ? 5 : 4, parity: 'even', type: 'rice', speed: 3.0, color: en.color });
    });
    timer(en, 'spin', 0.1, d, () => {
      en.data.a = (en.data.a || 0) + 0.4;
      for (const side of [-1, 1]) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 2.4, type: 'talisman', color: en.color2, from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.2, d, () => spawnRingAt(game, en.x, en.y, 18, 2.2, 'dot', en.color, en.age));
    if (hpRatio < 0.5) {
      timer(en, 'rain', 0.4, d, () => spawnGravityRain(game, 1, 'medium', en.color2, 1.5));
    }
  });
}

export function chapter_rival_6(g) {
  const isShama = g.player.def.id === 'shama';
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 4000, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const fast = hpRatio < 0.35;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (fast ? 2.5 : 1.8)) * (fast ? 120 : 100);
    en.y = 100 + Math.cos(en.age * (fast ? 2 : 1.4)) * (fast ? 35 : 25);
    timer(en, 'laser', fast ? 0.3 : 0.5, d, () => {
      spawnAimedLaser(game, en, game.player, en.color, 45);
    });
    timer(en, 'aim', fast ? 0.25 : 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: fast ? 6 : 4, parity: 'odd', type: 'rice', speed: fast ? 3.5 : 2.8, color: en.color });
    });
    timer(en, 'ring', fast ? 0.9 : 1.3, d, () => spawnRingAt(game, en.x, en.y, fast ? 20 : 16, fast ? 2.6 : 2.2, 'talisman', en.color2, en.age));
    if (fast) {
      timer(en, 'spin', 0.1, d, () => {
        en.data.a = (en.data.a || 0) + 0.55;
        for (const side of [-1, 1]) {
          game.spawnBullet(acquireBullet({
            x: en.x, y: en.y, angle: en.data.a * side, speed: 2.8, type: 'dot', color: '#f472b6', from: 'enemy',
          }));
        }
      });
    }
  });
}

export function chapter_rival_7(g) {
  const isShama = g.player.def.id === 'shama';
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 4500, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.3;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.8) * 110;
    en.y = 100 + Math.cos(en.age * 1.2) * 30;
    timer(en, 'spin', 0.08, d, () => {
      en.data.a = (en.data.a || 0) + 0.5;
      for (let i = 0; i < (frenzy ? 4 : 3); i++) {
        const ang = en.data.a + (i / (frenzy ? 4 : 3)) * Math.PI * 2;
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: ang, speed: frenzy ? 3.0 : 2.2,
          type: 'talisman', color: en.color, from: 'enemy',
        }));
      }
    });
    timer(en, 'burst', frenzy ? 0.45 : 0.7, d, () => {
      const burst = { n: frenzy ? 3 : 2, parity: 'even', type: 'rice', speed: frenzy ? 3.5 : 2.8, spread: 0.22, color: en.color2 };
      spawnAimed(game, en, game.player, burst);
      spawnAimed(game, en, game.player, burst);
    });
    timer(en, 'laser', frenzy ? 0.35 : 0.55, d, () => spawnAimedLaser(game, en, game.player, frenzy ? '#f472b6' : en.color, 120));
    if (frenzy) {
      timer(en, 'rain', 0.25, d, () => spawnGravityRain(game, 2, 'medium', en.color2, 1.8));
    }
  });
}

export function chapter_rival_last(g) {
  const isShama = g.player.def.id === 'shama';
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 5200, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.25;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (frenzy ? 3.5 : 2.2)) * (frenzy ? 140 : 110);
    en.y = 100 + Math.cos(en.age * (frenzy ? 2.8 : 1.6)) * (frenzy ? 40 : 30);
    timer(en, 'a', frenzy ? 0.1 : 0.22, d, () => {
      spawnAimed(game, en, game.player, { n: frenzy ? 9 : 7, parity: 'odd', type: 'large', speed: frenzy ? 4.0 : 3.2, color: en.color, w: 16, h: 16, r: 6 });
    });
    timer(en, 'laser', frenzy ? 0.2 : 0.35, d, () => {
      for (const side of [-1, 1]) {
        spawnAimedLaser(game, { x: en.x + side * 35, y: en.y }, game.player, frenzy ? '#f472b6' : en.color2, 45);
      }
    });
    timer(en, 'spin', frenzy ? 0.06 : 0.12, d, () => {
      en.data.a = (en.data.a || 0) + (frenzy ? 0.7 : 0.45);
      for (let i = 0; i < (frenzy ? 4 : 2); i++) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: en.data.a + (i * Math.PI * 2) / (frenzy ? 4 : 2), speed: frenzy ? 3.2 : 2.4, type: 'talisman', color: '#c4b5fd', from: 'enemy',
        }));
      }
    });
    if (frenzy) {
      timer(en, 'rain', 0.2, d, () => spawnGravityRain(game, 3, 'rice', en.color, 2.2));
    }
  });
}

