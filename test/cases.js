/**
 * 用例聚合入口（浏览器 / Node 均 import 本文件注册全部用例）
 * 分文件：config / patterns / collision / feedback / pools / stages / boss-dps / storage-spawn / letterrate / runstats / continue / assets / ranking / replay / smoke / load
 */
import './cases-config.js';
import './cases-patterns.js';
import './cases-collision.js';
import './cases-feedback.js';
import './cases-pools.js';
import './cases-stages.js';
import './cases-boss-dps.js';
import './cases-storage-spawn.js';
import './cases-letterrate.js';
import './cases-runstats.js';
import './cases-continue.js';
import './cases-assets.js';
import './cases-ranking.js';
import './cases-replay.js';
import './cases-nomiss.js';
import './cases-smoke.js';
import './cases-load.js'; // 浏览器：动态 import 主模块；Node 跳过
