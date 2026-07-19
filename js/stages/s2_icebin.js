/**
 * 第2面 · Icebin（T14：installMidWave + pushBossRef + 章节元数据工厂）
 */
import {
  mob, elite, timer, scaleN,
  faceDefaults, midChapter, letterChapter,
  installMidWave, pushBossRef,
} from './_shared.js';
import { LOGICAL_W } from '../config.js';
import {
  spawnAimed, spawnRingAt, spawnGravityRain, spawnAimedLaser,
} from '../patterns.js';
import { Bullet } from '../entities.js';

const FACE = faceDefaults(2);

/* ========== s2 builds ========== */
function chapter_s2_1(g) {
  installMidWave(g, {
    interval: 1.2,
    maxWaves: 8,
    onWave: (game, wave) => {
      const left = wave % 2 === 1;
      const e = elite({
        x: left ? 40 : LOGICAL_W - 40, y: 80, hp: 160, color: '#38bdf8', kind: 'generic',
      });
      e.vy = 0.3;
      e.script = (en, d, gm) => {
        timer(en, 's', 0.9, d, () => {
          spawnAimed(gm, en, gm.player, { n: 5, parity: 'odd', type: 'dot', speed: 2.3, spread: 0.12, color: '#38bdf8' });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

function chapter_s2_2(g) {
  installMidWave(g, {
    interval: 0.8,
    maxWaves: 12,
    continuous: (game, dt) => {
      game.rainT = (game.rainT || 0) + dt;
      if (game.rainT > 0.35) {
        game.rainT = 0;
        game.spawnBullet(new Bullet({
          x: Math.random() * LOGICAL_W, y: -10,
          vx: (Math.random() - 0.5) * 0.6, vy: 1.4 + Math.random(),
          type: 'dot', color: '#93c5fd', from: 'enemy',
        }));
      }
    },
    onWave: (game) => {
      const e = mob(60 + Math.random() * (LOGICAL_W - 120), -20, 36, '#7dd3fc');
      e.vy = 1.1;
      e.script = (en, d, gm) => {
        timer(en, 's', 0.45, d, () => {
          spawnAimed(gm, en, gm.player, { n: 1, parity: 'odd', type: 'rice', speed: 3.2, color: '#bae6fd' });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

function chapter_s2_3(g) {
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 110, hp: 1100, kind: 'mid2', color: '#7dd3fc',
    label: '审核结界', enterY: 110,
  }, (en, d, game) => {
    timer(en, 'aim', 0.8, d, () => {
      spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'medium', speed: 2.0, spread: 0.25, color: '#38bdf8' });
    });
    timer(en, 'ring', 2.0, d, () => {
      spawnRingAt(game, en.x, en.y, 16, 1.6, 'dot', '#a5f3fc', en.age);
    });
  }, 'elite');
}

function chapter_s2_4(g) {
  installMidWave(g, {
    interval: 2.5,
    maxWaves: 5,
    onWave: (game) => {
      const e = elite({
        x: 80 + Math.random() * (LOGICAL_W - 160), y: 70, hp: 220, color: '#0ea5e9', r: 26,
      });
      e.script = (en, d, gm) => {
        timer(en, 's', 1.1, d, () => {
          spawnAimed(gm, en, gm.player, { n: 7, parity: 'odd', type: 'rice', speed: 2.5, spread: 0.1, color: '#38bdf8' });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

function chapter_s2_5(g) {
  installMidWave(g, {
    interval: 1.3,
    maxWaves: 8,
    onWave: (game, wave) => {
      const e = mob(40 + (wave * 45) % (LOGICAL_W - 80), 60, 40, '#fbbf24');
      e.script = (en, d, gm) => {
        timer(en, 'laser', 1.6, d, () => spawnAimedLaser(gm, en, gm.player, '#fde68a'));
        timer(en, 's', 0.5, d, () => {
          spawnAimed(gm, en, gm.player, { n: 2, parity: 'even', type: 'dot', speed: 2.8, spread: 0.3, color: '#fcd34d' });
        });
      };
      game.spawnEnemy(e);
    },
  });
}

function chapter_ice_1(g) {
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 95, hp: 2800, kind: 'icebin',
    color: '#7dd3fc', color2: '#e0f2fe', label: 'Icebin', enterY: 95,
  }, (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 0.6) * 50;
    timer(en, 'spiral', 0.12, d, () => {
      en.data.a = (en.data.a || 0) + 0.35;
      for (const side of [-1, 1]) {
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y,
          angle: en.data.a * side, speed: 1.8, type: 'talisman', color: '#67e8f9', from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'rice', speed: 3.5, color: '#bae6fd' });
    });
  });
}

function chapter_ice_2(g) {
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 100, hp: 3000, kind: 'icebin',
    color: '#7dd3fc', color2: '#e0f2fe', label: 'Icebin', enterY: 100,
  }, (en, d, game) => {
    timer(en, 'ring', 1.1, d, () => {
      const n = Math.max(6, scaleN(game, 18));
      const ang = Math.atan2(game.player.y - en.y, game.player.x - en.x);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ang;
        game.spawnBullet(new Bullet({
          x: en.x, y: en.y, angle: a, speed: 2.2,
          type: 'dot', color: '#38bdf8', from: 'enemy', delay: 0.35,
        }));
      }
    });
  });
}

function chapter_ice_3(g) {
  pushBossRef(g, {
    x: LOGICAL_W / 2, y: 90, hp: 3200, kind: 'icebin',
    color: '#7dd3fc', color2: '#e0f2fe', label: 'Icebin', enterY: 90,
  }, (en, d, game) => {
    timer(en, 'rain', 0.25, d, () => {
      spawnGravityRain(game, 2, 'medium', '#7dd3fc', 1.0);
    });
    timer(en, 'aim', 1.5, d, () => {
      spawnAimed(game, en, game.player, { n: 4, parity: 'even', type: 'rice', speed: 2.8, spread: 0.14, color: '#e0f2fe' });
    });
  });
}

export const chapters = [
  midChapter(FACE, {
    id: 7, name: '2-1 扇形奇数狙', kind: 'mid',
    unstable: true, duration: 24, build: chapter_s2_1,
  }),
  midChapter(FACE, {
    id: 8, name: '2-2 Unstable 飘落', kind: 'mid',
    unstable: true, duration: 26, build: chapter_s2_2,
  }),
  midChapter(FACE, {
    id: 9, name: '2-3 菱形精英', kind: 'midboss',
    duration: 30, build: chapter_s2_3,
  }),
  midChapter(FACE, {
    id: 10, name: '2-4 重装倾泻', kind: 'mid',
    unstable: true, duration: 24, build: chapter_s2_4,
  }),
  midChapter(FACE, {
    id: 11, name: '2-5 激光横移', kind: 'mid',
    unstable: true, duration: 26, build: chapter_s2_5,
  }),
  letterChapter(FACE, {
    id: 12, name: 'Icebin「权限交割」',
    dialogue: 's2_boss', letter: '权限交割 · 越权警告', letterTime: 42,
    build: chapter_ice_1,
  }),
  letterChapter(FACE, {
    id: 13, name: 'Icebin「页面重定向」',
    letter: '页面重定向 · 环形跳转', letterTime: 42,
    build: chapter_ice_2,
  }),
  letterChapter(FACE, {
    id: 14, name: 'Icebin「标签混乱」',
    letter: '标签混乱 · 分类溢出', letterTime: 42,
    build: chapter_ice_3,
  }),
];

export const stageSelectEntry = { id: '2', label: '第2面', desc: '编辑日常 · 审核冲突', startChapter: 7 };
