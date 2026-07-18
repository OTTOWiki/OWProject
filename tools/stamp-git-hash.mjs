/**
 * 将 js/version.js 中的 GIT_HASH 写成指定短哈希（供 GitHub Actions 调用）
 * Usage: node tools/stamp-git-hash.mjs <sha-or-short>
 * Env: GITHUB_SHA（未传参时使用）
 *
 * exit 0 且 stdout 含 "changed" → 文件已改写
 * exit 0 且 "unchanged" → 已是目标哈希
 * exit 1 → 错误
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const versionPath = path.join(root, 'js', 'version.js');

function shortHash(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(s)) {
    throw new Error(`invalid git sha: ${raw}`);
  }
  return s.slice(0, 7);
}

const input = process.argv[2] || process.env.GITHUB_SHA || '';
if (!input) {
  console.error('usage: node tools/stamp-git-hash.mjs <sha>');
  process.exit(1);
}

const hash = shortHash(input);
let src = fs.readFileSync(versionPath, 'utf8');

if (!/export const GIT_HASH\s*=/.test(src)) {
  console.error('GIT_HASH export not found in js/version.js');
  process.exit(1);
}

const next = src.replace(
  /export const GIT_HASH\s*=\s*['"][^'"]*['"]\s*;/,
  `export const GIT_HASH = '${hash}';`,
);

if (next === src) {
  // 可能已是目标值，或格式略有差异
  const m = src.match(/export const GIT_HASH\s*=\s*['"]([^'"]*)['"]/);
  if (m && shortHash(m[1] || '0'.repeat(7)) === hash) {
    // 空串 shortHash 会 throw，单独处理
  }
  if (m && m[1] && /^[0-9a-f]{7,40}$/i.test(m[1]) && m[1].slice(0, 7).toLowerCase() === hash) {
    console.log(`unchanged ${hash}`);
    process.exit(0);
  }
  if (m && !m[1] && hash) {
    // 空 → 有值 应已在 replace 成功；若失败则用更宽松替换
  }
}

if (next === src) {
  // 宽松：任意 GIT_HASH 赋值
  const loose = src.replace(
    /export const GIT_HASH\s*=\s*[^;]+;/,
    `export const GIT_HASH = '${hash}';`,
  );
  if (loose === src) {
    console.error('failed to replace GIT_HASH');
    process.exit(1);
  }
  fs.writeFileSync(versionPath, loose, 'utf8');
  console.log(`changed ${hash}`);
  process.exit(0);
}

fs.writeFileSync(versionPath, next, 'utf8');
console.log(`changed ${hash}`);
