/**
 * B6 Boss Letter（E06b 从 b6_lastgod.js 拆出，数值不变）
 */
import {
  timer, pushBossRef,
} from '../_shared.js';
import { LOGICAL_W } from '../../config.js';
import {
  spawnAimed, spawnRingAt, spawnGravityRain, spawnAimedLaser,
} from '../../patterns.js';
import { acquireBullet } from '../../bulletPool.js';

const BOSS_B6 = {
  x: LOGICAL_W / 2, y: 100, kind: 'lastgod',
  color: '#a3e635', color2: '#d9f99d', label: '拉斯特神炫', enterY: 100,
};


export function chapter_lastgod_1(g) {
  pushBossRef(g, { ...BOSS_B6, y: 100, enterY: 100, hp: 3800 }, (en, d, game) => {
    timer(en, 'fog', 0.2, d, () => {
      game.spawnBullet(acquireBullet({
        x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5), vy: 1.2,
        type: 'medium', color: '#bef264', from: 'enemy',
      }));
    });
    timer(en, 'aim', 0.5, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'talisman', speed: 2.8, color: '#84cc16' });
    });
    timer(en, 'ring', 2.2, d, () => {
      spawnRingAt(game, en.x, en.y, 12, 1.6, 'dot', '#a3e635', en.age);
    });
  });
}

export function chapter_lastgod_2(g) {
  pushBossRef(g, { ...BOSS_B6, y: 100, enterY: 100, hp: 3900 }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.0) * 60;
    timer(en, 'fog', 0.18, d, () => {
      game.spawnBullet(acquireBullet({
        x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 0.7, vy: 1.1,
        type: 'medium', color: '#bef264', from: 'enemy',
      }));
    });
    timer(en, 'aim', 0.45, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'even', type: 'rice', speed: 2.6, color: '#84cc16' });
    });
    timer(en, 'spin', 0.15, d, () => {
      en.data.a = (en.data.a || 0) + 0.3;
      for (const side of [-1, 1]) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 1.5, type: 'talisman', color: '#65a30d', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.8, d, () => spawnRingAt(game, en.x, en.y, 10, 1.5, 'dot', '#a3e635', en.age * 0.5));
  });
}

export function chapter_lastgod_3(g) {
  pushBossRef(g, { ...BOSS_B6, y: 100, enterY: 100, hp: 4000 }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.2) * 70;
    en.y = 100 + Math.cos(en.age * 0.7) * 18;
    timer(en, 'fog', 0.15, d, () => {
      for (let i = 0; i < 2; i++) {
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 0.6, vy: 1.0 + Math.random(),
          type: 'medium', color: '#bef264', from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: 4, parity: 'odd', type: 'rice', speed: 2.8, color: '#84cc16' });
    });
    timer(en, 'ring', 1.5, d, () => spawnRingAt(game, en.x, en.y, 14, 1.8, 'talisman', '#a3e635', en.age));
    timer(en, 'laser', 0.7, d, () => spawnAimedLaser(game, en, game.player, '#65a30d', 90));
  });
}

export function chapter_lastgod_4(g) {
  pushBossRef(g, { ...BOSS_B6, y: 100, enterY: 100, hp: 4100 }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.4) * 85;
    en.y = 100 + Math.cos(en.age * 0.9) * 22;
    timer(en, 'fog', 0.14, d, () => {
      for (let i = 0; i < 2; i++) {
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 0.8, vy: 1.0 + Math.random(),
          type: 'medium', color: '#bef264', from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', 0.35, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'even', type: 'talisman', speed: 3.0, color: '#84cc16' });
    });
    timer(en, 'ring', 1.4, d, () => spawnRingAt(game, en.x, en.y, 16, 2.0, 'dot', '#a3e635', en.age));
    timer(en, 'rain', 1.8, d, () => spawnGravityRain(game, 1, 'rice', '#65a30d', 1.4));
  });
}

export function chapter_lastgod_5(g) {
  pushBossRef(g, { ...BOSS_B6, y: 100, enterY: 100, hp: 4200 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    timer(en, 'fog', 0.15, d, () => {
      for (let i = 0; i < (hpRatio < 0.5 ? 3 : 2); i++) {
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 0.8, vy: 1.0 + Math.random(),
          type: 'medium', color: '#bef264', from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: 4, parity: 'even', type: 'rice', speed: 3.0, color: '#84cc16' });
    });
    timer(en, 'ring', 1.5, d, () => {
      spawnRingAt(game, en.x, en.y, 16, 2.0, 'talisman', '#a3e635', en.age);
    });
    timer(en, 'laser', 0.7, d, () => spawnAimedLaser(game, en, game.player, '#65a30d', 90));
  });
}

