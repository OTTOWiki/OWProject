# 可维护性改造队列（按性价比）

> 来源：`main` 全库严格代码审查（2026-07-18 Phase A–D；2026-07-19 Phase E）  
> 原则见下文「工作方式」。一次只做一个任务；**未接到用户开工指令前只改本队列文档、不动产品代码**。

---

## 工作方式（红线）

1. **一次只做一个任务**（一个 `Txx`），做完再开下一个。
2. **不破坏运行效果**为红线：玩家可见手感、得分、章节流程、UI 流程应与改前一致；允许修明确 bug（任务里会标明「行为修正」）。
3. **每完成一次代码修改后立刻跑自动化测试**：

   ```bash
   npm test
   ```

4. **测试失败** → 本任务内继续修，直到通过。  
5. **测试通过** → **停下来等用户手动测试**，确认后再开下一任务。  
6. 不引入构建工具 / 框架；保持 ES modules + 静态托管。  
7. 每任务结束在本文件勾选状态，并记一行「手测要点」。

### 状态

| 标记 | 含义 |
|------|------|
| `待做` | 未开始 |
| `进行中` | 当前唯一进行项 |
| `等手测` | 自动测试已过，等用户确认 |
| `完成` | 用户手测 OK |
| `取消` | 决定不做 |

---

## 阶段 A — 低风险、高收益（优先）

> 删死代码、补测试、小 UI/契约清理。改动面小，几乎不碰战斗主循环。

### T01 删除未使用的 EX mid 构建器
| | |
|--|--|
| **状态** | 完成 |
| **审查对应** | Issue 8（死双系统） |
| **范围** | `js/stages/ex_shared.js` 中未被引用的 `buildMidWave` / `buildMidSides` / `buildMidRain` / `buildMidRing`（改前用 grep 再确认无 import） |
| **不做** | 不改 `MID_PATTERNS` / `buildExMid` / 现网 EX 章节表 |
| **验收（自动）** | 现有 `test/cases.js` 全绿 |
| **验收（手测）** | Extra 开局：道中 → 道中 Boss → van 符卡能进、能打、能结算 |
| **风险** | 极低（确认无引用后删除） |

### T02 删除死结果页路径（或确认保留理由）
| | |
|--|--|
| **状态** | 完成 |
| **审查对应** | Issue 8 |
| **范围** | `UI.showResult` / `lastResult` / `result-*` 相关逻辑；`index.html` 中若仅服务于该死路径的 `screen-result` 一并清理。**先确认游戏内结算只走 Game overlay** |
| **不做** | 不改暂停 / 练习结束 / GameOver 的 overlay 行为 |
| **验收（自动）** | 全绿 |
| **验收（手测）** | 练习模式结束 → 重试/回菜单；Story GameOver；主菜单导航正常 |
| **风险** | 低；若 HTML 仍有入口需先卸绑定再删 |

### T03 孤儿 Extra 对话：接线或删除
| | |
|--|--|
| **状态** | 完成 |
| **审查对应** | Issue 8 / 12 |
| **范围** | `js/dialogue.js` 中 `ex_p2`…`ex_p5`（等）——grep 确认无章节引用后**删除**（默认方案，避免半成品内容；若产品要接线则改为挂到 EX letter 边界，需单独说明） |
| **不做** | 不改已引用的 `ex_open` / `ex_van` / `ex_last` |
| **验收（自动）** | 全绿；可选：本任务顺带加「章节 dialogue 键必须存在」测试（见 T05，可合并或紧随） |
| **验收（手测）** | Extra 开场 / van / 终章对话仍出现，无报错 |
| **风险** | 极低 |

### T04 菜单 Back 双 SFX
| | |
|--|--|
| **状态** | 完成 |
| **审查对应** | Issue 15 |
| **范围** | `js/ui.js` `_action`：确认类动作播 `ok`，返回类只播 `cancel`（或按 action 分类播一次） |
| **不做** | 不改编键位、不改屏幕跳转逻辑 |
| **验收（自动）** | 全绿 |
| **验收（手测）** | 各菜单 Esc/返回：只听到一次取消音；确认进入只听到一次确认音 |
| **风险** | 极低；纯听感 |

### T05 补高 ROI 纯逻辑完整性测试
| | |
|--|--|
| **状态** | 完成 |
| **审查对应** | Issue 17 |
| **范围** | 仅 `test/cases.js`（及必要时 `assert` 小扩展），**不改产品代码**。建议断言： |
| | 1. 章节表：id 唯一、`stageSelectEntry.startChapter` 等于该 `stageKey` 首章 id |
| | 2. 凡章节上的 `dialogue` / `winDialogue` 键在 `getDialogues('yinquan')` 中存在 |
| | 3. 有 `letter` 的章必有 `letterTime > 0`（若现网有意例外则写进白名单并注释） |
| | 4.（可选）`storage` FPS / 透明度 clamp  round-trip，若 export 可测 |
| **不做** | 不启 Game 主循环；不加浏览器 E2E |
| **验收（自动）** | 新+旧用例全绿 |
| **验收（手测）** | 无运行时改动 → 可只确认测试页 `/test/` 全绿 |
| **风险** | 无运行时风险；若发现现网数据不合格，**停下来报告**，不在本任务偷偷改关卡 |

