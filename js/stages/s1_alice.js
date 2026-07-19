/**
 * 第1面 · 爱丽丝（T14 试点：章节元数据工厂 + installMidWave）
 */
import {
  mob, elite, timer,
  faceDefaults, midChapter, letterChapter,
  installMidWave, pushBossRef,
} from './_shared.js';
import { LOGICAL_W } from '../config.js';
import {
  spawnAimed, spawnCrossFall,
} from '../patterns.js';
import { acquireBullet } from '../bulletPool.js';

const FACE = faceDefaults(1);

/* ========== s1 builds ========== */
function chapter_s1_1(g) {
  installMidWave(g, {
    interval: 0.9,
    maxWaves: 12,
    onWave: (game, wave) => {
      const side = wave % 2 === 0 ? 80 : LOGICAL_W - 80;
      const e = mob(side, -20, 28);
      e.vy = 1.2;
      e.script = (en, d, gm) => {
        timer(en, 's', 0.85, d, () => {
          spawnAimed(gm, en, gm.player, { n: 1, parity: 'odd', type: 'dot', speed: 2.4, color: '#4ade80' });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

function chapter_s1_2(g) {
  installMidWave(g, {
    interval: 1.0,
    maxWaves: 10,
    onWave: (game) => {
      const e = mob(40 + Math.random() * (LOGICAL_W - 80), -20, 32, '#86efac');
      e.vy = 1.0;
      e.script = (en, d, gm) => {
        timer(en, 's', 1.0, d, () => {
          spawnAimed(gm, en, gm.player, { n: 2, parity: 'even', type: 'rice', speed: 2.0, spread: 0.22, color: '#a3e635' });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

function chapter_s1_3(g) {
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 900, kind: 'mid1', color: '#f9a8d4',
    label: '草稿精英', enterY: 100,
  }, (en, d, game) => {
    timer(en, 'big', 2.2, d, () => {
      game.spawnBullet(acquireBullet({
        x: en.x, y: en.y, vx: 0, vy: 1.6, type: 'large', color: '#f472b6', from: 'enemy', gravity: 0.015,
      }));
    });
    timer(en, 's', 0.7, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'talisman', speed: 2.3, spread: 0.14, color: '#c084fc' });
    });
  }, 'elite');
}

function chapter_s1_4(g) {
  installMidWave(g, {
    interval: 0.7,
    maxWaves: 14,
    onWave: (game) => {
      for (const x of [50, LOGICAL_W - 50]) {
        const e = mob(x, -15, 30, '#67e8f9');
        e.vy = 1.3;
        e.script = (en, d, gm) => {
          timer(en, 's', 0.9, d, () => {
            spawnAimed(gm, en, gm.player, { n: 4, parity: 'even', type: 'rice', speed: 2.1, spread: 0.12, color: '#22d3ee' });
          });
        };
        game.spawnEnemy(e);
      }
    },
  });
}

function chapter_alice_1(g) {
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 90, hp: 2200, kind: 'alice',
    color: '#f9a8d4', color2: '#67e8f9', label: '爱丽丝', enterY: 90,
  }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 0.8) * 60;
    timer(en, 'aim', 0.55, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'dot', speed: 2.6, color: '#f9a8d4' });
    });
    timer(en, 'cross', 1.4, d, () => {
      spawnCrossFall(game, { type: 'rice', color: '#c084fc', speed: 1.7, lanes: 5 });
    });
  });
}

function chapter_alice_2(g) {
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 2500, kind: 'alice',
    color: '#f9a8d4', color2: '#67e8f9', label: '爱丽丝', enterY: 100,
  }, (en, d, game) => {
    timer(en, 'big', 2.5, d, () => {
      game.spawnBullet(acquireBullet({
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
        game.spawnBullet(acquireBullet({
          x: en.x, y: en.y, angle: a + off, speed: 3.0, type: 'talisman',
          color: '#e879f9', from: 'enemy',
        }));
      }
    });
  });
}

export const chapters = [
  midChapter(FACE, {
    id: 1, name: '1-1 零散草稿', kind: 'mid',
    unstable: true, duration: 22, build: chapter_s1_1,
  }),
  midChapter(FACE, {
    id: 2, name: '1-2 Unstable 定力', kind: 'mid',
    unstable: true, duration: 24, build: chapter_s1_2,
  }),
  midChapter(FACE, {
    id: 3, name: '1-3 道中精英', kind: 'midboss',
    duration: 28, build: chapter_s1_3,
  }),
  midChapter(FACE, {
    id: 4, name: '1-4 两侧封锁', kind: 'mid',
    unstable: true, duration: 22, build: chapter_s1_4,
  }),
  letterChapter(FACE, {
    id: 5, name: '爱丽丝「全域草稿」',
    dialogue: 's1_boss', letter: '全域草稿 · 未审核的错字', letterTime: 40,
    build: chapter_alice_1,
  }),
  letterChapter(FACE, {
    id: 6, name: '爱丽丝「拼写纠错」',
    letter: '拼写纠错 · 多余的空格', letterTime: 40,
    build: chapter_alice_2,
  }),
];

export const stageSelectEntry = { id: '1', label: '第1面', desc: '维基外围 · 零散草稿', startChapter: 1 };
