# TH20（東方錦上京）源码重建工程的参考价值分析

> 日期: 2026-10-05
> 对象: `~/Touhou20` — TH20 ver 1.00c PE32/x86 的**独立 C++ 源码重建**工程（非原版源码，是按二进制恢复 + 原 CPU 差分验证的实现）
> 方式: **只读**调研。未修改 Touhou20 任何文件，未改动本仓运行时代码。
> 目的: 找出其中值得我们借鉴的**机制/实现逻辑**，以及明确**不适用**的部分。

---

## 实施状态（2026-11-08）

| 项 | 状态 | 落点 |
|---|---|---|
| 停帧期边沿输入 | ✅ 已修 | `combatEdges.js`，PR #48 |
| 道具存活上限 | ✅ 已修 | `BALANCE.itemLiveCap=480`，PR #49 |
| 震屏确定性 | ✅ 已修 | `drawGameFrame.shakeOffset`，PR #50 |
| 分数滚动缓动 | ✅ 已完成 | `stepScoreRoll`，PR #51 |
| Boss 环血缓动 | ✅ 已完成 | `_hpShown`，PR #52 |
| 存档写失败可感知 | ✅ 已完成 | `writeStored` / `onStorageError`，PR #55 |
| 关键进度备份 | ✅ 已完成 | `<key>_bak`，PR #62 |
| 屏外剔除宽限 | ✅ 已修 | `Bullet._cullAllowed`，PR #60 |
| 波次 runner B0 | ✅ 已完成 | `installWaveScript`，PR #61 |
| 黄金哈希 B1 | ✅ 已完成 | 202 章 × 600 帧，PR #56 / #64 |
| 背景 P0 随机注入 | ✅ 已完成 | `StageBackground({ rand })`，PR #58 |
| 背景 P3 easing | ✅ 已完成 | `backgrounds/easing.js`，PR #63 |
| 背景 P1/P2 原子化/数据化 | ⏳ 未做 | 需逐像素基线 |
| B2 EX mob 原型化 | ✅ 53/62 | `stages/archetypes.js`，PR #61–#83 |
| A7 排行用时 | ✅ 已完成 | `duration` + 榜单列，PR #70 |
| A8 stageReached 去 DOM | ✅ 已完成 | `chapterLabel.js` + `furthestChapterId`，PR #87 |
| M1 弹体修饰符时长 | ✅ 已完成 | `tSpin/tAccel/tGravity/tHoming`，PR #88 |
| 平衡项 A5/A6/H2/H6（P6） | ⏳ 未做 | 改变手感，需手测/倍率决策 |
| 内容扩充 E1/E3/E4（P7） | ⏳ 未做 | 需章节/主题方向 |
| H7/H8 | ✅ 已完成 | v2 紧凑帧 + `endState.letters`；v1 冻结分支可读不维护 |
| H9、M2 | ⏳ 未做 | 菜单按住重复行为 / 弹种表重构，需产品取舍 |

> 本表只记实施状态；需求与取舍仍以下文原始条目为准。

---

## 0. 怎么读这份文档

- 每条建议 = 「我们现状 → TH20 做法 → 证据 → 迁移到 450×600 Canvas 的落地方式 → 成本/风险」。
- 证据路径统一相对 `~/Touhou20/source_reconstruction/`；本仓路径相对仓库根。
- **重要前提**：TH20 工程的版本、差分验证覆盖度**因模块而异**。下文标注了哪些结论经过其原 CPU 差分（数千~百万项）验证，哪些是「已重建但未全量验证」。凡是把 TH20 当"权威设计"来抄之前，先看该条的验证状态。
- 坐标/常量不可直接搬：TH20 版面是 **384×448**，我们是 **450×600**。搬**规则形状**，不搬数值。

---

## 1. 总览：值不值得参考

**值得**。这个工程的价值不在"美术/流程设计"，而在**引擎级机制的显式化**——它把商业游戏里通常隐式的规则写成了可读的 C++：

| 我们可能受益的领域 | TH20 对应模块 | 收益类型 |
|---|---|---|
| 擦弹手感（半径/预算） | `player_entity/collision.cpp` | 手感 |
| 消弹的"相位"而非删除 | `bullet_system/{cancellation,frame,advance}.cpp` | 正确性 + 观感 |
| 屏外剔除延迟 / 回场弹 | `bullet_system/{bounds,advance}.cpp` | 修 bug |
| 分数/血条缓动 | `hud_system/scoring.cpp`、`hud_system/update.cpp` | 观感 |
| 道具池上限 / 伤害→道具配额 | `item_system/*`、`damage_regions/damage_rewards.cpp` | 修 bug + 表现 |
| 多部件命中不叠伤 | `damage_regions/damage.cpp` | 正确性 |
| 录像帧编码 / 分段记录 | `replay_system/{replay.hpp,input.cpp}` | 体积 + 功能 |
| 菜单按住连发 | `input/input_state.cpp` | 易用性 |
| 重开/暂停时资源状态回滚 | `bullet_system/stage_reset.cpp` | 参考实现方式 |

**不值得**：一切为了与 x86 机器码逐位对齐而存在的东西（SSE 标量顺序、int32 回绕、32 位对象布局、2001 槽定长池、侵入式链表、D3D9/GDI/ANM、存档加密与反作弊校验和、线程锁）。

---

## 2. 行动清单（按性价比排序）

