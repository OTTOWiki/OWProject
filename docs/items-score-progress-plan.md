# 道具 / 得分 / 进度 / 排行 / 存档 — 改进方案

> 日期: 2026-10-05
> 参考: `~/Touhou20`（TH20 的独立 C++ 源码重建，**只读**）的 `item_system/`、`small_score/`、`damage_regions/`、`hud_system/`、`progress_state/`、`stage_clear/`、`stage_completion/`。
> 方式: **未改动任何运行时代码**。本文是方案。
> 上一轮汇总报告见 [th20-reference-report.md](th20-reference-report.md)（§2 行动清单）；本文把其中道具/得分/进度相关条目**逐条对照当前代码复核**后细化，并修正了两处表述。
> 可信度标注：**[已核]** 我读过两侧源码；**[impl]** 子代理读过 TH20 实现但该模块未经原 CPU 差分；**[cpu]** TH20 侧有原 CPU 差分记录。

## 0. 一句话结论

**两个真问题、一个观感缺口、其余是"可选增补"。**
真问题：① 道具没有存活上限（`fullScreenClear` 一次可造数千对象）；② 存档写静默失败、无备份层。
观感缺口：③ 分数与 Boss 环形血条**都没有缓动**，跳字与掉血都是瞬变。
其余（排行信息量、游玩时长口径、低速占比）属锦上添花，不做也不影响正确性。

## 1. 现状复核（全部经我读码确认）

| 面 | 现状 | 位置 |
|---|---|---|
| 得分入口 | **单一中心**：`addScore(game,n)` 处理 `scoreMul` → combo → `diffScoreMul` → hiscore/extend | `js/gameCombat.js:472-489` |
| 得分显示 | 直接格式化真值写 DOM，`setText` 有"值未变不写"缓存，**无缓动** | `js/hud.js:139-146` |
| Boss 血条 | **画布环形**，`t = clamp(e.hp/e.maxHp)` 每帧取真值，**无过渡** | `js/draw/enemyDraw.js:137-139`（`drawBossRingHp`） |
| 道具生成 | `spawnItem` **只拦 Nomiss 的 life**，随后直接 `push`，**无存活上限** | `js/gameCombat.js:570-574`（`spawnItem` 起于 `:570`，`:572` 拦 Nomiss life，`:573` 直接 push） |
| 道具回收池 | `MAX_POOL = 256` 只是**回收缓存**上限，超出就 `new` | `js/itemPool.js` |
| 消弹掉道具 | **每颗弹都掉**，其中 15% 为 `scoreL`；同时每颗弹 `addScore(clearBullet)` | `js/patterns.js:251-252, 259-260` |
| 道具运动 | 已有收点线锁定吸引 + 落体（含 `itemFallGravity`/`itemFallMaxVy`/`itemAttractSpeed`） | `js/entities.js`（`class Item`） |
| 道具种类 | 实际只有 `score` / `scoreL`，另有 `life` / `bomb` / `power` 注释但 `collectItem` 只处理前四类，**无 power 系统** | `js/gameCombat.js:458-470` |
| 排行 | 每难度 top10；entry = `{score,name,playerId,playerName,difficultyId,mode,route,cleared,continued,stageReached,date}` | `js/ranking.js`、`js/chapterFlow.js:701-722` |
| 排行 key | **按难度分键、不含自机**（与 TH20 一致） | `js/ranking.js:61-68` |
| 存档 | 单键 `localStorage.setItem`，每处 `catch {}` **静默忽略**配额/隐私模式失败；无备份层、无回滚 | `js/storage.js` 共 11 处（`:27,92,103,130,140,156,186,217,230,295`） |
| 对局统计 | `{graze,kills,bombs,deathbombs,misses,nmnb,items,maxCombo,time}`，存于 `stats`；结算两行/三行格式化 | `js/game.js:262-265`、`js/runStats.js` |
| 章结算加分顺序 | **先加分、后置 banner 文案**（顺序本来就对） | `js/chapterFlow.js:296-349` |

