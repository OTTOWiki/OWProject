/**
 * 自机 / 敌机 / Boss 贴图
 */

const SPRITE_PATHS = {
  player_yinquan: 'assets/sprites/player_yinquan.jpg',
  player_shama: 'assets/sprites/player_shama.jpg',
  enemy_mob: 'assets/sprites/enemy_mob.jpg',
  enemy_elite: 'assets/sprites/enemy_elite.jpg',
  enemy_mid1: 'assets/sprites/enemy_mid1.jpg',
  boss_alice: 'assets/sprites/boss_alice.jpg',
  boss_icebin: 'assets/sprites/boss_icebin.jpg',
  boss_dazong: 'assets/sprites/boss_dazong.jpg',
  boss_patrol: 'assets/sprites/boss_patrol.jpg',
  // 路由 Boss 复用风格接近的贴图
  boss_menbailiang: 'assets/sprites/boss_dazong.jpg',
  boss_rival: 'assets/sprites/player_shama.jpg',
  boss_yimeige: 'assets/sprites/enemy_mid1.jpg',
  boss_duren: 'assets/sprites/boss_patrol.jpg',
  boss_gundian: 'assets/sprites/enemy_elite.jpg',
  boss_lastgod: 'assets/sprites/boss_alice.jpg',
};

const cache = new Map();

export function loadSprite(key) {
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
    if (img.complete && img.naturalWidth) res(img);
    else {
      img.onload = () => res(img);
      img.onerror = () => res(null);
    }
  })));
}

export function spriteKeyForEnemy(e) {
  if (e.type === 'boss' || e.kind === 'boss') {
    const map = {
      alice: 'boss_alice',
      icebin: 'boss_icebin',
      dazong: 'boss_dazong',
      patrol: 'boss_patrol',
      menbailiang: 'boss_menbailiang',
      rival: 'boss_rival',
      yimeige: 'boss_yimeige',
      duren: 'boss_duren',
      gundian: 'boss_gundian',
      lastgod: 'boss_lastgod',
    };
    return map[e.kind] || 'boss_alice';
  }
  if (e.type === 'elite' || e.kind === 'mid' || e.kind === 'mid1' || e.kind === 'mid2' || e.kind === 'mid3') {
    if (e.kind === 'mid1') return 'enemy_mid1';
    return 'enemy_elite';
  }
  return 'enemy_mob';
}

export function spriteKeyForPlayer(player) {
  return player?.def?.id === 'shama' ? 'player_shama' : 'player_yinquan';
}

/** 圆形裁剪绘制贴图（去掉方底） */
export function drawSpriteCirc(ctx, img, x, y, size, opts = {}) {
  if (!img || !img.complete || !img.naturalWidth) return false;
  const r = size / 2;
  const rot = opts.rot || 0;
  const alpha = opts.alpha ?? 1;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  // 轻微放大裁掉边缘杂色
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
