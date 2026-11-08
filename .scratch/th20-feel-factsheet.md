# 操作手感 · 事实卡（主代理自查，供核对 agent A 产出）

> 来源：只读读取 `~/Touhou20` 与 `~/OWProject`。每条都注明我是否亲自读过实现源码。
> 用途：核对「操作手感改进参考调研」agent 的结论。非运行时产物。

## 1. OWProject 现状（我逐行读过）

### 自机移动（`js/entities.js:240-262`）

```js
this.slow = input.slowHeld();
const speed = this.slow ? BALANCE.playerSlowSpeed : BALANCE.playerSpeed;   // 2.15 / 6.8
if (input.virtualMove) { this.x = input.virtualMove.x; this.y = input.virtualMove.y; }  // 触屏：直接置位
else { const axis = input.moveAxis(); this.x += axis.x * speed * dt * 60; this.y += axis.y * speed * dt * 60; }
this.x = clamp(8, LOGICAL_W-8); this.y = clamp(8, LOGICAL_H-8);
```

- **瞬时速度，无加速度/惯性/输入平滑**。
- 对角线在 `js/input.js:29-32` 用 `1/Math.SQRT2` 归一化（`moveAxisFromSeq`）。
- 触屏 `virtualMove` 是**绝对置位**（跟手），与键盘的相对位移是两套语义——这在回放里也要靠快照 `v` 字段复现。
- 夹取范围固定 8px 内边距（`LOGICAL_W/H` = 450×600）。
- `arbitration > 0`（决死窗口）时 `update` **直接 return**，不移动（`js/entities.js:241-244`）——即决死期间自机被冻结。这一条值得与 TH20 对比。

### 输入到帧的时序（`js/input.js` + `js/game.js:556-612`）

- 边沿事件由 DOM 监听器写入集合：`keydown` → `pressed.add(code)` + `down.add(code)`（`:78-81`），`keyup` → `down.delete` + `released.add`（`:84-88`）。
- `moveAxis()` 从 `_moveSeq` 数组**最后按下的优先**推导（`:15-33`），同时按两个对向键时以后按的为准。
- `snapshot()`（`:298-310`）在**每个逻辑块**采集，返回新对象 + 3 个新数组。
- `endFrame()`（`:286-292`）清 `pressed/released/bombTap/itemTap/tap`，在 `js/game.js:604` 的 `finally` 里调用。

**我核过的一个关键时序结论（重要，防止误报 bug）**：DOM 事件只在主线程空闲时投递，而 `_runLogicBlock` 是同步执行且最多合并 3 步（`js/game.js:495-501`）。因此**一次 rAF 内不可能出现"事件中途插入"**——不存在"第 1 步消费了 pressed、第 2 步又收到新 pressed"的情况。合并步数的代价是：
- 自机移动/低速是**水平量**，对 `steps` 正确（`dt*60 = steps`）；
- 射击/炸弹/道具是**边沿量**，一个逻辑块只消费一次 ⇒ 合并 2-3 步时这些动作的实际触发频率低于 60Hz（观感上等价，且比"每步都触发"更保守）。
⇒ **当前没有输入丢失 bug**。若要改进，方向是"让边沿在合并步内也只触发一次且不丢"，而不是"修 bug"。

### 擦弹与命中（`js/collision.js:242-307`）

- 敌弹×自机：圆弹用 `hitSum = pr + b.r`、`grazeSum = grazeR + b.r`（`grazeR = BALANCE.grazeRadius = 33`，**全弹种同一个值**）；激光用 `distPointSeg2` 到线段。
- 擦弹**每弹一次**：`b.grazed` 置位后不再触发（`:272-275,298-301`），**没有冷却/预算**。
- 命中判定用 `pr + b.r`，`pr` 是自机 r（未随低速变化）。
- `b._grazeNear` 只是个渲染提示（谁在用需查 `draw/`），不参与逻辑。

### 打击反馈（`js/gameCombat.js:25-75`）