---

## 阶段 B — 行为对齐 / 小修复（中性价比）

> 仍避免大拆文件；修正审查中「像 bug / 契约谎言」的点。手测更关键。

### T06 修 wave 早 return 卡住次级系统（行为修正）
| | |
|--|--|
| **状态** | 完成 |
| **改动清单** | `a4_mid_5`；`a5_mid_4`/`mid_7`；`b4_mid_5`；`b5_mid_1`/`mid_3`/`mid_4`/`mid_6`；`b6_mid_1`/`mid_3`/`mid_9`（辅压先 tick） |
| **审查对应** | Issue 9 |
| **范围** | 已确认的写法问题章（如 `a4_menbailiang` mid 雨弹在 spawn 门后）；模式：连续系统先 tick，spawn 再门控。可抽小 helper 到 `_shared.js` **仅在本批改动的章节使用**，不强行全库重写 |
| **不做** | 不重写所有 mid 波次；不改弹幕数值表（间隔/发数保持） |
| **验收（自动）** | 全绿 |
| **验收（手测）** | 出问题的面：雨/辅压与刷怪同时持续；前后弹幕密度观感一致（辅压应更「一直有」） |
| **风险** | 中——属于**有意修正**；若手测觉得过难/过易再回调间隔 |
| **备注** | 改前在任务备注列出具体函数名 |

### T07 `evenAim` 契约澄清 + 测试锁死
| | |
|--|--|
| **状态** | 完成 |
| **审查对应** | Issue 13 |
| **范围** | `js/patterns.js`：要么实现真正的偶数夹缝偏移，要么删除死分支并改注释与命名，使代码与文档一致。**默认优先「锁死当前几何 + 删死分支/改注释」**（零手感变化）；若要改偶数狙几何，必须单独开任务并手测大量用 `parity:'even'` 的章 |
| **验收（自动）** | 为 `oddAim`/`evenAim` 增加角度几何用例；全绿 |
| **验收（手测）** | 默认方案：抽 1～2 个 even 狙章扫一眼即可；若改了几何：A4/A5 Letter 重点打 |
| **风险** | 默认方案低；改几何则高 |

### T08 自机射击 / 消弹得分走 `BALANCE`（行为不变）
| | |
|--|--|
| **状态** | 完成 |
| **审查对应** | Issue 14 |
| **范围** | `patterns.js`（及确认的硬编码点）改为读 `BALANCE` 已有字段；若缺字段则先在 `config.js` 补**与当前字面量相同的值**再引用 |
| **不做** | 不调数值；不改难度倍率公式 |
| **验收（自动）** | 全绿；可选断言 BALANCE 字段存在 |
| **验收（手测）** | 射击手感、Bomb、Item 消弹得分与改前一致（体感 + 同操作得分大致相同） |
| **风险** | 低（字面量搬家） |

---

## 阶段 C — 中等风险、收益大（架构小步）

> 每一项都要更仔细的手测清单；仍**一次一个**。

### T09 显式 `spawnEnemy` / `spawnBullet`，去掉 push 钩子
| | |
|--|--|
| **状态** | 完成 |
| **审查对应** | Issue 3 |
| **范围** | `game.js`：提供 spawn API（内部做难度缩放 + 刷怪记账）；`_installEntityHooks` 删除。`patterns.js` + `stages/*` 中 `.enemies.push` / `.bullets.push` 改为 spawn（可用兼容：短期仍 hook，但以迁移完删除 hook 为完成标准） |
| **策略建议** | ① 先加 API 并在 hooks 内转调（双轨）→ 手测；② 再批量替换 call site；③ 删 hook |
| **验收（自动）** | 全绿；可加「spawn 后敌机 hp 已乘 difficulty」纯测（mock 轻量） |
| **验收（手测）** | Easy vs Lunatic 敌血/弹速差异仍在；任意面刷怪、Boss、Bomb、结算变点正常 |
| **风险** | 中高——漏替换会导致未缩放或记账错误 |

### T10 章间推进改主循环计时（去掉玩法 setTimeout）
| | |
|--|--|
| **状态** | 完成 |
| **审查对应** | Issue 5 |
| **范围** | `_scheduleAdvance` → 游戏内计时；暂停时不计时；`stop` 时清理 |
| **不做** | 不改 0.8s 语义（仍约 800ms **游戏时间**）；不改结算条动画 |
| **验收（自动）** | 全绿 |
| **验收（手测）** | 通关一章 → 约 0.8s 进下一章；**暂停时应冻结**该等待；练习结束/路线选择/对话衔接正常 |
| **风险** | 中——暂停行为会比现在更正确（墙钟 → 游戏钟），属可接受对齐 |

