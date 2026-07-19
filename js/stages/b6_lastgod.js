import { mob, elite, boss, timer, faceDefaults, midChapter, letterChapter } from './_shared.js';
import { LOGICAL_W } from '../config.js';
import {
  spawnAimed, spawnRingAt, spawnGravityRain, spawnAimedLaser, spawnHLaser, spawnCrossFall,
} from '../patterns.js';
import { Bullet } from '../entities.js';

/* === B6 拉斯特神炫 — 20 chapters (mid x10 + midboss x1 + boss x9) === */

function chapter_b6_mid_1(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.4) {
      g.rainT = 0;
      g.spawnBullet(new Bullet({
        x: Math.random() * LOGICAL_W, y: -10, angle: Math.PI / 2, speed: 1.0,
        type: 'medium', color: '#bef264', from: 'enemy', gravity: 0.004,
      }));
    }
    g.waveTimer += dt;
    if (g.waveTimer < 1.0) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 12) return;
    const e = mob(60 + Math.random() * (LOGICAL_W - 120), -20, 34, '#bef264');
    e.vy = 0.6;
    e.script = (en, d, game) => {
      timer(en, 's', 0.7, d, () => {
        spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'dot', speed: 1.6, spread: 0.22, color: '#a3e635' });
      });
    };
    g.spawnEnemy(e);
  };
}

function chapter_b6_mid_2(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.7) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 13) return;
    const e = elite({
      x: 60 + Math.random() * (LOGICAL_W - 120), y: 80, hp: 210, color: '#65a30d', kind: 'generic',
    });
    e.vy = 0.2;
    e.script = (en, d, game) => {
      timer(en, 'laser', 0.8, d, () => {
        spawnAimedLaser(game, en, game.player, '#84cc16');
      });
      timer(en, 'ring', 2.0, d, () => {
        spawnRingAt(game, en.x, en.y, 10, 1.4, 'talisman', '#a3e635', en.age);
      });
    };
    g.spawnEnemy(e);
  };
}

function chapter_b6_mid_3(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.35) {
      g.rainT = 0;
      g.spawnBullet(new Bullet({
        x: Math.random() * LOGICAL_W, y: -8, vx: 0, vy: 1.3,
        type: 'rice', color: '#65a30d', from: 'enemy',
      }));
    }
    g.waveTimer += dt;
    if (g.waveTimer < 0.8) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 13) return;
    const e = mob(40 + Math.random() * (LOGICAL_W - 80), -15, 30, '#84cc16');
    e.vy = 1.0;
    e.script = (en, d, game) => {
      timer(en, 's', 0.65, d, () => {
        spawnAimed(game, en, game.player, { n: 2, parity: 'odd', type: 'talisman', speed: 2.0, color: '#a3e635' });
      });
      timer(en, 'ring', 2.0, d, () => spawnRingAt(game, en.x, en.y, 6, 1.3, 'dot', '#bef264'));
    };
    g.spawnEnemy(e);
  };
}

function chapter_b6_mid_4(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.7) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 14) return;
    const e = elite({
      x: 50 + Math.random() * (LOGICAL_W - 100), y: 70, hp: 225, kind: 'generic', color: '#65a30d',
    });
    e.vy = 0.25;
    e.script = (en, d, game) => {
      timer(en, 'aim', 0.6, d, () => {
        spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'rice', speed: 2.0, spread: 0.3, color: '#84cc16' });
      });
      timer(en, 'ring', 1.5, d, () => spawnRingAt(game, en.x, en.y, 8, 1.4, 'talisman', '#a3e635', en.age));
    };
    g.spawnEnemy(e);
  };
}

