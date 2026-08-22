/**
 * Extra 道中图案库入口 — MID_PATTERNS 表 + buildExMid
 * 实现见 ex_mid_0_31.js / ex_mid_32_61.js（E03d1 拆分，内容零改动）
 */
import { MID_PATTERNS_A } from './ex_mid_0_31.js';
import { MID_PATTERNS_B } from './ex_mid_32_61.js';

/** 按索引取图案（全 62 章独立设计） */
export const MID_PATTERNS = [...MID_PATTERNS_A, ...MID_PATTERNS_B];

export function buildExMid(g, index) {
  MID_PATTERNS[index](g);
}
