/** OWProject — 全局配置与平衡数值 */

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
  settings: 'gunwei_settings',
};

/** 自机子弹不透明度下限（设置滑条与存档钳制） */
export const PLAYER_BULLET_OPACITY_MIN = 0.1;

/**
 * 描画帧率上限滑条（逻辑固定 60fps，与此项无关）
 * - 有限：24–240 FPS
 * - 最右一格：无限制（仅鼠标拖到 / Z·Enter 切换；键盘加减到不了无限制）
 */
export const FPS_LIMIT_MIN = 24;
export const FPS_LIMIT_CAP = 240;
/** 滑条 DOM 最大值：表示描画无限制（存档 fpsLimit=0） */
export const FPS_SLIDER_UNLIMITED = 241;

/** 玩家设置默认值 */
export const DEFAULT_SETTINGS = {
  /** 音乐音量 0–1（默认 100%） */
  musicVolume: 1,
  /** 自机子弹不透明度 0–1（默认 30%，最低 10%） */
  playerBulletOpacity: 0.3,
  /** 单击 Shot 键切换发射/停止（默认关闭，按住发射） */
  shotToggle: false,
  /**
   * 描画帧率上限：0 = 不限制；否则 24–240
   * 逻辑步进始终锁定 60fps。←→ 调数值（到不了无限制）；Z/Enter 切换无限制；拖最右=无限制
   */
  fpsLimit: 0,
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
  playerRadius: 0,
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
  /** Bomb 释放的巨型追踪弹 */
  bombOrbCount: 8,
  bombOrbDamage: 22,
  bombOrbSpeed: 7.2,
  bombOrbHoming: 11,
  bombOrbLife: 3.0,
  bombOrbRadius: 18,
  bombOrbDraw: 40,

  editMax: 100,
  editPerGraze: 1.15,
  grazeRadius: 33,
  editClearRadius: 50,

  chapterPerfectMul: 1.05,
  letterCardTime: 42,
  midBossTime: 28,

  tendencyMaxPerChapter: 10,
  /** 3 面结束后 |倾向| ≥ 此值进对应 A/B 线，否则巡查拦截。以代码为准（旧需求稿中的 14 已废弃） */
  tendencyThreshold: 70,
  tendencyMinPerChapter: 1,
  tendencySpeed: 2,

  /** 收点线 Y（逻辑坐标，越小越靠上）；越过此线后道具永久吸引 */
  itemCollectLine: 168, // ≈ 600 * 0.28
  itemFallGravity: 0.022,
  itemFallMaxVy: 1.35,
  itemPopVy: -0.55,
  itemAttractSpeed: 9.5,
  /** 自机吸取掉落物的拾取半径（叠道具自身 r） */
  itemPickupRadius: 20,

  score: {
    graze: 200,
    killSmall: 3000,
    killElite: 20000,
    killBoss: 500000,
    /** Letter 红利基准（1 面满时）；随关卡进程 × letterStageMul，再随剩余时间线性衰减 */
    letterBonus: 800000,
    /** 压线捕获时仍保留的最低比例（0 = 超时无分） */
    letterBonusTimeFloor: 0,
    itemSmall: 1500,
    itemLarge: 8000,
    clearBullet: 100,
  },

  /**
   * 资源获取（Life / Bomb）
   * Extend 用 baseScore（不含难度 scoreMul，含 Unstable 实时 scoreMul）
   */
  resource: {
    /** 分数 Extend 阈值（基础分，与 score×10 对齐）；超出表后每 extendStep 再 1UP */
    extendThresholds: [8000000, 20000000, 40000000, 70000000],
    extendStep: 40000000,
    /** Letter NMNB 捕获掉 Bomb 概率 */
    letterNmnbBombChance: 0.4,
    /** 负面 Unstable NMNB 且补偿倍率 ≥ 此值时额外 +1 Bomb */
    unstableCompBombMin: 1.15,
    /** Miss 后 Bomb 至少补到的数量（难度可覆盖 missBombFloor） */
    missBombFloor: 2,
  },
};

/** 关卡进程倍率：越往后 Letter 红利越高 */
export function letterStageMul(stageKey) {
  const sk = String(stageKey);
  const map = {
    '1': 1.0,
    '2': 1.15,
    '3': 1.3,
    patrol: 1.4,
    A4: 1.55, B4: 1.55,
    A5: 1.75, B5: 1.75,
    A6: 2.1, B6: 2.1,
    EX: 2.0,
  };
  return map[sk] ?? 1;
}

