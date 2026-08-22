# OTTOWiki Project

基于 HTML5 Canvas 的东方风格弹幕 H5 小游戏（纯前端）。

> **参与开发**请先读 [`CONTRIBUTING.md`](./CONTRIBUTING.md)（流程与红线）。  
> **禁止直推 `main`**，请走功能分支 + Pull Request。  
> 架构与 Agent 约定：[`AGENTS.md`](./AGENTS.md)。改造队列：[`docs/refactor-queue.md`](./docs/refactor-queue.md)。

## 运行方式

需要通过本地 HTTP 服务打开（ES Module + Three.js CDN），不要直接双击 `index.html`。

```bash
npx --yes serve .
# 或
python -m http.server 8080
```

浏览器访问提示的地址即可。

## 操作

| 键 | 功能 |
|----|------|
| 方向键 / WASD | 移动 |
| Shift | 低速（显示判定点） |
| Z（可改） | 射击 |
| X（可改） | Bomb |
| C（可改） | 编辑战（满编辑度消半径 50 弹） |
| Esc | 暂停 |

移动端：版面内相对滑动移动（自机移动比手指略快），按住自动射击；Item / Bomb 虚拟键横屏在右侧、竖屏在版面下方的 HUD 横条内。

## 内容范围

- 主菜单：Start Game / Extra Start / Stage Select / Manual / History / Ranking / Replay / Settings / Practice / Exit  
  （键位在 **Settings** 内，非独立顶栏项）
- 自机：饮泉思源 / 誓约沙玛（机制相同，剧情对应）
- 前三面 + 中立拦截 + A/B 线 4–6 面 + EX + 双结局
- **Stage Select 全开放**（不锁关；进度可写入 localStorage，仅作记录）
- 章节 Perfect、擦弹编辑度、决死 Bomb、Unstable Machine、阵营倾向
- **Nomiss 无伤模式**：Start Game → 选难度 → **自机选择页勾选「Nomiss 无伤模式」**进入；被弹自动重开当前章（不扣残机、不 Game Over、资源回滚至进章状态、BGM 回带、Unstable 还原）；进度持久化可续章；仅暂停手动结算或通关结局结算；不录制、不入榜
- Letter 卡收取记录（成功收取 / 总尝试 = 收率%，实战与练习共用一份持久记录）
- 击破连击 Combo、续关（续关后分数清零）、结算统计、练习各章最佳记录
- 左侧 Three.js 关卡印象；BGM 为 **OGG**（`assets/bgm/*.ogg`，东方 Project 原作音乐，见 `assets/NOTICE.md`）
- 高分 / 键位 / 设置 / 排行榜 localStorage 存档；录像帧数据存 IndexedDB
- History 依赖 Cloudflare Pages Functions（`functions/api/`），本地纯静态可能不可用

## 排行榜与录像

- **排行榜**（Ranking）：按难度分榜（Easy / Normal / Hard / Lunatic / Extra 各 top 10）。故事 / 选关 / Extra 对局结束后若进入前 10，会先弹出**成绩排行屏**（显示排行榜与本局名次、可编辑 3 字机签），点「保存」记入排行榜、「取消」直接跳过；练习 / Nomiss 不入榜。
- **录像**（Replay）：对局中随时在**暂停菜单**点「保存录像」存下「到当前为止」的部分录像；对局结束后的**结算界面**可「保存整局录像」。不限模式（含练习，**Nomiss 除外**——无伤模式全程不录制）。录像可 1:1 精确回放（含掉帧/追赶）。
- **Replay 屏**：↑↓ 选择 · Z/Enter 播放 · Del 删除 · Esc 返回。每条录像右侧有「删除 / 导出」按钮（删除需二次确认）；底部「导入」可读入导出的 JSON 录像文件。回放中 Esc 退出、R 重开、F/Shift 快进。
- 排行榜与录像**相互独立、互不引用**。

## 目录

```
LICENSE            # GPL-3.0-or-later（代码）
CONTRIBUTING.md    # 贡献指南
AGENTS.md          # 架构与开发约定
index.html / css/style.css
js/               # 游戏逻辑
test/             # 零依赖自动化测试（npm test）
assets/           # 贴图（AVIF）+ OGG；NOTICE.md = 素材授权说明
tools/ docs/ functions/api/
参考/             # 过时设计稿（非权威）
```

## 授权与素材

- 代码：**GPL-3.0-or-later**，全文见 `LICENSE`。
- BGM：东方 Project **原作游戏音乐**，著作权归上海爱丽丝幻乐团（上海アリス幻樂団 / Team Shanghai Alice）。本项目作为二次创作使用，详见 `assets/NOTICE.md`（含官方指南中「原作游戏素材」的相关提示）。
- 立绘 / 背景：AI 生成的东方 Project **同人创作素材**，不随代码 GPL 授权；详见 `assets/NOTICE.md`。
- 本作是基于东方 Project 的 fan work，遵循官方《東方Projectの二次創作ガイドライン》（https://touhou-project.news/guideline/ ，2024-05-31 更新）。

## 平衡与开发

- 数值：`js/config.js` 的 `BALANCE` / `DIFFICULTIES`（倾向阈值 `tendencyThreshold` 等以代码为准）
- 架构、约定、发版：见 **`AGENTS.md`**
- 规格冲突：以可运行代码与 `AGENTS.md` 为准

### 首次克隆（推荐）

```bash
npm run hooks:install
```

之后每次 `git commit` 会自动把 `js/version.js` 的构建号 `VERSION` +1（同一次提交）。  
跳过：`git commit --no-verify`。营销版本名改 `VERSION_NAME` 即可。

部署短哈希由 Cloudflare Pages 的 `npm run pages:build` 注入，不进仓库。详见 `AGENTS.md`。
