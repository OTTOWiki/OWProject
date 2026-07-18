# AGENTS.md — OWProject

东方风弹幕 STG（纯前端 H5）。OTTOWiki / 维基梗二次创作；逻辑坐标系固定 **450×600**。

## 运行

必须通过本地 HTTP 服务打开（ES Module + Three.js CDN），不要双击 `index.html`。

```bash
npx --yes serve .
# 或
python -m http.server 8080
```

无构建步骤、无 npm 依赖包。改 JS/CSS/HTML 后刷新浏览器即可。

### Debug 模式（自测）

浏览器控制台：

```js
owDebug()                 // 开启并打开面板
owDebug(false)            // 关闭
owDebug.help()            // 完整命令
owDebug.set({ invincible: true, lockLives: true, lockBombs: true, timeScale: 3, skipDialogue: true })
owDebug.softJump(129)     // 软跳章节 id（保留分数资源）
owDebug.kill()            // 清敌+清弹+本章成功
```

- 面板：锁残 / 锁 B / 不受伤 / Edit 常满 / 跳过对话 / 整体加速 / 跳章 / 清弹清敌等
- 热键：`F8` 开关面板（首次也可开启）、`F9` 循环加速
- 实现：`js/debug.js`（不写 localStorage，刷新即关）

### 自动化测试（零依赖）

```bash
# 推荐（Node CLI）
npm test
# 或
node test/run-node.mjs

# 浏览器结果页
npx --yes serve .
# 打开 http://localhost:3000/test/  （端口以 serve 输出为准）
```

- 入口：`test/run-node.mjs`（CLI）/ `test/index.html` → `run.js` + `cases.js`（聚合）
- 分文件：`cases-config|patterns|collision|stages|storage-spawn|smoke.js` + `mockGame.js`
- 覆盖：配置/难度、章节表与 onClear、对话键、bg mode、`scaleBulletCount`、碰撞、spawnScale、startMode
- **冒烟（mock Game）**：全章 `build` 不抛错；boss 有 bossRef；mid `waveFn` 固定步长 tick
- **不**启动真实 Game 主循环 / Canvas / Three / WebAudio
- 浏览器结果：`window.__TEST_RESULT__`
- **CI**：GitHub Actions `.github/workflows/test.yml` — `push`/`pull_request` 到 `main` 时跑 `npm test`

## 目录结构

```
index.html          # 三栏 UI 壳 + 屏幕切换
test/               # 零依赖自动化测试（assert + cases + 结果页）
css/style.css       # 布局与东方风菜单样式
js/
  main.js           # 入口：组装 Input / Audio / Background / Game / UI
  version.js        # 应用版本号 VERSION（与 git tag 对齐）
  config.js         # 逻辑分辨率、BALANCE、难度、角色色、Unstable 池、说明书
  game.js           # 主循环、状态机、章节推进、得分、A/B 线
  gameDraw.js       # 版面绘制（从 game 抽出；FPS/倾向条/过渡页/主 draw）
  collision.js      # 碰撞与网格粗筛
  patterns.js       # 奇数/偶数狙、环弹、激光、自机射击、消弹
  entities.js       # Player / Enemy / Bullet / Item / Particle + 绘制
  stages/           # 章节表（index.js 聚合）+ 各面 build
  dialogue.js       # 剧情对话与结局文本
  ui.js             # 菜单编排：难度/自机/关卡/练习/设置（含键位）
  menuNav.js        # 菜单键盘导航：键位判定 + 列表/网格/表单通用处理
  historyScreen.js  # History 构建列表：加载/渲染/焦点/键盘
  historyVersions.js # /api/versions 客户端拉取
  input.js          # 键盘 + 触屏相对滑动 + 虚拟键
  audio.js          # Web Audio：MIDI JSON 合成 BGM + SFX
  backgrounds.js    # 左侧 Three.js 关卡印象
  playfieldBg.js    # 版面伪 3D / 贴图背景
  sprites.js        # 角色/敌人贴图绘制
  assets.js         # 立绘与标题图预加载
  storage.js        # localStorage（键位、高分、进度记录、设置）
functions/api/      # Cloudflare Pages Functions（History 版本列表等）
assets/
  bg/ portraits/ sprites/ ui/   # 图片资源
  midi/*.json                   # 解析后的 MIDI 音符数据（运行时使用）
tools/
  parse_midi.py / parse_all_midis.py   # 将 参考/*.mid → assets/midi/*.json
参考/               # 源 MIDI + 过时设计稿等（不直接在运行时加载）
  需求.txt          # 早期产品/关卡草稿（已过时，仅供参考，非权威）
```

