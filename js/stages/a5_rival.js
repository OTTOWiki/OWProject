import { mob, elite, boss, timer, faceDefaults, midChapter, letterChapter } from './_shared.js';
import { LOGICAL_W } from '../config.js';
import {
  spawnAimed, spawnRingAt, spawnGravityRain, spawnAimedLaser, spawnHLaser, spawnCrossFall,
} from '../patterns.js';
import { Bullet } from '../entities.js';

/* === A5 主角组间冲突 — 17 chapters (mid x8 + midboss x1 + boss x8) === */

function chapter_a5_mid_1(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 1.0) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 11) return;
    const side = g.waveCount % 2 ? 50 : LOGICAL_W - 50;
    const color = g.waveCount % 2 ? '#7dd3fc' : '#f9a8d4';
    const e = elite({ x: side, y: 70, hp: 200, color, kind: 'generic' });
    e.vy = 0.4;
    e.script = (en, d, game) => {
      timer(en, 's', 0.9, d, () => {
        spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'dot', speed: 2.4, spread: 0.25, color: en.color });
      });
    };
    g.spawnEnemy(e);
  };
}

function chapter_a5_mid_2(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.6) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 14) return;
    for (const side of [-1, 1]) {
      const x = LOGICAL_W / 2 + side * 80;
      const color = side === -1 ? '#7dd3fc' : '#f9a8d4';
      const e = mob(x, -20, 35, color);
      e.vy = 1.2;
      e.script = (en, d, game) => {
        timer(en, 's', 0.5, d, () => {
          spawnAimed(game, en, game.player, { n: 3, parity: 'even', type: 'rice', speed: 2.6, spread: 0.14, color: en.color });
        });
      };
      g.spawnEnemy(e);
    }
  };
}

function chapter_a5_mid_3(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.7) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 13) return;
    const x = 40 + (g.waveCount * 35) % (LOGICAL_W - 80);
    const col = g.waveCount % 3 === 0 ? '#c4b5fd' : (g.waveCount % 2 ? '#7dd3fc' : '#f9a8d4');
    const e = mob(x, -20, 36, col);
    e.vy = 1.0;
    e.script = (en, d, game) => {
      timer(en, 's', 0.65, d, () => {
        spawnAimed(game, en, game.player, { n: 2, parity: 'odd', type: 'talisman', speed: 2.5, color: col });
      });
      if (g.waveCount % 3 === 0) {
        timer(en, 'ring', 1.5, d, () => spawnRingAt(game, en.x, en.y, 6, 1.4, 'dot', '#c4b5fd'));
      }
    };
    g.spawnEnemy(e);
  };
}

function chapter_a5_mid_4(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.32) {
      g.rainT = 0;
      g.spawnBullet(new Bullet({
        x: Math.random() * LOGICAL_W, y: -10, vx: 0, vy: 1.5,
        type: 'dot', color: '#a78bfa', from: 'enemy',
      }));
    }
    g.waveTimer += dt;
    if (g.waveTimer < 0.65) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 14) return;
    const side = g.waveCount % 2 ? 45 : LOGICAL_W - 45;
    const color = g.waveCount % 2 ? '#7dd3fc' : '#f9a8d4';
    const e = elite({ x: side, y: 70, hp: 220, color, kind: 'generic' });
    e.vy = 0.35;
    e.script = (en, d, game) => {
      timer(en, 'aim', 0.55, d, () => {
        spawnAimed(game, en, game.player, { n: 3, parity: 'even', type: 'rice', speed: 2.7, spread: 0.16, color: en.color });
      });
      timer(en, 'ring', 1.6, d, () => spawnRingAt(game, en.x, en.y, 8, 1.5, 'talisman', '#c4b5fd', en.age));
    };
    g.spawnEnemy(e);
  };
}

