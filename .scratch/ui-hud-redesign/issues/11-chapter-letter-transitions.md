# 11 — 章节／Letter 提示与面间演出

**What to build:** 实现真实章节与 Letter 提示牌、章节结算/奖励与面间自动转场演出。章节标题、Letter 名称、章节结算/奖励、波次类横幅仅对应真实现有事件，不为复用参考截图新增波次状态；内容使用本作真实章节、路线与诗句。面间演出自动继续，不新增按键继续或多余提示。加载与章节叙事卡分开：仅在真实等待资源时显示 Loading，只有真实可测量进度时才显示相应数值，不显示假进度条；加载失败给可理解反馈与已有恢复路径，不永远停留在假进度。转场视觉沿用纸墨/笔刷语言，比 v3 更迷幻华饰，同时不遮挡章节关键信息。

**Blocked by:** 当前用户要求先调整已实现 UI 风格，视觉结论未批准；既有章节/Letter机制可供后续接线，但本票的完整验收仍未收口

**Status:** ready-for-human

**Implementation:** partial — 现有实现已有部分章节／Letter提示或流程机制，但本票要求的章节结算/奖励、面间自动转场、真实加载区分、失败恢复及桌面/手机验收未收口；不能以既有实现或自动化绿灯代替本票完成。

**Archive provenance:** copied from the locally untracked `C:/Users/35181/Documents/Work/OWProject-hud06/.scratch/ui-hud-redesign/issues/11-chapter-letter-transitions.md`; source worktree HEAD was `7048a050796946238e3a2e677e9ca772bb14e70b` on branch `feat/live-hud-touch`. The source file SHA-256 at archive time was `e346b6aadcacbad47c5962d8182e84072c9bf7e01d388900f9a5fe9112b05602a`. No same-name issue was present in `OWProject-combat-prototype`.

**Archive note:** 本票仍是规划，不是实现证据；`ready-for-human` 不表示可立即开工。风格结论未批准前不可执行；不创建 07/18 实现票，也不把历史 `ready-for-agent` 当成当前授权。

- [ ] 章节标题、Letter 提示、章节结算/奖励对应真实现有事件，内容为本作真实章节/路线/诗句。
- [ ] 面间自动演出后继续，无新增按键继续或多余提示；不隐藏章节结算奖励。
- [ ] 波次类横幅只对应真实事件，不新增波次状态。
- [ ] 加载仅在真实等待资源时出现；有真实可测量进度时才显示数值；不显示假进度条。
- [ ] 加载失败有可理解反馈与已有恢复路径，不永远停在假进度；加载与章节叙事卡分开。
- [ ] 桌面与手机均验证章节转换、标题显示、面间自动继续与加载区分，转场不遮挡关键信息。

**规格覆盖：** ID-02、ID-09；US47、US48；T17、T20。

**协调事项：** 本票负责真实章节、Letter和面间事件的短暂标题/奖励演出；06负责持续HUD读数，02负责启动加载界面。三者共享视觉和遮挡层级、区分真实加载与叙事演出；既有入口可独立验证，不重复造加载器，也不把未完成对方视觉当作本票必须等待的前置。
