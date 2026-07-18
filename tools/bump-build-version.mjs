/**
 * 将 js/version.js 的 VERSION（自然数构建号）+1。
 * 供 .githooks/pre-commit 调用，变更计入同一次 commit，不另开提交。
 *
 * Usage: node tools/bump-build-version.mjs
 * stdout: "bumped 70 -> 71"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const versionPath = path.join(root, 'js', 'version.js');

const src = fs.readFileSync(versionPath, 'utf8');
const m = src.match(/export const VERSION\s*=\s*(\d+)\s*;/);
if (!m) {
  console.error('bump-build-version: export const VERSION = N not found in js/version.js');
  process.exit(1);
}

const prev = Number(m[1]);
const next = prev + 1;
const out = src.replace(
  /export const VERSION\s*=\s*\d+\s*;/,
  `export const VERSION = ${next};`,
);

if (out === src) {
  console.error('bump-build-version: replace failed');
  process.exit(1);
}

fs.writeFileSync(versionPath, out, 'utf8');
console.log(`bumped ${prev} -> ${next}`);
