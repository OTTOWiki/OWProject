import { mob, elite, boss, timer } from './_shared.js';
import { LOGICAL_W } from '../config.js';
import {
  spawnAimed, spawnRingAt, spawnHLaser, spawnGravityRain, spawnAimedLaser, spawnCrossFall,
} from '../patterns.js';
import { Bullet } from '../entities.js';

/* === A4 门百梁 — 15 chapters (mid x6 + midboss x1 + boss x8) === */

function chapter_a4_mid_1(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.7) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 13) return;
    const e = mob(40 + Math.random() * (LOGICAL_W - 80), -20, 35, '#fbbf24');
    e.vy = 1.1;
    e.script = (en, d, game) => {
      timer(en, 's', 0.75, d, () => {
        spawnAimed(game, en, game.player, { n: 2, parity: 'odd', type: 'dot', speed: 2.3, color: '#fbbf24' });
      });
    };
    g.enemies.push(e);
  };
}

function chapter_a4_mid_2(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.55) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 14) return;
    const e = mob(30 + Math.random() * (LOGICAL_W - 60), -20, 38, '#fcd34d');
    e.vy = 1.0;
    e.script = (en, d, game) => {
      timer(en, 's', 0.6, d, () => {
        spawnAimed(game, en, game.player, { n: 3, parity: 'even', type: 'rice', speed: 2.5, spread: 0.18, color: '#fde68a' });
      });
      timer(en, 'ring', 1.8, d, () => {
        spawnRingAt(game, en.x, en.y, 8, 1.5, 'talisman', '#fbbf24');
      });
    };
    g.enemies.push(e);
  };
}

function chapter_a4_mid_3(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.65) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 13) return;
    for (const side of [-1, 1]) {
      const x = LOGICAL_W / 2 + side * 90;
      const e = mob(x, -15, 34, side === -1 ? '#f59e0b' : '#fbbf24');
      e.vy = 1.3;
      e.script = (en, d, game) => {
        timer(en, 's', 0.7, d, () => {
          spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'dot', speed: 2.6, spread: 0.26, color: en.color });
        });
      };
      g.enemies.push(e);
    }
  };
}

function chapter_a4_midboss(g) {
  const e = elite({
    x: LOGICAL_W / 2, y: 100, hp: 1900, kind: 'menbailiang', color: '#fbbf24', color2: '#fde68a',
    label: '客服部精英', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'aim', 0.8, d, () => {
      spawnAimed(game, en, game.player, { n: 5, parity: 'odd', type: 'talisman', speed: 2.4, spread: 0.16, color: '#fbbf24' });
    });
    timer(en, 'ring', 1.4, d, () => {
      spawnRingAt(game, en.x, en.y, 12, 1.8, 'medium', '#fcd34d', en.age);
    });
    timer(en, 'big', 1.8, d, () => {
      game.bullets.push(new Bullet({
        x: en.x + (Math.random() - 0.5) * 60, y: en.y, vx: 0, vy: 1.3,
        type: 'large', color: '#f59e0b', from: 'enemy', gravity: 0.008, life: 6,
        onSplit: (self) => spawnRingAt(game, self.x, self.y, 8, 1.6, 'dot', '#fde68a'),
      }));
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_a4_mid_4(g) {
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.45) {
      g.laserT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const y = 70 + (g.waveCount * 32) % 400;
      spawnHLaser(g, y, g.waveCount % 2 === 0 ? 1 : -1, '#fbbf24');
    }
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.18) {
      g.rainT = 0;
      g.bullets.push(new Bullet({
        x: Math.random() * LOGICAL_W, y: -10,
        vx: (Math.random() - 0.5) * 0.3, vy: 1.6 + Math.random(),
        type: 'rice', color: '#fde68a', from: 'enemy', gravity: 0.012,
      }));
    }
  };
}

function chapter_a4_mid_5(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    // 辅压先 tick，避免 spawn early-return 卡住雨
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.25) {
      g.rainT = 0;
      spawnGravityRain(g, 1, 'rice', '#fde68a', 1.4);
    }
    g.waveTimer += dt;
    if (g.waveTimer < 0.9) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 12) return;
    const e = elite({
      x: 50 + Math.random() * (LOGICAL_W - 100), y: 70, hp: 240, kind: 'generic', color: '#fcd34d',
    });
    e.vy = 0.3;
    e.script = (en, d, game) => {
      timer(en, 'aim', 0.8, d, () => {
        spawnAimed(game, en, game.player, { n: 3, parity: 'even', type: 'medium', speed: 2.2, spread: 0.24, color: '#f59e0b' });
      });
      timer(en, 'ring', 1.6, d, () => {
        spawnRingAt(game, en.x, en.y, 10, 1.6, 'talisman', '#fbbf24', en.age);
      });
    };
    g.enemies.push(e);
  };
}

