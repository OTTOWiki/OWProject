/**
 * 自机 / 敌机 / Boss 贴图
 *
 * Boss 贴图策略（T18）：
 * - DEDICATED_BOSS_BY_KIND：角色 kind → 专用 sprite key（文件一一对应）
 * - PLACEHOLDER_BOSS_SPRITES：暂无专用图时的**显式**占位（注释写清借了谁的图）
 * - 未登记 kind：返回 null → 绘制走几何，**禁止**静默回落 boss_alice（避免误读成爱丽丝）
 */

/** 磁盘上存在、与角色对应的专用 sprite key */
export const DEDICATED_BOSS_SPRITE_KEYS = new Set([
  'boss_alice',
  'boss_icebin',
  'boss_dazong',
  'boss_patrol',
]);

/**
 * boss.kind → 专用 sprite key（有独立美术）
 */
export const DEDICATED_BOSS_BY_KIND = {
  alice: 'boss_alice',
  icebin: 'boss_icebin',
  dazong: 'boss_dazong',
  patrol: 'boss_patrol',
};

/**
 * 暂无专用 Boss 图时的显式占位（路径复用其他资源）
 * 值：sprite key（须在 SPRITE_PATHS 中）或 null（纯几何，不画错脸）
 * 补美术后：移入 DEDICATED_BOSS_BY_KIND + 新文件，并删本表项
 */
export const PLACEHOLDER_BOSS_SPRITES = {
  // 借 大宗关 图 — 仅作金色客服感占位，非门百梁本人
  menbailiang: 'boss_menbailiang',
  // 对手自机：战斗中用对手角色的自机图
  rival: 'boss_rival',
  // 借 mid1 精英图 — 非一美个本人
  yimeige: 'boss_yimeige',
  // 借 巡查姬 图 — 非赌人本人
  duren: 'boss_duren',
  // 借 elite 图 — 非棍电本人
  gundian: 'boss_gundian',
  // 借 爱丽丝 图 — 非拉斯特本人
  lastgod: 'boss_lastgod',
  // EX：暂无专用脸 → 几何绘制，勿套爱丽丝
  van: null,
  ex_mid: null,
};

const SPRITE_PATHS = {
  player_yinquan: 'assets/sprites/player.avif',
  player_shama: 'assets/sprites/player.avif',
  enemy_mob: 'assets/sprites/enemy_mob.avif',
  enemy_elite: 'assets/sprites/enemy_elite.avif',
  enemy_mid1: 'assets/sprites/enemy_mid1.avif',
  boss_alice: 'assets/sprites/boss_alice.avif',
  boss_icebin: 'assets/sprites/boss_icebin.avif',
  boss_dazong: 'assets/sprites/boss_dazong.avif',
  boss_patrol: 'assets/sprites/boss_patrol.avif',
  // 以下 key 仅为 PLACEHOLDER 引用路径（文件仍是他角资源）
  boss_menbailiang: 'assets/sprites/boss_dazong.avif',
  boss_rival: 'assets/sprites/player.avif',
  boss_yimeige: 'assets/sprites/enemy_mid1.avif',
  boss_duren: 'assets/sprites/boss_patrol.avif',
  boss_gundian: 'assets/sprites/enemy_elite.avif',
  boss_lastgod: 'assets/sprites/boss_alice.avif',
};

const cache = new Map();

export function loadSprite(key) {
  if (!key) return null;
  const path = SPRITE_PATHS[key] || key;
  if (cache.has(path)) return cache.get(path);
  const img = new Image();
  img.src = path;
  cache.set(path, img);
  return img;
}

export function preloadSprites() {
  return Promise.all(Object.keys(SPRITE_PATHS).map((k) => new Promise((res) => {
    const img = loadSprite(k);
    if (!img) {
      res(null);
      return;
    }
    if (img.complete && img.naturalWidth) res(img);
    else {
      img.onload = () => res(img);
      img.onerror = () => res(null);
    }
  })));
}

/**
 * @param {object} e enemy
 * @returns {string|null} sprite key；null = 用几何绘制
 */
export function spriteKeyForEnemy(e) {
  if (e.type === 'boss' || e.kind === 'boss') {
    // Boss 的 character kind 直接写在 e.kind（boss() 构造时传入）
    const k = e.kind;
    if (DEDICATED_BOSS_BY_KIND[k]) return DEDICATED_BOSS_BY_KIND[k];
    if (Object.prototype.hasOwnProperty.call(PLACEHOLDER_BOSS_SPRITES, k)) {
      return PLACEHOLDER_BOSS_SPRITES[k];
    }
    // 未知 boss kind：几何，禁止默认爱丽丝
    return null;
  }
  if (e.type === 'elite' || e.kind === 'mid' || e.kind === 'mid1' || e.kind === 'mid2' || e.kind === 'mid3') {
    if (e.kind === 'mid1') return 'enemy_mid1';
    return 'enemy_elite';
  }
  return 'enemy_mob';
}

