# 关卡背景重作：数据驱动「绘卷」系统与分面场景

> 日期：2026-11-22 · 分支：`feat/level-bg-rebuild` · 状态：实施中
> 上游方案：[`background-rebuild-plan.md`](./background-rebuild-plan.md)（P0/P1/P3 已完成；本文承接 P2 后的观感重作 P6 并落到可运行系统）
> 素材授权：见 [`assets/NOTICE.md`](../assets/NOTICE.md)

## 0. 目标与验收

用户要求：**重构关卡背景系统及设计，符合剧情、氛围；搜索并利用、处理素材搭建场景。**

| # | 验收项 | 判定 |
|---|--------|------|
| 1 | 11 个 stage × mid/boss（21 mode）都有独立场景，mid→boss 有升级 | 每 mode 有场景数据 + 实拍截图 |
| 2 | 场景叙事与章节/对话/过场诗一致 | 第 4 节逐面 brief |
| 3 | 系统数据驱动、node 可测、无新运行时依赖 | `js/bg/` + 测试 |
| 4 | 版面保持 450×600 Canvas 2D，逻辑坐标不变 | 既有硬约束 |
| 5 | 素材为公有领域/CC0 博物馆开放素材，处理后为 AVIF，来源记录完整 | `assets/NOTICE.md` + 处理脚本 |
| 6 | 弹幕可辨、HUD/题字可读、移动端不裁切 | 实拍对比 |
| 7 | 不回归：转场/回放/章节流/性能/自动测试 | `npm test` + WebView 实测 |
| 8 | 失败可兜底：素材/Plate 加载失败仍可玩 | 断网/404 注入验证 |

## 1. 现状问题（2026-11-22 实测）

- **版面**（`js/playfieldBg.js` + `playfieldBgThemes.js` + `backgrounds/atoms2d.js`，已冻结待重做）：伪 Mode-7 直路 + 12 种几何柱子；21 mode 的 `assets/bg/tex_*.avif` 只有 8 个唯一内容，且多为通用 AI 纹理（齿轮/六边形/冰晶/网格），与章节叙事无关；整体过暗、中心大片死黑、重复感强。
- **外围**（`#game-backdrop`）：全部关卡共用固定 `assets/bg/battle-print.avif`，与版面配色冲突（例：第 1 面绿色版面 + 红粉外围）。
- **左侧 Three 印象场景**：`#bg3d` 透明度 0.025，实际不可见；本轮**不动**，保持既有兜底与测试契约。
- 参考：TH14 战斗画面（暗底、高对比亮弹、装饰纹样）与 TH20 第 1 面（绘卷式森林、大圆形结界、低对比底）实际截图与本作现状对比后定方向。本机无 `参考/参考截图/` 原件（hud06 worktree 已清理），参考图存于 `.scratch/bg-refs/`（不入库）。

## 2. 视觉方向：「绘卷 × 数据」印刷舞台

- **东方原作绘卷感**：每面是一幅会呼吸的暗色绘卷——远景为公有领域日本绘画（金箔屏风、水墨、海浪、月与花草）处理后的大气底，中景是代码绘制的本作母题地标（鸟居、服务器塔、方尖碑、摩天轮、轮、霓虹、宝塔、数据门），前景为雾/粒子/暗角。
- **本作身份**：和纸、金箔、朱印、印刷颗粒 + 数据/维基母题（草稿纸、十六进制、404、署名卷轴、键政覆写）。不是复刻原作背景。
- **构图与可读性**（硬约束）：
  - 画布中心 60%×60% 区域为低对比雾/暗部，亮度（HSV V）均值 ≤ 14%，不出现高反差纹理、人脸、文字；
  - 危险/高亮信息只放边缘或与事件同步（如 Boss 出现时地标点亮）；
  - 底部预留 90px 压暗（倾向条/自机区），顶部预留 70px 压暗（Letter/分数）；
  - 亮色弹幕（白/青/粉/黄）在任意场景可辨：背景同屏高饱和像素占比 < 6%。
- **外围**：每面一张 1600×1000 暗色印刷底材（同一 master 的宽幅裁切），替换固定 battle-print；左右两侧压暗保证题字与 HUD 可读；`battle-print.avif` 保留为加载失败/首帧兜底。
- **动效**：绘卷底缓慢漂移（≤6px/s）；雾带横向漂移；粒子（草稿纸、雪、花瓣、金币、签名、糖纸、火星、雨、气泡、二进制、落叶）持续；Boss 层额外脉冲/故障/光柱。全局静止时也应有细碎运动。

## 3. 系统架构

### 3.1 文件

