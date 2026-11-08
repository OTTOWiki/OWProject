# 加载界面「落花 + 变速」实施方案

> 日期: 2026-10-05
> 参考: `~/Touhou20`（TH20 的独立 C++ 源码重建，**只读**）+ 从 `th20.dat` 提取的原作加载资源 + thtk 官方仓库的指令格式表。
> 依据: 素材与语义解码见 [`.scratch/loading-petals-factsheet.md`](../.scratch/loading-petals-factsheet.md)（含逐条 `文件:行号` 证据）。
> 状态: **方案，未实施**。运行时零改动。

## 1. 参考对象的实际做法（已解出）

TH20 的加载画面**不是粒子系统**，而是**一张 256×256 贴图切成 3 块，各自跑一条小时间轴**：

| 层 | 精灵区域（`ascii.anm.txt:1658-1678`） | 动画（已解码，见事实卡 §4） |
|---|---|---|
| 少女祈祷中 | `sprite912` (1,1) 254×62 | 静止；alpha 8 帧淡入 → **20 帧一档在 255↔128 之间呼吸** |
| Now Loading | `sprite913` (1,65) 254×62 | **x: 192 → 32（4 帧，mode 4）→ 240（30 帧，mode 4）**；y 恒为 32；alpha 呼吸 + 末段 30 帧淡出 |
| 莲花 | `sprite914` (1,129) 62×62 | 由 `script17` **每 4 帧重放**；脚本内用浮点运算算位置（轨迹未完全解出，见 §7） |

三条指令承担全部动画，语义来自重建的 ANM 解释器（`sprite_renderer/anm_vm.cpp`）：

- `ins_407(dur, mode, x, y, z)` = **位置插值**（`:103-104`）
- `ins_409(dur, mode, end)` = **alpha 插值**（`:106`）
- `ins_408(dur, mode, r, g, b)` = **颜色插值**（`:105`）
- `mode` 是**缓动号**，与 STD 背景共用同一套 32 条（`ecl_vm/math.cpp:34-52`）：`0=线性`、`9=缓入缓出`、`4=另一种缓动`

**"变速"是引擎级的、免费的**：ANM 的时间推进是 `timer_tick(timer, env::timer_rate())`（`anm_vm.cpp:218,248`），而 `timer_rate` 就是全局 `clock_scale` 的别名；精灵的旋转/位移速度也乘同一倍率（`:252-254`）。
⇒ **动画时钟与游戏时钟是同一个旋钮。**

## 2. 我们这边的现状

- `index.html:13-36`：`#load-screen` 已有完整结构——`load-bg` / `load-sheet` / `load-band`（标题「棍維何意味」+ OTTOWiki Project + 虚构声明 + Presented by）/ `load-progress-panel`（少女祈祷中 / Now Loading + `#load-progress` + `#load-fill` + `#load-status` + 两个恢复按钮）。
- `css/style.css:99-131`：`load-bg` 是**纯静态**（径向渐变 ×2 + 线性渐变 + 重复线性渐变 ×2 + 一个 clip-path 多边形），`::before`/`::after` **没有任何 animation**。全库 `@keyframes` 只用在主菜单入场、暂停/结算 overlay、flash（`css/style.css:897-902, 1911-1967`）。
- `js/main.js:334+` `boot()`：`setLoadProgress(0..100)` / `setLoadProgressVisible(bool)` / `setLoadStatus(text)`，异步预载 + 缓存预热，**真实进度**（模块缓存不可计量时会把百分比隐藏，改为状态文字）。
- 生成 `<script onerror>`（`index.html:499`）与 `showBootFailure` 提供失败路径；`load-reload` / `load-continue` 是可访问的恢复按钮。

⇒ **结构够了，缺的只是动画层。**而且我们已经有"少女祈祷中 / Now Loading"的对应位置。

## 3. 设计目标（从参考里提炼的四条）

