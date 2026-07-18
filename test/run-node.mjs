/**
 * Node CLI：npm test / node test/run-node.mjs
 * 零依赖；失败 exit 1
 */
import './cases.js';
import { runAll } from './assert.js';

const r = await runAll();
const ok = r.failed === 0;
// eslint-disable-next-line no-console
console.log(ok ? `PASS ${r.passed}/${r.total}` : `FAIL ${r.failed}/${r.total}`);
if (!ok) {
  for (const f of r.failures) {
    // eslint-disable-next-line no-console
    console.error(`  ✗ ${f.name}\n    ${f.error.message}`);
  }
  process.exit(1);
}
