/**
 * /test/ 页面上的 Playwright e2e 结果展示。
 * 读取 Playwright JSON reporter 生成的 test-results/e2e.json（相对路径 ../test-results/e2e.json）。
 * 未生成时显示运行指引，不阻塞本页浏览器用例。
 */

const elSummary = document.getElementById('e2e-summary');
const elList = document.getElementById('e2e-list');

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
  time.textContent = Number.isFinite(ms) ? `${ms.toFixed(1)}ms` : '';
  li.append(badge, title, time);
  if (detail) {
    const pre = document.createElement('pre');
    pre.textContent = detail;
    li.append(pre);
  }
  return li;
}

function renderMissing() {
  elSummary.className = '';
  elSummary.textContent = '未在本机运行';
  elList.replaceChildren();
  const li = document.createElement('li');
  li.className = 'fail';
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = 'INFO';
  const title = document.createElement('span');
  title.className = 'name';
  title.textContent = '在项目根目录执行 npm run test:e2e 后刷新本页查看结果';
  li.append(badge, title);
  elList.append(li);
}

function render(data) {
  const stats = data.stats || {};
  const passed = stats.expected ?? 0;
  const failed = (stats.unexpected ?? 0) + (stats.flaky ?? 0);
  const skipped = stats.skipped ?? 0;

  elSummary.className = failed > 0 ? 'bad' : 'ok';
  const parts = [`通过 ${passed}`, `失败 ${failed}`];
  if (skipped > 0) parts.push(`跳过 ${skipped}`);
  elSummary.textContent = failed > 0
    ? `Playwright e2e 失败  ${parts.join(' · ')}`
    : `Playwright e2e 全部通过  ${parts.join(' · ')}`;

  elList.replaceChildren();
  for (const suite of data.suites || []) {
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        const ok = t.status === 'passed';
        const result = t.results?.[0] || {};
        const detail = result.error?.message
          ? `${result.error.message}\n${result.error.stack || ''}`
          : null;
        elList.append(row(ok ? 'pass' : 'fail', spec.title, detail, result.duration));
      }
    }
  }
}

async function main() {
  try {
    const res = await fetch('../test-results/e2e.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    render(data);
  } catch (_) {
    renderMissing();
  }
}

main().catch(() => renderMissing());
