/**
 * 每面难度指标（率量 + 反应时间窗口），分析工具
 * 用 7200 帧样本以得到稳定的分位数。
 */
import { readFileSync } from 'node:fs';
import { BALANCE, LOGICAL_H } from '../js/config.js';

const H = LOGICAL_H;
const D_APPROACH = H * 0.75;      // 估计量：自机中心到敌机典型纵向距离
const D_APPROACH_FAST = H * 0.55; // 近身弹：更短的接近距离

const q = (a, p) => a.length ? a[Math.min(a.length - 1, Math.max(0, Math.round(p * (a.length - 1))))] : 0;

function face(chs) {
  const shots = chs.flatMap((c) => c.shots);
  const sp = shots.map((s) => s.speed).filter((v) => v > 0).sort((a, b) => a - b);
  const fps = chs[0]?.frames ?? 7200;
  const sec = fps / 60;
  const bps = shots.length / sec;
  const norm = sp.map((v) => (v * 60) / H);          // 屏高/秒
  const cross = sp.map((v) => H / (v * 60));          // 越屏秒数
  const react = sp.map((v) => D_APPROACH / (v * 60));
  const reactFast = sp.map((v) => D_APPROACH_FAST / (v * 60));
  const radii = shots.map((s) => s.r);
  // 最近弹的越屏时间（难度上界）：用 95 分位速度
  const v95 = q(sp, 0.95);
  return {
    章: chs.length,
    出怪每秒: (chs.reduce((a, c) => a + c.spawned.length, 0) / sec).toFixed(2),
    弹每秒: bps.toFixed(1),
    速中位: q(sp, 0.5).toFixed(2),
    速P95: v95.toFixed(2),
    屏高每秒中位: q(norm, 0.5).toFixed(3),
    越屏秒中位: q(cross, 0.5).toFixed(2),
    反应窗中位: q(react, 0.5).toFixed(2),
    反应窗P95速: (D_APPROACH / (v95 * 60)).toFixed(2),
    近身反应: q(reactFast, 0.5).toFixed(2),
    半径中位: q(radii, 0.5).toFixed(1),
    判定占屏: ((q(radii, 0.5) / H) * 100).toFixed(3),
  };
}

const raw = JSON.parse(readFileSync(new URL('./face-capture-7200.json', import.meta.url), 'utf8'));
const byFace = new Map();
for (const c of raw) { const k = String(c.stageKey); if (!byFace.has(k)) byFace.set(k, []); byFace.get(k).push(c); }
const rows = [...byFace].map(([k, v]) => [k, face(v)]);
const cols = Object.keys(rows[0][1]);
const w = (s, n) => String(s).padStart(n);
console.log('=== 我方每面难度指标（7200 帧 = 120s 样本）===');
console.log(w('面', 8) + ' ' + cols.map((c) => w(c, 11)).join(' '));
for (const [k, m] of rows) console.log(w(k, 8) + ' ' + cols.map((c) => w(m[c], 11)).join(' '));
