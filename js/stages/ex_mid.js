/**
 * Extra 道中图案库入口 — MID_PATTERNS 表 + buildExMid
 * 实现见 ex_mid_0_31.js / ex_mid_32_61.js（E03d1 拆分，内容零改动）
 */
import {
  mid_altSides,
  mid_randomEven,
  mid_dualFlank,
  mid_hoverRing,
  mid_rainSparse,
  mid_crossLanes,
  mid_hoverElite,
  mid_laserSniper,
  mid_hLaserRain,
  mid_vForm,
  mid_sideStream,
  mid_splitLarge,
  mid_diagCross,
  mid_ringEven,
  mid_zigzag,
  mid_centerSides,
  mid_fixedFan,
  mid_gapWall,
  mid_sideBarrage,
  mid_spiralLite,
  mid_echoSides,
  mid_randomGap,
  mid_dualColor,
  mid_hoverRingDuo,
  mid_rainSniper,
  mid_columnLane,
  mid_eliteFan,
  mid_laserDot,
  mid_wallRain,
  mid_vFormHeavy,
  mid_sideCross,
  mid_splitRing,
} from './ex_mid_0_31.js';
import {
  mid_diagReturn,
  mid_ringGap,
  mid_zigzagDual,
  mid_coreSpin,
  mid_fanEcho,
  mid_wallRebuild,
  mid_barrageRing,
  mid_spiralAfter,
  mid_altAfter,
  mid_randomAfter,
  mid_dualAfter,
  mid_hoverRingAfter,
  mid_rainAfter,
  mid_crossAfter,
  mid_hoverEliteAfter,
  mid_laserAfter,
  mid_hLaserAfter,
  mid_vFormAfter,
  mid_sideStreamAfter,
  mid_splitAfter,
  mid_diagAfter,
  mid_ringEvenAfter,
  mid_zigzagAfter,
  mid_centerAfter,
  mid_fanAfter,
  mid_wallAfter,
  mid_barrageAfter,
  mid_spiralFinale,
  mid_sanctuary,
  mid_overwriteEve,
} from './ex_mid_32_61.js';

/** 按索引取图案（全 62 章独立设计） */
export const MID_PATTERNS = [
  mid_altSides, // 0
  mid_randomEven, // 1
  mid_dualFlank, // 2
  mid_hoverRing, // 3
  mid_rainSparse, // 4
  mid_crossLanes, // 5
  mid_hoverElite, // 6
  mid_laserSniper, // 7
  mid_hLaserRain, // 8
  mid_vForm, // 9
  mid_sideStream, // 10
  mid_splitLarge, // 11
  mid_diagCross, // 12
  mid_ringEven, // 13
  mid_zigzag, // 14
  mid_centerSides, // 15
  mid_fixedFan, // 16
  mid_gapWall, // 17
  mid_sideBarrage, // 18
  mid_spiralLite, // 19
  mid_echoSides, // 20
  mid_randomGap, // 21
  mid_dualColor, // 22
  mid_hoverRingDuo, // 23
  mid_rainSniper, // 24
  mid_columnLane, // 25
  mid_eliteFan, // 26
  mid_laserDot, // 27
  mid_wallRain, // 28
  mid_vFormHeavy, // 29
  mid_sideCross, // 30
  mid_splitRing, // 31
  mid_diagReturn, // 32
  mid_ringGap, // 33
  mid_zigzagDual, // 34
  mid_coreSpin, // 35
  mid_fanEcho, // 36
  mid_wallRebuild, // 37
  mid_barrageRing, // 38
  mid_spiralAfter, // 39
  mid_altAfter, // 40
  mid_randomAfter, // 41
  mid_dualAfter, // 42
  mid_hoverRingAfter, // 43
  mid_rainAfter, // 44
  mid_crossAfter, // 45
  mid_hoverEliteAfter, // 46
  mid_laserAfter, // 47
  mid_hLaserAfter, // 48
  mid_vFormAfter, // 49
  mid_sideStreamAfter, // 50
  mid_splitAfter, // 51
  mid_diagAfter, // 52
  mid_ringEvenAfter, // 53
  mid_zigzagAfter, // 54
  mid_centerAfter, // 55
  mid_fanAfter, // 56
  mid_wallAfter, // 57
  mid_barrageAfter, // 58
  mid_spiralFinale, // 59
  mid_sanctuary, // 60
  mid_overwriteEve, // 61
];

export function buildExMid(g, index) {
  MID_PATTERNS[index](g);
}

// re-export pattern fns for any direct import
export {
  mid_altSides,
  mid_randomEven,
  mid_dualFlank,
  mid_hoverRing,
  mid_rainSparse,
  mid_crossLanes,
  mid_hoverElite,
  mid_laserSniper,
  mid_hLaserRain,
  mid_vForm,
  mid_sideStream,
  mid_splitLarge,
  mid_diagCross,
  mid_ringEven,
  mid_zigzag,
  mid_centerSides,
  mid_fixedFan,
  mid_gapWall,
  mid_sideBarrage,
  mid_spiralLite,
  mid_echoSides,
  mid_randomGap,
  mid_dualColor,
  mid_hoverRingDuo,
  mid_rainSniper,
  mid_columnLane,
  mid_eliteFan,
  mid_laserDot,
  mid_wallRain,
  mid_vFormHeavy,
  mid_sideCross,
  mid_splitRing,
  mid_diagReturn,
  mid_ringGap,
  mid_zigzagDual,
  mid_coreSpin,
  mid_fanEcho,
  mid_wallRebuild,
  mid_barrageRing,
  mid_spiralAfter,
  mid_altAfter,
  mid_randomAfter,
  mid_dualAfter,
  mid_hoverRingAfter,
  mid_rainAfter,
  mid_crossAfter,
  mid_hoverEliteAfter,
  mid_laserAfter,
  mid_hLaserAfter,
  mid_vFormAfter,
  mid_sideStreamAfter,
  mid_splitAfter,
  mid_diagAfter,
  mid_ringEvenAfter,
  mid_zigzagAfter,
  mid_centerAfter,
  mid_fanAfter,
  mid_wallAfter,
  mid_barrageAfter,
  mid_spiralFinale,
  mid_sanctuary,
  mid_overwriteEve,
};