### T11 去掉魔法章节号 22 / 24 / 129
| | |
|--|--|
| **状态** | 完成 |
| **审查对应** | Issue 6 |
| **范围** | 章节元数据（如 `onClear`）或由 `stageKey`/`kind` 推导；UI Extra 入口从 `stageSelectEntries` 读，禁止字面量 `129` |
| **不做** | 不改 A/B 阈值与巡查触发条件本身 |
| **验收（自动）** | 完整性测试：stage3 末章 / patrol 末章 / EX 首章可定位且唯一 |
| **验收（手测）** | 3 面结束 → 倾向够进 A/B、不够进巡查；巡查胜 → 选路；Extra 菜单进 129 等价首章 |
| **风险** | 中——流程回归必测 |

---

## 阶段 D — 大块重构（A–C 已完成，现开启）

> 前提：T01–T11 + 测试 A+B+C + CI 已落地。  
> 红线不变：一次一个 `Txx`、不改手感、`npm test` 绿再等手测。  
> `game.js` ~1800 行、`entities.js` ~1000 行——优先**按现有方法边界抽出模块**，不做行为重写。

### 推荐顺序（锁定）

```
T12（拆 game，可分步提交）
  → T13（entities 绘制拆分，与 T12 弱耦合，可紧随）
  → T16（collision 事件化，依赖战斗边界更清晰）
  → T14（主线表驱动 stages）
  → T15（BG 统一）
  → T17（CSS 焦点）
  → T18（贴图策略，可随时插队或最后）
```

说明：T12 先做收益最大；T14 改面广但独立；T16 宜在 combat 边界清楚后做。

---

### T12 拆 `game.js`（多步，仍算一个大任务，按子步交付）

| | |
|--|--|
| **状态** | 完成（T12a–d） |
| **目标** | `Game` 保留构造 / `start` / `stop` / `_loop` 与对外 API；逻辑按域迁到模块，**行为零变化** |
| **现状** | ~1800 行、单类 ~60+ 方法 |
| **目标结构（建议）** | |
| | `js/game/chapterFlow.js` — `_startChapter` / `_finishChapter` / advance / route / ending / skip |
| | `js/game/combat.js` — `_update` 战斗段、bomb/miss/hit/score/item |
| | `js/game/overlay.js` — pause/result overlay 与键盘 |
| | `js/game/draw.js` — `_draw*` 版面装饰与结算条绘制 |
| | `js/game.js` — 门面 + 主循环调度（目标 &lt; ~500 行） |
| **子步（推荐提交粒度）** | |
| | **T12a** 抽出 `draw`（`_drawTendencyGauge` / transit / banner / FPS 等） |
| | **T12b** 抽出 `overlay` |
| | **T12c** 抽出 `chapterFlow` |
| | **T12d** 抽出 `combat` / 收束 `game.js` |
| **做法** | 方法迁出为 `export function xxx(game, ...)` 或 `attachXxx(Game.prototype)`；优先 **函数 + 传入 game**，避免过深类继承 |
| **不做** | 不改状态机语义、不改数值、不顺便改 collision 事件模型（留给 T16） |
| **验收（自动）** | `npm test` 全绿 |
| **验收（手测）** | 开局→一章→暂停→结果；Story 换章与 route 触发；Debug 加速下无异常 |
| **风险** | 中高——绑定 `this` / 闭包易漏；每子步可单独手测 |

---

### T13 拆 `entities` 绘制

| | |
|--|--|
| **状态** | 完成 |
| **目标** | `entities.js` 只保留实体数据与 `update`；绘制进 `js/draw/`（或 `drawBullets.js` / `drawActors.js`） |
| **范围** | `drawBullet` / `drawPlayer` / `drawEnemy` / `drawItem` / boss 形状表 |
| **不做** | 不改判定半径与弹种逻辑 |
| **验收（自动）** | `npm test`；import 路径更新后冒烟仍绿 |
| **验收（手测）** | 自机/敌/弹/道具视觉与改前一致 |
| **风险** | 中——循环 import；用 `game.js` re-export 过渡亦可 |

---

### T14 主线关卡表驱动

| | |
|--|--|
| **状态** | 完成 |
| **目标** | 对齐 Extra：元数据工厂 + mid wave helper，压缩 a4–b6 / s1–s3 重复脚手架 |
| **范围** | `_shared.js` 增加 `mid()`/`letter()`/`spawnWave` 类 helper；**先 1 个面试点**再推广 |
| **不做** | 首轮不重写全部 Letter 弹幕内容；不改手感数值 |
| **验收（自动）** | 全章 build 冒烟；stageSelect 对齐 |
| **验收（手测）** | 试点面完整可打；再批量化后抽查 A/B 各一面 |
| **风险** | 中——易在迁移 wave 时再引入 early-return 辅压问题 |

---

### T15 统一 BG mode + 调色板