## 架构要点

### 坐标系（硬约束）

- 逻辑分辨率：`LOGICAL_W=450`, `LOGICAL_H=600`（`config.js`）
- HTML：`<canvas id="playfield" width="450" height="600">` 固定，**禁止**在 JS 里改 `canvas.width/height`
- 坐标、半径、速度、碰撞全部基于逻辑坐标系
- 触屏坐标：`client * (canvas.width / rect.width)` 映射到逻辑坐标

### 模块职责

| 模块 | 做什么 | 别在这里做 |
|------|--------|------------|
| `config.js` | 数值、难度倍率、文案常量 | 游戏逻辑 |
| `game.js` | 状态、更新/渲染循环、章节切换 | 具体弹幕公式（应放 patterns/stages） |
| `collision.js` | 自机弹/敌弹碰撞 | 章节编排 |
| `stages/*` | 章节定义 + 刷怪时间轴（`stages/index.js` 聚合） | 全局状态机 |
| `patterns.js` | 弹幕生成工具函数 | UI / 存档 |
| `entities.js` | 实体数据与 Canvas 绘制 | 章节编排 |
| `spawnScale.js` | 敌机/敌弹难度缩放纯函数 | 关卡编排 |

关卡与 `patterns` 出怪/出弹须走 **`game.spawnEnemy` / `game.spawnBullet`**（难度缩放与刷怪记账），勿直接 `enemies.push` / `bullets.push`。
| `ui.js` | 菜单与屏幕切换 | 碰撞/得分 |
| `audio.js` | BGM/SFX | 关卡内容 |

### 游戏状态（`Game.state`）

`playing` | `dialogue` | `routeSelect` | `gameover` | `ending` |（暂停用 `paused` 标志）

模式：`story` | `practice` | `stage`（单关/练习相关）

### 章节流

1. 前三面：章节 id **1–22**（各面多段道中 + midboss + Boss Letter）
2. 3 面结算：|A/B 倾向| ≥ `BALANCE.tendencyThreshold`（当前 **70**）进对应线；否则 **巡查姬 23–24** 拦截
3. 拦截胜利 → `routeSelect` 手选 A/B
4. A 线（门百梁 → 主角冲突 → 一美个）→ 结局 A；B 线（赌人时尚 → 棍电噢哆 → 拉斯特神炫）→ 结局 B；另有 EX
5. 每面为多 mid + midboss + 多 Letter 的章节串；具体 id 以 `js/stages/*.js` 为准

章节对象字段（`js/stages/*`）：`id, name, stage, stageKey, kind, music, bg, duration?, unstable?, dialogue?, letter?, letterTime?, build(g)`

- `kind`: `mid` | `midboss` | `boss`
- `build(g)` 向 `game` 注册敌人/刷怪逻辑
- 难度通过敌人上的 `_fireMul` 等与 `DIFFICULTIES` 倍率注入
- `duration`：纯道中存活保底成功；若章内有 `bossRef`（midboss 等）则到时未击破为失败
- `letterTime`：Letter 限时，超时失败（不发 Perfect/NMNB）

### 核心机制（实现位置）