**两处修正上一轮报告的表述**：
1. 报告写"得分缓动 + Boss 血条缓动"时把两者并列，但**Boss 血条是画布绘制**（`draw/enemyDraw.js`），不是 DOM——所以它要的是"在绘制里对一个平滑值做插值"，**不能用 CSS 处理**，两者实现路径不同。
2. 报告把消弹掉道具描述为"我们已有 `clearBulletsToItems`"，但没点明它是**逐弹无节流**：全屏消弹在密集弹幕下会一次生成成百上千个 Item。

## 2. 行动清单（按性价比）

| # | 项 | 收益 | 成本 | 改平衡? | 我的建议 |
|---|---|---|---|---|---|
| **A1** | 道具**存活上限**（超限静默丢弃） | 修真实缺陷 | ~3 行 | 否 | **先做** |
| **A2** | 存档写失败**可感知** + 关键键备份层 | 修真实缺陷 | 中 | 否 | 推荐 |
| **A3** | 分数滚动缓动（加速式 + 夹钳） | 观感 | ~20 行 | 否 | 推荐 |
| **A4** | Boss 环形血条缓动（掉即掉、回血/换阶段平滑补） | 观感 | ~15 行 | 否 | 推荐 |
| **A5** | 编辑槽增益区分"有选中敌机" | 手感 | ~5 行 | **是** | 见 §3.5 |
| **A6** | 消弹掉道具改**配额**（每 N 颗掉 1） | 性能/表现 | ~10 行 | **是** | 与 A1 同批做更好 |
| **A7** | 排行行增补 `duration` / `slowPercent` | 信息量 | 低 | 否 | 可选 |
| **A8** | `stageReached` 改为记录**最远章**而非当前章 | 正确性 | 低 | 否 | 可选（有隐 bug 风险） |
| **A9** | 游玩时长改为"记录起点 + 差值" | 口径统一 | 低 | 否 | 不建议（见 §3.9） |
| **M1** | 道具掉落到"满火力/满资源"的回退 | 表现 | 低 | **是** | 不适用（我们无 power 系统） |
| **M2** | `small_score` 数字弹跳环缓冲 | 观感 | 中 | 否 | 可选 |

---

## 3. 逐条详述

### A1 道具存活上限【已核·真实缺陷】

**问题链**（逐环节确认）：
1. `js/patterns.js:251-252,259-260`：`clearBulletsToItems` 对**每颗**命中的敌弹调用 `spawnItem`，并各自 `addScore`。
2. `js/gameCombat.js:570-574`（`spawnItem` 起于 `:570`，`:572` 拦 Nomiss life，`:573` 直接 push）：`spawnItem` 只拦 Nomiss 的 life，然后直接 `game.items.push(...)`。
3. `js/itemPool.js`：`MAX_POOL = 256` 仅限制**回收缓存**，对象数超出就 `new`。
4. ⇒ Bomb / 编辑槽消弹在密集弹幕下**一次可造数百至上千个 Item**；它们每个每帧都要 `update` + 一次 `Math.hypot` 距离判定（`js/gameCombat.js:291-297`）。
5. 且这个增长**没有天花板**——连发 Bomb 会持续累积。

**TH20 做法**（`item_system/`，**[impl]**）：定长池 **1536**（普通 512 / 特殊 1024），取不到就**静默返回 null**（`item_system/item.hpp:27`、`state.cpp:16`、`spawn.cpp:12,23,28`）。宁少掉一个，也不让场上无限增长。

**落地方式**：

```js
// js/config.js —— BALANCE
itemLiveCap: 480,        // 按真机实测调；先取一个明显低于"爆屏"的值

// js/gameCombat.js:570
export function spawnItem(game, x, y, kind = 'score') {
  if (game.mode === 'nomiss' && kind === 'life') return;
  if (game.items.length >= (BALANCE.itemLiveCap ?? 480)) return;   // 静默丢弃
  game.items.push(acquireItem(x, y, kind));
}
```