| | |
|--|--|
| **状态** | 完成 |
| **目标** | `bgModes` / playfield 贴图 / Three 侧共用一份 mode 登记；Three builder 表 |
| **范围** | `bgModes.js`（`PLAYFIELD_BG_TEX` / `resolveBgMode`）；`playfieldBg` 去重本地 `BG_TEX`；`backgrounds` `STAGE_BG_BUILDERS` |
| **不做** | 不重做 3D 场景美术；版面 SKY/THEME/ACCENT 仍留 playfield（纯绘制调色板） |
| **验收（自动）** | 章节 bg ∈ 统一 allowlist；`getPlayfieldBgModes` ≡ `getAllBgModes`；EX→`ex_*` |
| **验收（手测）** | 换面时左栏与版面主题仍匹配（抽查 1/3/A5/B6/EX） |
| **风险** | 中——EX 回落与 `ex_mid` 别名需对齐 |

---

### T16 collision 只吐事件

| | |
|--|--|
| **状态** | 完成 |
| **目标** | `runCollisions` 只做几何与命中检测；score/drop/SFX/`onDeath` 由 Game/combat 消费 |
| **范围** | `collision.js` 返回 `kill`/`graze`/`playerHit`；`gameCombat.applyCollisionEvents` 消费 |
| **不做** | 不改判定公式与网格策略（除非测试证明等价） |
| **验收（自动）** | 几何测 + 事件形状测（collision 不调 score/SFX） |
| **验收（手测）** | 击破掉落、擦弹 Edit、自机中弹/决死与改前一致 |
| **风险** | 中高——击杀时序（onDeath 必须在 purge 前） |

---

### T17 CSS 焦点样式收敛

| | |
|--|--|
| **状态** | 完成 |
| **目标** | 统一焦点 CSS 变量 + 列表/表单 `.selected` 描边；去掉 `#d4af37` 等金色漂移 |
| **范围** | `style.css`（`:root` 焦点 token；practice/keys/settings/history/manual/overlay） |
| **不做** | 不大改布局栅格；不改菜单 JS 导航逻辑 |
| **验收（自动）** | `npm test` 不回归（纯 CSS） |
| **验收（手测）** | 各菜单键盘焦点描边一致（主菜单/难度/设置/History/暂停） |
| **风险** | 低 |

---

### T18 立绘 / Boss 贴图策略

| | |
|--|--|
| **状态** | 完成 |
| **目标** | 缺立绘/占位 boss 精灵显式化（常量 + 注释/白名单），避免「错角色」误读 |
| **范围** | `assets.js`（PATHS + HIDDEN_OK）；`sprites.js`（DEDICATED / PLACEHOLDER / 未知→几何）；测试 + AGENTS |
| **不做** | 不强制本任务产出全部新美术 |
| **验收（自动）** | 对话 speaker ∈ PATHS∪HIDDEN_OK；未知 boss 不回落 alice |
| **验收（手测）** | 有图角色对话出立绘；门百梁等无图隐藏；A4/EX Boss 不误成爱丽丝脸（EX 几何） |
| **风险** | 低 |

---

## 执行顺序（全队列）

```
[已完成] T01…T11 · T12a–d · T13 · T14 · T15 · T16 · T17 · T18
  → Phase D 收尾完成

[进行中] Phase E（2026-07-20 拍板顺序，见下「默认执行方案」）
  E02手测 → E03a → E03b → E03c → E03d1 → E03d2
    → E07 → E01 → E05 → E04 → E06*（可选）
```

当前：**Phase D 完成**；**E02–E03d1 完成（已 push）**；**E03d2 等手测（本地 commit，未 push）**；OK 后下一项 = **E07**。  
原则不变：一次一个任务、`npm test` 绿 → 等手测 → 再开下一项。  
**提交流程（用户约定）**：日常改动只本地 `git commit`；用户手测 OK 后再 `git push`。

---

## 阶段 E — 关卡规范化主线 + 框架收束（2026-07-19 审查 / 2026-07-20 重排）

> 来源：`main` 全库严格代码审查（第二轮）+ 关卡解耦讨论。  
> 原则同上文「工作方式」：**一次一个 Exx**、不改手感、`npm test` 绿 → 等手测 → 再开下一项。  
> **产品方向**：关卡 mid 壳统一 → EX 可浏览 → 薄 StageContext → 再收 Game / 章结束 / BG。

### 默认执行方案（已拍板 · 不用再选）

**策略一句话**：先把关卡 mid 写成同一种现代写法，再补契约层，最后收拾框架大文件。  
**严格度**：中等（统一 wave 壳 + 拆大文件 + 薄 StageContext；**不做**弹幕 DSL / 构建工具）。

