import { mob, elite, boss, timer, faceDefaults, midChapter, letterChapter } from './_shared.js';
import { LOGICAL_W } from '../config.js';
import {
  spawnAimed, spawnRingAt, spawnGravityRain, spawnAimedLaser, spawnHLaser, spawnCrossFall,
} from '../patterns.js';
import { Bullet } from '../entities.js';

/* === B5 棍电噢哆 — 17 chapters (mid x8 + midboss x1 + boss x8) === */

function chapter_b5_mid_1(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.5) {
      g.rainT = 0;
      g.spawnBullet(new Bullet({
        x: Math.random() * LOGICAL_W, y: -5, vx: 0, vy: 2.0,
        type: 'rice', color: '#fdba74', from: 'enemy', gravity: 0.015,
      }));
    }
    g.waveTimer += dt;
    if (g.waveTimer < 0.8) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 12) return;
    const x = 40 + (g.waveCount * 35) % (LOGICAL_W - 80);
    const e = mob(x, -20, 32, '#fb923c');
    e.vy = 0.8 + (g.waveCount % 3) * 0.3;
    e.script = (en, d, game) => {
      timer(en, 's', 0.7, d, () => {
        spawnAimed(game, en, game.player, { n: 1, parity: 'odd', type: 'dot', speed: 2.6, color: '#fb923c' });
      });
    };
    g.spawnEnemy(e);
  };
}

function chapter_b5_mid_2(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.55) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 14) return;
    const e = mob(50 + Math.random() * (LOGICAL_W - 100), -20, 36, '#f97316');
    e.vy = 1.0;
    e.script = (en, d, game) => {
      timer(en, 's', 0.6, d, () => {
        spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'talisman', speed: 2.5, color: '#fb923c' });
      });
      timer(en, 'ring', 1.6, d, () => {
        spawnRingAt(game, en.x, en.y, 8, 1.4, 'dot', '#fdba74', (g.waveCount || 0) * 0.5);
      });
    };
    g.spawnEnemy(e);
  };
}

function chapter_b5_mid_3(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.7) {
      g.laserT = 0;
      const dummy = { x: LOGICAL_W / 2, y: 30 };
      spawnAimedLaser(g, dummy, g.player, '#fb923c');
    }
    g.waveTimer += dt;
    if (g.waveTimer < 0.65) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 13) return;
    const side = g.waveCount % 2 ? 38 : LOGICAL_W - 38;
    const e = mob(side, 50 + (g.waveCount % 3) * 40, 34, '#f97316');
    e.script = (en, d, game) => {
      timer(en, 's', 0.55, d, () => {
        spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'rice', speed: 2.5, spread: 0.2, color: '#fdba74' });
      });
    };
    g.spawnEnemy(e);
  };
}

function chapter_b5_mid_4(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.3) {
      g.rainT = 0;
      spawnGravityRain(g, 1, 'rice', '#fdba74', 1.4);
    }
    g.waveTimer += dt;
    if (g.waveTimer < 0.7) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 14) return;
    const e = elite({
      x: 50 + Math.random() * (LOGICAL_W - 100), y: 75, hp: 230, kind: 'generic', color: '#f97316',
    });
    e.vy = 0.3;
    e.script = (en, d, game) => {
      timer(en, 'aim', 0.6, d, () => {
        spawnAimed(game, en, game.player, { n: 3, parity: 'even', type: 'talisman', speed: 2.6, spread: 0.18, color: '#fdba74' });
      });
      timer(en, 'ring', 1.6, d, () => spawnRingAt(game, en.x, en.y, 8, 1.5, 'dot', '#fb923c', en.age));
    };
    g.spawnEnemy(e);
  };
}

