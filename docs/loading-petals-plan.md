# 加载界面「黑带 + 落花」实施方案

> 日期：2026-11-08
> 参考：[PR #10](https://github.com/OTTOWiki/OWProject/pull/10)（已合并，2026-07-27）+ [`参考/loading.png`](../参考/loading.png)（TH20 原版加载画面，仅作构图参考）
> 依据：TH20 素材与 ANM 语义见 [`.scratch/loading-petals-factsheet.md`](../.scratch/loading-petals-factsheet.md)（逐条 `文件:行号` 证据）。
> **状态**：开屏黑带复刻、真实进度、恢复面板 **已实施**；落花与进度联动 **仍为方案，未实施**。

## 0. 一句话

保留 PR #10 真正有效的部分——**满幅暗色幻想底 + 贯穿屏幕的中央黑带 + 右下角「少女祈祷中／Now Loading」**；丢掉它的错字、低清底图、无状态/无恢复、移动端硬贴角；落花作为下一层动画，用**一张无缝纵铺纹理 + 真实加载进度驱动的播放速率**实现，不引入粒子系统或 rAF 主循环。

## 1. 从 PR #10 与参考图里取什么、舍什么

| 元素 | PR #10 / 参考图 | 取舍 | 现行实现 |
|---|---|---|---|
| 满幅幻想底 | 参考图：紫黑天空、蝶/花剪影；PR #10：128×128 `loading.avif` 直接放大 | 取氛围，舍低清与糊成色块 | 新 `assets/ui/loading-bg.avif`（1440×900，18KB），由既有 AI 底材压暗、加暗角与颗粒；紫光用 CSS `mix-blend-mode: screen` 叠加 |
| 中央黑带 | 参考图与 PR #10 都是贯穿全宽的黑色横带 | 取；去掉旧版的纸卡片/双栏 `load-sheet` | `.load-band` 全宽、上下金色细线、低透明纹理；标题/声明/制作居中 |
| 标题 | 参考图「東方Project」大字；PR #10 写成「棍維Project」 | 取大字书法；**舍错字/中西混排** | 五字「棍維何意味」逐字错落，「棍維」朱金、「何意味」象牙白；`lang="ja"` + `aria-label` |
| 虚构声明 | 参考图绿色小字 | 取；用低饱和青绿而不是荧光绿 | `.load-notice`「本游戏为虚构作品……」 |
| Presented by | 参考图小号衬线 + 制作名义 | 取；恢复混合大小写 | `.load-presented` + `.load-maker`「OTTOWiki 幻乐团」 |
| 右下加载角 | 参考图与 PR #10 都有「少女祈祷中 / Now Loading / 细进度条」 | 取；保留真实百分比与资源计数 | `.load-corner`：`.load-pray` + `.load-now` + `#load-progress` + `#load-status` |
| 失败恢复 | PR #10 把 `load-hint` 与恢复路径删了 | **舍**；这是旧版最大退步 | `#load-reload` / `#load-continue` + `aria-busy="false"` 驱动的状态面板；44px 移动端命中区 |
| 移动端 | PR #10 的 `.load-corner` 绝对定位，窄屏容易压字 | 舍硬贴角 | ≤720px：黑带纵向居中、加载角贴底；失败态改为「黑带 + 暗色状态面板」流式排布，可滚动 |
| 减少动态效果 | PR #10 无处理 | 舍 | `prefers-reduced-motion` 下停掉背景漂移、横带淡入与进度条过渡 |
| 原作素材 | `参考/loading.png` 是原作截图 | **只取构图，不取像素** | 新背景与落花素材均自绘/由项目内既有 AI 素材派生；`assets/NOTICE.md` 逐文件记录 |

**一句话取舍**：PR #10 的“开屏构图”是对的，“工程完整性”是退化的；复刻构图，保留现有真实进度、可访问性与恢复能力。

## 2. 现行实现（2026-11-08）

### 2.1 DOM

`index.html` 的加载层只有三层，不再有 `load-sheet` / `load-progress-panel`：

```html
<div id="load-screen" aria-busy="true">
  <div class="load-bg" aria-hidden="true"></div>

  <section class="load-band" aria-labelledby="load-title">
    <h1 id="load-title" class="load-title" lang="ja" aria-label="棍維何意味">…五字…</h1>
    <p class="load-sub">OTTOWiki Project</p>
    <p class="load-notice">本游戏为虚构作品，登场人物、团体等均为幻想设定。</p>
    <p class="load-presented">Presented by</p>
    <p class="load-maker">OTTOWiki 幻乐团</p>
  </section>

  <aside class="load-corner" aria-label="加载状态">
    <p class="load-pray" aria-hidden="true">少女祈祷中</p>
    <p class="load-now">Now Loading <span id="load-text">0%</span></p>
    <div id="load-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
      <div class="load-fill" id="load-fill"></div>
    </div>
    <p class="load-status" id="load-status" role="status" aria-live="polite">正在加载游戏资源</p>
    <div class="load-actions">
      <button id="load-reload" hidden>重新加载</button>
      <button id="load-continue" hidden>继续进入</button>
    </div>
  </aside>
</div>
```

关键约束：

- `#load-progress` 的 `role="progressbar"` 与三个 `aria-value*` 不删；`#load-status` 保持 `role="status"` / `aria-live="polite"`。
- `#load-text` / `#load-progress` 在失败态被 JS 隐藏；`.load-pray` / `.load-now` 由 `[aria-busy="false"]` 隐藏，状态与按钮保留。
- 标题的完整可访问名仍是「棍維何意味」；五个 `.title-glyph` 只承担视觉错落。

### 2.2 CSS 分层

- `.load-bg::before`：`loading-bg.avif` 全屏 `cover`，34s 极慢漂移；`.load-bg::after`：两层径向渐变，`mix-blend-mode: screen` 叠出紫光。
- `.load-band`：全宽，竖向黑渐变 + `loading.avif` 拉伸纹理，`border-block` 金色细线。
- `.load-title`：`clamp(2.9rem, 6.2vw, 5.3rem)`；逐字 `translateY/rotate/scale`；`-webkit-text-stroke` 只做 1px 描边。
- `.load-corner`：桌面右下绝对定位；`#load-progress` 高 3px，填充为朱红→金→青。
- 断点：
  - `≤720px`：`#load-screen` 改 flex；黑带 `margin: auto 0` 纵向居中；加载角贴底、避让 safe-area。
  - `(max-width:720px) and (max-height:520px)`：极矮竖屏改为上下排布，优先保证加载角与恢复按钮可见。
  - `(max-height:620px) and (orientation:landscape)` 或 `(min-width:721px) and (max-height:620px)`：黑带与加载角改上下排布，防横屏/矮屏重叠。
  - `aria-busy="false"`：整页改 flex 流式；黑带置顶，`.load-corner` 变成居中的暗色状态面板，320×568 也完整可见。
  - `prefers-reduced-motion`：停掉漂移、淡入与进度条过渡。

### 2.3 JS 状态

`js/main.js` 现有的加载链路不因改版而变化：

- `setLoadProgress(pct)`：真实“已处理资源 / 总数”，同步 `#load-fill` 宽度、`#load-text` 与 `aria-valuenow`。
- `setLoadProgressVisible(bool)` / `setLoadStatus(text)`：资源不可计量时隐藏百分比，只保留状态文字。
- `waitForLoaderChoice(issues)`：可恢复问题出现时隐藏进度、展示「继续进入 / 重新加载」。
- `setRecoveryControls()`：统一写 `aria-busy`，并把焦点交给「重新加载」。
- `showBootFailure()`：核心失败时保留加载层，只给「重新加载」。
- `dismissLoadScreen()`：初始化与恢复选择都完成后才移除加载层。

**`aria-busy` 同时是布局开关**：`true` 是开屏，`false` 是恢复页。不要另加一套 `load-failed` 类，避免两套状态漂移。

### 2.4 素材与授权

- `assets/ui/loading-bg.avif`：1440×900，18KB；以 `assets/bg/difficulty-cathedral.avif` 为底，压暗、暗角、颗粒后导出；**不含 `参考/loading.png` 的像素**。
- `assets/ui/loading.avif`：既有 128×128 暗纹理，仅作黑带材质叠加。
- `assets/NOTICE.md` 已补两条逐文件记录；落花素材将来也必须补。

### 2.5 本轮验证

- `npm test`：114 pass / 0 fail。
- 系统 Chromium + Playwright（Android 平台 shim）实测：
  - 1365×900：真实进度 64% 开屏；资源可恢复失败后进入恢复面板。
  - 390×844：恢复面板与 44px 按钮可见，点「继续进入」后菜单 `active` 且非 `inert`。
  - 320×568：恢复按钮可见（y≈396，高 44px）；核心模块失败时只显示「重新加载」。
  - `pageerror` 为空。
- 未在本机跑完整 `npm run test:e2e`：Playwright 桌面版不支持 Android/Termux 平台，标准 runner 会直接报 `Unsupported platform: android`；CI 的 `Test` / `E2E` 仍是合并门禁。

## 3. 落花参考：TH20 实际做了什么（只取结构）

参考图 `参考/loading.png` 是 646×493 的原版加载画面：紫黑满幅底、中央黑色横带、右下「少女祈祷中／Now Loading」。它的“落花”不是粒子系统，而是**一张 256×256 贴图切成 3 块，各自跑一条小时间轴**：

| 层 | 精灵区域 | 已解出的动画 |
|---|---|---|
| 少女祈祷中 | `sprite912` (1,1) 254×62 | 静止；alpha 淡入 → 20 帧一档在 255↔128 呼吸 |
| Now Loading | `sprite913` (1,65) 254×62 | x: 192 → 32（4 帧）→ 240（30 帧），y 恒为 32；alpha 呼吸 + 末段淡出 |
| 莲花 | `sprite914` (1,129) 62×62 | 由 `script17` 每 4 帧重放；浮点轨迹未完全解出 |

三条 ANM 指令承担全部动画：`ins_407` 位置插值、`ins_409` alpha 插值、`ins_408` 颜色插值；`mode` 是缓动号。更关键的是 **动画时钟与游戏时钟共用 `timer_rate`**——所以“变速”在引擎里是免费的。

**不能直接抄贴图**：`参考/loading.png` 与 TH20 的 `loading@ascii@7.png` 都属于官方指南禁止的“截图/游玩视频以外的游戏素材”。我们只抄“分层 + 小时间轴 + 时钟倍率”的结构，像素全部自绘。

## 4. 落花设计目标

1. **落点在右下加载角**：花瓣围绕「少女祈祷中／Now Loading」，不穿过标题、声明与制作名义；黑带本身保持干净。
2. **变速来自真实进度**：速度跟随 `setLoadProgress` 的“已处理 / 总数”，不是墙钟假动画。
3. **一张无缝纵铺纹理 + 两层视差**：不写粒子系统，不加第二个 rAF 主循环。
4. **可降级**：`prefers-reduced-motion` 静态；恢复态暂停；素材失败时只是没有花瓣，加载功能不受影响。
5. **首屏不抢资源**：落花图 <40KB，CSS 背景加载；不进入 `preloadAll` 的关键路径。

## 5. 实现选型

### 方案 A（推荐）：CSS 纵铺 + Web Animations API 调速

```css
.load-petals {
  position: absolute; inset: 0; z-index: 1;
  pointer-events: none; overflow: hidden;
}
.load-petals-layer {
  position: absolute; inset: -24% 0;
  background: url("../assets/ui/petals-scroll.avif") center top / 100% auto repeat-y;
  opacity: .55;
  will-change: background-position;
}
.load-petals-layer.near {
  background-size: 142% auto;
  opacity: .72;
  mask-image: radial-gradient(ellipse at 78% 80%, #000 0 34%, transparent 72%);
}
```

用 WAAPI 驱动 `background-position-y`：

```js
const anim = layer.animate(
  [{ backgroundPositionY: '0%' }, { backgroundPositionY: '100%' }],
  { duration: 18000, iterations: Infinity, easing: 'linear' },
);
anim.playbackRate = petalPlaybackRate(progress);
```

- **为什么不用 `animation-duration` 直接随百分比改**：改时长会重算动画相位，落花会“跳一下”。`playbackRate` 只改速度，不重置相位。
- 两层共用一条 keyframe，第二层用不同 `background-size` / `opacity` / `mask` 做视差；不需要逐瓣对象。
- 不支持 WAAPI 时降级为固定 18s CSS 动画；进度条仍真实。

### 方案 B：独立 2D canvas 粒子层

- 优点：逐瓣旋转、摆动、密度都容易。
- 缺点：加载界面正在抢图片/OGG/Three 资源，再加 rAF 循环不划算；`prefers-reduced-motion` 要自己实现。
- **结论：不用于加载界面。** 将来暂停/结算若需要同样效果，再单独评估。

### 方案 C：静态分层

只做 2~3 条不同透明度的纵铺带，不调速。作为 reduced-motion 与素材失败时的回退。

**推荐组合：A + C 兜底。**

## 6. 素材规格

`assets/ui/petals-scroll.avif`：

- **512×1024**，带 alpha；首尾行必须能无缝纵向衔接。
- 2~4 种花瓣形态，大小/透明度/疏密有变化，避免明显重复。
- 目标 20~40KB；用 `tools/to-avif.mjs`（或 `tools/to-avif.sh`）从 PNG 转，运行时只保留 AVIF。
- 来源二选一：
  - 项目既有 AI 生成流程（与 `battle-print.avif` / `difficulty-cathedral.avif` 同一条记录方式）；
  - 程序绘制（Canvas/SVG 导出 PNG），不复制或逐点描摹原作纹理。
- `assets/NOTICE.md` 增加逐文件记录：生成方式、原图尺寸、明确“非原作提取”。
- 可选第二张 512×512 远景层；若两张图让首屏变重，只保留一张。

## 7. 进度 → 播放速率

纯函数（建议放 `js/loadingPetals.js`，便于单测）：

```js
export function petalPlaybackRate(pct) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  if (p < 15) return 0.55 + (p / 15) * 0.25;          // 0.55 → 0.80
  if (p < 85) return 0.80 + ((p - 15) / 70) * 1.00;    // 0.80 → 1.80
  return 1.80 - ((p - 85) / 15) * 0.80;                // 1.80 → 1.00
}
```

| 进度 | 行为 | 理由 |
|---|---|---|
| 0–15% | 0.55→0.80，慢 | 给“正在准备”呼吸感，不像卡住 |
| 15–85% | 0.80→1.80，线性加速 | 进度可见地越跑越顺 |
| 85–100% | 1.80→1.00，提前减速 | 避免“快好了突然冲刺”的假象 |
| 恢复态 `aria-busy="false"` | `playbackRate = 0` / pause | 状态面板优先，不抢注意力 |
| `prefers-reduced-motion` | 不创建动画 | 静态纹理即可 |

约束：速率只由**真实已处理资源数**驱动；模块缓存不可计量、百分比隐藏时，保持 1.0，不假装加速。

## 8. DOM / CSS 接入点

在 `.load-bg` 之后、`.load-band` 之前加两层装饰（或放在 `.load-bg` 内，z-index 1）：

```html
<div class="load-petals" aria-hidden="true">
  <span class="load-petals-layer far"></span>
  <span class="load-petals-layer near"></span>
</div>
```

- `.load-petals`：`position:absolute; inset:0; z-index:1; pointer-events:none; overflow:hidden;`
- `.load-band` 仍是 `z-index:2`，标题/声明/制作名义不会被花瓣盖住。
- `.load-corner` 是 `z-index:3`；花瓣从它后面落下。
- `mask-image` 不支持时整层仍可用，只是花瓣会分布到全屏；用 `opacity` 控制不抢字。
- 恢复态：`#load-screen[aria-busy="false"] .load-petals { opacity:.18; }`，并暂停动画。
- 淡出：`dismissLoadScreen()` 前取消 WAAPI（`anim.cancel()`），避免已移除元素的动画残留。

## 9. 启动与进度接线

`js/main.js` 不建议把花瓣图加入 `preloadAll`（会延迟真实进度）。建议：

1. 加载层 HTML 已存在时，`initLoadingPetals()` 只查询 `.load-petals-layer`；找不到就 no-op。
2. `initLoadingPetals()` 在首帧后创建两条 WAAPI 动画，初始 `playbackRate = petalPlaybackRate(0)`。
3. `setLoadProgress(pct)` 末尾调用 `setLoadingPetalRate(pct)`；函数内部做 `anim.playbackRate = ...`，不写布局。
4. `setRecoveryControls()` / `showBootFailure()` 设 `aria-busy="false"` 时暂停；`dismissLoadScreen()` 取消。
5. `prefers-reduced-motion` 在初始化时读一次；媒体查询变化时（可选）监听 `change` 并取消/重建。
6. 页面 `visibilitychange` 隐藏时暂停，回来恢复，省电。

## 10. 验证

### 单元（node）

新增 `test/cases-loadanim.js`：

- `petalPlaybackRate(0/15/50/85/100)` 的边界值与单调性（先升后降）。
- 非法输入（`NaN`、负数、>100、字符串）被 clamp。
- 恢复态/隐藏百分比的速率约定（0 或 1.0）。

### E2E（Playwright）

扩展 `test/e2e/boot.spec.js` 或新增 `loading-petals.spec.js`：

- 加载层存在时 `.load-petals-layer` 至少有 1 个 `getAnimations()`；进度推进后 `playbackRate` 变化。
- `prefers-reduced-motion: reduce` 下无动画。
- 恢复态下动画暂停/速率为 0，`#load-continue` 仍可见可点。
- 花瓣层 `pointer-events:none`；`#load-progress` / `#load-status` 的语义不变。
- 黑带 `getBoundingClientRect()` 在加花瓣前后不变（无布局位移）。

### 截图与实拍

- 按 `AGENTS.md` 的 UI 截图对比要求：1365×900、1264×625、390×844、320×568，加载中 50%、恢复态、reduced-motion 各一张。
- 只比对构图/色彩/层级，不对逐帧像素；动画相位不受控。
- 与 `参考/loading.png` 并排检查“满幅底 + 黑带 + 右下加载角”的相似度；PR #10 只作为已合并的历史实现，不作为唯一基准。
- 低端机实测首帧：新增 1 张 <40KB AVIF + 2 条 WAAPI，预期可忽略；若首帧变慢，退回方案 C 或只保留一层。

## 11. 落地步骤

| 步 | 内容 | 验收 |
|---|---|---|
| P1 | 产出 `assets/ui/petals-scroll.avif`（512×1024 无缝纵铺）+ `assets/NOTICE.md` 记录 | 首尾接缝目视连续；AVIF 20–40KB |
| P2 | `index.html` 加 `.load-petals` 两层；CSS 加纵铺/遮罩/降级与 reduced-motion | 花瓣只出现在加载角附近；不遮标题；静态回退可用 |
| P3 | 新增 `js/loadingPetals.js`（纯函数 + WAAPI）；`main.js` 接线 | 单测绿；0→100 时先加速后减速，无相位跳变 |
| P4 | 恢复/致命失败/淡出时暂停或取消动画 | 恢复面板可读、按钮可点；无残留动画 |
| P5 | e2e + 四档截图 + 真机首帧 | 新用例绿；旧 boot/menu 用例不回归 |
| P6 | 文档同步：`AGENTS.md`（新增模块/文件时）、`README.md`（玩家可见说明）、`assets/NOTICE.md` | 文档与代码一致 |

**红线**：不改 450×600 逻辑坐标；不引入打包器/框架；不动 `#load-progress` 的 `role`/`aria-*`；不把版本说明/修复列表写进加载文案；不使用 `参考/loading.png` 或 TH20 原贴图像素。

## 12. 风险与未决

1. **无缝接缝**：512×1024 纹理首尾行若接不上，纵铺会出现一条横线；P1 必须先目检 + 循环播放检查。
2. **相位跳变**：`animation-duration` 调速会跳；必须用 WAAPI `playbackRate`，或接受粗粒度分段。
3. **首屏重量**：加载界面本身是首屏，花瓣图不能进 `preloadAll` 的关键路径；素材失败时必须仍然能加载游戏。
4. **窄屏遮挡**：花瓣层 `z-index:1`、黑带 `2`、加载角 `3`；恢复态降低透明度并暂停，避免盖住状态文字。
5. **原作合规**：只自绘/派生，不复制 `参考/loading.png` 与 `loading@ascii@7.png`；授权记录逐文件写清。
6. **“变速”语义**：速度只跟真实处理进度，不跟假计时器；百分比隐藏时不要伪造加速。

## 13. 相关状态

- PR #10：`Feat/loading screen th style`，2026-07-27 已合并；后续 `ce31a4a` 把加载层改成纸墨卡片。本方案重新采用黑带构图，但保留纸墨版建立的真实进度与恢复能力。
- PR #37 / #38：均已关闭、未合并；本文旧版里的“并行冲突”分析已失效，删除。
- 当前分支的加载层改动：`index.html` / `css/style.css` / `assets/ui/loading-bg.avif` / `assets/NOTICE.md`；落花部分（P1–P6）尚未开始。
