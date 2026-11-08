# 背景系统重作方案（参考 TH20 STD 数据驱动背景引擎）

> 日期: 2026-10-05
> 参考对象: `~/Touhou20`（TH20 的**独立 C++ 源码重建**，`source_reconstruction/stage_background/`）——参考仓库**全程只读**。
> 方式: **未改动任何运行时代码**。本文档是方案，供你决定是否实施。
> 配套证据: `.scratch/th20-std-factsheet.md`（主代理自查事实卡，含逐 opcode 表）、`~/ow-th20-handling-research.md`（手感方向，非本文）。

## 0. 一句话结论

**TH20 的背景是真正的数据驱动引擎；架构值得抄，实现不值得抄。**
推荐路线：**版面背景保持 Canvas 2D，把两层手写分支改成"数据表 + 解释器"**；**左侧 Three 面板数据化**（收益最直接）。**不要把版面背景搬上 Three。**

---

## 1. TH20 背景引擎解剖（全部经主代理或子代理读源码确认）

### 1.1 数据模型（STD）

`source_reconstruction/stage_background/background.hpp`：

| 结构 | 尺寸 | 字段 |
|---|---|---|
| `Header` | 0x90 | `object_count, animation_count, instance_offset, script_offset, animation_name[128]` |
| `Object` | 0x30 | `id, layer, flags, parameters[11]` |
| `Primitive` | 8 | `type, size, script_index, animation_index` |
| `Instance` | 16 | `object_id, unknown, position` |
| `Instruction` | 8 | `time, opcode, size`（参数跟在结构体后） |

人类可读形态（thtk `thstd -d20` 反编译，且 191 个脚本档案「文本→重编译」**逐字节一致**，`reports/assets_recovery.md:84-85`）：`ANM:` → 若干 `ENTRY:`（= Object，其下 `QUAD:` = Primitive）→ `INSTANCE:` 列表 → `SCRIPT:` 时间轴（标签 `740:` = 第 740 帧）。

**11 个 float 参数**——只列已确证的：`[0]` 剔除模式（按 int32 位模式读，非 0 = 永不剔除，`object_projection.cpp:27`）、`[1]/[2]` 每 tick 自转角速度/当前角（`update.cpp:26`）、`[5..7]` 剔除盒中心、`[8..10]` 剔除盒尺寸（取半）。`[3]/[4]` **未确证**（恢复代码未读取，10 个 STD 全为 0）。

> **陷阱**：`.std.txt` 的字段名是 thtk 沿用的旧名，**与引擎实际用途不符**。dump 里叫 "Position/Depth/Width/Height" 的槽位在 TH20 里已不是这些含义（映射见 `tools/asset_thtk_th20.patch:88-100`）。引用字段语义必须回看 `background.hpp` 与读取点，不能信 dump 的表头。

### 1.2 脚本 VM 的能力边界

`stage_background/vm.cpp:22-60` 是全部能力（我逐行读过）：

- **按帧推进**：取当前指令，若 `timer.current < instruction.time` 则 **tick 一次 + 跑全部插值 + return**。每帧恰好 1 tick（60Hz），**等待是隐式的**（下一条指令的 `time` 就是等待目标，不需要 `wait`）。`time` 是**绝对帧号**。
- **时间轴是确定性的**：`for(;;)` 会在同一帧内连续执行到该帧之后的下一条指令；**没有变量、没有表达式、没有条件分支、没有随机数**。唯一控制流是 opcode 1 的**无条件回跳**（`ins_1(offset, time)`）。子代理用真实数据核对：26 次回跳的第二参数全部命中真实帧标签集合。
- `Timer` 的 rate 来自全局 `clock_scale` ⇒ **子弹时间会同时缩放背景脚本时间**。

**opcode 全集（23 个，缺 15/16）**——我逐条从 switch 读出；下表的"生产次数"是子代理对 10 个真实 STD 统计的：

