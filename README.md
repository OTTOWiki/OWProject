# OTTOWiki Project

基于 HTML5 Canvas 的东方风格弹幕 H5 小游戏（纯前端）。

## 运行方式

需要通过本地 HTTP 服务打开（ES Module + Three.js CDN），不要直接双击 `index.html`。

```bash
# 任意静态服务器，例如：
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
| X（可改） | Bomb（全屏消弹） |
| C（可改） | 编辑战（满编辑度消半径 50 弹） |
| Esc | 暂停 |

移动端：版面内相对滑动移动，按住自动射击；右侧 Item / Bomb 虚拟键。

## 内容范围

- 主菜单：Start / Stage Select / Manual / Key Config / Practice / History / Exit
- 自机：饮泉思源 / 誓约沙玛（机制相同，剧情对应）
- 前三面 + 中立拦截 + A/B 线 4–6 面 + EX + 双结局
- **Stage Select 全开放**（不锁关；进度仍可能写入 localStorage，仅作记录）
- 章节 Perfect ×1.05、擦弹编辑度、决死 Bomb、Unstable Machine、阵营倾向
- 左侧 Three.js 关卡印象；BGM 为 **MIDI JSON + Web Audio 合成**（`assets/midi/*.json`）
- 高分 / 键位 / 设置 localStorage 存档
- History 版本列表依赖 Cloudflare Pages Functions（`functions/api/`），本地纯静态时可能不可用

## 目录

```
index.html
css/style.css
js/
  main.js config.js game.js collision.js entities.js patterns.js
  stages/          # 各面章节（index.js 聚合）
  ui.js audio.js backgrounds.js storage.js ...
test/              # 零依赖自动化测试
assets/            # 贴图 + midi JSON
tools/             # MIDI 解析脚本
functions/api/     # Cloudflare Functions
参考/              # 源 MIDI 与过时设计稿
  需求.txt         # 早期草稿（已过时，仅供参考）
```

## 平衡数值

见 `js/config.js` 中 `BALANCE` / `DIFFICULTIES`。例如 A/B 倾向阈值 `tendencyThreshold`（当前 70）以代码为准。

## 开发说明

更完整的架构与约定见 **`AGENTS.md`**。规格冲突时以可运行代码与 `AGENTS.md` 为准；`参考/需求.txt` 不要当作权威文档。

### 首次克隆后（推荐）

```bash
npm run hooks:install
```

这会设置 `git config core.hooksPath .githooks`，之后每次 **`git commit` 会自动把 `js/version.js` 的构建号 `VERSION` +1**（写进**同一次**提交，不另开 commit）。

| | |
|--|--|
| 跳过本次 | `git commit --no-verify` |
| 新电脑 / 新克隆 | 再执行一次 `npm run hooks:install`（hooks 路径是本机 git 配置，不会随 clone 自动生效） |
| 营销版本名 | 改 `VERSION_NAME`（如 `0.4.1` → 界面 `v0.4.1`）；**不必**手改 `VERSION` |

部署短哈希由 Cloudflare Pages 构建命令 `npm run pages:build` 注入，不进仓库。详见 `AGENTS.md`「版本号与发版流程」。
