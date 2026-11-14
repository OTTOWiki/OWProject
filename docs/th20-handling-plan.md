# 操作手感改进参考（以 TH20 源码重建为参考）

> 日期: 2026-10-05
> 参考对象: `~/Touhou20`（TH20 ver 1.00c 的**独立 C++ 源码重建**，按 x86 二进制恢复 + 原 CPU 差分验证；**不是原版源码**）
> 方式: 参考仓库**全程只读**；本文档只做方案，**未改动任何运行时代码**。
> 配套证据: `.scratch/th20-feel-factsheet.md`（主代理自查事实卡）与仓库外的 `~/ow-th20-handling-research.md`（子代理完整报告，210 行）。

## 0. 可信度标注约定

- **[已核]** 主代理亲自读过两侧实现源码并逐行复核。
- **[impl]** 子代理读过 TH20 实现，但该模块**未经**原 CPU 差分验证。
- **[cpu]** TH20 侧该模块有原 CPU 差分记录（见对应 `*_validation.json`）。
- **[推断]** 未确证，不得当结论使用。
- **【平衡改动】** 改动会影响判定或数值，按仓库红线必须先给方案、再手测。

> **底线提醒（本文档最重要的一句）**：TH20 是**另一个游戏**，不是本作的规格书。下列"改进"里凡涉及判定的，本作现有数值都是**已发布的手感**；迁移任何一条都应先问"我们是不是真的要改成那样"，而不是"TH20 是这样所以我们对齐"。

---

## 1. 结论摘要（按性价比排序）

| # | 项 | 收益 | 成本 | 改判定? | 我的建议 |
|---|---|---|---|---|---|
| 1 | **修停帧吞边沿输入**（Z/X/C 在停帧期丢失） | 修真实缺陷 | ~20 行 + 1 用例 | 否 | **先做** |
| 2 | 菜单自建按住连发（逻辑帧钟，首延迟 26 / 周期 8） | 跨浏览器一致 | ~30 行 | 否 | 推荐 |
| 3 | 震屏偏移改确定性值 | 去掉绘制期随机 | 1 行 | 否 | 推荐（顺手） |
| 4 | 擦弹音效按 `b.x` 声像 | 弹幕墙里可辨识 | ~15 行 + 改 `sfx` 签名 | 否 | 推荐 |
| 5 | 弹体擦弹改为有额度（TH20：每弹 3 次 + 60 帧环内冷却） | 滞留弹幕擦弹连续 | ~15 行 | **是** | 需先决定玩法意图 |
| 6 | 擦弹半径与弹体尺寸解耦（`max(r/2.5, 40)` 型） | 大弹不再白送擦弹 | 1 行 | **是** | 需先决定玩法意图 |
| 7 | 触屏 `virtualMove` 加阻尼跟随 | 触屏/键盘手感统一 | ~10 行 | **是** | 需手测（触屏玩家会立刻感知） |
| 8 | Shot 少量表驱动（5/3 发数组进 `PLAYER_DEFS`） | 可读性 | 半天 | 否 | 可选 |
| 9 | 决死窗 17 帧 → 8 帧 | 与 TH20 同节奏 | 1 常量 | **是** | **不建议**（见 §3.5） |

---

## 2. 无争议项（不改判定，可直接排期）

### 2.1 停帧期边沿输入被吞【已核·真实缺陷】

**现状**（逐行复核过）：
- `js/game.js:582-592`：`!this.paused && this._hitStop > 0` 时**只扣计时**，`updateCombat(game, dt)` 被整块跳过。
- `js/game.js:604` 的 `finally` 仍调用 `this.input.endFrame()`，而 `js/input.js:286-292` 会清 `pressed` / `bombTap` / `itemTap` / `tap`。
- 这三个边沿的**唯一消费者在 `updateCombat` 内**：`js/gameCombat.js:224`（`updateShotToggle`）、`:232`（`bombPressed`）、`:237`（`itemPressed`）。
- `_handleGlobalInput`（`js/game.js:732-780`）在 `playing` 态**不读**这三者——它只处理成绩榜弹层、暂停、`dialogue` 确认、`routeSelect` 左右。已逐行确认。

⇒ **停帧期间按 Z（单击发射模式）/ X / C 是纯丢失**，不是延迟。

**严重度（我下调了子代理的判定）**：写入点仅 `js/chapterFlow.js:329`（Letter 成功 0.08s）、`js/gameCombat.js:386`（Bomb 0.08s）、`:431`（Miss 0.1s），`hitStopCap = 0.15`（`js/config.js:167`）。一个逻辑块最多 3 步 ⇒ 每个受影响的块吞 1 个边沿；0.08s ≈ 5 帧，合计约丢 1–2 次边沿。**一次 Letter 成功或一次 Miss 之后约 5–6 帧内 Z/X/C 失效**——低频、局部、但复现路径明确。

