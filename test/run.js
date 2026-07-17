/**
 * 测试入口：注册用例 → 执行 → 渲染结果
 */
import { runAll } from './assert.js';
import './cases.js';

const elSummary = document.getElementById('summary');
const elList = document.getElementById('results');
const elMeta = document.getElementById('meta');

function row(status, name, detail, ms) {
  const li = document.createElement('li');
  li.className = status;
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = status === 'pass' ? 'PASS' : 'FAIL';
  const title = document.createElement('span');
  title.className = 'name';
  title.textContent = name;
  const time = document.createElement('span');
  time.className = 'ms';
  time.textContent = `${ms.toFixed(1)}ms`;
  li.append(badge, title, time);
  if (detail) {
    const pre = document.createElement('pre');
    pre.textContent = detail;
    li.append(pre);
  }
  return li;
}

async function main() {
  elMeta.textContent = `OWProject 自动化测试 · ${new Date().toLocaleString()}`;
  elSummary.textContent = '运行中…';
  elList.replaceChildren();

  const result = await runAll({
    onPass(t, ms) {
      elList.append(row('pass', t.name, null, ms));
    },
    onFail(t, err, ms) {
      elList.append(row('fail', t.name, err.stack || err.message, ms));
    },
  });

  const ok = result.failed === 0;
  elSummary.className = ok ? 'ok' : 'bad';
  elSummary.textContent = ok
    ? `全部通过  ${result.passed} / ${result.total}`
    : `失败 ${result.failed}  ·  通过 ${result.passed} / ${result.total}`;

  document.title = ok
    ? `✓ ${result.passed} tests`
    : `✗ ${result.failed} failed`;

  // 方便控制台 / 以后接 CI 抓结果
  console.info('[test]', result);
  window.__TEST_RESULT__ = result;
}

main().catch((e) => {
  elSummary.className = 'bad';
  elSummary.textContent = '测试运行器崩溃';
  elList.append(row('fail', '(runner)', e.stack || String(e), 0));
  console.error(e);
});
