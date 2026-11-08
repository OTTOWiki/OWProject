/**
 * @deprecated 2026-11-08：旧版面背景系统已冻结，待按
 *   docs/background-rebuild-plan.md 重做。保留运行时直到替换完成；
 *   不要在此新增 mode、主题、原子或视觉分支。
 *
 * 伪 3D 前推场景背景 + 阶段转场 + 主题侧景装饰
 * Mode-7 地面 + 侧柱/标线/掠过物/剪影（纯 Canvas 几何）
 * mode 登记 / 贴图路径：js/bgModes.js
 * 主题色表：js/playfieldBgThemes.js
 */
import { LOGICAL_W, LOGICAL_H } from './config.js';
import { PLAYFIELD_BG_TEX, resolveBgMode, getAllBgModes } from './bgModes.js';
import { themeFor } from './playfieldBgThemes.js';
import { drawSilhouette, drawPillar } from './backgrounds/atoms2d.js';

const imgCache = new Map();

function loadTex(path) {
  if (imgCache.has(path)) return imgCache.get(path);
  const img = new Image();
  img.src = path;
  imgCache.set(path, img);
  return img;
}

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** 版面背景 mode id 列表（测试 / 校验章节 bg 用）— 与 bgModes 同源 */
export function getPlayfieldBgModes() {
  return getAllBgModes();
}

export function preloadPlayfieldBg() {
  return Promise.all(Object.values(PLAYFIELD_BG_TEX).map((p) => new Promise((res) => {
    const img = loadTex(p);
    if (img.complete && img.naturalWidth) res(img);
    else {
      img.onload = () => res(img);
      img.onerror = () => res(null);
    }
  })));
}

export class PlayfieldBackground {
  constructor() {
    this.mode = 's1_mid';
    this.prevMode = null;
    this.scrollZ = 0;
    this.speed = 1.1;
    this.horizon = 0.32;
    this.transition = 0;
    this.transitionDur = 1.15;
    this.fogColor = 'rgba(8,10,16,0.55)';

    this._buf = document.createElement('canvas');
    this._buf.width = LOGICAL_W;
    this._buf.height = LOGICAL_H;
    this._bctx = this._buf.getContext('2d');
    this._dirty = true;
    this._accum = 0;
    this._propsCache = new Map();
    this._time = 0;
  }

  setMode(mode, { transition = true } = {}) {
    const next = resolveBgMode(mode);
    if (next === this.mode && !this.prevMode) return;
    if (transition && next !== this.mode) {
      this.prevMode = this.mode;
      this.mode = next;
      this.transition = 1;
      this.scrollZ = 0;
    } else {
      this.mode = next;
      this.prevMode = null;
      this.transition = 0;
    }
    this.speed = next.includes('boss') || next === 'patrol' ? 1.55 : 1.05;
    this._dirty = true;
  }

  _propsFor(mode) {
    if (this._propsCache.has(mode)) return this._propsCache.get(mode);
    const th = themeFor(mode);
    const seed = mode.length * 97 + (mode.charCodeAt(0) || 0) * 13;
    const props = [];
    for (let i = 0; i < 14; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      props.push({
        kind: 'pillar',
        side,
        z: hash(seed + i * 3) * 28 + i * 2.1,
        h: 0.55 + hash(seed + i * 7) * 0.9,
        w: 0.35 + hash(seed + i * 11) * 0.4,
        variant: Math.floor(hash(seed + i * 17) * 4),
      });
    }
    for (let i = 0; i < 10; i++) {
      props.push({
        kind: 'float',
        side: hash(seed + 200 + i) > 0.5 ? 1 : -1,
        z: hash(seed + 210 + i) * 30 + i * 2.8,
        yOff: (hash(seed + 220 + i) - 0.5) * 0.55,
        size: 0.25 + hash(seed + 230 + i) * 0.55,
        variant: Math.floor(hash(seed + 240 + i) * 5),
      });
    }
    for (let i = 0; i < 6; i++) {
      const syms = th.symbols || ['·'];
      props.push({
        kind: 'symbol',
        side: hash(seed + 300 + i) > 0.5 ? 1 : -1,
        z: hash(seed + 310 + i) * 26 + i * 3.5,
        yOff: -0.15 - hash(seed + 320 + i) * 0.45,
        text: syms[i % syms.length],
        size: 0.4 + hash(seed + 330 + i) * 0.4,
      });
    }
    this._propsCache.set(mode, props);
    return props;
  }