- **章节 Perfect ×1.05**：成功通关且章内无 Miss/Bomb → `BALANCE.chapterPerfectMul`（超时失败不发）
- **擦弹编辑度**：判定附近 graze → `edit` 槽；满 100 按 Item → 半径 50 消弹变分
- **决死 Bomb**：被弹后 `deathBombWindow`（难度相关）内按 Bomb 免死全清
- **Unstable Machine**：道中 `unstable: true` 章节从 `UNSTABLE_POOL` 抽效果
- **A/B 倾向**：自机在左/右半场累计；阈值见 `BALANCE.tendencyThreshold`
- **默认资源**：2 残 3B（难度可覆盖）
- **Stage Select**：**不锁关**；1–3 / 巡查 / A4–A6 / B4–B6 / EX 均可直接选

### 自机

- `yinquan` 饮泉思源（蓝白）、`shama` 誓约沙玛（粉红）
- 机制相同：主弹 + 侧方追踪子机；剧情/5 面对手随自机切换

### 难度

`easy` / `normal` / `hard` / `lunatic` — 见 `DIFFICULTIES`：`enemyHp`, `bulletSpeed`, `fireInterval`, `spawnMul`, 初始残 B、决死窗、得分倍率等。

中文昵称：这么菜啊 / 白银 / S6第一个王者 / 职业选手。

### 音频

- 运行时读 `assets/midi/*.json`（非 wav/mp3），用 Web Audio 合成
- 映射：`MUSIC_FILE_MAP` / `trackForStage(stageId, isBoss)` in `audio.js`
- 新增曲目：源 mid 放 `参考/` → `tools/parse_all_midis.py` → 更新 `manifest.json` 与 `MUSIC_FILE_MAP`

### 视觉

- 左侧：Three.js `StageBackground`（`backgrounds.js`），模式 id 与章节 `bg` 对应（如 `s1_mid`, `a6_boss`）
- 中间：Canvas 版面 + 可选 `PlayfieldBackground` 贴图
- 右侧：分数板 + 触屏 Item/Bomb
- 立绘/精灵在 `assets/`，由 `assets.js` / `sprites.js` 加载；需求原文曾要求纯几何，**当前代码已支持贴图+几何混用**

### 存档（localStorage）

| Key | 内容 |
|-----|------|
| `gunwei_keys` | Shot/Bomb/Item 键位 |
| `gunwei_hiscore` | 高分 |
| `gunwei_unlocked` | 进度记录（通关推进时写入 stage/route）；**Stage Select 不读取、不门禁** |
| `gunwei_difficulty` | 上次难度 |
| `gunwei_settings` | 音量、子弹不透明度、单击发射等 |

## 版本号与发版流程

### 约定

- **单一源**：`js/version.js` 中的 `VERSION`（如 `'0.1.0'`）
- **显示**：`VERSION_LABEL` = `v` + `VERSION`（如 `v0.1.0`），写在主菜单与暂停界面右下角（`[data-app-version]`）
- **Git tag**：必须与显示一致，格式 **`vX.Y.Z`**（SemVer，带 `v` 前缀）
- **范围**：从 `v0.1.0` 起；小改补丁 `Z+1`，功能增量 `Y+1`，不兼容大改 `X+1`（预发布阶段以 `0.y.z` 为主即可）

### 发版步骤（每次发布都按此执行）

1. **确认可发布**：本地可运行、关键改动已提交到目标分支（通常 `main`）。
2. **改版本号**：编辑 `js/version.js`：
   ```js
   export const VERSION = '0.1.1'; // 示例：升补丁
   ```
   不要只改 HTML 里的占位文字；运行时由 `applyVersionToDom()` 覆盖。
3. **提交**：
   ```bash
   git add js/version.js
   # 若本次还有功能/修复，一并加入
   git commit -m "Release v0.1.1"
   ```
4. **打 tag**（annotated，推荐）：
   ```bash
   git tag -a v0.1.1 -m "OWProject v0.1.1"
   ```
   - tag 名必须等于 `v` + `VERSION`
   - 勿在脏工作区乱打 tag；应指向上述 release commit
