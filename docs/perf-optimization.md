# 性能优化排查（Canvas 描画 / Three.js 背景 / 逻辑）

> 日期: 2026-08-13
> 依据: `main` 全库热点审查。结论均来自代码现状；真机掉帧数据需按文末「验证方式」实测。
> 状态: 实现完成（2026-08-13），待浏览器/真机视觉验证。验证未通过前不视为完成。

---

## 总览

**逻辑侧干净，不优先动**；热点集中在 Canvas 2D 弹幕描画与 Three.js 背景渲染。

| 优先级 | 项 | 成本机制 | 现状 |
|--------|----|----------|------|
| P0 | 主力弹种每弹每帧 shadowBlur + 渐变 | Canvas 2D 最贵操作 | rice/talisman 未走缓存 |
| P1 | 激光每帧重建 5 层纺锤路径 | 每激光每帧 5× 路径重建 | 长驻屏时叠加 |
| P1 | 背景渲染不受描画节流控制 | renderer.render 恒定 60fps | 描画上限/暂停不降 |
| P2 | 背景粒子逐顶点 CPU 更新 | 每帧遍历全部顶点 | 200–340 粒子/场景 |
| P2 | withAlpha() 每弹每帧拼字符串 | rgba 字符串分配 | 每弹每帧 1–2 次 |

---

## 逻辑侧（健康，勿重复优化）

- 固定 60Hz 逻辑 + 时间银行，每帧最多 3 步（`js/game.js` `_loop`）
- 子弹/道具/粒子对象池 + 上限防涨（`js/bulletPool.js`，MAX_POOL=4096）
- 自机弹×敌机网格粗筛（`js/collision.js`，GRID_CELL=56）；热路径用平方距离避 sqrt（`distPointSeg2`）
- 子弹更新为纯数值步进，无每帧分配（`js/gameCombat.js` → `js/entities.js` `Bullet.update`）
- swap-remove 单趟 purge dead 实体

---

## P0 — 主力弹种每弹每帧 shadowBlur + 渐变

**现状**：`rice`（stages/patterns 中 110 处）与 `talisman`（72 处）为弹幕主力。`drawBullet`（`js/draw/entitiesDraw.js`）对每颗弹每帧执行：

- `ctx.shadowColor` + `ctx.shadowBlur = 12~16`（`entitiesDraw.js:314, 330`）→ 每次 fill 走阴影管线，Canvas 2D 最贵操作之一
- `createRadialGradient` / `createLinearGradient`（`entitiesDraw.js:315, 331`）→ 每弹每帧分配 Gradient 对象 + 栅格化
- 弹体 + 白芯两次 ellipse fill

**对照**：`dot`/`medium`/`large`（107 处）已走 softGlow 离屏缓存（`entitiesDraw.js:101-128`，`_glowCache` key=`r|color|color2`，`drawImage` 平移复用）——正确姿势，未覆盖主力弹种。

**改法建议**：rice/talisman 同样 sprite 化——按「形状×半径×颜色」预渲染到离屏 canvas（扩展 `_glowCache`，key 加形状维度），每帧仅 `drawImage` + 平移旋转；`shadowBlur` 仅保留给擦弹中的少量子弹（`grazeFx` 分支）。

---

## P1 — 激光每帧重建 5 层纺锤路径

**现状**：`drawLaserBeam`（`js/draw/entitiesDraw.js:141-215`）对每道激光每帧执行 `buildSpindle` × 5 层（外柔光/色晕/主体/白芯/针芯线），segs = `max(10, min(28, round(len/14)))`。

**改法建议**：预渲染成拉伸贴图（`drawImage` + 纵向 scale），或把 segs 上限压到 ~12。

---

## P1 — Three.js 背景渲染不受描画节流控制

**现状**：`background.update()`（内含 `renderer.render`）在 `js/game.js` `_loop` 的**逻辑步进块**内调用——恒定 60fps 渲染，与描画节流（`fpsLimit` 滑条，24–240）及暂停无关；暂停时 `bgMul=0` 但 render 照跑。

**改法建议**：把 `background.update()` 移入描画节流路径（`shouldDraw` 分支内），或给背景独立帧率上限（如 30fps）。注意逻辑联动：倾向推进（`setTendency`）与渲染解耦后，倾向值需在逻辑步进更新、渲染时读取。

---

## P2 — 背景粒子逐顶点 CPU 更新

**现状**：`StageBackground.update`（`js/backgrounds/StageBackground.js:241-248`）每帧 `for i < pos.count` 逐顶点 `setY` + `pos.needsUpdate = true`；各场景粒子数 200–340（`js/backgrounds/scenes.js` `_points` 调用）。

**改法建议**：顶点动画移入着色器（`PointsMaterial` `onBeforeCompile`），或隔帧更新 / 降粒子数。

---

## P2 — withAlpha() 每弹每帧拼 rgba 字符串

**现状**：`withAlpha(hex, a)`（`js/draw/entitiesDraw.js:45-60`）每弹每帧解析 hex → 拼 `rgba(r,g,b,a)` 字符串，用于弹体 `strokeStyle` / `fillStyle`。

**改法建议**：颜色预解析缓存 `{r,g,b}`，alpha 用预拼模板复用。

---

## 验证方式

- 版面左上角常驻 FPS（`js/gameDraw.js` `drawFps`，<50 变琥珀色）：密集弹幕（boss 符卡）观察掉帧
- DevTools Performance 录制一段密集弹幕，确认 `drawBullet` / `renderer.render` 占比
- 真机（尤其低端手机）实测：Canvas 2D 阴影与渐变在移动端 GPU 上放大更明显

---

## 实施状态

| 项 | 状态 | 手测要点 |
|----|------|----------|
| P0 rice/talisman sprite 化 | 已实现（待验证） | 各弹种密集符卡：视觉等价、无掉帧、擦弹紫光仍在 |
| P1 激光贴图化 | 已实现（待验证） | 多激光同屏（如 EX）：外观等价、不闪烁 |
| P1 背景渲染挂描画节流 | 已实现（待验证） | 设 30fps 上限：左侧背景流畅度、倾向推进正常 |
| P2 粒子着色器/降频 | 已实现（待验证） | 各面背景粒子动画正常 |
| P2 withAlpha 缓存 | 已实现（待验证） | 全弹种颜色/透明度等价 |