| # | 项 | 收益 | 成本 | 风险 | 建议 |
|---|---|---|---|---|---|
| H1 | 消弹改"相位"（cancelled 态 + 短淡出） | 观感 + 消除竞态 | 低 | 低 | 推荐 |
| H2 | 擦弹半径随弹体尺寸派生 + 擦弹预算 | 手感 | 低 | **中（改判定）** | 需手测 |
| H3 | 道具池上限 + 伤害→道具配额 | 修无上限 bug | 低 | 低 | 推荐 |
| H4 | 分数/血条缓动（加速式 + 夹钳） | 观感 | 极低 | 极低 | 推荐 |
| H5 | 屏外剔除延迟 + "回场中"不剔除 | 修 bug | 低 | 中 | 推荐 |
| H6 | 编辑槽（edit）增益区分"有选中敌机" | 手感 | 极低 | 低 | 推荐 |
| H7 | 录像输入改紧凑编码 | 体积/内存 | 中 | 中 | 可延后 |
| H8 | 录像按段记录（含本章 Letter 收取用时） | 功能 | 中 | 中 | 可选 |
| H9 | 菜单按住连发双档速率 | 易用性 | 低 | 低 | 推荐 |
| M1 | 弹体运动修饰符加"时长" | 关卡可读性 | 中 | 中 | 关卡需求驱动 |
| M2 | 弹种样式表（半径/视觉/调色板一处登记） | 可维护性 | 中 | 低 | 有痛点再做 |
| M3 | 多部件命中：同组取最大 + 单帧上限 | 正确性 | 中 | 低 | 未来加子机/贯通激光时 |
| M4 | 存档"备份在下、主文件覆盖" | 健壮性 | 中 | 低 | 可选 |
| M5 | 结算 bonus 行可读化（阶段/资源分行） | 信息量 | 低 | 低 | 可选 |
| R1 | 把非玩法代码移出 `withSeededRng` 作用域（见 §6.1） | 抗未来失同步 | 极低 | 低 | 推荐 |
| R2 | 震屏偏移改确定性值（见 §6.1） | 抗未来失同步 | 低 | 低 | 推荐 |
| R3 | 乘法衰减系数（`damped`，见 §6.3） | 手感可调性 | 极低 | 低 | 有新弹幕时用 |

---

## 3. 逐条详述

### H1 消弹应是"状态相位"，不是当场删除

**现状**：`js/patterns.js:248` `clearBulletsToItems` 直接 `b.dead = true`，同帧 `js/gameCombat.js:339` `purgeDeadBullets` 把对象还池。结果：消弹**没有**逐弹淡出/闪白过程，且 `dead` 一置，碰撞、绘制、擦弹分支各自要再判一次 `dead`。

**TH20 做法**：消弹 = `state=4` 的相位转移，不是删除。

- `bullet_system/cancellation.cpp:30` — `cancel()` 把 `b.state=4`
- `bullet_system/advance.cpp:43-44` — state 4 时不推进运动
- `bullet_system/advance.cpp:60` — 只在消弹动画播完后才真正回收
- `bullet_system/frame.cpp:20,33` — `flags&0x200`（不可碰）同时决定**不画**（不进展示桶）与**不判自机命中**
- `bullet_system/cancellation.cpp:17` — `flags&0x200` 时**不掉道具**
- 幂等靠状态而非标志位：`cancellation.cpp:13` 跳过 `state!=1&&state!=2`，天然防止"消弹两次"

**落地方式**：`Bullet` 增一个相位字段（`active | waiting | cancelled | dead`）+ `cancelT`。

```js
// entities.js update() 开头
if (this.phase === 'cancelled') {
  this.cancelT -= dt;              // 只走淡出
  if (this.cancelT <= 0) this.dead = true;
  return;
}
```

`clearBulletsToItems` 改为 `b.phase = 'cancelled'; b.cancelT = 0.12;`；`collision.js` 的敌弹循环与 `gameDraw` 各加一处相位跳过；`purgeDead` 不动（仍以 `dead` 为准）。**得分/掉落仍在消弹那一刻结算一次**（保持现有数值），相位只影响视觉与后续判定。

**收益**：消弹有观感层次；`dead` 的语义变纯粹（"可回收"），不再兼任"不可碰"。
**成本**：`entities.js` ~20 行 + `collision.js` 2 处 + 绘制 1 处。有 `test/cases-collision.js`、`cases-pools.js` 可加断言。
**风险**：低。唯一要小心的是消弹瞬间的得分不能因为相位重入而重复（保持"结算在置相位那一次"即可）。

---

### H2 擦弹半径应由弹体尺寸派生（当前对所有弹一视同仁）

**现状**：`js/config.js:103` `grazeRadius: 33` 是全局常量，`js/collision.js:246,286` 对任何弹都用 `grazeR + b.r` 与 `pr + b.r`。于是：

- 3px 的 `dot` 与 30px 的 `medium/large`，擦弹"环带"宽度完全相同；
- 弹体越大，`hitR` 越大，擦弹可见环带相对越窄——大弹擦弹判定几乎贴着中弹判定，体感"擦不到"。

**TH20 做法**（`player_entity/collision.cpp:52-53`，我直接读了源码复核）：

```cpp
float graze_radius = divide(radius, 2.5f);      // radius = 该弹的判定/视觉尺寸
if (graze_radius < 40.0f) graze_radius = 40.0f; // 下限
const auto total = add32(hit_radius, graze_radius);
// 命中：dist < hit_r² + radius²
// 擦弹：dist < total² + radius²
```

即**大弹的擦弹带按比例变宽，小弹有下限保底**。矩形（rice/talisman 类）另有 48×48 的擦弹盒（`collision.cpp:44`），激光用 `base_radius + 30`（`:58`）。

**擦弹收益**也在同一处（`player_entity/events.cpp:26-33`，已核实）：

- 每次擦弹 +1 计数，上限 99999999（`events.cpp:9-12`）
- 得分累进：`special_active ? 1500 : 1000`（进"奖励累加器"，不是直接加分）
- **编辑槽增益：`selected_enemy_present ? 50 : 10`** —— 见 H6
- 擦弹特效延迟用 `random_next() % 4`（**会消费种子流**，回放必须同序）

**落地方式**（建议最小改动）：

```js
// config.js
grazeRadiusBase: 40,      // 原 33 的角色相关下限，取 TH20 形状
grazeRadiusOf: (b) => Math.max(BALANCE.grazeRadiusBase, (b.r || 0) * 2.5),
```

或更保守：保留 `33` 作为下限，`grazeR = Math.max(33, b.r * 2.5)`。`collision.js` 两处（圆弹、激光）各取一次该值。

**收益**：大弹擦弹变可行，弹幕层次感更强；小弹手感不变（下限保护）。
**风险**：**这是判定改动**，按仓库红线必须手测 + 写进测试。建议先在 `cases-collision.js` 加"大弹擦弹带 > 小弹擦弹带"的纯几何断言，再手测 A4/A5 Letter 与 EX。
**不改**：`editPerGraze`（保留现有 1.15，属于平衡数值，不在本次参考范围）。