  update(dt) {
    this.scrollZ += dt * this.speed * 48;
    this._time += dt;
    if (this.transition > 0) {
      this.transition = Math.max(0, this.transition - dt / this.transitionDur);
      if (this.transition <= 0) this.prevMode = null;
    }
    this._accum += dt;
    if (this._accum >= 1 / 28) {
      this._accum = 0;
      this._dirty = true;
    }
  }

  /** 深度 z(0远→1近) → 屏幕投影 */
  _project(side, zNorm, yOff = 0) {
    const W = LOGICAL_W;
    const H = LOGICAL_H;
    const horizonY = H * this.horizon;
    const groundH = H - horizonY;
    // zNorm 0=地平线, 1=画面底
    const p = Math.max(0.02, Math.min(1, zNorm));
    const y = horizonY + p * groundH * (0.92 + yOff * 0.15);
    const roadW = W * (0.25 + p * p * 1.35);
    const edge = (W - roadW) / 2;
    // 贴路缘外侧一点
    const margin = 8 + p * 28;
    const x = side < 0
      ? edge - margin * p
      : edge + roadW + margin * p;
    const scale = 0.2 + p * p * 2.8;
    return { x, y, scale, p, roadW, edge };
  }

  _drawMode(ctx, mode, alpha, scrollOff = 0) {
    const W = LOGICAL_W;
    const H = LOGICAL_H;
    const th = themeFor(mode);
    const path = PLAYFIELD_BG_TEX[mode] || PLAYFIELD_BG_TEX.s1_mid;
    const tex = loadTex(path);
    const z = this.scrollZ + scrollOff;
    const horizonY = H * this.horizon;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 天空渐变
    const g = ctx.createLinearGradient(0, 0, 0, horizonY + 20);
    g.addColorStop(0, th.sky[0]);
    g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, horizonY + 4);

