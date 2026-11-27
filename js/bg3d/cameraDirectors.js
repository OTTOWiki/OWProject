/**
 * 关卡镜头导演（per-mode camera directors）——每一关一套独立的镜头语言。
 *
 * 设计原则（用户 2026-11-22 定稿）：
 * - 镜头服务于叙事：告诉玩家「主角正在前往某处」，而不是展示场景在动；
 * - **每关单独设计**：不共用一套模板，变速 / 转向 / 升降 / 横移 / 环绕 / 停顿 / 倾斜（dutch）/ 步进（stutter）
 *   按各关剧情与场景气质自由组合，不一味全塞；
 * - 所有导演都是确定性函数（只依赖章节内时间，不消费玩法随机流）。
 *
 * 契约：`sample({ u, t, boss, stage, palette }) => { x, y, z, lookX, lookY, fov, roll, gain, lookZ }`
 *   - u: 本章进度 0..1（按 director.duration 归一，超过 1 后保持抵达状态）
 *   - t: 本章经过秒数
 *   - z: 相机相对出发点的前进偏移（负数=向场景内）
 *   - x/y: 相机世界坐标；lookX/lookY/lookZ: 视线目标（lookZ 为视线目标相对相机的 z 偏移，默认 -18）
 *   - fov: 垂直视场角；roll: 相机 roll（弧度）；gain: 世界逼近速度倍率（叙事速度）
 *
 * 对应 stage 列表见 js/bg3d/scenes/index.js；mode 为 `<stage>_mid` / `<stage>_boss`（patrol 单 mode）。
 */

const D2R = Math.PI / 180;

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function easeInOut(u) {
  const x = clamp01(u);
  return x * x * (3 - 2 * x);
}

function easeOutCubic(u) {
  const x = clamp01(u);
  return 1 - Math.pow(1 - x, 3);
}

function easeInCubic(u) {
  const x = clamp01(u);
  return x * x * x;
}

/** 0..1 内平滑（用于软步进） */
function smooth01(x) {
  const v = clamp01(x);
  return v * v * (3 - 2 * v);
}

/** 中间隆起的钟形（0→1→0），width 为半宽比例 */
function bell(u, center, width) {
  const x = (u - center) / Math.max(1e-4, width);
  return Math.exp(-x * x * 2.2);
}

/** 分段平滑插值：keys = [[u, v], ...] */
function seg(u, keys) {
  if (!keys.length) return 0;
  const x = clamp01(u);
  if (x <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (x <= keys[i][0]) {
      const [u0, v0] = keys[i - 1];
      const [u1, v1] = keys[i];
      const k = (x - u0) / Math.max(1e-4, u1 - u0);
      return v0 + (v1 - v0) * (k * k * (3 - 2 * k));
    }
  }
  return keys[keys.length - 1][1];
}

/** 阶跃脉冲：u 落在 [a,b] 内为 1，边缘平滑 */
function window01(u, a, b, soft = 0.06) {
  const x = clamp01(u);
  const inA = clamp01((x - a) / soft);
  const inB = clamp01((b - x) / soft);
  return Math.min(inA, inB);
}

/** 叙事速度：正弦钟形（出发慢→赶路快→抵达收住），u≥1 后趋近 0.12 */
function travelSpeed(u, floor = 0.12) {
  const x = clamp01(u);
  return floor + (1 - floor) * Math.sin(Math.PI * x);
}

/** 相机基准高度 */
const BASE_Y = 1.4;
const BASE_LOOK_Y = 1.3;

// ===========================================================================
// 每关镜头导演
// ===========================================================================