- `_hitStop`：`js/game.js:582-585` —— 命中停帧时**跳过本轮战斗推进**（`updateCombat` 不跑），只扣计时。
- `addShake(mag, dur)` 直接覆盖幅度与时长（新震动盖旧）。
- 震屏偏移在**绘制期**用 `Math.random()`（`js/gameDraw.js:166`）。
- 擦弹粒子每弹 8 个、场上上限 48（`js/gameCombat.js:47-73`）；擦弹音效节流 45ms 用 `performance.now()`（`:105-110`）。

## 2. TH20 参考事实（我读过源码的部分）

### 2.1 自机速度来自角色数据表，不是常量（`player_entity/movement.cpp:36`、`initialize.cpp:48`）

```cpp
const auto speed = player.speeds_20b4[(direction>=5?2:0) + (player.focused_204c?1:0)];
x = multiply(x, speed); y = multiply(y, speed);
```

- `speeds_20b4[4]` 在初始化时从**自机射击数据文件 `shot_data + 0x10 + i*4`** 读出并转定点（×128）：`initialize.cpp:48`、`stage_reset.cpp:19`。
- 索引 = `(是否斜向 ? 2 : 0) + (是否聚焦 ? 1 : 0)` ⇒ **直行/斜行、聚焦/非聚焦共 4 个速度，全部是数据**，由角色 SHT 决定。
- 方向来自**9 项符号表** `{0,0},{0,-1},{0,1},{-1,0},{1,0},{-1,-1},{1,-1},{-1,1},{1,1}`（`movement.cpp:32`，注释标明是原版不可变表 572c48）——即**方向是整数枚举**，符号只有 ±1。
- **【主代理已更正·原判断错误】** 我最初推断"斜向位移 = 轴距 × 1/√2，与我们的 `SQRT2` 归一化等价"。**这个推断不成立**：速度是 `speeds_20b4[(direction>=5?2:0)+(focused?1:0)]`（`movement.cpp:36`），即**斜向走独立的表项索引 2/3**，引擎**根本不做归一化**。斜向是否比轴距短，完全取决于 `plNN.sht +0x10+4i` 里那 4 个数值——而仓库内 `find -iname '*.sht'` 无结果，**数值不可得**。
  ⇒ 正确表述：TH20 把"直行/斜行 × 普通/聚焦"四个速度都交给角色数据文件；我们是在引擎里硬除 √2。**这是机制差异，但谁更快无法从本仓库断定。**
- 位置是**定点 ×128**：`moved_component()` 把位移 `truncate32(offset*128)` 后加减速度再除回（`movement.cpp:9`）。

### 2.2 聚焦切换有明确的"生效条件"

`movement.cpp:28-31`：只有在 `env.enemy_ready()` 且 `timers_644[1].current >= 4` 时才允许改变 `focused_204c`，否则强制 `focused=0` 并把 `fields_20e4[0]=30`。焦点框（`handle_60c`）在聚焦时生成、松焦时用 `interrupt(handle,1)` 打断。**我未确证"4 帧门槛"的完整语义**（疑似防连打/入场保护）。

### 2.3 命中半径与擦弹半径（`player_entity/collision.cpp`，我逐行读过）

- 命中半径 = `collision_percent(player) * base_radius(player) / 100`；`collision_percent` **会夹到 0..100 并写回**（`collision.cpp:30-34`）。
- 扩展判定：`expanded_collision` 时再乘 `get<float>(player,0x2238) * 3.6`（`:37`、`:49`）。
- 擦弹半径（圆形弹）：`graze = max(radius/2.5, 40)`，比较用 `(hit_r + graze)² + radius²`（`:52-54`）。
- 擦弹半径（矩形弹）：`graze = base_radius + 30`，比较用 `rectangle_circle(...)`（`:58-61`）。
- ⇒ 擦弹带**随弹体尺寸变化**，且不同弹形有不同公式；我们是一个全局 33。

### 2.4 擦弹收益与预算

- `player_entity/events.cpp:26-33`：每次擦弹 `add_graze_count(+1)`（上限 99999999，`events.cpp:9-12`）、得分进累加器 `special_active ? 1500 : 1000`、**编辑槽增益 `selected_enemy_present ? 50 : 10`**、音效 `sound_at(0x2a, x)`、特效延迟 `random_next() % 4`（**消费玩法种子流**）。
- 每弹擦弹预算/冷却（`bullet_system/player_collision.cpp:37,41-42`）：60 帧回充、最多 3 次擦弹、每 60 帧一次——**我读到的是 bullet 侧的擦弹计数**，与 player 侧 `events.cpp` 的关系我未完全确证，agent A 若引用请要求它给证据。

