/**
 * 伪 3D 前推场景背景 + 阶段转场
 * Mode-7 风格扫描线透视，贴图向地平线汇聚并持续 scrollZ 前移
 */
import { LOGICAL_W, LOGICAL_H } from './config.js';

const BG_TEX = {
  s1_mid: 'assets/bg/tex_s1_mid.jpg',
  s1_boss: 'assets/bg/tex_s1_boss.jpg',
  s2_mid: 'assets/bg/tex_s2_mid.jpg',
  s2_boss: 'assets/bg/tex_s2_boss.jpg',
  s3_mid: 'assets/bg/tex_s3_mid.jpg',
  s3_boss: 'assets/bg/tex_s3_boss.jpg',
  patrol: 'assets/bg/tex_patrol.jpg',
  a4_mid: 'assets/bg/tex_a4_mid.jpg',
  a4_boss: 'assets/bg/tex_a4_boss.jpg',
  a5_mid: 'assets/bg/tex_a5_mid.jpg',
  a5_boss: 'assets/bg/tex_a5_boss.jpg',
  a6_mid: 'assets/bg/tex_a6_mid.jpg',
  a6_boss: 'assets/bg/tex_a6_boss.jpg',
  b4_mid: 'assets/bg/tex_b4_mid.jpg',
  b4_boss: 'assets/bg/tex_b4_boss.jpg',
  b5_mid: 'assets/bg/tex_b5_mid.jpg',
  b5_boss: 'assets/bg/tex_b5_boss.jpg',
  b6_mid: 'assets/bg/tex_b6_mid.jpg',
  b6_boss: 'assets/bg/tex_b6_boss.jpg',
};

const SKY = {
  // 1面 维基外围·草稿 / 爱丽丝齿轮
  s1_mid: ['#06140e', '#0f2e20'],
  s1_boss: ['#1c0814', '#4a1a38'],
  // 2面 编辑日常 / Icebin 冰晶
  s2_mid: ['#040c18', '#0a2440'],
  s2_boss: ['#020814', '#0c3858'],
  // 3面 分歧十字路口 / 大宗关防火墙
  s3_mid: ['#0e0a08', '#2a2018'],
  s3_boss: ['#1c1206', '#5a3810'],
  // 巡查姬 404
  patrol: ['#120004', '#480810'],
  // A 门构皮蒂娅线：推销 → 署名冲突 → 哈机密崩坏
  a4_mid: ['#1c1608', '#4a3a0c'],
  a4_boss: ['#2e0606', '#5c1414'],
  a5_mid: ['#080a16', '#182050'],
  a5_boss: ['#16081c', '#481850'],
  a6_mid: ['#16081c', '#481438'],
  a6_boss: ['#1e0014', '#500830'],
  // B 善雅乡线：创车 → 推退 → 炫妈迷雾
  b4_mid: ['#160808', '#481018'],
  b4_boss: ['#1c0404', '#581018'],
  b5_mid: ['#0a0812', '#2a1824'],
  b5_boss: ['#120810', '#402018'],
  b6_mid: ['#081208', '#1c3014'],
  b6_boss: ['#0e1c00', '#2c4810'],
};

/** 各模式主题雾/地平线强调色 */
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
};

const imgCache = new Map();

function loadTex(path) {
  if (imgCache.has(path)) return imgCache.get(path);
  const img = new Image();
  img.src = path;
  imgCache.set(path, img);
  return img;
}