| op | 语义 | 生产次数 |
|---|---|---|
| 0 | 空操作/显式 hold | 0 |
| 1 | 无条件回跳（循环） | 26 |
| 2 | 立即设置摄像机位置（记瞬时速度） | 250 |
| 3 | 位置插值 `{dur, ease, xyz}` | 221 |
| 4 / 5 | 立即设置 / 插值方向向量 | 26 / 59 |
| 6 / 18 | 立即设置 / 插值第三轴 | 15 / 0 |
| 7 / 21 | 立即设置 / 插值 FOV | 13 / 3 |
| 8 / 9 | 立即设置 / 插值雾 `{color, near, far}` | 24 / 35 |
| 10 / 11 | Hermite 位置 / 方向曲线（4 控制点，mode=8） | 0 / 0 |
| 12 | 摄像机运动模式（13 种） | 18 |
| 13 | 清屏色 | 1 |
| 14 | 绑定 ANM 到 8 个动画槽之一 + 指定绘制层 | 8 |
| 16 | **vm.cpp 无 case**，只按 `instruction.size` 前进 | **16** |
| 17 | 网格变形模式 | **0** |
| 19 | 中断全部动画到帧序 `arg0+7` | 16 |
| 20 | 设置剔除距离² | 12 |
| 22 | 冻结自转标志 | 3 |

**对我们最重要的三个结论**：
1. **生产数据只用到 17 个 opcode**；`0,10,11,15,17,18,23` 一次都没出现。
2. **opcode 17 = 网格变形，出现 0 次** ⇒ 对已发行 STD 是**死代码**（`mesh_mode` 只能由它设置）。不要抄。
3. **opcode 16 出现 16 次却无 case**——`vm_cpu_validation.json` 有 1200 组 0 失败，但该 JSON 的 `limitations` 只声明「13 和 22 会比原全局状态」，**未声明 15/16/23 是否也比了全局** ⇒ 语义未确证，搬这一条需要另做实验。

### 1.3 渲染侧与规模

- **纯数学可抄**：透视相机 `look_at(eye = vectors[0]+vectors[5], target = eye+vectors[3], up = vectors[2])` + `perspective(fov, w/h, near=30, far=8000)`（`object_projection.cpp:37-43`）；雾是 **7 字段数值向量**逐字段加/减/缩放/插值（`fog.cpp:9-31`）——「雾色 + 近远距」可以像位置一样插值，这是很值得抄的一点。
- **不可抄**：`D3DXVec3ProjectArray` 的 16 角点投影剔除（`object_projection.cpp:28-36`）、`D3DRS_*` 状态机（`draw.cpp:20-42`）、THA1 归档（`th20.dat` 285 条 / 152MB）、ANM 二级 VM（舞台背景用到 31 个 opcode）。
- **真实规模**（子代理独立解析 10 个 STD，**我用同一脚本复核，逐面数字完全一致**）：

| STD | object | primitive | instance | instruction | 帧标签 |
|---|---:|---:|---:|---:|---:|
| st01 | 3 | 16 | 24 | 47 | 11 |
| st02 | 5 | 12 | 30 | 54 | 14 |
| st03 | 4 | 7 | 13 | 43 | 9 |
| st04a | 14 | 148 | 49 | 92 | 33 |
| st04b | 17 | 181 | 62 | 95 | 35 |
| st04c | 15 | 157 | 54 | 94 | 35 |
| st04d | 17 | 181 | 57 | 94 | 35 |
| st05 | 4 | 16 | 21 | 69 | 20 |
| st06 | 6 | 27 | 48 | 115 | 23 |
| st07 | 4 | 16 | 17 | 43 | 10 |
| **合计** | **89** | **761** | **375** | **746** | **235** |

⇒ **数据量很小**（一面最少 43 条指令、13 个实例）。数据驱动完全划算，但也说明**我们不需要一个通用引擎**——够用的是一张表加一个小解释器。

---

## 2. 本作现状盘点（全部经我复核）

### 2.1 版面层 `js/playfieldBg.js`（671 行）

- 类 `PlayfieldBackground` `:42`；离屏 450×600 `_buf`（`:53-56`）；`update(dt)` `:121-133` **每 1/28 秒**才置 `_dirty`（离屏重绘 ≈28Hz）。
- `_propsFor(mode)` `:80-119`：`hash()`（`:21-24`，**确定性**）按 `mode.length*97 + 首字符*13` 生成固定 30 个道具（14 pillar + 10 float + 6 symbol），按 mode 缓存。
- `_drawMode` `:155-288`：天空渐变、28 星点、剪影、地平光带、Mode-7 地面、路缘虚段、道具、远近雾、边雾、扫描/故障层、扫描线。
- **已数据驱动**：主题色（`MODE_THEME` 21 行）、贴图路径（`PLAYFIELD_BG_TEX`）、道具散布（确定性 hash）。
- **手写分支**：`_drawSilhouette` `:290-396` 的 **12 个 `sil`**、`_drawPillar` `:501-580` 的 **12 个 `kind` 分支**（外加一条 default 兜底）。

