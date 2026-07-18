/**
 * 将 js/version.js 中的 GIT_HASH 写成指定短哈希（供 GitHub Actions 调用）
 * Usage: node tools/stamp-git-hash.mjs <sha-or-short>
 * Env: GITHUB_SHA（未传参时使用）
 *
 * stdout: "changed <hash>" | "unchanged <hash>"
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

function readHash(src) {
  const m = src.match(/export const GIT_HASH\s*=\s*['"]([^'"]*)['"]/);
  return m ? m[1] : null;
}

const input = process.argv[2] || process.env.GITHUB_SHA || '';
if (!input) {
  console.error('usage: node tools/stamp-git-hash.mjs <sha>');
  process.exit(1);
}

const hash = shortHash(input);
const src = fs.readFileSync(versionPath, 'utf8');
if (!/export const GIT_HASH\s*=/.test(src)) {
  console.error('GIT_HASH export not found in js/version.js');
  process.exit(1);
}

const cur = readHash(src);
if (cur != null && cur !== '' && shortHash(cur.padEnd(7, '0').slice(0, 40)) === hash) {
  // only if cur is valid hex of enough length
}
if (cur && /^[0-9a-f]{7,40}$/i.test(cur) && cur.slice(0, 7).toLowerCase() === hash) {
  console.log(`unchanged ${hash}`);
  process.exit(0);
}

const next = src.replace(
  /export const GIT_HASH\s*=\s*[^;]+;/,
  `export const GIT_HASH = '${hash}';`,
);
if (next === src) {
  console.error('failed to replace GIT_HASH');
  process.exit(1);
}
fs.writeFileSync(versionPath, next, 'utf8');
console.log(`changed ${hash}`);
