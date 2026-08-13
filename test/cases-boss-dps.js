/**
 * Boss 理论可杀性：限时理论输出须 ≥ 该章 Boss 血量 ÷ KILLABLE_RATIO。
 * KILLABLE_RATIO 是 血量/(理论输出×限时) 的允许上限（当前 0.235 ⇒ 限时输出须 ≥ 血量×4.26），
 * 余量留给入场无敌、走位、躲弹占用的输出时间。
 *
 * 断言：dps × timeLimit ≥ hp ÷ KILLABLE_RATIO
 *
 * 覆盖 kind 'boss'（时限 letterTime）与 'midboss'（时限 duration）——
 * 两类都在限时内必须击杀，超时即失败（evaluateChapterEnd durationBossFail / letterTimeout）。
 *
 * 理论 DPS 由真实代码推得：满速（非低速）连续射击 1 秒，
 * 累计 spawnPlayerShot 生成的全部子弹伤害（5 主弹 + 2 子机，冷却 BALANCE.playerShotCooldown）。
 * 不硬编码数值，平衡改动（伤害/冷却/弹数）后测试自动跟随。
 */
import { buildChapterList } from '../js/stages/index.js';
import { createMockGame } from './mockGame.js';
import { spawnPlayerShot } from '../js/patterns.js';
import { BALANCE } from '../js/config.js';
import { test, assert } from './assert.js';

/** 满速理论 DPS = 1 秒内 spawnPlayerShot 的子弹伤害总和（全弹命中上限） */
function theoreticalDps() {
  const g = createMockGame();
  const p = g.player;
  p.slow = false;
  const volleys = Math.max(1, Math.round(1 / BALANCE.playerShotCooldown));
  for (let i = 0; i < volleys; i++) spawnPlayerShot(g, p);
  return g.playerBullets.reduce((s, b) => s + (b.damage || 0), 0);
}

/** 血量/(理论输出×限时) 的允许上限；限时理论输出须 ≥ 血量 ÷ 此值（0.235 ⇒ ≥ 4.26×） */
const KILLABLE_RATIO = 0.235;

test(`boss/midboss 限时理论输出 ≥ 血量的 ${(100 / KILLABLE_RATIO).toFixed(1)}%`, () => {
  const dps = theoreticalDps();
  assert(dps > 0, `theoretical DPS should be > 0, got ${dps}`);
  const bad = [];

  for (const ch of buildChapterList().filter((c) => c.kind === 'boss' || c.kind === 'midboss')) {
    const time = ch.kind === 'boss' ? ch.letterTime : ch.duration;
    const g = createMockGame();
    try {
      ch.build(g);
    } catch (e) {
      bad.push(`#${ch.id} ${ch.name} build threw: ${e?.message || e}`);
      continue;
    }
    const boss = g.bossRef || g.enemies.find((e) => e.type === 'boss' || e.type === 'elite');
    if (!boss) {
      bad.push(`#${ch.id} ${ch.name}: no bossRef / boss enemy`);
      continue;
    }
    if (!(typeof time === 'number' && time > 0)) {
      bad.push(`#${ch.id} ${ch.name}: no time limit (letterTime/duration=${time})`);
      continue;
    }
    const dealt = dps * time;
    const pct = (dealt / boss.hp) * 100; // 限时理论输出占血量的百分比
    if (dealt < boss.hp / KILLABLE_RATIO) {
      bad.push(
        `#${ch.id} ${ch.name}: hp=${boss.hp} in ${time}s needs ≥${(100 / KILLABLE_RATIO).toFixed(1)}% of hp dealt, only ${pct.toFixed(1)}% (dealt=${Math.round(dealt)})`,
      );
    }
  }

  assert(
    bad.length === 0,
    bad.slice(0, 10).join('\n') + (bad.length > 10 ? `\n…+${bad.length - 10}` : ''),
  );
});