function chapter_a5_midboss(g) {
  const e = elite({
    x: LOGICAL_W / 2, y: 100, hp: 2100, kind: 'rival', color: '#c4b5fd', color2: '#e0f2fe',
    label: '编辑伦理审查', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'ring', 1.8, d, () => {
      spawnRingAt(game, en.x, en.y, 18, 1.6, 'medium', '#c4b5fd', en.age * 0.3);
    });
    timer(en, 'laser', 0.8, d, () => {
      for (const side of [-1, 1]) {
        spawnAimedLaser(game, { x: en.x + side * 30, y: en.y }, game.player, '#a78bfa');
      }
    });
    timer(en, 'drop', 2.0, d, () => {
      game.spawnBullet(new Bullet({
        x: en.x + (Math.random() - 0.5) * 80, y: en.y, vx: 0, vy: 1.2,
        type: 'large', color: '#a78bfa', from: 'enemy', gravity: 0.006, life: 5,
        onSplit: (self) => spawnRingAt(game, self.x, self.y, 8, 1.5, 'dot', '#c4b5fd'),
      }));
    });
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_a5_mid_5(g) {
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.5) {
      g.laserT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const y = 60 + (g.waveCount * 35) % 400;
      spawnHLaser(g, y, g.waveCount % 3 === 0 ? 1 : -1, '#7dd3fc');
    }
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.16) {
      g.rainT = 0;
      const col = Math.random() < 0.5 ? '#7dd3fc' : '#f9a8d4';
      g.spawnBullet(new Bullet({
        x: Math.random() * LOGICAL_W, y: -10,
        vx: (Math.random() - 0.5) * 0.5, vy: 1.8,
        type: 'rice', color: col, from: 'enemy', gravity: 0.01,
      }));
    }
    g.crossT = (g.crossT || 0) + dt;
    if (g.crossT > 1.5) {
      g.crossT = 0;
      spawnCrossFall(g, { type: 'dot', color: '#c4b5fd', speed: 1.5, lanes: 6 });
    }
  };
}

function chapter_a5_mid_6(g) {
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.18) {
      g.rainT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const col = g.waveCount % 2 === 0 ? '#7dd3fc' : '#f9a8d4';
      g.spawnBullet(new Bullet({
        x: Math.random() * LOGICAL_W, y: -10,
        vx: (Math.random() - 0.5) * 0.8, vy: 1.8 + Math.random(),
        type: 'rice', color: col, from: 'enemy', gravity: 0.008,
      }));
    }
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.7) {
      g.laserT = 0;
      const dummy = { x: LOGICAL_W / 2, y: 40 };
      spawnAimedLaser(g, dummy, g.player, g.waveCount % 2 ? '#38bdf8' : '#e879f9');
    }
  };
}

function chapter_a5_mid_7(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.6) {
      g.laserT = 0;
      spawnAimedLaser(g, { x: LOGICAL_W / 2, y: 50 }, g.player, '#a78bfa');
    }
    g.waveTimer += dt;
    if (g.waveTimer < 0.8) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 13) return;
    for (const side of [-1, 1]) {
      const x = LOGICAL_W / 2 + side * 100;
      const color = side === -1 ? '#7dd3fc' : '#f9a8d4';
      const e = mob(x, -15, 38, color);
      e.vy = 1.1;
      e.script = (en, d, game) => {
        timer(en, 's', 0.55, d, () => {
          spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'dot', speed: 2.6, spread: 0.28, color: en.color });
        });
        timer(en, 'ring', 1.8, d, () => spawnRingAt(game, en.x, en.y, 8, 1.4, 'talisman', '#c4b5fd'));
      };
      g.spawnEnemy(e);
    }
  };
}

function chapter_a5_mid_8(g) {
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.12) {
      g.rainT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const col = ['#7dd3fc', '#f9a8d4', '#c4b5fd'][g.waveCount % 3];
      g.spawnBullet(new Bullet({
        x: Math.random() * LOGICAL_W, y: -10,
        vx: (Math.random() - 0.5) * 0.7, vy: 2.0 + Math.random() * 0.5,
        type: 'talisman', color: col, from: 'enemy', gravity: 0.01,
      }));
    }
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.45) {
      g.laserT = 0;
      spawnHLaser(g, 80 + (g.waveCount * 30) % 380, g.waveCount % 2 ? 1 : -1, '#a78bfa');
    }
    g.aimT = (g.aimT || 0) + dt;
    if (g.aimT > 0.65) {
      g.aimT = 0;
      for (const side of [-1, 1]) {
        spawnAimedLaser(g, { x: LOGICAL_W / 2 + side * 80, y: 40 }, g.player, side === -1 ? '#38bdf8' : '#e879f9');
      }
    }
  };
}

