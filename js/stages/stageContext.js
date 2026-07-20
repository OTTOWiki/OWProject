/**
 * 关卡运行时窄 API（E07）
 * build 仍接收完整 Game，经 asStageContext 收窄出怪/出弹/波次/Boss。
 * patterns 可传 ctx（需 spawnBullet + bulletCountMul）。
 */
import { installMidWave, pushBossRef } from './_shared.js';

/**
 * @param {object} game Game 实例
 * @returns {{
 *   player: object,
 *   bulletCountMul: number,
 *   spawnEnemy: (e: object) => object,
 *   spawnBullet: (b: object) => object,
 *   installWave: (opts: object) => void,
 *   setBoss: (opts: object, script?: Function, factory?: 'boss'|'elite') => object,
 *   raw: object,
 * }}
 */
export function asStageContext(game) {
  const ctx = {
    get player() {
      return game.player;
    },
    get bulletCountMul() {
      return game.bulletCountMul;
    },
    spawnEnemy(e) {
      return game.spawnEnemy(e);
    },
    spawnBullet(b) {
      return game.spawnBullet(b);
    },
    /**
     * @param {{ interval?: number, maxWaves?: number, onWave?: (ctx: object, wave: number) => void, continuous?: (ctx: object, dt: number) => void }} opts
     */
    installWave(opts) {
      const { continuous, onWave, ...rest } = opts || {};
      installMidWave(game, {
        ...rest,
        continuous: continuous
          ? (g, dt) => continuous(g === game ? ctx : asStageContext(g), dt)
          : undefined,
        onWave: onWave
          ? (g, wave) => onWave(g === game ? ctx : asStageContext(g), wave)
          : undefined,
      });
    },
    setBoss(opts, script, factory = 'boss') {
      const wrapped = script
        ? (en, d, gm) => script(en, d, gm === game ? ctx : asStageContext(gm))
        : undefined;
      return pushBossRef(game, opts, wrapped, factory);
    },
    /** 逃逸口：旧代码或调试；新章优先用上面字段 */
    get raw() {
      return game;
    },
  };
  return ctx;
}
