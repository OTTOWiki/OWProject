/**
 * 关卡 / 章节编排
 * 每章: { id, name, stage, stageKey, kind, unstable?, tendencyPoints?, music, bg, dialogue?, letter?, duration?, build }
 */
import { Enemy } from './entities.js';
import { LOGICAL_W, LOGICAL_H, BALANCE } from './config.js';
import {
  spawnAimed, spawnRingAt, spawnCrossFall, spawnGravityRain,
  spawnHLaser, spawnAimedLaser,
} from './patterns.js';
import { Bullet } from './entities.js';

function mob(x, y, hp, color = '#86efac') {
  return new Enemy({
    x, y, hp, r: 14, type: 'mob', color, score: BALANCE.score.killSmall,
    enterY: y > 0 ? y : 40,
  });
}

function elite(opts) {
  return new Enemy({
    type: 'elite', r: 22, score: BALANCE.score.killElite, ...opts,
  });
}

function boss(opts) {
  return new Enemy({
    type: 'boss', r: 36, score: BALANCE.score.killBoss, invuln: 1.2, ...opts,
  });
}

function timer(e, key, interval, dt, fn) {
  e.timers[key] = (e.timers[key] || 0) - dt;
  if (e.timers[key] <= 0) {
    // fireInterval >1 = 开火更慢（Easy）；<1 = 更密（Lunatic）
    e.timers[key] = interval * (e._fireMul ?? 1);
    fn();
  }
}