export function chapter_lastgod_6(g) {
  pushBossRef(g, { ...BOSS_B6, y: 100, enterY: 100, hp: 4400 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const fast = hpRatio < 0.35;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (fast ? 2.2 : 1.6)) * (fast ? 100 : 85);
    en.y = 100 + Math.cos(en.age * (fast ? 1.8 : 1.2)) * (fast ? 28 : 22);
    timer(en, 'fog', fast ? 0.1 : 0.15, d, () => {
      for (let i = 0; i < (fast ? 4 : 2); i++) {
        game.spawnBullet(acquireBullet({
          x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 0.9, vy: 1.0 + Math.random(),
          type: 'medium', color: '#bef264', from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', fast ? 0.3 : 0.45, d, () => {
      spawnAimed(game, en, game.player, { n: fast ? 6 : 4, parity: 'odd', type: 'talisman', speed: fast ? 3.5 : 2.8, color: '#84cc16' });
    });
    timer(en, 'ring', fast ? 1.0 : 1.4, d, () => spawnRingAt(game, en.x, en.y, fast ? 20 : 16, fast ? 2.4 : 2.0, 'rice', '#a3e635', en.age));
    if (fast) {
      timer(en, 'laser', 0.5, d, () => spawnAimedLaser(game, en, game.player, '#65a30d'));
    }
  });
}

export function chapter_lastgod_7(g) {
  pushBossRef(g, { ...BOSS_B6, y: 100, enterY: 100, hp: 4600 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const fast = hpRatio < 0.3;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (fast ? 2.8 : 2.0)) * (fast ? 120 : 100);
    en.y = 100 + Math.cos(en.age * (fast ? 2.2 : 1.4)) * (fast ? 32 : 25);
    timer(en, 'storm', fast ? 0.08 : 0.15, d, () => {
      for (let i = 0; i < (fast ? 3 : 1); i++) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: Math.random() * Math.PI * 2, speed: 1.8 + Math.random() * (fast ? 2.5 : 1.8),
          type: Math.random() < 0.3 ? 'large' : 'dot', color: Math.random() < 0.5 ? '#a3e635' : '#4d7c0f', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', fast ? 0.8 : 1.2, d, () => spawnRingAt(game, en.x, en.y, fast ? 22 : 18, fast ? 2.6 : 2.2, 'talisman', '#ecfccb', en.age));
    timer(en, 'aim', fast ? 0.25 : 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: fast ? 7 : 5, parity: 'even', type: 'rice', speed: fast ? 3.5 : 2.8, color: '#84cc16' });
    });
    if (fast) {
      timer(en, 'rain', 0.2, d, () => spawnGravityRain(game, 2, 'medium', '#65a30d', 2.0));
    }
  });
}

export function chapter_lastgod_8(g) {
  pushBossRef(g, { ...BOSS_B6, y: 100, enterY: 100, hp: 6000 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.2;
    timer(en, 'storm', frenzy ? 0.04 : 0.1, d, () => {
      for (let i = 0; i < (frenzy ? 4 : 2); i++) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: Math.random() * Math.PI * 2,
          speed: 2 + Math.random() * (frenzy ? 3.5 : 2.5),
          type: Math.random() < (frenzy ? 0.4 : 0.3) ? 'large' : 'dot',
          color: Math.random() < 0.5 ? '#a3e635' : '#4d7c0f', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', frenzy ? 0.6 : 1.0, d, () => {
      spawnRingAt(game, en.x, en.y, frenzy ? 24 : 20, frenzy ? 3.0 : 2.4, 'rice', '#ecfccb', en.age);
    });
    timer(en, 'aim', frenzy ? 0.4 : 0.6, d, () => {
      spawnAimed(game, en, game.player, { n: frenzy ? 5 : 3, parity: 'odd', type: 'laser', speed: frenzy ? 3.5 : 2.8, color: '#65a30d', laserLen: frenzy ? 200 : 160 });
    });
    if (frenzy) {
      timer(en, 'rain', 0.12, d, () => spawnGravityRain(game, 4, 'medium', '#a3e635', 2.4));
    }
  });
}

export function chapter_lastgod_last(g) {
  pushBossRef(g, { ...BOSS_B6, y: 100, enterY: 100, hp: 7200 }, (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.2;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (frenzy ? 4 : 2.5)) * (frenzy ? 140 : 115);
    en.y = 100 + Math.cos(en.age * (frenzy ? 3.2 : 2.0)) * (frenzy ? 40 : 30);
    timer(en, 'storm', 0.08, d, () => {
      const n = 6;
      for (let i = 0; i < n; i++) {
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: (i / n) * Math.PI * 2,
          speed: 1 + Math.random() * 1.5,
          type: ['dot', 'rice', 'talisman', 'medium', 'large'][Math.floor(Math.random() * 4)],
          color: ['#a3e635', '#4d7c0f', '#bef264', '#65a30d'][Math.floor(Math.random() * 4)], from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', 0.35, d, () => {
      const cfg = frenzy
        ? { n: 2, speed: 1.38, type: 'talisman' }
        : { n: 3, speed: 2, type: 'talisman' };
      spawnAimed(game, en, game.player, { parity: 'odd', color: '#65a30d', spread: 0.08, ...cfg });
    });
    timer(en, 'ring', 0.9, d, () => {
      spawnRingAt(game, en.x, en.y, 8, 1.3, 'rice', '#d9f99d', en.age);
    });
    // 超时强制开狂乱
    if (!frenzy) {
      if (en.age > 60 && hpRatio > 0.4) {
        en.hp = en.maxHp * 0.19;
      } else if (en.age > 90 && hpRatio > 0.2) {
        en.hp = en.maxHp * 0.19;
      }
    }
    if (frenzy) {
      // 左右两个侧翼札弹发弹源（固定方向，不自机狙）
      timer(en, 'wing_l', 0.5, d, () => {
        spawnAimed(game, { x: en.x - 55, y: en.y + 15 }, game.player, { n: 2, parity: 'fixed', baseAngle: Math.PI / 2, type: 'talisman', speed: 1.2, color: '#84cc16', spread: 0.12 });
      });
      timer(en, 'wing_r', 0.5, d, () => {
        spawnAimed(game, { x: en.x + 55, y: en.y + 15 }, game.player, { n: 2, parity: 'fixed', baseAngle: Math.PI / 2, type: 'talisman', speed: 1.2, color: '#84cc16', spread: 0.12 });
      });
    }
  });
}