```
js/bg/
  schema.js      # 场景 schema 默认值 + validateScene()（纯 JS，node 可测）
  materials.js   # 素材注册/预载/染色缓存（material → tinted canvas cache）
  particles.js   # 通用粒子系统（kind: paper/snow/petal/ember/coin/rain/bubble/binary/candy/leaf/spore）
  atoms.js       # 共享 2D 原子（plate/sky/fog/clouds/torii/pagoda/lantern/banner/seal/…）
  renderer.js    # 静态层合成缓存 + 每帧合成 + 转场 + 兜底
  scenes/
    index.js     # SCENES2D 聚合；SCENE_ATOMS
    s1.js s2.js s3.js patrol.js a4.js a5.js a6.js b4.js b5.js b6.js ex.js   # 每面：mid/boss 两份场景 + 专属原子
js/playfieldBg.js      # 兼容层：export PlayfieldBackground(renderer 实例)/preloadPlayfieldBg/getPlayfieldBgModes/getPlayfieldBgPaths
js/bgModes.js          # mode 唯一登记：PLAYFIELD_BG_TEX（版面 plate 路径）、STAGE_BACKDROP（外围路径）、查询函数
js/bg/backdrops.js     # 外围底材切换（#stage-bg 元素，带淡入/失败兜底）
js/game.js / chapterFlow.js / index.html / css/style.css   # 接线与样式
```

**删除**：`js/playfieldBgThemes.js`、`js/backgrounds/atoms2d.js`（旧原子仅被旧版面使用）、`test/cases-bg-schema.js` 旧内容改写。（`backgrounds/*` Three 系统保持不动。）

### 3.2 场景数据契约

```js
/** @typedef {{
 *   mode: string, stage: string,
 *   palette: Record<string,string>,
 *   plate: { driftX?: number, driftY?: number, scale?: number, wash?: string, tint?: string },
 *   layers: Array<{ atom: string, params?: object, animate?: boolean }>,
 *   particles: Array<{ kind: string, count: number, colors?: string[], size?: [number,number],
 *                      speed?: [number,number], drift?: number, life?: [number,number], params?: object }>,
 *   fx: { vignette?: number, bottomFade?: number, topFade?: number, scanlines?: number,
 *         glitch?: number, lightRays?: number },
 * }} Scene2D */
```

- `layers` 按**从后到前**绘制；`animate:false`（缺省）烘进静态缓存，`animate:true` 每帧绘制；
- `atom` 必须存在于 `ATOMS`（共享）或该场景模块导出的 `atoms`；`params` 允许任意字段；
- 原子签名统一 `(ctx, params, env) => void`；`env = { W,H,t,dt,scroll,rand,mat,tint,palette,stage,mode,plate }`：
  - `env.mat(name)` → 灰度素材图（`assets/bg/mat/*.avif`）；
  - `env.tint(name, color, alpha?)` → 染色后的离屏 canvas（按 name+color+alpha 缓存）；
  - `env.rand(seed)` → 确定性随机；禁止 `Math.random`（不消费玩法种子流，也不可重现）；
  - `env.plate` → 当前 plate 的 HTMLImageElement（加载失败为 null）。
- 场景必须自洽兜底：plate 缺失时 `palette.sky` 渐变 + 原子仍可绘制。

### 3.3 渲染流程（`js/bg/renderer.js`）

1. `setMode(mode,{transition})`：解析场景；`prevMode` 保留用于转场；
2. 静态缓存：`(W+48)×(H+48)` 离屏 canvas；按序绘制 plate（cover + drift 余量）与 `animate:false` 层；plate onload 或材质就绪后重建；
3. 每帧：按 drift 偏移 blit 静态缓存 → `animate:true` 层（远→近）→ 粒子 → fx（雾/暗角/扫描线/故障/光柱/上下压暗）；
4. 转场（0→1，约 1.15s（`TRANSITION_DUR`））：`prev` 淡出 + `cur` 缩放淡入 + 暖白闪，保持旧观感；
5. 兜底：plate/材质失败 → 纯 `palette.sky` 渐变 + 静态层（原子不依赖图片）；渲染异常 try/catch 一次后降级为空背景并 `console.warn`，不阻塞主循环；
6. 性能预算：静态合成每次切 mode 一次；每帧 ≤ 60 次 2D 绘制调用 + 粒子（默认 ≤ 90 个），在 450×600 下目标 < 2.5ms/帧；旧 28Hz 脏标记可保留（仅重绘离屏缓存时）。

### 3.4 外围底材接线