/** 章节列表（含练习模式） */
export function buildChapterList() {
  return [
    // ===== Stage 1 =====
    {
      id: 1, name: '1-1 零散草稿', stage: 1, stageKey: 1, kind: 'mid',
      tendencyPoints: 1, music: 's1_mid', bg: 's1_mid', duration: 22,
      build: (g) => chapter_s1_1(g),
    },
    {
      id: 2, name: '1-2 Unstable 定力', stage: 1, stageKey: 1, kind: 'mid',
      unstable: true, tendencyPoints: 1, music: 's1_mid', bg: 's1_mid', duration: 24,
      build: (g) => chapter_s1_2(g),
    },
    {
      id: 3, name: '1-3 道中精英', stage: 1, stageKey: 1, kind: 'midboss',
      tendencyPoints: 1, music: 's1_mid', bg: 's1_mid', duration: 28,
      build: (g) => chapter_s1_3(g),
    },
    {
      id: 4, name: '1-4 两侧封锁', stage: 1, stageKey: 1, kind: 'mid',
      tendencyPoints: 1, music: 's1_mid', bg: 's1_mid', duration: 22,
      build: (g) => chapter_s1_4(g),
    },
    {
      id: 5, name: '爱丽丝「全域草稿」', stage: 1, stageKey: 1, kind: 'boss',
      tendencyPoints: 1, music: 's1_boss', bg: 's1_boss',
      dialogue: 's1_boss', letter: '全域草稿 · 未审核的错字', letterTime: 40,
      build: (g) => chapter_alice_1(g),
    },
    {
      id: 6, name: '爱丽丝「拼写纠错」', stage: 1, stageKey: 1, kind: 'boss',
      tendencyPoints: 1, music: 's1_boss', bg: 's1_boss',
      letter: '拼写纠错 · 多余的空格', letterTime: 40,
      build: (g) => chapter_alice_2(g),
    },
    // ===== Stage 2 =====
    {
      id: 7, name: '2-1 扇形奇数狙', stage: 2, stageKey: 2, kind: 'mid',
      tendencyPoints: 1, music: 's2_mid', bg: 's2_mid', duration: 24,
      build: (g) => chapter_s2_1(g),
    },
    {
      id: 8, name: '2-2 Unstable 飘落', stage: 2, stageKey: 2, kind: 'mid',
      unstable: true, tendencyPoints: 1, music: 's2_mid', bg: 's2_mid', duration: 26,
      build: (g) => chapter_s2_2(g),
    },
    {
      id: 9, name: '2-3 菱形精英', stage: 2, stageKey: 2, kind: 'midboss',
      tendencyPoints: 1, music: 's2_mid', bg: 's2_mid', duration: 30,
      build: (g) => chapter_s2_3(g),
    },
    {
      id: 10, name: '2-4 重装倾泻', stage: 2, stageKey: 2, kind: 'mid',
      tendencyPoints: 1, music: 's2_mid', bg: 's2_mid', duration: 24,
      build: (g) => chapter_s2_4(g),
    },
    {
      id: 11, name: '2-5 激光横移', stage: 2, stageKey: 2, kind: 'mid',
      tendencyPoints: 1, music: 's2_mid', bg: 's2_mid', duration: 26,
      build: (g) => chapter_s2_5(g),
    },
    {
      id: 12, name: 'Icebin「权限交割」', stage: 2, stageKey: 2, kind: 'boss',
      tendencyPoints: 1, music: 's2_boss', bg: 's2_boss',
      dialogue: 's2_boss', letter: '权限交割 · 越权警告', letterTime: 42,
      build: (g) => chapter_ice_1(g),
    },
    {
      id: 13, name: 'Icebin「页面重定向」', stage: 2, stageKey: 2, kind: 'boss',
      tendencyPoints: 1, music: 's2_boss', bg: 's2_boss',
      letter: '页面重定向 · 环形跳转', letterTime: 42,
      build: (g) => chapter_ice_2(g),
    },
    {
      id: 14, name: 'Icebin「标签混乱」', stage: 2, stageKey: 2, kind: 'boss',
      tendencyPoints: 1, music: 's2_boss', bg: 's2_boss',
      letter: '标签混乱 · 分类溢出', letterTime: 42,
      build: (g) => chapter_ice_3(g),
    },
    // ===== Stage 3 =====
    {
      id: 15, name: '3-1 激光与大玉', stage: 3, stageKey: 3, kind: 'mid',
      tendencyPoints: 1, music: 's3_mid', bg: 's3_mid', duration: 26,
      build: (g) => chapter_s3_1(g),
    },
    {
      id: 16, name: '3-2 Unstable 交叉网', stage: 3, stageKey: 3, kind: 'mid',
      unstable: true, tendencyPoints: 1, music: 's3_mid', bg: 's3_mid', duration: 26,
      build: (g) => chapter_s3_2(g),
    },
    {
      id: 17, name: '3-3 高分反击', stage: 3, stageKey: 3, kind: 'mid',
      tendencyPoints: 1, music: 's3_mid', bg: 's3_mid', duration: 24,
      build: (g) => chapter_s3_3(g),
    },
    {
      id: 18, name: '3-4 三角精英', stage: 3, stageKey: 3, kind: 'midboss',
      tendencyPoints: 1, music: 's3_mid', bg: 's3_mid', duration: 32,
      build: (g) => chapter_s3_4(g),
    },
    {
      id: 19, name: '3-5 横向激光墙', stage: 3, stageKey: 3, kind: 'mid',
      tendencyPoints: 1, music: 's3_mid', bg: 's3_mid', duration: 26,
      build: (g) => chapter_s3_5(g),
    },
    {
      id: 20, name: '3-6 重力倾泻', stage: 3, stageKey: 3, kind: 'mid',
      tendencyPoints: 1, music: 's3_mid', bg: 's3_mid', duration: 26,
      build: (g) => chapter_s3_6(g),
    },
    {
      id: 21, name: '大宗关「代码冲突」', stage: 3, stageKey: 3, kind: 'boss',
      tendencyPoints: 1, music: 's3_boss', bg: 's3_boss',
      dialogue: 's3_boss', letter: '代码冲突 · 无法合并的分支', letterTime: 45,
      build: (g) => chapter_dazong_1(g),
    },
    {
      id: 22, name: '大宗关「最终合并」', stage: 3, stageKey: 3, kind: 'boss',
      tendencyPoints: 1, music: 's3_boss', bg: 's3_boss',
      letter: '编辑战 · 最终合并请求', letterTime: 48,
      build: (g) => chapter_dazong_2(g),
    },
    // ===== Patrol =====
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
    // ===== A route =====
    {
      id: 25, name: 'A4 门百梁道中', stage: 'A4', stageKey: 'A4', kind: 'mid',
      music: 'a4_mid', bg: 'a4_mid', duration: 28,
      build: (g) => chapter_generic_mid(g, '#fbbf24', 3),
    },
    {
      id: 26, name: '门百梁', stage: 'A4', stageKey: 'A4', kind: 'boss',
      music: 'a4_boss', bg: 'a4_boss',
      dialogue: 'a4', letter: '方尖碑 · 强制购买', letterTime: 45,
      winDialogue: 'a4_win', loseDialogue: 'a4_lose',
      build: (g) => chapter_menbailiang(g),
    },
    {
      id: 27, name: 'A5 对峙道中', stage: 'A5', stageKey: 'A5', kind: 'mid',
      music: 'a5_mid', bg: 'a5_mid', duration: 24,
      build: (g) => chapter_generic_mid(g, '#c4b5fd', 4),
    },
    {
      id: 28, name: '主角冲突', stage: 'A5', stageKey: 'A5', kind: 'boss',
      music: 'a5_boss', bg: 'a5_boss',
      dialogue: 'a5', letter: '署名权 · 编辑争执', letterTime: 45,
      winDialogue: 'a5_end',
      build: (g) => chapter_rival(g),
    },
    {
      id: 29, name: 'A6 一美个道中', stage: 'A6', stageKey: 'A6', kind: 'mid',
      music: 'a6_mid', bg: 'a6_mid', duration: 26,
      build: (g) => chapter_generic_mid(g, '#e879f9', 4),
    },
    {
      id: 30, name: '一美个 第一卡', stage: 'A6', stageKey: 'A6', kind: 'boss',
      music: 'a6_boss', bg: 'a6_boss',
      dialogue: 'a6', letter: '哈机密 · 甜蜜陷阱', letterTime: 42,
      build: (g) => chapter_yimeige_1(g),
    },
    {
      id: 31, name: '一美个 最终卡', stage: 'A6', stageKey: 'A6', kind: 'boss',
      music: 'a6_boss', bg: 'a6_boss',
      dialogue: 'a6_last', letter: '哈机密乐园 · 全面崩坏', letterTime: 50,
      ending: 'A',
      build: (g) => chapter_yimeige_2(g),
    },
    // ===== B route =====
    {
      id: 32, name: 'B4 创车道中', stage: 'B4', stageKey: 'B4', kind: 'mid',
      music: 'b4_mid', bg: 'b4_mid', duration: 26,
      build: (g) => chapter_generic_mid(g, '#fb7185', 4),
    },
    {
      id: 33, name: '赌人时尚', stage: 'B4', stageKey: 'B4', kind: 'boss',
      music: 'b4_boss', bg: 'b4_boss',
      dialogue: 'b4', letter: '独轮创车 · 灵魂洗涤', letterTime: 45,
      winDialogue: 'b4_win', loseDialogue: 'b4_lose',
      build: (g) => chapter_duren(g),
    },
    {
      id: 34, name: 'B5 街角道中', stage: 'B5', stageKey: 'B5', kind: 'mid',
      music: 'b5_mid', bg: 'b5_mid', duration: 24,
      build: (g) => chapter_generic_mid(g, '#fb923c', 4),
    },
    {
      id: 35, name: '棍电噢哆', stage: 'B5', stageKey: 'B5', kind: 'boss',
      music: 'b5_boss', bg: 'b5_boss',
      dialogue: 'b5', letter: '世界第一 · 推退辩论', letterTime: 45,
      winDialogue: 'b5_win', loseDialogue: 'b5_lose',
      build: (g) => chapter_gundian(g),
    },
    {
      id: 36, name: 'B6 迷雾道中', stage: 'B6', stageKey: 'B6', kind: 'mid',
      music: 'b6_mid', bg: 'b6_mid', duration: 28,
      build: (g) => chapter_generic_mid(g, '#a3e635', 5),
    },
    {
      id: 37, name: '神炫 第一卡', stage: 'B6', stageKey: 'B6', kind: 'boss',
      music: 'b6_boss', bg: 'b6_boss',
      dialogue: 'b6', letter: '炫妈迷雾 · 王座审判', letterTime: 45,
      build: (g) => chapter_lastgod_1(g),
    },
    {
      id: 38, name: '神炫 最终卡', stage: 'B6', stageKey: 'B6', kind: 'boss',
      music: 'b6_boss', bg: 'b6_boss',
      dialogue: 'b6_last', letter: '虾油风油精 · 绝对帝国', letterTime: 55,
      ending: 'B',
      build: (g) => chapter_lastgod_2(g),
    },
  ];
}