| 步 | 任务 | 你要做的 | 为何这个顺序 |
|----|------|----------|--------------|
| 0 | **E02 手测收口** | ~~完成~~ | 代码已合，清掉「等手测」再动刀 |
| 1 | **E03a** | ~~完成~~ | 最小试点，验证 helper 够用 |
| 2 | **E03b** | ~~完成~~（+A 线激光无时限寿命已 push） | 主线 A 一气迁完 |
| 3 | **E03c** | ~~完成~~（已 push） | 主线 B 同上 |
| 4 | **E03d1** | ~~完成~~（已 push） | 先降 `ex_mid` 体量，diff 安全 |
| 5 | **E03d2** | **等手测**：Extra 道中→Boss→van | 壳与主线对齐 |
| 6 | **E07** | 薄 StageContext + **仅 s1 试点** | mid 已统一后再收窄 `g` 契约 |
| 7 | **E01** | 收 Game 转发门面 | 关卡线告一段落再清门面债 |
| 8 | **E05** | 章结束纯函数 + 单测 | combat 边界稳后再抽 |
| 9 | **E04** | 拆 `backgrounds.js` | 与关卡无关，放后；累了可穿插 |
| — | **E06*** | 默认不做 | 需要扩内容时再开；优先 **E06b** Letter 目录化 |

**刻意延后 / 不做的**

- 不在 E03 中途引入 StageContext（双变量难回归）  
- 不把 E01 插在 E03 前面（对关卡观感帮助小，打断主线）  
- 不重写 Letter 弹幕内容；不引入打包器  
- 关卡长期仍可 `build(g)`，E07 只是薄包装，不是插件引擎

**你怎么用这份方案**

1. 打开游戏，按 E02 手测要点点一遍 → 回我「E02 OK」  
2. 我说开工 **E03a** → 改完测绿 → 你手测 2/3 面  
3. 回「OK」→ 自动进表内下一步，**你不用重新想顺序**

---

### 推荐顺序（锁定 · 与上表一致）

```
E02 手测收口
  → E03a（installMidWave + s2/s3 试点）
  → E03b（A 线 mid）
  → E03c（B 线 mid）
  → E03d1（ex_mid 拆文件，内容不动）
  → E03d2（ex_mid 迁 installMidWave）
  → E07（StageContext 薄封装 + s1 试点）
  → E01（Game 转发壳 + 死代码）
  → E05（章结束条件纯函数）
  → E04（拆 backgrounds.js）
  → E06*（可选；优先 E06b Letter 目录化）
```

说明：`ex_mid.js` ~1867+ 行 / 62 mid——**E03d 已拆成 d1/d2 两提交**，禁止再往单文件堆内容。  
E04 与关卡解耦无关，可在 E03 疲劳时穿插，但默认仍排在 E05 后。

---

### E01 收束 `Game` 门面：删薄转发 + 修死代码

| | |
|--|--|
| **状态** | 待做（**排在 E07 之后**，勿提前插队） |
| **审查对应** | Issue 1（门面 indirection）、Issue 4（`_showOverlay` 未 import 且无调用方） |
| **目标** | `game.js` 不再充当「每个私有方法转发一次」的双 API；模块内直调；公开 API 变薄 |
| **范围** | |
| | 1. **删除** `_showOverlay`（`showOverlay` 未导入，且全库无调用） |
| | 2. 审计仅 `combat.*` / `chapterFlow.*` / overlay / hud 的**纯转发**私有方法：若调用方全在同类模块内，改为模块 `import` 直调，并删 `Game` 上对应方法 |
| | 3. 保留对外/跨层必要入口：`start` / `stop` / `spawnEnemy` / `spawnBullet` / `addScore` / `applySettings`、主循环、以及 debug/UI 仍经 `game` 调用的路径 |
| | 4. `chapterFlow` ↔ `gameCombat` 互调改为直接 import（避免 `game._finishChapter` → `chapterFlow.finishChapter` 绕圈） |
| **不做** | 不改状态机语义、数值、章节表；不拆 `backgrounds`；不迁 stages mid |
| **目标体量** | `game.js` 明显变短（期望 ~250–400 行量级，以删干净为准，不硬砍行数） |
| **验收（自动）** | `npm test` 全绿 |
| **验收（手测）** | 开局→一章→暂停/继续/回标题；章间推进；GameOver/练习结束 overlay；对话确认 |
| **风险** | 中——漏改调用点会 runtime 炸；每步可先 grep 引用再删 |
| **手测要点** | 暂停设置进出；决死 Bomb；通关一章自动进下一章 |

---

### E02 去掉 `settlement` / `stageIntro` 兼容双轨

