/** 棍维Project — 全局配置与平衡数值 */

export const LOGICAL_W = 450;
export const LOGICAL_H = 600;

export const DEFAULT_KEYS = {
  shot: 'KeyZ',
  bomb: 'KeyX',
  item: 'KeyC',
};

export const STORAGE_KEYS = {
  keys: 'gunwei_keys',
  hiscore: 'gunwei_hiscore',
  unlocked: 'gunwei_unlocked',
  difficulty: 'gunwei_difficulty',
};

/** 基础平衡（以 Normal 为基准） */
export const BALANCE = {
  startLives: 2,
  startBombs: 3,
  maxLives: 8,
  maxBombs: 8,

  // 非低速明显加快；低速保持精细走位
  playerSpeed: 6.8,
  playerSlowSpeed: 2.15,
  playerRadius: 3,
  playerDrawRadius: 11,
  playerShotCooldown: 0.05,
  playerShotDamage: 2.8,
  playerOptionDamage: 1.35,
  playerShotSpeed: 15,
  optionHoming: 7.5,       // 子机追踪转向速度
  optionShotEvery: 1,      // 每发都带子机弹

  bombDuration: 1.6,
  bombInvuln: 2.2,
  deathBombWindow: 0.18,

  editMax: 100,
  editPerGraze: 1.15,
  grazeRadius: 22,
  editClearRadius: 50,

  chapterPerfectMul: 1.05,
  letterCardTime: 42,
  midBossTime: 28,

  tendencyLeftBound: 215,
  tendencyRightBound: 235,
  tendencyPerSec: 0.35,

  /** 收点线 Y（逻辑坐标，越小越靠上）；越过此线后道具永久吸引 */
  itemCollectLine: 168, // ≈ 600 * 0.28
  itemFallGravity: 0.022,
  itemFallMaxVy: 1.35,
  itemPopVy: -0.55,
  itemAttractSpeed: 9.5,

  score: {
    graze: 20,
    killSmall: 300,
    killElite: 2000,
    killBoss: 50000,
    letterBonus: 100000,
    itemSmall: 150,
    itemLarge: 800,
    clearBullet: 10,
  },
};

/**
 * 难度：Easy / Normal / Hard / Lunatic
 * 中文名：这么菜啊 / 白银 / S6第一个王者 / 职业选手
 */
export const DIFFICULTIES = {
  easy: {
    id: 'easy',
    key: 'Easy',
    name: '这么菜啊',
    rank: 'EASY',
    color: '#60a5fa',
    desc: '弹速慢 · 火力厚 · 适合熟悉操作',
    enemyHp: 0.55,
    bulletSpeed: 0.72,
    fireInterval: 1.35,   // >1 开火更慢
    spawnMul: 1.25,       // >1 刷怪更慢
    startLives: 4,
    startBombs: 4,
    deathBombWindow: 0.28,
    grazeMul: 1.35,
    scoreMul: 0.5,
    playerAtk: 1.15,
  },
  normal: {
    id: 'normal',
    key: 'Normal',
    name: '白银',
    rank: 'NORMAL',
    color: '#4ade80',
    desc: '标准曲线 · 推荐首次通关',
    enemyHp: 1.0,
    bulletSpeed: 1.0,
    fireInterval: 1.0,
    spawnMul: 1.0,
    startLives: 2,
    startBombs: 3,
    deathBombWindow: 0.18,
    grazeMul: 1.0,
    scoreMul: 1.0,
    playerAtk: 1.0,
  },
  hard: {
    id: 'hard',
    key: 'Hard',
    name: 'S6第一个王者',
    rank: 'HARD',
    color: '#fbbf24',
    desc: '弹幕加密 · 血量提升 · 资源偏紧',
    enemyHp: 1.4,
    bulletSpeed: 1.22,
    fireInterval: 0.78,
    spawnMul: 0.82,
    startLives: 2,
    startBombs: 2,
    deathBombWindow: 0.15,
    grazeMul: 0.9,
    scoreMul: 1.5,
    playerAtk: 0.95,
  },
  lunatic: {
    id: 'lunatic',
    key: 'Lunatic',
    name: '职业选手',
    rank: 'LUNATIC',
    color: '#f87171',
    desc: '极限弹速与密度 · 仅限高手',
    enemyHp: 1.85,
    bulletSpeed: 1.48,
    fireInterval: 0.62,
    spawnMul: 0.68,
    startLives: 1,
    startBombs: 2,
    deathBombWindow: 0.12,
    grazeMul: 0.8,
    scoreMul: 2.0,
    playerAtk: 0.9,
  },
};