function chapter_rival_1(g) {
  const isShama = g.player.def.id === 'shama';
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3200, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  });
  e.script = (en, d, game) => {
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
        game.spawnBullet(new Bullet({
          x: rx, y: ry, angle: Math.random() * Math.PI * 2, speed: 1.8 + Math.random() * 0.8,
          type: 'talisman', color: en.color2, from: 'enemy',
        }));
      }
    });
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_rival_2(g) {
  const isShama = g.player.def.id === 'shama';
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3300, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 0.9) * 60;
    timer(en, 'aim', 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: 4, parity: 'even', type: 'rice', speed: 2.8, spread: 0.2, color: en.color });
    });
    timer(en, 'spin', 0.14, d, () => {
      en.data.a = (en.data.a || 0) + 0.35;
      for (const side of [-1, 1]) {
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 2.0, type: 'talisman', color: en.color2, from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.5, d, () => spawnRingAt(game, en.x, en.y, 12, 1.8, 'medium', en.color, en.age * 0.5));
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_rival_3(g) {
  const isShama = g.player.def.id === 'shama';
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3400, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.2) * 75;
    en.y = 100 + Math.cos(en.age * 0.8) * 20;
    timer(en, 'aim', 0.35, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'talisman', speed: 3.0, color: en.color });
    });
    timer(en, 'laser', 0.55, d, () => spawnAimedLaser(game, en, game.player, en.color2, 45));
    timer(en, 'ring', 1.3, d, () => spawnRingAt(game, en.x, en.y, 14, 2.0, 'rice', en.color, en.age));
    timer(en, 'rain', 1.8, d, () => spawnGravityRain(game, 1, 'dot', en.color2, 1.3));
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_rival_4(g) {
  const isShama = g.player.def.id === 'shama';
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3600, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    timer(en, 'laser', 0.5, d, () => spawnAimedLaser(game, en, game.player, en.color, 45));
    timer(en, 'aim', 0.35, d, () => {
      const n = hpRatio < 0.4 ? 5 : 3;
      spawnAimed(game, en, game.player, { n, parity: 'odd', type: 'talisman', speed: 3.2, color: en.color2 });
    });
    timer(en, 'ring', 1.0, d, () => spawnRingAt(game, en.x, en.y, 16, 2.4, 'medium', en.color, en.age));
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_rival_5(g) {
  const isShama = g.player.def.id === 'shama';
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3800, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (hpRatio < 0.5 ? 3.5 : 2.625)) * 90;
    en.y = 100 + Math.cos(en.age * 2.275) * 25;
    timer(en, 'a', 0.3, d, () => {
      spawnAimed(game, en, game.player, { n: hpRatio < 0.5 ? 5 : 4, parity: 'even', type: 'rice', speed: 3.0, color: en.color });
    });
    timer(en, 'spin', 0.1, d, () => {
      en.data.a = (en.data.a || 0) + 0.4;
      for (const side of [-1, 1]) {
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 2.4, type: 'talisman', color: en.color2, from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.2, d, () => spawnRingAt(game, en.x, en.y, 18, 2.2, 'dot', en.color, en.age));
    if (hpRatio < 0.5) {
      timer(en, 'rain', 0.4, d, () => spawnGravityRain(game, 1, 'medium', en.color2, 1.5));
    }
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_rival_6(g) {
  const isShama = g.player.def.id === 'shama';
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 4000, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  });
  e.script = (en, d, game) => {
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
          game.spawnBullet(new Bullet({
            x: en.x, y: en.y, angle: en.data.a * side, speed: 2.8, type: 'dot', color: '#f472b6', from: 'enemy',
          }));
        }
      });
    }
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_rival_7(g) {
  const isShama = g.player.def.id === 'shama';
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 4500, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.3;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.8) * 110;
    en.y = 100 + Math.cos(en.age * 1.2) * 30;
    timer(en, 'spin', 0.08, d, () => {
      en.data.a = (en.data.a || 0) + 0.5;
      for (let i = 0; i < (frenzy ? 4 : 3); i++) {
        const ang = en.data.a + (i / (frenzy ? 4 : 3)) * Math.PI * 2;
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y, angle: ang, speed: frenzy ? 3.0 : 2.2,
          type: 'talisman', color: en.color, from: 'enemy',
        }));
      }
    });
    timer(en, 'burst', frenzy ? 0.45 : 0.7, d, () => {
      for (const side of [-1, 1]) {
        spawnAimed(game, en, game.player, { n: frenzy ? 3 : 2, parity: 'even', type: 'rice', speed: frenzy ? 3.5 : 2.8, spread: 0.22, color: en.color2 });
      }
    });
    timer(en, 'laser', frenzy ? 0.35 : 0.55, d, () => spawnAimedLaser(game, en, game.player, frenzy ? '#f472b6' : en.color, 120));
    if (frenzy) {
      timer(en, 'rain', 0.25, d, () => spawnGravityRain(game, 2, 'medium', en.color2, 1.8));
    }
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_rival_last(g) {
  const isShama = g.player.def.id === 'shama';
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 5200, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4', color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛', enterY: 100,
  });
  e.script = (en, d, game) => {
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
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y, angle: en.data.a + (i * Math.PI * 2) / (frenzy ? 4 : 2), speed: frenzy ? 3.2 : 2.4, type: 'talisman', color: '#c4b5fd', from: 'enemy',
        }));
      }
    });
    if (frenzy) {
      timer(en, 'rain', 0.2, d, () => spawnGravityRain(game, 3, 'rice', en.color, 2.2));
    }
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

