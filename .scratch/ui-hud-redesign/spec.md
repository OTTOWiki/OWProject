# 棍維何意味：全游戏 UI / HUD 重设计实现规格

Status: ready-for-human
日期：2026-09-10
Tracker: Local Markdown

本规格原始来源状态为 `ready-for-agent`；归档后仅作为规划参考，不是实现证据或当前可执行指令。当前用户优先调整已实现 UI 风格，视觉结论未批准前，剩余 UI 票不可继续。
> Archive provenance: copied from the locally untracked `C:/Users/35181/Documents/Work/OWProject-hud06/.scratch/ui-hud-redesign/spec.md`; source worktree HEAD was `7048a050796946238e3a2e677e9ca772bb14e70b` on branch `feat/live-hud-touch`. The source file SHA-256 at archive time was `9bf99586c5abddf63ef193a236ffa5078a4461be7b275a562cf2e40dcad5f94a`. No same-name spec was present in `OWProject-combat-prototype`; no prototype code, binary, screenshot, or evidence file was copied.

## Archive state and current deviations

- 本文是本地规划归档，不是 UI 已实现或已验收的证明。原型“这个版本还行”只表示草稿级反馈；当前已实现的 HUD／菜单结构仍待用户要求的风格调整与视觉结论。
- 历史／当前偏差必须保留在后续实现判断中：现有 Nomiss 玩家页入口与未来目标的“故事难度页独立规则区”不同；未来配置页、难度页和完整 UI 流程不能倒写成现状。
- 08、11 仅记录规划目标与部分既有实现状态，验收未收口，且当前 UI 风格结论未批准前均不可执行；详见对应票面的 `Status`、`Blocked by` 和 `Implementation` 字段。
- U1 自机配置机制、U2 全套立绘／资产、P1 精确视觉与时序值，以及 N→兼容验证仍是未决项；下文目标、验收矩阵与完成门槛完整保留，不以归档动作解除这些依赖。

## Problem Statement

现有 UI 更像一组置于纹理上的网页控件，缺少东方弹幕游戏完整标题画面的构图、装饰层次、虚幻感与作品辨识度。菜单、HUD、设置、对话和结算没有形成足够统一的视觉语言；直接让 AI 全量改样式曾产生不符合预期的结果。

第三版浅纸水墨原型获得“这个版本还行”的草稿级认可，但仍不够迷幻、花哨。用户要求最终进一步借鉴 th14、th18 和《东方梦无垠》的具体截图，而不是把当前原型的克制程度当作成品标准。

重设计必须同时保住游戏流程与信息：输入响应、版面比例、难度和模式例外、排行榜资格、续关、Nomiss、录像兼容、真实存档及移动端操作。原型里的示例数据、模拟录像和未实现的自机配置不能混入正式游戏。

## Solution

以 TH 原作式页面级构图、无框文字菜单和场景内状态叠层统一后续 UI 方向：th14／th18 的截图只提供页面构图、色彩对比、装饰叠层与展示字形的参考证据；《东方梦无垠》的水墨、纸张、笔刷和资源分组只辅助状态层与局部材质，不作为全局界面规则或 TH 共性来源。参考作品只借用界面语法与关系，不将整图、角色、标题、字体或背景直接放入游戏。

暂停／战败保留原战斗版面：左侧战斗区局部压暗并柔化，右侧 HUD 与作品标题保留；状态标题置于选项组上方，操作选项锚定左下并纵向排列。主菜单使用 TH 式非对称页面构图，选择页使用页题、当前项、说明与角色／场景关系；这些是当前后续实现依据，不是已实现或视觉已批准的成品。

战斗始终优先中央 `450×600` 逻辑游戏区、真实数据与可玩性；桌面／手机排版、输入、模式例外、录像、真实存档和状态契约保持不变。前端结构与交互可以先使用明确占位推进；全套立绘制作后置，人物与自机配置机制仍受 U2／U1 边界约束，不能由视觉目标虚构补齐。

## User Stories