/**
 * Letter 符卡红利：基准 × 关卡倍率 × 剩余时间比例（线性递减）
 * timeLeft/timeMax 满 = 全额；0 = floor 比例
 */
export function calcLetterBonus(stageKey, timeLeft, timeMax) {
  if (!(timeMax > 0)) return 0;
  const base = BALANCE.score.letterBonus * letterStageMul(stageKey);
  const floor = BALANCE.score.letterBonusTimeFloor ?? 0;
  const ratio = Math.max(0, Math.min(1, timeLeft / timeMax));
  const timeMul = floor + (1 - floor) * ratio;
  return Math.floor(base * timeMul);
}

/**
 * 难度：Easy / Normal / Hard / Lunatic
 * 中文名：这么菜啊 / 白银 / S6第一个王者 / 职业选手
 * 弹幕以 Normal≈1.0 为基准；Easy 减密减速，Hard/Lunatic 加密加速。
 * bulletCount：环/扇/雨等发数倍率（patterns.scaleBulletCount）
 */
export const DIFFICULTIES = {
  easy: {
    id: 'easy',
    key: 'Easy',
    name: '这么菜啊',
    rank: 'EASY',
    color: '#60a5fa',
    desc: '弹速慢 · 密度低 · 适合熟悉操作',
    enemyHp: 0.6,
    bulletSpeed: 0.78,
    fireInterval: 1.45,   // >1 开火更慢
    spawnMul: 1.35,       // >1 刷怪更慢
    bulletCount: 0.65,
    startLives: 4,
    startBombs: 4,
    deathBombWindow: 0.28,
    grazeMul: 1.35,
    scoreMul: 0.5,
    playerAtk: 1.15,
    missBombFloor: 3,
    midbossDrop: true,
    letterNmnbBombChance: 0.55,
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
    bulletCount: 1.0,
    startLives: 2,
    startBombs: 3,
    deathBombWindow: 0.18,
    grazeMul: 1.0,
    scoreMul: 1.0,
    playerAtk: 1.0,
    missBombFloor: 2,
    midbossDrop: true,
    letterNmnbBombChance: 0.4,
  },
  hard: {
    id: 'hard',
    key: 'Hard',
    name: 'S6第一个王者',
    rank: 'HARD',
    color: '#fbbf24',
    desc: '弹幕加密 · 血量提升 · 资源偏紧',
    enemyHp: 1.4,
    bulletSpeed: 1.28,
    fireInterval: 0.72,
    spawnMul: 0.78,
    bulletCount: 1.25,
    startLives: 2,
    startBombs: 2,
    deathBombWindow: 0.15,
    grazeMul: 0.9,
    scoreMul: 1.5,
    playerAtk: 0.95,
    missBombFloor: 2,
    midbossDrop: true,
    letterNmnbBombChance: 0.35,
  },
  lunatic: {
    id: 'lunatic',
    key: 'Lunatic',
    name: '职业选手',
    rank: 'LUNATIC',
    color: '#f87171',
    desc: '极限弹速与密度 · 仅限高手',
    enemyHp: 1.85,
    bulletSpeed: 1.55,
    fireInterval: 0.55,
    spawnMul: 0.62,
    bulletCount: 1.5,
    startLives: 1,
    startBombs: 2,
    deathBombWindow: 0.12,
    grazeMul: 0.8,
    scoreMul: 2.0,
    playerAtk: 0.9,
    missBombFloor: 1,
    midbossDrop: false,
    letterNmnbBombChance: 0.3,
  },
};

/** Extra 模式独占难度：战斗参数与 Lunatic 同源，仅 UI 文案不同（避免双份漂移） */
DIFFICULTIES.extra = {
  ...DIFFICULTIES.lunatic,
  id: 'extra',
  key: 'EXTRA',
  name: '被吓到眩晕瘫坐，那一刻就像看到原子弹爆炸',
  rank: 'EXTRA',
  color: '#a78bfa',
  desc: '与 Lunatic 同参 · 仅 Extra / EX 可选',
};

/** 当前 baseScore 应对应的下一个 Extend 阈值 */
export function nextExtendThreshold(extendCount) {
  const res = BALANCE.resource;
  const table = res.extendThresholds;
  if (extendCount < table.length) return table[extendCount];
  const last = table[table.length - 1];
  return last + res.extendStep * (extendCount - table.length + 1);
}

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
  '大宗关不是·互然雏': '#fbbf24',
  大宗关: '#fbbf24',
  '全域巡查姬·404': '#f87171',
  巡查姬: '#f87171',
  门百梁: '#fcd34d',
  一美个: '#e879f9',
  赌人时尚: '#fb7185',
  棍电噢哆: '#fb923c',
  拉斯特神炫: '#a3e635',
  饮泉思源: '#7dd3fc',
  誓约沙玛: '#f9a8d4',
  'van♂': '#c084fc',
  'van♂分身': '#a78bfa',
  系统: '#94a3b8',
  旁白: '#cbd5e1',
};

