# 贡献指南 — OWProject

欢迎参与 **OTTOWiki Project**（东方风弹幕 H5）。本文说明如何安全地改代码、测回归、对齐文档。

| 文档 | 用途 |
|------|------|
| **本文件** | 贡献流程与红线 |
| [`AGENTS.md`](./AGENTS.md) | 架构、模块职责、发版、Agent 约定（开发权威） |
| [`README.md`](./README.md) | 项目简介、运行方式、文档/Manual 入口、授权与素材（玩法细节以游戏内 Manual 为准） |
| [`docs/README.md`](./docs/README.md) | 文档索引与任务状态（现行 / 归档 / 待处理） |
| [`docs/refactor-queue.md`](./docs/refactor-queue.md) | 改造任务队列与历史台账（**未指派勿擅自开工队列项**） |
| [`docs/local-environment.md`](./docs/local-environment.md) | ⚠️ 本机环境、外部调研来源与本地证据（非规格、不可从干净 clone 复现） |

**规格冲突**：以**可运行代码**为准，并同步修正文档（见 AGENTS「文档对齐」）。
**文档信息红线**：除 `docs/` 外，文档不得提供仅依赖提交者本机才能成立的信息；`docs/` 内的本地信息必须标 ⚠️（见 `docs/README.md`）。

---

## 0. 分支策略（强制）

**禁止向 `main` 直接推送代码。** 所有改动必须：