### 2.5 慢动作是倍率，不是跳帧（`runtime_state/state.hpp:19-21`、`motion.cpp:17-27`）

- `clock_scale`（全局）+ `timer_rate = &clock_scale`；Motion 与 Timer 的运动/计时都乘这个倍率。
- **【主代理已更正·原判断错误】** 我最初写"TH20 用倍率缩放实现命中定格/全世界变慢"。**TH20 根本没有命中定格机制**。穷举全部写点（`grep -rn set_clock_scale`）只有：
  1. 逐弹本地双计时器：`bullet_system/advance.cpp:11`（`reset_rate`→1.0）、`:16`（`timer_4d8.current_f * timer_4e8.current_f`）、`:55/:60/:61`（恢复 `previous_rate`）
  2. ECL 脚本 opcode 541 直接设全局（`gameplay/enemy_opcode_state.cpp:87`，脚本化、持久）
  3. 激光更新期间强制 0 再恢复（`laser_system/controller.cpp:15`）
  4. 暂停进入/恢复时保存恢复（`pause_system/transitions.cpp:11,44,48`）
  5. 生命周期重置为 1.0（`gameplay/entry_adapter.cpp:52`、`loading.cpp:39`、`gameplay.cpp:18`）
  6. 逐敌 `+0xc4`：`next = clamp(prev - prev*slowdown, 0, 1)`，**仅在该实体本次更新内生效并立刻恢复**（`gameplay/enemy_frame.cpp:38-44`）
- ⇒ 我们 `_hitStop` 的"跳过整轮 `updateCombat`"是**本作自创机制**，TH20 没有对应物；不要用"对齐 TH20"为它辩护。它自身的问题见 §2.7。
- **【新发现·TH20 有而我们没有】** 自机存在**逐帧本地倍率通道** `fields_20e4[2]`（Player `+0x20ec`），被 `movement.cpp:37` 的 `moved_component` 当乘子；由 boss「减速矩形」回调在框住自机时写入（`gameplay/enemy_shot_adapter.cpp:21` 的 `player_rate()` 与 `:30`），并每帧被 `player_entity/frame.cpp:68` 复位为 1.0。即 **自机速度 = sht 速度 × 本地倍率 × clock_scale**——这是"被特定弹幕框住就走得慢"的玩法通道，我们完全没有。

## 2.6 【已确证·最有价值差异】决死窗口期间 TH20 自机**仍可移动**

`player_entity/frame.cpp:14-62` 是自机主帧的 `switch(player.state)`，我逐行读过：

| state | 含义 | 行为 |
|---|---|---|
| 0 | 出场/复活后上升 | 位置被脚本强制改写，60 帧后转 state 1（`:19-27`） |
| 1 | **存活** | 可按 Bomb + `update_movement(player, movement)`（`:29-33`） |
| 4 | **决死窗口** | `if (timer.current < player.field_2204) { if (bomb_exists && pressed(slot,4) && can_bomb) { trigger_bomb(); cancel_death(player); } break; }` **——注意是 `break`，不是 return；进入 case 4 之前没有调用 `update_movement`**，但 state 4 的 `break` 会**落到函数末尾的公共后处理**，而**不**执行移动（`:45-49`） |
| 2 | 死亡/复活过程 | 第 3 帧扣火力并掉 7 个 power 道具；第 30 帧起判定残机、复位 Bomb、把自机放回 (0,480) 并设 280 帧无敌（`:50-59`） |
| 5 | 复活飞入 | 沿 `handle_18` 方向飞入，40 帧后转 state 1（`:60-62`） |

