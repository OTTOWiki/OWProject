# AGENTS.md — OWProject

> **贡献流程与红线**见 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。  
> **禁止直推 `main`**：一律功能分支 + **Pull Request**（详见 CONTRIBUTING §0）。  
> 改造队列见 [`docs/refactor-queue.md`](./docs/refactor-queue.md)。玩家向说明见 [`README.md`](./README.md)。

东方风弹幕 STG（纯前端 H5）。OTTOWiki / 维基梗二次创作；逻辑坐标系固定 **450×600**。

**权威**：可运行代码（`js/` 等）+ 本文件。`README.md` 偏玩家向；`参考/需求.txt` **已过时**，勿当规格。

## 文档对齐（必读）

改代码时**同步**更新本文件与 `README.md`（若涉及玩家可见说明）。不要只改实现留文档。

| 何时必须改文档 | 示例 |
|----------------|------|
| 新增/删除/重命名模块或目录 | 拆文件、抽 pool、新 `js/foo.js` |
| 改 `Game.state` / mode / 菜单入口 | `stageTransit`、`extra`、主菜单按钮 |
| 改平衡/流程契约 | `BALANCE` 阈值、章节 id 区间、路线条件 |
| 改存档 key / 设置项 / 发版流程 | `STORAGE_KEYS`、hooks、CF 构建 |
| 改测试入口或 CI 约定 | `test/cases*.js`、`.github/workflows/test.yml`（job **Test**） |

**给 Agent 的提示词（改完代码后执行）**：

```
对照本次 diff，检查 AGENTS.md / README.md / CONTRIBUTING.md 是否仍准确：
1. 目录树与模块职责是否列了新路径、删了死路径
2. 状态机 / mode / 难度 / 菜单是否与 index.html + js 一致
3. 数值与流程是否仍写死了已变更的常量（应写「见 config.js」或改成现值）
4. 常见任务速查表的「主要文件」是否指向现实现
5. 贡献红线/流程若有变，同步 CONTRIBUTING.md
有漂移则就地改文档；不要另开「以后再写」的 TODO。不相关的长篇历史说明可删，保持文档可扫读。
```

冲突时以**代码**为准，并立刻把文档改到与代码一致。

---

## 运行

必须通过本地 HTTP 打开（ES Module + Three.js CDN），不要双击 `index.html`。

```bash
npx --yes serve .
# 或
python -m http.server 8080
```

无打包步骤、无 npm 运行时依赖。改 JS/CSS/HTML 后刷新即可。部署短哈希注入见下文「版本号」。

### 首次克隆 / 新电脑（Git hooks）

```bash
npm run hooks:install
```

- 设置 `core.hooksPath=.githooks`（本机配置，**每个工作副本跑一次**）
- 每次 `git commit`：pre-commit 将 `js/version.js` 的 **`VERSION` +1** 并入**同一次**提交
- 跳过：`git commit --no-verify`
- 不自动 +1：`amend` / `rebase` / `merge` / `cherry-pick` 过程中

### Debug（自测）

```js
owDebug()                 // 开面板
owDebug(false)            // 关
owDebug.help()
owDebug.set({ invincible: true, lockLives: true, lockBombs: true, timeScale: 3, skipDialogue: true })
owDebug.softJump(129)     // 软跳章节 id（EX 起 id）
owDebug.kill()            // 清敌+清弹+本章成功
```

- 热键：`F8` 面板、`F9` 循环加速
- 实现：`js/debug.js` + Tweakpane（首次开启才加载 CDN；不写 localStorage）

### 测试

```bash
npm test              # 优先 bun test；无 bun 退 node（语法 + 单元/冒烟）
npm run test:unit
npm run test:syntax
npm run test:bun       # 强制 bun test（入口 test/run-bun.test.mjs）
# 浏览器：serve 后打开 /test/
```

- 分发：`test/run-tests.mjs` — 有 bun 跑 `bun test`，否则 node `check-syntax` + `run-node`