| | |
|--|--|
| **状态** | 完成 |
| **审查对应** | Issue 4（兼容字段双读） |
| **目标** | 绘制与章节流只认单一真源 |
| **范围** | |
| | - 真源：`chapterBanner`（章标题/结算条）、`stageTransit`（面间过渡） |
| | - `gameDraw.js`：去掉 `chapterBanner \|\| settlement`、`stageIntro` 旧分支（确认无写入后再删） |
| | - `game.js` / `chapterFlow.js`：停写 `settlement` / `stageIntro`；删重置与注释「兼容旧引用」 |
| | - 顺带：`MANUAL_TEXT` / `ENDING_A|B` / entities draw re-export / `_showOverlay` / `pausePressed` / `pauseTap` 与 `bindTouchButtons` 第三参 / `stageIntroFor.desc` |
| **不做** | 不改 banner/过渡的时长与文案；不改 Three 背景；不做 E01 门面大拆 |
| **验收（自动）** | 全绿 |
| **验收（手测）** | 换面过渡页文案仍出；章开始标题条 + 章结束结算条动画正常；Esc/触屏暂停；说明书 |
| **风险** | 低；改前 grep 全库 `settlement`/`stageIntro` 确认无外部依赖 |
| **手测要点** | 面间过渡；章 banner；暂停；Manual 章节；结局对话 |

---

### E03 主线 mid 全面 `installMidWave`（T14 收尾）

> 成功标准：新 mid **默认**走 helper；手写 wave 壳仅允许有注释的特例。  
> **本阶段核心**，按 a→b→c→d1→d2 连做，中间不插 E01/E04。

#### E03a helper 补齐 + s2 / s3 试点

| | |
|--|--|
| **状态** | 完成 |
| **审查对应** | Issue 2（mid 双系统） |
| **改动清单** | `_shared.installMidWave` 支持仅 `continuous`（不推进 waveCount）；s3_1/5/6 手写 waveFn 迁 helper；s2 早已全量 installMidWave，无改 |
| **范围** | |
| | 1. 扩展 `installMidWave`：无 `onWave` 或 `maxWaves<=0` 时只跑 continuous |
| | 2. **s3_dazong** 全部 mid 手写壳迁完；s2 确认已是 helper |
| | 3. 单测：仅 continuous 不推进 waveCount |
| **不做** | 不改 A/B/EX；不改编弹幕数值；不重写 Letter |
| **验收（自动）** | 全绿；全章 build 冒烟 |
| **验收（手测）** | 2 面、3 面道中密度与辅压「一直有」；midboss/Boss 可进 |
| **风险** | 中——迁移时勿把 continuous 再塞进 spawn 门后 |
| **手测要点** | 3-1 大玉辅压+节点；3-5 横扫激光持续；3-6 精英+重力雨打完精英后**不应提前结束**（靠 duration）；2-2 雨+刷怪并存 |

#### E03b A 线 mid（a4 / a5 / a6）

| | |
|--|--|
| **状态** | 完成 |
| **改动清单** | a4 mid_4/6；a5 mid_5/6/8；a6 mid_6/8/10 → continuous-only `installMidWave`；其余 mid 原本已是 helper |
| **范围** | `a4_menbailiang.js` / `a5_rival.js` / `a6_yimeige.js` 中全部 mid（及 mid 形态 wave）迁 `installMidWave`；Letter/`pushBossRef` 不动 |
| **不做** | 不调 hp/间隔/颜色；不改对话与章节 id |
| **验收（自动）** | 全绿 |
| **验收（手测）** | A4 抽 2 个 mid + midboss；A5/A6 各抽查；辅压与刷怪并存 |
| **风险** | 中；a6 文件大，可按 mid_1…mid_n 分段改、一次提交 |
| **手测要点** | A4 mid_4 激光墙+雨持续；A4 mid_6 雨/狙/十字并存；A5 mid_5–8 辅压密度；A6 mid_6/8/10 纯弹幕章不提前结束 |

#### E03c B 线 mid（b4 / b5 / b6）

| | |
|--|--|
| **状态** | 完成 |
| **改动清单** | b4 mid_4/6；b5 mid_7/8；b6 mid_5/8/10 → continuous-only `installMidWave`；其余 mid 原本已是 helper |
| **范围** | b4–b6 mid 同 E03b 迁 `installMidWave` |
| **不做** | 不改 EX（见 E03d）；不改 van Letter |
| **验收（自动）** | 全绿 |
| **验收（手测）** | B4 或 B5 一道中面；B6 抽 mid_5/10 辅压密度 |
| **风险** | 中 |
| **手测要点** | B4 mid_4 雨+狙、mid_6 横扫+雨+十字；B5 mid_7/8 纯弹幕持续；B6 mid_5/8/10 不提前结束 |

#### E03d1 EX mid 拆文件（内容不动）

| | |
|--|--|
| **状态** | 完成 |
| **审查对应** | Issue 10；`ex_mid.js` 原 ~1867 行 / 62 `mid_*` |
| **改动清单** | `ex_mid_0_31.js`（32）+ `ex_mid_32_61.js`（30）；`ex_mid.js` 仅表 + `buildExMid` + re-export |
| **目标** | 单文件可浏览；**零行为变化** |
| **范围** | 拆为 `ex_mid_0_31.js` + `ex_mid_32_61.js`；`ex_mid.js` 只保留 `MID_PATTERNS` 表、`buildExMid`、re-export |
| **不做** | 不改编幕数值、章顺序、强度公式；**本步不迁** `installMidWave` |
| **验收（自动）** | 全绿；`MID_PATTERNS.length === 62`；全 EX mid build 冒烟 |
| **验收（手测）** | Extra 开局道中 30s + 进道中 Boss 即可（抽查） |
| **风险** | 中——漏 export / 表漏项；宜独立提交 |
| **手测要点** | Extra 道中密度与改前一致；无 import 报错；能打到道中 Boss |

