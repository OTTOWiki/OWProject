/**
 * 伪 3D 前推场景背景 + 阶段转场 + 主题侧景装饰
 * Mode-7 地面 + 侧柱/标线/掠过物/剪影（纯 Canvas 几何）
 * mode 登记 / 贴图路径：js/bgModes.js
 */
import { LOGICAL_W, LOGICAL_H } from './config.js';
import { PLAYFIELD_BG_TEX, resolveBgMode, getAllBgModes } from './bgModes.js';

const SKY = {
  s1_mid: ['#06140e', '#0f2e20'],
  s1_boss: ['#1c0814', '#4a1a38'],
  s2_mid: ['#040c18', '#0a2440'],
  s2_boss: ['#020814', '#0c3858'],
  s3_mid: ['#0e0a08', '#2a2018'],
  s3_boss: ['#1c1206', '#5a3810'],
  patrol: ['#120004', '#480810'],
  a4_mid: ['#1c1608', '#4a3a0c'],
  a4_boss: ['#2e0606', '#5c1414'],
  a5_mid: ['#080a16', '#182050'],
  a5_boss: ['#16081c', '#481850'],
  a6_mid: ['#16081c', '#481438'],
  a6_boss: ['#1e0014', '#500830'],
  b4_mid: ['#160808', '#481018'],
  b4_boss: ['#1c0404', '#581018'],
  b5_mid: ['#0a0812', '#2a1824'],
  b5_boss: ['#120810', '#402018'],
  b6_mid: ['#081208', '#1c3014'],
  b6_boss: ['#0e1c00', '#2c4810'],
  ex_mid: ['#080a16', '#182050'],
  ex_boss: ['#1e0014', '#500830'],
};

const ACCENT = {
  s1_mid: 'rgba(100,220,150,0.18)',
  s1_boss: 'rgba(255,140,200,0.22)',
  s2_mid: 'rgba(70,140,255,0.16)',
  s2_boss: 'rgba(140,220,255,0.22)',
  s3_mid: 'rgba(255,200,120,0.16)',
  s3_boss: 'rgba(255,180,60,0.24)',
  patrol: 'rgba(255,40,70,0.28)',
  a4_mid: 'rgba(255,210,60,0.18)',
  a4_boss: 'rgba(255,90,70,0.22)',
  a5_mid: 'rgba(160,180,255,0.16)',
  a5_boss: 'rgba(220,140,255,0.22)',
  a6_mid: 'rgba(255,140,200,0.18)',
  a6_boss: 'rgba(255,80,140,0.24)',
  b4_mid: 'rgba(255,90,120,0.18)',
  b4_boss: 'rgba(255,50,80,0.24)',
  b5_mid: 'rgba(255,150,80,0.16)',
  b5_boss: 'rgba(255,130,60,0.22)',
  b6_mid: 'rgba(160,230,80,0.16)',
  b6_boss: 'rgba(140,220,40,0.26)',
  ex_mid: 'rgba(160,180,255,0.16)',
  ex_boss: 'rgba(255,80,140,0.24)',
};

