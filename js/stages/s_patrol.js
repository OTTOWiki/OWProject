/**
 * 巡查姬 404 — Letter 走 pushBossRef + 章节元数据工厂
 */
import {
  timer, faceDefaults, letterChapter, pushBossRef,
} from './_shared.js';
import { LOGICAL_W } from '../config.js';
import {
  spawnAimed, spawnRingAt,
} from '../patterns.js';
import { acquireBullet } from '../bulletPool.js';

const FACE = faceDefaults('patrol', {
  musicMid: 'patrol', musicBoss: 'patrol', bgMid: 'patrol', bgBoss: 'patrol',
});

const BOSS_PATROL = {
  x: LOGICAL_W / 2, kind: 'patrol',
  color: '#f87171', color2: '#fca5a5', label: '全域巡查姬·404',
};

function chapter_patrol_1(g) {
  pushBossRef(g, { ...BOSS_PATROL, y: 90, enterY: 90, hp: 3800 }, (en, d, game) => {
    timer(en, 'grid', 0.08, d, () => {
      game.spawnBullet(acquireBullet({
        x: (en.data.gx || 0) % LOGICAL_W, y: -10,
        vx: 0, vy: 1.1, type: 'dot', color: '#fca5a5', from: 'enemy',
      }));
      en.data.gx = (en.data.gx || 0) + 17;
    });
    timer(en, 'aim', 0.18, d, () => {
      spawnAimed(game, en, game.player, { n: 1, parity: 'odd', type: 'rice', speed: 4.2, color: '#ef4444' });
    });
  });
}

function chapter_patrol_2(g) {
  pushBossRef(g, { ...BOSS_PATROL, y: 100, enterY: 100, hp: 4000 }, (en, d, game) => {
    timer(en, 'big', 1.3, d, () => {
      for (let i = 0; i < 2; i++) {
        const bx = 40 + Math.random() * (LOGICAL_W - 80);
        const by = 80 + Math.random() * 200;
        game.spawnBullet(acquireBullet({
          x: bx, y: by, vx: 0, vy: 0, type: 'large', color: '#f87171', from: 'enemy',
          life: 0.9, r: 14,
          onSplit: (self) => {
            spawnRingAt(game, self.x, self.y, 20, 2.0, 'talisman', '#fca5a5');
          },
        }));
      }
    });
    timer(en, 'laser', 0.7, d, () => {
      spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'laser', speed: 5, spread: 0.25, color: '#ef4444', laserLen: 200 });
    });
  });
}

export const chapters = [
  letterChapter(FACE, {
    id: 23, name: '巡查姬「全站锁定」',
    dialogue: 'patrol', letter: '全站锁定 · 无差别IP封禁', letterTime: 50,
    build: chapter_patrol_1,
  }),
  letterChapter(FACE, {
    id: 24, name: '巡查姬「404」',
    letter: '404 Not Found · 存在抹消', letterTime: 50,
    onClear: 'routeSelect',
    build: chapter_patrol_2,
  }),
];

export const stageSelectEntry = { id: 'patrol', label: '中立拦截', desc: '全域巡查姬·404', startChapter: 23 };
