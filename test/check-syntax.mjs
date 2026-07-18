/**
 * 用 Node 对仓库内 ES 模块做语法检查（node --check）。
 * 不执行代码，故不依赖 Three CDN / DOM；能抓住 game.js 等主路径的 SyntaxError。
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const dirs = ['js', 'test'];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith('.js') || name.endsWith('.mjs')) out.push(p);
  }
  return out;
}

const files = [];
for (const d of dirs) {
  const abs = join(root, d);
  try {
    walk(abs, files);
  } catch {
    /* skip missing */
  }
}
files.sort();

let failed = 0;
const errors = [];

for (const file of files) {
  const rel = relative(root, file).replace(/\\/g, '/');
  const r = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
    env: process.env,
  });
  if (r.status !== 0) {
    failed++;
    const msg = (r.stderr || r.stdout || `exit ${r.status}`).trim();
    errors.push({ file: rel, msg });
    console.error(`SYNTAX FAIL  ${rel}`);
    console.error(msg);
  }
}

if (failed) {
  console.error(`\nSyntax check: ${failed}/${files.length} file(s) failed`);
  process.exit(1);
}

console.log(`Syntax check: OK ${files.length} files`);