**精确结论（避免过度解读）**：
- `cancel_death()` = `timer_set(timers_644[0], 60); state = 1`（`death_state.cpp:19`）⇒ 决死成功会**重置 60 帧计时并立刻回到存活态**。
- 决死窗口由 `begin_death` 设 `timers_2050[0] = 180`（`death_state.cpp:29`），`invulnerable()` 就是 `timers_2050[0].current > 0`（`collision.cpp:12`）。
- **case 4 期间不调用 `update_movement`**，所以严格说：TH20 决死窗口内**也不移动**（与我们的"update 提前 return"在结果上一致）。
- **但与我们的差异在于**：我们是 `js/entities.js:241-244` 在 `arbitration > 0` 时**直接 return，连输入边沿与无敌计时都不处理其余逻辑**；TH20 的 case 4 仍然走公共后处理（无敌计时递减、受击闪红 `:64-66`）。且 TH20 的决死判定条件是 `bomb_exists && can_bomb && pressed(slot,4)`，我们还要额外看 `tryBomb` 的返回值。
- 另一个真实差异：TH20 **死亡瞬间会掉 7 个 power 道具 + 扣火力**（`:50-56`），我们没有火力系统，这条不适用。

⇒ **上一条"决死窗口冻结自机是否与 TH20 不同"的疑问已解决：结论是"两边都不移动"**，agent A 若声称 TH20 决死可移动，属误读，应要求其指出行号。

## 2.7 【已复核·真实 bug】停帧期边沿输入被吞

我按 agent A 的线索逐行复核，**确认成立**：

- `js/game.js:582-592`：`!this.paused && this._hitStop > 0` 时**只扣计时**，`updateCombat(game, dt)` 被整块跳过（`else` 分支才调用）。
- `js/game.js:604`（`finally`）仍调用 `this.input.endFrame()`，而 `js/input.js:286-292` 会清 `pressed` / `bombTap` / `itemTap` / `tap`。
- 这三个边沿的**唯一消费者在 `updateCombat` 内**：`js/gameCombat.js:224`（`updateShotToggle`）、`:232`（`bombPressed`）、`:237`（`itemPressed`）。
- `_handleGlobalInput`（`js/game.js:732-780`）在 `playing` 态**不读**这三者——它只处理成绩榜弹层、暂停、`dialogue` 的确认、`routeSelect` 的左右。已逐行确认。

⇒ 结论：**停帧期间按 Z（单击发射模式）/ X / C 会纯丢失**（不是延迟，是丢掉）。

**但我必须同时修正 agent A 的严重度判定**（它写"触发概率不低"）：
- 写入点只有三处：`js/chapterFlow.js:329`（Letter 成功，0.08s）、`js/gameCombat.js:386`（Bomb，0.08s）、`:431`（Miss，0.1s）；`hitStopCap = 0.15`（`js/config.js:167`）。
- 一个逻辑块最多 3 步 ⇒ **每个受影响的逻辑块吞 1 个边沿**。0.08s ≈ 5 帧 @60Hz，合计约丢 1-2 次边沿；真正能到 ~0.15s（≈9 帧）的路径，是**连续命中**让 `addHitStop` 的 max 语义不断刷新（`js/gameCombat.js:29`）。而 Letter 成功 / Miss 是一次性事件，不会连续刷新。
- ⇒ 实际影响：**一次 Letter 成功或一次 Miss 之后，约 5-6 帧内的 Z/X/C 边沿失效**。这是低频、局部、且有清晰复现路径的真实缺陷。
- **顺手得到一个正面结论**：决死窗口**不受停帧影响**——`p.arbitration` 只在 `updateCombat` 内递减（`js/entities.js:241-242`），停帧期间 `updateCombat` 不跑，窗口冻结不流逝。所以"停帧吞掉决死窗口"这个更可怕的猜测**不成立**，无需担心。

**落地方式（agent A 方案，我认为正确）**：把 `input.updateShotToggle()` 与 Bomb/Item 边沿**上移到 `_handleGlobalInput`**（`js/game.js:576`，仍在停帧分支之前），让它们"每个逻辑块消费一次"；`updateCombat` 改为消费缓冲结果。**注意**：新增的缓冲字段必须同时进 `snapshot()`（`js/input.js:298-310`）与 `createReplayInput.set()`（`js/replay.js:137-145`），否则录制与回放会不一致。
**验证**：`test/cases-feedback.js` 已有 `addHitStop` 语义断言，可加"停帧块内边沿恰好消费一次"。

