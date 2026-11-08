/**
 * 章节刷怪黄金哈希（B1 测试基建）。
 *
 * 同一章节 + 固定种子 + 固定步数 ⇒ 同一组敌机/子弹生成序列。
 * 只用于测试与基线生成，不进入运行时产物。
 *
 * 覆盖范围：
 * - `build(g)` 产生的初始敌机
 * - mid 章 `waveFn` 180 个逻辑帧内的全部生成
 * - 所有敌方子弹的 type / 位置 / 角度 / 速度
 */
import { createMockGame } from './mockGame.js';
import { withSeededRng, createRng } from '../js/rng.js';

export const GOLDEN_FRAMES = 180;

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

/** 生成该章节的稳定哈希（含 build 与 180 帧 wave） */
export function hashChapter(ch) {
  const g = createMockGame();
  return withSeededRng(() => {
    ch.build(g);
    if (typeof g.waveFn === 'function') g.tickWaves(GOLDEN_FRAMES, 1 / 60);
    const parts = [];
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
