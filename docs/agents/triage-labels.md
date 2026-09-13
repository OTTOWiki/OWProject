# Triage Labels

五个规范 triage 角色与本仓库任务状态字符串一一对应。
> Archive provenance: copied from the locally untracked `C:/Users/35181/Documents/Work/OWProject-hud06/docs/agents/triage-labels.md`; source worktree HEAD was `7048a050796946238e3a2e677e9ca772bb14e70b` on branch `feat/live-hud-touch`. The same-name file in `OWProject-combat-prototype` was byte-identical before the archive wording update; no binary or prototype material was copied.
> Source file SHA-256 before archive edits: `6928f72d209d9737c0e5b18fe903bc3bb2e53b65d1705979d0d28c86cc2e607c`.

|规范角色|本仓库字符串|含义|
|---|---|---|
|`needs-triage`|`needs-triage`|等待维护者评估|
|`needs-info`|`needs-info`|等待报告者补充信息|
|`ready-for-agent`|`ready-for-agent`|规格完整且所有前置依赖已解除，可交给无人值守代理实现|
|`ready-for-human`|`ready-for-human`|等待用户判断/验收或人工处理；不代表功能未实现|
|`wontfix`|`wontfix`|不予处理|

技能要求应用某个 triage 角色时，将对应字符串写入本地任务文件的 `Status:` 行。
> 归档约定：`implemented` 是交付/实现程度标记，不强行替代 triage 状态；用户视觉判断或验收尚未完成时，任务仍可记录为 `ready-for-human`。

以后调整词汇时，修改表格的“本仓库字符串”列。