#### E03d2 EX mid 壳迁 `installMidWave`

| | |
|--|--|
| **状态** | 等手测（本地 commit，未 push） |
| **改动清单** | 0–31：crossLanes/hLaserRain/centerSides/gapWall/randomGap/rainSniper/columnLane/laserDot/wallRain；32–61：coreSpin/wallRebuild/rainAfter/crossAfter/hLaserAfter/centerAfter/wallAfter/sanctuary/overwriteEve（共 18） |
| **目标** | EX 与主线同一 wave 壳；grep 手写 `waveTimer` 壳仅剩有注释特例 |
| **范围** | d1 拆出的 pattern 文件内：手写 `waveTimer/waveCount/waveFn` → `installMidWave`；`exFire` 间隔仍由调用方传入 |
| **不做** | 不改 `ex_shared` 公式；不重设计 62 章内容 |
| **验收（自动）** | 全绿；`MID_PATTERNS.length === 62`；ex_mid_* 无 `g.waveFn =` |
| **验收（手测）** | Extra 道中→道中 Boss→van；抽查前半/后半段 mid 密度 |
| **风险** | 中——continuous 勿塞进 spawn 门后；overwriteEve 仅 continuous 勿误触发 wavesExhausted |
| **完成定义（E03 整段）** | 主线+EX 新手写 wave 壳仅特例；EX 每文件可浏览 |
| **手测要点** | Extra 前半（含 gap 墙/雨狙）；后半 sanctuary/overwriteEve；精英+辅压章打完精英勿提前结束 |

---

### E07 薄 StageContext（关卡契约收窄 · 试点）

| | |
|--|--|
| **状态** | 待做（**排在 E03d2 之后**） |
| **目标** | 关卡不再直接把完整 `Game` 当沙箱；经窄 API 出怪/出弹/挂波次/设 Boss |
| **严格度** | 中等：包装现有能力，**不**做插件加载器 / 弹幕 DSL |
| **范围** | |
| | 1. 新增 `js/stages/stageContext.js`（或 `_shared` 旁）：`asStageContext(game)` → `{ spawnEnemy, spawnBullet, player, installWave, setBoss, raw? }` |
| | 2. `installWave` 转调 `installMidWave`；`setBoss` 转调 `pushBossRef` / 写 `bossRef` |
| | 3. **仅 s1** 的 `build` / script 改为用 ctx（`build(g)` 签名可保留：`const ctx = asStageContext(g)`） |
| | 4. 可选：关卡内减少直接 `acquireBullet`——能走 `spawnAimed` 等则走 patterns；本任务不强行全库清 |
| **不做** | 不迁 A/B/EX；不改数值；不删 `game.spawn*` 对外 API |
| **验收（自动）** | 全绿；s1 全章 build 冒烟 |
| **验收（手测）** | 1 面完整：道中密度、midboss、Alice Letter |
| **风险** | 中——ctx 漏转发字段会导致 script 读不到 player 等；试点面要打穿 |
| **后续（不本任务）** | E06b 或 Phase F 再把 A/B/EX 迁到 ctx；patterns 进一步只收 `spawnBullet`+倍率 |

---

### E04 拆 `backgrounds.js`（降 1k）

| | |
|--|--|
| **状态** | 待做（**默认排在 E05 之后**；与关卡无关，疲劳时可穿插） |
| **审查对应** | Issue 3（1081 行） |
| **目标** | 单一 JS 文件不再 >1000 行；场景 builder 可按面浏览 |
| **建议结构** | |
| | `js/backgrounds/StageBackground.js` — 类：构造 / resize / setMode / update / `_clear` / lights / points / label |
| | `js/backgrounds/scenes/*.js` — 各 mode 的 `export function buildXxx(bg)`（或按 s1/s2/… 聚合） |
| | `js/backgrounds/index.js` 或根 `backgrounds.js` re-export — `STAGE_BG_BUILDERS` + 对外 `StageBackground` |
| **范围** | 只搬迁，不改 Three 视觉与 mode 名；`main.js` import 路径保持或薄 re-export 兼容 |
| **不做** | 不重做美术；不合并 playfield 调色板（可另开）；不改 `bgModes.js` 登记表语义 |
| **验收（自动）** | 全绿；语法扫描含新路径 |
| **验收（手测）** | 抽查 1 面 / 3 面 / A5 / B6 / EX：左栏 Three 主题切换正常、无 WebGL 报错 |
| **风险** | 中——`this` 与 builder 闭包；dispose 路径勿丢 |

---

