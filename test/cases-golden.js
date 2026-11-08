/**
 * B1：章节刷怪黄金哈希。
 *
 * 防止「手感/回放契约相关的刷怪序列」被无意改动：
 * 每章固定种子 → build + waveFn 180 帧 → 敌机/子弹生成序列哈希，
 * 与 test/goldenChapterHashes.js 的冻结基线比较。
 *
 * 有意改章节刷怪后：
 *   node tools/gen-chapter-hashes.mjs
 * 并把基线 diff 与改动一起 review。
 */
import { buildChapterList } from '../js/stages/index.js';
import { hashChapter } from './chapterHash.js';
import { GOLDEN_CHAPTER_SPAWN_HASHES as GOLDEN } from './goldenChapterHashes.js';
import { test, assert, assertEqual } from './assert.js';

test('章节刷怪黄金哈希：全部章节与冻结基线一致', () => {
  const list = buildChapterList();
  assertEqual(list.length, Object.keys(GOLDEN).length, '章节数量与基线一致');

  const drifted = [];
  for (const ch of list) {
    const expected = GOLDEN[ch.id];
    if (expected == null) {
      drifted.push(`#${ch.id} ${ch.name}: 缺少基线`);
      continue;
    }
    const actual = hashChapter(ch);
    if (actual !== expected) {
      drifted.push(`#${ch.id} ${ch.name}: ${actual} != ${expected}`);
    }
  }

  assert(
    drifted.length === 0,
    `${drifted.length} 章刷怪哈希漂移：\n${drifted.slice(0, 10).join('\n')}`
      + `${drifted.length > 10 ? '\n…' : ''}`
      + '\n有意修改请运行 node tools/gen-chapter-hashes.mjs 并 review diff',
  );
});
