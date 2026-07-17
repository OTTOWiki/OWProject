import { boss, timer } from './_shared.js';
import { LOGICAL_W } from '../config.js';
import {
  spawnAimed, spawnRingAt,
} from '../patterns.js';
import { Bullet } from '../entities.js';

/* ========== patrol chapters ========== */
function chapter_patrol_1(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 90, hp: 3800, kind: 'patrol',
    color: '#f87171', color2: '#fca5a5', label: '全域巡查姬·404', enterY: 90,
  });
  e.script = (en, d, game) => {
    timer(en, 'grid', 0.08, d, () => {
      game.bullets.push(new Bullet({
        x: (en.data.gx || 0) % LOGICAL_W, y: -10,
        vx: 0, vy: 1.1, type: 'dot', color: '#fca5a5', from: 'enemy',
      }));
      en.data.gx = (en.data.gx || 0) + 17;
    });
    timer(en, 'aim', 0.18, d, () => {
      spawnAimed(game, en, game.player, { n: 1, parity: 'odd', type: 'rice', speed: 4.2, color: '#ef4444' });
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_patrol_2(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 4000, kind: 'patrol',
    color: '#f87171', color2: '#fca5a5', label: '全域巡查姬·404', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'big', 1.3, d, () => {
      const bx = 40 + Math.random() * (LOGICAL_W - 80);
      const by = 80 + Math.random() * 200;
      game.bullets.push(new Bullet({
        x: bx, y: by, vx: 0, vy: 0, type: 'large', color: '#f87171', from: 'enemy',
        life: 0.9, r: 14,
        onSplit: (self) => {
          spawnRingAt(game, self.x, self.y, 16, 2.0, 'talisman', '#fca5a5');
        },
      }));
    });
    timer(en, 'laser', 0.7, d, () => {
      spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'laser', speed: 5, spread: 0.25, color: '#ef4444', laserLen: 200 });
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

export const chapters = [
  {
    id: 23, name: '巡查姬「全站锁定」', stage: 'patrol', stageKey: 'patrol', kind: 'boss',
    music: 'patrol', bg: 'patrol',
    dialogue: 'patrol', letter: '全站锁定 · 无差别IP封禁', letterTime: 50,
    build: (g) => chapter_patrol_1(g),
  },
  {
    id: 24, name: '巡查姬「404」', stage: 'patrol', stageKey: 'patrol', kind: 'boss',
    music: 'patrol', bg: 'patrol',
    letter: '404 Not Found · 存在抹消', letterTime: 50,
    build: (g) => chapter_patrol_2(g),
  },
];

export const stageSelectEntry = { id: 'patrol', label: '中立拦截', desc: '全域巡查姬·404', startChapter: 23 };
