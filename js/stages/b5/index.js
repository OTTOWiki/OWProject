/**
 * B5 章节表（E06b：mid / letters 分文件，数值不变）
 */
import {
  faceDefaults, midChapter, letterChapter,
} from '../_shared.js';
import {
  chapter_b5_mid_1,
  chapter_b5_mid_2,
  chapter_b5_mid_3,
  chapter_b5_mid_4,
  chapter_b5_midboss,
  chapter_b5_mid_5,
  chapter_b5_mid_6,
  chapter_b5_mid_7,
  chapter_b5_mid_8,
} from './mid.js';
import {
  chapter_gundian_1,
  chapter_gundian_2,
  chapter_gundian_3,
  chapter_gundian_4,
  chapter_gundian_5,
  chapter_gundian_6,
  chapter_gundian_7,
  chapter_gundian_last,
} from './letters.js';

const FACE = faceDefaults('B5');

export const chapters = [
  midChapter(FACE, {
    id: 92,
    name: 'B5-1 街角暗巷',
    kind: 'mid',
    unstable: true,
    duration: 24,
    build: chapter_b5_mid_1,
  }),
  midChapter(FACE, {
    id: 93,
    name: 'B5-2 Unstable 破皮鞋敲击',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_b5_mid_2,
  }),
  midChapter(FACE, {
    id: 94,
    name: 'B5-3 素质质问',
    kind: 'mid',
    unstable: true,
    duration: 24,
    build: chapter_b5_mid_3,
  }),
  midChapter(FACE, {
    id: 95,
    name: 'B5-4 世界第一宣言',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_b5_mid_4,
  }),
  midChapter(FACE, {
    id: 96,
    name: 'B5-5 中单影卫',
    kind: 'midboss',
    duration: 34,
    build: chapter_b5_midboss,
  }),
  midChapter(FACE, {
    id: 97,
    name: 'B5-6 推退拉锯',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_b5_mid_5,
  }),
  midChapter(FACE, {
    id: 98,
    name: 'B5-7 嘴硬交锋',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_b5_mid_6,
  }),
  midChapter(FACE, {
    id: 99,
    name: 'B5-8 甩锅预演',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_b5_mid_7,
  }),
  midChapter(FACE, {
    id: 100,
    name: 'B5-9 这波怎么说',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_b5_mid_8,
  }),
  letterChapter(FACE, {
    id: 101,
    name: '棍电噢哆「世界第一·推退辩论」',
    dialogue: 'b5',
    letter: '世界第一 · 推退辩论',
    letterTime: 42,
    build: chapter_gundian_1,
  }),
  letterChapter(FACE, {
    id: 102,
    name: '棍电噢哆「世界第一·傲娇反击」',
    letter: '世界第一 · 傲娇反击',
    letterTime: 42,
    build: chapter_gundian_2,
  }),
  letterChapter(FACE, {
    id: 103,
    name: '棍电噢哆「世界第一·素质质问」',
    letter: '世界第一 · 素质质问',
    letterTime: 44,
    build: chapter_gundian_3,
  }),
  letterChapter(FACE, {
    id: 104,
    name: '棍电噢哆「世界第一·中单之怒」',
    letter: '世界第一 · 中单之怒',
    letterTime: 44,
    build: chapter_gundian_4,
  }),
  letterChapter(FACE, {
    id: 105,
    name: '棍电噢哆「世界第一·癌症晚期」',
    letter: '世界第一 · 癌症晚期',
    letterTime: 46,
    build: chapter_gundian_5,
  }),
  letterChapter(FACE, {
    id: 106,
    name: '棍电噢哆「世界第一·清修破灭」',
    letter: '世界第一 · 清修破灭',
    letterTime: 46,
    build: chapter_gundian_6,
  }),
  letterChapter(FACE, {
    id: 107,
    name: '棍电噢哆「世界第一·终极甩锅」',
    letter: '世界第一 · 终极甩锅',
    letterTime: 52,
    build: chapter_gundian_7,
  }),
  letterChapter(FACE, {
    id: 108,
    name: '棍电噢哆「世界第一·队友问题」',
    letter: '世界第一 · 队友问题',
    letterTime: 60,
    winDialogue: 'b5_win',
    loseDialogue: 'b5_lose',
    build: chapter_gundian_last,
  }),
];

export const stageSelectEntry = { id: 'B5', label: 'B线5面', desc: '棍电噢哆 — 推退辩论战', startChapter: 92 };