---

### H3 道具池需要"存活上限"，消弹 → 道具应走配额

**现状**：`js/gameCombat.js:570` `spawnItem` 只做 Nomiss 拦截，`game.items.push(...)` **无任何存活上限**；`js/itemPool.js` 的 `MAX_POOL=256` 只是**回收缓存**上限，超出就 `new`。于是 `fullScreenClear`（Bomb / 编辑槽消弹）一次可以把几千颗弹变成几千个道具对象。

**TH20 做法**：

- 定长池 1536，其中普通 512 / 特殊 1024（`item_system/item.hpp:27`，`item_system/state.cpp:16`）
- 取不到就**静默返回 null**（`item_system/spawn.cpp:12,23,28`）——宁可少掉一个，也不让场上无限增长
- 消弹路径不直接加分，而是**掉道具**（`bullet_system/cancellation.cpp:25` → `drop_items.cpp:4-15`）；伤害也是累加后过阈值才产出道具（`damage_regions/damage_rewards.cpp:8-14`：累加进 `overlay+0x38`，每跨过 `0x3c` 配额出 1 个）
- **只有消弹才掉道具**；超时/出屏自然消失不掉（`bullet_system/movement.cpp:68-72`）

**落地方式**：`spawnItem` 开头加存活上限（建议 400~512，按浏览器实测调）：

```js
export function spawnItem(game, x, y, kind = 'score') {
  if (game.mode === 'nomiss' && kind === 'life') return;
  if (game.items.length >= (BALANCE.itemLiveCap ?? 480)) return; // 静默丢弃
  game.items.push(acquireItem(x, y, kind));
}
```

进阶（可选）：把全屏消弹的"每弹掉一件"改成"每 N 弹掉一件"的配额，直接减少对象量。

**收益**：消除无上限增长（Bomb 连发 / 高弹幕量下的内存与 GC 峰值）；掉落观感更克制。
**成本**：1~3 行。`test/cases-pools.js` 可加"超上限不再 push"的断言。
**注意**：`clearBulletsToItems` 目前对每颗弹都 `addScore`（`patterns.js:252,260`），**这条不放**——那是我们的既有平衡，改上限不要顺带改得分。

---

### H4 分数与 Boss 血条的缓动可以更"有质感"

**现状**：`js/hud.js:139-146` 直接把 `game.score` 格式化后写入 DOM，**没有缓动**；Boss 血条无填充过渡。

**TH20 做法一（分数滚动，`hud_system/scoring.cpp:13-18`，已核实）**：

```cpp
step  = clamp((target - score) / 32, 1, 0x8d55e);
speed = max(prevSpeed, step);        // 保留速度 → 会"加速"而不是匀速逼近
speed = min(speed, target - score);  // 夹钳：绝不冲过头
score += speed;
if (score >= target) speed = 0;      // 到位归零
```

关键两点：**速度持久化**（越滚越快）与**剩余量夹钳**（无过冲——否则还得另写修正）。
另外：暂停菜单打开时会把滚动值**强制对齐**真值（`pause_system/menu.cpp:48`），避免结算显示的是中间值。

**TH20 做法二（Boss 血条，`hud_system/update.cpp:64-75`）**：
显示值向上缓动 `+0.025/帧`，**且永不高于真值**（`if (real < display) display = real`）。于是掉血立刻掉、回血/换阶段缓慢补满。

**落地方式**：`hud.js` 增两个模块级变量 `_shownScore` / `_scoreSpeed`，在 `updateGameHud` 里先缓动再 `setText`：

```js
const target = game.score;
const step = Math.max(1, Math.min((target - _shownScore) / 32, 0x8d55e));
_scoreSpeed = Math.max(_scoreSpeed, step);
_scoreSpeed = Math.min(_scoreSpeed, target - _shownScore);
_shownScore += _scoreSpeed;
if (_shownScore >= target) _scoreSpeed = 0;
```

**注意**：`setText` 已有"值未变不写 DOM"的缓存（`hud.js` 的 `cache`），缓动期间值每帧都变，等于每帧写一次——**只在 `state === 'playing'` 时缓动**，暂停/结算时直接对齐真值（正好也是 TH20 的做法）。

**收益**：得分有"跳字追赶"的爽感，属纯视觉、零判定影响。
**成本**：~15 行。**风险**：极低。

---

### H5 屏外剔除：加出生宽限 + "正在回场"不剔除

**现状**：`js/entities.js:112-117`（直飞快路径）与快速路径外的分支，只要坐标越过 `±40` 边距立即 `dead = true`。后果有两类：

1. 从屏外很远的地方出生、需要几帧才进场的"雨/柱"弹——若出生点已在边距外，**第一帧就可能被剔掉**；
2. 追踪/回旋弹一旦飞出边距就再也回不来。

**TH20 做法**：

- 出生后设 **5 帧剔除延迟**（`bullet_system/shoot.cpp:47` `b.field_30=5`），延迟未走完不剔除（`advance.cpp:53-55,59`）
- 屏外时若**速度方向仍朝向场内**，进入"屏外延迟"状态继续存活（`bullet_system/bounds.cpp:36-51` 的角点/叉积判定）
- 剔除用精灵外扩域，不是固定小边距

**落地方式**（最小可用版）：`Bullet.reset` 增 `this.cullGrace = 0.08`（约 5 帧），`update` 里先 `cullGrace -= dt`；屏外剔除条件加 `&& this.cullGrace <= 0`。回场判定可简化为"速度分量指向场内"：

```js
const headingIn = (this.x < OFF_MIN_X && this.vx > 0)
  || (this.x > OFF_MAX_X && this.vx < 0)
  || (this.y < OFF_MIN_Y && this.vy > 0)
  || (this.y > OFF_MAX_Y && this.vy < 0);
```

**收益**：修掉"雨弹第一帧消失"与"追踪弹出屏不回来"。
**风险**：中——会**增加存活弹数**（多存活 ~5 帧 + 回场弹），需按 `docs/perf-optimization.md` 的方式实测帧率；若场上弹数明显上升，把宽限收到 2~3 帧。
**验证**：`cases-patterns.js` / `cases-collision.js` 加"出生在屏外的弹存活 >1 帧"的断言。

