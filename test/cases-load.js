/**
 * 浏览器专用：动态 import 主路径模块，抓语法错误与坏 import
 * （Node CLI 用 test/check-syntax.mjs 的 node --check，不跑本文件用例）
 */
import { test, assert } from './assert.js';

const isBrowser = typeof document !== 'undefined' && typeof window !== 'undefined';

/** 不启 main 引导副作用；只加载游戏核心链 */
const CORE_MODULES = [
  '../js/git-hash.js',
  '../js/version.js',
  '../js/config.js',
  '../js/spawnScale.js',
  '../js/startMode.js',
  '../js/bgModes.js',
  '../js/chapterFlow.js',
  '../js/gameCombat.js',
  '../js/gameDraw.js',
  '../js/gameOverlay.js',
  '../js/game.js',
  '../js/ui.js',
  '../js/input.js',
  '../js/patterns.js',
  '../js/entities.js',
  '../js/draw/index.js',
  '../js/draw/entitiesDraw.js',
  '../js/collision.js',
];

if (isBrowser) {
  test('浏览器：主路径模块可加载（语法/依赖链）', async () => {
    const errors = [];
    for (const url of CORE_MODULES) {
      try {
        await import(url);
      } catch (e) {
        errors.push(`${url}: ${e?.message || e}`);
      }
    }
    assert(
      errors.length === 0,
      errors.slice(0, 6).join('\n') + (errors.length > 6 ? `\n…+${errors.length - 6}` : ''),
    );
  });
}
