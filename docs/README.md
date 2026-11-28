# docs — 项目文档索引（非运行时）

> 本目录不参与构建、不被 `js/` 引用。每份文档顶部都有一行**状态**；按状态决定留根目录还是归档。
> 权威顺序：**可运行代码 > [`AGENTS.md`](../AGENTS.md) > [`CONTRIBUTING.md`](../CONTRIBUTING.md) > `docs/` 方案与报告**。
> **文档信息红线**：除 `docs/` 外，文档不得提供仅依赖提交者本机才能成立的信息（本机路径、环境变量、MCP/工具配置、本地证据/参考图目录、个人 worktree 等）；`docs/` 内出现这类信息时必须标 **⚠️**。

## 文档边界

| 位置 | 只放什么 | 不放什么 |
|------|----------|----------|
| `README.md` | 项目简介、运行方式、文档入口、授权与素材 | 玩法/界面细节（以游戏内 Manual 为准）、目录树、测试/CI、hooks、发版 |
| `CONTRIBUTING.md` | 分支/PR/CI 流程、红线、常见贡献类型 | 模块全表、数值表、实施方案 |
| `AGENTS.md` | 开发权威：架构、模块职责、状态机、契约、存储、发版、Agent 约定 | 玩家教程、一次性调研、历史方案全文 |
| `docs/`（本目录根） | 当前任务队列、现行设计说明、待处理审计、本地环境/外部来源 | 已收尾方案（移 `archive/`）、运行时数据 |
| [`local-environment.md`](./local-environment.md) | ⚠️ 本机环境、外部调研来源、本地证据路径（不可从干净 clone 复现） | 任何规格/契约 |
| `docs/archive/` | 已完成 / 被接替 / 一次性报告，保留证据与决策历史 | 任何"现行规格" |
| `assets/NOTICE.md` | 素材来源与授权 | 玩法 / 架构说明 |
| `.scratch/` | 分析工具与已提取数据（非运行时；事实卡已移至 `docs/archive/evidence/`） | 产品素材、原作素材 |
| `docs/archive/evidence/`、`docs/archive/ui-hud-redesign/` | ⚠️ 归档的本机调研事实卡/设计证据（含本机外部资料） | 规格/契约 |

## 任务状态速览

| 任务域 | 状态 | 文档 |
|--------|------|------|
| 可维护性改造（T/E/F/G/H） | ✅ 全部完成（2026-08-22 收尾；H02 已补记） | [refactor-queue.md](./refactor-queue.md) |
| 关卡 3D 背景系统 | ✅ 实现完成（维护阶段） | [level-background-redesign.md](./level-background-redesign.md) |
| 背景引擎重作（TH20 STD） | ✅ P0/P1/P3；P2 未做且被 3D 方案取代，P6 由 3D 接替 | [archive/background-rebuild-plan.md](./archive/background-rebuild-plan.md) |
| 加载落花 | ✅ P1–P4/P6；P5 仅低端真机首帧未验证 | [archive/loading-petals-plan.md](./archive/loading-petals-plan.md) |
| 性能优化 | ✅ 已实现；真机视觉验证未关闭 | [archive/perf-optimization.md](./archive/perf-optimization.md) |
| 道具 / 得分 / 进度 / 存档 | ✅ A1–A8；A9 不做、M2 可选未做 | [archive/items-score-progress-plan.md](./archive/items-score-progress-plan.md) |
| TH20 机制迁移（汇总） | 🟡 大部分已落地；P7 内容扩充、背景 P2、M2 未做 | [archive/th20-reference-report.md](./archive/th20-reference-report.md) |
| 操作手感（TH20 参考） | 🟡 部分落地，其余未排期 | [archive/th20-handling-plan.md](./archive/th20-handling-plan.md) |
| 关卡内容系统 | 🟡 B1 完成、B2 53/62；B0 runner 已清理；B3–B5 未做 | [archive/stage-content-plan.md](./archive/stage-content-plan.md) |
| 内容量 / 难度模型（分析） | 📊 2026-10 数据快照，仅参考 | [archive/content-volume-outlook.md](./archive/content-volume-outlook.md) · [archive/stage-difficulty-model.md](./archive/stage-difficulty-model.md) |
| 全仓质量审计 | 🔴 待分诊（基线 `aa3228c`；其后 23 个提交已修部分项） | [ponytail-audit-2026-11-28.md](./ponytail-audit-2026-11-28.md) |

图例：✅ 完成 · 🟡 部分完成或未排期 · 📊 参考数据 · 🔴 待处理。

## 维护规则

1. 新方案/报告放 `docs/` 根，首行写「状态 + 日期 + 与代码的关系」。
2. **信息红线**：`docs/` 之外的文档不写仅本机成立的信息；`docs/` 内的本机/外部信息必须标 ⚠️。
3. 任务收尾或被接替后：状态改为「已归档」，移入 `docs/archive/`，同步本索引与所有引用链接。
4. 已完成任务的**现行行为**必须落到 `AGENTS.md`（或代码注释），不要留在方案文档里当规格。
5. 归档文档只改状态/链接，不改写历史结论；确需更正时在状态行注明。
6. 改 `AGENTS.md` / `README.md` / `CONTRIBUTING.md` 时按 AGENTS「文档对齐」自检，并同步本页状态表。