function chapter_b6_midboss(g) {
  const e = elite({
    x: LOGICAL_W / 2, y: 100, hp: 2500, kind: 'lastgod', color: '#a3e635', color2: '#d9f99d',
    label: '神炫祭司', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'ring', 1.2, d, () => {
      spawnRingAt(game, en.x, en.y, 14, 1.6, 'medium', '#bef264', en.age * 0.4);
    });
    timer(en, 'aim', 0.6, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'talisman', speed: 2.6, color: '#84cc16' });
    });
    timer(en, 'big', 1.8, d, () => {
      game.spawnBullet(new Bullet({
        x: en.x + (Math.random() - 0.5) * 60, y: en.y, vx: 0, vy: 1.2,
        type: 'large', color: '#65a30d', from: 'enemy', gravity: 0.006, life: 8,
        onSplit: (self) => spawnRingAt(game, self.x, self.y, 10, 1.8, 'dot', '#a3e635'),
      }));
    });
    timer(en, 'laser', 0.9, d, () => spawnAimedLaser(game, en, game.player, '#84cc16'));
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_b6_mid_5(g) {
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.45) {
      g.laserT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const y = 60 + (g.waveCount * 28) % 400;
      spawnHLaser(g, y, g.waveCount % 3 === 0 ? 1 : -1, '#65a30d');
    }
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.16) {
      g.rainT = 0;
      g.spawnBullet(new Bullet({
        x: Math.random() * LOGICAL_W, y: -10,
        vx: (Math.random() - 0.5) * 0.6, vy: 1.8,
        type: 'rice', color: '#84cc16', from: 'enemy', gravity: 0.01,
      }));
    }
    g.aimT = (g.aimT || 0) + dt;
    if (g.aimT > 0.6) {
      g.aimT = 0;
      for (const side of [-1, 1]) {
        const src = { x: LOGICAL_W / 2 + side * 80, y: 40 };
        spawnAimedLaser(g, src, g.player, '#a3e635');
      }
    }
  };
}

function chapter_b6_mid_6(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    // 侧路敌机：勿 early-return 卡掉弹雨（dt 必须在 waveFn 内）
    g.waveTimer += dt;
    if (g.waveTimer >= 0.55) {
      g.waveTimer = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      if (g.waveCount <= 14) {
        const sz = g.waveCount % 2 ? 40 : LOGICAL_W - 40;
        const e = mob(sz, 50 + (g.waveCount % 3) * 60, 36, '#84cc16');
        e.script = (en, d, game) => {
          timer(en, 's', 0.4, d, () => {
            spawnAimed(game, en, game.player, {
              n: 4, parity: 'even', type: 'rice', speed: 2.8, spread: 0.1, color: '#a3e635',
            });
          });
        };
        g.spawnEnemy(e);
      }
    }
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.1) {
      g.rainT = 0;
      g.spawnBullet(new Bullet({
        x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 0.8,
        vy: 2.2 + Math.random(), type: 'dot', color: '#65a30d', from: 'enemy', gravity: 0.008,
      }));
    }
  };
}

function chapter_b6_mid_7(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer >= 0.8) {
      g.waveTimer = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      if (g.waveCount <= 14) {
        const e = elite({
          x: 45 + Math.random() * (LOGICAL_W - 90), y: 80, hp: 280, color: '#65a30d', kind: 'generic',
        });
        e.vy = 0.2;
        e.script = (en, d, game) => {
          timer(en, 'aim', 0.55, d, () => {
            spawnAimed(game, en, game.player, {
              n: 3, parity: 'odd', type: 'talisman', speed: 2.8, spread: 0.15, color: '#84cc16',
            });
          });
          timer(en, 'ring', 1.8, d, () => spawnRingAt(game, en.x, en.y, 10, 1.6, 'medium', '#a3e635', en.age));
        };
        g.spawnEnemy(e);
      }
    }
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.22) {
      g.rainT = 0;
      g.spawnBullet(new Bullet({
        x: Math.random() * LOGICAL_W, y: -5, vx: 0, vy: 1.5,
        type: 'large', color: '#4d7c0f', from: 'enemy', gravity: 0.004, life: 7,
        onSplit: (self) => spawnRingAt(g, self.x, self.y, 8, 1.4, 'dot', '#a3e635'),
      }));
    }
  };
}

function chapter_b6_mid_8(g) {
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.35) {
      g.laserT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const y = 50 + (g.waveCount * 25) % 430;
      spawnHLaser(g, y, g.waveCount % 3 === 0 ? 1 : -1, '#4d7c0f');
    }
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.12) {
      g.rainT = 0;
      for (let i = 0; i < 2; i++) {
        g.spawnBullet(new Bullet({
          x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 0.8, vy: 1.8 + Math.random() * 0.5,
          type: 'talisman', color: '#bef264', from: 'enemy', gravity: 0.008,
        }));
      }
    }
    g.crossT = (g.crossT || 0) + dt;
    if (g.crossT > 1.3) {
      g.crossT = 0;
      spawnCrossFall(g, { type: 'rice', color: '#84cc16', speed: 1.7, lanes: 6 });
    }
  };
}