- `index.html`：`.game-backdrop` 内新增 `<div id="stage-bg" class="stage-bg" aria-hidden="true"></div>`（battle-print 仍在 `.game-backdrop` 上作兜底）；
- CSS：`.stage-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;transition:opacity .6s var(--plain-ease,ease);} .stage-bg.has-bg{opacity:1}`；
- `chapterFlow.startChapter`：`applyStageBackdrop(bgMode, { boss: isBoss })`；
- 加载失败静默保持 battle-print；同 stage 复用不重复加载；下一面切场前 300ms 预热（可选）。

## 4. 分面设计 brief

> 每面给：剧情锚点 / 氛围句 / 素材源（PD/CC0）/ 主色 / 中景地标 / 动态 / Boss 升级。
> 素材源 key：`korin-chrysanthemums`（尾形光琳《Chrysanthemums by a Stream》CMA CC0）、
> `sotatsu-moon-grasses`（宗达《Moon and Autumn Grasses》Met PD）、
> `bokusho-ink-landscape`（墨笑《Splashed-Ink Landscape》Met PD）、
> `jakuchu-plum-moon`（若冲《White Plum Blossoms and Moon》Met PD）、
> `raijin-thunder`（宗达派《God of Thunder》CMA CC0）、
> `korin-rough-waves`（光琳《Rough Waves》Met PD）。新搜索素材以 `sources.json` 为准。