1. As a player, I want a composed Touhou-inspired title screen, so that the game feels like a coherent fantasy work rather than a website.
2. As a player, I want the title 棍維何意味 and the subtitle OTTOWiki Project, so that the work has a recognizable identity.
3. As a Chinese-speaking player, I want readable Chinese descriptions alongside English navigation, so that visual style does not hide meaning.
4. As a player, I want richer ornament and color inspired by th14 and th18, so that the final game feels more fantastical than the draft.
5. As a player, I want ink-wash depth and brush-strip transitions, so that menus and combat belong to the same visual world.
6. As a player, I want all ten main-menu destinations directly accessible, so that redesign does not bury existing functions.
7. As a keyboard player, I want a visible selection and predictable confirmation/back controls, so that I can navigate without a mouse.
8. As a mouse player, I want accurate hit areas matching visible controls, so that decorative layers never steal clicks.
9. As a touch player, I want deliberate selection and confirmation, so that a navigation touch cannot accidentally trigger the next screen.
10. As a returning player, I want the main menu to retain my last selection, so that repeated visits remain efficient.
11. As a player, I want skippable entrance animation on each menu visit, so that presentation never forces me to wait.
12. As a player, I want a skip input to only finish the animation, so that I do not accidentally start a game.
13. As a motion-sensitive player, I want reduced-motion presentation, so that I retain all information without decorative movement.
14. As a Story player, I want difficulty → player → player configuration → play, so that starting a run follows the confirmed flow.
15. As a player choosing difficulty, I want the current difficulty and its explanation emphasized, so that I understand my choice.
16. As an Extra player, I want only the dedicated Extra difficulty, so that the interface cannot start an invalid mode combination.
17. As a Stage Select player, I want every stage available from the main menu, so that existing unrestricted access remains intact.
18. As a Stage Select player, I want stage details and the real starting chapter, so that I know where the run will begin.
19. As a Practice player, I want difficulty, stage, chapter and practice settings on one page, so that I can prepare a drill quickly.
20. As a Practice player, I want my previous chapter and difficulty remembered, so that repeated practice needs less setup.
21. As a Practice player, I want existing chapter bests and collection information preserved, so that redesign does not remove useful feedback.
22. As a player selecting a character, I want one large portrait and corresponding information at a time, so that the character remains the focus.
23. As a player, I want to return through setup without losing my selections, so that checking an earlier choice does not restart the process.
24. As a player, I want configuration names and shot descriptions to reflect real mechanics, so that attractive mockups never misrepresent gameplay.
25. As a Nomiss player, I want the option separated from difficulty tiers, so that the special rule is clear without pretending to be a difficulty.
26. As a Nomiss player, I want chapter restart and saved progress preserved, so that the new UI does not change the mode I use.
27. As a combat player, I want a clear central playfield, so that ornament never obscures bullets or my hitbox.
28. As a combat player, I want lives, Bomb and Edit to be prominent, so that survival resources are readable at a glance.
29. As a combat player, I want each lit resource cell to mean one available unit, so that the HUD does not imply nonexistent fragments.
30. As a Practice player, I want unusually high starting lives displayed accurately, so that a fixed row of cells does not hide my real count.
31. As a score player, I want Score, HiScore and Combo shown with stable numerals, so that long or changing values remain readable.
32. As a combat player, I want active Unstable and tendency visible, so that I can react to the current mechanics.
33. As a boss-fight player, I want Letter name, remaining time and Bonus grouped coherently, so that I can judge the encounter quickly.
34. As a player, I want mode markers separate from the difficulty ribbon, so that Replay, Nomiss and Practice cannot be mistaken for difficulty.
35. As a touch player, I want relative movement mapped to the unchanged playfield, so that CSS scaling does not alter control accuracy.
36. As a touch player, I want usable Item, Bomb and Pause controls, so that my fingers can reach actions without hiding the playfield.
37. As a mobile player, I want essential combat data always visible and low-frequency details in pause, so that smaller screens remain playable.
38. As a paused player, I want the playfield dimmed while the outer HUD remains visible, so that I retain the context of the run.
39. As a paused player, I want settings to return to pause, so that closing settings never resumes combat unexpectedly.
40. As a dialogue reader, I want two character positions and a clear active speaker, so that conversations read as staged game scenes.
41. As a dialogue reader, I want text clear of character faces, so that portraits and words remain readable together.
42. As a player, I want normal line-by-line dialogue confirmation, so that I control reading pace.
43. As a player, I want Esc to skip only the current dialogue segment, so that I can bypass conversation without skipping gameplay or route selection.
44. As a player, I want held Ctrl to advance ordinary dialogue at five times its normal timing, so that repeated conversations are quick to traverse.
45. As a player, I want releasing fast-forward or leaving dialogue to stop it immediately, so that held input cannot affect the next state.
46. As a route-selection player, I want both routes visible with selection before confirmation, so that I enter the intended route.
47. As a player moving between stages, I want automatic scene transitions distinct from loading, so that no fake progress or unnecessary prompt interrupts the run.
48. As a player, I want chapter and Letter announcements styled as scene elements, so that they feel part of the game without hiding critical information.
49. As a player finishing a run, I want stats and subsequent actions in one result composition, so that repeated modal windows do not fragment the conclusion.
50. As a qualifying player, I want to save or cancel a three-character ranking name, so that ranking entry stays under my control.
51. As a continuing player, I want the existing score/resource reset and recording restriction preserved, so that the new result UI cannot silently alter run rules.
52. As a player reaching an ending, I want the story before the score screen, so that stats do not cover the narrative.
53. As a settings user, I want category navigation with only supported options, so that the page remains organized and truthful.
54. As a settings user, I want captured keys, cancellation and persisted values to behave reliably, so that the controls survive a reload.
55. As a settings user, I want confirmation before restoring defaults, so that I do not accidentally erase my choices.
56. As a manual reader, I want chapter navigation and readable Chinese text, so that I can find instructions without a forced tutorial.
57. As a ranking viewer, I want difficulty tabs and a readable score table, so that I can compare real results and continuation markers.
58. As a replay user, I want a list with real metadata and focused actions, so that I can inspect a recording before using it.
59. As a replay user, I want save, playback, import and export to use the actual replay format, so that the redesigned UI preserves recordings.
60. As a replay user, I want explicit delete confirmation, so that a single stray action cannot delete a recording.
61. As a replay user, I want invalid imports and storage failures reported with a recovery action, so that I understand what was not saved.
62. As a replay viewer, I want playback controls and recorded timing preserved, so that dialogue redesign cannot desynchronize a recording.
63. As a history viewer, I want loading, empty and error states with retry, so that the version page remains useful when data is unavailable.
64. As a player, I want overlays and menus to return focus to a sensible place, so that switching input devices or cancelling a dialog is predictable.
65. As a player, I want long labels, zero resources and simultaneous status indicators handled, so that only the easy visual case is not the sole tested case.
66. As a maintainer, I want existing gameplay, saves and replay contracts separated from UI changes, so that implementation cannot invent rules to fill design gaps.
67. As an artist, I want a complete character/state/use-site asset inventory, so that the later portrait package is consistent across all screens.
68. As a reviewer, I want real-game browser evidence and separate visual approval, so that prototype screenshots or passing unit tests cannot masquerade as a finished redesign.

## Implementation Decisions

### ID-01 · 语义分层与实施边界

规格使用以下标记，不允许互相冒充：

| 标记 | 含义 | 实现者责任 |
|---|---|---|
| **E：已有机制** | 当前正式游戏具有的规则、数据与能力 | 保持可观察行为；因重构调整内部组织不等于可以修改规则 |
| **N：新增 UI 行为** | 本轮明确确认的页面、组织、显示或输入变化 | 接入真实状态，补齐转换、异常和回归证据 |
| **U：未定义依赖** | 自机配置机制等没有决定的事项 | 不编造；只阻塞依赖它的工作，独立 UI 工作可继续 |
| **P：原型暂定值** | 模拟计时、演示数据、占位美术、原型专用状态 | 不自动成为生产默认值或上线内容 |

