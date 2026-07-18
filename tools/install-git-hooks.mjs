/**
 * 启用仓库内 .githooks（core.hooksPath）
 * Usage: node tools/install-git-hooks.mjs
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hooks = path.join(root, '.githooks');
const pre = path.join(hooks, 'pre-commit');

if (!fs.existsSync(pre)) {
  console.error('missing .githooks/pre-commit');
  process.exit(1);
}

// Git for Windows 需要可执行位；在 NTFS 上仍尽量 chmod
try {
  fs.chmodSync(pre, 0o755);
} catch {
  /* ignore */
}

execSync('git config core.hooksPath .githooks', { cwd: root, stdio: 'inherit' });
console.log('OK: core.hooksPath=.githooks');
console.log('Each commit will auto-bump VERSION in js/version.js (same commit).');
console.log('Skip with: git commit --no-verify');