function chapter_b6_mid_9(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.55) {
      g.laserT = 0;
      spawnAimedLaser(g, { x: LOGICAL_W / 2, y: 40 }, g.player, '#a3e635');
    }
    g.waveTimer += dt;
    if (g.waveTimer < 0.65) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 14) return;
    for (const side of [-1, 1]) {
      const x = LOGICAL_W / 2 + side * 85;
      const e = mob(x, -15, 38, side === -1 ? '#65a30d' : '#84cc16');
      e.vy = 1.2;
      e.script = (en, d, game) => {
        timer(en, 's', 0.5, d, () => {
          spawnAimed(game, en, game.player, { n: 3, parity: 'even', type: 'rice', speed: 2.6, spread: 0.15, color: en.color });
        });
      };
      g.spawnEnemy(e);
    }
  };
}

function chapter_b6_mid_10(g) {
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.08) {
      g.rainT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      for (let i = 0; i < 3; i++) {
        g.spawnBullet(new Bullet({
          x: Math.random() * LOGICAL_W, y: -10, vx: (Math.random() - 0.5) * 0.9, vy: 2.0 + Math.random() * 0.7,
          type: 'talisman', color: ['#a3e635', '#bef264', '#65a30d'][g.waveCount % 3], from: 'enemy', gravity: 0.008,
        }));
      }
    }
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.35) {
      g.laserT = 0;
      for (const side of [-1, 1]) {
        spawnHLaser(g, 80 + (g.waveCount * 32) % 380, side, side === -1 ? '#65a30d' : '#4d7c0f');
      }
    }
    g.aimT = (g.aimT || 0) + dt;
    if (g.aimT > 0.45) {
      g.aimT = 0;
      for (const side of [-1, 1]) {
        spawnAimedLaser(g, { x: LOGICAL_W / 2 + side * 75, y: 45 }, g.player, '#84cc16');
      }
    }
  };
}