function chapter_b5_midboss(g) {
  const e = elite({
    x: LOGICAL_W / 2, y: 100, hp: 2000, kind: 'gundian', color: '#fb923c', color2: '#fdba74',
    label: '中单影卫', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'ring', 1.4, d, () => {
      spawnRingAt(game, en.x, en.y, 12, 1.8, 'talisman', '#fb923c', en.age);
    });
    timer(en, 'side', 0.5, d, () => {
      const side = en.data.side ? -1 : 1;
      en.data.side = !en.data.side;
      spawnAimed(game, { x: en.x + side * 40, y: en.y }, game.player, { n: 2, parity: 'even', type: 'rice', speed: 2.8, color: '#f97316' });
    });
    timer(en, 'laser', 0.8, d, () => spawnAimedLaser(game, en, game.player, '#fdba74'));
    timer(en, 'big', 2.0, d, () => {
      game.spawnBullet(new Bullet({
        x: en.x + (Math.random() - 0.5) * 70, y: en.y, vx: 0, vy: 1.0,
        type: 'large', color: '#fb923c', from: 'enemy', gravity: 0.005, life: 6,
        onSplit: (self) => spawnRingAt(game, self.x, self.y, 6, 1.4, 'dot', '#fdba74'),
      }));
    });
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_b5_mid_5(g) {
  g.waveFn = (dt) => {
    g.waveTimer = (g.waveTimer || 0) + dt;
    if (g.waveTimer < 0.85) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 16) return;

    const side = g.waveCount % 2 ? 1 : -1;
    const y = 60 + (g.waveCount * 23) % 380;
    const e = mob(side > 0 ? -20 : LOGICAL_W + 20, y, 30, side > 0 ? '#fb923c' : '#fdba74');
    e.hp = 30;
    e.vx = -side * 2.2;
    e.vy = Math.sin(g.waveCount * 1.3) * 0.6;
    e.script = (en, d, game) => {
      timer(en, 'aim', 0.35, d, () => {
        spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'rice', speed: 2.4, spread: 0.15, color: '#f97316' });
      });
      timer(en, 'ring', 0.7, d, () => {
        spawnRingAt(game, en.x, en.y, { n: 8, speed: 1.6 + Math.random() * 0.4, color: '#fdba74', type: 'dot' });
      });
      timer(en, 'reverse', 1.2, d, () => {
        en.vx = -en.vx;
      });
    };
    g.spawnEnemy(e);

    if (g.waveCount % 2 === 0) {
      const filler = mob(side > 0 ? -20 : LOGICAL_W + 20, 60 + Math.random() * 380, 15, '#fda4af');
      filler.hp = 12;
      filler.vx = -side * 3.0;
      filler.script = (en, d2, game) => {
        timer(en, 'f', 0.5, d2, () => {
          spawnAimed(game, en, game.player, { n: 2, type: 'talisman', speed: 2.8, color: '#fda4af' });
        });
      };
      g.spawnEnemy(filler);
    }
  };
}

function chapter_b5_mid_6(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.6) {
      g.laserT = 0;
      // 用当前 waveCount 定轨（刷怪前也可能为 0）
      spawnHLaser(g, 80 + ((g.waveCount || 0) * 35) % 380, (g.waveCount || 0) % 3 === 0 ? 1 : -1, '#f97316');
    }
    g.waveTimer += dt;
    if (g.waveTimer < 0.7) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 13) return;
    for (const side of [-1, 1]) {
      const x = LOGICAL_W / 2 + side * 80;
      const e = mob(x, -15, 36, side === -1 ? '#fb923c' : '#fdba74');
      e.vy = 1.2;
      e.script = (en, d, game) => {
        timer(en, 's', 0.5, d, () => {
          spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'rice', speed: 2.6, spread: 0.2, color: en.color });
        });
      };
      g.spawnEnemy(e);
    }
  };
}

function chapter_b5_mid_7(g) {
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.12) {
      g.rainT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const col = ['#fb923c', '#f97316', '#fdba74'][g.waveCount % 3];
      for (let i = 0; i < 2; i++) {
        g.spawnBullet(new Bullet({
          x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 0.7, vy: 1.8 + Math.random() * 0.5,
          type: 'talisman', color: col, from: 'enemy', gravity: 0.012,
        }));
      }
    }
    g.crossT = (g.crossT || 0) + dt;
    if (g.crossT > 1.4) {
      g.crossT = 0;
      spawnCrossFall(g, { type: 'dot', color: '#fb923c', speed: 1.5, lanes: 6 });
    }
  };
}

function chapter_b5_mid_8(g) {
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.4) {
      g.laserT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const y = 70 + (g.waveCount * 30) % 400;
      spawnHLaser(g, y, g.waveCount % 3 === 0 ? 1 : -1, '#f97316');
    }
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.1) {
      g.rainT = 0;
      for (let i = 0; i < 2; i++) {
        g.spawnBullet(new Bullet({
          x: Math.random() * LOGICAL_W, y: -8, vx: (Math.random() - 0.5) * 0.8, vy: 2.0 + Math.random() * 0.6,
          type: 'rice', color: '#fdba74', from: 'enemy', gravity: 0.01,
        }));
      }
    }
    g.aimT = (g.aimT || 0) + dt;
    if (g.aimT > 0.55) {
      g.aimT = 0;
      for (const side of [-1, 1]) {
        spawnAimedLaser(g, { x: LOGICAL_W / 2 + side * 70, y: 40 }, g.player, '#fb923c', 45);
      }
    }
  };
}

