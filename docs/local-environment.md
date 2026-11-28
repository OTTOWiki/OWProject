# 本地环境与外部调研来源（⚠️ 仅本机可复现）

> **状态：⚠️ 仅本地（2026-11-28 整理）** — 本文记录依赖提交者本机或外部非公开资源的操作前置、证据目录与调研来源；**不属于项目规格，也不能从干净 clone 复现**。`docs/` 之外的文档不提供这类信息；`docs/` 内归档/证据文档保留的同类信息一律标 ⚠️，可复用的前置统一收在本文。
> 文档信息红线：除 `docs/` 外，文档不得提供仅依赖提交者本机才能成立的信息；`docs/` 内出现本机路径/外部来源时必须标 ⚠️。

## 1. GitHub 鉴权与 MCP

- 鉴权：本机环境变量 `OTTOWIKI_GITHUB_PAT`（不在仓库内）。
- 本机 GitHub MCP 已配置 token 时无需再配。
- 仓库 ruleset / required checks（`protect-main`）属 GitHub 项目外部设置，仓库内只有约定文本。

## 2. 截图评审：参考图与本地证据（⚠️）

- 原作参考图：本地工作区 `.worktrees/hud06/参考/参考截图/`（gitignored，可能已清理）。若存在，从当前 worktree 用 `../hud06/参考/参考截图/` 定位；战斗优先 `th14 游戏界面.png`；暂停/主界面分别用 `th18暂停界面.png`、`th18主界面.png`。
- 最终截图与对比报告放 `.local-evidence/`（gitignored，不属于运行时产物），用户看过后再清理；工作副本只放 `.worktrees/`。
- 交付时提供已验证的 active preview URL 与入口路由。
- TH20 原始资源解包只保留在 `.local-evidence/th20-original/`，产品图用独立参数绘制，不复制原像素。
- 视觉验收中的本机 WebView / 实机数字（见 [`ponytail-audit-2026-11-28.md`](./ponytail-audit-2026-11-28.md)）只代表该设备。

## 3. TH20 调研环境（⚠️ 原 `.scratch/README.md` 内容）

本目录的分析产物只用于复核；**所有方案的实现本身都不需要外部来源**。

### 3.1 依赖矩阵

| 文档 / 后续工作 | 实现是否需要 `~/Touhou20` | thtk | `th20.dat` | 说明 |
|---|---|---|---|---|
| [th20-reference-report.md](./archive/th20-reference-report.md)（总报告） | 否 | 否 | 否 | 报告已完成；证据已固化在文档行号里 |
| [th20-handling-plan.md](./archive/th20-handling-plan.md)（手感） | 否 | 否 | 否 | 重新核对 TH20 判定/擦弹行号时才需 `~/Touhou20` |
| [items-score-progress-plan.md](./archive/items-score-progress-plan.md) | 否 | 否 | 否 | 改动全在本仓；TH20 侧只作文档引用 |
| [background-rebuild-plan.md](./archive/background-rebuild-plan.md)（背景） | 否 | 否 | 否 | STD 脚本在 `~/Touhou20/scripts/recovered/std/`（静态文本） |
| [loading-petals-plan.md](./archive/loading-petals-plan.md)（落花） | 否 | 否 | 否 | 已用 FreeGameSprites CC0 素材；再核对原作贴图才需 dat+thanm |
| [stage-content-plan.md](./archive/stage-content-plan.md)（关卡） | 否 | 否 | 否 | runner 与原型表全在本仓写 |
| [stage-difficulty-model.md](./archive/stage-difficulty-model.md)（难度模型） | 需（仅复核） | 否 | 否 | 数字已固化在 `th20-ecl-shots.json`；重算才需 ECL 文本 |
| [content-volume-outlook.md](./archive/content-volume-outlook.md) | 否 | 否 | 否 | 内容量数字全部来自已入库的提取结果 |

唯一"实现时会用到"的外部物是 `.scratch/th20-extract/tex/ascii/loading@ascii@7.png`——它已明确排除、不应用于产品（原作素材），只作逆向参考。

### 3.2 已入库分析产物