function chapter_a4_mid_6(g) {
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.14) {
      g.rainT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      for (let i = 0; i < 2; i++) {
        g.bullets.push(new Bullet({
          x: Math.random() * LOGICAL_W, y: -5,
          vx: (Math.random() - 0.5) * 0.6, vy: 1.8 + Math.random() * 0.5,
          type: 'talisman', color: '#fde68a', from: 'enemy', gravity: 0.01,
        }));
      }
    }
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.5) {
      g.laserT = 0;
      const dummy = { x: LOGICAL_W / 2, y: 30 };
      spawnAimedLaser(g, dummy, g.player, '#fbbf24');
    }
    g.crossT = (g.crossT || 0) + dt;
    if (g.crossT > 1.4) {
      g.crossT = 0;
      spawnCrossFall(g, { type: 'dot', color: '#fcd34d', speed: 1.6, lanes: 6 });
    }
  };
}

function chapter_menbailiang_1(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 2800, kind: 'menbailiang',
    color: '#fbbf24', color2: '#fde68a', label: '门百梁', enterY: 95,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age) * 70;
    timer(en, 'fan', 0.5, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'talisman', speed: 2.6, color: '#fbbf24' });
    });
    timer(en, 'ring', 2.0, d, () => spawnRingAt(game, en.x, en.y, 12, 2.0, 'medium', '#fcd34d'));
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_menbailiang_2(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 3000, kind: 'menbailiang',
    color: '#fbbf24', color2: '#fde68a', label: '门百梁', enterY: 95,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.1) * 80;
    en.y = 95 + Math.cos(en.age * 0.7) * 25;
    timer(en, 'aim', 0.45, d, () => {
      spawnAimed(game, en, game.player, { n: 4, parity: 'even', type: 'rice', speed: 2.6, spread: 0.22, color: '#fcd34d' });
    });
    timer(en, 'spin', 0.12, d, () => {
      en.data.a = (en.data.a || 0) + 0.4;
      for (const side of [-1, 1]) {
        game.bullets.push(new Bullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 1.8, type: 'dot', color: '#f59e0b', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.8, d, () => spawnRingAt(game, en.x, en.y, 14, 1.8, 'talisman', '#fde68a', en.age * 0.7));
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_menbailiang_3(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 3200, kind: 'menbailiang',
    color: '#fbbf24', color2: '#fde68a', label: '门百梁', enterY: 95,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.3) * 90;
    timer(en, 'dual', 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'medium', speed: 2.8, spread: 0.35, color: '#fbbf24' });
    });
    timer(en, 'ring', 1.3, d, () => spawnRingAt(game, en.x, en.y, 16, 2.0, 'talisman', '#fde68a', en.age * 0.5));
    timer(en, 'drop', 1.6, d, () => {
      const bx = 30 + Math.random() * (LOGICAL_W - 60);
      game.bullets.push(new Bullet({
        x: bx, y: -10, vx: 0, vy: 1.4, type: 'large', color: '#f59e0b', from: 'enemy', gravity: 0.01, life: 10,
        onSplit: (self) => spawnRingAt(game, self.x, self.y, 10, 1.8, 'dot', '#fde68a'),
      }));
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_menbailiang_4(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 3400, kind: 'menbailiang',
    color: '#fbbf24', color2: '#fde68a', label: '门百梁', enterY: 95,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.5) * 100;
    en.y = 95 + Math.cos(en.age * 1.2) * 30;
    timer(en, 'aim', 0.35, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'talisman', speed: 2.8, spread: 0.15, color: '#f59e0b' });
    });
    timer(en, 'laser', 0.6, d, () => {
      spawnAimedLaser(game, en, game.player, '#fbbf24');
    });
    timer(en, 'ring', 1.5, d, () => {
      spawnRingAt(game, en.x, en.y, 16, 2.0, 'rice', '#fde68a', en.age * 0.8);
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_menbailiang_5(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 3600, kind: 'menbailiang',
    color: '#fbbf24', color2: '#fde68a', label: '门百梁', enterY: 95,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const speedup = hpRatio < 0.5 ? 0.6 : 0.85;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (hpRatio < 0.5 ? 2.2 : 1.5)) * 110;
    timer(en, 'aim', speedup * 0.55, d, () => {
      const parity = hpRatio < 0.5 ? 'even' : 'odd';
      spawnAimed(game, en, game.player, { n: 3, parity, type: 'medium', speed: 3.0, spread: 0.2, color: '#f59e0b' });
    });
    timer(en, 'ring', speedup * 1.4, d, () => spawnRingAt(game, en.x, en.y, 18, 2.2, 'talisman', '#fde68a', en.age));
    timer(en, 'drop', speedup * 1.5, d, () => {
      spawnGravityRain(game, 2, 'rice', '#fcd34d', 1.6);
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_menbailiang_6(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 3800, kind: 'menbailiang',
    color: '#fbbf24', color2: '#fde68a', label: '门百梁', enterY: 95,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.8) * 100;
    en.y = 95 + Math.cos(en.age * 1.4) * 35;
    timer(en, 'fan', 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: hpRatio < 0.4 ? 7 : 5, parity: 'odd', type: 'rice', speed: hpRatio < 0.4 ? 3.2 : 2.6, color: '#fbbf24' });
    });
    timer(en, 'spin', 0.1, d, () => {
      en.data.a = (en.data.a || 0) + 0.45;
      for (const s of [-1, 1]) {
        game.bullets.push(new Bullet({
          x: en.x + s * 20, y: en.y, angle: en.data.a * s, speed: 2.2, type: 'talisman', color: '#f59e0b', from: 'enemy',
        }));
      }
    });
    timer(en, 'rain', 0.3, d, () => spawnGravityRain(game, 1, 'medium', '#fcd34d', 1.4));
    if (hpRatio < 0.4) {
      timer(en, 'laser', 0.5, d, () => spawnAimedLaser(game, en, game.player, '#fde68a'));
    }
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_menbailiang_7(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 4000, kind: 'menbailiang',
    color: '#fbbf24', color2: '#fde68a', label: '门百梁', enterY: 95,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzyMul = hpRatio < 0.3 ? 0.55 : 0.8;
    timer(en, 'laser', frenzyMul, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'laser', speed: 4.5, color: '#fbbf24', laserLen: 200 });
    });
    timer(en, 'aim', frenzyMul * 1.5, d, () => {
      spawnAimed(game, en, game.player, { n: 7, parity: 'odd', type: 'rice', speed: hpRatio < 0.3 ? 3.5 : 2.8, color: '#f59e0b' });
    });
    timer(en, 'ring', frenzyMul * 2.5, d, () => {
      spawnRingAt(game, en.x, en.y, 20, hpRatio < 0.3 ? 2.8 : 2.0, 'dot', '#fcd34d', en.age);
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_menbailiang_last(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 4800, kind: 'menbailiang',
    color: '#fbbf24', color2: '#fde68a', label: '门百梁', enterY: 95,
  });
  e.script = (en, d, game) => {
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
        game.bullets.push(new Bullet({
          x: en.x, y: en.y, angle: en.data.a + (i * Math.PI * 2) / (frenzy ? 3 : 2), speed: frenzy ? 3.0 : 2.2, type: 'talisman', color: '#fbbf24', from: 'enemy',
        }));
      }
    });
    timer(en, 'laser', frenzy ? 0.3 : 0.5, d, () => {
      for (const side of [-1, 1]) {
        spawnAimedLaser(game, { x: en.x + side * 40, y: en.y }, game.player, '#fcd34d');
      }
    });
    if (frenzy) {
      timer(en, 'rain', 0.15, d, () => spawnGravityRain(game, 3, 'rice', '#fde68a', 2.4));
    }
  };
  g.enemies.push(e);
  g.bossRef = e;
}

