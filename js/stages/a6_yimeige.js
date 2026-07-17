import { mob, elite, boss, timer } from './_shared.js';
import { LOGICAL_W } from '../config.js';
import {
  spawnAimed, spawnRingAt, spawnGravityRain, spawnAimedLaser, spawnHLaser, spawnCrossFall,
} from '../patterns.js';
import { Bullet } from '../entities.js';

/* === A6 一美个 — 20 chapters (mid x10 + midboss x1 + boss x9) === */

function chapter_a6_mid_1(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.9) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 12) return;
    const e = mob(60 + Math.random() * (LOGICAL_W - 120), -20, 30, '#e879f9');
    e.vy = 0.8;
    e.script = (en, d, game) => {
      timer(en, 's', 0.9, d, () => {
        spawnAimed(game, en, game.player, { n: 2, parity: 'odd', type: 'dot', speed: 1.8, color: '#f0abfc' });
      });
      timer(en, 'ring', 2.2, d, () => {
        spawnRingAt(game, en.x, en.y, 6, 1.2, 'rice', '#e879f9');
      });
    };
    g.enemies.push(e);
  };
}

function chapter_a6_mid_2(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.7) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 13) return;
    const e = mob(40 + Math.random() * (LOGICAL_W - 80), -15, 28, '#f0abfc');
    e.vy = 1.3;
    e.onDeath = (en, game) => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'rice', speed: 2.8, color: '#e879f9' });
    };
    g.enemies.push(e);
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.3) {
      g.rainT = 0;
      g.bullets.push(new Bullet({
        x: Math.random() * LOGICAL_W, y: -10,
        vx: (Math.random() - 0.5) * 0.4, vy: 1.2,
        type: 'talisman', color: '#d946ef', from: 'enemy',
      }));
    }
  };
}

function chapter_a6_mid_3(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.75) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 13) return;
    const side = g.waveCount % 2 ? 35 : LOGICAL_W - 35;
    const e = elite({ x: side, y: 65, hp: 190, kind: 'generic', color: '#e879f9' });
    e.vy = 0.35;
    e.script = (en, d, game) => {
      timer(en, 's', 0.6, d, () => {
        spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'dot', speed: 2.2, spread: 0.28, color: '#f0abfc' });
      });
      timer(en, 'ring', 1.5, d, () => spawnRingAt(game, en.x, en.y, 6, 1.3, 'talisman', '#e879f9', en.age));
    };
    g.enemies.push(e);
  };
}

function chapter_a6_mid_4(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.65) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 14) return;
    const e = mob(50 + Math.random() * (LOGICAL_W - 100), -20, 32, '#d946ef');
    e.vy = 1.2;
    e.script = (en, d, game) => {
      timer(en, 's', 0.5, d, () => {
        spawnAimed(game, en, game.player, { n: 3, parity: 'even', type: 'rice', speed: 2.4, spread: 0.16, color: '#e879f9' });
      });
    };
    g.enemies.push(e);
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.22) {
      g.rainT = 0;
      spawnGravityRain(g, 1, 'dot', '#f0abfc', 1.3);
    }
  };
}

function chapter_a6_midboss(g) {
  const e = elite({
    x: LOGICAL_W / 2, y: 100, hp: 2300, kind: 'yimeige', color: '#e879f9', color2: '#f0abfc',
    label: '乐园守护者', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'aim', 0.7, d, () => {
      spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'medium', speed: 2.2, spread: 0.28, color: '#d946ef' });
    });
    timer(en, 'ring', 1.4, d, () => {
      spawnRingAt(game, en.x, en.y, 12, 1.6, 'dot', '#f0abfc', en.age);
    });
    timer(en, 'split', 1.8, d, () => {
      const b = new Bullet({
        x: en.x, y: en.y + 10, vx: 0, vy: 1.0, type: 'large', color: '#e879f9', from: 'enemy', gravity: 0.008, life: 4,
        onSplit: (self) => spawnRingAt(game, self.x, self.y, 8, 1.6, 'dot', '#f0abfc'),
      });
      game.bullets.push(b);
    });
    timer(en, 'laser', 1.0, d, () => spawnAimedLaser(game, en, game.player, '#d946ef'));
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_a6_mid_5(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.6) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 14) return;
    const side = g.waveCount % 2 ? 40 : LOGICAL_W - 40;
    const e = mob(side, 60 + (g.waveCount % 3) * 50, 35, '#f0abfc');
    e.script = (en, d, game) => {
      timer(en, 's', 0.5, d, () => {
        spawnAimed(game, en, game.player, { n: 3, parity: 'even', type: 'rice', speed: 2.8, spread: 0.12, color: '#c084fc' });
      });
    };
    g.enemies.push(e);
  };
  g.rainT = (g.rainT || 0) + dt;
  if (g.rainT > 0.12) {
    g.rainT = 0;
    g.bullets.push(new Bullet({
      x: Math.random() * LOGICAL_W, y: -10,
      vx: 0, vy: 2.2 + Math.random(), type: 'dot', color: '#e879f9', from: 'enemy', gravity: 0.006,
    }));
  }
}

