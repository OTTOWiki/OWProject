# TH20 STD 背景脚本 · 事实卡（主代理自查，供核对 agent 产出）

> 来源：`~/Touhou20`（只读）。全部经我本人读源码/资源文本确认；路径相对 `~/Touhou20`。
> 用途：核对背景系统重作方案 agent 的结论；本文件不属于运行时产物。

## 1. 资源侧真实规模

- 恢复出的 STD 共 **10 个**：`scripts/recovered/std/st01..st07`（含 `st04a/b/c/d`）——`reports/assets_recovery.md:14` 记录「STD 背景场景与摄像机脚本 10 / 10」。
- 文本行数：`st03` 166 行（最小）… `st04b` 1815 行（最大），10 个文件合计 **8374 行**。
- STD 文本形态（thtk 反编译）：`ANM: st01wl.anm` → 若干 `ENTRY:` → `INSTANCE:` 列表 → `SCRIPT:` 时间轴。
- 贴图来源：THA1 归档解出的 PNG/JPEG，共 **660 张**（`reports/assets_texture_manifest.json`，PNG 482 / JPEG 178）。

## 2. 对象模型（`source_reconstruction/stage_background/background.hpp`）

| 结构 | 大小 | 字段 |
|---|---|---|
| `Header` | 0x90 | `object_count, animation_count, instance_offset, script_offset, field_0c, animation_name[128]` |
| `Object` | 0x30 | `id, layer, flags, parameters[11]`（11 个 float） |
| `Primitive` | 8 | `type, size, script_index, animation_index` |
| `Instance` | 16 | `object_id, unknown, position(Vec3)` |
| `Instruction` | 8 | `time(int32), opcode(int16), size(int16)`，参数跟在结构体后（`uint32[]`） |

文本对应关系：`ENTRY:` = Object，其下 `QUAD:` = Primitive（`Type/Script_index/Position/Width/Height`），`INSTANCE:` 行 = Instance。

`st01` 实测：3 个 ENTRY、24 条 INSTANCE（3 个对象 × 8 个位置重复摆放，X 方向每 512 一档铺开）。

## 3. 脚本执行模型（`stage_background/vm.cpp:27-60`，我逐行读过）

```
execute_script(state, rate):
  loop:
    ins = instructions[instruction_offset]
    if (timer.current < ins.time) { timer_tick(timer, rate); interpolate(state, rate); return; }
    switch (ins.opcode) { ... }
    instruction_offset += ins.size
```

要点：
- **时间轴按帧计**：标签 `740:` 表示「第 740 帧执行到此处」，与 `Instruction.time` 对应。
- **同一帧内连续执行**：内层 `for(;;)` 会一直执行到该帧之后的下一条指令（同 time 的指令全部执行完），不是一帧一条。
- 每个 `interpolate()` 只在推进 timer 之后调用一次，对"已配置 duration 的插值器"采样。

## 4. opcode 表（从 `vm.cpp` 的 switch 直接读出；语义标注分「确证」「推断」）