**顺手排除一个更可怕的猜测**：决死窗口**不受停帧影响**——`p.arbitration` 只在 `updateCombat` 内递减（`js/entities.js:241-242`），停帧时 `updateCombat` 不跑，窗口冻结不流逝。

**落地方式**：把 `input.updateShotToggle()` 与 Bomb/Item 边沿**上移到 `_handleGlobalInput`**（`js/game.js:576`，仍在停帧分支之前），保持"每逻辑块消费一次"的契约；`updateCombat` 改为消费缓冲结果。
**必须注意**：新增的缓冲字段要同时进 `snapshot()`（`js/input.js:298-310`）与 `createReplayInput.set()`（`js/replay.js:137-145`），否则录制与回放不一致。
**验证**：`test/cases-feedback.js:14-25` 已有 `addHitStop` 语义断言，可加"停帧块内边沿恰好消费一次"。

### 2.2 菜单按住连发【已核】

**现状**：`js/menuNav.js:60-105` 的 `handleListKey` 没有任何 repeat 逻辑；`js/ui.js:1291-1296` 只在 menu/exit 屏丢掉 confirm/back 的 `e.repeat`。长列表（录像列表、章节列表）按住方向键的滚动速度取决于**操作系统键盘设置**。

**TH20 做法**（`input/input_state.cpp:19-34`，**[impl]**）：每按键维护计数，产生三路——`repeat8`（>25 帧后周期 8，`:26-28`）、`repeat12`（>25 帧后周期 12，`:29`）、`held8`（>7 帧，`:27`）。
**但**：全仓库消费者只有 `repeat8`（8 处菜单，如 `pause_system/menu.cpp:18`、`title_system/main_environment.cpp:19`），**`repeat12` 与 `held8` 零消费者** ⇒ 抄了就是死代码。射击不用连发（`shot_controller_frame.cpp:7` 直接 `held`），所以本作 `shotHeld()` 用 `isDown`（`js/input.js:326-331`）**已经对齐**。

**落地方式**：`js/input.js` 加 `_holdFrames`（在 `endFrame()` 内自增，**必须用逻辑帧**，否则与 `_fpsBankMs` 的合并子步冲突）+ `navRepeat(code)`，`menuNav` 忽略 `e.repeat` 后自绘滚动。
**验证**：新增纯逻辑单测（按住 N 帧 → 断言触发时刻序列）。

### 2.3 震屏偏移改确定性值【已核】

`js/gameDraw.js:166` 用 `Math.random()` 取震屏偏移。今天无害（绘制不参与逻辑，`drawGameFrame` 在 `js/game.js:520` 是绘制阶段），但**一旦有人把绘制也包进 `withSeededRng`**（做确定性截图/录像带画面时会想到），偏移量会立刻污染玩法种子流。
**落地**：改为由 `_shakeT` 派生的确定性值（如 `Math.sin(_shakeT * 97.3)` 取双向偏移）。1 行级改动。

### 2.4 擦弹音效声像【已核】

`js/audio.js:293` 的 `sfx(type)` 无 pan 参数，内部 `blip()`（`:297-308`）直连 `sfxGain`。加一个 `StereoPannerNode` 即可，但需把 `b.x` 传进来 ⇒ 调用点 `js/gameCombat.js:105-110` 需传坐标。**可落地性已确认**（子代理因未读 `js/audio.js` 而列为存疑，我已补核）。

**顺带一个正面核验**：`js/audio.js:9` 的 `SFX_RANDOM = Math.random.bind(Math)` 是模块加载时捕获的真随机 → 射击/擦弹音效的音高抖动**不消费种子流**，音频侧确定性干净。

---

## 3. 需先决定"要不要改玩法"的项（全部属平衡改动）

> 这一节请**先做产品决策，再看代码**。每条的"TH20 是这样"都不构成改动理由。

### 3.1 擦弹半径是否与弹体尺寸解耦【已核 TH20 侧】

- **本作**：`js/config.js:103` `grazeRadius: 33` 全弹种同一值；`js/collision.js:283-286` 用 `grazeSum = grazeR + b.r`。
- **TH20**（`player_entity/collision.cpp:52-53`，**[impl]**，我逐行读过）：圆形弹 `graze = max(radius/2.5, 40)`，比较用 `(hit_r + graze)² + radius²`；矩形弹另用 `base_radius + 30`（`:58-61`）。**擦弹带随弹体尺寸变化**。
- **影响**：大弹（`medium/large`）的 `hitR` 更大 → 擦弹环带相对更窄，体感"擦不到"。
- **改动形状**：`grazeR = Math.max(BALANCE.grazeRadius, b.r * 2.5)`。
- **注意**：TH20 的规则**未经 CPU 差分验证**——`bullet_system/pool_validation.json` 明写 "Player collision … remain explicit throwing fixture boundaries"。所以这是"参考了一个已恢复但未验证的实现"。