**注意**：
- **不要**顺带改 `clearBulletsToItems` 的得分——那是既有平衡，A6 单独处理掉落率。
- 上限要能解释："超出上限时后生成的道具不出现"。这属于**可见行为变更**，需手测观感是否可接受（密集消弹时地上道具变少）。

**验证**：`test/cases-pools.js` 加"达到 itemLiveCap 后 push 不再增长"；手测 Bomb 全屏消弹 + 编辑槽消弹。

---

### A2 存档写失败不可感知、无备份层【已核】

**现状**：`js/storage.js` 有 11 处 `localStorage.setItem`，每处都是 `catch { /* ignore quota / private mode */ }`。后果：
- 写失败**完全静默**：玩家在隐私模式或配额满时，进度/排行榜/设置会**看起来保存了、实际没有**；
- 单键写入中途失败（配额）可能留下**半个 JSON**，只能靠 `parseStored` 返回 `undefined` 兜底（`js/storage.js:8` 注释说明了这已经是 F08 的设计）。

**TH20 做法**（`progress_state/`，**[impl]**，我读过）：**备份快照作为默认层，主文件逐记录覆盖**在其上（`file_codec.cpp:7-11,28-41`、`manager.cpp:44-48`）。不用临时文件 + rename，也能从"半写坏"恢复上次内容。
另外它的排行榜行结构（`records.cpp:32-38`）：`{int64 score, stage, continueCount, name[10], time64, slowPercent}`；**按难度分块、不含自机键**——我们的结构已经很接近。

**落地方式（两档，建议先做第一档）**：

1. **可感知**：给 `storage.js` 一个**写入结果上报**（返回 `true/false`），在**关键路径**（`unlocked` / `nomissProgress` / `ranking` / `letterRate` / `practiceBest`）失败时向 UI 冒泡一次提示（走现有 `#load-status` 式状态文案或结算页脚注，**不要**做弹窗）。理由：静默丢失进度是不可接受的；配额满在移动端 Safari 很常见。
2. **备份层**（可选，按需）：关键键写 `<key>_bak` 后再写 `<key>`；读时先取 `_bak` 作底、再用主键覆盖。**只给最不能丢的键做**（`unlocked` / `nomissProgress`），避免每个键都维护两套。

**不做**：存档加密、校验和、LZSS——本地单机无此必要（TH20 那部分是被动继承的产物）。

**验证**：`test/cases-storage-spawn.js` 扩"setItem 抛错时上报失败且不破坏旧值"；手测隐私模式下开局 → 进度提示 → 关闭提示后仍可玩。

---

### A3 分数滚动缓动【已核】

**现状**：`js/hud.js:139-146` 把 `game.score` 直接格式化写 DOM。`setText` 有"值未变不写"的缓存，所以**得分是瞬变的整数跳字**，没有滚动感。

**TH20 做法**（`hud_system/scoring.cpp:13-18`，**[impl]**，我读过）：保留**速度**状态，越滚越快，且用剩余量夹钳防过冲：

```
step  = clamp((target - score) / 32, 1, 0x8d55e);
speed = max(prevSpeed, step);        // 速度持久化 → 加速感
speed = min(speed, target - score);  // 夹钳 → 绝不过冲
score += speed;
if (score >= target) speed = 0;
```

另外：**暂停/结果菜单打开时强制对齐真值**（`pause_system/menu.cpp:48`）——我们要照做，否则结算页会显示中间值。

**落地方式**：`js/hud.js` 增模块级 `_shownScore` / `_scoreSpeed`，在 `updateGameHud` 里先缓动再 `setText`：