    // 星尘
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    const seed = mode.length * 17;
    for (let i = 0; i < 28; i++) {
      const sx = ((i * 97 + seed * 13) % W);
      const sy = ((i * 53 + seed) % Math.floor(horizonY * 0.9));
      const tw = 0.5 + ((i + Math.floor(z)) % 3) * 0.4;
      ctx.globalAlpha = alpha * (0.15 + (i % 5) * 0.08);
      ctx.beginPath();
      ctx.arc(sx, sy, tw, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha;

    // 地平线剪影（远景）
    this._drawSilhouette(ctx, mode, th, alpha, horizonY, W);

    // 地平线光带
    const accent = th.accent || 'rgba(255,240,200,0.22)';
    const hg = ctx.createLinearGradient(0, horizonY - 8, 0, horizonY + 12);
    hg.addColorStop(0, 'transparent');
    hg.addColorStop(0.5, accent);
    hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg;
    ctx.fillRect(0, horizonY - 10, W, 24);

    // 顶部主题薄雾
    const topFog = ctx.createLinearGradient(0, 0, 0, horizonY * 0.55);
    topFog.addColorStop(0, accent.replace(/[\d.]+\)$/, '0.12)'));
    topFog.addColorStop(1, 'transparent');
    ctx.fillStyle = topFog;
    ctx.fillRect(0, 0, W, horizonY * 0.55);

    // Mode-7 地面
    const texReady = tex.complete && tex.naturalWidth > 0;
    const tw = texReady ? tex.naturalWidth : 64;
    const thTex = texReady ? tex.naturalHeight : 64;

    for (let y = Math.floor(horizonY); y < H; y += 2) {
      const row = y - horizonY + 1;
      const perspective = row / (H - horizonY);
      const scale = 0.15 + perspective * perspective * 8.5;
      const sampleY = ((z * 0.65 + 1 / (perspective + 0.08) * 18) % thTex + thTex) % thTex;
      const sliceH = Math.max(2, Math.min(6, scale * 0.35));
      const roadW = W * (0.25 + perspective * 1.35);
      const x0 = (W - roadW) / 2;

      if (texReady) {
        ctx.globalAlpha = alpha * (0.35 + perspective * 0.55);
        try {
          const sy = Math.floor(sampleY) % thTex;
          ctx.drawImage(tex, 0, sy, tw, 2, x0 - roadW * 0.05, y, roadW * 1.1, sliceH + 1);
        } catch {
          ctx.fillStyle = th.sky[1];
          ctx.fillRect(x0, y, roadW, 2);
        }
      } else {
        ctx.fillStyle = th.sky[1];
        ctx.globalAlpha = alpha * (0.3 + perspective * 0.4);
        ctx.fillRect(x0, y, roadW, 2);
      }

      if (y % 4 === 0) {
        ctx.globalAlpha = alpha * (0.15 + (1 - perspective) * 0.35);
        ctx.fillStyle = th.sky[0];
        ctx.fillRect(0, y, x0, 4);
        ctx.fillRect(x0 + roadW, y, W - x0 - roadW, 4);
      }
    }

    // 道路中线虚段
    this._drawRoadMarks(ctx, mode, th, alpha, z, horizonY, W, H);

    // 侧景 + 掠过物 + 符号（深度排序：远→近）
    this._drawProps(ctx, mode, th, alpha, z, W, H);

    // 远近雾
    const fog = ctx.createLinearGradient(0, horizonY, 0, H);
    fog.addColorStop(0, 'rgba(0,0,0,0.35)');
    fog.addColorStop(0.35, 'rgba(0,0,0,0.08)');
    fog.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = fog;
    ctx.fillRect(0, horizonY, W, H - horizonY);

    // 主题边雾（压两侧，护中心）
    const sideFog = ctx.createLinearGradient(0, 0, W, 0);
    sideFog.addColorStop(0, accent.replace(/[\d.]+\)$/, '0.2)'));
    sideFog.addColorStop(0.22, 'transparent');
    sideFog.addColorStop(0.78, 'transparent');
    sideFog.addColorStop(1, accent.replace(/[\d.]+\)$/, '0.2)'));
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = sideFog;
    ctx.fillRect(0, 0, W, H);

    // 扫描 / 故障层
    if (th.scan) {
      const scanY = ((this._time * 90) % (H + 40)) - 20;
      ctx.globalAlpha = alpha * 0.12;
      ctx.fillStyle = th.float;
      ctx.fillRect(0, scanY, W, 3);
      ctx.globalAlpha = alpha * 0.04;
      ctx.fillStyle = '#ff00aa';
      ctx.fillRect(2, 0, W, H);
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(-2, 0, W, H);
    }

    // 扫描线
    ctx.globalAlpha = alpha * 0.08;
    ctx.fillStyle = '#000';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

    ctx.restore();
  }

  _drawSilhouette(ctx, mode, th, alpha, horizonY, W) {
    drawSilhouette(ctx, mode, th, alpha, horizonY, W);
  }

  _hex(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  _drawRoadMarks(ctx, mode, th, alpha, z, horizonY, W, H) {
    ctx.save();
    const groundH = H - horizonY;
    for (let i = 0; i < 10; i++) {
      const phase = ((z * 0.08 + i * 3.2) % 28) / 28;
      const p = 0.08 + phase * 0.9;
      const y = horizonY + p * groundH;
      const roadW = W * (0.25 + p * p * 1.35);
      const x0 = (W - roadW) / 2;
      const markH = 2 + p * 10;
      const markW = 3 + p * 8;
      ctx.globalAlpha = alpha * (0.12 + p * 0.25);
      ctx.fillStyle = th.float;
      // 中线
      ctx.fillRect(W / 2 - markW / 2, y, markW, markH);
      // 两侧虚线
      ctx.globalAlpha = alpha * (0.08 + p * 0.15);
      ctx.fillRect(x0 + roadW * 0.12, y, markW * 0.7, markH * 0.7);
      ctx.fillRect(x0 + roadW * 0.88 - markW * 0.7, y, markW * 0.7, markH * 0.7);
    }
    ctx.restore();
  }

  _drawProps(ctx, mode, th, alpha, zScroll, W, H) {
    const props = this._propsFor(mode);
    const drawn = [];

    for (const pr of props) {
      // z 循环 0..32，映射到近远
      let zRaw = (pr.z + zScroll * 0.045) % 32;
      if (zRaw < 0) zRaw += 32;
      // 0 远 1 近
      const zNorm = 1 - zRaw / 32;
      if (zNorm < 0.06 || zNorm > 0.98) continue;
      drawn.push({ pr, zNorm });
    }
    drawn.sort((a, b) => a.zNorm - b.zNorm);

    for (const { pr, zNorm } of drawn) {
      const side = pr.side;
      // s3 split：左用 pillar 右用 pillar2
      let col = th.pillar;
      let col2 = th.pillar2;
      if (th.kind === 'split') {
        col = side < 0 ? '#8a9bb0' : '#ea580c';
        col2 = side < 0 ? '#4a6078' : '#9a3412';
      } else if (th.kind === 'dual') {
        col = side < 0 ? th.pillar : th.pillar2;
        col2 = side < 0 ? th.pillar2 : th.pillar;
      }

      if (pr.kind === 'pillar') {
        const proj = this._project(side, zNorm, 0);
        // 避开中心：若投影过靠中则外推
        const cx = W / 2;
        if (Math.abs(proj.x - cx) < W * 0.18) {
          proj.x = cx + side * W * 0.22 * (0.5 + proj.p);
        }
        const sc = proj.scale * (0.7 + pr.h * 0.5);
        const pw = (4 + pr.w * 10) * sc;
        const ph = (18 + pr.h * 40) * sc;
        const x = proj.x - pw / 2;
        const y = proj.y - ph;
        ctx.globalAlpha = alpha * (0.18 + proj.p * 0.32);
        this._drawPillar(ctx, th.kind, x, y, pw, ph, col, col2, pr.variant, proj.p);
      } else if (pr.kind === 'float') {
        const proj = this._project(side, zNorm, pr.yOff);
        const sc = proj.scale * pr.size;
        const r = (6 + pr.size * 14) * sc;
        // 飘在路缘上方
        const fx = proj.x + side * r * 0.5;
        const fy = proj.y - 20 * proj.p - pr.yOff * 40 * proj.p;
        if (Math.abs(fx - W / 2) < W * 0.14 && proj.p > 0.5) continue;
        ctx.globalAlpha = alpha * (0.15 + proj.p * 0.35);
        this._drawFloat(ctx, th.kind, fx, fy, r, th.float, col, pr.variant, this._time);
      } else if (pr.kind === 'symbol') {
        const proj = this._project(side, zNorm, pr.yOff);
        const fs = Math.max(8, (10 + pr.size * 14) * proj.scale);
        const sx = proj.x + side * 6;
        const sy = proj.y - 30 * proj.p + pr.yOff * 20;
        if (Math.abs(sx - W / 2) < W * 0.16 && proj.p > 0.45) continue;
        ctx.globalAlpha = alpha * (0.12 + proj.p * 0.28);
        ctx.fillStyle = th.float;
        ctx.font = `bold ${fs | 0}px "Microsoft YaHei", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pr.text, sx, sy);
      }
    }
  }

  _drawPillar(ctx, kind, x, y, w, h, col, col2, variant, p) {
    drawPillar(ctx, kind, x, y, w, h, col, col2, variant, p);
  }

  _drawFloat(ctx, kind, x, y, r, floatCol, col, variant, t) {
    ctx.save();
    ctx.fillStyle = floatCol;
    if (kind === 'gear' || kind === 'candy') {
      ctx.strokeStyle = floatCol;
      ctx.lineWidth = Math.max(1, r * 0.2);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (kind === 'hex' || kind === 'crystal') {
      this._hex(ctx, x, y, r);
      ctx.strokeStyle = floatCol;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (kind === 'spike' || kind === 'warn') {
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.7, y + r * 0.5);
      ctx.lineTo(x - r * 0.7, y + r * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'dual' || kind === 'fire') {
      ctx.beginPath();
      ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'obelisk') {
      ctx.fillRect(x - r * 0.4, y - r, r * 0.8, r * 1.6);
    } else if (variant % 2 === 0) {
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * 0.6, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r * 0.6, y);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.globalAlpha *= 0.7;
      ctx.font = `bold ${Math.max(8, r * 1.4) | 0}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(variant % 3 === 0 ? '01' : '#', x, y + Math.sin(t * 2 + x) * 2);
    }
    ctx.restore();
  }

  _renderBuf() {
    const ctx = this._bctx;
    const W = LOGICAL_W;
    const H = LOGICAL_H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#08060e';
    ctx.fillRect(0, 0, W, H);

    if (this.transition > 0 && this.prevMode) {
      const t = this.transition;
      this._drawMode(ctx, this.prevMode, t, 0);
      ctx.save();
      const s = 1 + (1 - t) * 0.08;
      ctx.translate(W / 2, H / 2);
      ctx.scale(s, s);
      ctx.translate(-W / 2, -H / 2);
      this._drawMode(ctx, this.mode, 1 - t, 20);
      ctx.restore();
      ctx.fillStyle = `rgba(255,240,210,${0.18 * Math.sin(t * Math.PI)})`;
      ctx.fillRect(0, 0, W, H);
    } else {
      this._drawMode(ctx, this.mode, 1, 0);
    }
  }

  draw(ctx) {
    if (this._dirty) {
      this._renderBuf();
      this._dirty = false;
    }
    ctx.drawImage(this._buf, 0, 0);

    const W = LOGICAL_W;
    const H = LOGICAL_H;
    const vg = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.15, W / 2, H * 0.5, H * 0.75);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
}

export function getPlayfieldBgPaths() {
  return [...new Set(Object.values(PLAYFIELD_BG_TEX))];
}