当前任务是规格发布。后续可按本规格实施已确定的 UI 内容；正式合入仍走项目既有分支、评审和 CI 流程。不得把模拟版 UI 直接当生产实现，也不得把范围缩成只改主菜单与右侧分数栏。

### ID-02 · 视觉系统与语言（N）

- **截图证据**：已归档参考中，th14 可支持页面级非对称构图、作品标题与文字导航共同成景；th18 可支持更强的多色对比、装饰叠层与展示字形；《东方梦无垠》可支持场景内水墨／纸张／笔刷状态层、中央玩法区与侧 HUD 的关系。截图是静态证据，只证明构图、颜色关系、纹理、字形和层级，不证明动画、输入、状态转场、字体授权或最终素材身份；图片未随本仓库复制。
- **当前结论（N）**：旧“浅色米纸网站化”基线降级为历史／局部材质参考，不作为全局构图或后续实现默认。当前优先采用 TH 原作式页面级构图、无框文字菜单和场景内状态叠层。允许借用参考作品的界面语法与关系，不复制整张截图、原作角色、标题、字体或背景。
- **暂停／战败目标（N）**：保留原战斗版面，左侧战斗区局部压暗／柔化，右侧 HUD 与作品标题继续可见；状态标题位于选项组上方，操作选项锚定左下并纵向排列。该段是后续实现依据，不是已实现或视觉已批准的结果。
- **主菜单与选择页目标（N）**：主菜单使用 TH 式非对称页面构图；选择页使用页题、当前项、说明与角色／场景关系。两者使用无框文字、明暗、描边、位置或短刷痕表达焦点，不使用现代按钮框或左侧竖线选中态。本轮仅更新规划目标，不把目标写成已实现。
- **战斗 HUD 目标（N）**：保留中央 `450×600` 逻辑游戏区和真实数据，右侧 HUD 与作品标题属于场景舞台；左侧战斗区的装饰不得遮挡玩家、敌人、弹幕或关键读数。Dream 仅辅助状态层与局部纸墨材质，不作为全局规则或 TH 共性来源。
- **待验证（P1）**：最终字体、色板、间距、材质细节和动效／时序仍需实际渲染与用户视觉审阅；既有原型色值与计时不是生产默认值。人物身份与最终立绘属于 U2，自机配置机制属于 U1，不得由本视觉目标推断或补造。
- 英文主、中文辅仅覆盖导航短文本、选择页题与选项，以及 HUD 通用短词；剧情、说明书、设置解释、错误信息、历史详情中文主。特有机制使用已确认领域术语，不创造看似官方的新机制名。
- 字体层级按断点使用明确字号，不随视口宽度连续缩放；中文无负字距和伪斜体。显示数值采用半角等宽或等宽数字，不通过装饰字体牺牲长分数与倒计时识别。
- 不向剧情、HUD、过渡诗、说明书或结果页塞版本改动、开发备注、实现细节。

### ID-03 · 真实模块边界（E＋N）

保留现有“菜单编排与焦点导航—输入归一化—游戏主循环—章节/对话流—HUD 与覆盖层—排名与录像存储”的责任分工。修改这些已有边界即可，不为换皮引入新框架、打包链或通用状态管理层。

- 菜单编排负责屏幕、来源页、当前选项及开局选择；不得直接修改得分、掉落或碰撞规则。
- 输入层负责键盘/指针/触控转换与消费；不能让同一物理输入被新旧页面重复处理。
- 章节流负责对话、路线触发、面间流程与结束条件；视觉层消费状态，不反向伪造章节完成。
- HUD/绘制层从真实游戏状态取数，不从展示文本、颜色或资源格反推业务状态。
- 排名与录像使用已有存储和编解码入口；列表/导入/导出展示不重写它们的业务含义。
- 游戏状态仍区分 playing、dialogue、routeSelect、stageTransit、gameover、ending；paused 和 replaying 是独立标志，不能把 UI 页面名误当新的游戏模式。
- 不保留两套互相覆盖的正式菜单/事件注册，也不以累加旧样式层交付生产视觉；原型历史样式不能成为生产依赖。

### ID-04 · 主菜单与开局路径（E＋N）

主菜单保持十项直达，顺序：Start Game、Extra Start、Stage Select、Practice、Ranking、Replay、Manual、History、Settings、Exit。通过间距与层级分组，不新增“游玩/记录/其他”一级子菜单。

构图为左上标题、左下导航、右侧饮泉思源单人主体；右侧在结构开发阶段可占位。每次进入主菜单，包括从子页面返回，播放完整分层绘画演出；确认键或点击可立即结束。跳过事件只结束演出，不同时激活选项；返回保留上次选择。快速切换选项不得等待动画，减少动态效果时直接进入稳定呈现态。

| 入口 | 目标路径 | 模式/难度约束 |
|---|---|---|
| Start Game | 难度 → 自机 → 自机配置 → 对局 | Story；四档常规难度；故事专属 Nomiss 在难度页规则区 |
| Extra Start | Extra 难度页 → 自机 → 自机配置 → 对局 | mode=extra；只显示专用 Extra，不伪装成五档常规难度 |
| Stage Select 常规关 | 关卡导航/详情 → 难度 → 自机 → 自机配置 → 对局 | mode=stage；所有关卡开放 |
| Stage Select 的 EX | 关卡导航/详情 → Extra 难度页 → 自机 → 自机配置 → 对局 | mode=extra；专用 Extra |
| Practice | 难度/关卡/章节/练习设置同页 → 自机 → 自机配置 → 对局 | mode=practice；不再次进入难度页；保留四档常规难度 |

