# 加载界面「黑带 + 落花」实施方案

> 日期：2026-11-08
> 参考：[PR #10](https://github.com/OTTOWiki/OWProject/pull/10)（已合并，2026-07-27）+ [`参考/loading.png`](../参考/loading.png)（TH20 原版加载画面，仅作构图参考）
> 依据：TH20 素材与 ANM 语义见 [`.scratch/loading-petals-factsheet.md`](../.scratch/loading-petals-factsheet.md)（逐条 `文件:行号` 证据）。
> **状态**：开屏黑带复刻、真实进度、恢复面板、落花与进度联动 **均已实施**（2026-11-08）。落花素材为 FreeGameSprites CC0 水彩樱花，处理成 512×1024 无缝纵铺纹理；不使用原作像素。

## 0. 一句话

保留 PR #10 真正有效的部分——**满幅暗色幻想底 + 贯穿屏幕的中央黑带 + 右下角「少女祈祷中／Now Loading」**；丢掉它的错字、低清底图、无状态/无恢复、移动端硬贴角；落花已作为下一层动画接入，用**一张无缝纵铺纹理 + 真实加载进度驱动的播放速率**实现，不引入粒子系统或 rAF 主循环。

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
- `.load-petals`（z-index 1）：两层 `.load-petals-layer`，同一张 `petals-scroll.avif` 纵向平铺；`.load-petals-near` 用径向 mask 聚在加载角，`data-petal-speed` 区分远近；恢复态整体降到 `0.16`。
- 断点：
  - `≤720px`：`#load-screen` 改 flex；黑带 `margin: auto 0` 纵向居中；加载角贴底、避让 safe-area。
  - `(max-width:720px) and (max-height:520px)`：极矮竖屏改为上下排布，优先保证加载角与恢复按钮可见。
  - `(max-height:620px) and (orientation:landscape)` 或 `(min-width:721px) and (max-height:620px)`：黑带与加载角改上下排布，防横屏/矮屏重叠。
  - `aria-busy="false"`：整页改 flex 流式；黑带置顶，`.load-corner` 变成居中的暗色状态面板，320×568 也完整可见。
  - `prefers-reduced-motion`：停掉漂移、淡入与进度条过渡；JS 也不创建落花 WAAPI。

### 2.3 JS 状态

`js/main.js` 的加载链路与 `js/loadingPetals.js` 控制器：

- `setLoadProgress(pct)`：真实“已处理资源 / 总数”，同步 `#load-fill` 宽度、`#load-text` 与 `aria-valuenow`。
- `setLoadProgressVisible(bool)` / `setLoadStatus(text)`：资源不可计量时隐藏百分比，只保留状态文字。
- `waitForLoaderChoice(issues)`：可恢复问题出现时隐藏进度、展示「继续进入 / 重新加载」。
- `setRecoveryControls()`：统一写 `aria-busy`，并把焦点交给「重新加载」。
- `showBootFailure()`：核心失败时保留加载层，只给「重新加载」。
- `dismissLoadScreen()`：初始化与恢复选择都完成后才移除加载层。
- `initLoadingPetals(elLoad)`：为两层创建 WAAPI `backgroundPositionY` 动画，初始 `playbackRate = petalPlaybackRate(0)`；`setProgress` 只改倍率，`setPaused` 暂停/恢复，`cancel` 在移除前取消。
- `setLoadProgress(pct)` 末尾同步 `loadingPetals?.setProgress(p)`；`setRecoveryControls()` 在 `aria-busy="false"` 时暂停；`dismissLoadScreen()` 取消。

**`aria-busy` 同时是布局开关**：`true` 是开屏，`false` 是恢复页。不要另加一套 `load-failed` 类，避免两套状态漂移。

### 2.4 素材与授权

- `assets/ui/loading-bg.avif`：1440×900，18KB；以 `assets/bg/difficulty-cathedral.avif` 为底，压暗、暗角、颗粒后导出；**不含 `参考/loading.png` 的像素**。
- `assets/ui/loading.avif`：既有 128×128 暗纹理，仅作黑带材质叠加。
- `assets/ui/petals-scroll.avif`：512×1024，14KB，38 片；由 [FreeGameSprites「Cherry Blossom Petals」](https://freegamesprites.com/en/assets/cherry-blossom-petals)（CC0 1.0）的 256×256 透明水彩图裁出三片花瓣重排；源图与处理脚本不进运行时。
- `assets/NOTICE.md` 已补 `loading-bg` / `loading` / `petals-scroll` 三条逐文件记录。

### 2.5 本轮验证

- `npm test`：117 pass / 0 fail（新增 3 条落花速率用例）。
- 系统 Chromium + Playwright（Android 平台 shim）实测：
  - 1365×900：真实进度 64% 开屏，两层花瓣各 1 个 WAAPI；64% 时 near=1.5、far=1.08；花瓣不遮标题。
  - 390×844 / 320×568：花瓣聚在右下加载角，恢复面板与 44px 按钮仍清晰可见。
  - 恢复态：两层动画 `paused`；`prefers-reduced-motion`：动画数 0。
  - `pageerror` 为空。
- 定向 e2e：`boot.spec.js` 4 + `loading-petals.spec.js` 3，共 7/7 通过（系统 Chromium + shim）。完整 `npm run test:e2e` 仍未在本机跑：标准 runner 在 Termux/Android 报 `Unsupported platform: android`；CI 的 `Test` / `E2E` 仍是合并门禁。

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

## 5. 实现选型（已采用 A + C）

### 方案 A（已采用）：CSS 纵铺 + Web Animations API 调速

实际 CSS（节选）：

```css
.load-petals {
  position: absolute; inset: 0; z-index: 1;
  pointer-events: none; overflow: hidden;
}
.load-petals-layer {
  position: absolute; inset: -12% 0;
  background: url("../assets/ui/petals-scroll.avif") center top / calc(100% * var(--petal-scale, 1)) auto repeat-y;
  will-change: background-position;
}
.load-petals-far { --petal-scale: 1; opacity: .34; }
.load-petals-near {
  --petal-scale: 1.38;
  opacity: .64;
  -webkit-mask-image: var(--petal-mask);
  mask-image: var(--petal-mask);
}
```

用 WAAPI 驱动 `background-position-y`，位移必须等于一个纹理高度：

```js
const width = layer.getBoundingClientRect().width;
const scale = parseFloat(getComputedStyle(layer).getPropertyValue('--petal-scale')) || 1;
const tileHeight = (1024 / 512) * width * scale;
const anim = layer.animate(
  [{ backgroundPositionY: '0px' }, { backgroundPositionY: `-${tileHeight}px` }],
  { duration: 18000, iterations: Infinity, easing: 'linear' },
);
anim.playbackRate = petalPlaybackRate(progress) * speed;
```

- **为什么不用 `0% → 100%`**：background-position 百分比按“容器高度 - 图片高度”换算，不等于一个纹理周期；两层会在循环点跳一下。按像素移动一个 tile 高度才能无缝。
- **为什么不用 `animation-duration` 随百分比改**：改时长会重算相位；`playbackRate` 只改速度，不重置相位。
- 两层共用同一套算法；far `data-petal-speed="0.72"`、near `1`，near 的 `--petal-scale:1.38` 再形成尺度/速度视差。
- 不支持 WAAPI 时保持静态纹理（方案 C），不伪造动画。

### 方案 B：独立 2D canvas 粒子层

- 优点：逐瓣旋转、摆动、密度都容易。
- 缺点：加载界面正在抢图片/OGG/Three 资源，再加 rAF 循环不划算；`prefers-reduced-motion` 要自己实现。
- **结论：不用于加载界面。**

### 方案 C：静态分层

`prefers-reduced-motion`、浏览器不支持 WAAPI 或素材失败时，纹理仍静态显示；不阻塞加载。

**采用组合：A + C。**

## 6. 素材：CC0 在线素材处理

`assets/ui/petals-scroll.avif`（已产出）：

- **512×1024**，带 alpha，38 片花瓣，**14KB**；首尾纵向接缝已实测无横线。
- 来源：[FreeGameSprites — Cherry Blossom Petals](https://freegamesprites.com/en/assets/cherry-blossom-petals)，页面标注 **CC0 1.0**（公共领域）；原图 256×256 透明水彩樱花。
- 处理：从原图裁出三片独立花瓣（避开整朵花与叶片），本地用 Pillow 以固定 seed 重排到 512×1024；上下越界花瓣在 y±1024 处复制，保证纵铺无缝。
- 处理脚本与源图只在 `.local-evidence/loading-petals/source/`（本机分析产物），不进运行时。
- `assets/NOTICE.md` 已记录来源、许可证与“非原作提取”。

若替换素材，仍须满足：512×1024 / alpha / 纵铺无缝 / <40KB / CC0 或明确可商用；不要使用 `参考/loading.png`、TH20 原贴图或来源不明的素材。

## 7. 进度 → 播放速率

纯函数在 `js/loadingPetals.js`（已单测）：

```js
export function petalPlaybackRate(pct) {
  const n = Number(pct);
  const p = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  if (p < 15) return 0.55 + (p / 15) * 0.25;
  if (p < 85) return 0.8 + ((p - 15) / 70);
  return 1.8 - ((p - 85) / 15) * 0.8;
}
```

| 进度 | 行为 | 理由 |
|---|---|---|
| 0–15% | 0.55→0.80，慢 | 给“正在准备”呼吸感，不像卡住 |
| 15–85% | 0.80→1.80，线性加速 | 进度可见地越跑越顺 |
| 85–100% | 1.80→1.00，提前减速 | 避免“快好了突然冲刺”的假象 |
| 恢复态 `aria-busy="false"` | `pause()` | 状态面板优先，不抢注意力 |
| `prefers-reduced-motion` | 不创建动画 | 静态纹理即可 |

实测 64% → `petalPlaybackRate = 1.5`；far 再乘 0.72 → 1.08。速率只由**真实已处理资源数**驱动；模块缓存不可计量、百分比隐藏时保持 1.0，不假装加速。

## 8. DOM / CSS 接入（已实施）

```html
<div class="load-petals" aria-hidden="true">
  <span class="load-petals-layer load-petals-far" data-petal-speed="0.72"></span>
  <span class="load-petals-layer load-petals-near" data-petal-speed="1"></span>
</div>
```

- `.load-petals` z-index 1，`.load-band` z-index 2，`.load-corner` z-index 3；花瓣不盖文字、不拦截指针。
- `.load-petals-near` 用 `--petal-mask` 的径向渐变聚在右下加载角；矮屏/横屏把 mask 中心改到 `50% 82%`，与居中的加载角对齐。
- `mask-image` 不支持时整层仍显示，只是分布更均匀；不会影响加载。
- 恢复态：`#load-screen[aria-busy="false"] .load-petals { opacity:.16; }`，动画由 JS 暂停。
- 淡出：`dismissLoadScreen()` 前 `cancel()`，避免移除后残留动画。

## 9. 启动与进度接线（已实施）

`js/main.js` 没有把花瓣图加入 `preloadAll`；素材随 CSS 加载，不拖慢真实进度。

1. `boot()` 里 `initLoadingPetals(elLoad)`；查询不到 layer 或 API 不支持时 no-op。
2. 初始 `playbackRate = petalPlaybackRate(0)`；`setProgress` 只改倍率。
3. `setLoadProgress(pct)` 同步 `loadingPetals.setProgress(p)`；不写布局。
4. `setRecoveryControls()` 写 `aria-busy` 时同步 `setPaused(!busy)`；`dismissLoadScreen()` 取消。
5. `prefers-reduced-motion` 初始化时读一次；不创建动画。
6. `resize` 时重建动画，按新宽度重算 tile 高度；保持无缝。
7. 可选：`visibilitychange` 暂停/恢复，本轮未加（加载层通常短时存在）。

## 10. 验证（本轮结果）

### 单元（node）

- `test/cases-loadanim.js`：0/15/50/85/100 关键点、0→85 单调加速、85→100 减速、非法/越界 clamp。
- `npm test`：**117 pass / 0 fail**；`test:syntax`：OK 131 files。

### E2E（Playwright）

- `test/e2e/loading-petals.spec.js`：
  - 两层各 1 个 WAAPI；完成后随加载层移除。
  - `prefers-reduced-motion` 下 0 动画，静态层仍在。
  - 可恢复失败时两层 `paused`，继续按钮可用。
- 本机用系统 Chromium + 平台 shim：`boot.spec.js` 4 + `loading-petals.spec.js` 3 = **7/7**。完整 `npm run test:e2e` 仍未在本机跑（Android/Termux 平台限制），CI 为准。
- 实拍：1365×900 / 1264×625 / 390×844 / 320×568 / 844×390；恢复态 390；reduced 1365。花瓣不遮标题、不压按钮；桌面比移动端略稀（纹理按视口宽度缩放，可见 tile 比例不同）。

### 截图与实拍

- 证据存 `.local-evidence/loading-petals/`（本地，不入库）；与 `参考/loading.png` 并排检查“满幅底 + 黑带 + 右下加载角 + 落花”的相似度。
- 只比对构图/色彩/层级，不对逐帧像素；动画相位不受控。
- 低端机首帧未测：新增 14KB AVIF + 2 条 `background-position` 动画；若掉帧，先减到单层或静态。

## 11. 落地步骤（当前状态）

| 步 | 内容 | 状态 | 验收 |
|---|---|---|---|
| P1 | 产出 `assets/ui/petals-scroll.avif` + `assets/NOTICE.md` 记录 | **完成** | 512×1024、38 片、14KB；纵铺接缝目检无横线 |
| P2 | `index.html` 加 `.load-petals` 两层；CSS 加纵铺/遮罩/降级 | **完成** | 花瓣不遮标题；320/390/844 加载角不压按钮 |
| P3 | 新增 `js/loadingPetals.js`（纯函数 + WAAPI）；`main.js` 接线 | **完成** | 3 条单测绿；64% 时 near=1.5 |
| P4 | 恢复/致命失败/淡出时暂停或取消动画 | **完成** | 恢复态 `paused`；reduced 0 动画；移除后 cancel |
| P5 | e2e + 四档截图 + 真机首帧 | **部分** | 定向 e2e 7/7；四档截图完成；低端真机首帧未测 |
| P6 | 文档同步：`AGENTS.md` / `README.md` / `assets/NOTICE.md` | **完成** | 文档与代码一致 |

**红线**：不改 450×600 逻辑坐标；不引入打包器/框架；不动 `#load-progress` 的 `role`/`aria-*`；不把版本说明/修复列表写进加载文案；不使用 `参考/loading.png` 或 TH20 原贴图像素。

## 12. 风险与未决

1. **无缝接缝**：当前纹理已实测无横线；替换素材时必须重新做 y±1024 复制并复检。
2. **相位跳变**：已用 WAAPI `playbackRate` 规避；不要改回 `animation-duration` 随进度变化。
3. **首屏重量**：花瓣图 14KB，未进 `preloadAll`；素材失败/不支持 WAAPI 时只是没有动画，加载仍可用。
4. **窄屏遮挡**：花瓣层 z-index 1、黑带 2、加载角 3；恢复态降到 0.16 并暂停，320×568 已实拍。
5. **原作合规**：使用 CC0 素材并记录；不复制 `参考/loading.png` 与 `loading@ascii@7.png`；`assets/NOTICE.md` 已写清。
6. **“变速”语义**：速度只跟真实处理进度；百分比隐藏时不要伪造加速。
7. **绘制成本**：`background-position` 动画可能走绘制而非合成；加载层短时存在，暂未做低端机帧率实测。若掉帧，先减到单层/静态，不要加 rAF。
8. **密度随视口变化**：纹理按视口宽度缩放，桌面可见 tile 比例小、花瓣比移动端稀；这是当前实拍观察，若要求一致密度需另做固定尺寸 tile 或第三层。

## 13. 相关状态

- PR #10：`Feat/loading screen th style`，2026-07-27 已合并；后续 `ce31a4a` 把加载层改成纸墨卡片。本轮重新采用黑带构图，保留纸墨版建立的真实进度与恢复能力。
- PR #37 / #38：均已关闭、未合并；旧版“并行冲突”分析已失效，删除。
- 本轮落花实现：`index.html` / `css/style.css` / `js/loadingPetals.js` / `js/main.js` / `assets/ui/petals-scroll.avif` / `assets/NOTICE.md` / `test/cases-loadanim.js` / `test/e2e/loading-petals.spec.js`；素材来源 FreeGameSprites CC0。
- 当前状态：P1–P4、P6 完成；P5 的低端真机首帧与完整 CI E2E 仍待执行。
