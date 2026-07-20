/**
 * 章结束条件纯函数（E05）
 * 不改 game、不调 finishChapter；由 updateCombat 消费返回值。
 */

/**
 * @typedef {object} ChapterEndSnap
 * @property {boolean} chapterDone
 * @property {number} letterTimeMax
 * @property {number} letterTimeLeft  调用方已扣完本帧 dt
 * @property {number|undefined|null} duration  章 duration（秒）
 * @property {number} chapterTime      调用方已加上本帧 dt
 * @property {boolean} hasBossRef
 * @property {boolean} bossRefDead    无 boss 时可为 false
 * @property {string} [kind]         mid | midboss | boss
 * @property {boolean} wavesExhausted
 * @property {boolean} livingEnemies  场上是否有未 dead 敌机
 */

/**
 * @typedef {object} ChapterEndResult
 * @property {boolean} success
 * @property {string} reason  letterTimeout | durationBossFail | durationOk | bossDefeated | wavesClear
 * @property {boolean} [killBoss]  是否需先将 bossRef 标 dead（超时/到时未击破）
 */

/**
 * @param {ChapterEndSnap} snap
 * @returns {null | ChapterEndResult}
 */
export function evaluateChapterEnd(snap) {
  if (!snap || snap.chapterDone) return null;

  const {
    letterTimeMax = 0,
    letterTimeLeft = 0,
    duration,
    chapterTime = 0,
    hasBossRef = false,
    bossRefDead = false,
    kind,
    wavesExhausted = false,
    livingEnemies = false,
  } = snap;

  // Letter 限时：超时未击破 → 失败（强制击破收场）
  if (letterTimeMax > 0) {
    if (letterTimeLeft <= 0) {
      return {
        success: false,
        reason: 'letterTimeout',
        killBoss: !!(hasBossRef && !bossRefDead),
      };
    }
  } else if (duration && chapterTime >= duration) {
    // 有 bossRef 的限时章：到时未击破 → 失败；纯道中：存活到时即成功
    if (hasBossRef && !bossRefDead) {
      return {
        success: false,
        reason: 'durationBossFail',
        killBoss: true,
      };
    }
    return { success: true, reason: 'durationOk' };
  }

  // Boss / Letter：击破即本章结束（以 dead 为准）
  if (hasBossRef && bossRefDead) {
    return { success: true, reason: 'bossDefeated' };
  }

  // 道中：刷怪已耗尽 + 场上无存活敌机
  if (
    !hasBossRef
    && (kind === 'mid' || kind === 'midboss')
    && wavesExhausted
    && !livingEnemies
    && chapterTime > 0.4
  ) {
    return { success: true, reason: 'wavesClear' };
  }

  return null;
}

/**
 * 从 game + 章元数据组 snap（纯读）
 * @param {object} game
 * @param {object} ch
 * @param {{ living?: boolean }} [opts]
 */
export function chapterEndSnapFromGame(game, ch, opts = {}) {
  const living = opts.living != null
    ? opts.living
    : (game.enemies || []).some((e) => !e.dead);
  const boss = game.bossRef;
  return {
    chapterDone: !!game.chapterDone,
    letterTimeMax: game.letterTimeMax || 0,
    letterTimeLeft: game.letterTimeLeft || 0,
    duration: ch?.duration,
    chapterTime: game.chapterTime || 0,
    hasBossRef: !!boss,
    bossRefDead: !!(boss && boss.dead),
    kind: ch?.kind,
    wavesExhausted: !!game.wavesExhausted,
    livingEnemies: living,
  };
}