### 3.2 每弹擦弹是否只算一次【已核机制，未验证】

- **本作**：`b.grazed` 置位后**终身一次**（`js/collision.js:272-275, 298-301`）。
- **TH20**（`bullet_system/player_collision.cpp`，**[impl]**）：每弹有额度/冷却（参数 `field_4d0=60` / `field_4d4=3` 初始化于 `shoot.cpp:26-27`）；激光擦弹每 8 帧一次（`laser_system/type*_collision.cpp`）。
- **影响**：滞留型弹幕（长时间停在自机附近）在本作只能擦一次，TH20 可以连续擦。
- **这是玩法宽松化**，会直接影响擦弹→编辑槽的累积速度，**必须与 3.3 一起决策**。

### 3.3 触屏 `virtualMove` 加阻尼

> 2026-11-13 已落地（H10，非本节原方案）：已改为相对位移摇杆：每个触屏事件相对上一位置的位移 ×0.5 后映射到径向 8 向移动键，低速只由低速键触发；方向键只保持一个逻辑块，手指停即停（回放沿用既有 axis/downMask，不新增格式）；默认桌面同速，设置关闭后仅触屏手势提速并标「作弊」。

- **本作**：实时触屏按单次事件相对位移映射 8 向移动键，与键盘共用 `moveAxis()` 与 `speed * dt * 60`；低速只由低速键触发，方向键只保持一个逻辑块。
- **TH20**（`runtime_state/motion.cpp:11`，**[impl]**）：`damped(v,s) = v - v*s`，`s=0` 不衰减、`s=1` 立停，**不会过冲或振荡**，是"一个数字给策划"的减速写法。
- **注意**：`snapshot().v`（`js/input.js:304`）依赖绝对坐标契约，加阻尼必须保留该契约，否则录像不一致。

### 3.4 决死窗 17 帧 → 8 帧：**不建议**

- **本作**：`js/config.js:91` `deathBombWindow: 0.28` → ≈17 帧 @60Hz。
- **TH20**（`player_entity/events.cpp:23` **[cpu]**、`frame.cpp:35`）：命中时写 `+0x2204 = 8` → **8 帧**，且用 `pressed(slot,4)` 是**边沿**（长按无效）。
- **为什么不建议**：17→8 帧会把决死从"从容"改成"苛刻"，是**明显增加难度**的手感变更，且本作的决死还承担"审核窗口"的叙事（`gameCombat.js:183` 的"违规编辑！"）。没有任何用户诉求支持这次收紧。
- **可借的非平衡部分**：TH20 复活是**半径渐变清弹**（`frame.cpp:24-25`、`:48` `cancel_near_bullets(80)`），本作是 `fullScreenClear`（`js/gameCombat.js:433`）——但改清弹量**同样是平衡改动**。
- **补充事实**：本作决死窗**目前无测试**（`grep deathBombWindow test/` 无结果）。无论改不改，都建议补 N+1 / N+17 / N+18 三个边界断言。

### 3.5 两侧都成立、不要改的既有语义（避免"改出 bug"）

- **决死期间自机不移动**：本作 `js/entities.js:241-244` 在 `arbitration > 0` 时直接 return；TH20 的 `case 4` 也**不经过** `update_movement`（`player_entity/frame.cpp:35-37` 的 `break`）。**两边一致，不是差异。**
  - 唯一真实差异：本作提前 return 会**连无敌计时与受击闪红一起跳过**；TH20 的 case 4 仍走公共后处理（`frame.cpp:64-66`）。这是小改进点，非缺陷。
- **对角线**：两边都是"斜向 = 轴距 × 1/√2"（本作 `js/input.js:29-32` 显式归一化；TH20 的 9 项符号表 `movement.cpp:32` 是单位向量）。**不是差异。**
  - 真正的差异是**速度值的来源**：TH20 的 4 个速度来自角色数据文件 `plNN.sht + 0x10 + 4i`，按 `(斜向?2:0)+(聚焦?1:0)` 索引（`initialize.cpp:48`）；本作 `BALANCE.playerSpeed/playerSlowSpeed`（`js/config.js:78-79`）是全局常量。**仓库内无 `.sht` 文件，TH20 的实际速度数值不可得**，因此无法比较手感。
- **TH20 没有命中定格**：穷举 `set_clock_scale` 全部写点后确认，TH20 的 `clock_scale` 只用于（a）逐弹本地双计时器、（b）ECL opcode 541 脚本化时间膨胀、（c）激光更新期间置 0、（d）暂停保存恢复；另有逐敌 `+0xc4` 的实体局部减速。**本作的 `_hitStop`（跳过整轮 `updateCombat`）是本作自创机制，TH20 没有对应物。** ⇒ 不要用"对齐 TH20"给它辩护；它自身的问题就是 §2.1。