```js
const target = game.score;
const step = Math.max(1, Math.min((target - _shownScore) / 32, 0x8d55e));
_scoreSpeed = Math.max(_scoreSpeed, step);
_scoreSpeed = Math.min(_scoreSpeed, target - _shownScore);
_shownScore += _scoreSpeed;
if (_shownScore >= target) _scoreSpeed = 0;
```

**关键约束**：
- **只在 `state === 'playing'` 且未暂停时缓动**；`dialogue` / `stageTransit` / 结算 / 暂停一律**直接对齐真值**（与 TH20 同）。
- 缓动期间值每帧都变 ⇒ `setText` 缓存失效，等于每帧写一次 DOM。**这是可接受的**（3 个节点），但要在真机上看一眼长局（分数 7 位时）是否有回流抖动。
- 缓动值**只用于显示**，`game.score` / hiscore / 排行 / 排行榜一律用真值——不要污染数据。

**验证**：`test/cases-runstats.js` 附近可加纯函数测试（把缓动抽成 `stepScoreRoll(shown, speed, target)` 便于测）；手测：得分跳字、暂停立刻对齐、结算数字正确。

---

### A4 Boss 环形血条缓动【已核】

**现状**：`js/draw/enemyDraw.js:137-139` 的 `drawBossRingHp` 每帧用 `t = clamp(e.hp/e.maxHp)` 画环。**换阶段（maxHp 重置）与受击都是瞬变**，没有 TH20 那种"掉血立刻掉、补满时缓慢爬升"的过渡。

**TH20 做法**（`hud_system/update.cpp:64-75`，**[impl]**，我读过）：

```
显示值向上缓动 +0.025/帧，且永不高于真值：
  if (display < real) display = min(display + 0.025, real)
  if (real < display) display = real        // 掉血立即生效
```
⇒ 掉血即时、回血/换阶段平滑。另外它对 `hp >= 100000` 与特定 flag 的敌人**不显示满血条**（`:66-67`），我们可对照自己的 Boss 判定。

**落地方式**：给 Boss 实体加 `_hpShown`（初始化 = `hp/maxHp`），在**逻辑帧**更新（不是绘制帧，保证与暂停/减速一致）：

```js
// gameCombat 的敌人更新后，或 Enemy.update 内
const real = e.maxHp > 0 ? Math.max(0, Math.min(1, e.hp / e.maxHp)) : 0;
if (e._hpShown == null) e._hpShown = real;
if (real < e._hpShown) e._hpShown = real;
else if (e._hpShown < real) e._hpShown = Math.min(e._hpShown + 0.025 * (dt * 60), real);
```

`drawBossRingHp` 改用 `e._hpShown`。
**注意**：必须进 `Enemy.reset`（池化/复用）重置，否则换 Boss 会继承上一条血的显示值。

**验证**：`test/cases-boss-dps.js` 加"换阶段时显示值不超过真值、且单调收敛"；手测：打掉一管血 → 立即掉；进下一阶段 → 平滑补满。

---

### A5 编辑槽增益区分"有选中敌机"【已核 TH20 侧】

上一轮报告已详细写过，此处只留结论与红线：TH20 是 `gain = selected_enemy_present ? 50 : 10`（`player_entity/events.cpp:31-33`），我们固定 `BALANCE.editPerGraze = 1.15`（`js/config.js:102`）。
**属平衡改动**：会改变 Letter 战与道中的擦弹收益差，**必须先手测再定倍率**。详见 [th20-handling-plan.md](th20-handling-plan.md) §3.1/§3.2。

---

### A6 消弹掉道具改配额【已核】

**现状**：`js/patterns.js:251-252` 每颗弹必掉 1 件（15% 为 `scoreL`），且每颗弹各加一次 `clearBullet` 分。