---

### H6 编辑槽增益：区分"是否正在打选中敌机"

**现状**：`js/gameCombat.js:99-106` 擦弹固定 `p.edit += BALANCE.editPerGraze * grazeMul`（1.15），满分 100。无论道中还是 Boss 阶段，涨速完全一样。

**TH20 做法**（`player_entity/events.cpp:31-33`，已核实）：

```cpp
const int gain = host.selected_enemy_present() ? 50 : 10;
```

即**场上有"选中/主目标敌机"时，擦弹的能量增益是平时的 5 倍**。配合其 `meter_minimum/meter_maximum` 表（`gameplay/stage_data.cpp:49-50`：`{10000,10000,10000,10000,10000,100000}` / `{200000,500000,700000,1000000,500000,1000000}`，末尾一项是 Extra）——**能量需求的上下限按难度独立成表**，而不是靠一处全局倍率。

**落地方式**：`BALANCE` 增 `editPerGrazeBoss`（如 `editPerGraze * 3`），在擦弹结算处按"是否存在 Boss/精英"取值：

```js
const bossUp = !!(game.bossRef && !game.bossRef.dead);
const gain = BALANCE.editPerGraze * (bossUp ? (BALANCE.editPerGrazeBossMul ?? 3) : 1);
```

**收益**：擦弹在 Boss 战的价值感明显不同，鼓励贴身。
**风险**：低，但**属平衡改动**，必须写进 `BALANCE` 并手测（不同倍率对 Letter 战影响大）。
**额外可参考**：`meter_minimum/meter_maximum` 的"按难度 6 项独立表"是我们 `DIFFICULTIES` 之外另一种组织方式；若将来觉得"难度只缩倍率"不够表达，可考虑把阈值/需求也做成每难度一行。

---

### H7 录像每帧输入可以压到 6 字节【✅ 已完成（v2 紧凑帧）】

**现状**：`js/input.js:298-310` `snapshot()` 每逻辑块返回**新对象 + 3 个新数组**：

```js
{ d: [...down], p: [...pressed], m: [..._moveSeq], t: [x,y]|null, v: [x,y]|null, a,b,i,l }
```

录制期每帧（每秒最多 180 次，`_loop` 最多 3 步）都做这些分配，全部攒在 `_recordFrames` 里，**直到保存时才 RLE 编码**（`replay.js:36`）。长局的内存与 GC 压力都在这里。

**TH20 做法**（`replay_system/replay.hpp`，已核实）：

```cpp
struct InputFrame { std::uint16_t current, pressed, released; };   // 6 字节
struct RecordingChunk { InputFrame inputs[36000]; std::uint8_t fps[36000]; ... };
```

- **每帧 6 字节**（三个 16 位位掩码），不是键名数组
- 位掩码由 `input_state.cpp:21-22` 派生：`pressed=(cur^prev)&cur`、`released=(cur^prev)&~cur`
- 分段 36000 帧/chunk（约 10 分钟），**边录边写**而不是全程驻留内存
- `StageRecord` 里带 `seed`（**每面独立种子**，`replay.hpp` `StageRecord.seed`）与 `capture_times[20]`（本章符卡收取用时）

**落地方式**（分两步，可只做第一步）：

1. **录制期就编码**：`snapshot()` 改为返回一个紧凑结构（例如 `[dMask, pMask, moveMask, tapX, tapY, flags]`，键名 → 固定索引映射表放 `config.js`）。RLE 的 `sameSnap` 相应简化（数值比较，不再 `eqArr`）。这是最大收益，改动面集中在 `input.js` / `replay.js`，且有 `cases-replay.js` 兜底。
2. **分段落盘**：录到 N 帧先写一次 IndexedDB（`replayStore.js` 已有 `put` 语义），避免长局驻留。
3. **每面种子**：若将来希望"从第 3 面开始回放"或降低长局漂移风险，在 `endState` 之外加 `stages: [{chapterId, seed, score, letterTimes}]`。

**注意**：`REPLAY_VERSION` 必须一起升，`validateReplay`（`replay.js:85`）要能同时读新旧两种帧格式或明确拒绝旧格式。
**风险**：中——录像格式是持久数据，需要"旧录像仍可播放"或"明确提示版本不符"的策略。

---

### H8 录像可携带"本章数据"（我们在意的 Letter 用时）【✅ 已完成（本局 Letter 记录）】

**现状**：我们已有 `gunwei_letter_rate`（`STORAGE_KEYS`）记录 Letter 收取成功/尝试，但**不随录像保存**，回放时看不到那一局的信息。`endState` 只有终局快照（`game.js:717-724`）。

**TH20 做法**：`StageRecord` 每面记录 `seed / frame_count / fixed_x / fixed_y / capture_times[20] / player_table`（`replay_system/replay.hpp`），且**符卡最佳用时以带校验的和编码**存进录像的 `0x1c + capture_index*4`（`card_system/timing.cpp:22-34`、`card_system/encoding.cpp:3-8`）。回放界面因此能显示"本局这一面各符卡的收取用时"，而不是只有总分。

**落地方式**：`_saveReplay` 的 `header`/`endState` 增 `letters: [{chapterId, name, attempts, captures, bestTimeSec}]`，来源就是现有的 Letter 收取记录；回放信息页展示。数值编码不需要抄它的 32 位打包，用普通数字即可（**校验和的意义在于拒绝损坏数据**，我们可以用版本号 + 字段存在性检查替代）。

**收益**：录像列表/回放页信息量上一个台阶。
**成本**：中（数据收集 + UI）。**风险**：低（附加字段，格式向后兼容）。

**同模块另外两点可直接借（`replay_system/frame.cpp`，已核实）**：