1. 从最新 `main` 拉出功能分支  
2. 在分支上 commit  
3. 推送到远程分支并开 **Pull Request → `main`**  
4. 合并门禁（ruleset `protect-main`）required checks = **`Test`** + **`E2E`** + **`CodeRabbit`**（**允许作者自合**；欢迎互相 Review，但不强制 Approve）；**`E2E`** 在每个 PR 都真实跑必过子集（boot + game 冒烟）；全量 **`E2E`** 在最终集成 PR 打 `run-e2e` 标签（或 `workflow_dispatch`）时跑一次  

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b feat/short-topic    # 或 fix/…、docs/…
# … 修改、npm test、commit …
git push -u origin HEAD
# 在 GitHub 开 PR → base: main
```

| 允许 | 禁止 |
|------|------|
| 推送到 `feat/*`、`fix/*`、`docs/*` 等非 `main` 分支 | `git push origin main` |
| 经 PR merge 进 `main`（**可自合**） | 在 GitHub 网页上直接改 `main` 上的文件 |
| 推功能分支、开/改 PR | `git push origin main` |

**原因**：拦住直推，保证 `main` 上的改动都有 PR 记录 + CI；不强制互相 Approve，避免卡住。

仓库侧已启用分支保护：无法直推 `main`，须经 PR 且状态检查通过。

---

## 1. 环境与运行

- **Node.js**（建议 20+；CI 用 26）：跑 `npm test` / hooks
- **浏览器** + 本地静态服务（ES Module + Three.js CDN）
- **无** npm 运行时依赖、**无**打包器；勿引入 webpack/vite/React 等，除非维护者明确要求

```bash
git clone <repo>
cd OWProject
npm run hooks:install    # 每个工作副本一次：commit 时 VERSION+1
npx --yes serve .        # 或 python -m http.server 8080
```

不要双击打开 `index.html`。改 JS/CSS/HTML 后刷新即可。

```bash
npm test                 # 语法检查 + 单元/冒烟（提交前应绿；有 bun 优先 bun test，无 bun 退 node）
npm run test:unit
npm run test:syntax
npm run test:bun          # 强制 bun test（可选；入口 test/run-bun.test.mjs）
# 浏览器结果页：serve 后打开 /test/
```

Debug 自测（控制台）：`owDebug()` / `owDebug.help()`，详见 `AGENTS.md`。

---

## 2. 工作方式（红线）

本节是贡献流程的权威，适用于**所有**贡献（不限队列任务；队列文档只做补充约定）：

1. **一次一件事**  
   一个 PR / 一次提交聚焦一个目标。队列任务一次只做一个 `Txx` / `Exx`。

2. **不破坏运行效果**  
   玩家可见手感、得分、章节流程、UI 流程应与改前一致。  
   有意改行为（难度、弹幕、流程）须在说明里写清，并准备手测要点。  
   队列里标「行为修正」的项除外，但仍需手测对比。

3. **改完立刻跑测试**  
   ```bash
   npm test
   ```  
   失败则在本改动内修到通过。

4. **自动测试绿 ≠ 可合并结束**  
   涉及玩法/UI 时：维护者或作者应**手测**关键路径（开局、一章、暂停、Bomb/Miss、换面等）。  
   队列约定：绿了先标「等手测」，确认后再开下一项 / 再 push（见队列「工作方式（队列补充）」）。

5. **保持纯前端静态可托管**  
   ES modules、浏览器原生加载；不引入构建链与框架。

6. **文档与代码同步**  
   改模块路径、状态机、菜单、平衡契约、存档、测试入口时，更新 `AGENTS.md`（及本文件若流程有变）。玩家可见玩法说明以游戏内 Manual（`js/config.js` 的 `MANUAL_CHAPTERS`）为准；`README.md` 只随项目简介/运行/授权变化更新。

---

## 3. 架构硬约束（必守）

完整表见 `AGENTS.md`。贡献时最容易踩坑的：

| 约束 | 说明 |
|------|------|
| 逻辑分辨率 | `450×600`；**禁止**改 playfield `canvas.width/height` |
| 出怪/出弹 | 必须 `game.spawnEnemy` / `game.spawnBullet`（或 StageContext 等价封装），**禁止**直接 push `enemies` / `playerBullets` / `enemyBullets` |
| 数值 | 优先 `config.js` 的 `BALANCE` / `DIFFICULTIES`，忌在战斗逻辑散落魔法数 |
| 模块边界 | 弹幕公式 → `patterns` / `stages`；碰撞只吐事件 → `collision`；得分/Bomb/Miss → `gameCombat`；章流程 → `chapterFlow` |
| Stage Select | **全开放**，不加 unlock 门禁 |
| 立绘/Boss 图 | 无专用图：立绘未登记 `PORTRAIT_PATHS` 则隐藏；Boss 未登记走几何；暂借他角图必须显式登记 `PLACEHOLDER_BOSS_SPRITES` 并在注释写明借图来源，**禁止静默回落**（如默认爱丽丝脸）；补美术后移入 `DEDICATED_BOSS_BY_KIND` 并删占位项 |
| 关卡文件 | 新内容写 `js/stages/` 对应子目录；`a4_menbailiang.js` 等仅为兼容 re-export |

**状态**：`playing` | `dialogue` | `routeSelect` | `stageTransit` | `gameover`（暂停用 `paused` 标志；结局用 `endingCinematic` 标志，state 进入 `gameover`）。  
**模式**：`story` | `practice` | `stage` | `extra` | `nomiss`（Nomiss 无伤模式；入口 = Start Game 后先在模式页选普通/Nomiss）。

---

## 4. 常见贡献类型

### 调数值 / 手感

- 改 `js/config.js`（`BALANCE`、`DIFFICULTIES`）
- 说明预期手感变化；Easy～Lunatic 各扫一眼更佳

### 改某一章弹幕

- `js/stages/<面>/` + 必要时 `patterns.js`
- 道中优先 `installMidWave` / StageContext `installWave`（与现网 mid 写法一致）
- 保证 `stages/index.js` 的 `buildChapterList` 已聚合
- 章节 `dialogue` 键必须在 `dialogue.js` 的 `getDialogues` 中存在

### 改菜单 / 设置

- `index.html` + `ui.js`；设置表单 `settingsForm.js`；键位与存档 `storage.js` / `config.js` 的 `DEFAULT_*`

### 改背景

1. 版面背景主路径：`js/bg3d/scenes/<stage>.js` + `js/bg3d/kit.js`；新 mode 先在 `bgModes.js` 登记  
2. 2D 兜底：`js/bg/renderer.js` + `js/bg/scenes/*`  
3. 左侧共享舞台：`bgModes.js` → `js/backgrounds/builders.js`  

### 改美术

- 位图素材（立绘 / Boss / 背景）仅 **AVIF**；UI 占位图可用 SVG/CSS  
- 写入 `PORTRAIT_PATHS` / `DEDICATED_BOSS_BY_KIND`，并从 `PORTRAIT_HIDDEN_OK` / `PLACEHOLDER_BOSS_SPRITES` 去掉对应项  
- 无 jpg/png 位图 runtime fallback

### 补测试

- 新用例放 `test/cases-*.js`，并在 `test/cases.js` import  
- 纯逻辑优先；**不要**在 CLI 用例里强依赖 Three / 真实主循环  
- 参考 `test/cases-stages.js`（章节 id、dialogue 键、letterTime）与 `test/cases-storage-spawn.js`（spawn API / 难度缩放）

### 走改造队列

- 只改 `docs/refactor-queue.md` 里**指派给你**或维护者声明「开工 Xxx」的项  
- 一次一个任务；更新任务状态与手测要点  
- **未接到开工指令前**：可改队列文档提案，**不动**产品代码（队列文首约定）

---

## 5. 提交、版本与同步

### 提交信息

- 用完整句子说明**为什么**（中英文均可；仓库近期多为英文短句 + 中文说明）
- 聚焦本改动；勿把无关文件塞进同一 commit

### 构建号

- 启用 hooks 后，普通 `git commit` 会自动把 `js/version.js` 的 `VERSION` +1 并进**同一次**提交；`--amend` / rebase / merge / cherry-pick / revert 过程中不 +1  
- 营销版本改 `VERSION_NAME`；**不必**手改 `VERSION`  
- 跳过 hook：`git commit --no-verify`（仅在有理由时）  
- **不要**把含真实部署 hash 的 `js/git-hash.js` 提交进仓库（仓库内应保持 `DEPLOY_GIT_HASH = ''`）

### 推送约定

- **禁止** `git push` 到 `main`（见 §0）  
- 日常在功能分支上多 commit 迭代；推远程分支后开 PR  
- 涉及玩法/UI：作者先手测，再在 PR 里写手测要点；Reviewer 抽查  
- 合并前 PR 上 **`Test`**、**`E2E`**、**`CodeRabbit`** 须通过（本地可先跑 `npm test`；E2E 必过子集随每个 PR 自动跑，全量 E2E 由最终集成 PR 的 `run-e2e` 标签触发）  
- 队列任务：测绿 → 等手测 → PR 合并后再开下一项  

### PR 建议自检（作者）

- [ ] 目标分支是 **`main`**，且分支基于较新的 `main`  
- [ ] 本地 `npm test` 通过；PR 上 **`Test`**、**`E2E`**、**`CodeRabbit`** 绿
- [ ] 最终集成 PR 已加 `run-e2e` 标签（或手动 dispatch）跑过全量 E2E  
- [ ] 未改 playfield 画布逻辑尺寸  
- [ ] 出怪/出弹走 spawn API  
- [ ] 有意行为变化已写在 PR 说明里  
- [ ] `AGENTS.md` / `README.md` / `CONTRIBUTING.md` 如需已同步  
- [ ] 手测：至少开局 → 一章 → 暂停；改弹幕则打相关章  

### PR Review 要点（维护者）

- [ ] diff 是否符合「一次一件事」、无无关大扫除  
- [ ] 是否违反架构硬约束（spawn、config、不锁关、立绘策略等）  
- [ ] 是否静默改手感/得分/流程却未说明  
- [ ] 测试是否真覆盖改动面；仅「CI 绿」不够时要求补手测说明  
- [ ] 劣质/糊弄式生成代码：直接 Request changes，要求缩小范围或重写  

---

## 6. 不要做的事

- **向 `main` 直接 push 或绕过 PR 合入**  
- 为 Stage Select / 剧情进度加锁关（除非产品明确改需求）  
- 引入打包器、框架、运行时 npm 依赖「顺手现代化」  
- 静默用错误角色立绘/Boss 脸顶替缺图  
- 在 `collision.js` 里做得分、掉落、播 SFX（应返回事件由 combat 消费）  
- 把重构队列多项揉进一次大爆炸改动  

---

## 7. 提问与范围

- 架构与「该改哪个文件」：先查 `AGENTS.md` 速查表与模块职责  
- 历史重构意图与任务边界：`docs/refactor-queue.md`；文档状态与待处理项：`docs/README.md`  
- 行为以当前 `main` 上可运行为准  

感谢贡献。改之前先跑通游戏与 `npm test`，改之后保持文档诚实，比堆功能更重要。