| stage | 剧情锚点 | 氛围 | 素材底 | 主色 | 中景地标（代码） | 动态/粒子 | Boss 升级 |
|---|---|---|---|---|---|---|---|
| `s1` 第1面 维基外围·零散草稿 | 草稿如落雪，在审核边缘漂泊 | 月下荒野、纸雪纷飞、远处维基聚落 | sotatsu-moon-grasses 为主，bokusho 远景 | 深松绿 `#08170f/#163326`、月光 `#cfd8c0`、春绿 `#7ee2a8`、朱印 `#c2463f` | 远景「服务器塔/藏经阁」聚落剪影；中景破损鸟居；草稿纸片带 `#{}草稿wiki` 字符 | 草稿纸雪、萤火、薄雾；月亮呼吸光 | 鸟居朱红点亮、齿轮月轮、更多纸片与金色尘埃 |
| `s2` 第2面 编辑日常·审核冲突 | 日志翻涌成潮，防火墙亮起冷光 | 冰封审核关卡、六角防火墙、雪 | raijin-thunder 冰蓝处理 + bokusho | 夜蓝 `#050e1c/#0f2d45`、冰青 `#7cc7f0`、雪白 `#d7ecff`、警戒红 `#e05555` | 巨型六角防火墙格栅 + 悬浮审核之眼（环+眼） | 雪/冰晶、数据流条、冷雾 | 眼瞳张开、格栅裂缝发光、雷光脉冲 |
| `s3` 第3面 分歧的十字路口 | 数据在此分叉；打破主防火墙方能择路 | 分岔山道、左右两座鸟居、中央断门 | korin-chrysanthemums 左冷右暖分色 + 远景 | 左铬蓝 `#8aa0b5/#1a2430`、右琥珀 `#d97a2e/#3a1a10`、中央墨 `#0d0a0c`、金 `#e8c06a` | 左右双鸟居（左冷右暖）、中央裂开的防火墙石门、分叉踏石 | A/B 旗幡、落叶、火花与雪左右分飘 | 石门全开、双色气流对撞、字号「A/B」挂幡 |
| `patrol` 中立拦截·404 | 以抹消之名，行无差别审判 | 红色警戒荒原、探照灯、故障条纹 | raijin-thunder 深红 + 自搜索「地獄草紙」可选 | 黑红 `#170406/#3a0810`、警示 `#ff3b4e`、橙 `#ffb199`、芥末 `#ffd166` | 巡查监视塔 + 旋转探照灯 + 「404 NOT FOUND」路障 | 故障扫描带、红雨、纸屑、眩光 | 全屏红闪、监视塔睁眼、404 幢幡密集 |
| `a4` A线4面 门百梁·方尖碑推销战 | 金色方尖碑缓缓回转，客服腔如蜜似刀 | 金箔集市、推销长廊、铜臭 | korin-chrysanthemums 金箔 + 新搜集市/门素材（可选） | 暗金 `#1a1206/#3a2a0c`、金 `#e3b64d`、朱 `#c8542f`、奶油 `#f3e2b6` | 方尖碑阵列 + 拱门 + 悬挂广告幡「特惠/VIP/买！」+ 价签 | 金币/票据雨、促销光柱、金尘 | 方尖碑转亮、VIP 金匾、票券风暴 |
| `a5` A线5面 主角组间冲突·署名权争夺 | 蓝白与粉红在涡旋中对撞；署名成为战场 | 双色涡旋、镜像神社、卷轴飞舞 | korin-chrysanthemums 双色处理 + korin-rough-waves | 蓝 `#6f9fd8/#0a1626`、粉 `#e89ab8/#2a0f1e`、白 `#f2e8ec`、紫 `#8a6fae` | 左右镜像神社/浮岛（蓝/粉）、中央撕裂的署名卷轴、署名印章 | 卷轴/羽毛/花瓣双向涡旋、对撞光 | 双涡合并、巨大署名封印、镜面碎裂 |
| `a6` A线6面 一美个·哈机密乐园崩坏 | 糖果外衣剥落，乐园露出锈迹 | 废墟游乐园、糖纸与铁锈、月夜 | jakuchu-plum-moon 糖果粉处理 + 新搜「花火/游园」可选 | 糖粉 `#f2a6c0`、薄荷 `#9fe0c8`、铁锈 `#8a4a3a`、夜 `#1e0e16`、金 `#e8cf9a` | 破损摩天轮 + 旋转木马顶棚 + 糖果拱门 + 剥落海报 | 糖纸/气球/锈屑下落、旋转木马灯闪 | 摩天轮转动/倾斜、糖衣剥落露黑铁、气球爆裂 |
| `b4` B线4面 赌人时尚·独轮创车冲击 | 独轮碾过螺旋街巷；「创」字诀如潮 | 血色螺旋街、巨轮、荆棘 | korin-rough-waves 血色 + 自搜「车轮/地狱」可选 | 血 `#c0263a`、夜 `#140406`、橙 `#ff6b35`、骨白 `#d9c8b0` | 巨型棘轮/独轮（发光轮辐）+ 螺旋街道 + 「创」字幡 + 荆棘 | 火星/轮尘/纸钱、巨轮滚动视差 | 巨轮加速、荆棘暴长、血色光柱 |
| `b5` B线5面 棍电噢哆·推退辩论战 | 暗巷霓虹一明一灭；推诿、反问与甩锅 | 雨夜霓虹暗巷、灯笼与招牌、积水 | bokusho-ink-landscape 夜景 + 新搜「雨夜/桥/街」可选 | 靛 `#0a1020`、霓虹橙 `#ff8a3d`、青 `#54d6d0`、灯笼暖 `#ffb15c` | 窄巷两侧木楼 + 悬挂灯笼 + 霓虹招牌「中单/推/退/锅」+ 电线杆 | 雨丝、积水涟漪、灯影摇曳、烟 | 招牌全亮、雨势加大、霓虹故障闪 |
| `b6` B线6面 拉斯特神炫·虾油风油精终局 | 虾油色的雾气升起，宝瓶碎裂无声 | 毒雾王座、防御塔、宝瓶 | bokusho-ink-landscape + korin-rough-waves 绿雾处理 | 毒绿 `#7fb52e/#1a2a08`、淡绿 `#cfe8a0`、瓶褐 `#6a5a30`、黑 `#0a1006` | 层叠宝塔防御塔 + 巨大宝瓶（倾斜/裂）+ 王座台阶 | 毒雾/气泡/孢子、绿光脉动 | 宝瓶碎裂、毒雾翻涌、塔尖齐亮 |
| `ex` EX 键政覆写 | van♂的键政灌入数据洪流；覆写仍在继续 | 数据洪流、被覆写的词条、故障神域 | korin-rough-waves + raijin + bokusho 洋红处理 | 洋红 `#d94fd0`、紫 `#6a2bb0`、青 `#5ad4e0`、墨黑 `#07040a` | 被覆写的巨大「词条门」+ 漂浮页面碎片 + 二进制雨 + van♂ 数据漩涡 | 二进制雨/页面碎片/故障带/数据火花 | 漩涡加速、全屏覆写文字闪烁、门崩解 |

> 每面 mid 与 boss 使用同一 plate（Boss 用 `palette`/`layers`/`fx` 升级 + 外围底材 CSS 饱和度/对比度微调）；`patrol` 单场景双 mode。

## 5. 素材与处理规范

### 5.1 输出清单

```
assets/bg/scene/<stage>.avif        # 版面绘卷 plate：900×1200 竖幅，中心压暗，无高对比内容
assets/bg/backdrop/<stage>.avif     # 外围底材：1600×1000，左右压暗，印刷质感
assets/bg/mat/gold.avif             # 512×512 不透明，金箔底纹（低对比、可平铺）
assets/bg/mat/washi.avif            # 512×512 不透明，和纸纤维（均值 ~55%）
assets/bg/mat/ink.avif              # 512×512 不透明，墨晕（均值 ~20%）
assets/bg/mat/wave.avif             # 1024×512 RGBA 灰度透明：浪/云带（白=不透明）
assets/bg/mat/mist.avif             # 1024×512 RGBA 灰度透明：雾带
assets/bg/mat/cloud.avif            # 1024×512 RGBA 灰度透明：云带（金屏风云形）
assets/bg/mat/grass.avif            # 1024×512 RGBA 灰度透明：秋草/芦苇剪影
assets/bg/mat/plum.avif             # 1024×512 RGBA 灰度透明：梅枝剪影
```