const FACE = faceDefaults('A5');

export const chapters = [
  midChapter(FACE, {
    id: 40,
    name: 'A5-1 渐行渐远',
    kind: 'mid',
    unstable: true,
    duration: 24,
    build: chapter_a5_mid_1,
  }),
  midChapter(FACE, {
    id: 41,
    name: 'A5-2 系统异常 数据分歧',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_a5_mid_2,
  }),
  midChapter(FACE, {
    id: 42,
    name: 'A5-3 署名争议',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_a5_mid_3,
  }),
  midChapter(FACE, {
    id: 43,
    name: 'A5-4 编辑权限争夺',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_a5_mid_4,
  }),
  midChapter(FACE, {
    id: 44,
    name: 'A5-5 编辑伦理审查',
    kind: 'midboss',
    duration: 32,
    build: chapter_a5_midboss,
  }),
  midChapter(FACE, {
    id: 45,
    name: 'A5-6 数据撕裂',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_a5_mid_5,
  }),
  midChapter(FACE, {
    id: 46,
    name: 'A5-7 剑拔弩张',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_a5_mid_6,
  }),
  midChapter(FACE, {
    id: 47,
    name: 'A5-8 世界观碰撞',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_a5_mid_7,
  }),
  midChapter(FACE, {
    id: 48,
    name: 'A5-9 最终对峙',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_a5_mid_8,
  }),
  letterChapter(FACE, {
    id: 49,
    name: '主角「署名权·编辑争执」',
    dialogue: 'a5',
    letter: '署名权 · 编辑争执',
    letterTime: 42,
    build: chapter_rival_1,
  }),
  letterChapter(FACE, {
    id: 50,
    name: '主角「署名权·优先权主张」',
    letter: '署名权 · 优先权主张',
    letterTime: 42,
    build: chapter_rival_2,
  }),
  letterChapter(FACE, {
    id: 51,
    name: '主角「署名权·历史追溯」',
    letter: '署名权 · 历史追溯',
    letterTime: 44,
    build: chapter_rival_3,
  }),
  letterChapter(FACE, {
    id: 52,
    name: '主角「署名权·归属之战」',
    letter: '署名权 · 归属之战',
    letterTime: 44,
    build: chapter_rival_4,
  }),
  letterChapter(FACE, {
    id: 53,
    name: '主角「署名权·编辑争霸」',
    letter: '署名权 · 编辑争霸',
    letterTime: 46,
    build: chapter_rival_5,
  }),
  letterChapter(FACE, {
    id: 54,
    name: '主角「署名权·数据源之争」',
    letter: '署名权 · 数据源之争',
    letterTime: 46,
    build: chapter_rival_6,
  }),
  letterChapter(FACE, {
    id: 55,
    name: '主角「署名权·最后的编辑者」',
    letter: '署名权 · 最后的编辑者',
    letterTime: 48,
    build: chapter_rival_7,
  }),
  letterChapter(FACE, {
    id: 56,
    name: '主角「署名权·共同署名」',
    letter: '署名权 · 共同署名',
    letterTime: 52,
    winDialogue: 'a5_end',
    build: chapter_rival_last,
  }),
]

export const stageSelectEntry = { id: 'A5', label: 'A线5面', desc: '主角组间冲突 — 署名权争夺', startChapter: 40 };