function chapter_a6_mid_6(g) {
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.40) {
      g.laserT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const y = 70 + (g.waveCount * 30) % 400;
      spawnHLaser(g, y, g.waveCount % 2 === 0 ? 1 : -1, '#c084fc');
    }
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.18) {
      g.rainT = 0;
      spawnGravityRain(g, 1, 'talisman', '#e879f9', 1.4);
    }
    g.aimT = (g.aimT || 0) + dt;
    if (g.aimT > 0.7) {
      g.aimT = 0;
      const src = { x: LOGICAL_W / 2, y: 30 };
      spawnAimedLaser(g, src, g.player, '#d946ef');
    }
  };
}

function chapter_a6_mid_7(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.95) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 13) return;
    const e = elite({
      x: 50 + Math.random() * (LOGICAL_W - 100), y: 75, hp: 260, kind: 'generic', color: '#c084fc',
    });
    e.vy = 0.25;
    e.script = (en, d, game) => {
      timer(en, 'aim', 0.6, d, () => {
        spawnAimed(game, en, game.player, { n: 4, parity: 'even', type: 'talisman', speed: 2.4, spread: 0.18, color: '#d946ef' });
      });
      timer(en, 'ring', 1.8, d, () => spawnRingAt(game, en.x, en.y, 10, 1.5, 'medium', '#e879f9', en.age));
    };
    g.enemies.push(e);
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.28) {
      g.rainT = 0;
      g.bullets.push(new Bullet({
        x: Math.random() * LOGICAL_W, y: -5, vx: 0, vy: 1.6,
        type: 'rice', color: '#f0abfc', from: 'enemy', gravity: 0.012, life: 8,
        onSplit: (self) => spawnRingAt(game, self.x, self.y, 6, 1.2, 'dot', '#e879f9'),
      }));
    }
  };
}

function chapter_a6_mid_8(g) {
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.35) {
      g.laserT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const y = 50 + (g.waveCount * 28) % 420;
      spawnHLaser(g, y, g.waveCount % 3 === 0 ? 1 : -1, '#d946ef');
    }
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.14) {
      g.rainT = 0;
      for (let i = 0; i < 2; i++) {
        g.bullets.push(new Bullet({
          x: Math.random() * LOGICAL_W, y: -8, vx: (Math.random() - 0.5) * 0.6, vy: 1.8 + Math.random(),
          type: 'talisman', color: '#e879f9', from: 'enemy', gravity: 0.01,
        }));
      }
    }
    g.crossT = (g.crossT || 0) + dt;
    if (g.crossT > 1.2) {
      g.crossT = 0;
      spawnCrossFall(g, { type: 'rice', color: '#c084fc', speed: 1.8, lanes: 6 });
    }
  };
}

function chapter_a6_mid_9(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.55) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 14) return;
    for (const side of [-1, 1]) {
      const x = LOGICAL_W / 2 + side * 85;
      const e = mob(x, -18, 36, side === -1 ? '#d946ef' : '#e879f9');
      e.vy = 1.3;
      e.vx = side * 0.3;
      e.script = (en, d, game) => {
        timer(en, 's', 0.45, d, () => {
          spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'rice', speed: 2.8, spread: 0.14, color: en.color });
        });
      };
      g.enemies.push(e);
    }
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.55) {
      g.laserT = 0;
      spawnAimedLaser(g, { x: LOGICAL_W / 2, y: 35 }, g.player, '#c084fc');
    }
  };
}

