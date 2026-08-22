/**
 * npm test 入口：优先 bun test，无 bun 退回 node 全流程。
 * - 有 bun（PATH 可解析）：bun test（入口 test/run-bun.test.mjs，含 56 项单测/冒烟）
 * - 无 bun：node test/check-syntax.mjs + node test/run-node.mjs（原 npm test 行为）
 * 子进程 stdio 透传，退出码原样上抛。
 */
import { spawnSync } from 'node:child_process';

const hasBun = spawnSync('bun', ['--version'], { encoding: 'utf8' }).status === 0;

if (hasBun) {
  // 显式只跑 bun 入口：bun 默认会扫到 test/e2e/*.spec.js，e2e 由 Playwright 跑，不进 npm test
  process.exit(spawnSync('bun', ['test', 'test/run-bun.test.mjs'], { stdio: 'inherit' }).status ?? 1);
}

for (const file of ['test/check-syntax.mjs', 'test/run-node.mjs']) {
  const r = spawnSync(process.execPath, [file], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
