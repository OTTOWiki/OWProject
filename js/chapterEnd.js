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
 * @property {boolean} [scriptError]  本章脚本（build/waveFn/敌机 script）抛过错
 */

/**
 * @typedef {object} ChapterEndResult
 * @property {boolean} success
 * @property {string} reason  scriptError | letterTimeout | durationBossFail | durationOk | bossDefeated | wavesClear
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
    scriptError = false,
  } = snap;

  // 章节脚本异常（build/waveFn/敌机 script 抛错）：奖励作废并按失败推进，绝不按 wavesClear 假成功。
  // 放在击破/超时判定之前：异常章的 Perfect、Letter 奖励与收率都不可信。
  if (scriptError) {
    return { success: false, reason: 'scriptError' };
  }

  // Boss / Letter：击破即本章结束（以 dead 为准）。
  // 必须先于超时判定：碰撞在扣时之前，最后一帧击破 boss 时 letterTimeLeft 可能恰好减到 0，
  // 若先判超时会把「击破帧」误判为 letterTimeout（丢 Perfect/Letter 奖励）。
  if (hasBossRef && bossRefDead) {
    return { success: true, reason: 'bossDefeated' };
  }

  // Letter 限时：超时未击破 → 失败（强制击破收场）
  if (letterTimeMax > 0) {
    if (letterTimeLeft <= 0) {
      return {
        success: false,
        reason: 'letterTimeout',
        killBoss: true,
      };
    }
  } else if (duration && chapterTime >= duration) {
    // 有 bossRef 的限时章：到时未击破 → 失败；纯道中：存活到时即成功
    if (hasBossRef) {
      return {
        success: false,
        reason: 'durationBossFail',
        killBoss: true,
      };
    }
    return { success: true, reason: 'durationOk' };
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
    scriptError: !!game._chapterScriptError,
  };
}