1. **落花在"Now Loading"区块**（用户明确的落点），不是全屏乱飘。
2. **变速**：动画速度与**真实加载进度**联动，而不是与墙钟死绑。
3. **一张贴图纵向下落**的实现方式（用户描述的做法）——即**用一张可平铺的花瓣纹理做垂直滚动 + 少量分层**，而不是粒子系统。
4. **可降级**：`prefers-reduced-motion` 下静态呈现；加载失败路径（`#load-status` + 按钮）必须仍然可用、可聚焦。

## 4. 实现选型

### 方案 A（推荐）：CSS 垂直滚动纹理 + 进度联动的 duration

```css
.load-petals {
  position: absolute; inset: 0;
  background-image: url("../assets/ui/petals-scroll.avif");
  background-repeat: repeat-y;            /* 纵向平铺 */
  background-size: 100% auto;
  animation: petalsFall var(--petal-dur, 14s) linear infinite;
}
@keyframes petalsFall {
  from { background-position-y: 0; }
  to   { background-position-y: 100%; }    /* 一个纹理高度 = 一个循环 */
}
```

- **"变速"**：`js/main.js` 在 `setLoadProgress(p)` 里更新 `--petal-dur`（例如 `dur = 16 - 10 * p/100`，进度越满落得越快），并同时给一个整体时间缩放变量。
- **优点**：零 JS 主循环开销；GPU 合成；不抢主线程；`prefers-reduced-motion` 直接 `animation: none`。
- **缺点**：纹理必须是**可无缝纵向平铺**的（首尾行要接得上），且只能整体变速，不能分层相位。

### 方案 B：独立 2D canvas 粒子层

- 在 `.load-bg` 上叠一个 `<canvas>`，用与 `playfieldBg` 同款离屏思路画花瓣（复用 `js/playfieldBg.js` 的 `_propsFor` 式确定性散布）。
- **优点**：分层相位、逐瓣旋转/摆动都容易；可做"进度越满越密"。
- **缺点**：加载界面本身就在抢资源（预载图片/OGG/Three），再加一个 rAF 循环不划算；`prefers-reduced-motion` 要自己实现。
- **结论**：**不推荐**做加载界面。若将来在**暂停/结算**用同样效果，再考虑。

### 方案 C：静态分层 + 少量 CSS 动画（最保守）

只做 2~3 条不同速度/透明度的滚动带（`background-position-y` 分别 14s/22s/30s），做出视差深度。

- **优点**：几乎零风险，纹理只要 3 张小图。
- **缺点**：没有"逐瓣"感。

**推荐组合：A 为主 + C 做视差分层**（同一条 `@keyframes`，三个不同 `--petal-dur` 与 `opacity` 的层）。**不引入 canvas，不引入新依赖。**

## 5. 进度联动（"变速"的具体规则）

TH20 是"动画时钟 = 全局时钟"。我们没有全局时钟，但我们有**真实进度**，比固定时钟更好：

| 进度区间 | 行为 | 理由 |
|---|---|---|
| 0–15% | 慢（如 22s/循环），花瓣稀疏 | 让"正在准备"有呼吸感，不像卡住 |
| 15–85% | 随百分比线性加速到最快（如 9s/循环） | 进度可见地"越跑越顺" |
| 85–100% | 提前减速到 16s | **避免"快好了突然冲刺"的假象**——这是最常见的加载动画错觉 |
| 完成（boot 结束） | 花瓣层 300ms 淡出，与 `#load-screen` 一起收 | 与现有移除加载层的时序对齐 |

实现要点（`js/main.js`）：

```js
// 在 setLoadProgress 内，随 p 更新 CSS 变量；不要每帧写 style，只在变化 ≥1% 时写
const dur = p < 15 ? 22 : p < 85 ? 22 - (22 - 9) * (p - 15) / 70 : 9 + (16 - 9) * (p - 85) / 15;
el.loadScreen.style.setProperty('--petal-dur', dur.toFixed(2) + 's');
```

**为什么不用 `animation-duration` 直接改**：改 `animation-duration` 会让动画**跳回相位**。用 CSS 变量参与 `animation-duration` 时同样会重算相位。**做法**：把时长变化累积成 `animation-delay` 偏移，或改用 `animation-play-state` + 一个由进度驱动的 `transform`。这条是本次实施里**最容易做错的技术点**，实施时必须实测（见 §8 验证）。