### 2.2 【已核·真实缺陷】`s1_mid` 的主题值在绘制代码里没有对应分支

我用集合比对核出来的：

```
主题表使用的 kind (13): candy code crystal dual fire gear hex mist neon obelisk spike split warn
绘制代码的 kind 分支 (12): candy crystal dual fire gear hex mist neon obelisk spike split warn
                                                                    ↑ 没有 'code'
⇒ theme 有、code 无分支: ['code']
```

`js/playfieldBgThemes.js` 的首主题 `s1_mid` 写的是 `kind: 'code'`（配合 `symbols: ['#','{}','草稿','wiki']`），而 `js/playfieldBg.js:501-580` 的 `_drawPillar` **没有 `'code'` 分支**，会落到 `:575` 的 default——画成"通用灰柱 + 顶端色条"。

对比 `sil`：主题表 12 个值、代码 12 个分支，**完全一致，无死分支**。所以问题只出在 `kind`。

**成因判断**：`playfieldBgThemes.js` 是 E06c 抽出来的（`playfieldBg.js:5` 注释与 `docs/refactor-queue.md:571`），而 `'code'` 这个 `kind` 很可能是被抽离时**遗留的旧值**（或原本依赖一个已不存在的分支）。
**这正是本次重作方案最有力的论据**：主题表与绘制分支之间**没有一致性校验**，所以一个主题值可以静默地失去它的视觉实现，而且**没有任何测试会失败**。→ 无论是否做完整重作，都应先加"每个 `MODE_THEME.kind`/`.sil` 必须有对应原子"的断言。

### 2.3 左侧 Three 面板

- `js/backgrounds/StageBackground.js`：`_rebuild` `:79-85` 走 `STAGE_BG_BUILDERS[mode]`，并**包在 `withRealRandom` 里**（`:84`，避免消费录像种子流）；`update()` `:208-299` 逐对象解释 **15 个 `userData` 标志**。
- `js/backgrounds/scenes.js`（795 行）：**13 个手写 builder**（27–101 行/个），**42 处 `Math.random`**（我已复核为 42）。
- `js/backgrounds/builders.js`：`STAGE_BG_BUILDERS`，21 mode → 13 builder（`ex_mid→buildA5(false)`、`ex_boss→buildA6(true)`）。
- **最大障碍**：42 处 `Math.random` ⇒ 左侧面板**每次重建布局都不同，当前无法做像素级回归**。所以"零观感变化"重构的第一步必须是**先冻结随机种子**。

### 2.4 登记与素材

- `js/bgModes.js`：`BG_MODE_BY_STAGE`（12 个 stageKey）+ `PLAYFIELD_BG_TEX`（**21 mode → 19 文件**）+ 四个查询函数。
- 换面入口只有两处：`js/chapterFlow.js:140`（Three）与 `:142`（版面），**两层共用同一个 mode 字符串**——这是数据化的天然接缝。
- **素材缺口（已核）**：`assets/bg/tex_*.avif` 共 **19 个文件但只有 8 个唯一 md5**（重复组：`a4_boss == a4_mid == s1_boss`；`b4_boss == b4_mid == s3_boss == s3_mid`；`a6_boss == patrol`；`b6_boss == b6_mid == s2_boss == s2_mid`；`b5_boss == b5_mid == s1_mid`）。
  而 `assets/NOTICE.md` 只对 `battle-print.avif`（`:25`）、`ui/pause-vine.avif`（`:26`）、`difficulty-cathedral.avif`（`:27`）、`ui/scene-wipe-mask.avif` 有逐条记录；**19 个 `tex_*.avif` 只有 `:21-24` 的整段"AI 生成"概括，没有逐文件来源**。
  按 `AGENTS.md`「运行时图片按项目约定使用 AVIF，**记录来源**」，这是**现存缺口**，应随本次一并修。
  > 顺带纠正我上一轮报告里的一处笔误：我当时写"9 个唯一内容"，**实为 8 个**（子代理复核并纠正）。