### E05 章结束条件收成纯函数

| | |
|--|--|
| **状态** | 待做（**排在 E01 之后**） |
| **审查对应** | Issue 5（`updateCombat` 内四套结束分支） |
| **目标** | `evaluateChapterEnd(game, ch, ctx) → null \| { success: boolean, reason: string }`；`updateCombat` 只消费 |
| **范围** | `gameCombat.js`（或新 `chapterEnd.js`）；覆盖：Letter 超时、duration±bossRef、bossRef.dead、mid+wavesExhausted |
| **不做** | 不改判定时机与成功/失败语义；不改 collision |
| **验收（自动）** | 全绿；**建议**为纯函数加单元测（超时失败 / 击破成功 / 道中耗尽） |
| **验收（手测）** | Letter 拖满超时失败；击破 boss 成功；纯道中清完提前结束；有 duration 的 midboss 到时 |
| **风险** | 中——时序（dead 与 purge 先后）必须与现网一致 |

---

### E06 可选 backlog（不默认开工）

| ID | 题 | 说明 | 状态 |
|----|----|------|------|
| E06a | `ui` 设置表单抽离 | `_initSettings` FPS 指针规则 → `settingsForm.js`；UI 只编排 | 待做（可选） |
| E06b | Letter 内容目录化 | 大面 letter 按 boss 拆文件；**不动数值**；可与 StageContext 推广一起做 | 待做（可选·**优先**） |
| E06c | `playfieldBg` 调色板数据外置 | SKY/THEME/ACCENT 按 mode 数据文件；绘制逻辑不动 | 待做（可选） |

E06* 不阻塞默认方案 0–9 步；内容大扩或 Letter 文件难读时再开，**优先 E06b**。

---

## 进度日志

| 日期 | 任务 | 自动测试 | 手测 | 备注 |
|------|------|----------|------|------|
| 2026-07-18 | T12a–d | 完成 | 完成 | game 门面 ~540 行 |
| 2026-07-18 | T13 | 语法+32 | 完成 | `71e8a99` `js/draw/*` |
| 2026-07-18 | T14 试点 | 35/35 | 完成 | s1 + shared 工厂；`442a83c` |
| 2026-07-18 | T14 全主线表 | 35/35 | 完成 | s2–s3/patrol/A/B 章节表迁 midChapter/letterChapter |
| 2026-07-19 | T15 | 36/36 | 完成 | `4497417` bgModes 单一登记；playfield 去重；Three builder 表 |
| 2026-07-19 | T16 | 40/40 | 完成 | `5357e4d` runCollisions 事件化 + applyCollisionEvents |
| 2026-07-19 | T17 | 40/40 | 完成 | `1fe3017` 焦点 CSS 变量；去掉 #d4af37 漂移 |
| 2026-07-19 | T18 | 44/44 | 完成 | `d90192d` 立绘 HIDDEN_OK；Boss 占位表；未知→几何 |
| 2026-07-19 | Phase E 规划 | — | — | 审查写入 E01–E06；**未开工** |
| 2026-07-19 | 热修+规划修订 | 45/45 | 等手测 | endFrame/描画 24–240/patrol BGM/难度与 Extend/擦弹紫辉+白粒子；E03d 提权 ex_mid；VERSION 手改 76（commit 后 hook→77） |
| 2026-07-20 | Phase E 重排拍板 | — | — | 关卡主线优先：E02手测→E03*→E07→E01→E05→E04；E03d 拆 d1/d2；新增 E07 StageContext；**未开工代码** |
| 2026-07-20 | E02 | — | 完成 | 用户确认手测 OK |
| 2026-07-20 | E03a | 全绿 | 完成 | installMidWave continuous-only；s3 mid 手写壳清完；s2 已是 helper |
| 2026-07-20 | E03b | 全绿 | 完成 | A4/A5/A6 pure-continuous mid；同提交去掉 H/aimed 激光默认 life（已 push） |
| 2026-07-20 | E03c | 全绿 | 完成 | B 线 mid；`eed6085` 已 push |
| 2026-07-20 | E03d1 | 全绿 | 完成 | `1016b99` 已 push |
| 2026-07-20 | E03d2 | 全绿 | 等手测 | EX 18 处手写 wave → installMidWave；**仅本地 commit** |

---

## 手测快速清单（通用）

每次「等手测」至少覆盖与该任务相关的子集；全量烟测可用：

1. 主菜单 → 难度 → 自机 → Story 开局 1 面 10 秒  
2. 暂停 / 继续 / 回标题  
3. 练习模式一章结束 → 重试  
4. Stage Select 任意 A/B 面进关  
5. Extra 进关（E03d / 与 EX 相关时必做）  
6. 设置改键 / 音量后进关仍有效  
7. （E02）换面过渡 + 章结算条  
8. （E04）左栏 Three 换面主题  
9. （E05）Letter 超时失败 vs 击破成功  
10. （E07）1 面完整道中 + Alice Letter
