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

- 主菜单：Start / Stage Select / Manual / Key Config / Practice / Exit
- 自机：饮泉思源 / 誓约沙玛（机制相同，剧情对应）
- 前三面 22 章 + 中立拦截 + A/B 线 4–6 面 + 双结局
- 章节 Perfect ×1.05、擦弹编辑度、决死 Bomb、Unstable Machine、阵营倾向
- 左侧 Three.js 关卡印象、Web Audio 程序化 BGM（无音频文件）
- 高分 / 键位 localStorage 存档

## 目录

```
index.html
css/style.css
js/
  main.js config.js storage.js input.js
  entities.js patterns.js stages.js dialogue.js
  game.js ui.js audio.js backgrounds.js
需求.txt
```

## 平衡数值

见 `js/config.js` 中 `BALANCE`，可自行调整血量倍率、弹速、时限等。
