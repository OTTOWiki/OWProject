/**
 * 版面伪 3D 背景主题表（E06c 自 playfieldBg 外置）
 * 新 mode：在此加一行 + bgModes 登记贴图；绘制逻辑仍在 playfieldBg.js
 *
 * @typedef {{
 *   sky: [string, string],
 *   accent: string,
 *   pillar: string, pillar2: string, float: string,
 *   kind: string, sil: string, scan: boolean, symbols: string[],
 * }} PlayfieldTheme
 */

/** @type {Record<string, PlayfieldTheme>} */
export const MODE_THEME = {
  s1_mid: {
    sky: ['#06140e', '#0f2e20'], accent: 'rgba(100,220,150,0.18)',
    pillar: '#3d8f6a', pillar2: '#1a4a32', float: '#88ffaa',
    kind: 'code', sil: 'blocks', scan: false, symbols: ['#', '{}', '草稿', 'wiki'],
  },
  s1_boss: {
    sky: ['#1c0814', '#4a1a38'], accent: 'rgba(255,140,200,0.22)',
    pillar: '#c46a9a', pillar2: '#6b2a4a', float: '#ffaadd',
    kind: 'gear', sil: 'gears', scan: false, symbols: ['齿轮', '编辑', '◇'],
  },
  s2_mid: {
    sky: ['#040c18', '#0a2440'], accent: 'rgba(70,140,255,0.16)',
    pillar: '#2a5a8a', pillar2: '#143050', float: '#66aaff',
    kind: 'hex', sil: 'hex', scan: false, symbols: ['01', '审核', '!!'],
  },
  s2_boss: {
    sky: ['#020814', '#0c3858'], accent: 'rgba(140,220,255,0.22)',
    pillar: '#4a90b0', pillar2: '#1a4058', float: '#aaf0ff',
    kind: 'crystal', sil: 'hex', scan: false, symbols: ['Ice', '//', '[]'],
  },
  s3_mid: {
    sky: ['#0e0a08', '#2a2018'], accent: 'rgba(255,200,120,0.16)',
    pillar: '#8a9bb0', pillar2: '#ea580c', float: '#ffddaa',
    kind: 'split', sil: 'split', scan: false, symbols: ['A', 'B', '分叉'],
  },
  s3_boss: {
    sky: ['#1c1206', '#5a3810'], accent: 'rgba(255,180,60,0.24)',
    pillar: '#d4a020', pillar2: '#8a5010', float: '#ffcc66',
    kind: 'fire', sil: 'poly', scan: false, symbols: ['防火墙', '合并', '◇'],
  },
  patrol: {
    sky: ['#120004', '#480810'], accent: 'rgba(255,40,70,0.28)',
    pillar: '#c02040', pillar2: '#601020', float: '#ff4466',
    kind: 'warn', sil: 'bars', scan: true, symbols: ['404', 'NOT', 'FOUND'],
  },
  a4_mid: {
    sky: ['#1c1608', '#4a3a0c'], accent: 'rgba(255,210,60,0.18)',
    pillar: '#c9a227', pillar2: '#6b5010', float: '#ffe066',
    kind: 'obelisk', sil: 'spires', scan: false, symbols: ['特惠', '¥', '购'],
  },
  a4_boss: {
    sky: ['#2e0606', '#5c1414'], accent: 'rgba(255,90,70,0.22)',
    pillar: '#d04040', pillar2: '#701818', float: '#ff8866',
    kind: 'obelisk', sil: 'spires', scan: false, symbols: ['VIP', '买!', '套'],
  },
  a5_mid: {
    sky: ['#080a16', '#182050'], accent: 'rgba(160,180,255,0.16)',
    pillar: '#5a8acc', pillar2: '#c06090', float: '#ddaaff',
    kind: 'dual', sil: 'orbs', scan: false, symbols: ['蓝', '粉', '署名'],
  },
  a5_boss: {
    sky: ['#16081c', '#481850'], accent: 'rgba(220,140,255,0.22)',
    pillar: '#7a60b0', pillar2: '#a04070', float: '#e9d5ff',
    kind: 'dual', sil: 'orbs', scan: false, symbols: ['冲突', 'VS', '权'],
  },
  a6_mid: {
    sky: ['#16081c', '#481438'], accent: 'rgba(255,140,200,0.18)',
    pillar: '#c060a0', pillar2: '#803060', float: '#ff99dd',
    kind: 'candy', sil: 'rings', scan: false, symbols: ['♡', '哈', '~'],
  },
  a6_boss: {
    sky: ['#1e0014', '#500830'], accent: 'rgba(255,80,140,0.24)',
    pillar: '#a03060', pillar2: '#501028', float: '#fda4af',
    kind: 'candy', sil: 'rings', scan: true, symbols: ['欠费', '回收', '⚠'],
  },
  ex_mid: {
    sky: ['#080a16', '#182050'], accent: 'rgba(160,180,255,0.16)',
    pillar: '#5a8acc', pillar2: '#c06090', float: '#ddaaff',
    kind: 'dual', sil: 'orbs', scan: false, symbols: ['键政', 'van', '覆写'],
  },
  ex_boss: {
    sky: ['#1e0014', '#500830'], accent: 'rgba(255,80,140,0.24)',
    pillar: '#a03060', pillar2: '#501028', float: '#fda4af',
    kind: 'candy', sil: 'rings', scan: true, symbols: ['键政', '站队', '⚠'],
  },
  b4_mid: {
    sky: ['#160808', '#481018'], accent: 'rgba(255,90,120,0.18)',
    pillar: '#a04050', pillar2: '#501820', float: '#ff6688',
    kind: 'spike', sil: 'wheel', scan: false, symbols: ['创', '!', '轮'],
  },
  b4_boss: {
    sky: ['#1c0404', '#581018'], accent: 'rgba(255,50,80,0.24)',
    pillar: '#c03040', pillar2: '#601018', float: '#ff4466',
    kind: 'spike', sil: 'wheel', scan: false, symbols: ['创!', '击', '!!'],
  },
  b5_mid: {
    sky: ['#0a0812', '#2a1824'], accent: 'rgba(255,150,80,0.16)',
    pillar: '#8a6040', pillar2: '#403020', float: '#ffaa66',
    kind: 'neon', sil: 'street', scan: false, symbols: ['中单', '推', '退'],
  },
  b5_boss: {
    sky: ['#120810', '#402018'], accent: 'rgba(255,130,60,0.22)',
    pillar: '#a05030', pillar2: '#502818', float: '#fb923c',
    kind: 'neon', sil: 'street', scan: false, symbols: ['素质', '说', '锅'],
  },
  b6_mid: {
    sky: ['#081208', '#1c3014'], accent: 'rgba(160,230,80,0.16)',
    pillar: '#4a7020', pillar2: '#203010', float: '#a3e635',
    kind: 'mist', sil: 'towers', scan: false, symbols: ['雾', '瓶', '塔'],
  },
  b6_boss: {
    sky: ['#0e1c00', '#2c4810'], accent: 'rgba(140,220,40,0.26)',
    pillar: '#5a9020', pillar2: '#284010', float: '#84cc16',
    kind: 'mist', sil: 'towers', scan: true, symbols: ['炫妈', '油', '雾'],
  },
};

export const FALLBACK_THEME = MODE_THEME.s1_mid;

/** @param {string} mode */
export function themeFor(mode) {
  return MODE_THEME[mode] || FALLBACK_THEME;
}