- `<stage>` = `s1,s2,s3,patrol,a4,a5,a6,b4,b5,b6,ex`；
- 版面 plate 中心 60% 区域亮度均值 ≤14%（V 通道），四周可到 35%；中心不放人脸/文字；
- 外围底材整体均值 ≤18%，左右各 22% 宽度额外压暗（保证题字/HUD 可读）；
- 必须检查 AVIF 实际解码效果（`magick` + WebView）；单 plate ≤120KB、单 backdrop ≤220KB，总新增 ≤3.5MB；
- 素材处理可复现：`tools/bg-assets/fetch-sources.sh`（curl/API 记录）+ `tools/bg-assets/build-assets.sh`（ImageMagick/avifenc 全量命令）；源图、许可证证据放 `.scratch/bg-assets/`（不入库）。

### 5.2 授权

- 仅 **Public Domain / CC0**，以博物馆 API 记录（Met `isPublicDomain:true`、CMA `share_license_status:"CC0"`）或 Wikimedia Commons `PD-old`/`PD` 元数据为证据；
- 不用 AI 生成、不用聚合站/Stock/“免费商用”、不用东方原作素材与同人图；
- 每个源记录：作品名、作者、年代、馆藏号、来源页 URL、图片 URL、许可证、证据文件；
- 新素材写入 `assets/NOTICE.md`（由主代理在集成时统一落笔）。

### 5.3 处理基调

- 统一「印刷化」：先取绘画 → 裁切取景 → 色阶/双色调映射到该面主色 → 压暗 + 暗角 + 和纸纤维/颗粒 → 中心低频化（模糊/雾）；
- 保留原作笔触与金箔/墨韵，不描摹原作角色；避免出现可辨识宗教造像（雷神面部需避开或裁掉）；
- 外围可保留屏风折痕/装裱边作为印刷质感。

## 6. 验证与证据

- 自动：`npm test`（`test/cases-bg3d.js`：21 mode builder/镜头导演/过渡/层叠/确定性守卫；`test/cases-bg-schema.js`：2D 兜底 schema/atom/材质路径；`test/cases-bg-rng.js`、`cases-bg-easing.js`）；
- 实拍（WebViewProbe）：每面 mid/boss 版面 450×600 + 全屏 1365×900（含外围）；抽查 844×390 横屏；捕捉转场中帧；
- 对比：改动前 baseline 截图（旧系统 21 mode 已有 `.local-evidence/bg-p1/before/`；本轮再拍真实游戏画面 baseline）；并排报告记入 `.local-evidence/level-bg/report.md`；
- 可读性：中心亮度/方差实测、亮弹幕对比度抽检；HUD 文字与题字遮挡检查；
- 兜底：拦截 plate/backdrop 请求 → 仍可玩、不报错、有纯色/渐变兜底；
- 性能：`owDebug`/`performance.now()` 采样背景绘制时间、WebView 帧率；
- 文档同步：`AGENTS.md`、`README.md`、`assets/NOTICE.md`、本文件、`background-rebuild-plan.md` 状态、`docs/refactor-queue.md` 勾选。

## 7. 风险

| 风险 | 对策 |
|---|---|
| 素材处理偏亮/偏花 → 弹幕可辨性下降 | 中心亮度/对比门禁 + 逐面实拍复核 |
| 场景代码量膨胀、21 mode 不一致 | 数据驱动 + 共享原子 + 每面 brief；schema 测试 |
| 外围换底材造成 HUD 可读性回退 | 左右压暗处理 + 实拍 1365/1264/844 复核 |
| AVIF/素材加载失败 | battle-print + palette 渐变兜底 |
| 旧测试引用被删模块 | 改写 `cases-bg-schema` / `cases-stages` 引用，保持测试全绿 |
| 性能回退 | 静态缓存 + 每帧预算 + 实测 |

---

## 8. 方向修正（2026-11-22）：3D 深入场景 + Billboard + 真 3D + 超现实

> **历史记录**：本节为第一次 3D 方向修正时的实现快照。当前实现已由 §9（超写实超现实）、§9.2b（每关镜头导演）取代：PBR 材质（非 Lambert）、40fps 渲染上限、相机由 `js/bg3d/cameraDirectors.js` 的每关导演驱动（非固定机位）。

