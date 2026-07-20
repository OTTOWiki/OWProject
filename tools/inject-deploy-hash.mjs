/**
 * 部署时写入 js/git-hash.js 的 DEPLOY_GIT_HASH（不修改仓库远程内容，只影响构建目录）
 *
 * 哈希来源（优先）：
 * 1. CLI: node tools/inject-deploy-hash.mjs <sha>
 * 2. CF_PAGES_COMMIT_SHA（Cloudflare Pages）
 * 3. GITHUB_SHA
 * 4. 本地 git rev-parse HEAD（可选，失败则空）
 *
 * 无哈希时写入空串 → 界面仅显示 vX.Y.Z
 *
 * Cloudflare Pages 推荐：
 *   Build command:  npm run pages:build
 *   Build output directory: /   （或留空 / 项目根，按控制台选项）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'js', 'git-hash.js');

function shortHash(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(s)) return '';
  return s.slice(0, 7);
}

function tryGitHead() {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

const arg = process.argv[2];
let raw = '';
/** @type {string} 哈希来源标签（写入 git-hash.js 注释） */
let source;
if (arg === '--clear' || arg === '-c') {
  raw = '';
  source = 'clear';
} else if (arg) {
  raw = arg;
  source = 'cli';
} else if (process.env.CF_PAGES_COMMIT_SHA) {
  raw = process.env.CF_PAGES_COMMIT_SHA;
  source = 'CF_PAGES_COMMIT_SHA';
} else if (process.env.GITHUB_SHA) {
  raw = process.env.GITHUB_SHA;
  source = 'GITHUB_SHA';
} else {
  raw = tryGitHead();
  source = raw ? 'git-rev-parse' : 'empty';
}

const hash = shortHash(raw);

const body = `/**
 * 部署短哈希（由 tools/inject-deploy-hash.mjs 生成；仓库源文件应为空串）
 * 请勿把含真实 hash 的本文件提交进仓库（若本地注入了，提交前恢复为空或勿 git add）。
 * source=${source}
 */
export const DEPLOY_GIT_HASH = '${hash}';
`;

fs.writeFileSync(outPath, body, 'utf8');
// 便于在 Cloudflare 构建日志里确认是否执行成功
console.log(`[inject-deploy-hash] source=${source} raw=${raw ? `${String(raw).slice(0, 12)}…` : '(none)'} short=${hash || '(empty)'}`);
console.log(`[inject-deploy-hash] wrote ${outPath}`);
if (!hash && source !== 'clear') {
  console.warn('[inject-deploy-hash] WARN: no commit sha — version label will omit hash. On CF Pages ensure Build command runs this script.');
}