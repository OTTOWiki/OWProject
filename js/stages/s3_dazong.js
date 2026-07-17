import { mob, elite, boss, timer, scaleN } from './_shared.js';
import { LOGICAL_W, LOGICAL_H } from '../config.js';
import {
  spawnAimed, spawnRingAt, spawnGravityRain, spawnAimedLaser, spawnHLaser,
} from '../patterns.js';
import { Bullet } from '../entities.js';

/* ========== s3 chapters ========== */
function chapter_s3_1(g) {
  const e = elite({
    x: LOGICAL_W / 2, y: 100, hp: 1200, color: '#fbbf24', r: 28, label: '防火墙节点', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'laser', 0.35, d, () => spawnAimedLaser(game, en, game.player, '#fbbf24'));
  };
  g.enemies.push(e);
  g.bossRef = e;
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.9) {
      g.rainT = 0;
      g.bullets.push(new Bullet({
        x: Math.random() * LOGICAL_W, y: -20,
        vx: (Math.random() - 0.5) * 1.5, vy: 0.8,
        type: 'large', color: '#fdba74', from: 'enemy', life: 10,
      }));
    }
  };
}

function chapter_s3_2(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.9) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 12) return;
    const left = g.waveCount % 2 === 0;
    const e = mob(left ? 40 : LOGICAL_W - 40, 50 + (g.waveCount % 4) * 30, 35, left ? '#f87171' : '#60a5fa');
    e.script = (en, d, game) => {
      timer(en, 's', 0.7, d, () => {
        spawnAimed(game, en, game.player, { n: 6, parity: 'even', type: 'dot', speed: 2.2, spread: 0.11, color: en.color });
      });
    };
    g.enemies.push(e);
  };
}

function chapter_s3_3(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.6) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 16) return;
    const e = mob(30 + Math.random() * (LOGICAL_W - 60), -15, 20, Math.random() < 0.5 ? '#f87171' : '#60a5fa');
    e.vy = 1.5;
    e.score = 800;
    e.drop = 'scoreL';
    e.onDeath = (en, game) => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'rice', speed: 2.6, color: '#fbbf24' });
    };
    g.enemies.push(e);
  };
}

