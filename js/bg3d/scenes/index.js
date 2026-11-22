/**
 * 3D 舞台场景聚合：21 mode → builder。
 * 每 stage 模块导出 { mid, boss }（patrol 只有 mid）。
 * 场景细节见各 stage 文件；设计说明 docs/level-background-redesign.md §3D。
 */
import * as s1 from './s1.js';
import * as s2 from './s2.js';
import * as s3 from './s3.js';
import * as patrol from './patrol.js';
import * as a4 from './a4.js';
import * as a5 from './a5.js';
import * as a6 from './a6.js';
import * as b4 from './b4.js';
import * as b5 from './b5.js';
import * as b6 from './b6.js';
import * as ex from './ex.js';

/** @type {Record<string, Function>} */
export const SCENES3D = {
  s1_mid: s1.mid,
  s1_boss: s1.boss,
  s2_mid: s2.mid,
  s2_boss: s2.boss,
  s3_mid: s3.mid,
  s3_boss: s3.boss,
  patrol: patrol.mid,
  a4_mid: a4.mid,
  a4_boss: a4.boss,
  a5_mid: a5.mid,
  a5_boss: a5.boss,
  a6_mid: a6.mid,
  a6_boss: a6.boss,
  b4_mid: b4.mid,
  b4_boss: b4.boss,
  b5_mid: b5.mid,
  b5_boss: b5.boss,
  b6_mid: b6.mid,
  b6_boss: b6.boss,
  ex_mid: ex.mid,
  ex_boss: ex.boss,
};