/* ========== Stage 1 chapters ========== */
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
      // force even aimed toward player flanks
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

/* ========== Stage 2 ========== */
function chapter_s2_1(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 1.2) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 8) return;
    const left = g.waveCount % 2 === 1;
    const e = elite({
      x: left ? 40 : LOGICAL_W - 40, y: 80, hp: 160, color: '#38bdf8', kind: 'generic',
    });
    e.vy = 0.3;
    e.script = (en, d, game) => {
      timer(en, 's', 0.9, d, () => {
        spawnAimed(game, en, game.player, { n: 5, parity: 'odd', type: 'dot', speed: 2.3, spread: 0.12, color: '#38bdf8' });
      });
    };
    g.enemies.push(e);
  };
}

function chapter_s2_2(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer > 0.8) {
      g.waveTimer = 0;
      g.waveCount = (g.waveCount || 0) + 1;
      if (g.waveCount <= 12) {
        const e = mob(60 + Math.random() * (LOGICAL_W - 120), -20, 36, '#7dd3fc');
        e.vy = 1.1;
        e.script = (en, d, game) => {
          timer(en, 's', 0.45, d, () => {
            spawnAimed(game, en, game.player, { n: 1, parity: 'odd', type: 'rice', speed: 3.2, color: '#bae6fd' });
          });
        };
        g.enemies.push(e);
      }
    }
    g.rainT = (g.rainT || 0) + dt;
    if (g.rainT > 0.35) {
      g.rainT = 0;
      g.bullets.push(new Bullet({
        x: Math.random() * LOGICAL_W, y: -10,
        vx: (Math.random() - 0.5) * 0.6, vy: 1.4 + Math.random(),
        type: 'dot', color: '#93c5fd', from: 'enemy',
      }));
    }
  };
}