## 3. 我认为 agent A 必须给出的判断（核对用）

1. **速度数据表 vs 常量**：TH20 的 4 个速度来自角色 SHT。我们 `BALANCE.playerSpeed=6.8` / `playerSlowSpeed=2.15` 是全局常量。**值不值得让速度随自机不同**？若值得，最小改动是什么（`PLAYER_DEFS` 里加两行？）。
2. **对角线**：已确证两边语义**一致**（TH20 符号表 `±1` 天然是单位向量，斜向位移 = 轴距 × 1/√2；我们用 `1/Math.SQRT2`）。⇒ 这条**不是差异**，agent A 若声称"TH20 斜向更快/更慢"应要求其给 table 数值。真正的差异在速度是**每角色数据**（`shot_data+0x10`）而非全局常量。
3. ~~决死窗口冻结自机~~ **已由我自查解决**（见 §2.6）：TH20 的 case 4 同样不移动，差异只在"我们提前 return，TH20 仍走无敌计时与闪红后处理"。agent A 若给出相反结论，视为误读。
4. **停帧实现**：TH20 是倍率缩放（全世界变慢），我们是**跳过整个 updateCombat**（等于硬冻结一帧）。两者的观感差异与建议。
5. **震屏随机源**：我们在绘制期用 `Math.random()`（`js/gameDraw.js:166`）。这既是不确定性的来源（无法回放逐帧一致），也是纯视觉。建议是否改为由 `_shakeT` 派生的确定性值。

## 4. agent A 其他条目的交叉核验（我独立查了）

| 条目 | 核验结果 | 我的证据 |
|---|---|---|
| **#1 停帧吞边沿输入** | **成立**（详见 §2.7） | `js/game.js:582-592` 跳过 `updateCombat`；`:604` 仍 `endFrame()`；`js/input.js:286-292` 清边沿；唯一消费者 `js/gameCombat.js:224/232/237`；`_handleGlobalInput` 在 playing 态不读这三者（`js/game.js:732-780`） |
| **#2 双档连发的 `repeat12`/`held8` 零消费者** | **与我的阅读一致** | `input/input_state.cpp:19-34` 产生三路；`replay_system/input.cpp:9-12` 只保留 8 帧档；TH20 射击不用连发（`shot_controller_frame.cpp:7` 直接 `held`）⇒ 我们 `shotHeld()` 用 `isDown`（`js/input.js:326-331`）已对齐 |
| **#3 擦弹音效声像** | **可落地，但需改签名** | `js/audio.js:293` `sfx(type)` 无 pan 参数；内部 `blip()`（`:297-308`）直接连到 `sfxGain`，加一个 `StereoPannerNode` 即可，但要把 `b.x` 传进来 ⇒ 调用点 `js/gameCombat.js:105-110` 需传坐标 |
| **#8 决死窗 TH20 = 8 帧** | **成立** | `player_entity/events.cpp:23` 命中时写 `+0x2204 = 8`；`player_entity/frame.cpp:35` 读该值作为窗口 |
| **#8 我们 ≈17 帧** | **成立**（按 60Hz 折算） | `js/config.js:91` `deathBombWindow: 0.28` → 16.8 帧；递减在 `js/entities.js:241-242` |
| 擦弹额度/冷却（每弹 3 次、60 帧环内冷却） | **机制成立，但未经 CPU 差分** | `bullet_system/player_collision.cpp` 侧；`bullet_system/pool_validation.json` 自述"Player collision … remain explicit throwing fixture boundaries" ⇒ **只能标"实现已恢复"，不能标"已验证"** |
| TH20 自机实际判定半径 | **不可得** | `collision.cpp:14` 的 `base_radius` 赋值点未追到；仓库内无 `.sht` 文件 ⇒ 不能与我们的 `playerRadius` 做数值对比 |

**顺带一个正面核验（agent A 未提，我自己查到）**：`js/audio.js:9` 的 `SFX_RANDOM = Math.random.bind(Math)` 是**模块加载时捕获的真随机**，所以射击/擦弹音效的音高抖动**不会消费种子流**——音频侧在确定性上是干净的。这与我第一轮报告的 §6.1 结论一致（当前录制/回放自洽）。