> 用户明确修正：**版面场景应为不断深入的 3D 场景，配合 Billboard 技术与真 3D 物体混合的景物，并利用超现实主义手法。**
> 因此第 2–7 节的 Canvas 2D 绘卷系统降级为 **WebGL 不可用时的兜底**；主实现改为本节。

### 8.1 架构

```
js/bg3d/
  kit.js        # 3D 工具包：材质/绘卷裁片/鸟居/宝塔/方尖碑/棘轮/摩天轮/灯笼/六角格栅/眼/宝瓶/门/粒子/地面/氛围
  stage3d.js    # PlayfieldStage3D：WebGLRenderer(450×600) + 相机 + 景物循环逼近 + 动画/粒子/雾 + 场景切换
  scenes/       # 每 stage：mid/boss builder（export function mid(ctx)/boss(ctx)）
    index.js    # 21 mode → builder
js/playfieldBg.js  # createPlayfieldBackground()：3D 优先，失败回退 2D 绘卷；保留旧 API
index.html / css   # #playfield-bg3d WebGL canvas 位于 #playfield 之下；2D 版面 canvas 保持透明
```

- 相机固定于原点；景物沿 +Z 循环逼近（z > -10 回卷）→ **不断深入**；指数雾 + 相机漂浮制造空气透视。（§9.2b 起相机改由每关镜头导演驱动）
- **Billboard**：`ctx.plateTexture()` / `ctx.plateCrop(sx,sy,sw,sh)` 把公有领域绘卷裁成多幅悬浮画幅；
  `ctx.textSprite()` 生成文字的 Billboard；`kit.sprite()` 始终面向相机。
- **真 3D 物体**：`kit.torii/pagoda/obelisk/spokedWheel/ferrisWheel/lantern/hexLattice/eye/bottle/gate/ground`，
  混合进同一纵深；材质用 Lambert + emissive 保证暗色舞台中的可读性。（§9 起改为 PBR + IBL + 实时阴影）
- **超现实**：倒置鸟居/宝塔、漂浮巨月与齿轮月轮、悬空巨轮、门内双色光、漂浮画幅拼贴、数据门等。
- **回退**：Three/WebGL 失败或场景构建异常 → 自动使用 Canvas 2D 绘卷（第 2–7 节系统）；
  左侧 `#bg3d` Three 印象场景在版面 3D 启用时不再渲染（opacity 0.025 且被覆盖，省 GPU）。
- 性能：WebGL 450×600、pixelRatio 1、最高 45fps 渲染（背景慢速运动）；2D 弹幕层不变。（§9 起调整为 40fps + HDR 后处理）

### 8.2 builder 契约（scene 模块）

```js
export function mid(ctx) {
  const { palette, K } = ctx;                 // palette 为 3D 数值色（skyTop/skyBot/ink/accent/accent2/glow/fog/seal/ambient）
  ctx.atmosphere({ bg: palette.skyBot, fogColor: palette.fog, fogDensity: 0.02,
                   ambient: palette.ambient, dirColor: palette.glow, dirIntensity: 0.7 });
  ctx.add(K.ground({ y: -10, color: palette.ink }));
  ctx.field((i) => K.torii({ color: 0x6a2630 }), { count: 5, zNear: -22, zFar: -90, xRange: 26, xAbsMin: 12 });
  ctx.animate(obj, { spinZ: 0.2, bob: { amp: .3, speed: .5 }, pulse: { amp: .06, speed: 2 } });
  ctx.points({ count: 80, color: 0xf0ead4, size: .16, type: 'paper', xRange: 26, yRange: 22, zNear: -4, zFar: -70, speed: 2 });
  ctx.textSprite('404', { x: -6, y: 5, z: -20, w: 5, h: 2.4, fill: '#ffd166' });
  ctx.setSpeed(12); ctx.setSway(0.6, 0.35);
}
```

- 只用 `ctx.K` / `ctx.*` 提供的 API；禁止 DOM 事件、网络、Math.random、Date.now；随机用 `K.hash01(seed)` / `K.rr(seed,min,max)`。
- 大物体（鸟居/塔/门）用 `xAbsMin` 让出中心；`zNear ≤ -20` 避免糊脸；中心 60% 保持低对比、亮弹幕可辨。
- 3D 场景文件是主实现；`js/bg/scenes/<stage>.js`（2D）保留为兜底，不再投入美术迭代。
- 预览/自检：`bash .scratch/bg-capture.sh <out.png> 'http://127.0.0.1:3125/.scratch/bg3d-sheet.html?modes=<modes>&cb=<唯一>&cols=2&cw=430' 900 2400 12000`
  → `read_image` 检查（等待加载 three+素材约 10s）。