function chapter_s2_3(g) {
  const e = elite({
    x: LOGICAL_W / 2, y: 110, hp: 1100, kind: 'mid2', color: '#7dd3fc', label: '审核结界', enterY: 110,
  });
  e.script = (en, d, game) => {
    timer(en, 'aim', 0.8, d, () => {
      spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'medium', speed: 2.0, spread: 0.25, color: '#38bdf8' });
    });
    timer(en, 'ring', 2.0, d, () => {
      spawnRingAt(game, en.x, en.y, 16, 1.6, 'dot', '#a5f3fc', en.age);
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_s2_4(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 2.5) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 5) return;
    const e = elite({
      x: 80 + Math.random() * (LOGICAL_W - 160), y: 70, hp: 220, color: '#0ea5e9', r: 26,
    });
    e.script = (en, d, game) => {
      timer(en, 's', 1.1, d, () => {
        spawnAimed(game, en, game.player, { n: 7, parity: 'odd', type: 'rice', speed: 2.5, spread: 0.1, color: '#38bdf8' });
      });
    };
    g.enemies.push(e);
  };
}

function chapter_s2_5(g) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 1.3) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 8) return;
    const e = mob(40 + (g.waveCount * 45) % (LOGICAL_W - 80), 60, 40, '#fbbf24');
    e.script = (en, d, game) => {
      timer(en, 'laser', 1.6, d, () => spawnAimedLaser(game, en, game.player, '#fde68a'));
      timer(en, 's', 0.5, d, () => {
        spawnAimed(game, en, game.player, { n: 2, parity: 'even', type: 'dot', speed: 2.8, spread: 0.3, color: '#fcd34d' });
      });
    };
    g.enemies.push(e);
  };
}

