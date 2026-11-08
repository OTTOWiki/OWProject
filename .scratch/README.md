# .scratch — 调研产物（非运行时）

本目录是**分析产物**：不参与构建、不被 `js/` 引用、不影响运行时与测试
（`js/`、`test/` 中**没有任何**对 `~/Touhou20`、thtk 或 `th20.dat` 的引用，已核）。

放在这里是因为多份 `docs/` 文档逐条引用了这些证据。**本文件说明：哪些入库、哪些排除、以及每个外部来源怎么获得、怎么用。**

---

## 1. 依赖矩阵：实现某个方案时，还需要外部东西吗

**关键结论：所有方案的"实现"本身都不需要外部来源。** 外部来源只用于**复核/再提取**时的确定性。

| 文档 / 后续工作 | 实现是否需要 `~/Touhou20` | thtk | `th20.dat` | 说明 |
|---|---|---|---|---|
| [th20-reference-report.md](../docs/th20-reference-report.md)（总报告） | 否 | 否 | 否 | 报告已完成；证据已固化在文档行号里 |
| [th20-handling-plan.md](../docs/th20-handling-plan.md)（手感） | 否 | 否 | 否 | 若要**重新核对** TH20 侧判定/擦弹行号，才需 `~/Touhou20` |
| [items-score-progress-plan.md](../docs/items-score-progress-plan.md) | 否 | 否 | 否 | 改动全在本仓；TH20 侧只作文档引用 |
| [background-rebuild-plan.md](../docs/background-rebuild-plan.md)（背景） | **否** | 否 | 否 | STD **脚本**在 `~/Touhou20/scripts/recovered/std/`（静态文本）；STD 源码只是参考 |
| [loading-petals-plan.md](../docs/loading-petals-plan.md)（落花） | 否 | 否 | 否 | 已用 FreeGameSprites **CC0** 素材处理成无缝纹理；只有"再核对原作贴图"才需 dat+thanm |
| [stage-content-plan.md](../docs/stage-content-plan.md)（关卡） | 否 | 否 | 否 | runner 与原型表全在本仓写 |
| [stage-difficulty-model.md](../docs/stage-difficulty-model.md)（难度模型） | 需（**仅复核**） | 否 | 否 | 数字已固化在 `th20-ecl-shots.json`；重算才需 ECL 文本 |
| [content-volume-outlook.md](../docs/content-volume-outlook.md) | 否 | 否 | 否 | 内容量数字全部来自已入库的提取结果 |

**唯一"实现时会用到"的外部物**是 `.scratch/th20-extract/tex/ascii/loading@ascii@7.png`
——它**已明确排除、且不应用于产品**（原作素材），只作逆向参考。产品素材必须自绘或使用 CC0/明确可授权的素材。

---

## 2. 已入库（受版本控制）

### 2.1 事实卡（文档的直接依据，带 `文件:行号`）

| 文件 | 对应文档 |
|---|---|
| `th20-feel-factsheet.md` | [docs/th20-handling-plan.md](../docs/th20-handling-plan.md) |
| `th20-std-factsheet.md` | [docs/background-rebuild-plan.md](../docs/background-rebuild-plan.md) |
| `stages-factsheet.md` | [docs/stage-content-plan.md](../docs/stage-content-plan.md)、[docs/stage-difficulty-model.md](../docs/stage-difficulty-model.md) |
| `loading-petals-factsheet.md` | [docs/loading-petals-plan.md](../docs/loading-petals-plan.md) |

### 2.2 工具

| 文件 | 用途 | 需要的外部输入 |
|---|---|---|
| `face-capture.mjs` | 无头章节捕获（`test/mockGame.js` + 固定 seed，逐发记录弹幕） | **无**（只用本仓） |
| `face-difficulty.mjs` | 由捕获数据算每面率量与反应窗 | 无（读本地 JSON） |
| `v3.py` | **唯一**的 TH20 ECL 开火提取器（自带自检 + 分布统计） | `~/Touhou20` 的 ECL 文本 |
| `th20-bullet-radii.json` | 从 `style_data.cpp` 的 `bit_cast<float>` 解出的 50 个弹种判定半径 | —（已提取） |
| `th20-ecl-shots.json` | 278 次 `ins_601` 开火的参数与等待帧数 | —（已提取） |
| `thanm.c` / `thanm.h` / `reg.h` / `anmmap.c` | thtk 官方 `892114a0` 源码快照，用于查证 ANM 指令的**参数形状** | —（快照） |