function chapter_s3_4(g) {
  const e = elite({
    x: LOGICAL_W / 2, y: 90, hp: 1400, kind: 'mid3', color: '#fbbf24', label: '防护三角', enterY: 90,
  });
  e.script = (en, d, game) => {
    timer(en, 'drop', 1.6, d, () => {
      for (let i = -2; i <= 2; i++) {
        const b = new Bullet({
          x: en.x + i * 30, y: en.y, vx: i * 0.15, vy: 1.8,
          type: 'large', color: '#f59e0b', from: 'enemy', life: 1.1,
          onSplit: (self) => {
            spawnRingAt(game, self.x, self.y, 12, 1.8, 'dot', '#fde68a');
          },
        });
        game.bullets.push(b);
      }
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_s3_5(g) {
  g.waveFn = (dt) => {
    g.laserT = (g.laserT || 0) + dt;
    if (g.laserT > 0.55) {
      g.laserT = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      const y = 80 + (g.waveCount * 37) % 400;
      spawnHLaser(g, y, g.waveCount % 2 === 0 ? 1 : -1, '#f97316');
    }
  };
}

function chapter_s3_6(g) {
  const e = elite({
    x: LOGICAL_W / 2, y: 80, hp: 400, color: '#fb923c', enterY: 80,
  });
  e.script = (en, d, game) => {
    timer(en, 's', 0.7, d, () => {
      spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'talisman', speed: 2.4, color: '#fdba74' });
    });
  };
  g.enemies.push(e);
  g.waveFn = (dt) => {
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.12) {
      g.rainT = 0;
      g.bullets.push(new Bullet({
        x: Math.random() * LOGICAL_W, y: -10,
        vx: 0, vy: 2.2 + Math.random(),
        type: 'dot', color: '#fdba74', from: 'enemy', gravity: 0.01,
      }));
    }
  };
}

function chapter_dazong_1(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3500, kind: 'dazong',
    color: '#fbbf24', color2: '#fb923c', label: '大宗关不是·互然雏', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'laser', 0.2, d, () => {
      en.data.la = (en.data.la || 0) + 0.4;
      const n = Math.max(3, scaleN(game, 4));
      for (let i = 0; i < n; i++) {
        const ang = en.data.la + (i / n) * Math.PI * 2;
        game.bullets.push(new Bullet({
          x: en.x, y: en.y, angle: ang, speed: 3.5, type: 'laser',
          color: '#fbbf24', laserLen: 160, w: 10, r: 5, life: 1.0, from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', 0.45, d, () => {
      spawnAimed(game, en, game.player, { n: 5, parity: 'odd', type: 'rice', speed: 2.8, spread: 0.12, color: '#fdba74' });
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_dazong_2(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 4000, kind: 'dazong',
    color: '#fbbf24', color2: '#fb923c', label: '大宗关不是·互然雏', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'ring', 0.8, d, () => {
      const n = Math.max(8, scaleN(game, 24));
      const ang = Math.atan2(game.player.y - en.y, game.player.x - en.x);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ang;
        game.bullets.push(new Bullet({
          x: en.x, y: en.y, angle: a, speed: 2.0, type: 'dot', color: '#f59e0b', from: 'enemy', delay: 0.3,
        }));
      }
    });
    timer(en, 'side', 0.5, d, () => {
      const n = Math.max(4, scaleN(game, 10));
      for (let i = 0; i < n; i++) {
        const x = 20 + i * (220 / n);
        game.bullets.push(new Bullet({
          x, y: -10, vx: 0.15 * (i % 2 === 0 ? 1 : -1), vy: 2.0,
          type: 'rice', color: '#fb923c', from: 'enemy', angle: Math.PI / 2,
        }));
        game.bullets.push(new Bullet({
          x: LOGICAL_W - 20 - i * (180 / n), y: -15, vx: 0, vy: 1.8,
          type: 'rice', color: '#fbbf24', from: 'enemy',
        }));
      }
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

export const chapters = [
  {
    id: 15, name: '3-1 激光与大玉', stage: 3, stageKey: 3, kind: 'mid',
    unstable: true, music: 's3_mid', bg: 's3_mid', duration: 26,
    build: (g) => chapter_s3_1(g),
  },
  {
    id: 16, name: '3-2 Unstable 交叉网', stage: 3, stageKey: 3, kind: 'mid',
    unstable: true, music: 's3_mid', bg: 's3_mid', duration: 26,
    build: (g) => chapter_s3_2(g),
  },
  {
    id: 17, name: '3-3 高分反击', stage: 3, stageKey: 3, kind: 'mid',
    unstable: true, music: 's3_mid', bg: 's3_mid', duration: 24,
    build: (g) => chapter_s3_3(g),
  },
  {
    id: 18, name: '3-4 三角精英', stage: 3, stageKey: 3, kind: 'midboss',
    music: 's3_mid', bg: 's3_mid', duration: 32,
    build: (g) => chapter_s3_4(g),
  },
  {
    id: 19, name: '3-5 横向激光墙', stage: 3, stageKey: 3, kind: 'mid',
    unstable: true, music: 's3_mid', bg: 's3_mid', duration: 26,
    build: (g) => chapter_s3_5(g),
  },
  {
    id: 20, name: '3-6 重力倾泻', stage: 3, stageKey: 3, kind: 'mid',
    unstable: true, music: 's3_mid', bg: 's3_mid', duration: 26,
    build: (g) => chapter_s3_6(g),
  },
  {
    id: 21, name: '大宗关「代码冲突」', stage: 3, stageKey: 3, kind: 'boss',
    music: 's3_boss', bg: 's3_boss',
    dialogue: 's3_boss', letter: '代码冲突 · 无法合并的分支', letterTime: 45,
    build: (g) => chapter_dazong_1(g),
  },
  {
    id: 22, name: '大宗关「最终合并」', stage: 3, stageKey: 3, kind: 'boss',
    music: 's3_boss', bg: 's3_boss',
    letter: '编辑战 · 最终合并请求', letterTime: 48,
    build: (g) => chapter_dazong_2(g),
  },
];

export const stageSelectEntry = { id: '3', label: '第3面', desc: '分歧的十字路口', startChapter: 15 };
