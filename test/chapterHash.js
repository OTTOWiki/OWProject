/**
 * 章节刷怪黄金哈希（B1 测试基建）。
 *
 * 同一章节 + 固定种子 + 固定步数 ⇒ 同一组敌机/子弹生成序列。
 * 只用于测试与基线生成，不进入运行时产物。
 *
 * 覆盖范围：
 * - `build(g)` 产生的初始敌机
 * - mid 章 `waveFn` 600 个逻辑帧（10 秒）内的全部生成
 * - 所有敌方子弹的 type / 位置 / 角度 / 速度
 */
import { createMockGame } from './mockGame.js';
import { withSeededRng, createRng } from '../js/rng.js';

export const GOLDEN_FRAMES = 600;

/** 按章节 id 派生固定种子（与整局共享流不同，只锁单章内部序列） */
export function seedForChapter(id) {
  return (0x9e3779b9 ^ Math.imul(id, 2654435761)) >>> 0;
}

/** FNV-1a 32-bit */
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 生成该章节的稳定哈希（含生成事件时序 + build 与 600 帧最终状态） */
export function hashChapter(ch) {
  const g = createMockGame();
  return withSeededRng(() => {
    const events = [];
    let frame = 0;
    const spawnEnemy = g.spawnEnemy.bind(g);
    g.spawnEnemy = (e) => {
      if (e) events.push(`SE@${frame}:${e.type}:${e.x.toFixed(2)}:${e.y.toFixed(2)}`);
      return spawnEnemy(e);
    };
    const spawnBullet = g.spawnBullet.bind(g);
    g.spawnBullet = (b) => {
      if (b) events.push(`SB@${frame}:${b.type}:${b.x.toFixed(2)}:${b.y.toFixed(2)}:${(b.angle ?? 0).toFixed(3)}`);
      return spawnBullet(b);
    };

    ch.build(g);
    for (let i = 0; i < GOLDEN_FRAMES; i += 1) {
      g.chapterTime += 1 / 60;
      g.waveFn?.(1 / 60);
      frame += 1;
    }
    const parts = [...events];
    for (const e of g.enemies) {
      parts.push(`E:${e.type}:${e.x.toFixed(2)}:${e.y.toFixed(2)}:${e.hp}`);
    }
    for (const b of g.bullets) {
      parts.push(
        `B:${b.type}:${b.x.toFixed(2)}:${b.y.toFixed(2)}:${(b.angle ?? 0).toFixed(3)}:${(b.speed ?? 0).toFixed(2)}`,
      );
    }
    return fnv1a(parts.join('|'));
  }, createRng(seedForChapter(ch.id)));
}
