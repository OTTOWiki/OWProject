import { mob, elite, boss, timer } from './_shared.js';
import { LOGICAL_W, LOGICAL_H } from '../config.js';
import {
  spawnAimed, spawnRingAt, spawnCrossFall,
} from '../patterns.js';
import { Bullet } from '../entities.js';

/* ========== s1 chapters ========== */
function chapter_s1_1(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.9) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 12) return;
    const side = g.waveCount % 2 === 0 ? 80 : LOGICAL_W - 80;
    const e = mob(side, -20, 28);
    e.vy = 1.2;
    e.script = (en, d, game) => {
      timer(en, 's', 0.85, d, () => {
        spawnAimed(game, en, game.player, { n: 1, parity: 'odd', type: 'dot', speed: 2.4, color: '#4ade80' });
      });
    };
    g.enemies.push(e);
  };
}

function chapter_s1_2(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 1.0) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 10) return;
    const e = mob(40 + Math.random() * (LOGICAL_W - 80), -20, 32, '#86efac');
    e.vy = 1.0;
    e.script = (en, d, game) => {
      timer(en, 's', 1.0, d, () => {
        spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'rice', speed: 2.0, spread: 0.22, color: '#a3e635' });
      });
    };
    g.enemies.push(e);
  };
}

function chapter_s1_3(g) {
  const e = elite({
    x: LOGICAL_W / 2, y: 100, hp: 900, kind: 'mid1', color: '#f9a8d4',
    label: '草稿精英', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'big', 2.2, d, () => {
      game.bullets.push(new Bullet({
        x: en.x, y: en.y, vx: 0, vy: 1.6, type: 'large', color: '#f472b6', from: 'enemy', gravity: 0.015,
      }));
    });
    timer(en, 's', 0.7, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'talisman', speed: 2.3, spread: 0.14, color: '#c084fc' });
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_s1_4(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.7) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 14) return;
    for (const x of [50, LOGICAL_W - 50]) {
      const e = mob(x, -15, 30, '#67e8f9');
      e.vy = 1.3;
      e.script = (en, d, game) => {
        timer(en, 's', 0.9, d, () => {
          spawnAimed(game, en, game.player, { n: 4, parity: 'even', type: 'rice', speed: 2.1, spread: 0.12, color: '#22d3ee' });
        });
      };
      g.enemies.push(e);
    }
  };
}

function chapter_alice_1(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 90, hp: 2200, kind: 'alice',
    color: '#f9a8d4', color2: '#67e8f9', label: '爱丽丝', enterY: 90,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 0.8) * 60;
    timer(en, 'aim', 0.55, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'dot', speed: 2.6, color: '#f9a8d4' });
    });
    timer(en, 'cross', 1.4, d, () => {
      spawnCrossFall(game, { type: 'rice', color: '#c084fc', speed: 1.7, lanes: 5 });
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_alice_2(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 2500, kind: 'alice',
    color: '#f9a8d4', color2: '#67e8f9', label: '爱丽丝', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'big', 2.5, d, () => {
      game.bullets.push(new Bullet({
        x: en.x, y: en.y, vx: 0, vy: 1.1, type: 'large', color: '#f472b6', from: 'enemy',
      }));
    });
    timer(en, 'side', 0.28, d, () => {
      en.data.flip = !en.data.flip;
      const side = en.data.flip ? -1 : 1;
      const ang = Math.PI / 2 + side * 0.55;
      spawnAimed(game, en, game.player, {
        n: 2, parity: 'even', type: 'talisman', speed: 2.8, spread: 0.2,
        color: '#e879f9', baseAngle: ang,
      });
      const a = Math.atan2(game.player.y - en.y, game.player.x - en.x);
      for (const off of [-0.35, 0.35]) {
        game.bullets.push(new Bullet({
          x: en.x, y: en.y, angle: a + off, speed: 3.0, type: 'talisman',
          color: '#e879f9', from: 'enemy',
        }));
      }
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

export const chapters = [
  {
    id: 1, name: '1-1 零散草稿', stage: 1, stageKey: 1, kind: 'mid',
    unstable: true, music: 's1_mid', bg: 's1_mid', duration: 22,
    build: (g) => chapter_s1_1(g),
  },
  {
    id: 2, name: '1-2 Unstable 定力', stage: 1, stageKey: 1, kind: 'mid',
    unstable: true, music: 's1_mid', bg: 's1_mid', duration: 24,
    build: (g) => chapter_s1_2(g),
  },
  {
    id: 3, name: '1-3 道中精英', stage: 1, stageKey: 1, kind: 'midboss',
    music: 's1_mid', bg: 's1_mid', duration: 28,
    build: (g) => chapter_s1_3(g),
  },
  {
    id: 4, name: '1-4 两侧封锁', stage: 1, stageKey: 1, kind: 'mid',
    unstable: true, music: 's1_mid', bg: 's1_mid', duration: 22,
    build: (g) => chapter_s1_4(g),
  },
  {
    id: 5, name: '爱丽丝「全域草稿」', stage: 1, stageKey: 1, kind: 'boss',
    music: 's1_boss', bg: 's1_boss',
    dialogue: 's1_boss', letter: '全域草稿 · 未审核的错字', letterTime: 40,
    build: (g) => chapter_alice_1(g),
  },
  {
    id: 6, name: '爱丽丝「拼写纠错」', stage: 1, stageKey: 1, kind: 'boss',
    music: 's1_boss', bg: 's1_boss',
    letter: '拼写纠错 · 多余的空格', letterTime: 40,
    build: (g) => chapter_alice_2(g),
  },
];

export const stageSelectEntry = { id: '1', label: '第1面', desc: '维基外围 · 零散草稿', startChapter: 1 };
