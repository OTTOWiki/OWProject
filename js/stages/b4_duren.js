import { mob, elite, boss, timer } from './_shared.js';
import { LOGICAL_W } from '../config.js';
import {
  spawnAimed, spawnRingAt, spawnGravityRain, spawnAimedLaser, spawnHLaser, spawnCrossFall,
} from '../patterns.js';
import { Bullet } from '../entities.js';

/* === B4 赌人时尚 — 15 chapters (mid x6 + midboss x1 + boss x8) === */

function chapter_b4_mid_1(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.7) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 13) return;
    const e = mob(30 + Math.random() * (LOGICAL_W - 60), -10, 32, '#fb7185');
    e.vy = 1.3;
    e.vx = (g.waveCount % 2 ? 0.8 : -0.8);
    e.script = (en, d, game) => {
      timer(en, 's', 0.55, d, () => {
        spawnAimed(game, en, game.player, { n: 1, parity: 'odd', type: 'dot', speed: 2.5, color: '#fb7185' });
      });
    };
    g.spawnEnemy(e);
  };
}

function chapter_b4_mid_2(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.5) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 14) return;
    const e = mob(40 + Math.random() * (LOGICAL_W - 80), -20, 38, '#f43f5e');
    e.vy = 1.0;
    e.vx = (Math.random() - 0.5) * 1.5;
    e.script = (en, d, game) => {
      timer(en, 'ring', 1.5, d, () => {
        spawnRingAt(game, en.x, en.y, 10, 1.8, 'talisman', '#fb7185', en.age);
      });
    };
    g.spawnEnemy(e);
  };
}

function chapter_b4_mid_3(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.65) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 13) return;
    for (const side of [-1, 1]) {
      const x = LOGICAL_W / 2 + side * 80;
      const e = mob(x, -18, 35, side === -1 ? '#fb7185' : '#f43f5e');
      e.vy = 1.2;
      e.script = (en, d, game) => {
        timer(en, 's', 0.6, d, () => {
          spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'rice', speed: 2.4, spread: 0.2, color: en.color });
        });
      };
      g.spawnEnemy(e);
    }
  };
}

function chapter_b4_midboss(g) {
  const e = elite({
    x: LOGICAL_W / 2, y: 100, hp: 1900, kind: 'duren', color: '#fb7185', color2: '#fda4af',
    label: '创车精英', enterY: 100,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 2.5) * 130;
    timer(en, 'aim', 0.7, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'even', type: 'talisman', speed: 2.8, color: '#f43f5e' });
    });
    timer(en, 'ring', 1.4, d, () => {
      spawnRingAt(game, en.x, en.y, 14, 1.6, 'dot', '#fda4af', en.age);
    });
    timer(en, 'spin', 0.15, d, () => {
      en.data.a = (en.data.a || 0) + 0.5;
      game.spawnBullet(new Bullet({
        x: en.x, y: en.y, angle: en.data.a, speed: 2.2, type: 'rice', color: '#e11d48', from: 'enemy',
      }));
      game.spawnBullet(new Bullet({
        x: en.x, y: en.y, angle: en.data.a + Math.PI, speed: 2.2, type: 'rice', color: '#f43f5e', from: 'enemy',
      }));
    });
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_b4_mid_4(g) {
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.14) {
      g.rainT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      g.spawnBullet(new Bullet({
        x: Math.random() * LOGICAL_W, y: -10,
        vx: (Math.random() - 0.5) * 1.2, vy: 1.6 + Math.random(),
        type: 'rice', color: '#fda4af', from: 'enemy', gravity: 0.01,
      }));
    }
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.6) {
      g.laserT = 0;
      spawnAimedLaser(g, { x: LOGICAL_W / 2, y: 30 }, g.player, '#f43f5e');
    }
  };
}