**TH20 做法**（**[impl]**）：
- **只有消弹才掉道具**，超时/出屏自然消失不掉（`bullet_system/movement.cpp:68-72`）；
- 掉落有**模式区分**：mode 1 掉 1 件；mode 4 每 5 次消弹才掉 1 个点道具（`bullet_system/drop_items.cpp:4-14`）；
- 伤害侧是**累加过阈值才产出道具**：累加进 `overlay+0x38`，每跨过 `0x3c` 配额出 1 件（`damage_regions/damage_rewards.cpp:8-14`）。

**落地方式**：给 `clearBulletsToItems` 一个每 N 颗掉 1 件的配额（N 建议 3~5，**按真机观感定**），`scoreL` 的 15% 概率保持不变。

**注意**：这是**可见的经济改动**（地上道具变少、总得分下降）。**必须与 A1 同批手测**：A1 是"不掉出来"，A6 是"本来就不掉"，两者叠加会明显减少道具供给，容易调过头。

---

### A7 排行行增补【已核】

**现状**：entry 已有 `score/name/playerId/playerName/difficultyId/mode/route/cleared/continued/stageReached/date`（`js/chapterFlow.js:703-715`）——信息量已经不低。

**TH20 对照**（`records.cpp:32-38`）：`{int64 score, stage, continueCount, name[10], time64, slowPercent}`。
**我们缺的**：`duration`（本局用时）与 `slowPercent`（低速占比）。前者我们已经有 `stats.time`，直接带上即可；后者需要新增统计（见 A9 讨论）。

**落地方式**：`entry` 加 `duration: Math.round(game.stats.time)`（可选 `slowPercent`）。排行屏（`js/rankingScreen.js`）加一列。
**注意**：**旧 entry 没有该字段** ⇒ 渲染必须容忍 `undefined`（显示为 `—`），不要写 `.toFixed()`。

---

### A8 `stageReached` 语义【已核·潜在隐 bug】

**现状**：`js/chapterFlow.js:713` `stageReached: game.el?.stageLabel?.textContent || ''`——**它读的是当前 DOM 文本**。这有两个问题：
1. 依赖渲染层文本作为数据源（脆）；
2. 若在"最远到达"意义上使用，它记录的是**结算那一刻的章名**，不一定等于"最远章"。

**落地方式**：改为显式字段，例如记录 `furthestChapterId`（在 `startChapter`/`finishChapter` 处维护），排行显示再映射成章名。
**风险**：低，但会改变**已有榜单的显示**（旧 entry 无该字段 ⇒ 回落显示现有文本）。**需你确认是否值得动**：它更像"顺手修"，收益是数据不依赖 DOM。

---

### A9 游玩时长口径：**不建议改**

TH20 是 `elapsed = now - storedNow`（存起点、跳过回放、**即使跳过也把 now 写回**以免重复计数，`stage_completion/playtime.cpp:4-15`），且只在存档元数据上用墙钟。
我们是逐帧累加 `stats.time += dt`，**且只在正常游玩帧累计（暂停/对话/过渡不计）**（`js/game.js:579`）。
**两者语义不同但都对**：我们的口径（"实际游玩时间"）对玩家更有意义；TH20 的口径是"会话时长"。**不改**。
**可借鉴的只有一点**：如果 A7 要加 `slowPercent`，统计应挂在我们的逐帧累加口径上，而不是引入墙钟。

---

## 4. 明确不抄