- 所有分支复用自机与配置页，携带实际模式、难度、关卡、章节和练习条件；返回前序页面保留合法选择。
- Extra 入口页可只有一个难度选项，但不能在实际开局时误传四档普通难度。
- Stage Select 就是现有选关入口重做，不新增任意章节拼接或自定义对局规则。详情展示真实路线、起始章节及场景信息；章节级训练仍由 Practice 负责。
- **Practice 的 EX 例外（E）**：现有练习章节组包含 EX，难度仍只提供四档常规难度。练 EX 章节不自动改成 Extra 模式，也不擅自新增 Extra 难度 tab。
- Practice 保留上次难度/章节选择、当前关卡内章节列表、当前章收取/最佳成绩信息、非负整数起始残机、Unstable 开关及现有单章结束规则。保留当前输入归一化，不用新 UI 任意加上限。
- 难度页重点展示当前档与解释；自机页一次突出一人，左右切换。两位自机当前机制相同，不用伪造属性评分制造差异。
- 当前生产自机确认后直接开始；插入配置页是 **N**，不是已有页面换皮。该页完成上线受 U1 约束。
- **配置页已确定的 UI（N）**：左侧保留当前人物，右侧展示当前配置名称、说明与射击示意；设置明确的配置切换区域，切换后对应详情同步更新，确认后才开始对局。高速／低速射击示意只展示已定义的实际行为，不凭空发明差异；这一布局与联动要求不属于 U1 未决范围。人物占位阶段仍要验证人物／文字／示意不遮挡。
- Exit 保持浏览器平台能兑现的退出/返回行为；不能留下无效按钮，也不强行关闭用户浏览器。复用当前平台行为并给清楚反馈。

### ID-05 · 模式例外与数据契约（E）

| 场景 | 必须保留的行为 |
|---|---|
| Story | 常规流程、路线条件与章节顺序不变；可选择 Nomiss |
| Stage | 全关开放；从真实起始章节开始；EX 入口转为 extra |
| Extra | 仅专用难度；原有资源、章节和流程不变 |
| Practice | 不入榜；保留独立设置及练习记录；可设置超过8的起始残机；不提供续关动作 |
| Nomiss | 只从 Story 规则区启用；被弹回滚进章分数/资源并重开当前章、BGM回带；不扣残机、不触发常规Game Over；生命道具禁用；进度继续持久化；禁录像、不入榜 |
| Replay | 使用原模式/输入快照/种子回放；不重新入榜或写入真实对局成绩；不让实时对话快进改录制时间轴 |
| Continue | 只有符合资格的 Game Over 结果提供；最多2次，2残2Bomb，当前分数和基础分清零，hiscore保留，后续停止录制，成绩标“续” |

- 默认资源4残4Bomb，常规资源上限各8；练习初始残机无同样上限，显示必须容纳0/1/4/8及超过8的真实值。显示溢出数字，不画无限长度的格子；不改变后续原有资源增减规则。
- 编辑度仍是0–100；达到使用条件才能按既有规则消耗。Combo、Unstable、倾向、Letter时间与Bonus必须保留真实含义。
- 排名仍是按难度的本地 top10：未满10条可入榜，满榜时需严格高于末位，等分不因重设计强行入榜。昵称最多3字，规范化与排序规则不变。
- 排名与录像彼此独立；取消入榜、继续游戏、保存录像不能通过页面合并被强行绑定。
- 现有 localStorage 键、IndexedDB 录像索引/帧数据关系、存储隔离、导入版本验证和进度兼容保持。新的配置存档结构尚未决定，不能提前写入猜测字段。
- Nomiss 只是入口位置改变：从自机页移动到难度页的独立规则区；不变成难度或通用所有模式选项。保留已有进度恢复与新流程中已选择开关的可见性，不能跨到 Extra/Practice 后偷偷生效。

### ID-06 · 键盘、鼠标、触屏与输入优先级（E＋N）

- 菜单导航沿用方向键/WASD；确认 Enter/Z/Space，返回 Esc/X。具体横向/纵向选择依当前页面布局，单次移动只改变焦点，不直接执行目标。
- 不吞掉文本框、select、滑条和键位捕获需要的输入。点击/触屏后的焦点与当前高亮一致；返回恢复之前选项。
- 装饰、人物与墨层不拦截点击；视觉缩放、裁切、隐藏不能让不可见元素占据命中区。焦点必须可见，确认弹层取消后回到来源控件。
- 对话之外，Esc 保持既有返回/暂停语义；打开的 UI 弹层优先消费关闭/取消，不把关闭事件传给战斗。
- 战斗沿用方向/WASD移动、Shift低速、自定义 Shot/Bomb/Item 键。键位配置不能被固定Z/X/C快捷行为重复触发。
- 触控仍是版面内相对滑动：用显示矩形映射到固定逻辑坐标，沿用当前灵敏度、边界钳制、按下自动射击/松开停止、轻点与拖动区分。取消触控/失焦应释放按住状态，避免卡键。
- Item/Bomb触控按钮保持单次动作语义；Pause防止pointer/touch双重事件导致立即开关两次。实际移动、射击、Bomb效果来自游戏，不以原型动画代替。
- 路线/对话的触控动作进入正式输入消费路径，不直接绕开录像处理。
- UI 动效不能阻塞连续输入；菜单演出跳过、对话跳过、路线确认与结果按钮转换时均需防止输入泄漏到下一状态。

### ID-07 · 战斗画面与 HUD（E＋N）

- 桌面为共享美术背景上的三分区：战斗左侧美术区、中央版面、右侧HUD。战斗左侧美术区只含作品标题与装饰，不放动态游戏数据，不强制保留当前独立 Three 展示区。
- 版面逻辑尺寸450×600不得在运行时改变；显示等比缩放，触屏坐标按同一实际显示盒映射。背景/装饰位于其下或外围，不能裁断弹幕或修改碰撞区。
- **第一层资源**：Lives、Bomb、Edit。资源格一个亮格一份，不显示参考游戏才有的残片百分比。Lives紫红、Bomb绿色、Edit青蓝；颜色之外还要有名称、数量和形状区分。
- **第二层状态**：Score、HiScore、Combo、Unstable、倾向。允许保留参考里的短色带与错位分组，但不能变成低对比杂纹上的小字。
- **第三层背景信息**：自机、实际难度、当前章；章节/路线可由右侧或章节卡承载，不能塞进左侧。
- Letter名称、剩余时间、收取奖励及当前卡进度在版面上沿集中；保留当前必要 Boss 标记、章节开始/结束、奖励和瞬时反馈。不因布局集中而遗漏既有判读信息。
- Combo/倾向等重复表达归并为一个主要位置；不同时维护互相漂移的DOM与Canvas读数。
- 难度签显示实际难度；Replay、Nomiss、Practice等另作小型标识，HUD/暂停/结算按当前上下文持续可辨。
- FPS或开发调试信息遵从现有设置/开发边界，不抄参考截图中的CPU/内存诊断作为玩家HUD。
- HUD更新沿用实际数据变化与绘制时机，避免每帧重建整个DOM、重新生成纸墨材质或载入字体；变化动画不得延迟真实资源扣除后的读数。