function chapter_b4_mid_5(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.2) {
      g.rainT = 0;
      spawnGravityRain(g, 1, 'rice', '#fb7185', 1.3);
    }
    g.waveTimer += dt;
    if (g.waveTimer < 0.8) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 13) return;
    const e = elite({
      x: 40 + Math.random() * (LOGICAL_W - 80), y: 70, hp: 240, kind: 'generic', color: '#fb7185',
    });
    e.vy = 0.35;
    e.vx = (Math.random() - 0.5) * 1.0;
    e.script = (en, d, game) => {
      timer(en, 'aim', 0.55, d, () => {
        spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'talisman', speed: 2.6, spread: 0.16, color: '#f43f5e' });
      });
      timer(en, 'ring', 1.6, d, () => spawnRingAt(game, en.x, en.y, 8, 1.5, 'dot', '#fda4af', en.age));
    };
    g.spawnEnemy(e);
  };
}

function chapter_b4_mid_6(g) {
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.45) {
      g.laserT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const y = 70 + (g.waveCount * 30) % 400;
      spawnHLaser(g, y, g.waveCount % 2 ? 1 : -1, '#f43f5e');
    }
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.12) {
      g.rainT = 0;
      for (let i = 0; i < 2; i++) {
        g.spawnBullet(new Bullet({
          x: Math.random() * LOGICAL_W, y: -5, vx: (Math.random() - 0.5) * 0.7, vy: 1.8 + Math.random() * 0.5,
          type: 'talisman', color: '#fda4af', from: 'enemy', gravity: 0.01,
        }));
      }
    }
    g.crossT = (g.crossT || 0) + dt;
    if (g.crossT > 1.5) {
      g.crossT = 0;
      spawnCrossFall(g, { type: 'dot', color: '#fb7185', speed: 1.6, lanes: 5 });
    }
  };
}