### 2.5 性能现状

- `docs/perf-optimization.md` 的 P1（背景渲染不受描画节流）**已实现**：`js/game.js:513-518` 把 `background.update()` 挂在 `shouldDraw` 分支内。粒子也已改由顶点着色器 `uTime` 驱动（`StageBackground.js:167-176`）。
- **但该文档对 `playfieldBg.js` 没有任何条目**。其代码推导常量：离屏重绘 28Hz、每次重绘约 204 次 `drawImage`（地面逐 2px 切片）+ 200 次 `fillRect`（扫描线）、每帧 1 次 `createRadialGradient`（暗角，`:661-663`，可缓存）。
- **这些数字全部是代码推导，未经实测**——本方案**不做未实测的优化**。

---

## 3. 重作方案

### 3.1 目标架构

新增 `js/bg/`（纯数据 + 纯解释器，无 DOM / THREE 副作用，node 可测），**不替换现有三张表**，只在其上加一层：

```
js/bg/schema.js     // typedef + validateScene()，纯 JS，node 可跑
js/bg/atoms2d.js    // 具名 Canvas2D 原子（现 12 kind + 12 sil 原样搬入，函数体逐字不动）
js/bg/atoms3d.js    // 具名 Three 网格工厂 (THREE, params, rand) => Object3D
js/bg/easing.js     // 32 条缓动（移植 ecl_vm/math.cpp:34-52）
js/bg/timeline.js   // Op[] 解释器（Timer + 5 条插值通道 + camera motion 表）
js/bg/scenes2d.js   // 每 mode 的 Scene2D 数据
js/bg/scenes3d.js   // 每 mode 的 Scene3D 数据
js/bg/apply3d.js    // Scene3D → StageBackground 的解释器
```

与现有表的关系（**并存**，这是本方案的关键约束）：

| 现有 | 处置 |
|---|---|
| `js/bgModes.js` | **完全不动**。仍是唯一 mode 登记 + 贴图路径权威。`Scene2D.tex` 缺省继承 `PLAYFIELD_BG_TEX[mode]`，**禁止新增第二份路径表** |
| `js/playfieldBgThemes.js` | 配色前期**完全不动**；后期 `Scene2D` 只保留 `theme:'<mode>'` 引用，不把配色拆成两份 |
| `js/backgrounds/builders.js` | 改为**由表生成**：`STAGE_BG_BUILDERS = mapValues(SCENES3D, s => (bg) => apply3d(bg, s))`。`js/backgrounds.js` 与调用点零改动 |

### 3.2 Schema 草案

