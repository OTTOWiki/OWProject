/**
 * 轻量 Game 替身：供章节 build / waveFn 冒烟，不启 Canvas / Audio / DOM。
 */
import { applyEnemyDifficulty, applyEnemyBulletDifficulty } from '../js/spawnScale.js';

/**
 * @param {object} [opts]
 * @param {number} [opts.enemyHpMul]
 * @param {number} [opts.bulletSpeedMul]
 * @param {number} [opts.fireIntervalMul]
 * @param {number} [opts.bulletCountMul]
 * @param {number} [opts.spawnMul]
 */
export function createMockGame(opts = {}) {
  const g = {
    enemies: [],
    bullets: [],
    items: [],
    particles: [],
    player: {
      x: 225, y: 500, lives: 2, bombs: 3, edit: 0,
      // A5 rival 等章读 g.player.def.id
      def: { id: 'yinquan', color: '#7dd3fc', color2: '#e0f2fe', name: '饮泉思源' },
    },
    playerId: 'yinquan',
    playerAtkMul: 1,
    atkMul: 1,
    enemyHpMul: opts.enemyHpMul ?? 1,
    bulletSpeedMul: opts.bulletSpeedMul ?? 1,
    fireIntervalMul: opts.fireIntervalMul ?? 1,
    bulletCountMul: opts.bulletCountMul ?? 1,
    spawnMul: opts.spawnMul ?? 1,
    state: 'playing',
    chapterTime: 0,
    waveFn: null,
    waveTimer: 0,
    waveCount: 0,
    rainT: 0,
    laserT: 0,
    crossT: 0,
    aimT: 0,
    bossRef: null,
    wavesExhausted: false,
    _hadWaveEnemySpawn: false,
    _dryWaveTicks: 0,
    _lastEnemySpawnChapterTime: -999,

    spawnEnemy(e) {
      if (!e) return e;
      applyEnemyDifficulty(e, this.enemyHpMul, this.fireIntervalMul);
      if (this.state === 'playing') {
        this._hadWaveEnemySpawn = true;
        this._lastEnemySpawnChapterTime = this.chapterTime;
        this.wavesExhausted = false;
        this._dryWaveTicks = 0;
      }
      this.enemies.push(e);
      return e;
    },

    spawnBullet(b) {
      if (!b) return b;
      applyEnemyBulletDifficulty(b, this.bulletSpeedMul);
      this.bullets.push(b);
      return b;
    },

    /** 推进若干「帧」：只跑 waveFn（不跑敌机 script / 碰撞） */
    tickWaves(frames = 60, dt = 1 / 60) {
      for (let i = 0; i < frames; i++) {
        this.chapterTime += dt;
        this.waveFn?.(dt);
      }
    },
  };
  return g;
}