function chapter_gundian_1(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 3200, kind: 'gundian',
    color: '#fb923c', color2: '#fdba74', label: '棍电噢哆', enterY: 95,
  });
  e.script = (en, d, game) => {
    timer(en, 'a', 0.25, d, () => {
      const a = Math.atan2(game.player.y - en.y, game.player.x - en.x);
      game.spawnBullet(new Bullet({
        x: en.x - 20, y: en.y, angle: a, speed: 3.2, type: 'rice', color: '#fb923c', from: 'enemy',
      }));
      game.spawnBullet(new Bullet({
        x: en.x + 20, y: en.y, angle: a, speed: 3.2, type: 'rice', color: '#fdba74', from: 'enemy',
      }));
    });
    timer(en, 'slide', 0.8, d, () => {
      spawnAimed(game, en, game.player, { n: 5, parity: 'even', type: 'dot', speed: 2.5, color: '#f97316' });
    });
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_gundian_2(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 3400, kind: 'gundian',
    color: '#fb923c', color2: '#fdba74', label: '棍电噢哆', enterY: 95,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.5) * 60;
    en.y = 95 + Math.cos(en.age * 0.8) * 15;
    timer(en, 'aim', 0.3, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'talisman', speed: 2.8, color: '#fb923c' });
    });
    timer(en, 'spin', 0.12, d, () => {
      en.data.a = (en.data.a || 0) + 0.45;
      for (const side of [-1, 1]) {
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 2.2, type: 'rice', color: '#f97316', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.4, d, () => spawnRingAt(game, en.x, en.y, 12, 1.6, 'dot', '#fdba74', en.age));
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_gundian_3(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 3600, kind: 'gundian',
    color: '#fb923c', color2: '#fdba74', label: '棍电噢哆', enterY: 95,
  });
  e.script = (en, d, game) => {
    timer(en, 'laser', 0.35, d, () => {
      const side = en.data.side ? 1 : -1;
      en.data.side = !en.data.side;
      spawnAimedLaser(game, { x: en.x + side * 50, y: en.y }, game.player, '#f97316', 45);
    });
    timer(en, 'aim', 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: 4, parity: 'odd', type: 'talisman', speed: 2.8, color: '#fb923c' });
    });
    timer(en, 'ring', 1.2, d, () => {
      spawnRingAt(game, en.x, en.y, 14, 2.0, 'medium', '#fdba74', en.age);
    });
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_gundian_4(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 3800, kind: 'gundian',
    color: '#fb923c', color2: '#fdba74', label: '棍电噢哆', enterY: 95,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (hpRatio < 0.5 ? 2.2 : 1.5)) * 90;
    en.y = 95 + Math.cos(en.age * 1.2) * 20;
    timer(en, 'aim', 0.3, d, () => {
      spawnAimed(game, en, game.player, { n: hpRatio < 0.5 ? 5 : 4, parity: 'even', type: 'rice', speed: 2.8, color: '#f97316' });
    });
    timer(en, 'ring', 1.1, d, () => spawnRingAt(game, en.x, en.y, 16, 2.2, 'talisman', '#fdba74', en.age));
    timer(en, 'laser', 0.8, d, () => spawnAimedLaser(game, en, game.player, '#fb923c', 45));
    timer(en, 'rain', 0.18, d, () => spawnGravityRain(game, 2, 'rice', '#fdba74', 1.6));
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_gundian_5(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 4000, kind: 'gundian',
    color: '#fb923c', color2: '#fdba74', label: '棍电噢哆', enterY: 95,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (hpRatio < 0.4 ? 2.5 : 1.8)) * 105;
    en.y = 95 + Math.cos(en.age * (hpRatio < 0.4 ? 1.8 : 1.3)) * 25;
    timer(en, 'a', 0.22, d, () => {
      const a = Math.atan2(game.player.y - en.y, game.player.x - en.x);
      for (const ox of [-20, 0, 20]) {
        game.spawnBullet(new Bullet({
          x: en.x + ox, y: en.y, angle: a + (Math.random() - 0.5) * 0.15, speed: 3.2, type: 'rice', color: '#fb923c', from: 'enemy',
        }));
      }
    });
    timer(en, 'spin', 0.1, d, () => {
      en.data.a = (en.data.a || 0) + 0.5;
      for (const side of [-1, 1]) {
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 2.5, type: 'talisman', color: '#f97316', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.3, d, () => spawnRingAt(game, en.x, en.y, 18, 2.2, 'dot', '#fdba74', en.age * 0.6));
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_gundian_6(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 4200, kind: 'gundian',
    color: '#fb923c', color2: '#fdba74', label: '棍电噢哆', enterY: 95,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const fast = hpRatio < 0.35;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (fast ? 3 : 2)) * (fast ? 120 : 100);
    en.y = 95 + Math.cos(en.age * (fast ? 2.2 : 1.5)) * (fast ? 30 : 20);
    timer(en, 'laser', fast ? 0.3 : 0.45, d, () => {
      spawnAimedLaser(game, en, game.player, fast ? '#f97316' : '#fb923c', 45);
    });
    timer(en, 'aim', fast ? 0.25 : 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: fast ? 6 : 4, parity: 'odd', type: 'talisman', speed: fast ? 3.2 : 2.8, color: fast ? '#f97316' : '#fb923c' });
    });
    timer(en, 'ring', fast ? 0.9 : 1.3, d, () => spawnRingAt(game, en.x, en.y, fast ? 18 : 14, fast ? 2.4 : 2.0, 'rice', '#fdba74', en.age));
    if (fast) {
      timer(en, 'spin', 0.1, d, () => {
        en.data.a = (en.data.a || 0) + 0.6;
        for (const side of [-1, 1]) {
          game.spawnBullet(new Bullet({
            x: en.x + side * 15, y: en.y, angle: en.data.a * side, speed: 2.8, type: 'dot', color: '#fdba74', from: 'enemy',
          }));
        }
      });
    }
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_gundian_7(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 4600, kind: 'gundian',
    color: '#fb923c', color2: '#fdba74', label: '棍电噢哆', enterY: 95,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.25;
    timer(en, 'a', frenzy ? 0.12 : 0.25, d, () => {
      const a = Math.atan2(game.player.y - en.y, game.player.x - en.x);
      for (const ox of [-25, 0, 25]) {
        game.spawnBullet(new Bullet({
          x: en.x + ox, y: en.y, angle: a + (Math.random() - 0.5) * 0.2, speed: frenzy ? 4.0 : 3.2, type: 'rice', color: '#fb923c', from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', frenzy ? 0.35 : 0.7, d, () => {
      spawnAimed(game, en, game.player, { n: frenzy ? 7 : 5, parity: 'odd', type: 'dot', speed: frenzy ? 3.5 : 2.8, color: '#f97316' });
    });
    timer(en, 'ring', frenzy ? 0.8 : 1.5, d, () => {
      spawnRingAt(game, en.x, en.y, frenzy ? 20 : 14, frenzy ? 2.6 : 2.0, 'talisman', '#fdba74', en.age);
    });
    if (frenzy) {
      timer(en, 'rain', 0.2, d, () => spawnGravityRain(game, 3, 'rice', '#fb923c', 2.0));
    }
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_gundian_last(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 5400, kind: 'gundian',
    color: '#fb923c', color2: '#fdba74', label: '棍电噢哆', enterY: 95,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.2;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (frenzy ? 3.5 : 2.5)) * (frenzy ? 140 : 115);
    en.y = 95 + Math.cos(en.age * (frenzy ? 2.8 : 1.8)) * (frenzy ? 40 : 30);
    timer(en, 'storm', frenzy ? 0.05 : 0.12, d, () => {
      for (let i = 0; i < (frenzy ? 4 : 2); i++) {
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y, angle: Math.random() * Math.PI * 2,
          speed: 2 + Math.random() * (frenzy ? 3.5 : 2.5),
          type: Math.random() < 0.35 ? 'large' : 'rice', color: Math.random() < 0.5 ? '#fb923c' : '#f97316', from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', frenzy ? 0.18 : 0.32, d, () => {
      spawnAimed(game, en, game.player, { n: frenzy ? 9 : 7, parity: 'odd', type: frenzy ? 'laser' : 'talisman', speed: frenzy ? 5 : 3.5, color: '#f97316', laserLen: 200 });
    });
    timer(en, 'ring', frenzy ? 0.7 : 1.2, d, () => {
      spawnRingAt(game, en.x, en.y, frenzy ? 24 : 18, frenzy ? 2.8 : 2.2, 'rice', '#fdba74', en.age);
    });
    if (frenzy) {
      timer(en, 'spin', 0.06, d, () => {
        en.data.a = (en.data.a || 0) + 0.8;
        for (const side of [-1, 1]) {
          for (const off of [-1, 1]) {
            game.spawnBullet(new Bullet({
              x: en.x + side * 20, y: en.y + off * 15, angle: en.data.a * side * off, speed: 3.0, type: 'dot', color: '#fdba74', from: 'enemy',
            }));
          }
        }
      });
      timer(en, 'rain', 0.15, d, () => spawnGravityRain(game, 3, 'medium', '#fb923c', 2.4));
    }
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

const FACE = faceDefaults('B5');

export const chapters = [
  midChapter(FACE, {
    id: 92,
    name: 'B5-1 街角暗巷',
    kind: 'mid',
    unstable: true,
    duration: 24,
    build: chapter_b5_mid_1,
  }),
  midChapter(FACE, {
    id: 93,
    name: 'B5-2 系统异常 破皮鞋敲击',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_b5_mid_2,
  }),
  midChapter(FACE, {
    id: 94,
    name: 'B5-3 素质质问',
    kind: 'mid',
    unstable: true,
    duration: 24,
    build: chapter_b5_mid_3,
  }),
  midChapter(FACE, {
    id: 95,
    name: 'B5-4 世界第一宣言',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_b5_mid_4,
  }),
  midChapter(FACE, {
    id: 96,
    name: 'B5-5 中单影卫',
    kind: 'midboss',
    duration: 34,
    build: chapter_b5_midboss,
  }),
  midChapter(FACE, {
    id: 97,
    name: 'B5-6 推退拉锯',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_b5_mid_5,
  }),
  midChapter(FACE, {
    id: 98,
    name: 'B5-7 嘴硬交锋',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_b5_mid_6,
  }),
  midChapter(FACE, {
    id: 99,
    name: 'B5-8 甩锅预演',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_b5_mid_7,
  }),
  midChapter(FACE, {
    id: 100,
    name: 'B5-9 这波怎么说',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_b5_mid_8,
  }),
  letterChapter(FACE, {
    id: 101,
    name: '棍电噢哆「世界第一·推退辩论」',
    dialogue: 'b5',
    letter: '世界第一 · 推退辩论',
    letterTime: 42,
    build: chapter_gundian_1,
  }),
  letterChapter(FACE, {
    id: 102,
    name: '棍电噢哆「世界第一·傲娇反击」',
    letter: '世界第一 · 傲娇反击',
    letterTime: 42,
    build: chapter_gundian_2,
  }),
  letterChapter(FACE, {
    id: 103,
    name: '棍电噢哆「世界第一·素质质问」',
    letter: '世界第一 · 素质质问',
    letterTime: 44,
    build: chapter_gundian_3,
  }),
  letterChapter(FACE, {
    id: 104,
    name: '棍电噢哆「世界第一·中单之怒」',
    letter: '世界第一 · 中单之怒',
    letterTime: 44,
    build: chapter_gundian_4,
  }),
  letterChapter(FACE, {
    id: 105,
    name: '棍电噢哆「世界第一·癌症晚期」',
    letter: '世界第一 · 癌症晚期',
    letterTime: 46,
    build: chapter_gundian_5,
  }),
  letterChapter(FACE, {
    id: 106,
    name: '棍电噢哆「世界第一·清修破灭」',
    letter: '世界第一 · 清修破灭',
    letterTime: 46,
    build: chapter_gundian_6,
  }),
  letterChapter(FACE, {
    id: 107,
    name: '棍电噢哆「世界第一·终极甩锅」',
    letter: '世界第一 · 终极甩锅',
    letterTime: 48,
    build: chapter_gundian_7,
  }),
  letterChapter(FACE, {
    id: 108,
    name: '棍电噢哆「世界第一·队友问题」',
    letter: '世界第一 · 队友问题',
    letterTime: 52,
    winDialogue: 'b5_win',
    loseDialogue: 'b5_lose',
    build: chapter_gundian_last,
  }),
]

export const stageSelectEntry = { id: 'B5', label: 'B线5面', desc: '棍电噢哆 — 推退辩论战', startChapter: 92 };