```js
// 单位：t = 60Hz 逻辑帧；角度 = 弧度；距离 = 世界单位

/** Scene2D —— 版面层 */
{
  mode: 'a5_boss',          // 必须是 PLAYFIELD_BG_TEX 的 key
  theme: 'a5_boss',          // MODE_THEME 的 key（默认 = mode）
  tex: undefined,            // 缺省 = PLAYFIELD_BG_TEX[mode]
  horizon: 0.32,
  sky: ['#16081c', '#481850'],
  floor: { atom: 'floor.mode7', groundK: 1.35, sliceStep: 2, roadK: 0.25 },
  far:   [ { atom: 'stars', count: 28, seed: 1103 },
           { atom: 'sil.towers', alpha: 0.28 } ],
  props: [ { atom: 'prop.pillar', count: 14, seed: 2207, zSpan: 32 },
           { atom: 'prop.float',  count: 10, seed: 2213, zSpan: 32 },
           { atom: 'prop.symbol', count: 6,  seed: 2221, zSpan: 26 } ],
  near:  [ { atom: 'fx.fogBands' }, { atom: 'fx.edgeFog' },
           { atom: 'fx.scanlines', step: 3 }, { atom: 'fx.vignette' } ],
  timeline: [],              // 空数组 = 退化为现有 scrollZ 行为
}

/** Op —— 时间轴（t 非递减；只有 loop 可回跳）。只保留 TH20 生产数据用到的 op */
{ t: 0,    op: 'fog',    color: [0,0,0,255], near: 0, far: 600 }
{ t: 1400, op: 'fogTo',  dur: 1400, ease: 0, color: [0,0,0,255], near: 0, far: 1200 }
{ t: 4200, op: 'posTo',  dur: 1400, ease: 0, x: 0, y: 1024, z: -120 }
{ t: 7000, op: 'motion', mode: 1 }        // 1..13
{ t: 7000, op: 'loop',   to: 3 }          // 只能向"后"（更早的 t）
// op 名 ↔ TH20 opcode：wait/0 loop/1 pos/2 posTo/3 dir/4 dirTo/5 up/6 fov/7
//                       fog/8 fogTo/9 motion/12 clear/13 emit/14 dist/20 freeze/22
// 明确不实现：posCurve/dirCurve(10/11)、up 插值(18)、网格(17) —— 生产数据 0 次

/** Scene3D —— 左侧面板 */
{
  atmosphere: { bg: 0x16081c, fog: 0.03, fogColor: 0x16081c, light: 0x8844ff, intensity: 1.2, amb: 0.45 },
  placements: [
    { atom: 'torus.gear', count: 1, seed: 1, place: 'fixed',
      params: { r: 4.2, tube: 0.38, color: 0xf9a8d4 }, anim: { rot: 0.55 } },
    { atom: 'box.tunnel', count: 48, seed: 11, place: 'tunnel', spread: [5,7,22],
      params: { w: 0.06, len: [2.2, 7.2] }, anim: { speed: 2.5, tunnel: true } },
  ],
  labels: [{ text: ['维基外围','零散草稿'], color: '#a8ffc8', pos: [0,5.2,-2], scale: [4.2,1.35] }],
  points: [{ count: 220, color: 0x88ffaa, spread: 16, size: 0.07, spin: 0.05 }],
}
// anim 的键 = 现有 15 个 userData 标志（rot/speed/tunnel/bounce/floatY/drift/spin/
// stripe/scan/glitch/orbit/spiral/shatter/blink/phase，StageBackground.js:225-276）
// 一个字都不改 ⇒ 这一步是纯数据搬运，语义零风险
```

字段到 TH20 的映射：

| TH20 | 本作字段 |
|---|---|
| `Header.animation_name` | `Scene2D.tex` |
| `Object.layer`（12 层，生产只用 0–3） | `far` / `props` / `near` 三组（**不需要 12 层**） |
| `Object.parameters[5..10]` 剔除盒 | `Op.dist` + `PropAtom.zSpan`（2D 只需 z 裁剪） |
| `Primitive.script_index` → ANM | `Atom.atom` + `params`（**不引入二级 VM**，动画写进 `Atom.update(t)`） |
| `Instance{object_id, position}` | `PropAtom{count, seed}`（程序化散布替代 375 条显式实例） |
| `Instruction{time, opcode}` | `Op{t, op}`（同为 60Hz 绝对帧） |
| op1 字节偏移回跳 | `{op:'loop', to:<下标>}` |
| `Interpolation.mode` 0..31 | `easing.js` 同名同值（TH20 有 32 条缓动，`math.cpp:34-52`） |
| `FogState` 7 字段 | `fog`/`fogTo` 的 `{color, near, far}`；2D 落成远近雾 + 边雾两层 |

### 3.3 两条路线对比

**(a) 版面背景改由 Three 渲染 —— 不推荐。**
代价：新增一个 WebGL 渲染目标 + 每帧全屏合成到 450×600；WebGL 上下文丢失成为新的游戏内故障面（现在 Three 失败已有空实现兜底，见 `js/main.js:455`）；版面是弹幕热点层（`docs/perf-optimization.md` 指出 Canvas 2D 弹幕已是主热点），GPU 抢占风险高；还必须原样维持 450×600 逻辑坐标与触控映射（`AGENTS.md` 硬约束）。收益只是"3D 更真"。

**(b) 版面保持 Canvas 2D、改为数据表 + 原子 —— 推荐作为主路线。**
版面本来就只有 Canvas 2D，所以实质是"把手写 `kind`/`sil` 分支换成原子表 + 用时间轴描述运动"。绘图调用数不变 ⇒ 帧时不变。与 `docs/perf-optimization.md` 不冲突（该文档对版面层无结论，且本路线不回归已实现的 P1）。

**推荐组合**：**(b) 为版面主线 + (a) 仅作用于左侧面板**。执行顺序上先做面板数据化（风险最低、收益最直接），再做版面原子化，最后才接线时间轴。