### ID-08 · 响应式与移动信息取舍（N，保护 E）

- 桌面定主视觉；手机竖屏独立重排，不把完整桌面舞台机械缩成小字。保持版面、关键状态和触控可用空间。
- 手机常驻：Lives、Bomb、Edit、压缩Score、Letter计时、当前Unstable、倾向；Combo仅在有效时显示。
- HiScore、自机名称、完整章节标题及详细统计等低频信息可移入暂停页；玩家必须能找到，并与当前对局一致。
- 左侧美术区在窄屏可隐藏；人物/背景可重新裁切，不能遮住名称、确认/返回、角色脸部或资源读数。
- 内容多的设置、手册、历史和列表允许本区域滚动，焦点跟随可见，操作区不被固定工具栏遮挡。不能用隐藏overflow冒充无越界。
- 390×844是已有原型检查尺寸；正式验收还覆盖更窄竖屏和已支持桌面尺寸。手机横屏本阶段未定义新视觉方案，但不得破坏已支持页面的基本可达性或版面比例；出现必须新增产品取舍时再列明，不擅自扩大设计范围。

### ID-09 · 暂停、对话与叙事状态（E＋N）

**暂停／战败状态层**：

- **截图证据**：归档的《东方梦无垠》暂停截图只能支持“战斗场景仍作为底图、状态文字与操作项叠加其上、背景可被压暗”的静态构图观察；它不能证明本项目的具体位置、透明度、柔化强度、动画、输入或动作集，也不是本作已批准的成品截图。
- **当前推断／目标（N）**：暂停和战败都保留原战斗版面，不做全屏中央网页弹窗。左侧战斗区局部压暗并柔化，右侧 HUD 与作品标题继续可见；状态标题置于选项组上方，操作选项锚定左下并纵向排列。该布局目标来自最新用户结论，是后续实现依据，不是当前实现或视觉批准；Dream 只辅助状态层与局部纸墨材质，不扩展为全局规则或 TH 共性。
- **待验证（P1／E＋N）**：实际渲染需验证战斗上下文、玩家／敌人／弹幕、HUD 资源和标题在各状态下仍可读，局部压暗／柔化不遮蔽关键信息，选项焦点与触控命中区一致，窄屏仍可达；具体遮罩、柔化、间距、字号和转场时序待视觉审阅，不从截图或原型固定值推导。
- **状态契约（E＋N）**：复用同一设置页并记录来源；从暂停关闭设置回到暂停而非恢复战斗。普通模式保留继续、保存录像、设置、返回等有效操作；Nomiss 使用继续、暂停结算、设置、重试等其实际动作集；录像回放采用既有回放动作，不能显示无效录制／续关按钮。战败／结果动作仍由真实来源状态决定，不因共用视觉层伪造可入榜或可续关选项。

**对话**：双侧立绘＋下方文字，突出当前说话者、另一侧弱化；无人物的系统/旁白保留明确文字表达，不强塞错误头像。不得因角色切换裁切脸部。长中文与原剧情内容完整呈现，不借重设计擅自改写。

- E：当前对话手动逐句推进（Shot、Enter、Space或有效轻点），并无通用自动播放计时。
- N：Esc直接跳过当前一段对话，只进入该段既有后继状态；不跳章节、路线、结算。Esc在普通对话中优先于全局暂停；其他状态保持原语义。
- N：按住Ctrl以5倍速自动推进普通对话，松开停止；手动逐句确认仍可用。不得自动扩展到章节标题、面间过渡、路线选择或录像时间轴。
- P：原型每句300ms、基准1500ms只是演示方案。生产无已有基准，需在交付时明确可调阅读基准并证明倍率，不能宣称300ms早已是游戏规则；这属于UI时序参数校准，不授权更改模拟速度。
- 进入/退出对话、失焦、弹层、按键释放时清理按住状态。最后一句确认或Esc跳过不得顺带确认路线、关掉暂停或触发开火动作。
- 移动端保留触控逐句推进；桌面新增Esc/Ctrl能力不能成为手机继续对话的必需条件。是否提供额外触屏跳过/按住快进控件属适配设计，必须明确且不得阻挡文本或脸部，不硬造新手势。

**路线**：只在已有规则触发时显示A/B左右并列名称、主题图像及短说明；先选中再确认，键盘、鼠标、触屏一致。选择高亮不是提交路线，取消/返回不能绕开既定路线条件。

**章节/面间**：标题牌、Letter提示、章节结算/奖励、波次类横幅仅对应真实现有事件，不为复用一张截图增加新波次状态。面间自动演出后继续，不新增按键继续；内容使用本作真实章节、路线和诗句。

**加载**：真实等待资源才显示Loading；只有真实进度可测量时才显示相应数值。加载与章节叙事卡分开；失败给可理解反馈和已有恢复路径，不永远停在假进度条。

### ID-10 · 新对话行为与录像兼容（E＋N）

- 既有录像基于输入快照、种子、逻辑步进和压缩数据；对话与路线输入也参与记录，不能把新增UI事件放在录制链之外。
- 优先将新对话动作通过已有输入/逻辑步进边界表达；若必须扩展录像载荷或格式，需在编码、解码、导入验证与历史录像兼容策略中一致处理，不能只加一个实时DOM监听器。
- 本规格不指定未经设计的新增位字段或格式版本；实现者需给出兼容方案和可验证证据。旧录像必须仍可播放，不能靠静默忽略新语义掩盖失步。
- 回放期间忽略实时普通对话的Esc/Ctrl语义，保留既有回放Esc退出、R重开、F/Shift快进等控制；回放速度控制与普通对话5倍速不是同一个功能。
- 验证新录制对话跳过/快进到路线或战斗的后继状态一致、随机顺序与步进一致，重复播放没有双重推进；测试不得通过跳章工具绕过需录制的输入。