const DIRECTORS = {
  // -------------------------------------------------------------------------
  // s1 零散草稿：慢出发，沿鸟居回廊逐步加速，到巨月前收住、抬头
  // -------------------------------------------------------------------------
  s1_mid: {
    dur: 30,
    sample({ u, t }) {
      const p = seg(u, [[0, 0], [0.18, 0.06], [0.5, 0.42], [0.8, 0.86], [1, 1]]);
      const speed = travelSpeed(u);
      return {
        x: Math.sin(t * 0.16) * 0.3 + seg(u, [[0, 0], [1, 1.2]]),
        y: BASE_Y - 0.26 * easeInOut(u) + Math.sin(t * 0.14) * 0.05,
        z: -16 * p,
        lookX: seg(u, [[0, 0], [1, 3.2]]),
        lookY: BASE_LOOK_Y + 1.1 * easeOutCubic(u),
        fov: 56 - 3.6 * easeInOut(u),
        roll: Math.sin(t * 0.1) * 0.004,
        gain: 0.3 + 1.6 * speed,
      };
    },
  },
  s1_boss: {
    dur: 20,
    sample({ u, t }) {
      // 起手后退半步 → 加速冲刺 → 赤月齿轮前急停
      const p = seg(u, [[0, 0], [0.12, -0.04], [0.55, 0.5], [0.82, 0.94], [1, 1]]);
      const speed = u < 0.55 ? 0.5 + u : 0.4;
      return {
        x: Math.sin(t * 0.22) * 0.35 + Math.sin(t * 0.7) * 0.08,
        y: BASE_Y - 0.32 * easeInOut(u),
        z: -22 * p,
        lookX: 0.8 * Math.sin(t * 0.3) - 1.6 * bell(u, 0.7, 0.3),
        lookY: BASE_LOOK_Y + 2.0 * easeOutCubic(u),
        fov: 58 - 8.0 * easeInOut(u),
        roll: Math.sin(t * 0.62) * 0.014 * (0.4 + 0.6 * easeInOut(u)),
        gain: 0.35 + 1.9 * speed,
      };
    },
  },

  // -------------------------------------------------------------------------
  // s2 审核圣殿：机位偏高，被「扫描」式步进推进；视线在悬浮巨眼间缓慢巡检
  // -------------------------------------------------------------------------
  s2_mid: {
    dur: 32,
    sample({ u, t }) {
      const p = seg(u, [[0, 0], [0.16, 0.05], [0.4, 0.28], [0.62, 0.34], [0.8, 0.7], [1, 0.92]]);
      const scan = Math.sin(t * 0.33) * 4.8;
      return {
        x: Math.sin(t * 0.11) * 0.28,
        y: 1.62 - 0.4 * easeInOut(u),
        z: -13 * p,
        lookX: scan,
        lookY: 2.1 + 0.5 * Math.sin(t * 0.22),
        fov: 57 - 3.4 * easeInOut(u) - 1.4 * bell(u, 0.55, 0.18),
        roll: -0.008 + Math.sin(t * 0.2) * 0.002,
        gain: 0.28 + 1.1 * easeInOut(u) + 0.5 * bell(u, 0.55, 0.2),
      };
    },
  },
  s2_boss: {
    dur: 22,
    sample({ u, t }) {
      // 巨眼睁开：左右快速扫视 + 两次「审查」急停
      const p = seg(u, [[0, 0], [0.2, 0.06], [0.45, 0.44], [0.58, 0.46], [0.78, 0.8], [1, 0.95]]);
      const scan = Math.tanh(Math.sin(t * 0.85) * 3) * 6.4;
      return {
        x: Math.sin(t * 0.17) * 0.22,
        y: 1.55 - 0.42 * easeInOut(u),
        z: -16 * p,
        lookX: scan,
        lookY: 2.3 + 0.7 * easeOutCubic(u),
        fov: 58 - 8 * easeInOut(u) + 1.2 * Math.sin(t * 0.7),
        roll: Math.sin(t * 0.5) * 0.01,
        gain: 0.3 + 1.5 * travelSpeed(u) + 0.4 * Math.abs(Math.sin(t * 0.85)),
      };
    },
  },

  // -------------------------------------------------------------------------
  // s3 分歧十字路口：抵达路口后左看 A 门、右看 B 门、收回中心；boss 加速冲门
  // -------------------------------------------------------------------------
  s3_mid: {
    dur: 30,
    sample({ u, t }) {
      const p = seg(u, [[0, 0], [0.2, 0.12], [0.45, 0.55], [0.62, 0.68], [0.8, 0.84], [1, 0.95]]);
      const panU = clamp01((u - 0.3) / 0.5);
      const pan = Math.sin(Math.PI * 2 * panU);
      const settle = window01(u, 0.82, 1.0, 0.1);
      const amp = 1 - settle * 0.6;
      const pause = 0.14 * Math.abs(pan) * amp;
      return {
        x: Math.sin(t * 0.13) * 0.25 + pan * 4.2 * amp,
        y: BASE_Y - 0.2 * easeInOut(u) + 0.12 * Math.abs(pan) * amp,
        z: -14 * (p - pause),
        lookX: pan * 7.4 * amp,
        lookY: BASE_LOOK_Y + 0.7 * Math.abs(pan) * amp + 0.9 * easeOutCubic(u),
        fov: 56 - 4 * easeInOut(u) - 1.5 * Math.abs(pan) * amp,
        roll: Math.sin(t * 0.14) * 0.004 + pan * 0.004,
        gain: 0.32 + 1.4 * travelSpeed(u) * (1 - 0.4 * Math.abs(pan)),
      };
    },
  },
  s3_boss: {
    dur: 16,
    sample({ u, t }) {
      const p = seg(u, [[0, 0], [0.2, 0.16], [0.55, 0.62], [0.8, 0.93], [1, 1]]);
      return {
        x: Math.sin(t * 0.4) * 0.2,
        y: BASE_Y - 0.35 * easeInOut(u),
        z: -22 * p,
        lookX: 0,
        lookY: BASE_LOOK_Y + 1.8 * easeOutCubic(u),
        fov: 60 - 5.6 * easeInOut(u),
        roll: Math.sin(t * 23) * 0.006 * travelSpeed(u),
        gain: 0.4 + 2.0 * travelSpeed(u),
      };
    },
  },

  // -------------------------------------------------------------------------
  // patrol 404 巡查：探照灯式扫视 + 突然转向盯住 404 幢幡 + 雨夜步进推进
  // -------------------------------------------------------------------------
  patrol: {
    dur: 30,
    sample({ u, t }) {
      const p = seg(u, [[0, 0], [0.1, 0], [0.25, 0.16], [0.5, 0.36], [0.58, 0.37], [0.75, 0.62], [1, 0.88]]);
      const sweep = Math.sin(t * 0.42) * 7.2;
      const snapR = window01(u, 0.33, 0.44) * 4.0;
      const snapL = window01(u, 0.66, 0.78) * -5.0;
      return {
        x: Math.sin(t * 0.12) * 0.3,
        y: 1.52 - 0.14 * easeInOut(u) + Math.sin(t * 0.19) * 0.05,
        z: -12 * p,
        lookX: sweep + snapR + snapL,
        lookY: 2.0 + 0.6 * window01(u, 0.33, 0.78) + 0.5 * easeOutCubic(u),
        fov: 56 - 1.6 * easeInOut(u) + 0.8 * Math.sin(t * 0.6),
        roll: Math.sin(t * 0.27) * 0.009,
        gain: 0.3 + 1.2 * easeInOut(u) + 0.5 * Math.abs(snapR) / 4,
      };
    },
  },

  // -------------------------------------------------------------------------
  // a4 金箔集市：像逛市集一样横移、走走停停，视线左右扫过摊位与广告
  // -------------------------------------------------------------------------
  a4_mid: {
    dur: 32,
    sample({ u, t }) {
      const p = seg(u, [[0, 0], [0.15, 0.06], [0.38, 0.3], [0.46, 0.32], [0.7, 0.62], [0.78, 0.64], [1, 0.92]]);
      const strafe = -3.6 + 7.2 * easeInOut(u) + Math.sin(t * 0.3) * 0.35;
      return {
        x: strafe,
        y: 1.34 - 0.1 * easeInOut(u) + 0.04 * Math.sin(t * 0.5),
        z: -14 * p,
        lookX: -strafe * 0.72,
        lookY: BASE_LOOK_Y + 0.4,
        fov: 56 - 3 * easeInOut(u),
        roll: Math.sin(t * 0.24) * 0.006,
        gain: 0.32 + 1.3 * travelSpeed(u),
      };
    },
  },
  a4_boss: {
    dur: 22,
    sample({ u, t }) {
      // 拍卖高潮：快速直冲 + 视线甩向两侧悬浮价签/VIP 金匾
      const p = seg(u, [[0, 0], [0.15, 0.1], [0.42, 0.38], [0.55, 0.55], [0.8, 0.86], [1, 1]]);
      const snap = Math.tanh(Math.sin(t * 0.8) * 2.5) * 5.4;
      return {
        x: Math.sin(t * 0.4) * 0.5,
        y: BASE_Y - 0.12 * easeInOut(u),
        z: -18 * p,
        lookX: snap * (1 - easeOutCubic(u) * 0.35),
        lookY: BASE_LOOK_Y + 1.5 * easeOutCubic(u),
        fov: 57 - 6.5 * easeInOut(u) + 1.2 * Math.abs(Math.sin(t * 0.8)),
        roll: Math.sin(t * 0.5) * 0.008,
        gain: 0.4 + 1.8 * travelSpeed(u),
      };
    },
  },

  // -------------------------------------------------------------------------
  // a5 镜像署名：左右对称的浮岛间缓慢摇移，像在两座神殿之间来回看
  // -------------------------------------------------------------------------
  a5_mid: {
    dur: 32,
    sample({ u, t }) {
      const p = seg(u, [[0, 0], [0.2, 0.1], [0.5, 0.45], [0.8, 0.82], [1, 0.95]]);
      const sway = Math.sin(t * 0.22);
      return {
        x: sway * 3.4,
        y: BASE_Y + 0.3 * bell(u, 0.5, 0.4) - 0.1 * easeInOut(u),
        z: -12 * p,
        lookX: -sway * 6.4,
        lookY: BASE_LOOK_Y + 1.2 * bell(u, 0.5, 0.45) + 0.4,
        fov: 57 - 4 * easeInOut(u),
        roll: Math.sin(t * 0.22) * 0.006,
        gain: 0.28 + 1.2 * travelSpeed(u),
      };
    },
  },
  a5_boss: {
    dur: 24,
    sample({ u, t }) {
      // 镜面碎裂：对称环绕加快，末段视线对撞并轻微后拉
      const p = seg(u, [[0, 0], [0.2, 0.12], [0.5, 0.48], [0.8, 0.88], [1, 1]]);
      const sway = Math.sin(t * 0.4);
      return {
        x: sway * 4.8,
        y: BASE_Y + 0.5 * bell(u, 0.55, 0.35) - 0.15,
        z: -16 * p + 1.4 * window01(u, 0.85, 1) * (1 - easeOutCubic(u)),
        lookX: -sway * 7.6,
        lookY: BASE_LOOK_Y + 1.6 * bell(u, 0.55, 0.4),
        fov: 58 - 3.4 * easeInOut(u) - 2.2 * window01(u, 0.7, 0.95),
        roll: Math.sin(t * 0.4) * 0.012,
        gain: 0.32 + 1.6 * travelSpeed(u),
      };
    },
  },

  // -------------------------------------------------------------------------
  // a6 崩坏乐园：像颠簸的游乐园矿车——扬起看摩天轮、俯冲、左右摇晃
  // -------------------------------------------------------------------------
  a6_mid: {
    dur: 28,
    sample({ u, t }) {
      const p = seg(u, [[0, 0], [0.12, 0.06], [0.3, 0.2], [0.52, 0.5], [0.7, 0.68], [1, 0.94]]);
      const swoop = bell(u, 0.46, 0.3);
      return {
        x: Math.sin(t * 0.5) * 0.9,
        y: BASE_Y + 2.3 * swoop - 0.4 * easeInOut(u) + Math.sin(t * 0.8) * 0.06,
        z: -14 * p,
        lookX: -Math.sin(t * 0.5) * 2.4,
        lookY: BASE_LOOK_Y + 2.4 * swoop,
        fov: 56 - 3 * easeInOut(u) + 1.5 * swoop,
        roll: Math.sin(t * 0.7) * 0.02,
        gain: 0.3 + 1.5 * travelSpeed(u) + 0.3 * Math.abs(Math.sin(t * 0.8)),
      };
    },
  },
  a6_boss: {
    dur: 20,
    sample({ u, t }) {
      // 设施失控：快速颠簸 + 两次下坠 + 车体倾斜
      const p = seg(u, [[0, 0], [0.15, 0.12], [0.35, 0.34], [0.5, 0.46], [0.72, 0.76], [1, 0.98]]);
      const drop = window01(u, 0.3, 0.42) + window01(u, 0.62, 0.74);
      return {
        x: Math.sin(t * 1.1) * 1.5,
        y: BASE_Y - 0.7 * drop + 0.6 * bell(u, 0.5, 0.2) + Math.sin(t * 1.4) * 0.08,
        z: -18 * p,
        lookX: Math.sin(t * 1.1) * 3.4,
        lookY: BASE_LOOK_Y + 1.2 * easeOutCubic(u) + 0.8 * drop,
        fov: 56 + 3 * drop - 3 * easeInOut(u),
        roll: Math.sin(t * 1.2) * 0.035,
        gain: 0.35 + 1.7 * travelSpeed(u) + 0.6 * drop,
      };
    },
  },

  // -------------------------------------------------------------------------
  // b4 血色巨轮隧道：低机位、车身侧倾，随巨轮转动加速/刹车
  // -------------------------------------------------------------------------
  b4_mid: {
    dur: 30,
    sample({ u, t }) {
      const p = seg(u, [[0, 0], [0.12, 0.05], [0.4, 0.34], [0.5, 0.42], [0.68, 0.72], [0.78, 0.76], [1, 0.94]]);
      const accel = travelSpeed(u);
      return {
        x: Math.sin(t * 0.33) * 0.5,
        y: 1.18 - 0.1 * easeInOut(u) + Math.sin(t * 0.5) * 0.05,
        z: -20 * p,
        lookX: Math.sin(t * 0.33) * 1.4,
        lookY: 0.9 + 0.6 * easeOutCubic(u),
        fov: 57 - 5.5 * easeInOut(u),
        roll: Math.sin(t * 0.9) * 0.028,
        gain: 0.35 + 1.9 * accel,
      };
    },
  },
  b4_boss: {
    dur: 20,
    sample({ u, t }) {
      // 双轮对转：镜头在两侧巨轮之间穿插，车身大幅侧倾
      const p = seg(u, [[0, 0], [0.18, 0.16], [0.45, 0.5], [0.7, 0.84], [1, 1]]);
      return {
        x: Math.sin(t * 0.85) * 2.6,
        y: 1.2 - 0.15 * easeInOut(u),
        z: -24 * p,
        lookX: Math.sin(t * 0.85) * 3.2,
        lookY: 1.0 + 1.2 * easeOutCubic(u),
        fov: 58 - 7 * easeInOut(u),
        roll: Math.sin(t * 0.85) * 0.05,
        gain: 0.4 + 2.1 * travelSpeed(u),
      };
    },
  },

  // -------------------------------------------------------------------------
  // b5 霓虹雨巷：沿巷跟踪，在巷口「转角」转头看霓虹，终段仰拍大招牌
  // -------------------------------------------------------------------------
  b5_mid: {
    dur: 32,
    sample({ u, t }) {
      const p = seg(u, [[0, 0], [0.2, 0.1], [0.45, 0.44], [0.6, 0.6], [0.82, 0.86], [1, 0.96]]);
      const cornerR = window01(u, 0.3, 0.42) * 5.6;
      const cornerL = window01(u, 0.6, 0.72) * -6.2;
      return {
        x: 1.1 * Math.sin(t * 0.22) + 0.4,
        y: BASE_Y + 0.06 * Math.sin(t * 0.4),
        z: -15 * p,
        lookX: cornerR + cornerL + Math.sin(t * 0.18) * 1.2,
        lookY: BASE_LOOK_Y + 0.5 + 0.9 * (window01(u, 0.3, 0.72)),
        fov: 55 - 2.4 * easeInOut(u),
        roll: 0.012 + Math.sin(t * 0.2) * 0.004,
        gain: 0.34 + 1.25 * travelSpeed(u),
      };
    },
  },
  b5_boss: {
    dur: 24,
    sample({ u, t }) {
      // 世界第一等大招牌：终段仰头，霓虹故障式 FOV 跳动
      const p = seg(u, [[0, 0], [0.15, 0.1], [0.45, 0.46], [0.7, 0.78], [1, 0.98]]);
      const up = easeInOut((u - 0.5) / 0.5);
      const flicker = Math.sin(t * 3.1) > 0.92 ? 1.4 : 0;
      return {
        x: Math.sin(t * 0.3) * 0.8,
        y: BASE_Y - 0.2 * up,
        z: -18 * p,
        lookX: 1.6 * Math.sin(t * 0.25),
        lookY: BASE_LOOK_Y + 3.6 * clamp01(up),
        fov: 57 - 4.5 * easeInOut(u) + flicker,
        roll: Math.sin(t * 0.4) * 0.01,
        gain: 0.36 + 1.7 * travelSpeed(u),
      };
    },
  },

  // -------------------------------------------------------------------------
  // b6 毒雾王座：觐见式缓慢升高 + 仰望王座；boss 绕王座缓慢环绕
  // -------------------------------------------------------------------------
  b6_mid: {
    dur: 34,
    sample({ u, t }) {
      // 仪式感：推进极缓、机位持续升高、视线抬向王座与宝瓶
      const p = seg(u, [[0, 0], [0.3, 0.12], [0.6, 0.4], [1, 0.82]]);
      const rise = easeInOut(u);
      return {
        x: Math.sin(t * 0.1) * 0.2,
        y: 1.15 + 1.15 * rise,
        z: -12 * p,
        lookX: 0.4 * Math.sin(t * 0.12),
        lookY: BASE_LOOK_Y + 3.4 * rise,
        fov: 56 - 5 * rise,
        roll: Math.sin(t * 0.09) * 0.003,
        gain: 0.2 + 0.9 * travelSpeed(u),
      };
    },
  },
  b6_boss: {
    dur: 24,
    sample({ u, t }) {
      // 绕王座半圈：先推进，再环绕，最后停在正对宝瓶的角度
      const adv = seg(u, [[0, 0], [0.5, 0.8], [1, 1]]);
      const ang = (u - 0.35) * Math.PI * 0.9;
      const orbitR = 3.2 * clamp01((u - 0.35) / 0.65);
      return {
        x: Math.sin(ang) * orbitR,
        y: BASE_Y + 0.9 * easeInOut(u),
        z: -16 * adv - Math.cos(ang) * orbitR * 0.3,
        lookX: 0,
        lookY: BASE_LOOK_Y + 3.2 * easeInOut(u),
        fov: 58 - 6 * easeInOut(u),
        roll: Math.sin(ang) * 0.012,
        gain: 0.3 + 1.2 * travelSpeed(u),
      };
    },
  },

  // -------------------------------------------------------------------------
  // ex 键政覆写：数字故障感——步进推进、视线 90° 甩头、roll 抽搐
  // -------------------------------------------------------------------------
  ex_mid: {
    dur: 28,
    sample({ u, t }) {
      // 数据故障感：软步进推进 + 连续 tanh 甩头 + 平滑故障包络；
      // 禁止 Math.sign/二值跳变（否则在 60/120fps 下会视觉“抽搐”）
      const su = clamp01(u) * 9;
      const stepEase = (Math.floor(su) + smooth01(su - Math.floor(su))) / 9;
      const moved = 0.84 * easeInOut(u) + 0.16 * stepEase;
      const scan = Math.tanh(Math.sin(t * 0.55) * 1.8) * 4.0;
      const glitch = Math.pow(Math.max(0, Math.sin(t * 1.7 + 0.6)), 8);
      return {
        x: Math.sin(t * 0.5) * 0.35,
        y: BASE_Y - 0.1 * easeInOut(u) + glitch * 0.018,
        z: -16 * moved,
        lookX: scan + Math.sin(t * 9) * 0.25 * glitch,
        lookY: BASE_LOOK_Y + 1.2 * easeOutCubic(u),
        fov: 57 - 4.5 * easeInOut(u) + glitch * 1.0,
        roll: Math.sin(t * 0.4) * 0.003 + glitch * 0.012,
        gain: 0.3 + 1.4 * travelSpeed(u) + glitch * 0.35,
      };
    },
  },
  ex_boss: {
    dur: 18,
    sample({ u, t }) {
      // 覆写终局：高速冲刺 + 连续甩头 + 平滑故障抖动（同样避免二值跳变）
      const p = seg(u, [[0, 0], [0.15, 0.18], [0.4, 0.5], [0.62, 0.8], [0.85, 0.97], [1, 1]]);
      const scan = Math.tanh(Math.sin(t * 0.9) * 1.6) * 5.2 * (1 - 0.25 * easeInOut(u));
      const glitch = Math.pow(Math.max(0, Math.sin(t * 2.3 + 0.4)), 8);
      return {
        x: Math.sin(t * 1.2) * 1.2,
        y: BASE_Y - 0.2 * easeInOut(u) + glitch * 0.02,
        z: -22 * p,
        lookX: scan + Math.sin(t * 11) * 0.3 * glitch,
        lookY: BASE_LOOK_Y + 1.8 * easeOutCubic(u),
        fov: 59 - 8 * easeInOut(u) + glitch * 1.2,
        roll: Math.sin(t * 0.8) * 0.012 + glitch * 0.014,
        gain: 0.4 + 2.1 * travelSpeed(u) + glitch * 0.5,
      };
    },
  },
};