- CLI：`test/check-syntax.mjs` + `test/run-node.mjs`（`assert.js` 桥接 `node:test`）；bun 下用 `test/run-bun.test.mjs` 包装（bun 要求文件名含 `.test`，`node:test` 只能在 runner 内调）；入口 `test/run-tests.mjs` 负责 bun/node 分发
- 浏览器：`test/index.html` → `run.js` + `cases.js`
- 分文件：`cases-config|patterns|collision|feedback|pools|stages|boss-dps|storage-spawn|letterrate|runstats|continue|assets|ranking|replay|smoke|load.js` + `mockGame.js`
- CLI 不 import Three；`cases-load.js` 仅浏览器动态 import 主模块
- CI：`.github/workflows/test.yml` — **唯一 job 名 `Test`**，内部执行 `npm test`（本地仍 `npm test`）
- **合并门禁**（ruleset `protect-main`）：required checks = **`Test`** + **`CodeRabbit`**。加测优先在 `Test` job 内加 step

---

## 目录（要点）

```
CONTRIBUTING.md        # 贡献流程与红线
AGENTS.md / README.md
index.html
css/style.css
js/
  main.js              # 组装 Input / Audio / Background / Game / UI
  config.js            # LOGICAL_*、BALANCE、DIFFICULTIES、Unstable、说明书
  version.js / git-hash.js
  game.js              # Game 门面：主循环、spawn API、状态字段
  gameDraw.js / gameOverlay.js / gameCombat.js / chapterFlow.js / chapterEnd.js / hud.js
  runStats.js          # 对局统计纯格式化（formatRunTime / formatRunStats）
  collision.js / patterns.js / entities.js / spawnScale.js
  draw/                # drawUtils + bulletDraw / enemyDraw / playerDraw / itemDraw（index 聚合）
  stages/              # index 聚合；s1–s3、patrol、a4–a6/、b4–b6/、ex_van/ex_mid/ex_mid_0_31/ex_mid_32_61/ex_shared；_shared + stageContext
  ui.js / menuNav.js / settingsForm.js / startMode.js
  historyScreen.js / historyVersions.js
  ranking.js / rankingScreen.js / scoreRanking.js / replay.js / replayStore.js / replayScreen.js / rng.js
  input.js / audio.js / storage.js / debug.js
  backgrounds.js       # re-export → backgrounds/*
  backgrounds/         # StageBackground、builders、scenes、textTexture、threeLoader
  bgModes.js / playfieldBg.js / playfieldBgThemes.js
  sprites.js / assets.js
  pool.js              # 泛型对象池（bullet/item/particle 共用）
  bulletPool.js / itemPool.js / particlePool.js
  dialogue.js
test/                  # 零第三方自动化测试
assets/                # bg portraits sprites ui + bgm/*.ogg
tools/                 # inject-deploy-hash、hooks、bump-version、to-avif
functions/api/         # CF Pages Functions（History 等）
docs/                  # 内部改造队列等（非运行时）
参考/                  # 过时设计稿
```

兼容 re-export：`stages/a4_menbailiang.js` 等 → 对应 `a4/`… 子目录，新增内容改子目录。

---

## 架构

### 坐标系（硬约束）

- `LOGICAL_W=450`, `LOGICAL_H=600`（`config.js`）
- `<canvas id="playfield" width="450" height="600">` **禁止**运行时改 `width`/`height`
- 触屏：`client * (canvas.width / rect.width)` → 逻辑坐标（`.playfield-wrap` 恒按 450:600 等比内嵌，画布 CSS 盒与逻辑坐标同比，映射才精确）
- 移动端竖屏（`≤820px 且 portrait`）：单列——版面占满可用高度，HUD 压成底部横条

### 模块职责