### 3.4 分阶段迁移（每步独立可验证，默认零观感变化）

| 阶段 | 内容 | 验收 |
|---|---|---|
| **P0 冻结基线** | 给 `StageBackground` 加可注入 RNG（`bg.__rand`，缺省 `Math.random`），测试注入 `js/rng.js` 的 mulberry32。**不加这个，后面所有"逐像素一致"都无法验证**（`scenes.js` 有 42 处 `Math.random`） | 同 seed 连跑两次截图逐像素一致 |
| **P1 版面几何原子化** | `_drawPillar` 12 个 `kind` 与 `_drawSilhouette` 12 个 `sil` **原样**搬进 `atoms2d.js`（函数体逐字不动，只换签名） | 21 mode 截图与 P0 **逐像素一致**（版面 `hash()` 本就确定性） |
| **P2 左侧场景数据化** | 13 个 builder → `SCENES3D`；新增 `apply3d.js`；`builders.js` 改为由表生成 | 注入同 seed，21 mode 截图与 P0 逐像素一致 + 单测"每 mode 有 Scene3D、atom 都存在、count 与 P0 记录一致" |
| **P3 移植 easing + Interpolation** | 新增 `easing.js`（32 条）与 `Interpolation`（含 mode 7/17/8 特例）。**运行时不 import** | node 表驱动单测（端点 0/1、单调性、mode7 累加、`duration=0` 立刻取 `end`） |
| **P4 接线解释器但数据为空** | `timeline.js` + `Scene2D.timeline` 缺省 `[]`；空时间轴退化为现有 `scrollZ += dt*speed*48` | 截图仍逐像素一致 |
| **P5 用时间轴复刻现有运动** | 把 `scrollZ` 速度、`speed`、扫描线相位、转场闪白表达成 op；旧分支用 `?bg=timeline` 保留 A/B | 先比 `scrollZ(t)`/`_time(t)` 轨迹，再在 t = 0 / 1.2 / 3.7s 抽样帧比对 |
| **P6（可选，独立美术变更）** | 用新原子与新 op 做新观感 | 单独 PR + 视觉验收，不混进重构 |
| **P7 清理与文档** | 删旧 builder/旧分支；同步 `AGENTS.md` 的「新背景 mode」配方与模块职责表、`README.md` | 文档与代码一致 |

### 3.5 测试与验证

- **单测（node，不 import Three）**：
  - `test/cases-bg-schema.js`：21 mode 全部通过 `validateScene`；**每个 `Scene2D` 引用的 atom 都必须存在于 `ATOMS2D`**（**这条正是 §2.2 那个 `'code'` 缺陷的通用守卫**）；`ease ∈ 0..31`；`t` 非递减；`loop.to` 合法且指向更早的 t；`tex` 必须命中 `PLAYFIELD_BG_TEX`。
    → 并且**立刻补一条**：`MODE_THEME` 每个 `kind`/`sil` 都必须有对应绘制分支。**这条不需要等重作，现在就能加，且会立刻暴露 `'code'`。**
  - `test/cases-bg-easing.js`：32 条缓动的性质。
  - `test/cases-three.js`：保留现有 `mode=null` 契约（`:40-72`）；新增"每 mode 有 Scene3D"与"解释器的 helper 调用序列与 P0 记录一致"（用 `:48-57` 已有的最小 THREE 假实现做录制式断言）。
- **e2e**：新增 `test/e2e/bg.spec.js`：`owDebug.softJump(id)` 逐面 → 等 2 个 rAF → 截版面与左栏 → 与基线比较；`UPDATE_BG_BASELINE=1` 重建基线；补 390×844 视口。
- **零观感变化判定**：版面是纯 Canvas 2D、无 GPU 差异 ⇒ **要求 0 容差**；面板若因 WebGL 驱动有差异，门限定为像素差 ≤0.5% 并在 CI 记录实测值。
- 「左栏空白」历史回归（`test/cases-three.js:4-7`）目前只断言 `setMode` 触发重建（`:64`），建议补**像素方差阈值**守卫。

### 3.6 数据与素材