/** 兜底导演（未登记 mode 时仍能工作，保持向前旅程感） */
const DEFAULT_DIRECTOR = {
  dur: 28,
  sample({ u, t }) {
    const p = easeInOut(u);
    return {
      x: Math.sin(t * 0.17) * 0.3,
      y: BASE_Y - 0.2 * p,
      z: -16 * p,
      lookX: 0,
      lookY: BASE_LOOK_Y + 0.8 * p,
      fov: 56 - 3 * p,
      roll: Math.sin(t * 0.1) * 0.003,
      gain: 0.3 + 1.4 * travelSpeed(u),
    };
  },
};

/**
 * 取某 mode 的镜头导演。
 * @param {string} mode
 * @param {string} [stage]
 */
export function makeCameraDirector(mode, stage) {
  const d = DIRECTORS[mode] || (stage ? DIRECTORS[stage] : null) || DEFAULT_DIRECTOR;
  // 导演契约：u 超过 1 后必须保持抵达状态（用 t 做持续轻摆），在模块边界统一 clamp，
  // 避免各导演各自漏 clamp 造成相机无限前飞。
  return {
    dur: d.dur,
    sample(args = {}) {
      return d.sample({ ...args, u: clamp01(args.u ?? 0) });
    },
  };
}

/** 供测试/调试：全部已登记导演的 mode 列表 */
export function cameraDirectorModes() {
  return Object.keys(DIRECTORS);
}

/** 供测试/调试：杜绝所有关卡共用同一导演实现 */
export function cameraDirectorSource(mode) {
  return DIRECTORS[mode] ? DIRECTORS[mode].sample.toString() : null;
}
