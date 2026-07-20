/**
 * A4 章节表（E06b：mid / letters 分文件，数值不变）
 */
import {
  faceDefaults, midChapter, letterChapter,
} from '../_shared.js';
import {
  chapter_a4_mid_1,
  chapter_a4_mid_2,
  chapter_a4_mid_3,
  chapter_a4_midboss,
  chapter_a4_mid_4,
  chapter_a4_mid_5,
  chapter_a4_mid_6,
} from './mid.js';
import {
  chapter_menbailiang_1,
  chapter_menbailiang_2,
  chapter_menbailiang_3,
  chapter_menbailiang_4,
  chapter_menbailiang_5,
  chapter_menbailiang_6,
  chapter_menbailiang_7,
  chapter_menbailiang_last,
} from './letters.js';

const FACE = faceDefaults('A4');

export const chapters = [
  midChapter(FACE, {
    id: 25,
    name: 'A4-1 方尖碑阵列入口',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_a4_mid_1,
  }),
  midChapter(FACE, {
    id: 26,
    name: 'A4-2 Unstable 强制推销',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_a4_mid_2,
  }),
  midChapter(FACE, {
    id: 27,
    name: 'A4-3 特惠海报弹幕',
    kind: 'mid',
    unstable: true,
    duration: 24,
    build: chapter_a4_mid_3,
  }),
  midChapter(FACE, {
    id: 28,
    name: 'A4-4 客服部精英',
    kind: 'midboss',
    duration: 32,
    build: chapter_a4_midboss,
  }),
  midChapter(FACE, {
    id: 29,
    name: 'A4-5 限时通道',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_a4_mid_4,
  }),
  midChapter(FACE, {
    id: 30,
    name: 'A4-6 捆绑销售压力',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_a4_mid_5,
  }),
  midChapter(FACE, {
    id: 31,
    name: 'A4-7 最终推销线',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_a4_mid_6,
  }),
  letterChapter(FACE, {
    id: 32,
    name: '门百梁「方尖碑·限时特惠」',
    dialogue: 'a4',
    letter: '方尖碑 · 限时特惠',
    letterTime: 42,
    build: chapter_menbailiang_1,
  }),
  letterChapter(FACE, {
    id: 33,
    name: '门百梁「方尖碑·VIP通道」',
    letter: '方尖碑 · VIP通道',
    letterTime: 42,
    build: chapter_menbailiang_2,
  }),
  letterChapter(FACE, {
    id: 34,
    name: '门百梁「方尖碑·捆绑销售」',
    letter: '方尖碑 · 捆绑销售',
    letterTime: 44,
    build: chapter_menbailiang_3,
  }),
  letterChapter(FACE, {
    id: 35,
    name: '门百梁「方尖碑·超值套装」',
    letter: '方尖碑 · 超值套装',
    letterTime: 44,
    build: chapter_menbailiang_4,
  }),
  letterChapter(FACE, {
    id: 36,
    name: '门百梁「方尖碑·限量秒杀」',
    letter: '方尖碑 · 限量秒杀',
    letterTime: 46,
    build: chapter_menbailiang_5,
  }),
  letterChapter(FACE, {
    id: 37,
    name: '门百梁「方尖碑·会员特权」',
    letter: '方尖碑 · 会员特权',
    letterTime: 46,
    build: chapter_menbailiang_6,
  }),
  letterChapter(FACE, {
    id: 38,
    name: '门百梁「方尖碑·清仓甩卖」',
    letter: '方尖碑 · 清仓甩卖',
    letterTime: 48,
    build: chapter_menbailiang_7,
  }),
  letterChapter(FACE, {
    id: 39,
    name: '门百梁「方尖碑·破产清算」',
    letter: '方尖碑 · 破产清算',
    letterTime: 52,
    winDialogue: 'a4_win',
    loseDialogue: 'a4_lose',
    build: chapter_menbailiang_last,
  }),
];

export const stageSelectEntry = { id: 'A4', label: 'A线4面', desc: '门百梁 — 方尖碑推销战', startChapter: 25 };