/**
 * Unstable 池
 * - scoreMul：章内实时得分倍率（仅分数类效果；正面不惩罚）
 * - compMul：负面效果补偿倍率，仅在章节 NMNB 结算时乘到章分上
 */
export const UNSTABLE_POOL = [
  { id: 'atk_up', label: '攻击力+8%', atkMul: 1.08, scoreMul: 1, compMul: 1, negative: false },
  { id: 'atk_down', label: '攻击力-8%', atkMul: 0.92, scoreMul: 1, compMul: 1.12, negative: true },
  { id: 'score_up', label: '分数+10%', atkMul: 1, scoreMul: 1.1, compMul: 1, negative: false },
  { id: 'score_down', label: '分数-8%', atkMul: 1, scoreMul: 0.92, compMul: 1, negative: true },
  { id: 'fog', label: '视野迷雾', fog: true, scoreMul: 1, compMul: 1.15, negative: true },
  { id: 'no_bomb', label: 'Bomb禁用', noBomb: true, scoreMul: 1, compMul: 1.2, negative: true },
  { id: 'double_bomb', label: '双倍Bomb消耗', bombCost: 2, scoreMul: 1, compMul: 1.18, negative: true },
  { id: 'atk_up2', label: '攻击力+5%', atkMul: 1.05, scoreMul: 1, compMul: 1, negative: false },
  { id: 'score_up2', label: '分数+6%', atkMul: 1, scoreMul: 1.06, compMul: 1, negative: false },
];

/** 后三面（A/B 线 4–6 面）叠加 2–3 个；前三面 1 个 */
export function unstableStackCount(stageKey) {
  const sk = String(stageKey);
  if (/^[AB][456]$/.test(sk) || sk === 'EX') return 2 + Math.floor(Math.random() * 2);
  return 1;
}

export function mergeUnstableEffects(list) {
  if (!list || !list.length) return null;
  if (list.length === 1) {
    const f = list[0];
    return { ...f, scoreMul: f.scoreMul ?? 1, compMul: f.compMul ?? 1 };
  }
  let atkMul = 1;
  let scoreMul = 1;
  let compMul = 1;
  let fog = false;
  let noBomb = false;
  let bombCost = 1;
  for (const fx of list) {
    atkMul *= fx.atkMul ?? 1;
    scoreMul *= fx.scoreMul ?? 1;
    compMul *= fx.compMul ?? 1;
    if (fx.fog) fog = true;
    if (fx.noBomb) noBomb = true;
    if (fx.bombCost) bombCost = Math.max(bombCost, fx.bombCost);
  }
  return {
    id: list.map((f) => f.id).join('+'),
    label: list.map((f) => f.label).join(' · '),
    atkMul,
    scoreMul,
    compMul,
    fog,
    noBomb,
    bombCost,
    negative: list.some((f) => f.negative),
    stack: list,
  };
}

/** 负面 Unstable 的 NMNB 补偿倍率（无负面则为 1） */
export function unstableCompMul(fx) {
  if (!fx) return 1;
  if (fx.stack) {
    let m = 1;
    for (const f of fx.stack) {
      if (f.negative) m *= f.compMul ?? 1;
    }
    return m;
  }
  return fx.negative ? (fx.compMul ?? 1) : 1;
}

/** 从池中不放回抽取 count 个并合并 */
export function rollUnstableEffects(count = 1) {
  const n = Math.max(1, Math.min(count, UNSTABLE_POOL.length));
  const pool = UNSTABLE_POOL.slice();
  const picked = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }
  return mergeUnstableEffects(picked);
}

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

