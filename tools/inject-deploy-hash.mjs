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
if (arg === '--clear' || arg === '-c') {
  raw = '';
} else if (arg) {
  raw = arg;
} else {
  raw = process.env.CF_PAGES_COMMIT_SHA
    || process.env.GITHUB_SHA
    || tryGitHead()
    || '';
}

const hash = shortHash(raw);

const body = `/**
 * 部署短哈希（由 tools/inject-deploy-hash.mjs 生成；仓库源文件应为空串）
 * 请勿把含真实 hash 的本文件提交进仓库（若本地注入了，提交前恢复为空或勿 git add）。
 */
export const DEPLOY_GIT_HASH = '${hash}';
`;

fs.writeFileSync(outPath, body, 'utf8');
console.log(hash ? `inject-deploy-hash: DEPLOY_GIT_HASH=${hash}` : 'inject-deploy-hash: DEPLOY_GIT_HASH= (empty)');
