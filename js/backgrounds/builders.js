/**
 * mode → builder(StageBackground)
 * EX 复用 A5/A6 场景（与历史一致）
 */
import {
  buildS1Mid, buildS1Boss,
  buildS2Mid, buildS2Boss,
  buildS3Mid, buildS3Boss,
  buildPatrol,
  buildA4, buildA5, buildA6,
  buildB4, buildB5, buildB6,
} from './scenes.js';

export const STAGE_BG_BUILDERS = {
  s1_mid: (bg) => buildS1Mid(bg),
  s1_boss: (bg) => buildS1Boss(bg),
  s2_mid: (bg) => buildS2Mid(bg),
  s2_boss: (bg) => buildS2Boss(bg),
  s3_mid: (bg) => buildS3Mid(bg),
  s3_boss: (bg) => buildS3Boss(bg),
  patrol: (bg) => buildPatrol(bg),
  a4_mid: (bg) => buildA4(bg, false),
  a4_boss: (bg) => buildA4(bg, true),
  a5_mid: (bg) => buildA5(bg, false),
  a5_boss: (bg) => buildA5(bg, true),
  a6_mid: (bg) => buildA6(bg, false),
  a6_boss: (bg) => buildA6(bg, true),
  b4_mid: (bg) => buildB4(bg, false),
  b4_boss: (bg) => buildB4(bg, true),
  b5_mid: (bg) => buildB5(bg, false),
  b5_boss: (bg) => buildB5(bg, true),
  b6_mid: (bg) => buildB6(bg, false),
  b6_boss: (bg) => buildB6(bg, true),
  ex_mid: (bg) => buildA5(bg, false),
  ex_boss: (bg) => buildA6(bg, true),
};