| 文件 | 用途 |
|---|---|
| `docs/archive/evidence/th20-feel-factsheet.md` / `th20-std-factsheet.md` / `stages-factsheet.md` / `loading-petals-factsheet.md`（⚠️ 原 `.scratch/`，已归档） | 各文档的事实卡（带 `文件:行号` 证据） |
| `.scratch/face-capture.mjs` / `face-difficulty.mjs` | 本作无头章节捕获与率量/反应窗计算（只用本仓） |
| `.scratch/v3.py` | 唯一的 TH20 ECL 开火提取器（自带自检；需 `~/Touhou20`） |
| `.scratch/th20-bullet-radii.json` / `th20-ecl-shots.json` / `thanm.c` / `reg.h` / `anmmap.c` | 已提取数据与 thtk 源码快照 |

### 3.3 外部来源与获取（⚠️）

- **`~/Touhou20`**：TH20 源码重建工程（`https://github.com/Oracatt/Touhou20`，见其 README）。本机路径 `~/Touhou20`，不在本仓库内，也不应放进仓库。全程**只读**；每次调研后应能验证 `cd ~/Touhou20 && git status --porcelain` 为空。缺失时 `v3.py` 无法重跑，但已入库的提取数据仍可引用。
- **thtk**（`https://github.com/thpatch/thtk`，固定 commit `892114a0fcaa0bbdaaecf3cb4ad56f758683fb40`）：本机 Termux 里 `thdat` / `thanm` / `thstd` 在 `$PREFIX/bin`。只用到列归档、解单个成员、导出纹理。thtk 不内置指令名，语义必须从 `~/Touhou20` 的 `anm_vm.cpp` 读。
- **`th20.dat`**：原版《東方錦上京》游戏目录内，用户自行提供；本机路径示例 `/data/user/0/com.termux/files/home/th20.dat`，期望 SHA-256 `9db8d7c43fbacec95614163d4c3e1d254e82169f8550177ee849831130590494`。`plNN.sht`（自机速度）不在 dat 内，任何来源都拿不到。

重跑说明：

```bash
# 本作：无头捕获（默认 7200 帧/章；输出约 98MB，已被 .gitignore 排除）
node .scratch/face-capture.mjs > .scratch/face-capture-7200.json
node .scratch/face-difficulty.mjs

# TH20：ECL 开火提取（自检必须通过：自检 n601 == raw601）
python3 .scratch/v3.py
python3 .scratch/v3.py --ecl ~/Touhou20/scripts/recovered/ecl --out .scratch/th20-ecl-shots.json

# 重新提取原作加载素材（仅逆向参考，不得进 assets/）
mkdir -p .scratch/th20-extract && cd .scratch/th20-extract
thdat -x 20 /path/to/th20.dat ascii.anm
mkdir -p tex && cd tex && thanm -uux20 ../ascii.anm
```

### 3.4 场景过渡遮罩采样核对（⚠️ 本机 TH20 逆向）

- 通过本机 TH20 原始 `screenswitch.anm` 与纹理解包核对采样：128×128 sprite 读取 64×64 tile 的 `(0,1)..(128,129)`，横向重复两次，前63/128高度扫描纹理、后65/128高度延展真实底行；首次转场将 U wrap／V clamp 烘焙并缓存为单张128×128 Alpha sprite，统一周期端点透明度。
- 产品图 `assets/ui/scene-wipe-mask.avif` 用独立参数绘制，不复制原像素；原资源只保留在 `.local-evidence/th20-original/`。

### 3.5 失败与降级

| 缺失 | 影响 | 降级 |
|---|---|---|
| `~/Touhou20` | `v3.py` 无法重跑 | 已入库的 `th20-ecl-shots.json` 仍可引用；文档行号仍可读 |
| 98MB 捕获未重跑 | `face-difficulty.mjs` 无法算 | 文档数字已固化；重跑捕获即可 |
| thtk / `th20.dat` | 无法再解原作素材 | 落花方案已走 CC0 路径，不需要 thtk |
| `plNN.sht` | 拿不到 TH20 自机速度 | 已在文档标为"不可比" |

### 3.6 引用纪律

1. 只在 `v3.py` 自检通过时引用其输出。
2. 本作"弹/秒"是沙盒峰值，不是实际游玩密度；"每面总弹数"不是内容属性。
3. TH20 的静态计数不等于单次游玩（含全部难度与子程序求和）。
4. thtk 给的是参数形状，不是语义；语义必须来自 `~/Touhou20` 的实现。
5. `th20.dat` 与原作素材不得进入 `assets/`，也不得用于产品（见 [`../assets/NOTICE.md`](../assets/NOTICE.md)）。