1. **快进时同步 BGM 秒数**：快进期间每 8 帧才推进一次逻辑（`o.frame%8!=0` 时返回控制码 6 跳过），松手时按 `(当前帧 - 8) / 60` 调用 `seek_seconds`（`frame.cpp:42-44`）——快进结束不会画面与音乐脱节。我们已有 `audio.seekMusic`，可用于回放快进收尾。
2. **回放期显示 FPS 并按帧率染色**：`if (o.fps<30) 红 : o.fps<50 粉 : 白`（`frame.cpp:48-52`），`fps` 每 30 帧采一次。**这既是信息展示，也是「回放掉帧/不同步」的现场诊断**——我们回放时若 `_runLogicBlock` 跟不上录像 steps，正好可用同一手段暴露。


---

### H9 菜单按住连发应分"首延迟 + 快速重复"两档

**现状**：`js/input.js` 只有 `down/pressed/released` 集合，`js/menuNav.js` 这类导航靠浏览器的 auto-repeat 或逐次按键；长列表（录像列表、章节列表）按住方向键的滚动速度取决于操作系统设置，且**不进我们的逻辑时钟**。

**TH20 做法**（`input/input_state.cpp:16-28`，已核实）：每个按键维护计数，产生**两路独立重复位**：

```cpp
if (state.repeat8_count[i] > 7)  state.held8 |= bit;                       // 按住 >7 帧 → 8 帧周期重复
if (state.repeat8_count[i] > 25) { state.repeat8 |= bit; count -= 8; }     // >25 帧起，8 帧一次
if (state.repeat12_count[i] > 25) { state.repeat12 |= bit; count -= 12; }  // 另一档 12 帧一次
```

即"**先 ~25 帧缓冲（防误连跳），之后 8 帧一拍**"，并按逻辑帧计数——与暂停、加速、回放天然一致。

**落地方式**：`Input` 增 `repeat(code, {first=25, rate=8})` 查询（内部按行/列帧计数，`endFrame` 时累加），`menuNav.js` 的上下/左右改用 `repeat`。**对局内不要用它**（射击/炸弹仍是边沿触发）。

**收益**：长列表按住滚动顺滑且可预期；不再受系统键盘设置影响。
**成本**：`input.js` ~25 行 + `menuNav.js` 调用点替换。**风险**：低；注意回放输入对象 `createReplayInput`（`replay.js:124`）也要提供同名方法（返回 `justPressed` 语义即可），否则签名不一致。

---

### M1 弹体运动修饰符加"时长"（关卡可读性）【✅ 已完成】

**现状**：`js/entities.js:94-172` 每个弹有 `spin/accel/gravity/homing`，但**没有任何一个会自己结束**——要"加速 0.5 秒后匀速"只能在关卡里另开计时器手动改 `b`。

**TH20 做法**：运动修饰符是 `field_90` 的位，**每个修饰符自己清位并回报"完成"**（`bullet_system/advance.cpp:28-40`，`movement.cpp:27-33`），指令设置"位 + 时长"（`extended_commands.cpp:47-99`）；积分器按**固定顺序**跑（发射加速→线性加速→角加速→连续转向→反弹→追踪→位置插值…），并且 `do{...}while(finished)` 允许同一帧内某个修饰符结束时重跑整批。

**落地方式**：`Bullet` 增 `tSpin/tAccel/tGravity/tHoming`（为 `null` 表示永久，与现状兼容），`update` 中减到 0 就清掉对应字段。这样关卡可以一行表达"前 30 帧加速"。

**收益**：关卡表达力；减少 stage 文件里的手工计时状态机。
**成本**：~40 行，且需回归现有全部章节（含 EX 62 个 mid）。**建议**：只在新增弹幕时使用，不批量改写存量。

---

### M2 弹种样式表（一处登记半径/视觉/调色板）

**现状**：`js/entities.js:36-39` 的 `hitR(type)` / `visualSize(type)` 已经把"判定半径"与"视觉尺寸"分开——方向是对的；但两者分散，调色板散在 `patterns.js` 与各 stage 的调用点。

**TH20 做法**：`bullet_system/style.hpp:5-12` + `style_data.cpp:5` 是 **50 行纯数据表**（脚本、颜色 ×16×5、半径、绘制分组、消弹类型、子动画），`shoot.cpp:30-47` 与 `style.cpp:29-36` 只做查表。是**数据表，不是函数指针表**。

**落地方式**：把 `hitR/visualSize` 与默认色合并为 `BULLET_STYLES[type] = { r, w, h, color, color2, drawGroup }`，`collision.js` / `draw/bulletDraw.js` / `patterns.js` 查同一张表。

**收益**：加弹种只改一处；避免"判定与视觉不同步"。
**成本**：中（改动面广但机械）。**建议**：当"再加一个弹种要改 3 个文件"真正成为痛点时再做。**不要**引入函数指针/回调表——`switch` + 数据表已经够。

---

### M3 多部件命中：同组取最大、加单帧上限（未来做子机/贯通时）

**现状**：`js/collision.js:194-240` 每颗自机弹独立命中、独立 `e.hurt(b.damage)`。同帧 5 颗弹命中同一敌机就是 5 次伤害，靠"敌机已死"避免溢出，**没有"同组不叠加"与"单帧伤害上限"**。

**TH20 做法**（`damage_regions/damage.cpp:21-51`，已核实）：

- 每个伤害区域有 `period`（每 N 帧生效）、`cooldown`、`damage_limit`、`damage_group`
- **4 个伤害组不叠加**：同组内先在累加值里**减去**上一区域的贡献，再加新值（`:29,40`）——等价于"同组取最大"
- `region.last_target == target` 就直接跳过，且 `last_target` 每帧重置 ⇒ **每个区域对每个目标每帧最多一次**（`:29-31`）
- 最后统一过一个**单帧上限**（来自自机火力参数，`:48-50`）
- 伤害→奖励也在这里（`:42-46`）

**落地方式**（仅在我们加子机/贯通激光/多段 Boss 判定时）：把玩家侧的伤害来源先聚合成 `{group -> max, cap}` 再一次性结算，而不是在 `applyHit` 里逐弹施加。

**收益**：多部件构型下不会虚高 DPS（我们已有 `cases-boss-dps.js`，正好能加断言）。
**成本**：中。**当前不建议做**——单机 6 发弹的规模下现有模型更简单直接，且改动会触碰全部平衡。

---

### M4 存档：备份在下、主文件覆盖

