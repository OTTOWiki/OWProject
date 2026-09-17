# UI 重构任务与验收总览

更新：2026-09-13。本文汇总已合并实现、开放 PR 与本次归档规划，不能将这些来源相加为“已完成任务数”。

## 当前用户结论与执行顺序

用户已授权先实现已知 UI 目标，再把未知的美术、字体、时序与其他配置问题留到末尾确认；实现过程仍不等于最终视觉批准。

1. 当前产品分支以 `f723d09` 为基线进行本地 UI 目标实现，独立于开放的 #34 与另行记录的 #35；本 docs 分支只保留原有 16 项文档范围与来源追溯。
2. 已知目标包括 TH 原作式页面构图、无框文字选择与当前项突出、场景内暂停／结果状态，以及移动端 HUD 位于画布下方；固定 `450×600`、输入、模式、数据和存档契约不变。
3. 暂停／结果保留战斗场景，标题、正文与动作在版面内形成左下聚类，版面局部压暗／柔化，HUD 在叠层外继续可见。当前 portrait 按已有真实状态与资源显示，缺失资产和最终人物视觉仍待确认。
4. 保留 02/06 已交付的功能与结构；20 仍是战斗 UI 的既有调整入口，主菜单调整范围沿用 02 记录。08、11 继续标为部分实现，不能因本轮已知视觉目标解锁未指定机制。
5. 本轮仅解除已知目标的实现阻塞；未知的 U1/U2/P1 边界、最终美术与视觉审阅仍保留。历史截图、原型和既有 CI 结果只作来源记录，不替代最终渲染审阅。

## 状态的含义

- **实现完成**：票据限定的功能/结构已交付；不代表最终美术或全规格完成。
- **部分实现**：已有代码路径，但本票的完整要求或验收仍有缺口。
- **未登记/未核实**：规格或其他票引用了目标，尚无可追溯的独立票或完成证据；不等同于功能完全不存在。
- **视觉待调整**：用户尚不满意，不能记为视觉通过，也不能清除已有功能实现记录。
- **PR 状态**：以 GitHub 当前状态及提交为准，正文和历史交接中的旧声明只作追溯。

## 已交付与当前开放工作

| 票 | 实现状态 | 视觉状态 | 交付/阻塞 |
|---|---|---|---|
| [02 主菜单、加载与入场](issues/02-main-menu-loading.md) | 功能与结构 implemented | 当前已实现 UI 风格需调整；人物仍占位，最终美术独立审核 | [PR #32](https://github.com/OTTOWiki/OWProject/pull/32) 已合并 |
| [06 真实 HUD 与手机触控](issues/06-live-hud-touch.md) | 功能与结构 implemented | 战斗外观由 20 接续，未获得最终视觉认可 | [PR #33](https://github.com/OTTOWiki/OWProject/pull/33) 已合并 |
| 20 th14/th18 战斗 UI 精修 | 首轮 CSS 实现已提交 | ready-for-human；用户仍不满意，需调整并确认 | [PR #34](https://github.com/OTTOWiki/OWProject/pull/34) 开放未合并；[原票固定提交](https://github.com/OTTOWiki/OWProject/blob/f723d09924ac5d58eb0ac1e1e97de50a829be7fc/.scratch/ui-hud-redesign/issues/20-th14-th18-battle-ui.md) |

20 的文件随 #34 存在，本文不向 main 复制该票，以免与开放 PR 重复新增。原票末尾关于创建失败的描述是历史；本表记录已创建的 #34。本次不更新或合并 #34。

2026-09-13 GitHub MCP 查询：#34 head 为 `f723d09924ac5d58eb0ac1e1e97de50a829be7fc`，Test、E2E、Analyze、Cloudflare check runs 成功，CodeRabbit status 成功，无 review threads。[Test/E2E 运行](https://github.com/OTTOWiki/OWProject/actions/runs/34750410999)。这些是该提交的 CI 证据，不是本次文档分支验证，也不代表视觉批准。

## 本次纳入版本控制的既有规划

以下文件此前仅存在于 `OWProject-hud06` 的未跟踪材料，本次归档后可随 Git 追溯；归档不是实现或验收。

| 材料 | 当前核对 | 后续前置 |
|---|---|---|
| [08 暂停、设置返回与模式动作](issues/08-pause-settings-modes.md) | 部分实现：已有暂停动作和设置返回路径；完整模式、手机低频信息与视觉验收未收口 | 先调整已做 UI 风格；07 设置票缺失/未登记；06 功能已交付 |
| [11 章节、Letter 与面间演出](issues/11-chapter-letter-transitions.md) | 部分实现：已有真实提示和自动转场；本票桌面/手机整体视觉与行为验收未收口 | 先调整已做 UI 风格；不新增对 02/06 的功能阻塞 |
| [总规格](spec.md) | 目标与验收规划，不是当前实现说明；14 个 ID、20 个 T、68 个 US | 保留 U1/U2/P1/录像兼容等未决事项；本次不重新拆票 |

尚未在本次已检查工作副本中找到 07 设置票、18 后置资产票。它们是未登记依赖/目标，不是已完成或可立即开工任务。规格中的开局/自机配置、对话/路线、录像兼容、结局/结果、设置/说明书/记录页及全套素材，均需逐项核对覆盖；不能根据现有五个票号宣称全规格完成。

## 来源与证据位置

归档的领域、设计和工作流资料见 [CONTEXT](../../CONTEXT.md)、[DESIGN](../../DESIGN.md)、[tracker](../../docs/agents/issue-tracker.md)。各文档记录自身的来源和未归档参考。

| 来源 | 可追溯性与限制 |
|---|---|
| 主线基准 `e2d04967f602ccf71a3608230fef6ecc16028052` | 已含 #32/#33；本地旧 main 曾落后，未用于判断远端是否合并 |
| `OWProject-hud06/.scratch/ui-hud-redesign/` | spec、08/11 和 evidence 原为未跟踪本地材料；本次只归档文字规划，原文件保留 |
| `OWProject-hud06/.scratch/ui-hud-redesign/evidence/06-live-hud/` | 可在原机器查验 HUD 几何/触控 JSON 与截图；本 PR 未包含证据文件，跨机器不可仅凭路径复核 |
| `OWProject-combat-ui-refinement/.scratch/ui-hud-redesign/evidence/20-th14-th18/` | refined.json、E2E 与截图保留原工作副本；静止画面不能代替动作验证；本 PR 未包含这些文件 |
| 02 票据中的历史验证 | 记录当时执行结果；当前主工作树只发现 `evidence/02-ci-recovery/e2e-failure.log`，其他所引截图/JSON未在该工作树找到，不能冒称已重新复核 |
| `prototype/combat-composition` / `prototype/combat-ui-th14-th18` | 原型代码留原分支；两张 01 的最新反馈仍有本地未提交记录。20 明确两套原型仅历史，不再推进方向选择 |

当前主工作区的 AGENTS UI 规则修改和未跟踪 `.codegraph/` 不在本次文档 PR 中。历史原型、未归档图片、过去测试结果均不能充当最终 UI 风格已通过的证据。
