# OTTOWiki Project

基于 HTML5 Canvas 的东方风弹幕 STG（纯前端，无打包步骤）。

> **开发 / 贡献**：流程与红线见 [`CONTRIBUTING.md`](./CONTRIBUTING.md)，架构与 Agent 约定见 [`AGENTS.md`](./AGENTS.md)，文档与任务状态索引见 [`docs/README.md`](./docs/README.md)。  
> **禁止直推 `main`**：一律功能分支 + Pull Request。

## 运行

需要通过本地 HTTP 服务打开（ES Module + Three.js CDN），不要直接双击 `index.html`。

```bash
npx --yes serve .
# 或
python -m http.server 8080
```

浏览器访问提示的地址即可。

## 玩法

操作、移动端触控、难度分级与系统机制均以**游戏内 Manual** 为准（键位可在 Settings 自定义）。

## 授权与素材

- 代码：**GPL-3.0-or-later**，全文见 [`LICENSE`](./LICENSE)。
- BGM：东方 Project **原作游戏音乐**，著作权归上海爱丽丝幻乐团（上海アリス幻樂団 / Team Shanghai Alice）；作为二次创作使用，详见 [`assets/NOTICE.md`](./assets/NOTICE.md)。
- 立绘 / 背景：立绘、战斗外围印刷底材等为 AI 生成的同人素材；菜单 / 设置 / 倾向条底材与关卡背景 plate / backdrop / 材质为公有领域 / CC0 博物馆开放素材裁切与调色。素材不随代码 GPL 授权，逐项来源见 [`assets/NOTICE.md`](./assets/NOTICE.md)。
- 本作是基于东方 Project 的 fan work，遵循官方《東方Projectの二次創作ガイドライン》（https://touhou-project.news/guideline/ ，2024-05-31 更新）。