**现状**：`js/storage.js` 单键 `setItem`，写一半（配额超限/被中断）就只能靠 `parseStored` 返回 `undefined` 兜底（`F08` 已做安全读）。排行榜、进度、录像索引都是这一模式。

**TH20 做法**（`progress_state/file_codec.cpp:7-11,28-41`、`manager.cpp:44-48`）：**备份快照作为默认层，主文件逐记录覆盖**在上面解析。不用临时文件 + rename，也能从"半写坏"的文件恢复出上次的内容。

**落地方式**：写 `gunwei_x_bak`（上次成功值）后再写 `gunwei_x`；读时先取 `_bak` 作为底，再用主键覆盖。适合用在**最不能丢的**：`gunwei_unlocked` / `gunwei_nomiss_progress` / `gunwei_ranking`。

**收益**：极端情况下的进度保全。
**成本**：中（每类数据都要有合并规则）。

---

### M5 结算行可读化

**现状**：`js/chapterFlow.js:296-349` 的结算系数已经"先加后显示"（顺序是对的，值得保留），但展示偏向"一个总倍率"（`NMNB ×1.32` / `Perfect ×1.05` / `Letter +xxx`）。

**TH20 做法**：`stage_clear/bonus.cpp:12-19` 把 bonus 拆成 `stage*100000 + power*Σlevels + Σphases*100000`，**逐行显示命名过的统计**（`stage_clear/draw.cpp:19-25`）；并且状态机保证"先加分、后显示"（`stage_clear/update.cpp:18-20`）。

**收益**：玩家能看懂分是怎么来的。**成本**：低。**风险**：低，但**注意仓库红线**：不得把"改动详情/修复列表"塞进玩家可见文案（`AGENTS.md` 改代码约定 §11）——只展示本局真实统计，不写版本说明。

---

## 4. TH20 里"看着高级但不该抄"的部分

| 项 | 证据 | 为什么不该抄 |
|---|---|---|
| SSE 标量顺序 / int32 回绕 / `truncate32` | `native_recovered/native_core.hpp:8-24`、`bullet_system/advance.cpp:9-10` | 存在目的就是与原 x86 机器码逐位一致；JS 用普通浮点更准更简单 |
| 2001 槽定长池 + 哨兵 + 池满静默截断 | `bullet_system/bullet.hpp:53-54`、`shoot.cpp:17,58` | 池满会**悄无声息地少发一波弹**；我们的 `createPool` 超限 `new`（`js/pool.js:12-18`）行为更对 |
| 侵入式双向链表 + 迭代器删除修复 | `core_scheduler/scheduler.hpp`、`scheduler.cpp:47-79` | 我们的 `dead` 标记 + 单趟 `purgeDead`（`js/pool.js:37-49`）更简单 |
| 迭代中释放实体 | `gameplay/ENEMY_ITERATOR_HAZARD.md` | **这就是一个真实 use-after-free**：TH20 自己在原版差分里测出来（20 例中 13 例写到了已释放内存），只能在恢复源码里绕开。我们的"标记 + 帧末 purge"正是避开它的写法，**不要**为了"更贴近原作"改成边遍历边删除 |
| 伤害区域架构（每敌机扫全部区域，O(敌×区)） | `damage_regions/damage.cpp:21-51`、`gameplay/enemy_damage.cpp:28,78,86` | 我们的敌机网格（`js/collision.js:80-134`）在这个规模下更优；只借它的**规则**（同组不叠加、单帧上限），不借对象模型 |
| 五种几何判定（含采样椭圆 ≥8 点、多边形边遍历） | `damage_regions/collision.cpp:4-22`、`geometry.cpp:58-92` | 我们只有圆与线段，加这些是纯开销 |
| 存档加密 / LZSS / 反作弊校验和 | `progress_state/compression.cpp:51-62`、`records.cpp:41-49` | 本地单机的防篡改没有意义；版本号足够 |
| 线程锁 / jthread / CRT 锁槽 | `progress_state/manager.cpp:36-42` | 浏览器单线程模型下无意义（但**文件写入顺序**值得借，见 M4） |
| D3D9 / GDI / ANM / 精灵池 / 层调度 | `sprite_renderer/*`、`text_renderer/*` | Canvas 2D + DOM 文本是更合适的工具 |
| 具体 opcode 号与 `field_90` 位分配 | `gameplay/enemy_opcode_*.cpp` | 脱离 ECL VM 无意义；只借概念（位门控、限时指令、子模式） |

---

## 5. 复现方式（如何自己核对本文结论）

```bash
# 工程说明与验证边界（先看这个，判断某模块可信度）
sed -n '1,80p' ~/Touhou20/source_reconstruction/README.md

# 关键实现点
sed -n '1,60p' ~/Touhou20/source_reconstruction/player_entity/collision.cpp     # 擦弹半径
sed -n '1,40p' ~/Touhou20/source_reconstruction/player_entity/events.cpp        # 擦弹收益
sed -n '1,55p' ~/Touhou20/source_reconstruction/damage_regions/damage.cpp       # 伤害聚合/单帧上限
sed -n '1,30p' ~/Touhou20/source_reconstruction/hud_system/scoring.cpp          # 分数缓动
sed -n '1,30p' ~/Touhou20/source_reconstruction/input/input_state.cpp           # 按键连发
sed -n '1,60p' ~/Touhou20/source_reconstruction/replay_system/replay.hpp        # 录像结构
sed -n '1,30p' ~/Touhou20/source_reconstruction/item_system/frame.cpp           # 道具吸引/PoC
sed -n '1,50p' ~/Touhou20/source_reconstruction/gameplay/ENEMY_ITERATOR_HAZARD.md  # 反面教材
```

各模块的验证覆盖度写在 `source_reconstruction/<module>/README.md` 与同目录 `*_validation.json`。**只 README、不读实现**容易把"已重建但未验证"当成"已验证的原版行为"。

---

## 6. RNG / 录像 / 时钟（第二轮，含对本仓的两处修正）

这一节是第二轮深挖：TH20 的 `runtime_state/`（RNG 与时钟）、`replay_system/`、`core_scheduler/main` 帧调度。

### 6.1 TH20 的核心纪律：RNG 按用途分对象