### ID-11 · 结局、结果与入榜（E＋N）

- 结局先呈现场景与双侧人物对话，剧情结束后进入统一结果画面；不把分数和后续菜单提前压在剧情上。
- Game Over、通关、练习结果、Nomiss暂停结算和录像结束等各用真实来源状态，不能统一伪造成可入榜/可续关的结果。
- 一个结果画面分步处理：对局成绩与真实统计始终可见 → 符合资格时昵称保存/取消 → 当次合法后续动作。入榜取消不删除当前成绩，不阻塞后续动作。
- Practice、Nomiss、Replay不提供入榜；满榜门槛按现有严格比较，未达资格不强制昵称阶段。
- 续关仍必须从合法Game Over结果触发，已提交/取消排行后再进入下一步；重复点击不能重复扣次数、重复存榜或重复开始。
- 实时统计必须来自真实时长、Miss/Bomb等已有数据，不能保留原型固定用时或示例分数。
- 原有录像保存能力继续提供，按模式、续关和录制状态决定可用性；禁用/不可用时说明原因，不伪保存成功。

### ID-12 · 设置、说明书与记录页（E＋N）

| 页面 | 结构与交互 | 异常/恢复与保留项 |
|---|---|---|
| Settings | 分类导航＋当前分类内容，现有选项按音量/画面/操作组织 | 音量、子弹不透明度、FPS、单击发射与Shot/Bomb/Item键位；真实保存和刷新回读；恢复默认需确认 |
| 键位捕获 | 显示等待输入、完成/取消，Esc取消且消费事件 | 当前没有“键位不得重复”的业务规则；原型拒绝重复键不自动成为生产要求，若更改需单独明确 |
| Manual | 章节导航＋中文正文，长文可滚动，按需操作示意 | 保留既有内容，随真实操作变更更新；不变强制教程、不写开发变更详情 |
| Ranking | 难度切换＋完整成绩表，突出名次/昵称/分数 | 空榜可返回，续关和路线标识正确；不混用录像列表或伪造网络榜 |
| Replay | 列表＋所选真实元数据详情；播放/导出/删除集中，导入独立 | 加载、空列表、存储失败、缺失帧数据、非法/损坏/不支持格式、多文件导入部分失败；清晰错误及重试/返回，不丢有效条目 |
| 录像删除 | 明确二次确认，取消恢复当前选择 | 不执行一次点击即删除；删除最后条目进入有下一步说明的空态，焦点有效 |
| History | 版本列表＋当前版本详情，保留真实部署访问入口 | 真实加载、空态、失败与刷新；本地缺少版本服务时允许真实可读错误，不用原型示例冒充线上结果 |

所有数据插入按文本/安全结构处理，不能将导入昵称、录像描述或历史内容当作可执行HTML。仅改变展示结构，不引入账户、云同步、在线付费或新第三方服务。

### ID-13 · 美术资产与占位阶段（N／后置交付）

- 结构阶段使用明确的非最终人物占位，保留轮廓、锚点、脸部/文字避让、裁切、缩放和图层关系；不以占位证明角色辨识度或正式美术成立。
- 实现过程中形成全套资产清单：实际角色名单、说话者/别名映射、表情或状态变体、全身/半身、使用页面、所需裁切、分层与导出要求。全套不等于只有两个主角，也不凭空决定每个角色必须有多少表情。
- 人物制作仍后置统一进行。饮泉思源依据真中音设定，誓约沙玛依据晓美焰设定，保留服装、发型、发饰、瞳色等辨识细节；综合用户提供的ZUN立绘，必要时以绀珠传为一致性锚点。该角色策略不许可把参考东方角色的服装和道具移植过来。
- 人物、背景、艺术标题、装饰与交互文字分开制作，不能整张烘焙成不可编辑网页截图。
- 截图与官方素材仅作本地分析来源；遵循官方二创指南及各素材权利边界，不能把东方指南当作第三方人物统一授权。
- 本轮 UI 结构交付与最终带真实美术交付分别验收。若人物仍占位或自机配置尚未实现，只能报告对应阶段完成，不能报告“全部正式前端完成”。

### ID-14 · 未决依赖和原型暂定值

| 编号 | 尚未确定的内容 | 允许继续的工作 | 禁止的替代做法/完成门槛 |
|---|---|---|---|
| **U1 自机配置机制** | 每位自机配置数量、名称、射击/Bomb差异、数据表示、存档/录像兼容、实际可选项 | 配置页构图与状态契约、其余页面独立重构、明确标记的设计演示 | 不造Type A/B、不拿设置页代替、不跳过用户要求的配置页、不用无效“确认”冒充完成；正式配置开局链必须在机制另行明确并接入后验收 |
| **U2 全套立绘/资产** | 完整角色/表情/姿态名单、精确张数与裁切及最终美术 | 人物槽位、适配、真实数据/状态接线、资产清单编制 | 不提前生成零散人物，不直接复制参考立绘；最终美术需后续集中审核 |
| **P1 精确视觉与时序值** | 最终字体/色板/间距、入场时长、自动阅读基准、纸墨细节 | 按已定视觉约束制作并展示可调实现 | 原型950ms入场、300ms推进、SVG材质、示例统计不是批准的永久常量 |
| **N→兼容验证** | 新对话语义进入录制与回放的实现方式 | 复用已有输入与编解码边界设计实现 | 不默认旧格式天然兼容；必须有历史录像和新录制回放证据，必要格式变更须显式记录 |

这些条目不会把所有已确定UI工作变成“等以后再做”，但会阻止依赖它们的最终上线验收。规格准备完成与产品全部实现完成是两种状态。

## Testing Decisions