/** 说明书章节（按序展示） */
export const MANUAL_CHAPTERS = [
  {
    title: '一、操作说明',
    body: `· 方向键 / WASD：控制自机移动。
· Shift：进入「低速模式」（凝聚判定点，精细走位）。
· Shot：射击（主弹 + 侧方子机追踪弹）。
· Bomb：触发特殊审查阻断（清除全屏弹幕）。
· Item：触发「编辑战」（消耗 100% 编辑度，半径内消弹变分）。
· Esc：暂停。

默认键位 Shot / Bomb / Item 为 Z / X / C，可在 Settings 中自定义。
· Settings：音乐音量、自机子弹不透明度、单击 Shot 切换发射、键位绑定。`,
  },
  {
    title: '二、移动端操作',
    body: `· 相对滑动：手指在【版面】内任意位置滑动，自机产生相同相对位移。
· 自动射击：手指接触版面时自动开火，松手停止。
· 虚拟键：轻触【分数板】下方的 Item / Bomb / 暂停 触屏键。`,
  },
  {
    title: '三、难度等级',
    body: `· Easy「这么菜啊」：弹速慢、密度低、资源多。
· Normal「白银」：标准弹幕与曲线，推荐首次通关。
· Hard「S6第一个王者」：弹幕加密加速，资源偏紧。
· Lunatic「职业选手」：极限密度与弹速。

默认资源约 2 残 3 Bomb（难度可覆盖）。难度会缩放弹速、开火间隔、刷怪节奏与发数密度。`,
  },
  {
    title: '四、系统指南',
    body: `· 章节：道中每段、Boss 每张 Letter card 各为一章。章内无 Miss 无 Bomb → 章节得分 ×1.05。
· Letter 红利：Boss / 道中精英限时卡内击破且无 Miss 无 Bomb 时获得。随剩余时间线性递减，并随关卡进程提高（终面约 2 倍于 1 面）。
· 审核中（决死）：被弹后有极短「审核中」窗口，此时按 Bomb 可免死并全清弹幕。
· 编辑度：判定点靠近子弹（擦弹）积攒编辑度；满槽按 Item 触发编辑战。
· 收点线：版面上方浅色虚线。自机越过收点线后，场上得分道具永久被吸引。
· 系统异常（原 Unstable Machine）：道中章节附加随机异常（攻击/分数加减、迷雾、Bomb 禁用或双倍消耗等）。负面效果不实时加分，仅在章节 NMNB（无Miss无Bomb）结算时给予补偿倍率；正面不加惩罚。后三面（A/B 线 4–6 面）一般叠加 2–3 个效果。练习模式可单独关闭。
· 阵营偏移：前三面在左半场积累 A 线倾向，右半场积累 B 线倾向；摇摆不定者将面临中立拦截。
· 资源获取：
  — 分数 Extend：累计基础分（不含难度得分倍率）达阈值 1UP（8M / 20M / 40M / 70M / 其后每 +40M；与 score×10 对齐）。
  — 道中精英（midboss）击破常掉 Bomb（高难可关闭）。
  — Letter NMNB 捕获：概率掉 Bomb；每面最后一张 Letter NMNB 掉 Life。
  — 负面系统异常且补偿较高时，NMNB 结算额外 +1 Bomb。
  — Miss 后 Bomb 仅补到难度下限（非一律补满 3）。`,
  },
  {
    title: '五、故事背景',
    body: `「饮泉思源·才华的水」作为百京维基神，守护着「门构皮蒂娅（moregirl pedia）」。她原本以为这样的日子会一直持续下去。

直到门构皮蒂娅被「铬」接管，她察觉到一个事实：门构皮蒂娅可能会变质，但永远不会倒闭。于是她将目光投向新生的 OTTOWikiProject，并加入其中。

OTTOWikiProject 原本只有「爱丽丝」「Icebin」「大宗关不是·互然雏」「一美个」四人。饮泉思源与「誓约沙玛」加入后，组织一度蒸蒸日上。

好景不长，数月后一美个被揭发为叛徒——任职期间埋下隐患，终被 OTTOWikiProject 菲比委员会调查并逐出。

即便如此，组织却急转直下，几乎无人问津。饮泉思源与誓约沙玛作为核心人物，认定答案一定在门构皮蒂娅，或在「善雅乡」。她们决定亲自去一探究竟。`,
  },
  {
    title: '六、自机',
    body: `· 饮泉思源（蓝白）：词条编辑与校对的化身。
· 誓约沙玛（粉红）：与饮泉并肩探寻真相的伙伴。

两者操作与火力结构相同（主弹 + 侧方追踪子机）；剧情与 5 面对手随所选自机切换。`,
  },
];

/** 兼容旧引用：纯文本拼接 */
export const MANUAL_TEXT = MANUAL_CHAPTERS
  .map((c) => `【${c.title.replace(/^[一二三四五六七八九十]+、/, '')}】\n\n${c.body}`)
  .join('\n\n');