`runtime_state/state.hpp:5-11`、`state.cpp:5` 是**四个真实 `Random` 对象**，不是全局函数：

- **流 0 = 纯玩法**：子弹/敌机/道具/自机（`bullet_system/shot_pattern.cpp:27-29`、`item_system/spawn.cpp:18`、`gameplay/enemy_reads.cpp:57-63`）
- **流 1 = 纯视觉**：粒子/拖尾（`effect_system/rings.cpp:19-20`）、擦弹火花漂移（`bullet_system/player_collision.cpp:59`）、ANM 动画脚本的 random opcode（`sprite_renderer/anm_adapter.cpp:16-19` → `anm_vm.cpp:66-77`）
- 流 2/3 被播种但在已恢复代码里从未采样（`platform_window/graphics_callbacks.cpp:150`）
- 接口只有三个规范采样器：`next()`（`last = lcg(state); return last % modulus`，`ecl_vm/vm.cpp:41`）、`bounded(r,n) = n ? next%n : 0`（`state.cpp:17`）、`unit = next/(modulus-1)`（`state.cpp:18-22`）、`signed_unit = next/(maximum/2-1)-1`（`vm.cpp:42-46`）

**这正好命中我们的一处结构性脆弱点**：我们用全局补丁 `Math.random`（`js/rng.js:43-51` 的 `withSeededRng`），因此必须靠 `withRealRandom`（`js/rng.js:29-37`）和模块加载时抓取真随机的 hack（`js/replay.js:13` 的 `ID_RANDOM`）来隔离装饰性随机。这类"靠调用点自觉"的隔离，随时可能被新代码破坏。

**现状核验（结论：报告初稿的严重度需要下调）**：我逐处确认了当前**没有**实际泄漏——
`js/gameCombat.js:57-73` 的擦弹粒子、`js/gameDraw.js:166` 的震屏偏移、`js/entities.js:440` 的道具初速，都在 `withSeededRng` 作用域**内或外**一致地消费同一个流（回放会完全复现）；
`js/debug.js` 里 `Math.random` 出现次数为 **0**；`js/playfieldBg.js:121-134` 的 `update(dt)` 不用随机数。
所以**当前录制/回放是自洽的**，不存在已发生的失同步。

**但仍有两个"下次一定踩"的地雷**：

1. `js/game.js:585-602` 把 `debugTick()` 与 `this.playBg?.update(dt)`（以及 `this.background?.setTendency`）放在 `withSeededRng` 的**回调内**。它们今天不消费随机数，但"在种子作用域里跑非玩法代码"就是当初产生 `withRealRandom` 那种补丁的原因。**建议**：把这两句移出 `withSeededRng` 回调（`background.setTendency` 是纯赋值，可直接留在外面；`playBg.update` 内部只用 dt）。
2. `js/gameDraw.js:166` 震屏用 `Math.random()` 取偏移，而 `drawGameFrame` 在 `js/game.js:520` 是**绘制阶段**调用、不在种子作用域。它今天无害（绘制不参与逻辑），但一旦有人把绘制也包进种子作用域（做"确定性截图/录像带画面"就会想到），偏移量会立刻消耗玩法种子流。

**落地方式（值得做，但不是紧急项）**：把 `rng.js` 改成两个具名流对象（`gameplay` / `cosmetic`），删除 `Math.random` 补丁与 `withRealRandom`/`ID_RANDOM` 两个 hack；震屏偏移改为由 `_shakeT` 派生的确定性值（例如用 `sin(_shakeT*97.3)` 取双向偏移），这样连绘制都无随机。
**收益**：隔离从"调用点自觉"变成结构性保证。
**成本**：中（RNG 对象本身 20 行；但 `Math.random` 在 `js/` 下有 **226 处**调用，需按"玩法/视觉"分类迁移，改动面广）。
**建议**：先做上面 2 个地雷的收敛（各 1 行级改动），流对象化留到有实际失同步风险时再做。

### 6.2 暂停 = "当帧中止"，录制节点天然跟着停

`gameplay/frame.cpp:36` 在暂停位（`game_flags&0x30`）时让 `update_game` 返回控制码 3，`core_scheduler/scheduler.cpp:156-158` 的语义是"停止并返回 1"——**当帧后续节点全部不执行**。因为录像录制节点的优先级（21）排在 gameplay（19）之后（`replay_system/initialize.cpp:19-20`、`gameplay/loading_adapter.cpp:49`），暂停时录制**自动**停下，不需要任何回放侧特判。

**核验**：我们已有等价效果，但靠的是显式判断而不是调度语义——`js/game.js:577` `wasPlaying = !this.paused` 决定是否入录像缓冲。两者结果一致，**我们的写法在"只有一个主循环"的规模下更直观，不建议改成 131 个回调的调度链**。

**这一节真正值得借鉴的只有一条**：TH20 把"谁先谁后"做成了**数据**（优先级表：1 图形 → 15 暂停 → 19 gameplay → 21 录像 → 24-28 效果/命中区 → 29 自机 → 33 Bomb → 36 敌机 → 37 激光 → 38 子弹 → 39 道具 → 41 特效 → 42 HUD，见 `pause_system/lifecycle.cpp:22`、`enemy.cpp:38`、`player_entity/initialize.cpp:44`、`bullet_system/controller.cpp:27`、`effect_system/lifecycle.cpp:12`），我们 `js/gameCombat.js:163-345` 是**代码顺序**。代码顺序 + 注释在当前规模是可读的；只在"某次改动把 spawn 移到 purge 之后"这类事故反复出现时，才值得抽一张 `FRAME_STAGES` 静态表。

### 6.3 两个可直接借的定时事实

