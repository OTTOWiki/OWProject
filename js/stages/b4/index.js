/**
 * B4 章节表（E06b：mid / letters 分文件，数值不变）
 */
import {
  faceDefaults, midChapter, letterChapter,
} from '../_shared.js';
import {
  chapter_b4_mid_1,
  chapter_b4_mid_2,
  chapter_b4_mid_3,
  chapter_b4_midboss,
  chapter_b4_mid_4,
  chapter_b4_mid_5,
  chapter_b4_mid_6,
} from './mid.js';
import {
  chapter_duren_1,
  chapter_duren_2,
  chapter_duren_3,
  chapter_duren_4,
  chapter_duren_5,
  chapter_duren_6,
  chapter_duren_7,
  chapter_duren_last,
} from './letters.js';

const FACE = faceDefaults('B4');

export const chapters = [
  midChapter(FACE, {
    id: 77,
    name: 'B4-1 善雅乡入口',
    kind: 'mid',
    unstable: true,
    duration: 24,
    build: chapter_b4_mid_1,
  }),
  midChapter(FACE, {
    id: 78,
    name: 'B4-2 Unstable 创车编队',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_b4_mid_2,
  }),
  midChapter(FACE, {
    id: 79,
    name: 'B4-3 哲学信徒',
    kind: 'mid',
    unstable: true,
    duration: 24,
    build: chapter_b4_mid_3,
  }),
  midChapter(FACE, {
    id: 80,
    name: 'B4-4 创车精英',
    kind: 'midboss',
    duration: 32,
    build: chapter_b4_midboss,
  }),
  midChapter(FACE, {
    id: 81,
    name: 'B4-5 哲学洗脑',
    kind: 'mid',
    unstable: true,
    duration: 26,
    build: chapter_b4_mid_4,
  }),
  midChapter(FACE, {
    id: 82,
    name: 'B4-6 狂人语录',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_b4_mid_5,
  }),
  midChapter(FACE, {
    id: 83,
    name: 'B4-7 创世独轮',
    kind: 'mid',
    unstable: true,
    duration: 28,
    build: chapter_b4_mid_6,
  }),
  letterChapter(FACE, {
    id: 84,
    name: '赌人时尚「独轮创车·灵魂洗涤」',
    dialogue: 'b4',
    letter: '独轮创车 · 灵魂洗涤',
    letterTime: 42,
    build: chapter_duren_1,
  }),
  letterChapter(FACE, {
    id: 85,
    name: '赌人时尚「独轮创车·哲学创击」',
    letter: '独轮创车 · 哲学创击',
    letterTime: 42,
    build: chapter_duren_2,
  }),
  letterChapter(FACE, {
    id: 86,
    name: '赌人时尚「独轮创车·狂妄乱舞」',
    letter: '独轮创车 · 狂妄乱舞',
    letterTime: 44,
    build: chapter_duren_3,
  }),
  letterChapter(FACE, {
    id: 87,
    name: '赌人时尚「独轮创车·疯狂创击」',
    letter: '独轮创车 · 疯狂创击',
    letterTime: 44,
    build: chapter_duren_4,
  }),
  letterChapter(FACE, {
    id: 88,
    name: '赌人时尚「独轮创车·铁皮人审判」',
    letter: '独轮创车 · 铁皮人审判',
    letterTime: 46,
    build: chapter_duren_5,
  }),
  letterChapter(FACE, {
    id: 89,
    name: '赌人时尚「独轮创车·失算连击」',
    letter: '独轮创车 · 失算连击',
    letterTime: 46,
    build: chapter_duren_6,
  }),
  letterChapter(FACE, {
    id: 90,
    name: '赌人时尚「独轮创车·终极创世」',
    letter: '独轮创车 · 终极创世',
    letterTime: 48,
    build: chapter_duren_7,
  }),
  letterChapter(FACE, {
    id: 91,
    name: '赌人时尚「独轮创车·无能狂怒」',
    letter: '独轮创车 · 无能狂怒',
    letterTime: 52,
    winDialogue: 'b4_win',
    loseDialogue: 'b4_lose',
    build: chapter_duren_last,
  }),
];

export const stageSelectEntry = { id: 'B4', label: 'B线4面', desc: '赌人时尚 — 独轮创车冲击', startChapter: 77 };