---

## 3. 未入库（有意排除）

| 路径 | 原因 | 怎么拿回来 |
|---|---|---|
| `face-capture-7200.json` | **98MB** 捕获原始输出（仓库现有最大文件仅 468KB） | 见 §5.2 重跑 |
| `th20-extract/` | 从 `th20.dat` 解出的**东方原作素材**（`ascii.anm`、`loading@ascii@7.png`）。原作素材不随代码授权，见 [`assets/NOTICE.md`](../assets/NOTICE.md) | 见 §4.3 + §5.3 |

---

## 4. 外部来源：怎么获得

### 4.1 `~/Touhou20`（TH20 源码重建工程，**只读**参考）

- 来源：`https://github.com/Oracatt/Touhou20`（见其 `README.md`）。
- 本机路径：`~/Touhou20`。**它不在本仓库内**，也不应放进本仓库（体量 157MB，且与产品无关）。
- 只用到的子集：
  | 用途 | 相对路径 |
  |---|---|
  | ECL 关卡文本（难度模型） | `scripts/recovered/ecl/*.ecl.txt` |
  | ECL 权威计数/直方图 | `reports/ecl_json/*.json` |
  | STD 背景脚本 | `scripts/recovered/std/*.std.txt` |
  | ANM 脚本与指令语义 | `scripts/recovered/anm/*.txt`、`source_reconstruction/sprite_renderer/anm_vm.cpp` |
  | 弹种半径 | `source_reconstruction/bullet_system/style_data.cpp`、`style.hpp` |
  | 判定/擦弹/自机 | `source_reconstruction/player_entity/collision.cpp`、`stage_reset.cpp`、`initialize.cpp` |
  | 弹速/出怪/密度 | `source_reconstruction/bullet_system/`、`gameplay/` |
- **约定**：全程**只读**。每次调研后应能验证 `cd ~/Touhou20 && git status --porcelain` 为空。
- **缺失时的影响**：`v3.py` 无法重跑（但 `th20-ecl-shots.json` 已入库，数字仍可引用）；
  其余文档的证据是**已固化在文档里的行号**，不影响阅读。

### 4.2 thtk（Touhou Toolkit）

- 来源：`https://github.com/thpatch/thtk`。本仓引用的固定 commit：**`892114a0fcaa0bbdaaecf3cb4ad56f758683fb40`**
  （与 `~/Touhou20/README.md` 的「参考来源」一致）。
- 本机已装：Termux 里 `thdat` / `thanm` / `thstd` 在 `$PREFIX/bin`（`which thdat` 可验）。
- 只用到三件事：
  | 需求 | 命令 |
  |---|---|
  | 列出归档内容 | `thdat -l 20 th20.dat` |
  | 解出单个成员 | `thdat -x 20 th20.dat ascii.anm` |
  | 把 ANM 的纹理导出成 PNG | `thanm -uux20 ascii.anm`（`-uu` 忽略 x/y 偏移，`-x20` 指定 TH20 版本） |
- **重要认知**：thtk **不在二进制里内置指令名**（`thanm.c` 只输出 `ins_%d(`，名字靠外部 `-m` anmmap 文件）。
  `anmmap.c` / `thanm.h` / `reg.h` 只提供**参数形状**（如 `{407,"SSfff"}`）。
  ⇒ **指令语义必须从 `~/Touhou20` 的 `anm_vm.cpp` 读**，这是我们在"落花"上踩过的坑。
- 许可：thtk 为 MIT 类（见 `thanm.c` 头部声明）；快照仅用于查证，不参与产品构建。

### 4.3 `th20.dat`（原版游戏资源归档）

