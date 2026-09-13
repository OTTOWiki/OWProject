# 08 — 暂停、设置返回与模式动作

**What to build:** 实现真实暂停覆盖层与设置返回闭环，区分 Story/Nomiss/Replay 各模式的实际动作集，并把移动端低频信息接入暂停页。暂停只压暗/覆盖中央版面，桌面外围 HUD 继续可见；复用同一设置页并记录来源，从暂停打开设置、关闭设置后回到暂停而非恢复战斗。普通模式显示继续、保存录像、设置、返回等有效动作；Nomiss 显示继续、暂停结算、设置、重试等其实际动作集；录像回放只显示既有回放动作，不出现录制/续关按钮。移动端低频数据（HiScore、自机名称、完整章节标题、详细统计）在暂停页可查且与当前对局一致。输入消费保证暂停开关与设置关闭不把同一物理事件传给战斗，避免 pointer/touch 双重触发与输入泄漏。

**Blocked by:** 06 真实战斗 HUD 与手机触控；07 分类设置、键位与持久化；当前用户要求先调整已实现 UI 风格，视觉结论未批准

**Status:** ready-for-human

**Implementation:** partial — 现有实现已有暂停／恢复与部分战斗上下文，但本票的模式动作集、暂停→设置→返回暂停、移动端低频信息与完整桌面/手机验收未收口；不能以既有实现或自动化绿灯代替本票完成。

**Archive provenance:** copied from the locally untracked `C:/Users/35181/Documents/Work/OWProject-hud06/.scratch/ui-hud-redesign/issues/08-pause-settings-modes.md`; source worktree HEAD was `7048a050796946238e3a2e677e9ca772bb14e70b` on branch `feat/live-hud-touch`. The source file SHA-256 at archive time was `3a65579573e8ec73be63e0cc1009077889afb4f9b8714d99284aa17bee44c0ca`. No same-name issue was present in `OWProject-combat-prototype`.

**Archive note:** 本票仍是规划，不是实现证据；`ready-for-human` 不表示可立即开工。依赖 07 未登记/未完成前不可执行；风格结论未批准前，即使依赖解除也先暂停，不把本票的历史 `ready-for-agent` 当成当前授权。

- [ ] 暂停只压暗/覆盖版面，桌面外围 HUD 保持可见，保留对局上下文。
- [ ] 暂停→设置→关闭设置→仍处于暂停，不恢复战斗；返回操作保持暂停状态。
- [ ] Story／Stage／Extra／Practice按实际可用性保留普通暂停动作（继续、保存录像、设置、返回）；Nomiss使用继续、暂停结算、设置、重试；Replay保持已有回放控制，不擅加普通暂停、录制或续关动作。动作资格由真实状态决定。
- [ ] 移动端低频信息（HiScore、自机名称、完整章节标题、详细统计）在暂停页可找到且与当前对局一致。
- [ ] 暂停开关、设置关闭不产生 pointer/touch 双重触发或输入泄漏到战斗；非对话状态下 Esc 保持原返回/暂停语义。
- [ ] 桌面与手机均验证暂停状态、设置返回暂停、各模式动作集与低频信息可达。
- [ ] 暂停借梦无垠的版面内文字遮罩与纸墨层次，匹配th14/th18强化后的周边美术；字形、选中反馈和低频信息可读，不复制网页对话框、不过度模糊背景，也不误把路线层标题写成Pause。

**规格覆盖：** ID-05、ID-06、ID-08、ID-09；US37–US39、US64；T08、T18。

**协调事项：** 依赖 07 的设置页分类、键位捕获与持久化；与 06 对齐移动端低频字段清单与一致性；共享设置页只按来源返回，不为各模式复制设置入口。