- **整数帧计数才是真值，墙钟只负责调度**：`native_recovered/native_core.hpp:39-45` 的 `Timer{previous,current,current_f,flags}`，`timer_tick` 在近 1 倍率路径上**独立递增整数**、`current_f` 只作参考（`:79-91`）；`timer_set(v)` 把 `previous` 设为 `v-1`（`:59-64`），于是 `current != previous` 就等于"自 set 以来推进过"（TH20 的特效就用这个惯用法做"本帧是否真的前进"门控，`effect_system/rings.cpp:37`）。主循环则**每次迭代跑且只跑一次 update**，迟到也照样只跑一步（`program_entry/frame_schedulers.cpp:77-95`），`frame_skip` 只跳**绘制**不跳更新（`:66-70,88-92`）——掉帧让游戏在墙钟上变慢，但永不改变每帧的推进量。
- **减速是乘法因子**：`damped(v,d) = v - v*d`（`runtime_state/motion.cpp:11`），线速度与角速度/半径变化率都用它（`:18-19,22-23,26`）。`d=0` 不衰减、`d=1` 立停，**不会像"每帧减固定值"那样过冲或振荡**——一个数字就够策划理解。

**核验我们的现状**：`js/game.js:557-563` 把 0-3 步合并成 `dt = steps/60` 的单块（回放时用录像里的 `steps` 原样重放），`stats.time += dt`。这与 TH20 的"每帧一步"不同，但**在 `steps` 被录像忠实记录的前提下同样确定**，而且省掉了把全部 dt 逻辑改成步进的巨大工作量。**不建议改**。
`BALANCE` 里目前没有"乘法衰减"这一族（阻尼靠 `accel` 的固定量），若将来做"快速减速后悬停"，加 `decel` 乘法系数比每帧减固定值更好调。

### 6.4 明确**不**照搬（第二轮新增）

| 项 | 证据 | 理由 |
|---|---|---|
| 4 条 RNG 流对象化本身 | `state.hpp:5-11` | 想法对，但我们要改 226 处 `Math.random`；收益（抗未来破坏）小于改动面。先收敛 6.1 的两个地雷 |
| 全局可变 `clock_scale` 临时覆盖再恢复 | `bullet_system/advance.cpp:11-16,55-61` | 一个函数里三处恢复点，漏一处就泄漏非 1.0 倍率。JS 里应把 `scale` 当**参数**传（或 `try/finally`） |
| 131 个回调的调度链 | `audit/source_game_callbacks.json`（`distinct_registered_callback_count=131`、`original_owner_count=31`） | 我们只有一条主循环；抽静态优先级表即可，不需要侵入式链表 |
| 控制码 0/2/4/5/7/8 | `core_scheduler/README.md:88-98` | 只有 3（停止）与 6（重跑）有语义价值，其余是 C++ 全局链的 ABI |
| `State.current` 指针 | `scheduler.hpp:35`、`scheduler.cpp:108` | 恢复出的调度器里从未写入，死字段 |
| `Random.field_00`（+0）的归零 | `platform_window/graphics_callbacks.cpp:148-150`、`activation.cpp:17,19` | 被写入但从未被任何采样器读取；疑似失同步计数或子对象状态，**不要盲抄** |
| 8 个固定关卡槽 / 8 个回放游标 / 100 个菜单元数据槽 | `replay_system/replay.hpp:71-75` | 用 map；但"每章一个游标"的**想法**要留（见 H7/H8） |
| 快进依赖调度优先级 46 的位置 | `replay_system/frame.cpp:42-49` | 隐含依赖"回放节点排在所有玩法节点之后、绘制之前"，换实现就会悄悄改变一次跳帧推进多少帧。我们显式写 `steps` 更好 |
| 主种子用 `timeGetTime()`、流 2/3 = `seed>>1`/`seed/3` | `graphics_callbacks.cpp:148-150` | 熵没有任何提升；需要去相关时用 `crypto.getRandomValues` + splitmix |

### 6.5 TH20 **没有**的东西（我们别指望照抄）

- **没有失同步检测**：回放直接覆盖手柄状态、忽略真实输入（`replay_system/frame.cpp:25-29`），没有校验和、没有输入比对、没有状态哈希；唯一信号是录下来的 FPS 流（`:51` 显示出来）和"已完成"标志位（`pause_system/environment.cpp:49-50`）。我们的失同步/中止策略属**新设计**，没有先例可抄。
- **没有任何代码强制的"RNG 调用次数必须一致"规则**：`runtime_state/README.md:7` 明确写着整局 RNG 调用顺序尚未逐帧验证，AGENTS.md:17 只把它列为验收标准。计数、断言、修复都**不存在**。
- **没有按帧号 seek**：只有单向前进、×8 快进与"从某面进入"；`rewind(bool)`（`records.cpp:22`）只是重置某面游标。要做拖动进度条就是新设计。
- 流 0 与流 1 每面**从同一状态开始**（`graphics_callbacks.cpp:149`、`activation.cpp:17,19`），所以它们是"分开消费"而非"互相独立"——这点不影响 6.1 的隔离结论。

---

## 7. 本次调研的边界与自查

- Touhou20 **全程只读**：`git status` 干净，未新增/修改任何文件；所有结论都能用第 5 节的命令复核。
- "已核实"仅指**我读过该实现源码**（多数还核对了行号），**不等于**该实现已被原版 CPU 差分证明。引用前看 `source_reconstruction/<module>/README.md` 与同目录 `*_validation.json`。
- 未逐条比对各模块差分报告的实际覆盖范围。
- 6.1 提到的"当前无实际随机泄漏"是我对照调用点逐个确认的结果，属**本轮结论**；若后续在这些位置新增随机消耗，结论需要重判。

---

## 附：本文未采纳的相邻发现（留档）

- `card_system`：符卡 bonus = `stage × {500000,1e6,1.5e6,2e6,1e6}[难度]`，300 帧后按 `(initial - initial/3)/(duration-300)` 线性衰减（`card_system/start.cpp:43-45`、`update.cpp:19-24`）。我们已有自己的 `calcLetterBonus`，仅作对照。
- `progress_state/records.cpp:32-38`：排行榜行 = `{int64 score, stage, continueCount, name[10], time64, slowPercent}`，**按难度分块、不含自机键**。我们 `ranking.js` 结构接近；`slowPercent`（平均低速占比）是个可以做的额外列。
- `stage_completion/playtime.cpp:4-15`：游玩时长 = `now - storedNow`（存起点而非逐帧累加），跳过回放、且**即使跳过也要把 now 写回**以免重复计数。我们 `stats.time` 是逐帧累加（暂停不计），语义不同但都没错。