### 已确认的测试边界

用户已确认：**真实浏览器端到端为主＋既有纯逻辑测试兜底＋截图人工视觉验收**。

主入口是正式游戏在本地HTTP运行后的玩家可见页面与对局状态。通过真实菜单点击/按键进入模式，通过实际保存/刷新/播放观察结果。既有调试入口只用于到达难复现的章节或战斗状态，不能绕过本次要证明的菜单路径、跳过录像输入采样，或取代真实触控映射。

沿用现有 Playwright 测试与隔离 localStorage/IndexedDB 的习惯；不因 UI 重设计新增宽泛测试抽象。只对浏览器难以稳定证明的边界，使用既有续关、Nomiss、排名、输入快照/编解码、设置归一化等纯逻辑入口。

好测试应因可观察契约被破坏而失败：错误模式、遗漏字段、重复消费、非法续关、损坏存档、录像失步、按钮被遮挡。不要测试源码字串、内部函数转发、默认文案快照或用断言复制实现。

### 验收矩阵

| 验收项 | 最低必要证据 | 关键边界 |
|---|---|---|
| T01 启动与十项菜单 | 正式浏览器启动、十项可访问、无新增代码错误 | 加载消失/失败反馈、键盘/点击/触屏、Exit平台反馈 |
| T02 菜单演出 | 实际连续输入与返回操作 | 首次/返回重播、任意完成时序、跳过不激活、保留选项、reduced-motion |
| T03 全开局分支 | 从真实主菜单操作到实际mode/difficulty/chapter/player | Story、Extra、Stage常规/EX、Practice常规/EX章节、Nomiss；配置整合在U1解除后补齐，不偷省 |
| T04 返回与配置详情 | 跨难度/自机/配置/选关/练习来回操作；U1解除后切换真实配置 | 保留当前人物，配置名/说明/射击示意同步，不漏配置页；没有重复难度页，非法跨模式状态不泄漏，单次事件不穿透 |
| T05 资源/HUD | 实际游戏状态与HUD对应，必要时用现有调试设置 | 0/1/4/8、练习大于8、零Bomb、Edit未满/已满、长分数、难度与模式分离 |
| T06 高干扰战斗 | 真正可运行的战斗与截图 | Letter接近0、密集弹幕、Combo/Unstable/倾向并发，角色/敌弹清楚，不只断言canvas非空 |
| T07 触控映射 | 正式canvas与按钮的触控事件/实际设备检查 | 450×600不变、比例0.75、缩放后相对拖动、边界、轻点vs拖动、松开/取消、Pause不双触发 |
| T08 暂停与设置 | 正式页面上暂停→设置→返回→继续 | 返回仍暂停，模式动作集正确，非dialogue的Esc语义保留 |
| T09 对话与路线 | 玩家输入推进到真实后继状态 | Esc段边界、Ctrl按住/松开、失焦、最后一句输入隔离、路线选中不提交、触控等效 |
| T10 录制/回放 | 旧录像播放＋新录制对话/路线动作回放 | 状态顺序、分数/章节与输入步进一致，回放控制不与新对话快捷键冲突，不用原型格式 |
| T11 续关 | 已有纯逻辑回归＋正式Game Over动作展示/执行 | 排行阶段顺序，2次限制，2残2Bomb、分数清零/hiscore保留、停止录制、重复点击 |
| T12 Nomiss | 既有回滚/进度测试＋新难度页入口到暂停结算 | 仅Story可启用、进章快照/BGM、禁生命掉落、禁榜禁录、恢复进度 |
| T13 排行与结算 | 真实资格函数边界＋真实结果页保存/取消 | 空榜/满榜/等分、3字规范化、续标签、Practice/Nomiss/Replay不入榜，真实统计 |
| T14 录像管理 | 复用现有保存→列表→播放→退出→删除E2E，补改变的导入导出路径 | IndexedDB与索引一致、取消不删、空态、多文件部分失败、错误可恢复 |
| T15 设置 | 修改→保存→刷新回读 | 音量/透明度/FPS与无限制/单击发射/键位捕获取消、确认恢复默认；不擅改重复键政策 |
| T16 内容与记录页 | 切换说明书章节、历史条目、排行难度、录像详情 | 真实文本和元数据、长内容滚动、加载/空态/错误/重试/取消后焦点 |
| T17 叙事与结局 | 真实章节转换、标题显示、结局到结果 | 面间自动继续、不假Loading、不漏章结奖励、结局先于成绩，不增加新波次规则 |
| T18 响应式可达性 | 桌面1365×900、常用1280×800、手机390×844和更窄竖屏 | 控件真实边界/遮挡、焦点、长标题、暂停低频信息可找；不只看scrollWidth |
| T19 视觉与素材 | 与指定截图并排审阅菜单/HUD/难度/自机/暂停/章节/结算等代表页面 | 比v3更迷幻华饰、仍有纸墨层次；标题字形和缺字fallback；无网页卡片堆叠/左竖线/负字距；最终人物独立审核 |
| T20 真值与性能 | 真实生产数据与运行观察、已有加载/语法回归 | 无演示记录/假成功/固定统计/原型工具泄漏；输入无可见阻塞，动效不造成每帧DOM整页重建 |

现有先例覆盖启动冒烟、EX战斗、暂停继续、音乐音量持久化、录像保存/播放/二次删除、路线与续关排行榜标记、Nomiss入口结算；纯逻辑先例覆盖资源、续关、Nomiss回滚、排名资格、录像编码/校验和设置规范化。当前没有可证明本次最终 UI 的截图回归基线，也缺少完整菜单分支和触控E2E；不能把这些写成已经通过。

运行项目规定的逻辑检查与浏览器E2E，复用现有CI的 Test、E2E、CodeRabbit 合并门禁。只为真实新增或改变的行为补必要回归；图像艺术效果以当前渲染、指定参考和用户审阅单独裁定，不固定尚未批准的原型像素。

### 完成判定

