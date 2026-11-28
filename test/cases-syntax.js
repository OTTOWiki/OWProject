/**
 * check-syntax 门禁自身的回归：坏相对 import 必须被捕获（否则 #8 退化为纯语法解析）。
 * 浏览器 /test/ 页不加载 check-syntax.mjs（仅 Node 运行本用例）。
 */
import { test, assertEqual } from './assert.js';

const isBrowser = typeof document !== 'undefined' && typeof window !== 'undefined';

if (!isBrowser) {
  test('check-syntax：相对 import 目标缺失会被门禁捕获', async () => {
    const { missingImportTargets } = await import('./check-syntax.mjs');
    const { fileURLToPath } = await import('node:url');
    const self = fileURLToPath(new URL('./check-syntax.mjs', import.meta.url));
    const missing = (src) => missingImportTargets(src, self).join(',');

    assertEqual(missing("import { x } from './missing.js';"), './missing.js', '静态 import');
    assertEqual(missing("import './missing.js';"), './missing.js', '副作用导入');
    assertEqual(missing("export { x } from './missing.js';"), './missing.js', 'export-from');
    // 源码里不能留下字面量 import('...')，否则门禁会把它当成真实 import
    assertEqual(missing('await ' + 'import' + "('./missing.js');"), './missing.js', '动态 import');
    assertEqual(missing("import {\n  a,\n} from './missing.js';"), './missing.js', '多行 import');
    assertEqual(missing("import './check-syntax.mjs';"), '', '存在的目标应通过');
    assertEqual(missing("import 'node:fs';"), '', '裸模块跳过');
    assertEqual(missing("import 'https://cdn.example/x.js';"), '', 'URL 跳过');
  });
}