---

## 9. 第二次方向修正（2026-11-22）：超写实 × 超现实

> 用户指令：「改良成超写实风格的超现实主义，请尽情发挥。」
> §8 的 3D 骨架保留，渲染与材质升级为电影级；画面语言 = **真实材质与光照下的不可能场景**。

### 9.1 渲染链（`js/bg3d/stage3d.js`）

```
PBR 场景（程序化 albedo/normal/roughness + 程序化 IBL 环境 + 实时阴影）
  → HDR(半浮点) RenderTarget
  → 亮部提取（阈值 0.82）
  → 两级可分离高斯泛光（1/4 分辨率，9-tap）
  → 合成：ACES 色调映射 + 阴影/高光双色分级 + 色散 + 暗角 + 胶片颗粒 + sRGB
  → #playfield-bg3d
```

- 相机 fov 54、y≈1.4 眼高、极轻微手持漂浮；景物沿 +Z 循环逼近；WebGL 渲染上限 40fps。
- **层叠硬约束**：`#playfield-bg3d`（z0）必须在透明 2D 版面 canvas `#playfield`（z1）之下；`#playfield` 的 CSS 背景必须为 `transparent`，否则会完全遮住 3D 舞台（2026-11-22 实机排查结论）。
- **无视觉影响的减压/自测参数**（默认全部关闭，不改变美术效果）：
  - `?bgscale=0.5~1`：内部 3D 渲染分辨率缩放（CSS 仍铺满 450×600，默认 1）
  - `?bgshadow=256~1024`：阴影图尺寸（默认 1024）
  - `?bgpost=0`：跳过泛光/色调后处理（仅诊断用，会改变观感）
  - `?no3dleft=1`：跳过左侧 `StageBackground` WebGL 上下文（版面 3D 启用时该层本就不渲染，画面不变）
  - `?bg2d=1`：强制 2D 绘卷兜底（功能验证用）
- 失败兜底：后处理异常 → 直出渲染；Three/WebGL 整体失败 → 2D 绘卷兜底（`js/bg/`）。
- 阴影：`PCFShadowMap` 1024²、方向光 `shadow.camera` 45×45；小碎块由 builder 传 `{castShadow:false}` 省开销。

### 9.2 材质与氛围（`js/bg3d/kit.js` v2）

- **程序化 PBR 材质**：`materialTextureSet(kind)` 生成 albedo / normal / roughness 三图（值噪声、木纹、金属拉丝、锈斑、湿沥青、纸纤维、水面涟漪等），带 sRGB/重复/mipmap；`pbr(color,{kind})`、`glass()`、`emissive()`。
- **IBL 环境**：`environment(renderer, mode, palette)` 程序生成 equirect 天空（双月、云带、地平雾）→ PMREM；同时作为可见天空背景与反射环境；每 mode 缓存、上限 3 张。
- **真实景物**：PBR 鸟居（朱漆/风化木、曲线笠木、注连绳/纸垂）、宝塔（石木、发光纸窗、风铎）、金/石方尖碑、锈蚀棘轮、摩天轮（玻璃吊舱+灯串）、纸灯笼（发光纸+可选点光）、湿润巨眼（巩膜清漆、程序化虹膜纤维、角膜透射）、玻璃宝瓶（MeshPhysical transmission）、巨门（石/金属+发光门芯+点光）。
- **超现实部件**：`moon`（陨石坑巨月+大气光晕）、`skyEye`、`volumetricBeam`（体积神光）、`mistSheet`（滚动噪声雾墙）、`waterFloor`（法线反射水面）、`floatingRocks`、`coinField`（实例化金币）、`shardField`（玻璃碎镜）、`curtain`（CPU 摆动布幔）、`lightString`、`artPanel`（悬浮绘卷画幅）、`giantSeal`（发光巨型封印）、`hangingLights`、`hexLattice`（发光电路格栅）。
- 既有 PD/CC0 绘卷仍作为**真实表面上的绘卷/壁毯/艺术画幅**出现（Billboard/artPanel），不是平面贴图背景。

### 9.2b 每关独立镜头导演与场景过渡（2026-11-22 第四次修正）

用户要求：「给每关镜头都做单独设计，手段要有变速、转向（不要每关都全部塞一遍…自由使用其它手段）。」