| 模块 | 做什么 | 别在这里做 |
|------|--------|------------|
| `config.js` | 数值、难度、文案常量 | 游戏逻辑 |
| `game.js` | 门面、主循环、`spawnEnemy`/`spawnBullet` | 弹幕公式、章流程细节 |
| `chapterFlow.js` | 章开/结、对话、路线、结局、面过渡 | 逐帧弹幕 |
| `gameCombat.js` | 战斗帧、Bomb/Miss、得分、道具、collision 消费 | 对话/路线 |
| `chapterEnd.js` | 章结束条件纯函数 | 改 game 状态 |
| `runStats.js` | 对局统计纯格式化（用时/统计行） | 改 game 状态 |
| `collision.js` | 碰撞几何；`runCollisions` 返回事件 | 得分/掉落/SFX |
| `stages/*` | 章节定义 + 刷怪 | 全局状态机 |
| `patterns.js` | 弹幕工具 | UI / 存档 |
| `entities.js` | 实体 update | 绘制（在 `draw/`） |
| `pool.js` | 泛型对象池（bullet/item/particle 共用 acquire/release/purge） | 实体语义 |
| `spawnScale.js` | 敌机/敌弹难度缩放 | 关卡编排 |
| `ui.js` + `settingsForm.js` | 菜单 / 设置表单 | 碰撞得分 |
| `bgModes.js` | stageKey→mode、贴图路径 | 几何绘制 |
| `backgrounds/*` | 左侧 Three 场景 | 版面 Canvas |
| `playfieldBgThemes.js` | `MODE_THEME` 一行表 | Three 场景 |
| `rng.js` | 种子 PRNG（mulberry32）+ `withSeededRng` | 业务逻辑 |
| `ranking.js` | 排行榜纯函数 + localStorage（按难度 top10） | UI / 录像 |
| `rankingScreen.js` | 排行榜屏（难度切换 + 列表） | 游戏逻辑 |
| `scoreRanking.js` | 成绩排行结算弹层（入榜时名次高亮 + 机签 + 保存/取消） | 游戏逻辑 |
| `replay.js` | 录像：快照 RLE 编解码、回放游标、虚拟输入 | 存档 I/O |
| `replayStore.js` | 录像帧数据 IndexedDB + localStorage 索引 | 游戏逻辑 |
| `replayScreen.js` | 录像列表屏（播放/删除） | 游戏逻辑 |

出怪/出弹须走 **`game.spawnEnemy` / `game.spawnBullet`**，勿直接 `enemies.push` / `bullets.push`。

### 状态与模式

**`Game.state`**：`playing` | `dialogue` | `routeSelect` | `stageTransit` | `gameover` | `ending`  
暂停：`paused` 标志（不是 state）。

**`Game.mode`**：`story` | `practice` | `stage` | `extra` | `nomiss`
（Stage Select 进 EX / 主菜单 Extra Start → `extra`；策略见 `startMode.js`。
`nomiss` 无伤模式：**入口 = Start Game 的自机选择页勾选「Nomiss 无伤模式」复选框**（无主菜单独立入口）；被弹自动重开当前章、保留资源、禁录像、进度持久化、仅暂停结算/结局结算，不入榜。）

**练习模式**：难度用内联标签选择（`DIFFICULTIES`），关卡用标签二选、章节列表只显示当前关卡的章节（`practiceChapterGroups`，替代原生 select）；记住上次选择（`gunwei_practice`）；不经难度页，直接选自机。

**录像回放**：`Game.replaying` 标志（不是 `mode`/`state`）。回放复用同一状态机，输入来自录像快照、随机数来自录像头种子；回放期间跳过暂停/叠加层。

### 章节流

1. 前三面：章节 id **1–22**
2. 3 面后：|倾向| ≥ `BALANCE.tendencyThreshold`（**70**）进 A/B；否则巡查 **23–24**
3. 拦截胜 → `routeSelect` 手选 A/B
4. A 线（门百梁 → 对手 → 一美个）/ B 线（赌人 → 棍电 → 拉斯特）→ 对应结局；**EX** 自 id **129**
5. 每面多 mid + midboss + 多 Letter；以 `js/stages/` 为准

