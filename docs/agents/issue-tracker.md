# Issue tracker: Local Markdown

本仓库的工程技能将任务与规格保存在 `.scratch/` 下的 Markdown 文件中。
> Archive provenance: copied from the locally untracked `C:/Users/35181/Documents/Work/OWProject-hud06/docs/agents/issue-tracker.md`; source worktree HEAD was `7048a050796946238e3a2e677e9ca772bb14e70b` on branch `feat/live-hud-touch`. The same-name file in `OWProject-combat-prototype` was byte-identical; no binary or prototype material was copied.
> Source file SHA-256 before archive edits: `bc04734dea8d68f3c029f7dba87e56dcd1ee89209c58bf50f6411161deb911bf`.
***

## Conventions

- 每项功能一个目录：`.scratch/<feature-slug>/`。
- 规格：`.scratch/<feature-slug>/spec.md`。
- 实现任务：`.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 编号，每个任务独立文件。
- Triage 状态：任务文件顶部附近的 `Status:` 行；角色名称见 `triage-labels.md`。
- 评论和讨论：追加到文件底部的 `## Comments` 下。
- `docs/refactor-queue.md` 保留为现有改造队列；本配置不自动迁移队列条目，也不改变其指派要求。

## When a skill says "publish to the issue tracker"

规格写入 `spec.md`；实现任务写入 `issues/<NN>-<slug>.md`，按需创建父目录。

## When a skill says "fetch the relevant ticket"

读取用户引用的文件路径。若只提供编号，在已确定的功能目录内查找；编号对应多个功能时先澄清。

## Wayfinding operations

供 `/wayfinder` 使用：一份 map 文件，每个子任务一个独立文件。

- Map：`.scratch/<effort>/map.md`，保存 Notes / Decisions-so-far / Fog。
- 子任务：`.scratch/<effort>/issues/NN-<slug>.md`，从 `01` 编号；正文记录待回答的问题。
- 类型：`Type:` 行使用 `research` / `prototype` / `grilling` / `task`。
- 生命周期：wayfinder 子任务的 `Status:` 使用 `open` / `claimed` / `resolved`，与普通任务的 triage 角色区分。
- 阻塞：顶部附近使用 `Blocked by: NN, NN`；所有被引用任务均为 `resolved` 后解除阻塞。
- Frontier：扫描当前 effort 的 issues，选择状态为 `open` 且未阻塞的任务，编号最小者优先。
- Claim：开展工作前设置 `Status: claimed` 并保存。
- Resolve：在 `## Answer` 下追加答案，设置 `Status: resolved`，并在 map 的 Decisions-so-far 中追加摘要和链接。