## 6. 素材

**不能使用原作贴图。** 依据：

- `assets/NOTICE.md:14-22`：BGM 是原作音乐并已按官方二创指南标注**受限**；立绘/背景为 **AI 生成**同人素材。
- 官方指南禁止「スクリーンショット、プレイ動画以外のゲーム素材を使用、公開する行為」（`NOTICE.md:16`）。原作加载贴图属于该范围。
- 我们提取出的 `loading@ascii@7.png` **只用于本次逆向参考**，放 `.scratch/`（非运行时、非提交），**不得进 `assets/`**。

**要做的事**：自绘一张**可纵向无缝平铺**的花瓣条带图。

- 生成方式走项目既有流程（`NOTICE.md:21-27` 记录的 AI 生成 + `tools/to-avif` 转 AVIF）。
- 建议规格：`512×1024`（竖条），首尾行接缝连续；含 2–4 种花瓣形态、不同大小与透明度，避免规律感。
- `assets/NOTICE.md` **必须补一条逐文件记录**（格式照 `:25` 的 `bg/battle-print.avif` 那条：生成方式 + 原图尺寸 + 明确"非原作提取"）。
  > 顺带：`assets/bg/tex_*.avif` 19 个文件目前**没有逐文件来源记录**（`:21-24` 只有整段概括），这是既有缺口，建议一并补。

## 7. 已知不确定项（实施前需补齐）

1. **莲花（`sprite914`）的完整轨迹未解出**：`script16` 用浮点运算写寄存器 `10004-10012`，而这些编号到名字的映射（thtk 的 `gvar_names` 表）**不在 thtk 仓库里**，是按游戏逐代提供的。所以"莲花是否下落"仍**未确证**——已确证的是"Now Loading 那条是横向漂移（x: 192→32→240），y 恒定"。
   ⇒ **我们按"下落"做是符合用户诉求的，但不要声称"复刻了 TH20 的莲花轨迹"。**
2. 原作屏幕缩放/放置（640×480 还是其它）未确认。
3. 若你后续能给一张**原版加载界面截图**，我可以把莲花的相位、周期、方向对出来，届时这份规格可从"横向漂移"升级为完整复刻。

## 8. 验证方式

- **单测（node）**：`--petal-dur` 由进度换算的纯函数（0/15/50/85/100 五个点 + 边界），放进新 `test/cases-loadanim.js`；不改动现有 `test/cases-*.js`。
- **e2e（Playwright）**：`test/e2e/boot.spec.js` 已有 boot 用例，扩展：
  - 加载层存在时 `.load-petals` 的 `getComputedStyle(...).animationName` 非 `none`；
  - 注入 `prefers-reduced-motion: reduce` 后为 `none`；
  - 进度推进时 `--petal-dur` 单调（先降后升）变化；
  - **不破坏现有断言**：`aria-busy`、`#load-status` 文本、`load-reload`/`load-continue` 可见性与可聚焦。
- **截图回归**：按 `AGENTS.md` 的「UI 截图对比」要求，改前/改后同状态各截一张（加载中 50%、加载完成、reduced-motion），人工并排比对；**API 动画的相位不受控，截图只比对构图/色彩/层级，不对逐帧像素**。
- **真机确认**：加载界面在低端机上是首屏，必须实测首帧时间与内存没有回归（新增 1 张 AVIF + CSS 动画，预期可忽略）。

## 9. 落地步骤（每步独立可回退）