/** 各关侧景/符号主题 */
const THEME = {
  s1_mid: {
    pillar: '#3d8f6a', pillar2: '#1a4a32', float: '#88ffaa',
    kind: 'code', sil: 'blocks', scan: false, symbols: ['#', '{}', '草稿', 'wiki'],
  },
  s1_boss: {
    pillar: '#c46a9a', pillar2: '#6b2a4a', float: '#ffaadd',
    kind: 'gear', sil: 'gears', scan: false, symbols: ['齿轮', '编辑', '◇'],
  },
  s2_mid: {
    pillar: '#2a5a8a', pillar2: '#143050', float: '#66aaff',
    kind: 'hex', sil: 'hex', scan: false, symbols: ['01', '审核', '!!'],
  },
  s2_boss: {
    pillar: '#4a90b0', pillar2: '#1a4058', float: '#aaf0ff',
    kind: 'crystal', sil: 'hex', scan: false, symbols: ['Ice', '//', '[]'],
  },
  s3_mid: {
    pillar: '#8a9bb0', pillar2: '#ea580c', float: '#ffddaa',
    kind: 'split', sil: 'split', scan: false, symbols: ['A', 'B', '分叉'],
  },
  s3_boss: {
    pillar: '#d4a020', pillar2: '#8a5010', float: '#ffcc66',
    kind: 'fire', sil: 'poly', scan: false, symbols: ['防火墙', '合并', '◇'],
  },
  patrol: {
    pillar: '#c02040', pillar2: '#601020', float: '#ff4466',
    kind: 'warn', sil: 'bars', scan: true, symbols: ['404', 'NOT', 'FOUND'],
  },
  a4_mid: {
    pillar: '#c9a227', pillar2: '#6b5010', float: '#ffe066',
    kind: 'obelisk', sil: 'spires', scan: false, symbols: ['特惠', '¥', '购'],
  },
  a4_boss: {
    pillar: '#d04040', pillar2: '#701818', float: '#ff8866',
    kind: 'obelisk', sil: 'spires', scan: false, symbols: ['VIP', '买!', '套'],
  },
  a5_mid: {
    pillar: '#5a8acc', pillar2: '#c06090', float: '#ddaaff',
    kind: 'dual', sil: 'orbs', scan: false, symbols: ['蓝', '粉', '署名'],
  },
  a5_boss: {
    pillar: '#7a60b0', pillar2: '#a04070', float: '#e9d5ff',
    kind: 'dual', sil: 'orbs', scan: false, symbols: ['冲突', 'VS', '权'],
  },
  a6_mid: {
    pillar: '#c060a0', pillar2: '#803060', float: '#ff99dd',
    kind: 'candy', sil: 'rings', scan: false, symbols: ['♡', '哈', '~'],
  },
  a6_boss: {
    pillar: '#a03060', pillar2: '#501028', float: '#fda4af',
    kind: 'candy', sil: 'rings', scan: true, symbols: ['欠费', '回收', '⚠'],
  },
  ex_mid: {
    pillar: '#5a8acc', pillar2: '#c06090', float: '#ddaaff',
    kind: 'dual', sil: 'orbs', scan: false, symbols: ['键政', 'van', '覆写'],
  },
  ex_boss: {
    pillar: '#a03060', pillar2: '#501028', float: '#fda4af',
    kind: 'candy', sil: 'rings', scan: true, symbols: ['键政', '站队', '⚠'],
  },
  b4_mid: {
    pillar: '#a04050', pillar2: '#501820', float: '#ff6688',
    kind: 'spike', sil: 'wheel', scan: false, symbols: ['创', '!', '轮'],
  },
  b4_boss: {
    pillar: '#c03040', pillar2: '#601018', float: '#ff4466',
    kind: 'spike', sil: 'wheel', scan: false, symbols: ['创!', '击', '!!'],
  },
  b5_mid: {
    pillar: '#8a6040', pillar2: '#403020', float: '#ffaa66',
    kind: 'neon', sil: 'street', scan: false, symbols: ['中单', '推', '退'],
  },
  b5_boss: {
    pillar: '#a05030', pillar2: '#502818', float: '#fb923c',
    kind: 'neon', sil: 'street', scan: false, symbols: ['素质', '说', '锅'],
  },
  b6_mid: {
    pillar: '#4a7020', pillar2: '#203010', float: '#a3e635',
    kind: 'mist', sil: 'towers', scan: false, symbols: ['雾', '瓶', '塔'],
  },
  b6_boss: {
    pillar: '#5a9020', pillar2: '#284010', float: '#84cc16',
    kind: 'mist', sil: 'towers', scan: true, symbols: ['炫妈', '油', '雾'],
  },
};

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
    const th = THEME[mode] || THEME.s1_mid;
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
    const sky = SKY[mode] || SKY.s1_mid;
    const path = PLAYFIELD_BG_TEX[mode] || PLAYFIELD_BG_TEX.s1_mid;
    const tex = loadTex(path);
    const th = THEME[mode] || THEME.s1_mid;
    const z = this.scrollZ + scrollOff;
    const horizonY = H * this.horizon;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 天空渐变
    const g = ctx.createLinearGradient(0, 0, 0, horizonY + 20);
    g.addColorStop(0, sky[0]);
    g.addColorStop(1, sky[1]);
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
    const accent = ACCENT[mode] || 'rgba(255,240,200,0.22)';
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
          ctx.fillStyle = sky[1];
          ctx.fillRect(x0, y, roadW, 2);
        }
      } else {
        ctx.fillStyle = sky[1];
        ctx.globalAlpha = alpha * (0.3 + perspective * 0.4);
        ctx.fillRect(x0, y, roadW, 2);
      }

      if (y % 4 === 0) {
        ctx.globalAlpha = alpha * (0.15 + (1 - perspective) * 0.35);
        ctx.fillStyle = sky[0];
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
    ctx.save();
    ctx.globalAlpha = alpha * 0.28;
    const baseY = horizonY - 2;
    const sil = th.sil;
    ctx.fillStyle = th.pillar2;

    if (sil === 'blocks') {
      for (let i = 0; i < 12; i++) {
        const x = (i / 12) * W + 4;
        const h = 6 + hash(i * 9 + mode.length) * 22;
        ctx.fillRect(x, baseY - h, 10 + hash(i) * 14, h);
      }
    } else if (sil === 'gears') {
      for (let i = 0; i < 3; i++) {
        const cx = W * (0.2 + i * 0.3);
        const r = 14 + i * 4;
        ctx.beginPath();
        ctx.arc(cx, baseY - r * 0.4, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (sil === 'hex') {
      for (let i = 0; i < 8; i++) {
        const cx = 20 + i * (W / 8);
        const r = 8 + hash(i + 3) * 10;
        this._hex(ctx, cx, baseY - r, r);
        ctx.fill();
      }
    } else if (sil === 'split') {
      ctx.fillStyle = '#6a8098';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(8 + i * 18, baseY - 18 - i * 3, 12, 18 + i * 3);
      }
      ctx.fillStyle = '#c45a20';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(W - 20 - i * 18, baseY - 14 - i * 4, 14, 14 + i * 4);
      }
    } else if (sil === 'poly') {
      ctx.beginPath();
      ctx.moveTo(W * 0.5, baseY - 36);
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
        ctx.lineTo(W * 0.5 + Math.cos(a) * 28, baseY - 12 + Math.sin(a) * 16);
      }
      ctx.closePath();
      ctx.fill();
    } else if (sil === 'bars') {
      for (let i = 0; i < 16; i++) {
        ctx.globalAlpha = alpha * (0.12 + (i % 2) * 0.12);
        ctx.fillRect(0, baseY - 4 - i * 3, W, 2);
      }
    } else if (sil === 'spires') {
      for (let i = 0; i < 9; i++) {
        const x = 15 + i * (W / 9);
        const h = 12 + hash(i * 5) * 28;
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x + 6, baseY - h);
        ctx.lineTo(x + 12, baseY);
        ctx.fill();
      }
    } else if (sil === 'orbs') {
      ctx.fillStyle = th.pillar;
      ctx.beginPath();
      ctx.arc(W * 0.28, baseY - 16, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = th.pillar2;
      ctx.beginPath();
      ctx.arc(W * 0.72, baseY - 16, 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (sil === 'rings') {
      ctx.strokeStyle = th.pillar;
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(40 + i * 90, baseY - 10, 16, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (sil === 'wheel') {
      ctx.strokeStyle = th.pillar;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(W * 0.5, baseY - 8, 22, 0, Math.PI * 2);
      ctx.stroke();
    } else if (sil === 'street') {
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(30 + i * 70, baseY - 30, 8, 30);
        ctx.fillStyle = th.float;
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillRect(28 + i * 70, baseY - 34, 12, 5);
        ctx.fillStyle = th.pillar2;
        ctx.globalAlpha = alpha * 0.28;
      }
    } else if (sil === 'towers') {
      for (let i = 0; i < 7; i++) {
        const x = 25 + i * 60;
        const h = 20 + (i % 3) * 10;
        ctx.fillRect(x, baseY - h, 10, h);
        ctx.beginPath();
        ctx.moveTo(x - 2, baseY - h);
        ctx.lineTo(x + 5, baseY - h - 10);
        ctx.lineTo(x + 12, baseY - h);
        ctx.fill();
      }
    }
    ctx.restore();
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
    ctx.save();
    ctx.fillStyle = col2;
    if (kind === 'obelisk' || kind === 'fire') {
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.globalAlpha *= 0.7;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5, y + 2);
      ctx.lineTo(x + w * 0.75, y + h * 0.55);
      ctx.lineTo(x + w * 0.25, y + h * 0.55);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'hex' || kind === 'crystal') {
      ctx.fillStyle = col;
      this._hex(ctx, x + w / 2, y + h * 0.35, Math.max(w, h * 0.22));
      ctx.fill();
      ctx.fillStyle = col2;
      ctx.fillRect(x + w * 0.3, y + h * 0.45, w * 0.4, h * 0.55);
    } else if (kind === 'gear') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.35, w * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col2;
      ctx.fillRect(x + w * 0.35, y + h * 0.5, w * 0.3, h * 0.5);
    } else if (kind === 'warn') {
      ctx.fillStyle = variant % 2 ? col : col2;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#fff';
      ctx.globalAlpha *= 0.4;
      ctx.fillRect(x + 1, y + h * 0.2, w - 2, 2);
    } else if (kind === 'neon') {
      ctx.fillStyle = col2;
      ctx.fillRect(x + w * 0.35, y, w * 0.3, h);
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 6 * p;
      ctx.fillRect(x, y, w, h * 0.12);
      ctx.shadowBlur = 0;
    } else if (kind === 'mist' || kind === 'spike') {
      ctx.fillStyle = col2;
      ctx.fillRect(x + w * 0.25, y + h * 0.15, w * 0.5, h * 0.85);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, y + h * 0.2);
      ctx.lineTo(x + w * 0.5, y);
      ctx.lineTo(x + w, y + h * 0.2);
      ctx.fill();
    } else if (kind === 'candy') {
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(1.5, w * 0.25);
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h * 0.35, w * 0.55, h * 0.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = col2;
      ctx.fillRect(x + w * 0.4, y + h * 0.4, w * 0.2, h * 0.6);
    } else if (kind === 'dual') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.3, w * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col2;
      ctx.fillRect(x + w * 0.35, y + h * 0.45, w * 0.3, h * 0.55);
    } else {
      ctx.fillStyle = col2;
      ctx.fillRect(x + w * 0.3, y + h * 0.1, w * 0.4, h * 0.9);
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, h * 0.12);
      ctx.globalAlpha *= 0.8;
      ctx.fillRect(x + w * 0.15, y + h * 0.25, w * 0.7, 2);
      ctx.fillRect(x + w * 0.15, y + h * 0.45, w * 0.7, 2);
    }
    ctx.restore();
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