5. **同步远程**：
   ```bash
   git push origin main
   git push origin v0.1.1
   # 或一次性：git push origin main --tags
   ```
6. **自检**：打开主菜单 / 暂停界面右下角应为 `v0.1.1`；`git describe --tags` 应能指到该 tag。

### 注意

- **不要**在未改 `version.js` 的情况下只推 tag（界面版本会与 tag 不一致）。
- **不要**移动/复用已推送的历史 tag（需要改版请升版本号新打 tag）。
- 热修同一 commit 极少需要 force-move tag；优先新补丁号。

## 改代码约定

1. **平衡数值**优先改 `js/config.js` 的 `BALANCE` / `DIFFICULTIES`，不要在 `game.js` 里散落魔法数。
2. **新章节/弹幕**：在 `js/stages/` 对应面文件增加章节，并确保 `stages/index.js` 的 `buildChapterList` 已聚合；复用 `patterns.js` 的 `spawnAimed` / `oddAim` / `evenAim` / `spawnRingAt` 等。
3. **新对话**：`dialogue.js` 的 `getDialogues(playerId)`；说话人颜色在 `SPEAKER_COLORS`。
4. **新背景模式**：`backgrounds.js` 的 `setMode` / `bgModeFor`，必要时补 `assets/bg/` 贴图。
5. **保持 ES modules**：`import`/`export`，无打包器；浏览器原生加载。
6. **语言**：UI/剧情以中文为主；代码标识符英文；注释可用中文。
7. **规格冲突时**：以当前可运行代码与本文件为准。`参考/需求.txt` 是早期草稿、**已过时、仅供参考**，不要当作权威规格去“对齐”实现。
8. **不要**引入构建工具/框架，除非用户明确要求；保持单页静态可托管。
9. **不要**在运行时修改 playfield 的 `width`/`height` 属性。
10. 大文件：`game.js`、`entities.js`、各 `stages/*` 已较大——新增内容优先按现有模式扩展，避免无关大重构。
11. **Stage Select 保持全开放**；不要为关卡按钮加 unlock 门禁，除非产品明确改需求。

## 弹种（`entities.js` / `patterns.js`）

大致类型：`dot` / `rice` / `talisman` / `medium` / `large` / 激光等。绘制半径与判定半径分离；改弹种时两处一起查。

## 操作（默认）

| 输入 | 功能 |
|------|------|
| 方向 / WASD | 移动 |
| Shift | 低速 + 判定点 |
| Z / X / C | Shot / Bomb / Item（可改） |
| Esc | 暂停 |
| 触屏版面滑动 | 相对移动 + 按住自动射击 |

## 规格来源

- **权威**：当前可运行代码（`js/` 等）+ 本 `AGENTS.md`
- 玩家向说明：`README.md`、`config.js` 的 `MANUAL_TEXT`
- **仅供参考（过时）**：`参考/需求.txt`（早期设计稿，数值/章节表/流程可能与现网不符；查意图时可翻，冲突时以代码为准）

## 常见任务速查

| 任务 | 主要文件 |
|------|----------|
| 调难度/手感 | `config.js` |
| 改某一章弹幕 | `js/stages/*` + `patterns.js` |
| 改碰撞/Bomb/擦弹 | `collision.js` / `game.js` |
| 改菜单流程 | `ui.js` + `index.html` |
| 改设置/键位 | `ui.js` + `storage.js` + `config.js` |
| 改 BGM 映射 | `audio.js` + `assets/midi/` |
| 改左侧 3D 场景 | `backgrounds.js` |
| 改立绘/精灵 | `assets.js`, `sprites.js`, `assets/` |
| 重新解析 MIDI | `tools/parse_all_midis.py` |
| 发版 / 升版本号 | `js/version.js` + git tag `vX.Y.Z`（见上文） |
| 跑自动化测试 | 本地 HTTP 打开 `/test/`（见上文） |
