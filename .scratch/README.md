# .scratch — 调研产物（非运行时）

本目录是**分析产物**，不参与构建、不被 `js/` 引用。放在这里是因为多份 `docs/` 文档逐条引用了这些证据。

## 已入库（受版本控制）

### 事实卡（文档的直接依据，含 `文件:行号`）

| 文件 | 对应文档 |
|---|---|
| `th20-feel-factsheet.md` | [docs/th20-handling-plan.md](../docs/th20-handling-plan.md) |
| `th20-std-factsheet.md` | [docs/background-rebuild-plan.md](../docs/background-rebuild-plan.md) |
| `stages-factsheet.md` | [docs/stage-content-plan.md](../docs/stage-content-plan.md)、[docs/stage-difficulty-model.md](../docs/stage-difficulty-model.md) |
| `loading-petals-factsheet.md` | [docs/loading-petals-plan.md](../docs/loading-petals-plan.md) |

### 工具

| 文件 | 用途 |
|---|---|
| `face-capture.mjs` | 无头章节捕获（`test/mockGame.js` + 固定 seed，逐发记录弹幕） |
| `face-difficulty.mjs` | 由捕获数据算每面率量与反应窗 |
| `th20-extract-v2.py` | TH20 ECL 开火提取（**自带自检**：开火数须等于原文 `ins_601(` 计数） |
| `v3.py` | 同上，含逐文件打点，用于定位解析问题 |
| `thanm.c` / `thanm.h` / `reg.h` / `anmmap.c` | thtk 官方仓库 `892114a0` 源码快照，用于查证 ANM 指令的**参数形状**（thtk 用 MIT 类许可，见其头部声明） |

### 提取结果（小体积、被文档直接引用）

| 文件 | 内容 |
|---|---|
| `th20-bullet-radii.json` | 从 `style_data.cpp` 的 `bit_cast<float>` 解出的 **50 个弹种判定半径** |
| `th20-ecl-shots.json` | 278 次 `ins_601` 开火的参数与等待帧数 |

## 未入库（有意排除）

| 路径 | 原因 |
|---|---|
| `face-capture-7200.json` | **98MB** 沙盒捕获原始输出（仓库现有最大文件仅 468KB）。**可重跑再生**，命令见 [docs/stage-difficulty-model.md](../docs/stage-difficulty-model.md) §7 |
| `th20-extract/` | 从 `th20.dat` 解出的**东方原作素材**（`ascii.anm` 与 `loading@ascii@7.png` 等）。原作素材不随代码授权（见 [`assets/NOTICE.md`](../assets/NOTICE.md)），**仅作只读逆向参考，不入库** |

## 重跑前提

- `face-capture.mjs` 需要仓库内的 `test/mockGame.js`（已入库）。
- `th20-extract-v2.py` / `v3.py` 需要 `~/Touhou20`（外部参考仓库）存在且只读。
- `th20-extract/` 的再生需要 `th20.dat` 与 Termux 的 `thdat` / `thanm`。
