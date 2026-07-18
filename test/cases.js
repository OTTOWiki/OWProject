/**
 * 用例聚合入口（浏览器 / Node 均 import 本文件注册全部用例）
 * 分文件：config / patterns / collision / stages / storage-spawn / smoke
 */
import './cases-config.js';
import './cases-patterns.js';
import './cases-collision.js';
import './cases-stages.js';
import './cases-storage-spawn.js';
import './cases-assets.js';
import './cases-smoke.js';
import './cases-load.js'; // 浏览器：动态 import 主模块；Node 跳过