| 步 | 内容 | 验收 |
|---|---|---|
| P1 | 产出 `assets/ui/petals-scroll.avif`（无缝纵铺）+ 补 `assets/NOTICE.md` 记录 | 首尾接缝目视连续；AVIF 体积合理 |
| P2 | `index.html` 加 `.load-petals` 层；`css/style.css` 加 `@keyframes petalsFall` 与 reduced-motion 分支 | 加载层出现落花；reduced-motion 下静态 |
| P3 | `js/main.js` 的 `setLoadProgress` 写 `--petal-dur`（纯函数抽出以便单测） | 单测绿；进度 0→100 时速度先加速后减速 |
| P4 | 完成时花瓣层与加载层同步淡出 | 无残留层、无闪烁 |
| P5 | e2e 扩展 + 截图对比 | 新用例绿，旧用例不回归 |
| P6 | 文档同步：`AGENTS.md`（若新增文件/mode）、`README.md`（若玩家可见） | 文档与代码一致 |

**红线**：不改 450×600 逻辑坐标；不引入打包器/框架；不修改 `#load-progress` 的 `role="progressbar"` 与 `aria-*`；不把版本说明/修复列表写进玩家可见文案（`AGENTS.md` 改代码约定 §11）。

---

## 10. 与并行 PR #37 / #38 的关系（2026-10-05 核对）

仓库当时有两个 open 的 UI PR，本方案也会改 `css/style.css`，因此必须先确认重叠面。

| PR | 分支 | 改动文件 | 规模 | 状态 |
|---|---|---|---|---|
| **#37** | `feat/th-ui-known-targets-clean` | `AGENTS.md` / `README.md` / `css/style.css` | +806 −115（CSS） | open，`mergeable_state: dirty` |
| **#38** | `feat/th-original-title-select` | `css/style.css` | +425 −2 | open，`mergeable_state: dirty` |

### 10.1 已核：**区域不重叠**

对两者 `pulls/{n}/files` 的 `patch` 逐条检索加载屏选择器
（`#load-screen`、`.load-bg`、`.load-sheet`、`.load-band`、`.load-progress`、`.load-fill`、`#load-progress`、`#load-fill`）：

```
PR #37  css/style.css patch 41,148 字节 → 命中 0
PR #38  css/style.css patch 14,878 字节 → 命中 0
```

并且两者都**不碰** `index.html`（#37 正文明确"不包含 index.html"；#38 只改 CSS）与 `js/main.js`（P3 的改动点）。
⇒ **本方案与它们功能无冲突**。

### 10.2 已核：插入点落在谁都不碰的区间

加载屏 CSS 在 `css/style.css` 的 **81–330 行**（`#load-screen` 起，到 `.load-action-secondary` 止）。
新增的 `.load-petals` / `@keyframes petalsFall` / reduced-motion 分支**插在该区间内**，
不追加到文件末尾——因为两 PR 的大块改动更容易落在外围区域。

### 10.3 #37 与 #38 互相竞争（不是本方案能定的）

#38 正文写明「旧产品 PR #37 不修改、不合并」，两者覆盖的是**同一批页面**（主菜单 / 难度 / 自机）。
且两者相对当前 `main` 都是 `dirty`。⇒ **先合哪个由维护者决定**，本方案不选边。

### 10.4 处理顺序（建议）

1. **文档分支可先独立合并**：本分支（`docs/th20-reference-and-plans`）**不含任何 CSS/HTML/JS 改动**，
   只加 `docs/`、`.scratch/`、`.gitignore`，且**不碰 `AGENTS.md`/`README.md`**（这两个是 #37 改的）
   ⇒ 与 #37/#38 **零冲突**，不阻塞。
2. **#37 vs #38 先定**，落地后 `main` 才稳定。
3. **落花实现单独开 PR**，基于"37/38 落地后的 main"，按 §9 的 P1–P6 做。
   若想并行开发也可以（加载区块无人动），但 merge 前需 rebase。

### 10.5 可选：彻底零冲突的做法（有代价）

把落花样式放进**独立文件** `css/load-petals.css`，在 `index.html` 的 `<head>` 加一行 `<link>`。
因为两 PR 都不改 `index.html` 的 head，这样文本冲突面为 0。

**代价**：偏离现有"单一样式表 `css/style.css`"的约定（`AGENTS.md` 目录树只列了 `css/style.css`），
且多一次请求。**默认不采用**；只有在 #37/#38 反复 rebase 导致 `style.css` 长期冲突时才值得切换。