- 只保留 `js/bgModes.js` 作为 mode/贴图唯一权威；`Scene2D.tex` 缺省继承，**禁止第二份路径表**。
- 新增一个 mode 的操作降到：`bgModes.js` 两处登记 + `scenes2d.js`/`scenes3d.js` 两处数据 + `MODE_THEME` 一行。
- **素材合规（现存缺口，应一并修）**：19 个 `assets/bg/tex_*.avif` 需按 `assets/NOTICE.md:25` 的格式补逐文件来源记录。若顺带重制素材，可按 hash 去重（现 19 文件仅 8 个唯一内容），运行时用 `tools/to-avif` 输出 AVIF。

---

## 4. 明确不适用 / 不该抄

| 项 | 证据 | 理由 |
|---|---|---|
| D3D9 与 D3DX COM 绑定 | `draw.cpp:20-42`、`object_projection.cpp:13-21` | 浏览器无对应物 |
| 16 角点投影剔除 | `object_projection.cpp:28-36` | 我们每 mode ≤30 个道具，直接做「距离 + 屏幕 AABB」两行判断 |
| THA1 归档 reader | `reports/assets_recovery.md:3,25`（285 条 / 152MB） | 我们散装 AVIF |
| ANM 二进制与 ANM VM | 舞台背景用 31 个 opcode | 只借"每个面片一条小动画"的概念，写成 `Atom.update(t)` |
| x86 布局 / `static_assert` / `_mm_*` 内建 | `background.hpp:19,36-44,71-73`；`native_recovered/native_core.hpp:8-24` | 为通过 CPU 差分 oracle 存在 |
| **网格变形**（`mesh_distortion.cpp` 整体） | opcode 17 生产出现 **0** 次 | 对已发行数据是死代码 |
| 对象自转数据 | `parameters[1]` 在 89 个 object 里**全为 0** | 保留能力可以，别指望有数据可搬 |
| 12 层系统 | `draw.cpp:40,51`；生产只用 layer 0–3 | 我们不需要 12 层 |
| `stage_id & 1` 归档槽选择、`field_0c`/`Std_unknown` | `lifecycle.cpp:31,43`；10 个 STD 全 0 | 原版资源管线残留，语义不明 |
| 前景 ANM 层 39/40 | `draw.cpp:47`；测试时该列表为空 | 与我们的转场需求无关 |

---

## 5. 存疑与未验证

1. **`Object.parameters[3]/[4]` 语义未确证**（恢复代码未读取，10 个 STD 全 0）。dump 把槽位打印为 "Width/Height"，但 dump 表头已被证伪，不能据此命名。
2. **opcode 15/16/23 未确证**：`vm.cpp` 无 case；`vm_cpu_validation.json` 有各 1200 组 0 失败，但其 `limitations` 未声明 15/16/23 是否也比了全局状态。**opcode 16 在生产数据出现 16 次**，模式可疑——要搬需另做实验。
3. **每个 opcode 的精确字节尺寸未确证**：从文本 dump 反推只能复现 26 次回跳中 16 次的 `arg0`（有 opcode 带未打印的补齐 dword）。引擎的 `Instruction.size`（`vm.cpp:58`）才权威。
4. **`animation_count == primitive 总数` 未对二进制核对。**
5. **`camera.vectors[3]/[4]` 与 `final_vector` 在背景模块之外的消费者未追踪**（`final_vector` 只在 `vm.cpp:34` 写）。
6. **`640×480` 剔除常量的含义未确认**（TH20 有 6 个 viewport，哪个对应版面未确认）。
7. **TH20 一面的实际时长未确认**（最大帧标签 st06 = 16690 ≈ 278s，但存在回跳，实际循环几次未端到端验证）。本文引用的是**数据规模**，不是时长。
8. **本作侧没有任何实测帧时数据**：§2.5 所有数字都是代码推导，`docs/perf-optimization.md` 对版面层无条目。**P1/P2 之前必须先实测。**

---

## 6. 立即可以做的两件小事（不依赖重作）

1. **加"主题值必须有绘制分支"的断言**（§3.5 第一条）。它会立刻暴露 §2.2 的 `kind: 'code'` 缺陷——这是当前**唯一有玩家可见后果**的发现（1 面道中是最常被看到的场景）。修法二选一：给 `_drawPillar` 补 `'code'` 分支，或把 `s1_mid.kind` 改成已有的 `kind` 值。**这属于观感修正，需你确认走哪条**。
2. **补 `tex_*.avif` 的逐文件来源记录**（§3.6）。纯文档，无运行时风险。