export function preloadPlayfieldBg() {
  return Promise.all(Object.values(BG_TEX).map((p) => new Promise((res) => {
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
    this.horizon = 0.32; // 画面高度比例
    this.transition = 0; // 1→0 转场中
    this.transitionDur = 1.15;
    this.fogColor = 'rgba(8,10,16,0.55)';

    // 离屏缓冲：降低每帧 Mode-7 采样成本
    this._buf = document.createElement('canvas');
    this._buf.width = LOGICAL_W;
    this._buf.height = LOGICAL_H;
    this._bctx = this._buf.getContext('2d');
    this._dirty = true;
    this._accum = 0;
  }

  setMode(mode, { transition = true } = {}) {
    const next = BG_TEX[mode] ? mode : 's1_mid';
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
    // boss 稍快前推
    this.speed = next.includes('boss') || next === 'patrol' ? 1.55 : 1.05;
    this._dirty = true;
  }

  update(dt) {
    this.scrollZ += dt * this.speed * 48;
    if (this.transition > 0) {
      this.transition = Math.max(0, this.transition - dt / this.transitionDur);
      if (this.transition <= 0) this.prevMode = null;
    }
    this._accum += dt;
    // ~30fps 刷新伪3D 缓冲足够
    if (this._accum >= 1 / 28) {
      this._accum = 0;
      this._dirty = true;
    }
  }

  _drawMode(ctx, mode, alpha, scrollOff = 0) {
    const W = LOGICAL_W;
    const H = LOGICAL_H;
    const sky = SKY[mode] || SKY.s1_mid;
    const path = BG_TEX[mode] || BG_TEX.s1_mid;
    const tex = loadTex(path);

    ctx.save();
    ctx.globalAlpha = alpha;

    // 天空渐变
    const g = ctx.createLinearGradient(0, 0, 0, H * this.horizon + 20);
    g.addColorStop(0, sky[0]);
    g.addColorStop(1, sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * this.horizon + 4);

    // 星尘 / 远景粒子
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    const seed = mode.length * 17;
    for (let i = 0; i < 28; i++) {
      const sx = ((i * 97 + seed * 13) % W);
      const sy = ((i * 53 + seed) % Math.floor(H * this.horizon * 0.9));
      const tw = 0.5 + ((i + Math.floor(this.scrollZ)) % 3) * 0.4;
      ctx.globalAlpha = alpha * (0.15 + (i % 5) * 0.08);
      ctx.beginPath();
      ctx.arc(sx, sy, tw, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = alpha;

    // 地平线光带（按关卡主题色）
    const accent = ACCENT[mode] || 'rgba(255,240,200,0.22)';
    const hg = ctx.createLinearGradient(0, H * this.horizon - 8, 0, H * this.horizon + 12);
    hg.addColorStop(0, 'transparent');
    hg.addColorStop(0.5, accent);
    hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg;
    ctx.fillRect(0, H * this.horizon - 10, W, 24);

    // 顶部主题薄雾
    const topFog = ctx.createLinearGradient(0, 0, 0, H * this.horizon * 0.55);
    topFog.addColorStop(0, accent.replace(/[\d.]+\)$/, '0.12)'));
    topFog.addColorStop(1, 'transparent');
    ctx.fillStyle = topFog;
    ctx.fillRect(0, 0, W, H * this.horizon * 0.55);

    // 伪 3D 地面：扫描线透视
    const horizonY = H * this.horizon;
    const texReady = tex.complete && tex.naturalWidth > 0;
    const tw = texReady ? tex.naturalWidth : 64;
    const th = texReady ? tex.naturalHeight : 64;
    const z = this.scrollZ + scrollOff;

    // 每 2 行采样以提速
    for (let y = Math.floor(horizonY); y < H; y += 2) {
      const row = y - horizonY + 1;
      const perspective = row / (H - horizonY);
      // 距离：近处放大
      const scale = 0.15 + perspective * perspective * 8.5;
      const sampleY = ((z * 0.65 + 1 / (perspective + 0.08) * 18) % th + th) % th;
      const sliceH = Math.max(2, Math.min(6, scale * 0.35));

      // 地面宽度随透视扩展（两侧墙感）
      const roadW = W * (0.25 + perspective * 1.35);
      const x0 = (W - roadW) / 2;

      if (texReady) {
        ctx.globalAlpha = alpha * (0.35 + perspective * 0.55);
        try {
          // 横向拉伸一整行纹理
          const sy = Math.floor(sampleY) % th;
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

      // 两侧暗角形成“通道”墙
      if (y % 4 === 0) {
        ctx.globalAlpha = alpha * (0.15 + (1 - perspective) * 0.35);
        ctx.fillStyle = sky[0];
        ctx.fillRect(0, y, x0, 4);
        ctx.fillRect(x0 + roadW, y, W - x0 - roadW, 4);
      }
    }

    // 远近雾
    const fog = ctx.createLinearGradient(0, horizonY, 0, H);
    fog.addColorStop(0, 'rgba(0,0,0,0.35)');
    fog.addColorStop(0.35, 'rgba(0,0,0,0.08)');
    fog.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = fog;
    ctx.fillRect(0, horizonY, W, H - horizonY);

    // 轻微扫描线
    ctx.globalAlpha = alpha * 0.08;
    ctx.fillStyle = '#000';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

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
      // 交叉溶解 + 轻微 zoom
      const t = this.transition;
      this._drawMode(ctx, this.prevMode, t, 0);
      ctx.save();
      const s = 1 + (1 - t) * 0.08;
      ctx.translate(W / 2, H / 2);
      ctx.scale(s, s);
      ctx.translate(-W / 2, -H / 2);
      this._drawMode(ctx, this.mode, 1 - t, 20);
      ctx.restore();

      // 转场光幕
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

    // 暗角，突出弹幕
    const W = LOGICAL_W;
    const H = LOGICAL_H;
    const vg = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.15, W / 2, H * 0.5, H * 0.75);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
}

export function getPlayfieldBgPaths() {
  return [...new Set(Object.values(BG_TEX))];
}