章节字段：`id, name, stage, stageKey, kind, music, bg, duration?, unstable?, dialogue?, letter?, letterTime?, build(g)`  
`kind`: `mid` | `midboss` | `boss`

### 核心机制

- 章节 Perfect × `BALANCE.chapterPerfectMul`（1.05）；超时失败不发
- 擦弹 → edit；满 100 按 Item → 半径 `editClearRadius`（50）消弹
- 决死窗：`BALANCE.deathBombWindow`
- Unstable：道中 `unstable: true` 抽 `UNSTABLE_POOL`
- Combo：击破连击，3s 窗口（`BALANCE.combo.window`），每连击 +1% 分数（`BALANCE.combo.perPercent`），只乘实时得分、不计入 baseScore
- 续关：每次 Game Over 先过成绩排行；还有续关次数（`BALANCE.continue.max`=2，练习除外）时结算可选继续，续关后残机/Bomb=2（`BALANCE.continue.lives/bombs`）、**分数清零**（hiscore 保留），排行榜标「续」，续关后不再录制录像
- 默认 **4 残 4B**；Stage Select **不锁关**
- Nomiss：`miss()` 被 `nomissRestart` 劫持——不扣残机不 Game Over，回滚分数/资源到进章时状态（`_nomissSnapshot`，该次尝试作废，hiscore 保留）+ BGM 回带（`audio.seekMusic`），重开当前章；**生命道具禁用**（`spawnItem`/`collectItem` 拦截）；进度存 `gunwei_nomiss_progress`

### 自机 / 难度

- `yinquan` 饮泉思源、`shama` 誓约沙玛（机制同；5 面对手随自机）
- 常规：`easy` / `normal` / `hard` / `lunatic`（中文：这么菜啊 / 白银 / S6第一个王者 / 职业选手）
- **Extra 专用**：`DIFFICULTIES.extra`（参数同 lunatic，文案独立）；仅 Extra Start / EX 路径
- 难度只缩 `bulletSpeed` / `fireInterval` / `spawnMul` / `bulletCount` / `grazeMul` / `scoreMul`；资源与敌血等见 `BALANCE`

### 音频 / 视觉

- OGG：`assets/bgm/` + `AUDIO_FILE_MAP` / `trackForStage`（`audio.js`）
- 左 Three / 中 Canvas 版面 / 右 HUD+触屏
- 立绘：仅 `PORTRAIT_PATHS` 有图才显示；否则隐藏（`PORTRAIT_HIDDEN_OK`）
- Boss：`DEDICATED_BOSS_BY_KIND`；占位 `PLACEHOLDER_BOSS_SPRITES`（`null`=几何）；未知 kind **禁止**默认爱丽丝脸

### 存档（localStorage）

| Key | 内容 |
|-----|------|
| `gunwei_keys` | 键位 |
| `gunwei_hiscore` | 高分 |
| `gunwei_unlocked` | 进度记录（Stage Select **不门禁**） |
| `gunwei_difficulty` | 上次难度 |
| `gunwei_settings` | 音量、弹透明度、单击发射、FPS 上限等 |
| `gunwei_ranking` | 排行榜（按难度 top10，与录像独立） |
| `gunwei_ranking_name` | 上次入榜昵称（3 字） |
| `gunwei_replays_index` | 录像索引（元数据；帧数据在 IndexedDB `owproject-replays`） |
| `gunwei_practice` | 练习模式上次选择（章节 id + 难度） |
| `gunwei_nomiss_progress` | Nomiss 模式章节进度（下一章 id） |
| `gunwei_letter_rate` | Letter 卡收取记录（成功收取/总尝试次数） |
| `gunwei_practice_best` | 练习模式各章最佳（得分 + 是否 NMNB） |