function chapter_ice_1(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 2800, kind: 'icebin',
    color: '#7dd3fc', color2: '#e0f2fe', label: 'Icebin', enterY: 95,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 0.6) * 50;
    timer(en, 'spiral', 0.12, d, () => {
      en.data.a = (en.data.a || 0) + 0.35;
      for (const side of [-1, 1]) {
        game.bullets.push(new Bullet({
          x: en.x, y: en.y,
          angle: en.data.a * side, speed: 1.8, type: 'talisman', color: '#67e8f9', from: 'enemy',
        }));
      }
    });
    timer(en, 'aim', 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'rice', speed: 3.5, color: '#bae6fd' });
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_ice_2(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3000, kind: 'icebin',
    color: '#7dd3fc', color2: '#e0f2fe', label: 'Icebin', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'ring', 1.1, d, () => {
      const px = game.player.x, py = game.player.y;
      // 环状自机狙：以自机为圆心的环，中心对准自机则必中 → 必须移动
      const n = 18;
      const rad = 10;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        game.bullets.push(new Bullet({
          x: px + Math.cos(a) * rad,
          y: py + Math.sin(a) * rad - 80,
          angle: a,
          speed: 2.2,
          type: 'dot',
          color: '#38bdf8',
          from: 'enemy',
          delay: 0.35,
        }));
      }
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_ice_3(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 90, hp: 3200, kind: 'icebin',
    color: '#7dd3fc', color2: '#e0f2fe', label: 'Icebin', enterY: 90,
  });
  e.script = (en, d, game) => {
    timer(en, 'rain', 0.25, d, () => {
      spawnGravityRain(game, 2, 'medium', '#7dd3fc', 1.0);
    });
    timer(en, 'aim', 1.5, d, () => {
      spawnAimed(game, en, game.player, { n: 4, parity: 'even', type: 'rice', speed: 2.8, spread: 0.14, color: '#e0f2fe' });
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

/* ========== Stage 3 ========== */
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
    color: '#fbbf24', color2: '#fb923c', label: '大宗关不是・互然雏', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'laser', 0.2, d, () => {
      en.data.la = (en.data.la || 0) + 0.4;
      for (let i = 0; i < 4; i++) {
        const ang = en.data.la + (i / 4) * Math.PI * 2;
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
    color: '#fbbf24', color2: '#fb923c', label: '大宗关不是・互然雏', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'ring', 0.55, d, () => {
      const px = game.player.x, py = game.player.y;
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        game.bullets.push(new Bullet({
          x: px + Math.cos(a) * 8, y: py + Math.sin(a) * 8 - 60,
          angle: a, speed: 2.0, type: 'dot', color: '#f59e0b', from: 'enemy', delay: 0.25,
        }));
      }
    });
    timer(en, 'side', 0.35, d, () => {
      // 10路偶数狙两侧下落
      for (let i = 0; i < 10; i++) {
        const x = 20 + i * 22;
        game.bullets.push(new Bullet({
          x, y: -10, vx: 0.15 * (i % 2 === 0 ? 1 : -1), vy: 2.0,
          type: 'rice', color: '#fb923c', from: 'enemy', angle: Math.PI / 2,
        }));
        game.bullets.push(new Bullet({
          x: LOGICAL_W - 20 - i * 18, y: -15, vx: 0, vy: 1.8,
          type: 'rice', color: '#fbbf24', from: 'enemy',
        }));
      }
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

/* ========== Patrol ========== */
function chapter_patrol_1(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 90, hp: 3800, kind: 'patrol',
    color: '#f87171', color2: '#fca5a5', label: '全域巡查姬・404', enterY: 90,
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
    color: '#f87171', color2: '#fca5a5', label: '全域巡查姬・404', enterY: 100,
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

/* ========== Route bosses ========== */
function chapter_generic_mid(g, color, density = 3) {
  g.waveTimer = 0;
  g.waveFn = (dt) => {
    g.waveTimer += dt;
    if (g.waveTimer < 0.7) return;
    g.waveTimer = 0;
    g.waveCount = (g.waveCount || 0) + 1;
    if (g.waveCount > 10 + density) return;
    const e = mob(40 + Math.random() * (LOGICAL_W - 80), -20, 30 + density * 5, color);
    e.vy = 1.1;
    e.script = (en, d, game) => {
      timer(en, 's', 0.8 - density * 0.05, d, () => {
        spawnAimed(game, en, game.player, {
          n: 1 + (density % 3), parity: density % 2 ? 'odd' : 'even',
          type: density > 3 ? 'rice' : 'dot', speed: 2.3, color,
        });
      });
    };
    g.enemies.push(e);
  };
}

function chapter_menbailiang(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 3000, kind: 'menbailiang',
    color: '#fbbf24', color2: '#fde68a', label: '门百梁', enterY: 95,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age) * 70;
    timer(en, 'fan', 0.5, d, () => {
      spawnAimed(game, en, game.player, { n: 5, parity: 'odd', type: 'talisman', speed: 2.6, color: '#fbbf24' });
    });
    timer(en, 'ring', 2.0, d, () => spawnRingAt(game, en.x, en.y, 12, 2.0, 'medium', '#fcd34d'));
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_rival(g) {
  const isShama = g.player.def.id === 'shama';
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3200, kind: 'rival',
    color: isShama ? '#7dd3fc' : '#f9a8d4',
    color2: isShama ? '#e0f2fe' : '#fce7f3',
    label: isShama ? '饮泉思源' : '誓约沙玛',
    enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'a', 0.35, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'dot', speed: 3.0, color: en.color });
    });
    timer(en, 'b', 1.2, d, () => {
      spawnRingAt(game, en.x, en.y, 14, 2.2, 'rice', en.color2, en.age);
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_yimeige_1(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 3500, kind: 'yimeige',
    color: '#e879f9', color2: '#f0abfc', label: '一美个', enterY: 95,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 1.2) * 80;
    timer(en, 's', 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: 4, parity: 'even', type: 'medium', speed: 2.4, color: '#e879f9' });
    });
    timer(en, 'r', 1.5, d, () => spawnRingAt(game, en.x, en.y, 10, 1.8, 'dot', '#f0abfc'));
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_yimeige_2(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 4500, kind: 'yimeige',
    color: '#e879f9', color2: '#f0abfc', label: '一美个', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'chaos', 0.15, d, () => {
      game.bullets.push(new Bullet({
        x: en.x, y: en.y,
        angle: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * 2,
        type: ['dot', 'rice', 'talisman'][Math.floor(Math.random() * 3)],
        color: Math.random() < 0.5 ? '#e879f9' : '#fbbf24',
        from: 'enemy',
      }));
    });
    timer(en, 'aim', 0.6, d, () => {
      spawnAimed(game, en, game.player, { n: 7, parity: 'odd', type: 'rice', speed: 3.0, color: '#d946ef' });
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_duren(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3100, kind: 'duren',
    color: '#fb7185', color2: '#fda4af', label: '赌人时尚', enterY: 100,
  });
  e.script = (en, d, game) => {
    en.x = LOGICAL_W / 2 + Math.sin(en.age * 2) * 100;
    en.y = 100 + Math.cos(en.age * 1.5) * 30;
    timer(en, 's', 0.3, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'large', speed: 2.5, color: '#fb7185' });
    });
    timer(en, 'spin', 0.1, d, () => {
      en.data.a = (en.data.a || 0) + 0.5;
      game.bullets.push(new Bullet({
        x: en.x, y: en.y, angle: en.data.a, speed: 2.8, type: 'talisman', color: '#f43f5e', from: 'enemy',
      }));
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_gundian(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 95, hp: 3200, kind: 'gundian',
    color: '#fb923c', color2: '#fdba74', label: '棍电噢哆', enterY: 95,
  });
  e.script = (en, d, game) => {
    timer(en, 'a', 0.25, d, () => {
      const a = Math.atan2(game.player.y - en.y, game.player.x - en.x);
      game.bullets.push(new Bullet({
        x: en.x - 20, y: en.y, angle: a, speed: 3.2, type: 'rice', color: '#fb923c', from: 'enemy',
      }));
      game.bullets.push(new Bullet({
        x: en.x + 20, y: en.y, angle: a, speed: 3.2, type: 'rice', color: '#fdba74', from: 'enemy',
      }));
    });
    timer(en, 'slide', 0.8, d, () => {
      spawnAimed(game, en, game.player, { n: 5, parity: 'even', type: 'dot', speed: 2.5, color: '#f97316' });
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_lastgod_1(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 3800, kind: 'lastgod',
    color: '#a3e635', color2: '#d9f99d', label: '拉斯特神炫', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'fog', 0.2, d, () => {
      game.bullets.push(new Bullet({
        x: Math.random() * LOGICAL_W, y: -10,
        vx: (Math.random() - 0.5), vy: 1.2,
        type: 'medium', color: '#bef264', from: 'enemy',
      }));
    });
    timer(en, 'aim', 0.5, d, () => {
      spawnAimed(game, en, game.player, { n: 3, parity: 'odd', type: 'talisman', speed: 2.8, color: '#84cc16' });
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

function chapter_lastgod_2(g) {
  const e = boss({
    x: LOGICAL_W / 2, y: 100, hp: 5000, kind: 'lastgod',
    color: '#a3e635', color2: '#d9f99d', label: '拉斯特神炫', enterY: 100,
  });
  e.script = (en, d, game) => {
    timer(en, 'storm', 0.1, d, () => {
      for (let i = 0; i < 2; i++) {
        game.bullets.push(new Bullet({
          x: en.x, y: en.y,
          angle: Math.random() * Math.PI * 2,
          speed: 2 + Math.random() * 2.5,
          type: Math.random() < 0.3 ? 'large' : 'dot',
          color: Math.random() < 0.5 ? '#a3e635' : '#4d7c0f',
          from: 'enemy',
        }));
      }
    });
    timer(en, 'ring', 1.0, d, () => spawnRingAt(game, en.x, en.y, 20, 2.4, 'rice', '#ecfccb', en.age));
    timer(en, 'aim', 0.4, d, () => {
      spawnAimed(game, en, game.player, { n: 5, parity: 'odd', type: 'laser', speed: 4, color: '#65a30d', laserLen: 180 });
    });
  };
  g.enemies.push(e);
  g.bossRef = e;
}

export function stageSelectEntries() {
  return [
    { id: '1', label: '第1面', desc: '维基外围 · 零散草稿', startChapter: 1 },
    { id: '2', label: '第2面', desc: '编辑日常 · 审核冲突', startChapter: 7 },
    { id: '3', label: '第3面', desc: '分歧的十字路口', startChapter: 15 },
    { id: 'patrol', label: '中立拦截', desc: '全域巡查姬・404', startChapter: 23 },
    { id: 'A4', label: 'A线4面', desc: '门百梁', startChapter: 25 },
    { id: 'A5', label: 'A线5面', desc: '主角组间冲突', startChapter: 27 },
    { id: 'A6', label: 'A线6面', desc: '一美个', startChapter: 29 },
    { id: 'B4', label: 'B线4面', desc: '赌人时尚', startChapter: 32 },
    { id: 'B5', label: 'B线5面', desc: '棍电噢哆', startChapter: 34 },
    { id: 'B6', label: 'B线6面', desc: '拉斯特神炫', startChapter: 36 },
  ];
}

