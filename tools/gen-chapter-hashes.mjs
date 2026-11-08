/**
 * 生成 test/goldenChapterHashes.js。
 * 仅在「有意修改章节刷怪」后运行；普通改动不应重跑基线。
 *
 *   node tools/gen-chapter-hashes.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildChapterList } from '../js/stages/index.js';
import { hashChapter, GOLDEN_FRAMES } from '../test/chapterHash.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'test', 'goldenChapterHashes.js');

const list = buildChapterList();
const rows = list.map((ch) => `  ${ch.id}: ${hashChapter(ch)},`);
const body = `/**
 * 自动生成，勿手改。见 tools/gen-chapter-hashes.mjs。
 * 基线：每章固定种子，build + waveFn ${GOLDEN_FRAMES} 帧。
 */
export const GOLDEN_CHAPTER_SPAWN_HASHES = {
${rows.join('\n')}
};
`;

writeFileSync(out, body, 'utf8');
console.log(`wrote ${rows.length} chapter hashes -> ${out}`);