| 项 | 证据 | 理由 |
|---|---|---|
| 存档加密 / LZSS / 字典压缩 | `progress_state/compression.cpp:5-62` | 本地单机无必要；要压就用 `CompressionStream('deflate-raw')` |
| 存档元数据反作弊校验和（带 RNG 盐） | `progress_state/records.cpp:41-49`、`metadata_verify.cpp:5` | 反作弊表演；一个版本号字段足够 |
| 存档工作线程 / 递归锁槽 | `progress_state/manager.cpp:36-42` | 浏览器单线程；但**写入顺序**（备份在前）值得借，见 A2 |
| 定长 1536 池 | `item_system/item.hpp:27` | 我们要的是"**上限**"这个约束，不是固定数组；`itemPool.js` 的 `createPool` 够用 |
| 点数道具累加器（type 15，10 次消弹才出 1 个真道具） | `item_system/spawn.cpp:27` | 这是他们防刷的一种；A6 的配额已达同等目的，不必再叠一层 |
| `full-power` 回退（小/大火力满时转分数、20000 加两次） | `item_system/rewards.cpp:96-116` | **我们无 power 系统**，`collectItem` 只有 score/scoreL/life/bomb（`js/gameCombat.js:458-470`） |
| 得分先 ÷10 存、显示 ×10 并带续关数字尾 | `damage_regions/score.cpp:4`、`text_renderer/format.cpp:66-67` | 有趣的 UI 花招（末位=续关数），但会**改变我们已发布的所有分数数值**，绝对不动 |
| `small_score` 的 10 槽环缓冲与三段字形 | `small_score/state.cpp:28-32`、`frame.cpp:11-31` | 依赖其字形精灵与 ANM；我们要做也用 DOM/CSS，属可选（M2） |
| 排行 `slowPercent` 的浮点存储 | `records.cpp:32-38` | 我们是 JSON，直接数字即可 |

## 5. 存疑与未验证

1. **TH20 擦弹/消弹的经济数值不可直接比较**：我们没有 power/点数道具体系，两边"道具价值"不可换算，因此 A6 的配额只能用**真机观感**定，不能抄数值。
2. **`itemLiveCap` 的合理值未知**：需要实测"密集消弹时的可见道具数上限"再定，我给 480 只是起点。
3. **`stats.items` 的语义**：现在只在 `collectItem` 里 `game.stats.items++`（`js/gameCombat.js:459`），即"**已拾取**数"，不是"已掉落"数——A6/A1 改掉落率**不影响**该统计的含义，但若将来要区分"掉落/拾取"，需拆两个字段。
4. **TH20 `hud_system` 的分数缓动参数**（`/32`、上限 `0x8d55e`）是按他们的帧率与分数规模定的；我们分数规模不同，**系数需要按手感重调**，不能照抄常数。
5. 上一轮报告里"TH20 续关清零分数"与我方不一致这一点（子代理存疑）**未解决**，但**不影响本方案**——我们不动续关语义。

## 6. 落地顺序建议

```
A1（道具上限，3 行）
  → A6（消弹配额，与 A1 同批手测，避免叠加调过头）
  → A4（Boss 血条缓动，纯视觉、独立）
  → A3（分数缓动，纯视觉，注意暂停对齐）
  → A2（存档可感知；备份层按你意愿）
  → A7 / A8（排行信息量，可选，需确认旧榜单回落）
  → A5（编辑槽增益，属平衡改动，单独一轮 + 手测）
```

**每步都要 `npm test` 绿 + 手测**；A1/A6 是行为变更，A5 是平衡变更，三者都要在 PR 说明里写明"玩家可见变化"。

## 7. 验证方式

- **A1/A6**：`test/cases-pools.js` 扩 assert；手测：Bomb 全屏消弹、编辑槽消弹、密集弹幕下 FPS 与地上道具数。
- **A3**：抽出纯函数 `stepScoreRoll(shown, speed, target)` 单测；手测：跳字、暂停立即对齐、结算数值正确。
- **A4**：`test/cases-boss-dps.js` 加"显示值 ≤ 真值且单调收敛"；手测：受击立即掉、换阶段平滑。
- **A2**：`test/cases-storage-spawn.js` 加"写入抛错时上报失败且旧值不变"；手测：隐私模式/配额满下的提示与可玩性。
- **A7/A8**：`test/cases-ranking.js` 加"缺字段 entry 渲染不崩"。
- **通用**：`npm test` + `npm run test:e2e`；视觉项按 `AGENTS.md`「UI 截图对比」要求分别报告**视觉证据**与**行为证据**。