| op | 参数形状 | 作用 | 可信度 |
|---|---|---|---|
| 0 | — | 空操作后 `interpolate(); return`（提前结束本帧） | 确证 |
| 1 | `[offset, time, ...]` | 跳转到指令偏移 `args[0]`，并把 timer 设为 `args[1]`；**循环就靠它**（如 `ins_1(752, 4232)`） | 确证 |
| 2 | `xyz` | 直接写摄像机位置 `vectors[0]`，并算出 `final_vector` 增量 | 确证 |
| 3 | `duration, mode, xyz` | 配置**位置**插值：起点=当前 `vectors[0]`，终点=xyz，时长=duration，缓动=mode | 确证 |
| 4 | `xyz` | 直接写摄像机方向 `vectors[1]`（up 向量） | 确证（字段名 vectors[1]） |
| 5 | `duration, mode, xyz` | 配置**方向**插值（同 3） | 确证 |
| 6 | `xyz` | 直接写 `vectors[2]`（第三轴 / look-up） | 字段名未确证 |
| 7 | `fov` | 直接设视场角 | 确证 |
| 8 | `color, near, far` | 直接设雾（颜色取 args[0] 的 4 字节 + 近远距离） | 确证 |
| 9 | `duration, mode, color, near, far` | 配置**雾**插值 | 确证 |
| 10 / 11 | 多段曲线参数 | 位置(10)/方向(11) 的**贝塞尔式**插值：`mode=8`，起点+起始切线+终点+结束切线（`tangent_start/end`） | 确证（字段名确证，曲线数学未细究） |
| 12 | `mode` | 设置**摄像机运动模式** `camera_motion`；`0` 清零 `vectors[5]` 并重置 motion_timer；`2` 时把 motion_timer 设为 512；`6` 用 `secondary_motion_timer` | 确证字段，各 mode 的几何语义未确证 |
| 13 | `color32` | `set_clear_color` 清屏色 | 确证 |
| 14 | `slot(0/1/-1/-2), ...` | 控制该对象的 ANM：`>=0` 切脚本，`-1`/`-2` 关掉（置 flag 位），并写 `fields_3294[slot]` | 确证 |
| 17 | `mode` | 设置 `mesh_mode` 并 `reset_meshes`（网格变形模式） | 确证字段 |
| 18 | `duration, mode, xyz` | 配置**第三轴**插值 | 确证 |
| 19 | `event` | `interrupt_animations(owner, event+7)` 打断对象动画 | 确证 |
| 20 | `f` | `fields_3294[8] = f*f` | 用途未确证（平方：疑似"按距离/尺寸放大"） |
| 21 | `duration, mode, fov` | 配置 **FOV** 插值 | 确证 |
| 22 | `flag` | `set_primary_rotation_flag` 主旋转标志 | 确证字段 |
| 缺失 | — | 15、16 未在 switch 中出现（原始表中不存在或未恢复） | — |

**没有任何随机/条件分支**：switch 里无随机采样、无比较跳转，只有 op1 固定跳转。⇒ STD 是完全确定性的时间轴。

## 5. 与本仓现状的对应（用于判断"值不值得抄"）

- 本仓版面上方背景：`js/playfieldBg.js`（671 行）+ `js/playfieldBgThemes.js`（**21 行主题**，13 种 `kind`、12 种 `sil`）。
- 版面贴图：`assets/bg/tex_*.avif` 共 **19 个文件，实际只有 9 个唯一内容**（md5 去重后）：
  - 1 个贴图被 3 个 mode 复用（`tex_a4_mid` = `tex_a4_boss` = `tex_s1_boss`）
  - 多个贴图被 mid/boss 两 mode 共用（如 `tex_b4_mid` == `tex_b4_boss`）
  ⇒ **mid/boss 的观感差异主要来自主题行（调色板/剪影/符号），不是贴图**。
- 左侧 Three.js 背景：`js/backgrounds/scenes.js` **13 个手写 builder**（`buildS1Mid`…`buildB6`，其中 A/B 线 6 个 builder 带 `boss` 布尔参数），`STAGE_BG_BUILDERS` 是 mode→builder 表（`js/backgrounds/builders.js`）。
- 与本仓 `bgModes.js` 的关系：`BG_MODE_BY_STAGE`（stageKey → [midMode, bossMode]）+ `PLAYFIELD_BG_TEX`（mode → 贴图路径），是目前唯一的 mode 登记真源。

## 6. 我认为方案必须回答的三个硬问题（核对用）

1. **数据模型到底抄哪一层**：STD 是"对象/实例/指令"三层 + 23 个 opcode 的运行时 VM。我们要抄的是**时间轴 keyframe + 循环**这个形状，而不是 23 个 opcode 本身——本仓没有"每个对象一个 ANM"这套。
2. **21 个主题行 vs 13 个手写 builder 的重复度**：主题表已经是数据；Three 侧才是硬编码。方案应给出"哪些字段进表、哪些必须留代码"的判据，而不是笼统说"数据驱动"。
3. **零观感变化的重构路径**：本仓红线是重构不得改观感。表格化 `scenes.js` 的可行判据是"每个 builder 的 Three 调用序列能被一张表 + 一个小解释器复现"，否则应先只做**登记表化**（把 13 个 builder 的入参/共用 helper 抽出来），不碰几何。
