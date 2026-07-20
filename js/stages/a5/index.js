/**
 * A5 章节表（E06b：mid / letters 分文件，数值不变）
 */
import {
  faceDefaults, midChapter, letterChapter,
} from '../_shared.js';
import {
  chapter_a5_mid_1,
  chapter_a5_mid_2,
  chapter_a5_mid_3,
  chapter_a5_mid_4,
  chapter_a5_midboss,
  chapter_a5_mid_5,
  chapter_a5_mid_6,
  chapter_a5_mid_7,
  chapter_a5_mid_8,
} from './mid.js';
import {
  chapter_rival_1,
  chapter_rival_2,
  chapter_rival_3,
  chapter_rival_4,
  chapter_rival_5,
  chapter_rival_6,
  chapter_rival_7,
  chapter_rival_last,
} from './letters.js';

const FACE = faceDefaults('A5');

export const chapters = [
  midChapter(FACE, {
    id: 40,
    name: 'A5-1 渐行渐远',
    kind: 'mid',
    unstable: true,
    duration: 24,
    build: chapter_a5_mid_1,
  }),
  midChapter(FACE, {
    id: 41,
    name: 'A5-2 Unstable 数据分歧',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_a5_mid_2,
  }),
  midChapter(FACE, {
    id: 42,
    name: 'A5-3 署名争议',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_a5_mid_3,
  }),
  midChapter(FACE, {
    id: 43,
    name: 'A5-4 编辑权限争夺',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_a5_mid_4,
  }),
  midChapter(FACE, {
    id: 44,
    name: 'A5-5 编辑伦理审查',
    kind: 'midboss',
    duration: 32,
    build: chapter_a5_midboss,
  }),
  midChapter(FACE, {
    id: 45,
    name: 'A5-6 数据撕裂',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_a5_mid_5,
  }),
  midChapter(FACE, {
    id: 46,
    name: 'A5-7 剑拔弩张',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_a5_mid_6,
  }),
  midChapter(FACE, {
    id: 47,
    name: 'A5-8 世界观碰撞',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_a5_mid_7,
  }),
  midChapter(FACE, {
    id: 48,
    name: 'A5-9 最终对峙',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_a5_mid_8,
  }),
  letterChapter(FACE, {
    id: 49,
    name: '主角「署名权·编辑争执」',
    dialogue: 'a5',
    letter: '署名权 · 编辑争执',
    letterTime: 42,
    build: chapter_rival_1,
  }),
  letterChapter(FACE, {
    id: 50,
    name: '主角「署名权·优先权主张」',
    letter: '署名权 · 优先权主张',
    letterTime: 42,
    build: chapter_rival_2,
  }),
  letterChapter(FACE, {
    id: 51,
    name: '主角「署名权·历史追溯」',
    letter: '署名权 · 历史追溯',
    letterTime: 44,
    build: chapter_rival_3,
  }),
  letterChapter(FACE, {
    id: 52,
    name: '主角「署名权·归属之战」',
    letter: '署名权 · 归属之战',
    letterTime: 44,
    build: chapter_rival_4,
  }),
  letterChapter(FACE, {
    id: 53,
    name: '主角「署名权·编辑争霸」',
    letter: '署名权 · 编辑争霸',
    letterTime: 46,
    build: chapter_rival_5,
  }),
  letterChapter(FACE, {
    id: 54,
    name: '主角「署名权·数据源之争」',
    letter: '署名权 · 数据源之争',
    letterTime: 46,
    build: chapter_rival_6,
  }),
  letterChapter(FACE, {
    id: 55,
    name: '主角「署名权·最后的编辑者」',
    letter: '署名权 · 最后的编辑者',
    letterTime: 48,
    build: chapter_rival_7,
  }),
  letterChapter(FACE, {
    id: 56,
    name: '主角「署名权·共同署名」',
    letter: '署名权 · 共同署名',
    letterTime: 52,
    winDialogue: 'a5_end',
    build: chapter_rival_last,
  }),
];

export const stageSelectEntry = { id: 'A5', label: 'A线5面', desc: '主角组间冲突 — 署名权争夺', startChapter: 40 };