---

## 4. 明确不抄

| 项 | 证据 | 理由 |
|---|---|---|
| 完整 SHT 二进制数据驱动 | `player_entity/firing.hpp:7-25`；`overlay_system/weapon.cpp:38-40` | 数据里含 **4 个原生函数指针** + `+0x5d4` 重定位表；JS 侧只剩参数表，收益 < 成本。只把 5/3 发数组搬进 `PLAYER_DEFS` 即可 |
| `repeat12` / `held8` | `input_state.cpp:27,29` | 整仓库**零消费者**（本重建范围内） |
| 全局可变 `clock_scale`（临时覆盖再恢复） | `bullet_system/advance.cpp:11-16,55-61` | 一个函数三个恢复点，`advance.cpp` 里一个 early return 就能泄漏非 1.0 倍率。JS 应把 scale 当**参数**传 |
| per-bullet 双计时器 | 同上 | 纯成本，本作没有逐弹时间膨胀需求 |
| Shield 卡"擦弹计数 >22 消弹" | `bullet_system/player_collision.cpp:44-51` ← `overlay_system/shield_weapon.cpp:23` | 依赖护符卡 `byte_b0`，是 TH20 特有的装备机制 |
| `expanded_collision` ×3.6 / `collision_percent` `+0xe8` | `player_entity/collision.cpp:30-37` | 本作没有该外部调参通道 |
| ECL opcode 541 全局倍率 | `gameplay/enemy_opcode_state.cpp:87` | 会与本作 debug `timeScale`（`js/game.js:559-564`）和回放 dt 叠成多套乘子 |
| 共享 `Motion` 的 9 种运动模式 | `runtime_state/motion.hpp:5-11` | 本作弹体运动已够用；只在做新弹幕时借 `damped` 乘法衰减一个概念 |
| `vectors_628` 焦点快照 | `player_entity/movement.cpp:29` | TH20 全仓库无消费者 |
| 1/128 定点 + `moved_component` 残差通道 | `player_entity/movement.cpp:9` | 为 x86 差分存在；JS float64 更准 |
| boss"减速矩形"回调 | `gameplay/enemy_shot_adapter.cpp:21,30` | 同时改自机与弹速，属**新玩法**，不是手感修正 |

---

## 5. 存疑（不得当结论）

1. **TH20 四个速度数值不可得**（无 `.sht` 文件）⇒ 低速倍率、对角是否归一化（数值层面）无解，只能给机制。
2. **TH20 自机实际判定半径未知**：`collision.cpp:14` 的 `base_radius` 赋值点未追到 ⇒ 不能与 `playerRadius` 做数值对比。
3. **擦弹路径未经 CPU 差分**（`bullet_system/pool_validation.json` 的 limitations）。
4. 激光 8 帧节流来自 `laser_system/type*_collision.cpp`，而 `laser_system/README.md` 自述擦弹路径"仍在验证" ⇒ `[impl]` 非验证结论。
5. `repeat12` / `held8` 零消费者是**本重建仓库范围内**的穷举结论，不能推断原版未使用。
6. 「TH20 无停帧」限定在**我穷举的全局倍率变量**上；未恢复路径（`card_system` / Boss 卡）是否另有机制未排除。
7. 子代理未读全 `hud_system/`、`card_system/`、`bomb_system/`（除 `reimu.cpp:78`）、`player_entity/shot_callbacks.cpp`。

---

## 6. 验证方式（可直接照做）

- **§2.1**：`test/cases-feedback.js:14-25` 已有 `addHitStop` 语义断言 → 新增「停帧期 `updateShotToggle` 仍翻转」「停帧期 bomb 边沿在解冻后恰好触发一次」。
- **§2.2**：新增按住 N 帧的触发时刻序列单测（纯逻辑，不启浏览器）。
- **§3.1 / §3.2**：`test/cases-collision.js:119-224` 已覆盖擦弹事件与 `_grazeNear`；额度制用例写成「同弹连续 3 帧在环内 → 断言事件时刻序列（1/61/121…）」；半径用例必须写成**由常量推导的区间断言**，不要写死 `33`。
- **§3.4**：决死窗目前无测试 → 新增 N+1 / N+17 / N+18 三个按 Bomb 的边界断言（断言 `stats.deathbombs` 与 `stats.misses`）。
- **通用**：所有改动先 `npm test`；涉及判定的必须在真实运行路径上手测（`npm run test:e2e` 之外，按 `AGENTS.md` 的截图/行为分离要求分别报告）。
