/**
 * Extra 单关 — van♂ 键政灌输
 * 流程：道中… → 1 midboss → van♂ Letter…（一气呵成）
 * 74 章 · 强度 ×0.8 · 章时 ×0.5 · 道中难度均匀
 */
import { C, exDur, exLetter, pushMidboss, pushBossLetter } from './ex_shared.js';
import { buildExMid } from './ex_mid.js';

const MID = { stage: 'EX', stageKey: 'EX', music: 'ex_mid', bg: 'ex_mid' };
const BOSS = { stage: 'EX', stageKey: 'EX', kind: 'boss', music: 'ex_boss', bg: 'ex_boss' };

const MID_NAMES = [
  '词条外围灌水', '议程草稿', '双侧带节奏', '标签环阵', '竖落热搜',
  '通道标签', '悬停审核', '稀疏质询', '横扫话术', 'V字水军',
  '侧翼横移', '大弹分裂', '对角穿越', '环缝双层', '锯齿下降',
  '议程核心', '固定扇扫', '窄缝信息墙', '左右对射', '螺旋点缀',
  '外围回声', '随机夹缝', '双色对峙', '悬停环再', '雨中单狙',
  '纵列通道', '精英扇压', '激光副压', '墙雨合围', '编队再临',
  '横移复读', '分裂再起', '对角回流', '环缝加压', '锯齿复线',
  '核+侧翼', '扇扫回声', '缝墙再筑', '对射回响', '螺旋余韵',
  '灌水余波', '议程余波', '对立余波', '环阵余波', '热搜余波',
  '通道余波', '审核余波', '质询余波', '横扫余波', '编队余波',
  '侧翼余波', '分裂余波', '对角余波', '环缝余波', '锯齿余波',
  '核侧余波', '扇扫余波', '缝墙余波', '对射余波', '螺旋终章前',
  '圣域回廊', '覆写前夜',
];

const LETTER_DEFS = [
  { letter: '键政圣经 · 开篇立论', style: 'aim', sec: 46 },
  { letter: '灌输协议 · 强制订阅', style: 'ring', sec: 46 },
  { letter: 'OTTOWiki改写 · 词条殖民', style: 'rain', sec: 48 },
  { letter: '激光政见 · 不容置疑', style: 'laser', sec: 48 },
  { letter: '左右通吃 · 双面话术', style: 'dual', sec: 48 },
  { letter: '信息铁幕 · 只留一道缝', style: 'wall', sec: 50 },
  { letter: '螺旋真理 · 重复千遍', style: 'spiral', sec: 50 },
  { letter: '共识审判 · 多数即正确', style: 'aim', sec: 50 },
  { letter: '键政狂潮 · 全面过载', style: 'frenzy', sec: 52 },
  { letter: '话术终焉 · 模板崩坏', style: 'frenzy', sec: 52 },
  { letter: '最终覆写 · 维基归van', style: 'final', sec: 55, last: true },
];

const MID_COUNT = 62;
const COLS = [C.red, C.gold, C.violet, C.cyan, C.blue, C.orange, C.pink, C.white, C.green];

const mids = [];
for (let i = 0; i < MID_COUNT; i++) {
  const id = 129 + i;
  mids.push({
    id,
    name: `EX-${i + 1} ${MID_NAMES[i] || `道中 ${i + 1}`}`,
    ...MID,
    kind: 'mid',
    unstable: true,
    duration: exDur(24),
    dialogue: i === 0 ? 'ex_open' : undefined,
    build: ((idx) => (g) => buildExMid(g, idx))(i),
  });
}

const midbossId = 129 + MID_COUNT;
const midboss = {
  id: midbossId,
  name: `EX-${MID_COUNT + 1} van近卫`,
  ...MID,
  kind: 'midboss',
  duration: exDur(34),
  build: (g) => pushMidboss(g, {
    hp: 1800, label: 'van近卫', color: C.red, tier: 4,
  }),
};

const letters = LETTER_DEFS.map((L, i) => ({
  id: midbossId + 1 + i,
  name: L.last ? 'van♂「最终覆写 · 维基归van」' : `van♂「${L.letter.split('·')[0].trim()}」`,
  ...BOSS,
  dialogue: i === 0 ? 'ex_van' : (L.last ? 'ex_last' : undefined),
  letter: L.letter,
  letterTime: exLetter(L.sec),
  ending: L.last ? 'EX' : undefined,
  build: (g) => pushBossLetter(g, {
    hp: 3200 + i * 160,
    label: 'van♂',
    color: COLS[i % COLS.length],
    color2: L.last ? C.gold : C.white,
    style: L.style,
    tier: 4 + Math.floor(i / 2),
  }),
}));

export const chapters = [...mids, midboss, ...letters];

export const stageSelectEntry = {
  id: 'EX',
  label: 'Extra',
  desc: 'van♂ — 键政灌输（单关 · 道中→道中Boss→Boss）',
  startChapter: 129,
};