/** 该 boss kind 是否使用显式占位贴图（非专用脸） */
export function isPlaceholderBossKind(kind) {
  return Object.prototype.hasOwnProperty.call(PLACEHOLDER_BOSS_SPRITES, kind)
    && PLACEHOLDER_BOSS_SPRITES[kind] != null;
}

/** 该 boss kind 是否走纯几何（登记为 null 或未登记） */
export function isGeometryBossKind(kind) {
  if (DEDICATED_BOSS_BY_KIND[kind]) return false;
  if (Object.prototype.hasOwnProperty.call(PLACEHOLDER_BOSS_SPRITES, kind)) {
    return PLACEHOLDER_BOSS_SPRITES[kind] == null;
  }
  return true;
}

export function spriteKeyForPlayer(player) {
  return player?.def?.id === 'shama' ? 'player_shama' : 'player_yinquan';
}

/**
 * 圆形裁剪贴图 sprite 缓存（#49：clip + shadowBlur 描边每帧光栅化 → 按 img/size/glow 预渲染一次）。
 * 光晕与本体一起烘焙：烘焙时本体 alpha=1、光晕 alpha=0.45，调用方整体乘 alpha 与改前等价。
 */
const _circSprites = new Map();
const CIRC_CACHE_MAX = 48;

function circSprite(img, size, opts) {
  const glow = opts.glow || '';
  const key = `${img.src || ''}|${size}|${glow}|${opts.glowBlur ?? 16}`;
  let entry = _circSprites.get(key);
  if (entry === undefined) {
    entry = null;
    if (typeof document !== 'undefined' && document.createElement) {
      try {
        const r = size / 2;
        // shadowBlur 12 的扩散余量（约 1.5–2×blur）+ 描边半宽
        const pad = Math.ceil(r + 2 + 12 * 2) + 2;
        const c = document.createElement('canvas');
        c.width = pad * 2;
        c.height = pad * 2;
        const g = c.getContext('2d');
        if (g) {
          g.translate(pad, pad);
          g.save();
          g.beginPath();
          g.arc(0, 0, r, 0, Math.PI * 2);
          g.closePath();
          g.clip();
          // 轻微放大裁掉边缘杂色
          const s = size * 1.15;
          g.drawImage(img, -s / 2, -s / 2, s, s);
          g.restore();
          if (glow) {
            g.strokeStyle = glow;
            g.globalAlpha = 0.45;
            g.lineWidth = 2;
            g.shadowColor = glow;
            g.shadowBlur = 12;
            g.beginPath();
            g.arc(0, 0, r + 1, 0, Math.PI * 2);
            g.stroke();
          }
          entry = { canvas: c, pad };
        }
      } catch (_) {
        entry = null;
      }
    }
    if (entry) {
      if (_circSprites.size >= CIRC_CACHE_MAX) {
        _circSprites.delete(_circSprites.keys().next().value);
      }
      _circSprites.set(key, entry);
    }
  }
  return entry;
}

/** 圆形裁剪绘制贴图（去掉方底） */
export function drawSpriteCirc(ctx, img, x, y, size, opts = {}) {
  if (!img || !img.complete || !img.naturalWidth) return false;
  const r = size / 2;
  const rot = opts.rot || 0;
  const alpha = opts.alpha ?? 1;
  const entry = circSprite(img, size, opts);
  if (entry) {
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.drawImage(entry.canvas, -entry.pad, -entry.pad);
    ctx.restore();
    return true;
  }
  // 回退（无离屏 canvas 环境）：原裁剪 + shadowBlur 路径
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const s = size * 1.15;
  ctx.drawImage(img, -s / 2, -s / 2, s, s);
  ctx.restore();

  // 外圈光晕
  if (opts.glow) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = opts.glow;
    ctx.globalAlpha = 0.45 * alpha;
    ctx.lineWidth = 2;
    ctx.shadowColor = opts.glow;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, r + 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  return true;
}

export function drawSprite(ctx, img, x, y, w, h, opts = {}) {
  if (!img || !img.complete || !img.naturalWidth) return false;
  ctx.save();
  ctx.translate(x, y);
  if (opts.rot) ctx.rotate(opts.rot);
  ctx.globalAlpha = opts.alpha ?? 1;
  if (opts.glow) {
    ctx.shadowColor = opts.glow;
    ctx.shadowBlur = opts.glowBlur ?? 16;
  }
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
  return true;
}

export function getSpritePaths() {
  return [...new Set(Object.values(SPRITE_PATHS))];
}
