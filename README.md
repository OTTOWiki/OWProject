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

移动端：版面内相对滑动移动，按住自动射击；右侧 Item / Bomb 虚拟键。

## 内容范围

- 主菜单：Start Game / Extra Start / Stage Select / Manual / History / Settings / Practice / Exit  
  （键位在 **Settings** 内，非独立顶栏项）
- 自机：饮泉思源 / 誓约沙玛（机制相同，剧情对应）
- 前三面 + 中立拦截 + A/B 线 4–6 面 + EX + 双结局
- **Stage Select 全开放**（不锁关；进度可写入 localStorage，仅作记录）
- 章节 Perfect、擦弹编辑度、决死 Bomb、Unstable Machine、阵营倾向
- 左侧 Three.js 关卡印象；BGM 为 **OGG**（`assets/bgm/*.ogg`）
- 高分 / 键位 / 设置 localStorage 存档
- History 依赖 Cloudflare Pages Functions（`functions/api/`），本地纯静态可能不可用

## 目录

```
CONTRIBUTING.md   # 贡献指南
AGENTS.md         # 架构与开发约定
index.html / css/style.css
js/               # 游戏逻辑
test/             # 零依赖自动化测试（npm test）
assets/           # 贴图（AVIF）+ OGG
tools/ docs/ functions/api/
参考/             # 过时设计稿（非权威）
```

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
