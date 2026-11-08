/**
 * 背景时间轴缓动（P3，TH20 `ecl_vm/math.cpp` 的 32 条 easing）。
 *
 * 运行时不 import；供背景 Scene2D/timeline 的实现与测试使用。
 * mode 15/16 为常量 0/1；0/7/8/17 在 easing 内退化为线性，
 * 7/17/8 的累积/Hermite 语义由 Interpolator 处理。
 */

const PI = Math.PI;

/** TH20 shifted_quadratic：t=0→0，t=1→1，k 控制弯曲位置 */
function shiftedQuadratic(t, k) {
  const denom = (1 - k) * (1 - k);
  const offset = (k * k) / denom;
  return (((t - k) * (t - k)) / denom - offset) / (1 - offset);
}

/**
 * @param {number} mode 0..31
 * @param {number} time 已播放时长
 * @param {number} duration 总时长；0 直接返回 1
 * @returns {number}
 */
export function ease(mode, time, duration) {
  if (!(duration > 0)) return 1;
  let t = time / duration;
  if (mode >= 1 && mode <= 3) return Math.pow(t, mode + 1);
  if (mode >= 4 && mode <= 6) return 1 - Math.pow(1 - t, mode - 2);
  if (mode >= 9 && mode <= 11) {
    t *= 2;
    const n = mode - 7;
    return t >= 1 ? (2 - Math.pow(2 - t, n)) / 2 : Math.pow(t, n) / 2;
  }
  if (mode >= 12 && mode <= 14) {
    t *= 2;
    const n = mode - 10;
    return t >= 1
      ? Math.pow(t - 1, n) / 2 + 0.5
      : 0.5 - Math.pow(1 - t, n) / 2;
  }
  switch (mode) {
    case 15: return 0;
    case 16: return 1;
    case 18: return Math.sin((t * PI) / 2);
    case 19: return 1 - Math.sin((t * PI) / 2 + PI / 2);
    case 20:
      t *= 2;
      return t >= 1
        ? (1 - Math.sin((t * PI) / 2)) / 2 + 0.5
        : Math.sin((t * PI) / 2) / 2;
    case 21:
      t *= 2;
      return t >= 1
        ? Math.sin(((t - 1) * PI) / 2) / 2 + 0.5
        : (1 - Math.sin((t * PI) / 2 + PI / 2)) / 2;
    default: break;
  }
  const offsets = [0.25, 0.3, 0.35, 0.38, 0.4];
  if (mode >= 22 && mode <= 26) return shiftedQuadratic(t, offsets[mode - 22]);
  if (mode >= 27 && mode <= 31) return 1 - shiftedQuadratic(1 - t, offsets[mode - 27]);
  return t;
}

/**
 * 时间轴插值器（TH20 `Interpolator::sample` 的可读移植）。
 * duration 为秒；mode 7 累加 end、17 累加 tangentEnd、8 为 Hermite。
 */
export class Interpolation {
  constructor({
    mode = 0, start = 0, end = 1,
    tangentStart = 0, tangentEnd = 0, duration = 1,
  } = {}) {
    this.mode = mode;
    this.start = start;
    this.end = end;
    this.tangentStart = tangentStart;
    this.tangentEnd = tangentEnd;
    this.current = start;
    this.duration = Math.max(0, Number(duration) || 0);
    this.elapsed = 0;
    this.done = false;
  }

  reset({ start = this.start, end = this.end, duration = this.duration } = {}) {
    this.start = start;
    this.end = end;
    this.duration = Math.max(0, Number(duration) || 0);
    this.elapsed = 0;
    this.current = start;
    this.done = false;
    return this;
  }

  /** @param {number} dt 秒 */
  sample(dt = 1 / 60) {
    if (this.done) return this.current;
    this.elapsed += dt;
    if (this.duration <= 0 || this.elapsed >= this.duration) {
      this.elapsed = this.duration;
      this.done = true;
      this.current = (this.mode === 7 || this.mode === 17) ? this.start : this.end;
      return this.current;
    }
    if (this.mode === 7) {
      this.start += this.end;
      this.current = this.start;
    } else if (this.mode === 17) {
      this.start += this.tangentEnd;
      this.tangentEnd += this.end;
      this.current = this.start;
    } else if (this.mode === 8) {
      const t = this.elapsed / this.duration;
      const term0 = this.start * ((t - 1) * (t - 1)) * (2 * t + 1);
      const term1 = this.end * (t * t) * (3 - 2 * t);
      const term2 = this.tangentStart * ((1 - t) * (1 - t)) * t;
      const term3 = this.tangentEnd * ((t - 1) * t) * t;
      this.current = term0 + term1 + term2 + term3;
    } else {
      this.current = (this.end - this.start) * ease(this.mode, this.elapsed, this.duration) + this.start;
    }
    return this.current;
  }
}
