# Domain Docs

本仓库使用 single-context 布局。本文规定工程技能探索代码时如何读取领域文档。
> Archive provenance: copied from the locally untracked `C:/Users/35181/Documents/Work/OWProject-hud06/docs/agents/domain.md`; source worktree HEAD was `7048a050796946238e3a2e677e9ca772bb14e70b` on branch `feat/live-hud-touch`. The same-name file in `OWProject-combat-prototype` was byte-identical; no binary or prototype material was copied.
> Source file SHA-256 before archive edits: `72799d2b95e5b063be9fbf47fceb06e842ef16a210c2b263fc7bec850baad3e5`.
***

## Before exploring, read these

- 根目录 `CONTEXT.md`：领域术语和概念。
- `docs/adr/`：只读取与当前工作领域相关的架构决策。

文件或目录不存在时静默继续，无需报告缺失或建议预先创建。
`/domain-modeling` 在术语或决策得到确认后按需创建这些文档；
`/grill-with-docs` 和 `/improve-codebase-architecture` 也可调用该技能。

## File structure

- `CONTEXT.md`：仓库共享领域上下文。
- `docs/adr/NNNN-<decision-slug>.md`：按编号保存架构决策。
- `js/`：现有游戏源码目录。

## Use the glossary's vocabulary

在任务标题、重构提案、假设、测试名称中命名领域概念时，使用
`CONTEXT.md` 定义的术语，避免其明确排除的同义词。

需要的概念尚未收录时，先判断是否误用了项目语言；
若确有术语空缺，记录给 `/domain-modeling` 处理。

## Flag ADR conflicts

方案与现有 ADR 冲突时，明确指出 ADR 编号和重新讨论的理由，
而不是静默覆盖既有决策。