- **规格发布完成**：本文七部分齐全，已有/新增/未决明确，测试边界经用户确认，证据引用可打开，状态已在本地任务目录发布。
- **UI结构实现完成**：已确定页面和输入流程接入真实游戏并通过适用T项，遗留依赖逐项列出；U1未解除不能声称正式开局链完成。
- **最终前端完成**：U1解决并集成、完整正式流程回归通过、最终美术与素材通过视觉验收、无原型占位/示例数据/开发说明混入玩家界面。纯测试绿或草稿“还行”均不满足此门槛。

## Out of Scope

- 本次规格发布不实现游戏代码、不生成最终立绘、不部署、不提交远程Issue或PR、不自动拆票；使用已配置的本地Markdown tracker。
- 自机配置的新玩法、配置数量、武器能力、数值平衡和配置存档/录像字段的决定，属于U1独立机制设计；页面目标仍在本规格中，不能因此删页或静默跳过。
- 不更改弹幕、碰撞、判定、伤害、资源获取、路线条件、章节数量/顺序、难度参数与续关规则。
- 不新增Spirit/Power/碎片/必杀技等参考图机制，不把视觉分段解释成新充能系统。
- 不新增账户、联网排行、云存档、支付、广告、线上社交或通用新设置；不新增“人物图鉴/成就/音乐室”等未经本轮确认的菜单入口。
- 不在本阶段逐张生成角色；正式全套立绘数量与状态须先列清单确认。允许结构期占位，但不可当最终上线替代。
- 不直接搬运参考作品素材，不将官方二创指南视作所有第三方人物与素材的授权。
- 不以UI重写为理由进行无关引擎重构、数据迁移、框架引入或改造队列清扫；不恢复/删除来源不明的既有工作区改动。

## Further Notes

### 本地发布与后续使用

本文发布为本地 tracker 的功能规格，顶部 `Status: ready-for-human` 表示归档后需人工复核且不可直接执行；原始 `ready-for-agent` 仅保留作历史状态。后续 `/to-tickets` 可在视觉结论与依赖解除后拆出完整功能切片与阻塞边，不重复 triage 已整理的任务。任务拆分应围绕能运行的页面/流程闭环，而非把 HTML/CSS/JS 分别排期。

先实施UI结构与真实状态接线，再按使用位置统筹全套立绘；人物阶段不能阻塞不依赖人物细节的工作。当前可先写spec与拆依赖，旧访谈记录中“等全套立绘后才写spec”的顺序已被用户本次明确调用 `/to-spec` 覆盖。U1需独立定义，不能让下游代理从原型猜玩法。

### 权威与追溯

- 已确认产品需求：本规格；若用户后续纠正，及时更新本文。
- 视觉锚点：[DESIGN.md](../../DESIGN.md)。th14构图＋th18更强色彩/装饰＋梦无垠水墨/资源组；其中原型色值/时长不等于最终批准。
- 领域术语：[CONTEXT.md](../../CONTEXT.md)。使用“版面”“战斗左侧美术区”“资源格”的明确含义。
- 访谈记录：`prototype-requirements.md`（未归档来源；目标仓库无此文件）。当前有模拟原型事实与历史阶段，本文已把需要保留的机制和新增行为分开。
- 角色设定及后置制作：`character-art-requirements.md`（未归档来源；目标仓库无此文件）。饮泉思源/真中音、誓约沙玛/晓美焰及绀珠传画法锚点继续有效。
- 第三版原型：`design-previews/2026-09-09-ui-hud-directions/play.html` 与 `verification.md`（未归档来源；目标仓库无 `design-previews/`）。原型不是生产实现；“119测试通过”及截图记录不是未来正式重设计已验证。
- 主菜单参考与 HUD 参考：`参考/参考截图/` 下的指定图片（未归档来源；目标仓库仅保留 `参考/需求.txt`，未复制大图）。其余页面精确图片矩阵见设计锚点；图片仅作来源定位，不是本归档可打开的链接。
- 东方官方指南快照：`参考/东方Project同人创作指南.md`（未归档来源；目标仓库无此快照）；实时官方页面仍为 https://touhou-project.news/guideline/；现有素材说明：[`assets/NOTICE.md`](../../assets/NOTICE.md)。参考目录被 Git 忽略，跨机器需另带，不能称为已随 Git 发布。
- Tracker规则：[issue-tracker.md](../../docs/agents/issue-tracker.md)；状态词汇：[triage-labels.md](../../docs/agents/triage-labels.md)。

### 当前代码与测试证据（仅追溯，不指定未来文件布局）

- 模式与导航：[UI编排](../../js/ui.js)、[菜单输入](../../js/menuNav.js)、[模式映射](../../js/startMode.js)、[输入归一化](../../js/input.js)、[开局与录像主循环](../../js/game.js)。
- HUD和流程：[HUD](../../js/hud.js)、[绘制](../../js/gameDraw.js)、[覆盖层](../../js/gameOverlay.js)、[章节流](../../js/chapterFlow.js)、[战斗资源与Nomiss](../../js/gameCombat.js)。
- 数据与存储：[配置](../../js/config.js)、[设置](../../js/settingsForm.js)、[排名](../../js/ranking.js)、[录像格式](../../js/replay.js)、[录像存储](../../js/replayStore.js)、[持久化](../../js/storage.js)。
- 浏览器先例：[配置](../../playwright.config.mjs)、[辅助入口](../../test/e2e/helpers.js)、[启动](../../test/e2e/smoke.spec.js)、[战斗/暂停](../../test/e2e/game.spec.js)、[设置持久化](../../test/e2e/settings.spec.js)、[录像流程](../../test/e2e/replay.spec.js)、[排行/Nomiss](../../test/e2e/ranking-nomiss.spec.js)。
- 纯逻辑先例：[续关](../../test/cases-continue.js)、[Nomiss](../../test/cases-nomiss.js)、[排名](../../test/cases-ranking.js)、[录像](../../test/cases-replay.js)、[资源/模式配置](../../test/cases-config.js)、[设置归一化](../../test/cases-storage-spawn.js)。

实现与测试在上述事实基础上展开；不得把本文的未来行为倒写成当前游戏已经具备的功能。