export const DIFFICULTY_ORDER = ['easy', 'normal', 'hard', 'lunatic'];

export function getDifficulty(id) {
  return DIFFICULTIES[id] || DIFFICULTIES.normal;
}

export const PLAYER_DEFS = {
  yinquan: {
    id: 'yinquan',
    name: '饮泉思源',
    color: '#7dd3fc',
    color2: '#e0f2fe',
    dialogueColor: '#7dd3fc',
  },
  shama: {
    id: 'shama',
    name: '誓约沙玛',
    color: '#f9a8d4',
    color2: '#fce7f3',
    dialogueColor: '#f9a8d4',
  },
};

export const SPEAKER_COLORS = {
  爱丽丝: '#f9a8d4',
  Icebin: '#7dd3fc',
  '大宗关不是・互然雏': '#fbbf24',
  大宗关: '#fbbf24',
  '全域巡查姬・404': '#f87171',
  巡查姬: '#f87171',
  门百梁: '#fcd34d',
  一美个: '#e879f9',
  赌人时尚: '#fb7185',
  棍电噢哆: '#fb923c',
  拉斯特神炫: '#a3e635',
  饮泉思源: '#7dd3fc',
  誓约沙玛: '#f9a8d4',
  系统: '#94a3b8',
  旁白: '#cbd5e1',
};

export const UNSTABLE_POOL = [
  { id: 'atk_up', label: '攻击力+8%', atkMul: 1.08, scoreMul: 1, negative: false },
  { id: 'atk_down', label: '攻击力-8%', atkMul: 0.92, scoreMul: 1.12, negative: true },
  { id: 'score_up', label: '分数+10%', atkMul: 1, scoreMul: 1.1, negative: false },
  { id: 'score_down', label: '分数-8%', atkMul: 1, scoreMul: 0.92, negative: true },
  { id: 'fog', label: '视野迷雾', fog: true, scoreMul: 1.15, negative: true },
  { id: 'no_bomb', label: 'Bomb禁用', noBomb: true, scoreMul: 1.2, negative: true },
  { id: 'double_bomb', label: '双倍Bomb消耗', bombCost: 2, scoreMul: 1.18, negative: true },
  { id: 'atk_up2', label: '攻击力+5%', atkMul: 1.05, scoreMul: 1, negative: false },
  { id: 'score_up2', label: '分数+6%', atkMul: 1, scoreMul: 1.06, negative: false },
];

export function displayKey(code) {
  if (!code) return '?';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map = {
    Space: 'Space',
    ShiftLeft: 'LShift',
    ShiftRight: 'RShift',
    ControlLeft: 'LCtrl',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Enter: 'Enter',
    Escape: 'Esc',
  };
  return map[code] || code;
}

export const MANUAL_TEXT = `【操作说明】

· 方向键 (Arrow Keys)：控制自机移动。
· Shift键：进入“低速模式”（凝聚自机判定点，进行精细走位）。
· Shot键：射击（主弹 + 侧方子机追踪弹）。
· Bomb键：触发特殊审查阻断（清除全屏弹幕）。
· Item键：触发“编辑战”（消耗100%编辑度进行区域一键回退）。

【难度等级】

· Easy「这么菜啊」：弹速慢、资源多，熟悉操作。
· Normal「白银」：标准曲线，推荐首次通关。
· Hard「S6第一个王者」：弹幕加密，资源偏紧。
· Lunatic「职业选手」：极限密度与弹速。

【移动端操作】

· 相对滑动移动：手指在【版面】内任意位置滑动，自机将平滑产生相同的相对位移。
· 自动射击：手指接触【版面】时自动开火，松手停止。
· 触屏按键：轻触【分数版】最下方的虚拟按键可直接触发“Item键”与“Bomb键”。

【系统指南】

· 章节机制：无Miss无Bomb通关当前章节，可获得1.05倍得分加成。
· 审核中（决死）：被弹后有极短的审核窗口，此时按Bomb键可撤销违规编辑。
· 编辑度：在子弹附近‘校对’（擦弹）可积攒编辑度。
· 收点线：版面上方浅色虚线。自机越过收点线后，场上P点永久被吸引；回到线下不会再次掉落。
· Unstable Machine：开启后，道中章节会附加随机系统异常。
· 阵营偏移：前三面在左侧活动积累A线倾向，在右侧积累B线倾向。

【故事背景】

“饮泉思源・才华的水”守护着门构皮蒂娅，却在铬接管后转向 OTTOWikiProject。
与誓约沙玛共同探寻组织急转直下的真相——答案或许在门构皮蒂娅，或许在善雅乡。`;