function chapter_duren_1(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3100, kind: 'duren',
    color: '#fb7185', color2: '#fda4af', label: '赌人时尚', enterY: 100,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 2) * 100;
    en.y = 100 + Math.cos(en.age * 1.5) * 30;
    timer(en, 's', 0.3, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'large', speed: 2.5, color: '#fb7185' });
    });
    timer(en, 'spin', 0.1, d, () => {
      en.data.a = (en.data.a || 0) + 0.5;
      game.spawnBullet(new Bullet({
        x: en.x, y: en.y, angle: en.data.a, speed: 2.8, type: 'talisman', color: '#f43f5e', from: 'enemy',
      }));
    });
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_duren_2(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3300, kind: 'duren',
    color: '#fb7185', color2: '#fda4af', label: '赌人时尚', enterY: 100,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 2.2) * 110;
    en.y = 100 + Math.cos(en.age * 1.8) * 35;
    timer(en, 'aim', 0.28, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'even', type: 'rice', speed: 2.6, spread: 0.22, color: '#fb7185' });
    });
    timer(en, 'spin', 0.12, d, () => {
      en.data.a = (en.data.a || 0) + 0.45;
      for (const side of [-1, 1]) {
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 2.4, type: 'talisman', color: '#e11d48', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.6, d, () => spawnRingAt(game, en.x, en.y, 12, 1.8, 'dot', '#fda4af', en.age));
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_duren_3(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3500, kind: 'duren',
    color: '#fb7185', color2: '#fda4af', label: '赌人时尚', enterY: 100,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 2.5) * 115;
    en.y = 100 + Math.cos(en.age * 2) * 40;
    timer(en, 's', 0.25, d, () => {
      spawnAimed(game, en, game.player, { n: 4, parity: 'even', type: 'medium', speed: 2.8, color: '#fb7185' });
    });
    timer(en, 'spin', 0.08, d, () => {
      en.data.a = (en.data.a || 0) + 0.55;
      game.spawnBullet(new Bullet({
        x: en.x, y: en.y, angle: en.data.a, speed: 3.0, type: 'talisman', color: '#e11d48', from: 'enemy',
      }));
    });
    timer(en, 'ring', 1.8, d, () => {
      spawnRingAt(game, en.x, en.y, 14, 2.0, 'rice', '#fda4af', en.age * 0.5);
    });
    timer(en, 'laser', 0.7, d, () => spawnAimedLaser(game, en, game.player, '#f43f5e'));
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_duren_4(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3700, kind: 'duren',
    color: '#fb7185', color2: '#fda4af', label: '赌人时尚', enterY: 100,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const fast = hpRatio < 0.5 ? 0.7 : 1.0;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 2.8) * 120;
    en.y = 100 + Math.cos(en.age * 2.2) * 45;
    timer(en, 'a', fast * 0.25, d, () => {
      spawnAimed(game, en, game.player, { n: hpRatio < 0.5 ? 5 : 4, parity: 'odd', type: 'talisman', speed: 2.8, color: '#fb7185' });
    });
    timer(en, 'spin', fast * 0.09, d, () => {
      en.data.a = (en.data.a || 0) + (hpRatio < 0.5 ? 0.65 : 0.5);
      for (const side of [-1, 1]) {
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 3.2, type: 'rice', color: '#f43f5e', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', fast * 1.4, d, () => spawnRingAt(game, en.x, en.y, 16, 2.2, 'medium', '#fda4af', en.age));
    if (hpRatio < 0.5) {
      timer(en, 'rain', 0.25, d, () => spawnGravityRain(game, 2, 'dot', '#e11d48', 1.6));
    }
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_duren_5(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3900, kind: 'duren',
    color: '#fb7185', color2: '#fda4af', label: '赌人时尚', enterY: 100,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 3) * 120;
    en.y = 100 + Math.cos(en.age * 2.5) * 40;
    timer(en, 's', 0.2, d, () => {
      spawnAimed(game, en, game.player, { n: hpRatio < 0.4 ? 5 : 3, parity: 'even', type: 'large', speed: 3.0, spread: 0.3, color: '#fb7185' });
    });
    timer(en, 'spin', 0.07, d, () => {
      en.data.a = (en.data.a || 0) + 0.6;
      for (let i = 0; i < (hpRatio < 0.4 ? 3 : 1); i++) {
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y, angle: en.data.a + (i * Math.PI * 2) / 3, speed: hpRatio < 0.4 ? 3.5 : 2.6, type: 'talisman', color: '#e11d48', from: 'enemy',
        }));
      }
    });
    timer(en, 'laser', 0.55, d, () => spawnAimedLaser(game, en, game.player, '#f43f5e'));
    timer(en, 'ring', 1.5, d, () => spawnRingAt(game, en.x, en.y, 18, 2.4, 'rice', '#fda4af', en.age));
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_duren_6(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 4200, kind: 'duren',
    color: '#fb7185', color2: '#fda4af', label: '赌人时尚', enterY: 100,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 3.2) * 125;
    en.y = 100 + Math.cos(en.age * 2.8) * 45;
    timer(en, 'aim', 0.25, d, () => {
      spawnAimed(game, en, game.player, { n: 4, parity: 'odd', type: 'talisman', speed: 3.2, color: '#f43f5e' });
    });
    timer(en, 'spin', 0.08, d, () => {
      en.data.a = (en.data.a || 0) + 0.6;
      for (const side of [-1, 1]) {
        game.spawnBullet(new Bullet({
          x: en.x + side * 15, y: en.y, angle: en.data.a * side, speed: 3.0, type: 'rice', color: '#e11d48', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.2, d, () => spawnRingAt(game, en.x, en.y, 18, 2.4, 'medium', '#fda4af', en.age));
    timer(en, 'rain', 0.25, d, () => spawnGravityRain(game, 2, 'dot', '#fb7185', 1.8));
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_duren_7(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 4800, kind: 'duren',
    color: '#fb7185', color2: '#fda4af', label: '赌人时尚', enterY: 100,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.25;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (frenzy ? 4 : 2.5)) * (frenzy ? 140 : 120);
    en.y = 100 + Math.cos(en.age * (frenzy ? 3 : 2)) * (frenzy ? 50 : 40);
    timer(en, 's', frenzy ? 0.14 : 0.25, d, () => {
      spawnAimed(game, en, game.player, { n: frenzy ? 5 : 3, parity: 'odd', type: frenzy ? 'large' : 'medium', speed: frenzy ? 3.5 : 2.8, color: '#fb7185' });
    });
    timer(en, 'spin', frenzy ? 0.04 : 0.08, d, () => {
      en.data.a = (en.data.a || 0) + (frenzy ? 0.8 : 0.55);
      for (let i = 0; i < (frenzy ? 2 : 1); i++) {
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y, angle: en.data.a + i * Math.PI, speed: frenzy ? 3.5 : 2.8, type: 'talisman', color: '#e11d48', from: 'enemy',
        }));
      }
    });
    if (frenzy) {
      timer(en, 'rain', 0.2, d, () => spawnGravityRain(game, 3, 'rice', '#fda4af', 1.8));
    }
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_duren_last(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 5600, kind: 'duren',
    color: '#fb7185', color2: '#fda4af', label: '赌人时尚', enterY: 100,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.2;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (frenzy ? 4.5 : 3)) * (frenzy ? 150 : 130);
    en.y = 100 + Math.cos(en.age * (frenzy ? 3.5 : 2.5)) * (frenzy ? 55 : 45);
    timer(en, 'storm', frenzy ? 0.06 : 0.14, d, () => {
      for (let i = 0; i < (frenzy ? 3 : 1); i++) {
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y, angle: Math.random() * Math.PI * 2, speed: 2 + Math.random() * (frenzy ? 3.5 : 2.5),
          type: ['dot', 'rice', 'talisman'][Math.floor(Math.random() * 3)], color: Math.random() < 0.5 ? '#fb7185' : '#e11d48', from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', frenzy ? 0.15 : 0.28, d, () => {
      spawnAimed(game, en, game.player, { n: frenzy ? 7 : 5, parity: 'odd', type: frenzy ? 'large' : 'talisman', speed: frenzy ? 3.8 : 3.0, color: '#f43f5e' });
    });
    timer(en, 'spin', frenzy ? 0.05 : 0.1, d, () => {
      en.data.a = (en.data.a || 0) + (frenzy ? 0.8 : 0.55);
      for (const side of [-1, 1]) {
        for (const off of [-1, 1]) {
          game.spawnBullet(new Bullet({
            x: en.x + side * 20, y: en.y + off * 10, angle: en.data.a * side * off, speed: frenzy ? 3.2 : 2.4, type: 'rice', color: '#fda4af', from: 'enemy',
          }));
        }
      }
    });
    if (frenzy) {
      timer(en, 'laser', 0.3, d, () => {
        for (const side of [-1, 1]) {
          spawnAimedLaser(game, { x: en.x + side * 35, y: en.y }, game.player, '#e11d48');
        }
      });
      timer(en, 'rain', 0.15, d, () => spawnGravityRain(game, 4, 'medium', '#fb7185', 2.2));
    }
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

export const chapters = [
  { id: 77, name: 'B4-1 善雅乡入口', stage: 'B4', stageKey: 'B4', kind: 'mid',
    unstable: true, music: 'b4_mid', bg: 'b4_mid', duration: 24, build: (g) => chapter_b4_mid_1(g) },
  { id: 78, name: 'B4-2 Unstable 创车编队', stage: 'B4', stageKey: 'B4', kind: 'mid',
    unstable: true, music: 'b4_mid', bg: 'b4_mid', duration: 26, build: (g) => chapter_b4_mid_2(g) },
  { id: 79, name: 'B4-3 哲学信徒', stage: 'B4', stageKey: 'B4', kind: 'mid',
    unstable: true, music: 'b4_mid', bg: 'b4_mid', duration: 24, build: (g) => chapter_b4_mid_3(g) },
  { id: 80, name: 'B4-4 创车精英', stage: 'B4', stageKey: 'B4', kind: 'midboss',
    music: 'b4_mid', bg: 'b4_mid', duration: 32, build: (g) => chapter_b4_midboss(g) },
  { id: 81, name: 'B4-5 哲学洗脑', stage: 'B4', stageKey: 'B4', kind: 'mid',
    unstable: true, music: 'b4_mid', bg: 'b4_mid', duration: 26, build: (g) => chapter_b4_mid_4(g) },
  { id: 82, name: 'B4-6 狂人语录', stage: 'B4', stageKey: 'B4', kind: 'mid',
    unstable: true, music: 'b4_mid', bg: 'b4_mid', duration: 28, build: (g) => chapter_b4_mid_5(g) },
  { id: 83, name: 'B4-7 创世独轮', stage: 'B4', stageKey: 'B4', kind: 'mid',
    unstable: true, music: 'b4_mid', bg: 'b4_mid', duration: 28, build: (g) => chapter_b4_mid_6(g) },
  { id: 84, name: '赌人时尚「独轮创车·灵魂洗涤」', stage: 'B4', stageKey: 'B4', kind: 'boss',
    music: 'b4_boss', bg: 'b4_boss', dialogue: 'b4', letter: '独轮创车 · 灵魂洗涤', letterTime: 42,
    build: (g) => chapter_duren_1(g) },
  { id: 85, name: '赌人时尚「独轮创车·哲学创击」', stage: 'B4', stageKey: 'B4', kind: 'boss',
    music: 'b4_boss', bg: 'b4_boss', letter: '独轮创车 · 哲学创击', letterTime: 42,
    build: (g) => chapter_duren_2(g) },
  { id: 86, name: '赌人时尚「独轮创车·狂妄乱舞」', stage: 'B4', stageKey: 'B4', kind: 'boss',
    music: 'b4_boss', bg: 'b4_boss', letter: '独轮创车 · 狂妄乱舞', letterTime: 44,
    build: (g) => chapter_duren_3(g) },
  { id: 87, name: '赌人时尚「独轮创车·疯狂创击」', stage: 'B4', stageKey: 'B4', kind: 'boss',
    music: 'b4_boss', bg: 'b4_boss', letter: '独轮创车 · 疯狂创击', letterTime: 44,
    build: (g) => chapter_duren_4(g) },
  { id: 88, name: '赌人时尚「独轮创车·铁皮人审判」', stage: 'B4', stageKey: 'B4', kind: 'boss',
    music: 'b4_boss', bg: 'b4_boss', letter: '独轮创车 · 铁皮人审判', letterTime: 46,
    build: (g) => chapter_duren_5(g) },
  { id: 89, name: '赌人时尚「独轮创车·失算连击」', stage: 'B4', stageKey: 'B4', kind: 'boss',
    music: 'b4_boss', bg: 'b4_boss', letter: '独轮创车 · 失算连击', letterTime: 46,
    build: (g) => chapter_duren_6(g) },
  { id: 90, name: '赌人时尚「独轮创车·终极创世」', stage: 'B4', stageKey: 'B4', kind: 'boss',
    music: 'b4_boss', bg: 'b4_boss', letter: '独轮创车 · 终极创世', letterTime: 48,
    build: (g) => chapter_duren_7(g) },
  { id: 91, name: '赌人时尚「独轮创车·无能狂怒」', stage: 'B4', stageKey: 'B4', kind: 'boss',
    music: 'b4_boss', bg: 'b4_boss', letter: '独轮创车 · 无能狂怒', letterTime: 52,
    winDialogue: 'b4_win', loseDialogue: 'b4_lose',
    build: (g) => chapter_duren_last(g) },
];

export const stageSelectEntry = { id: 'B4', label: 'B线4面', desc: '赌人时尚 — 独轮创车冲击', startChapter: 77 };
