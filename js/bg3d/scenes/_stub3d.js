/**
 * 3D 舞台场景 stub（A/B 线待正式实现时占位；由 lead 换为正式场景）。
 * 只依赖 kit 的通用部件与调色板，保证 21 mode 均可渲染。
 */
function makeStub(suffix, boss) {
  return function build(ctx) {
    const { palette, K } = ctx;
    ctx.atmosphere({
      bg: palette.skyBot,
      fogColor: palette.fog,
      fogDensity: boss ? 0.02 : 0.024,
      ambient: palette.ambient,
      ambientIntensity: 1.0,
      dirColor: boss ? palette.accent : palette.glow,
      dirIntensity: 0.6,
    });
      const art = ctx.plateTexture();
  if (art) {
    const crops = [[0, 0, 1, 1], [0.08, 0.1, 0.5, 0.5], [0.4, 0.16, 0.55, 0.5], [0.2, 0.45, 0.5, 0.5]];
    for (let i = 0; i < crops.length; i++) {
      const tex = ctx.plateCrop(...crops[i]);
      if (!tex) continue;
      ctx.add(K.panel(tex, {
        x: (i % 2 ? 1 : -1) * (8 + i * 5), y: 7 + i * 3, z: -105 + i * 10,
        w: i === 0 ? 120 : 44 + i * 8, h: i === 0 ? 160 : 50 + i * 10,
        opacity: i === 0 ? 0.8 : 0.5, color: 0xffffff, rotationY: (i - 1.5) * 0.1,
      }));
    }
  }
    ctx.add(K.ground({ y: -10, color: palette.ink }));
    // 几个悬浮几何体 + 后景平面
    ctx.field((i) => {
      const m = i % 2 ? K.box(2.2, 2.2, 2.2, palette.accent, { transparent: true, opacity: 0.55 })
        : K.torus(2.4, 0.3, palette.glow, { radial: 5, tubular: 20 });
      return m;
    }, { count: 6, zNear: -10, zFar: -90, xRange: 22, yRange: 10, speedMul: 0.8 });
    ctx.points({
      count: 40, color: palette.glow, size: 0.22, type: 'spark',
      xRange: 24, yRange: 18, zNear: -3, zFar: -60, speed: 2.5, seed: boss ? 7 : 2,
    });
    ctx.setSpeed(boss ? 14 : 10);
    ctx.setSway(0.6, 0.35);
  };
}

export const mid = makeStub('mid', false);
export const boss = makeStub('boss', true);