function chapter_a6_mid_10(g) {
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.1) {
      g.rainT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const col = ['#e879f9', '#c084fc', '#f0abfc'][g.waveCount % 3];
      for (let i = 0; i < 2; i++) {
        g.bullets.push(new Bullet({
          x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 0.8, vy: 2.0 + Math.random() * 0.6,
          type: 'talisman', color: col, from: 'enemy', gravity: 0.01,
        }));
      }
    }
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.4) {
      g.laserT = 0;
      for (const side of [-1, 1]) {
        spawnHLaser(g, 80 + (g.waveCount * 35) % 380, side, side === -1 ? '#d946ef' : '#a78bfa');
      }
    }
    g.aimT = (g.aimT || 0) + dt;
    if (g.aimT > 0.5) {
      g.aimT = 0;
      for (const side of [-1, 1]) {
        spawnAimedLaser(g, { x: LOGICAL_W / 2 + side * 70, y: 45 }, g.player, '#e879f9');
      }
    }
  };
}

function chapter_yimeige_1(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 3800, kind: 'yimeige',
    color: '#e879f9', color2: '#f0abfc', label: '一美个', enterY: 95,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.2) * 80;
    timer(en, 's', 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: 4, parity: 'even', type: 'medium', speed: 2.4, color: '#e879f9' });
    });
    timer(en, 'r', 1.5, d, () => spawnRingAt(game, en.x, en.y, 10, 1.8, 'dot', '#f0abfc'));
    timer(en, 'sweet', 1.2, d, () => {
      spawnCrossFall(g, { type: 'talisman', color: '#f0abfc', speed: 1.5, lanes: 6 });
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_yimeige_2(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 3900, kind: 'yimeige',
    color: '#e879f9', color2: '#f0abfc', label: '一美个', enterY: 95,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.4) * 90;
    en.y = 95 + Math.cos(en.age * 0.8) * 20;
    timer(en, 'aim', 0.35, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'rice', speed: 2.6, color: '#d946ef' });
    });
    timer(en, 'spin', 0.12, d, () => {
      en.data.a = (en.data.a || 0) + 0.38;
      for (const side of [-1, 1]) {
        game.bullets.push(new Bullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 1.8, type: 'talisman', color: '#e879f9', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.4, d, () => spawnRingAt(game, en.x, en.y, 12, 1.8, 'dot', '#f0abfc', en.age * 0.6));
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_yimeige_3(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 4000, kind: 'yimeige',
    color: '#e879f9', color2: '#f0abfc', label: '一美个', enterY: 95,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.5) * 100;
    timer(en, 'aim', 0.3, d, () => {
      spawnAimed(game, en, game.player, { n: 4, parity: 'even', type: 'talisman', speed: 2.8, spread: 0.16, color: '#c084fc' });
    });
    timer(en, 'laser', 0.5, d, () => spawnAimedLaser(game, en, game.player, '#d946ef'));
    timer(en, 'ring', 1.2, d, () => spawnRingAt(game, en.x, en.y, 14, 2.0, 'rice', '#e879f9', en.age));
    timer(en, 'drop', 1.6, d, () => {
      spawnGravityRain(g, 1, 'medium', '#f0abfc', 1.4);
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_yimeige_4(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 4100, kind: 'yimeige',
    color: '#e879f9', color2: '#f0abfc', label: '一美个', enterY: 95,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.6) * 110;
    en.y = 95 + Math.cos(en.age * 1.0) * 25;
    timer(en, 'a', 0.25, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'medium', speed: 2.8, color: '#d946ef' });
    });
    timer(en, 'spin', 0.1, d, () => {
      en.data.a = (en.data.a || 0) + 0.45;
      for (const s of [-1, 1]) {
        game.bullets.push(new Bullet({
          x: en.x + s * 20, y: en.y, angle: en.data.a * s, speed: 2.2, type: 'talisman', color: '#c084fc', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.3, d, () => spawnRingAt(game, en.x, en.y, 16, 2.0, 'dot', '#e879f9', en.age * 0.7));
    timer(en, 'cross', 1.8, d, () => spawnCrossFall(game, { type: 'rice', color: '#f0abfc', speed: 1.6, lanes: 5 }));
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_yimeige_5(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 4200, kind: 'yimeige',
    color: '#e879f9', color2: '#f0abfc', label: '一美个', enterY: 95,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    timer(en, 'aim', 0.35, d, () => {
      const parity = hpRatio < 0.5 ? 'odd' : 'even';
      spawnAimed(game, en, game.player, { n: 5, parity, type: 'rice', speed: 2.8, color: '#d946ef' });
    });
    timer(en, 'ring', 1.0, d, () => spawnRingAt(game, en.x, en.y, 14, 2.0, 'talisman', '#e879f9', en.age));
    timer(en, 'laser', 0.8, d, () => spawnAimedLaser(game, en, game.player, '#c084fc'));
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_yimeige_6(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 4400, kind: 'yimeige',
    color: '#e879f9', color2: '#f0abfc', label: '一美个', enterY: 95,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (hpRatio < 0.4 ? 2.2 : 1.7)) * 115;
    en.y = 95 + Math.cos(en.age * (hpRatio < 0.4 ? 1.8 : 1.2)) * 30;
    timer(en, 'a', 0.3, d, () => {
      spawnAimed(game, en, game.player, { n: hpRatio < 0.4 ? 6 : 4, parity: 'odd', type: 'talisman', speed: hpRatio < 0.4 ? 3.2 : 2.6, color: '#d946ef' });
    });
    timer(en, 'ring', 0.9, d, () => spawnRingAt(game, en.x, en.y, hpRatio < 0.4 ? 18 : 14, hpRatio < 0.4 ? 2.4 : 2.0, 'rice', '#e879f9', en.age));
    timer(en, 'laser', hpRatio < 0.4 ? 0.4 : 0.6, d, () => spawnAimedLaser(game, en, game.player, '#c084fc'));
    if (hpRatio < 0.4) {
      timer(en, 'rain', 0.35, d, () => spawnGravityRain(game, 2, 'dot', '#f0abfc', 1.8));
    }
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_yimeige_7(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 4600, kind: 'yimeige',
    color: '#e879f9', color2: '#f0abfc', label: '一美个', enterY: 95,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const fast = hpRatio < 0.35;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (fast ? 2.8 : 2.0)) * (fast ? 130 : 110);
    en.y = 95 + Math.cos(en.age * (fast ? 2.2 : 1.5)) * (fast ? 35 : 25);
    timer(en, 'aim', fast ? 0.22 : 0.35, d, () => {
      spawnAimed(game, en, game.player, { n: fast ? 7 : 5, parity: 'even', type: 'rice', speed: fast ? 3.5 : 2.8, color: '#d946ef' });
    });
    timer(en, 'spin', fast ? 0.08 : 0.13, d, () => {
      en.data.a = (en.data.a || 0) + (fast ? 0.55 : 0.4);
      for (let i = 0; i < (fast ? 3 : 2); i++) {
        game.bullets.push(new Bullet({
          x: en.x, y: en.y, angle: en.data.a + (i * Math.PI * 2) / (fast ? 3 : 2), speed: fast ? 2.5 : 1.8, type: 'talisman', color: '#e879f9', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', fast ? 0.8 : 1.2, d, () => spawnRingAt(game, en.x, en.y, fast ? 20 : 16, fast ? 2.4 : 2.0, 'medium', '#c084fc', en.age));
    timer(en, 'laser', fast ? 0.4 : 0.6, d, () => spawnAimedLaser(game, en, game.player, '#f0abfc'));
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_yimeige_8(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 5500, kind: 'yimeige',
    color: '#e879f9', color2: '#f0abfc', label: '一美个', enterY: 100,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.3;
    timer(en, 'chaos', frenzy ? 0.07 : 0.15, d, () => {
      game.bullets.push(new Bullet({
        x: en.x, y: en.y, angle: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * (frenzy ? 3 : 2),
        type: ['dot', 'rice', 'talisman', 'medium'][Math.floor(Math.random() * 4)],
        color: Math.random() < 0.5 ? '#e879f9' : '#fbbf24', from: 'enemy',
      }));
    });
    timer(en, 'aim', frenzy ? 0.4 : 0.6, d, () => {
      spawnAimed(game, en, game.player, { n: frenzy ? 9 : 7, parity: 'odd', type: 'rice', speed: frenzy ? 3.5 : 3.0, color: '#d946ef' });
    });
    timer(en, 'ring', frenzy ? 0.7 : 1.2, d, () => {
      spawnRingAt(game, en.x, en.y, frenzy ? 24 : 18, frenzy ? 2.6 : 2.0, 'talisman', '#f0abfc', en.age);
    });
    if (frenzy) {
      timer(en, 'laser', 0.4, d, () => spawnAimedLaser(game, en, game.player, '#e879f9'));
    }
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_yimeige_last(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 6500, kind: 'yimeige',
    color: '#e879f9', color2: '#f0abfc', label: '一美个', enterY: 100,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.2;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (frenzy ? 3.5 : 2.5)) * (frenzy ? 140 : 120);
    en.y = 100 + Math.cos(en.age * (frenzy ? 2.8 : 1.8)) * (frenzy ? 40 : 30);
    timer(en, 'storm', frenzy ? 0.05 : 0.1, d, () => {
      for (let i = 0; i < (frenzy ? 4 : 2); i++) {
        game.bullets.push(new Bullet({
          x: en.x, y: en.y, angle: Math.random() * Math.PI * 2,
          speed: 2.0 + Math.random() * (frenzy ? 3.5 : 2.5),
          type: Math.random() < 0.35 ? 'large' : ['dot', 'rice', 'talisman'][Math.floor(Math.random() * 3)],
          color: ['#e879f9', '#d946ef', '#fbbf24'][Math.floor(Math.random() * 3)], from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', frenzy ? 0.25 : 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: frenzy ? 9 : 7, parity: 'odd', type: frenzy ? 'laser' : 'rice', speed: frenzy ? 5 : 3.5, color: '#d946ef', laserLen: 200 });
    });
    timer(en, 'ring', frenzy ? 0.6 : 1.0, d, () => {
      spawnRingAt(game, en.x, en.y, frenzy ? 28 : 22, frenzy ? 3.0 : 2.4, 'talisman', '#e879f9', en.age);
    });
    if (frenzy) {
      timer(en, 'laser', 0.3, d, () => {
        for (const side of [-1, 1]) {
          spawnAimedLaser(game, { x: en.x + side * 45, y: en.y }, game.player, '#f0abfc');
        }
      });
      timer(en, 'rain', 0.2, d, () => spawnGravityRain(game, 3, 'medium', '#c084fc', 2.2));
    }
  };
  g.enemies.push(e);
  g.bossRef = e;
}

export const chapters = [
  { id: 57, name: 'A6-1 乐园入口', stage: 'A6', stageKey: 'A6', kind: 'mid',
    unstable: true, music: 'a6_mid', bg: 'a6_mid', duration: 24, build: (g) => chapter_a6_mid_1(g) },
  { id: 58, name: 'A6-2 Unstable 糖衣炮弹', stage: 'A6', stageKey: 'A6', kind: 'mid',
    unstable: true, music: 'a6_mid', bg: 'a6_mid', duration: 26, build: (g) => chapter_a6_mid_2(g) },
  { id: 59, name: 'A6-3 甜腻迷雾', stage: 'A6', stageKey: 'A6', kind: 'mid',
    unstable: true, music: 'a6_mid', bg: 'a6_mid', duration: 24, build: (g) => chapter_a6_mid_3(g) },
  { id: 60, name: 'A6-4 虚假善意', stage: 'A6', stageKey: 'A6', kind: 'mid',
    unstable: true, music: 'a6_mid', bg: 'a6_mid', duration: 26, build: (g) => chapter_a6_mid_4(g) },
  { id: 61, name: 'A6-5 乐园守护者', stage: 'A6', stageKey: 'A6', kind: 'midboss',
    music: 'a6_mid', bg: 'a6_mid', duration: 34, build: (g) => chapter_a6_midboss(g) },
  { id: 62, name: 'A6-6 甜蜜陷阱', stage: 'A6', stageKey: 'A6', kind: 'mid',
    unstable: true, music: 'a6_mid', bg: 'a6_mid', duration: 26, build: (g) => chapter_a6_mid_5(g) },
  { id: 63, name: 'A6-7 乐园暗流', stage: 'A6', stageKey: 'A6', kind: 'mid',
    unstable: true, music: 'a6_mid', bg: 'a6_mid', duration: 28, build: (g) => chapter_a6_mid_6(g) },
  { id: 64, name: 'A6-8 剧情裂痕', stage: 'A6', stageKey: 'A6', kind: 'mid',
    unstable: true, music: 'a6_mid', bg: 'a6_mid', duration: 28, build: (g) => chapter_a6_mid_7(g) },
  { id: 65, name: 'A6-9 乐园崩坏前兆', stage: 'A6', stageKey: 'A6', kind: 'mid',
    unstable: true, music: 'a6_mid', bg: 'a6_mid', duration: 30, build: (g) => chapter_a6_mid_8(g) },
  { id: 66, name: 'A6-10 真相浮现', stage: 'A6', stageKey: 'A6', kind: 'mid',
    unstable: true, music: 'a6_mid', bg: 'a6_mid', duration: 28, build: (g) => chapter_a6_mid_9(g) },
  { id: 67, name: 'A6-11 最终层切入', stage: 'A6', stageKey: 'A6', kind: 'mid',
    unstable: true, music: 'a6_mid', bg: 'a6_mid', duration: 30, build: (g) => chapter_a6_mid_10(g) },
  { id: 68, name: '一美个「哈机密·甜蜜陷阱」', stage: 'A6', stageKey: 'A6', kind: 'boss',
    music: 'a6_boss', bg: 'a6_boss', dialogue: 'a6', letter: '哈机密 · 甜蜜陷阱', letterTime: 42,
    build: (g) => chapter_yimeige_1(g) },
  { id: 69, name: '一美个「哈机密·糖衣外交」', stage: 'A6', stageKey: 'A6', kind: 'boss',
    music: 'a6_boss', bg: 'a6_boss', letter: '哈机密 · 糖衣外交', letterTime: 42,
    build: (g) => chapter_yimeige_2(g) },
  { id: 70, name: '一美个「哈机密·言论审查」', stage: 'A6', stageKey: 'A6', kind: 'boss',
    music: 'a6_boss', bg: 'a6_boss', letter: '哈机密 · 言论审查', letterTime: 44,
    build: (g) => chapter_yimeige_3(g) },
  { id: 71, name: '一美个「哈机密·数据篡改」', stage: 'A6', stageKey: 'A6', kind: 'boss',
    music: 'a6_boss', bg: 'a6_boss', letter: '哈机密 · 数据篡改', letterTime: 44,
    build: (g) => chapter_yimeige_4(g) },
  { id: 72, name: '一美个「哈机密·伪装剥离」', stage: 'A6', stageKey: 'A6', kind: 'boss',
    music: 'a6_boss', bg: 'a6_boss', letter: '哈机密 · 伪装剥离', letterTime: 46,
    build: (g) => chapter_yimeige_5(g) },
  { id: 73, name: '一美个「哈机密·苦口婆心」', stage: 'A6', stageKey: 'A6', kind: 'boss',
    music: 'a6_boss', bg: 'a6_boss', letter: '哈机密 · 苦口婆心', letterTime: 46,
    build: (g) => chapter_yimeige_6(g) },
  { id: 74, name: '一美个「哈机密·层层剥落」', stage: 'A6', stageKey: 'A6', kind: 'boss',
    music: 'a6_boss', bg: 'a6_boss', letter: '哈机密 · 层层剥落', letterTime: 48,
    build: (g) => chapter_yimeige_7(g) },
  { id: 75, name: '一美个「哈机密乐园·全面崩坏」', stage: 'A6', stageKey: 'A6', kind: 'boss',
    music: 'a6_boss', bg: 'a6_boss', dialogue: 'a6_last', letter: '哈机密乐园 · 全面崩坏', letterTime: 50,
    build: (g) => chapter_yimeige_8(g) },
  { id: 76, name: '一美个「哈机密乐园·回收站清空」', stage: 'A6', stageKey: 'A6', kind: 'boss',
    music: 'a6_boss', bg: 'a6_boss', letter: '回收站清空 · 最终抹消', letterTime: 55,
    ending: 'A',
    build: (g) => chapter_yimeige_last(g) },
];

export const stageSelectEntry = { id: 'A6', label: 'A线6面', desc: '一美个 — 哈机密乐园崩坏', startChapter: 57 };
