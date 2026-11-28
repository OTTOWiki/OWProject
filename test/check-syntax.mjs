/**
 * 用 Node 校验 `js/`、`test/`、`functions/`、`tools/` 的 ES 模块：
 * 1) node --check 语法解析（不执行代码，不依赖 Three CDN / DOM / Cloudflare 全局）；
 * 2) 相对 import（含副作用导入）/export-from/动态 import 的目标文件必须存在
 *    （显式 .js/.mjs 后缀；目录/裸模块跳过）。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const dirs = ['js', 'test', 'functions', 'tools'];

// import ... from 'x' / export ... from 'x'（均为模块顶层声明，行首锚定）
const STATIC_IMPORT = /(?:^|\n)[ \t]*(?:import|export)\b[^'";]*?\bfrom[ \t]*['"]([^'"\n]+)['"]/g;
// 副作用导入 import 'x'（test/cases.js 的用例聚合全走这种写法）
const SIDE_EFFECT_IMPORT = /(?:^|\n)[ \t]*import[ \t]*['"]([^'"\n]+)['"]/g;
// import('x')（含 JSDoc 的 import('x') 类型引用）
const DYNAMIC_IMPORT = /\bimport[ \t]*\([ \t]*['"]([^'"\n]+)['"][ \t]*\)/g;

const isRelative = (spec) => spec.startsWith('./') || spec.startsWith('../');

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

/** 源码里所有字面量 import specifier（静态 import/export-from + 动态 import） */
export function importSpecifiers(src) {
  const specs = new Set();
  for (const re of [STATIC_IMPORT, SIDE_EFFECT_IMPORT, DYNAMIC_IMPORT]) {
    for (const m of src.matchAll(re)) specs.add(m[1]);
  }
  return [...specs];
}

/** 相对 import 中目标文件不存在的 specifier（裸模块/URL/目录片段跳过） */
export function missingImportTargets(src, filePath) {
  return importSpecifiers(src).filter(
    (spec) => isRelative(spec) && !existsSync(resolve(dirname(filePath), spec)),
  );
}

function main() {
  const files = [];
  for (const d of dirs) {
    try {
      walk(join(root, d), files);
    } catch {
      /* skip missing */
    }
  }
  files.sort();

  let failed = 0;
  let importCount = 0;
  const rel = (file) => relative(root, file).replace(/\\/g, '/');

  for (const file of files) {
    const r = spawnSync(process.execPath, ['--check', file], {
      encoding: 'utf8',
      env: process.env,
    });
    if (r.status === 0) continue;
    failed++;
    const msg = (r.stderr || r.stdout || `exit ${r.status}`).trim();
    console.error(`SYNTAX FAIL  ${rel(file)}`);
    console.error(msg);
  }

  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    importCount += importSpecifiers(src).filter(isRelative).length;
    for (const spec of missingImportTargets(src, file)) {
      failed++;
      console.error(`IMPORT FAIL  ${rel(file)}  →  ${spec}`);
    }
  }

  if (failed) {
    console.error(`\nCheck: ${failed} failure(s) across ${files.length} file(s)`);
    process.exit(1);
  }
  console.log(`Check: OK ${files.length} files, ${importCount} relative imports`);
}

// 仅在作为脚本运行时扫描；被 test/cases-syntax.js import 时只导出校验纯函数。
const invocation = process.argv[1];
if (invocation && resolve(invocation) === fileURLToPath(import.meta.url)) main();