- 来源：原版《東方錦上京》游戏目录内（**用户自行提供**；本仓库与公开渠道都不应分发它）。
- 本机路径示例：`/data/user/0/com.termux/files/home/th20.dat`。
- **校验**：期望 SHA-256 = `9db8d7c43fbacec95614163d4c3e1d254e82169f8550177ee849831130590494`
  （与 `~/Touhou20/reports/assets_recovery.md:37` 记录一致）。
  ```bash
  sha256sum /path/to/th20.dat
  ```
- **注意**：`plNN.sht`（自机速度）**不在** `th20.dat` 里，它是独立资源 ⇒ 即使有 dat 也拿不到自机速度
  （这是难度模型的最大缺口，见 [stage-difficulty-model.md](../docs/stage-difficulty-model.md) §8.2）。

---

## 5. 外部来源：怎么用

### 5.1 前置检查

```bash
# 参考仓库存在且干净（只读约定）
cd ~/Touhou20 && git status --porcelain && echo "干净"

# thtk 可用
which thdat thanm

# dat 校验（如要重新提取素材）
sha256sum /path/to/th20.dat   # 期望 9db8d7c4…0494
```

### 5.2 重跑"每面难度/体量"（本作 + TH20）

```bash
cd <本仓根>

# ① 本作：无头捕获（默认 7200 帧/章；输出约 98MB，已被 .gitignore 排除）
node .scratch/face-capture.mjs > .scratch/face-capture-7200.json

# ② 本作：由捕获算每面率量与反应窗
node .scratch/face-difficulty.mjs

# ③ TH20：ECL 开火提取（自带自检：开火数须等于原文 ins_601( 计数）
python3 .scratch/v3.py
# 换机器/换路径时传参：
python3 .scratch/v3.py --ecl ~/Touhou20/scripts/recovered/ecl --out .scratch/th20-ecl-shots.json
```
**自检必须通过**（`自检 n601 == raw601: 通过`，278/278）。若失败说明解析退化，**不要引用其结果**。

### 5.3 重新提取原作加载素材（仅作逆向参考，**不得进 `assets/`**）

```bash
mkdir -p .scratch/th20-extract && cd .scratch/th20-extract
thdat -x 20 /path/to/th20.dat ascii.anm      # → ascii.anm（232,979 字节）
mkdir -p tex && cd tex
thanm -uux20 ../ascii.anm                    # → ascii/loading@ascii@7.png（256×256）
```
产物落在 `.scratch/th20-extract/`（**已被 `.gitignore` 排除**）。

---

## 6. 失败与降级（缺什么会怎样）

| 缺失 | 影响 | 降级 |
|---|---|---|
| `~/Touhou20` | `v3.py` 无法重跑 | 已入库的 `th20-ecl-shots.json` 仍可引用；文档行号仍可读 |
| 98MB 捕获未重跑 | `face-difficulty.mjs` 无法算 | 文档中的数字已固化；重跑 ①（约 3 分钟）即可 |
| thtk | 无法再解 `th20.dat` | 落花方案已走 CC0 素材处理路径，不需要 thtk |
| `th20.dat` | 无法再解原作素材 | 同上；`.scratch/th20-extract/` 已在本地留存 |
| `plNN.sht` | **任何来源都拿不到** TH20 自机速度 | 已在文档 §8.2 标记为"不可比"，不要试图补 |

---

## 7. 引用这些数字时的纪律（避免误用）

1. **只在自检通过时引用** `v3.py` 的输出。
2. **本作的"弹/秒"是沙盒峰值**，不是实际游玩密度；**"每面总弹数"不是内容属性**（随观测时长线性增长）。
3. **TH20 的静态计数不等于单次游玩**（含全部难度与全部子程序的求和）。
4. **thtk 给的是参数形状，不是语义**；语义必须来自 `~/Touhou20` 的实现。
5. **`th20.dat` 与原作素材不得进入 `assets/`**，也不得用于产品（见 [`assets/NOTICE.md`](../assets/NOTICE.md)）。