function chapter_lastgod_1(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3800, kind: 'lastgod',
    color: '#a3e635', color2: '#d9f99d', label: '拉斯特神炫', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'fog', 0.2, d, () => {
      game.spawnBullet(new Bullet({
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
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_lastgod_2(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3900, kind: 'lastgod',
    color: '#a3e635', color2: '#d9f99d', label: '拉斯特神炫', enterY: 100,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.0) * 60;
    timer(en, 'fog', 0.18, d, () => {
      game.spawnBullet(new Bullet({
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
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y, angle: en.data.a * side, speed: 1.5, type: 'talisman', color: '#65a30d', from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.8, d, () => spawnRingAt(game, en.x, en.y, 10, 1.5, 'dot', '#a3e635', en.age * 0.5));
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_lastgod_3(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 4000, kind: 'lastgod',
    color: '#a3e635', color2: '#d9f99d', label: '拉斯特神炫', enterY: 100,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.2) * 70;
    en.y = 100 + Math.cos(en.age * 0.7) * 18;
    timer(en, 'fog', 0.15, d, () => {
      for (let i = 0; i < 2; i++) {
        game.spawnBullet(new Bullet({
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
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_lastgod_4(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 4100, kind: 'lastgod',
    color: '#a3e635', color2: '#d9f99d', label: '拉斯特神炫', enterY: 100,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.4) * 85;
    en.y = 100 + Math.cos(en.age * 0.9) * 22;
    timer(en, 'fog', 0.14, d, () => {
      for (let i = 0; i < 2; i++) {
        game.spawnBullet(new Bullet({
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
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_lastgod_5(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 4200, kind: 'lastgod',
    color: '#a3e635', color2: '#d9f99d', label: '拉斯特神炫', enterY: 100,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    timer(en, 'fog', 0.15, d, () => {
      for (let i = 0; i < (hpRatio < 0.5 ? 3 : 2); i++) {
        game.spawnBullet(new Bullet({
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
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_lastgod_6(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 4400, kind: 'lastgod',
    color: '#a3e635', color2: '#d9f99d', label: '拉斯特神炫', enterY: 100,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const fast = hpRatio < 0.35;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (fast ? 2.2 : 1.6)) * (fast ? 100 : 85);
    en.y = 100 + Math.cos(en.age * (fast ? 1.8 : 1.2)) * (fast ? 28 : 22);
    timer(en, 'fog', fast ? 0.1 : 0.15, d, () => {
      for (let i = 0; i < (fast ? 4 : 2); i++) {
        game.spawnBullet(new Bullet({
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
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_lastgod_7(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 4600, kind: 'lastgod',
    color: '#a3e635', color2: '#d9f99d', label: '拉斯特神炫', enterY: 100,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const fast = hpRatio < 0.3;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (fast ? 2.8 : 2.0)) * (fast ? 120 : 100);
    en.y = 100 + Math.cos(en.age * (fast ? 2.2 : 1.4)) * (fast ? 32 : 25);
    timer(en, 'storm', fast ? 0.08 : 0.15, d, () => {
      for (let i = 0; i < (fast ? 3 : 1); i++) {
        game.spawnBullet(new Bullet({
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
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_lastgod_8(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 6000, kind: 'lastgod',
    color: '#a3e635', color2: '#d9f99d', label: '拉斯特神炫', enterY: 100,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.2;
    timer(en, 'storm', frenzy ? 0.04 : 0.1, d, () => {
      for (let i = 0; i < (frenzy ? 4 : 2); i++) {
        game.spawnBullet(new Bullet({
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
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

function chapter_lastgod_last(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 7200, kind: 'lastgod',
    color: '#a3e635', color2: '#d9f99d', label: '拉斯特神炫', enterY: 100,
  });
  e.script = (en, d, game) => {
    const hpRatio = en.hp / en.maxHp;
    const frenzy = hpRatio < 0.2;
    en.x = LOGICAL_W / 2 + Math.sin(en.age * (frenzy ? 4 : 2.5)) * (frenzy ? 140 : 115);
    en.y = 100 + Math.cos(en.age * (frenzy ? 3.2 : 2.0)) * (frenzy ? 40 : 30);
    timer(en, 'storm', frenzy ? 0.03 : 0.08, d, () => {
      for (let i = 0; i < (frenzy ? 6 : 3); i++) {
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y, angle: Math.random() * Math.PI * 2,
          speed: 2 + Math.random() * (frenzy ? 4 : 3),
          type: ['dot', 'rice', 'talisman', 'medium', 'large'][Math.floor(Math.random() * (frenzy ? 5 : 4))],
          color: ['#a3e635', '#4d7c0f', '#bef264', '#65a30d'][Math.floor(Math.random() * 4)], from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', frenzy ? 0.2 : 0.35, d, () => {
      spawnAimed(game, en, game.player, { n: frenzy ? 9 : 11, parity: 'odd', type: frenzy ? 'laser' : 'talisman', speed: frenzy ? 5.5 : 4, color: '#65a30d', laserLen: 250, spread: 0.08 });
    });
    timer(en, 'ring', frenzy ? 0.5 : 0.9, d, () => {
      spawnRingAt(game, en.x, en.y, frenzy ? 28 : 22, frenzy ? 3.2 : 2.6, 'rice', '#d9f99d', en.age);
    });
    if (frenzy) {
      timer(en, 'spin', 0.05, d, () => {
        en.data.a = (en.data.a || 0) + 0.8;
        for (const side of [-1, 1]) {
          for (const off of [-1, 1]) {
            game.spawnBullet(new Bullet({
              x: en.x + side * 25, y: en.y + off * 15, angle: en.data.a * side * off, speed: 3.5, type: 'large', color: '#4d7c0f', from: 'enemy',
            }));
          }
        }
      });
      timer(en, 'rain', 0.1, d, () => spawnGravityRain(game, 5, 'medium', '#a3e635', 2.8));
    }
  };
  g.spawnEnemy(e);
  g.bossRef = e;
}

const FACE = faceDefaults('B6');

export const chapters = [
  midChapter(FACE, {
    id: 109,
    name: 'B6-1 迷雾边境',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_b6_mid_1,
  }),
  midChapter(FACE, {
    id: 110,
    name: 'B6-2 Unstable 防御塔阵列',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_b6_mid_2,
  }),
  midChapter(FACE, {
    id: 111,
    name: 'B6-3 炫妈气息',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_b6_mid_3,
  }),
  midChapter(FACE, {
    id: 112,
    name: 'B6-4 虾油迷雾',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_b6_mid_4,
  }),
  midChapter(FACE, {
    id: 113,
    name: 'B6-5 神炫祭司',
    kind: 'midboss',
    duration: 36,
    build: chapter_b6_midboss,
  }),
  midChapter(FACE, {
    id: 114,
    name: 'B6-6 宝瓶守护',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_b6_mid_5,
  }),
  midChapter(FACE, {
    id: 115,
    name: 'B6-7 王座之道',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_b6_mid_6,
  }),
  midChapter(FACE, {
    id: 116,
    name: 'B6-8 防空洞陷阱',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_b6_mid_7,
  }),
  midChapter(FACE, {
    id: 117,
    name: 'B6-9 风油精屏障',
    kind: 'mid',
    unstable: true,
    duration: 30,
    build: chapter_b6_mid_8,
  }),
  midChapter(FACE, {
    id: 118,
    name: 'B6-10 宝瓶封印解除',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_b6_mid_9,
  }),
  midChapter(FACE, {
    id: 119,
    name: 'B6-11 王座前震荡',
    kind: 'mid',
    unstable: true,
    duration: 32,
    build: chapter_b6_mid_10,
  }),
  letterChapter(FACE, {
    id: 120,
    name: '拉斯特神炫「炫妈迷雾·王座审判」',
    dialogue: 'b6',
    letter: '炫妈迷雾 · 王座审判',
    letterTime: 45,
    build: chapter_lastgod_1,
  }),
  letterChapter(FACE, {
    id: 121,
    name: '拉斯特神炫「炫妈迷雾·虾油侵蚀」',
    letter: '炫妈涂抹 · 虾油侵蚀',
    letterTime: 44,
    build: chapter_lastgod_2,
  }),
  letterChapter(FACE, {
    id: 122,
    name: '拉斯特神炫「炫妈迷雾·宝瓶泄露」',
    letter: '炫妈迷雾 · 宝瓶泄露',
    letterTime: 46,
    build: chapter_lastgod_3,
  }),
  letterChapter(FACE, {
    id: 123,
    name: '拉斯特神炫「炫妈迷雾·味道扩散」',
    letter: '炫妈迷雾 · 味道扩散',
    letterTime: 46,
    build: chapter_lastgod_4,
  }),
  letterChapter(FACE, {
    id: 124,
    name: '拉斯特神炫「炫妈迷雾·神之轻蔑」',
    letter: '炫妈迷雾 · 神之轻蔑',
    letterTime: 48,
    build: chapter_lastgod_5,
  }),
  letterChapter(FACE, {
    id: 125,
    name: '拉斯特神炫「炫妈迷雾·雾中獠牙」',
    letter: '炫妈迷雾 · 雾中獠牙',
    letterTime: 48,
    build: chapter_lastgod_6,
  }),
  letterChapter(FACE, {
    id: 126,
    name: '拉斯特神炫「炫妈迷雾·王座崩塌」',
    letter: '炫妈迷雾 · 王座崩塌',
    letterTime: 50,
    build: chapter_lastgod_7,
  }),
  letterChapter(FACE, {
    id: 127,
    name: '拉斯特神炫「虾油风油精·绝对帝国」',
    dialogue: 'b6_last',
    letter: '虾油风油精 · 绝对帝国',
    letterTime: 55,
    build: chapter_lastgod_8,
  }),
  letterChapter(FACE, {
    id: 128,
    name: '拉斯特神炫「虾油风油精·炫妈归天」',
    letter: '虾油风油精 · 炫妈归天',
    letterTime: 60,
    ending: 'B',
    build: chapter_lastgod_last,
  }),
]

export const stageSelectEntry = { id: 'B6', label: 'B线6面', desc: '拉斯特神炫 — 虾油风油精终局', startChapter: 109 };