- **结构**：`js/bg3d/cameraDirectors.js` 为 21 个 mode 各写一套导演（`sample({u,t,...}) → {x,y,z,lookX,lookY,fov,roll,gain}`）。
  章节内时间驱动、确定性、不进玩法随机流；`stage3d` 只负责应用结果与场景过渡。
  `makeCameraDirector` 在模块边界统一把 `u` clamp 到 0..1（抵达后保持，轻摆只用 `t`），防止长时间章节里相机无限前飞。
- **每关镜头语言各不相同**（不是一套模板换参数）：
  - s1 草稿：慢出发→回廊加速→巨月前收住抬头；boss 起手后退半步再冲刺急停。
  - s2 审核：机位偏高、被「扫描」式步进推进，视线在悬浮巨眼间缓慢巡检；boss 快速左右扫视 + 两次审查急停。
  - s3 分歧：到路口后向左看 A 门、向右看 B 门再收回中心（抉择），boss 加速冲门 + 震动。
  - patrol 404：探照灯式扫视、突然转向盯住 404 幢幡、雨夜步进推进。
  - a4 集市：横向逛市（strafe）、走走停停、视线左右扫过摊位与广告；boss 拍卖高潮甩头看价签/金匾。
  - a5 镜像：左右对称浮岛间缓慢摇移；boss 对称环绕加快、末段视线对撞并轻微后拉。
  - a6 乐园：矿车式颠簸，扬起看摩天轮、俯冲、左右摇晃；boss 设施失控（快速抖动、下坠、车体倾斜）。
  - b4 巨轮：低机位、随巨轮转动的车身侧倾、加速/刹车；boss 在双轮间穿插、大幅侧倾。
  - b5 雨巷：沿巷跟踪、巷口「转角」转头看霓虹、终段仰拍大招牌；boss 仰头看世界第一等招牌 + 故障 FOV。
  - b6 王座：觐见式缓慢升高、仰望王座与宝瓶；boss 绕王座半圈环绕后停在正对宝瓶。
  - ex 覆写：数字故障感：步进推进、定时 90° 甩头、roll 抽搐；boss 高速冲刺 + 连续甩头 + 故障抖动。
- **场景过渡**（保留）：切 mode 前捕获旧后处理画面，1.05s 交叉淡化 + 反向推镜 + 闪白 + 墨迹扰动；日常帧零额外 pass。
- **UI 底材过渡**（保留）：`#stage-bg` / `#stage-bg-next` 双层 0.6s 交叉淡入，失败保留旧层。
- 减少动态效果（prefers-reduced-motion）：导演照常但过渡退化为闪白/立即切换（后续可加导演级降级）。

### 9.3 分面气质（超现实母题）

| stage | 场景 | 超现实 |
|---|---|---|
| s1 | 镜面浅水上的无限鸟居回廊、暖灯笼、巨月 | 倒悬鸟居、天空倒影回廊、悬浮绘卷、赤月齿轮 |
| s2 | 冰封审核圣殿、六角电路墙、冻原 | 巨眼巡天/悬浮之眼、倒悬冰塔、巨墙雷光 |
| s3 | 虚空双色神殿、悬空石道、防火墙巨门 | A/B 巨型悬浮封印、倒影第三门、双色对撞光 |
| patrol | 雨夜荒原监视塔、旋转探照灯、404 全息 | 倒悬监视塔、天空巡回之眼、漂浮 404 |
| a4 | 金箔集市/方尖碑阵列/推销巨门 | 倒悬方尖碑、悬浮铜钱与价签、VIP 无限门廊 |
| a5 | 蓝粉镜像神社浮岛、署名巨卷 | 双岛互旋、天降署名封印、镜面碎裂 |
| a6 | 糖粉崩坏乐园、倒置摩天轮、融化糖果 | 糖衣剥落露黑铁、气球爆裂、漂浮海报 |
| b4 | 血红隧道、巨轮与荆棘、雨湿血水 | 巨轮爬升旋转、纸钱龙卷、倒转轮 |
| b5 | 霓虹雨巷、灯笼串、招牌与积水 | 招牌脱离墙体、无限巷、倒立霓虹 |
| b6 | 毒雾王座、玻璃宝瓶、宝塔防御塔 | 碎裂悬浮宝瓶、倒悬塔群、绿色巨眼 |
| ex | 数据门、页面风暴、服务器碑林 | 门崩解为两半、全屏覆写、无尽数据回廊 |

### 9.4 性能（WebView 实机，450×600）

- 全 21 mode：update 均值 0.011ms/帧，渲染均值 **5.23ms/帧**，最差 **6.95ms/帧**（PBR+阴影+后处理全开）；最大对象数 176。
- 游戏内渲染上限 40fps，主循环 60Hz；对弹幕层无额外 Canvas 开销。