---

## 版本号与发版

| 字段 | 含义 |
|------|------|
| `VERSION` | 构建号（自然数，pre-commit +1） |
| `VERSION_NAME` | 展示语义段（如 `0.4.4`） |
| `DEPLOY_GIT_HASH` | 仓库恒 `''`；CF 构建注入 |
| `VERSION_LABEL` | 有 hash → `v{NAME}.{hash}`，否则 `v{NAME}` |

- CF：**Build** `npm run pages:build`；**Output** 留空或 `.`（不要 `/`）
- 营销升版只改 `VERSION_NAME`；勿手改 `VERSION`；勿提交带真实 hash 的 `git-hash.js`
- 本地预览 hash：`npm run inject-hash`，预览完 `git checkout -- js/git-hash.js`
- Tag：建议 `v` + `VERSION_NAME`
- **合入 `main` 只走 PR**（见 `CONTRIBUTING.md`）；分支上 commit 时 hook 仍会 `VERSION+1`

---

## 改代码约定

1. 平衡数值优先 `config.js` 的 `BALANCE` / `DIFFICULTIES`。
2. 新章节：`js/stages/` 对应面 + `stages/index.js` 已聚合；出弹复用 `patterns.js`。
3. 新对话：`dialogue.js` + `SPEAKER_COLORS`。
4. 新背景 mode：`bgModes.js` → `backgrounds/builders.js`（+ scenes）→ `playfieldBgThemes.js` 的 `MODE_THEME`。
5. ES modules，无打包器；勿引入框架，除非用户明确要求。
6. UI/剧情中文；标识符英文。
7. 勿运行时改 playfield 的 `width`/`height`。
8. Stage Select 保持全开放。
9. **文档与代码同步**（见文首「文档对齐」）。
10. **禁止直推 `main`**；走 PR 合并（见 `CONTRIBUTING.md`）。
11. **更改详情不要写在游戏内提示中**  
    版本说明、修复列表、开发备注、PR/commit 摘要等只写在 Git / 文档 / 发布说明里。  
    **禁止**塞进：章标题 banner、结算条、面间过渡诗、`MANUAL_CHAPTERS`、对话、flash 提示、HUD 常驻文案、暂停/结果 overlay 等玩家可见文案。

### 弹种

`dot` / `rice` / `talisman` / `medium` / `large` / `laser` 等；绘制半径与判定半径分离。

### 操作（默认）

方向/WASD 移动 · Shift 低速 · Z/X/C Shot/Bomb/Item · Esc 暂停 · 触屏滑动移动+按住射击。

### 常见任务

| 任务 | 主要文件 |
|------|----------|
| 调难度/手感 | `config.js` |
| 改某一章弹幕 | `js/stages/*` + `patterns.js` |
| 改碰撞/Bomb/擦弹 | `collision.js` / `gameCombat.js` |
| 改菜单 | `ui.js` + `index.html` |
| 改设置/键位 | `settingsForm.js` / `ui.js` + `storage.js` + `config.js` |
| 改 BGM | `audio.js` |
| 改左侧 3D | `backgrounds/*` + `bgModes.js` |
| 改版面主题色 | `playfieldBgThemes.js` |
| 改立绘/精灵 | `assets.js` / `sprites.js` + `assets/` |
| 改排行榜 | `ranking.js` + `rankingScreen.js` + `scoreRanking.js` + `index.html` |
| 改录像/回放 | `replay.js` + `replayStore.js` + `replayScreen.js` + `game.js` + `rng.js` |
| 发版 | `VERSION_NAME` + hooks；CF `pages:build`；tag |
| 测试 | `npm test`（优先 bun，无 bun 退 node）、`npm run test:bun` 或 `/test/` |

---

## Github

- 鉴权使用环境变量 `OTTOWIKI_GITHUB_PAT`
- GitHub MCP 已配置 token 时无需再配