export const chapters = [
  { id: 25, name: 'A4-1 方尖碑阵列入口', stage: 'A4', stageKey: 'A4', kind: 'mid',
    unstable: true, music: 'a4_mid', bg: 'a4_mid', duration: 26, build: (g) => chapter_a4_mid_1(g) },
  { id: 26, name: 'A4-2 Unstable 强制推销', stage: 'A4', stageKey: 'A4', kind: 'mid',
    unstable: true, music: 'a4_mid', bg: 'a4_mid', duration: 26, build: (g) => chapter_a4_mid_2(g) },
  { id: 27, name: 'A4-3 特惠海报弹幕', stage: 'A4', stageKey: 'A4', kind: 'mid',
    unstable: true, music: 'a4_mid', bg: 'a4_mid', duration: 24, build: (g) => chapter_a4_mid_3(g) },
  { id: 28, name: 'A4-4 客服部精英', stage: 'A4', stageKey: 'A4', kind: 'midboss',
    music: 'a4_mid', bg: 'a4_mid', duration: 32, build: (g) => chapter_a4_midboss(g) },
  { id: 29, name: 'A4-5 限时通道', stage: 'A4', stageKey: 'A4', kind: 'mid',
    unstable: true, music: 'a4_mid', bg: 'a4_mid', duration: 26, build: (g) => chapter_a4_mid_4(g) },
  { id: 30, name: 'A4-6 捆绑销售压力', stage: 'A4', stageKey: 'A4', kind: 'mid',
    unstable: true, music: 'a4_mid', bg: 'a4_mid', duration: 28, build: (g) => chapter_a4_mid_5(g) },
  { id: 31, name: 'A4-7 最终推销线', stage: 'A4', stageKey: 'A4', kind: 'mid',
    unstable: true, music: 'a4_mid', bg: 'a4_mid', duration: 28, build: (g) => chapter_a4_mid_6(g) },
  { id: 32, name: '门百梁「方尖碑·限时特惠」', stage: 'A4', stageKey: 'A4', kind: 'boss',
    music: 'a4_boss', bg: 'a4_boss', dialogue: 'a4', letter: '方尖碑 · 限时特惠', letterTime: 42,
    build: (g) => chapter_menbailiang_1(g) },
  { id: 33, name: '门百梁「方尖碑·VIP通道」', stage: 'A4', stageKey: 'A4', kind: 'boss',
    music: 'a4_boss', bg: 'a4_boss', letter: '方尖碑 · VIP通道', letterTime: 42,
    build: (g) => chapter_menbailiang_2(g) },
  { id: 34, name: '门百梁「方尖碑·捆绑销售」', stage: 'A4', stageKey: 'A4', kind: 'boss',
    music: 'a4_boss', bg: 'a4_boss', letter: '方尖碑 · 捆绑销售', letterTime: 44,
    build: (g) => chapter_menbailiang_3(g) },
  { id: 35, name: '门百梁「方尖碑·超值套装」', stage: 'A4', stageKey: 'A4', kind: 'boss',
    music: 'a4_boss', bg: 'a4_boss', letter: '方尖碑 · 超值套装', letterTime: 44,
    build: (g) => chapter_menbailiang_4(g) },
  { id: 36, name: '门百梁「方尖碑·限量秒杀」', stage: 'A4', stageKey: 'A4', kind: 'boss',
    music: 'a4_boss', bg: 'a4_boss', letter: '方尖碑 · 限量秒杀', letterTime: 46,
    build: (g) => chapter_menbailiang_5(g) },
  { id: 37, name: '门百梁「方尖碑·会员特权」', stage: 'A4', stageKey: 'A4', kind: 'boss',
    music: 'a4_boss', bg: 'a4_boss', letter: '方尖碑 · 会员特权', letterTime: 46,
    build: (g) => chapter_menbailiang_6(g) },
  { id: 38, name: '门百梁「方尖碑·清仓甩卖」', stage: 'A4', stageKey: 'A4', kind: 'boss',
    music: 'a4_boss', bg: 'a4_boss', letter: '方尖碑 · 清仓甩卖', letterTime: 48,
    build: (g) => chapter_menbailiang_7(g) },
  { id: 39, name: '门百梁「方尖碑·破产清算」', stage: 'A4', stageKey: 'A4', kind: 'boss',
    music: 'a4_boss', bg: 'a4_boss', letter: '方尖碑 · 破产清算', letterTime: 52,
    winDialogue: 'a4_win', loseDialogue: 'a4_lose',
    build: (g) => chapter_menbailiang_last(g) },
];

export const stageSelectEntry = { id: 'A4', label: 'A线4面', desc: '门百梁 — 方尖碑推销战', startChapter: 25 };
