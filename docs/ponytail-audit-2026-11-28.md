# Ponytail 全仓审计报告 — OWProject

> **状态：待处理（2026-11-28）** — 一次性审计，49 项发现未排期；基线 `main` @ `aa3228c`，其后 23 个提交已修复部分项（音频按需解码、回放校验、WebGL 资源、E2E 门禁等），开工前先按当前 `main` 复核。分诊后的任务写入 [`refactor-queue.md`](./refactor-queue.md) 或另立阶段。 ⚠️ 本文含仅本机可复现的调研/实测信息，非仓库可复现（见 docs/local-environment.md）。

- 日期：2026-11-28
- 基线：`main` @ `aa3228c`（VERSION 295 / VERSION_NAME `0.5.0`）
- 范围：整个仓库（332 个跟踪文件，约 45.4k 行 JS）；未限定模块
- 方法：核心路径逐行阅读 + 3 个并行只读深审（渲染/UI/测试与 CI）+ 章节与资源数据程序化校验 + `npm test` + **Android WebView 实机运行（WebViewProbe）**
- ⚠️ 性质：一次性审计报告，**不修改任何运行时代码**。本次落盘仅新增本文件与 `.local-evidence/ponytail-audit-20261128/` 下的运行截图证据。
- ⚠️ 测试基线：`npm test` **205/205 pass**（本机 bun 可用，`test/run-tests.mjs` 实际走 `bun test`；Node 26 路径同样可运行）。

## 这个仓库是什么

纯前端、无打包器（ES Module + Three.js CDN）的东方风弹幕 STG：11 面 / 202 个章节、逻辑坐标固定 450×600、目标 60fps，桌面与 Android 移动端横屏；存档在 `localStorage` + IndexedDB；唯一服务端是 Cloudflare Pages Function `/api/versions`（History 用）；Playwright e2e 作浏览器回归。

**预期负载假设**：单玩家、单浏览器标签页；静态资源托管；粉丝游戏规模（每天数百玩家级）；服务端无多用户共享写入，只有 `/api/versions` 一个只读代理接口。下文部分问题只在移动端内存/耗时尺度上成立。

## 结论

**未到健康状态。** 先修 **#1 音频预载**（每次打开解码 2.0 GB PCM）+ **#21 阴影贴图泄漏**（每局 ~130–160 MB GPU）——移动端内存/GPU 是当前最大风险；再修 **#2–#4、#28–#31**（回放/输入/章节内容，普通游玩会踩）；CI 门禁加固（#7、#8）决定其余回归会不会在合并时被静默放行。本次审计经七轮深审（含 8 个子代理）最终共 **49 项发现**：#1–#20 初版 + #21–#49 深审增补（渲染 #21–#27、章节 #28–#34、持久化/回放/UI #35–#41、热路径性能 #42–#49）。

## 已完成的运行验证（WebViewProbe）

环境：Android 16 WebView / Chrome 157.0.8103.50，真实设备 1080×2400（竖屏），本地 `python3 -m http.server 8090` 提供仓库；探针页 `.audit-probe.html` 为临时复制页（测试后已删除）。游戏本体可正常启动到主菜单，boot 无 console error，菜单 CLS 0.0007、无横向溢出/坏图/过小点按目标。

| 发现 | 运行验证结果 | 状态 |
|---|---|---|
| #1 音频预载 | 仪表化 `AudioContext.prototype.decodeAudioData`：启动时 **19 次解码、19 次成功、合计 5,559 秒（92:39）音频、2,134,559,312 B ≈ 2,036 MB**（48 kHz / 2ch / float32），全部留在缓存中 | **已实机确认** |
| #2 回放头校验 | 页面内调用 `validateAnyReplay`：未知 `playerId`、未知 `difficultyId`、`steps:0` 均返回 `true`；`deserializeReplay(JSON.stringify({playerId:'nobody',...}))` 返回 `ok:true` | **已实机确认** |
| #3 回放中暂停 | 用应用自身 `replayStore` 保存合成录像并回放，点击游戏内暂停键：暂停层以 `PAUSED` 打开（含「保存录像/设置」等无效项）；保持暂停 **14 秒后回放把剩余帧全部消费完**，暂停层变成「回放结束」；按 Esc 返回录像列表而不是关闭暂停 | **已实机确认** |
| #4 Space 键 | 对聚焦按钮派发可取消的 Space keydown：`dispatchEvent` 返回 `false`、`defaultPrevented=true`；成绩排行内聚焦真实「取消」按 Space 后写入排行榜条目（详见下表补充行） | **已实机确认** |
| #11 菜单隐藏渲染 | 主菜单激活（`#screen-game` 为 `display:none`、`#bg3d` 的 `getClientRects().length=0`）时，包裹 WebGL `drawElements/drawArrays` 统计：**~4.5 秒内绘制调用 206,003 → 239,784（约 3.5k 次/秒）**，即隐藏画布仍在持续渲染 | **已实机确认** |
| #12 Nomiss 回滚 | 直接以 `mode:'nomiss'` 开局后设 `combo=25 / comboTimer=3 / player.edit=60 / score=1234`，调用 `_miss()` 触发自动重开：score 回滚为 0（符合预期），但 **combo=25、comboTimer=3、player.edit=60 全部保留**；快照键仅 `[unstableFx, score, baseScore, extendCount, lives, bombs]` | **已实机确认** |
| #6 键位冲突 | 经 `localStorage.gunwei_keys` 写入 `{shot:'KeyZ', bomb:'KeyZ'}` 并 `reloadKeys()`：一次 Z 按下同时满足 `bombPressed=true` 与 `shotHeld=true`；350ms 后 **Bomb 4→3（`bombTimer=0.9`、`stats.bombs=1`）且射出 63 发子弹（55 发普通弹 + Bomb 巨弹）** | **已实机确认** |
| #4 后半 | 用应用自身 `openScoreRanking` 打开成绩排行，原生聚焦真实「取消」按钮后按 Space：`defaultPrevented=true`、面板关闭、`gunwei_ranking` 被写入 score 1234 的条目（`rankingName` 也被保存）——聚焦「取消」实际执行了「保存」 | **已实机确认（完整）** |

⚠️ 证据截图：`../.local-evidence/ponytail-audit-20261128/menu.png`（主菜单）、`../.local-evidence/ponytail-audit-20261128/pause-during-replay.png`（回放中暂停：HUD 带 Replay 标记，暂停层打开）。

> 说明：本设备可分配约 2–3 GB 内存，故实测 2 GB 解码未使渲染进程崩溃（该 WebView 配置 limit 1 GB，历史 renderer crash 计数 3）；仍不能把「每次开局 2 GB」当作可接受成本，低内存机型会直接被系统回收或解码失败（失败被静默标为 `unavailable`，表现为无 BGM 且无提示）。

---

## 发现

### Must fix

1. **启动时把全部 BGM 解码进内存（约 2.0 GB PCM），且永不释放** — `js/main.js:214-353`、`js/audio.js:157-184`
   - **这是什么**：`preloadAll` 启动时对 `AUDIO_FILE_MAP` 的全部 19 个文件 fetch + `decodeAudioData`，结果全部放进 `_audioBufferCache` 供整个会话使用；`playTrack` 本来就会按需加载，这一步是纯额外开销。
   - **问题**：实测启动即解码 **19 首 / 92.6 分钟 / ≈2.0 GB**（48 kHz 立体声 float32）且永不淘汰；失败分支被标为 `unavailable` 且 `issue:false`（`js/main.js:313-331`），移动端内存不足时表现为“无 BGM、无提示”；`unlockAndRetryPreload` 还会对全部缺失曲目再解码一遍（`js/audio.js:190-207`）。
   - **修法**：删掉 `preloadAll` 里的解码+缓存（最多只 fetch 预热 HTTP 缓存），由 `playTrack` 按需解码当前曲目，并淘汰除“当前/下一首”外的 buffer；`unlockAndRetryPreload` 只补当前曲目。
   - **不修的后果**：每次打开游戏多花大量解码时间与内存；低内存手机被系统杀进程或全程无 BGM，桌面标签页常驻约 2 GB。

### Should fix

2. **导入录像不校验 header，坏文件能卡死回放** — `js/replay.js:121-134`、`js/game.js:704-718`、`js/replayScreen.js:245-282`
   - **这是什么**：`deserializeReplay` 只校验 frames + seed，导入后可播放的 header（playerId/difficultyId/mode/startChapter）完全不检查；`startReplay` 只检查 `playerId` 非空。
   - **问题**：把导出的录像 JSON 改成 `"playerId":"nobody"` 再导入（实测被接受），播放时 `PLAYER_DEFS['nobody']` 为 undefined，按住射击的帧上 `player.def.color` 每帧抛异常（`js/patterns.js:171-177`），游戏画面卡住直到按 Esc；`steps:0` 也能通过校验（实测），回放会在一次 rAF 内把剩余帧全部消费；更糟的是手写 `frames:[[1000000000,0,[0,0,0,0]]]` 这类 `count` 极大、`steps=0` 的录像能通过校验，播放时 rAF 内的 `while` 循环永不退出（也读不到 Esc），标签页直接冻结；v1 旧格式还接受负数 steps/count。
   - **修法**：在 `validateReplay`/`deserializeReplay` 增加：playerId ∈ PLAYER_DEFS、difficultyId ∈ DIFFICULTIES、startChapter 为整数、steps ≥ 1（v1 同时要求 count ≥ 1、steps ≥ 1），播放循环再加 `if (!(frame.steps > 0)) break;` 防御（约 10 行）。
   - **不修的后果**：别人分享/手改的一条录像就能把回放功能弄成“黑屏卡死”，只能重载页面。

3. **回放中按暂停键会破坏回放** — `js/main.js:601-610`、`js/gameOverlay.js:204-219`、`js/game.js:489-506`
   - **这是什么**：触屏/点击暂停键走 `_openPause`，没有 `game.replaying` 守卫，回放中也能打开暂停层。
   - **问题**（已实机）：回放中打开 PAUSED 后回放游标继续消费录制帧（静置 14 秒后回放自己播完、暂停层变成「回放结束」），“继续”后回放已跳帧错位；Esc 在暂停中会退出回放而不是关暂停；暂停菜单还提供对回放无效的「保存录像」。
   - **修法**：`openPause` 开头加 `if (game.replaying) return;`（或回放时隐藏暂停键）。
   - **不修的后果**：普通一次点按就破坏本次回放，且只能退出重来。

4. **Space 键：原生按钮无法激活；成绩排行里聚焦「取消」会执行「保存」** — `js/input.js:77-91`、`js/scoreRanking.js:42-68`
   - **这是什么**：全局 keydown 对所有非表单目标无条件 `preventDefault()` Space；成绩排行键盘处理不用真实焦点，而是 `btns[game._srFocusIndex]`（初始 0 = 保存）。
   - **问题**：键盘用户 Tab 到可见「取消」按钮按 Space：原生激活被阻止（实测 `defaultPrevented=true`），游戏循环把它映射成保存，写入排行榜并关闭面板（与用户意图相反）；加载失败恢复页的「继续进入」按钮同样无法用 Space 激活。
   - **修法**：有按钮/输入框焦点时不 preventDefault Space 并让原生激活优先；`handleScoreRankingKey` 在 `activeElement` 是按钮时让浏览器处理。
   - **不修的后果**：写入非预期数据（排行榜条目无法删除），键盘可访问性受损。

5. **两次 `playTrack` 可并发，导致 BGM 叠放/错曲并泄漏一个循环源** — `js/audio.js:232-268`
   - **这是什么**：`playTrack` 在 `await loadAudioBuffer(...)` 之前判断 `currentId`，await 之后无二次判断就设置 `currentId` 并启动 source；调用方是 fire-and-forget（`js/chapterFlow.js:145-158`）。
   - **问题**：慢网络/预载失败后首次进章时，若曲目仍在加载又触发下一次章节切换（重开/继续/快速导航），两个请求都启动 source；后完成者覆盖 `currentId`，先启动的 source 不再被 `stopMusic` 跟踪，会一直循环——听感是两首 BGM 叠放或放错曲。
   - **修法**：await 前打请求序号、await 后校验是否已被更新请求取代；启动新 source 前先停旧 source。
   - **不修的后果**：偶发但会持续整局的错误 BGM，只能结束对局恢复。

6. **键位配置接受冲突键，且不会应用到正在运行的对局** — `js/ui.js:744-778`、`js/main.js:526-527`
   - **这是什么**：重绑定时把任意 `e.code` 写进 `gunwei_keys`，无冲突/保留键检查；`Input.reloadKeys()` 只在下一次开局调用。
   - **问题**：把 Bomb 绑到 Z（Shot 默认也是 Z）后一次 Z 既发射又消耗 Bomb；暂停菜单里改键后界面标签立即刷新、但本局 `Input.keys` 仍是旧值，标签与实际操作相反，直到重开一局。
   - **修法**：拒绝已绑定键与菜单导航键并给反馈；设置变更时调用 `input.reloadKeys()`，或限制对局中不可改键。
   - **不修的后果**：玩家自造“武器乱放”故障，且很难判断是配置问题。

7. **文档声明的必过 E2E 门禁在跳过时仍算通过** — `.github/workflows/test.yml:41-44`
   - **这是什么**：`E2E` job 用 job 级 `if:` 只在 `workflow_dispatch` 或带 `run-e2e` 标签时运行；AGENTS/CONTRIBUTING 把 `E2E` 列为 required check。
   - **问题**：GitHub 对 required check 的规则是“successful / skipped / neutral 都算通过”，普通 PR 的 E2E 是 skipped 即视为通过；任何 DOM/触控/画布/菜单回归（Node 测试覆盖不到）可以在全绿 ruleset 下直接合入。
   - **修法**：required check 每次都必须真实跑一点东西（普通 PR 跑 smoke/boot 子集；打标签跑全量）。
   - **不修的后果**：浏览器回归的合并门禁实际只是约定。

8. **CI 只做语法解析；坏 import 与唯一服务端函数不受检** — `test/check-syntax.mjs:10-11`、`test/cases-load.js:1-45`
   - **这是什么**：`node --check` 只解析 `js/` 与 `test/`，不解析 import 目标；`functions/`、`tools/` 不在检查范围；浏览器模块加载用例只在浏览器跑且不含 `main.js`。
   - **问题**：把 `main.js` 的 import 改错名（或 `functions/api/versions.js` 逻辑改坏），`npm test` 仍 205/205 全绿；叠加 #7，坏模块链可直接部署。
   - **修法**：`check-syntax.mjs` 里遍历相对 import 并 `fs.existsSync` 校验；把 `functions`/`tools` 加入解析范围；给 `/api/versions` 加一个 mock `fetch` 的 `node:test`。
   - **不修的后果**：最常见的重构事故（改 import/接口）门禁抓不住。

9. **录像屏的异步载入无取消，可把玩家从当前界面强拉进对局** — `js/main.js:542-561`
   - **这是什么**：`onPlayReplay` await IndexedDB 后无“仍在录像屏”检查，直接 `ui.showGame()` + `game.startReplay()`。
   - **问题**：点击录像后立即返回/连点，等待中的读取完成后会在菜单上强制打开游戏并开始播放；失败分支同样会强制切屏。
   - **修法**：await 后判断录像屏是否仍激活（或请求 token），否则丢弃结果。
   - **不修的后果**：偶发但用户无法撤销的界面跳转。

10. **`/api/versions` 是无鉴权代理，且有 6 倍请求放大** — `functions/api/versions.js:59-95`、`functions/api/versions.js:97-157`
    - **这是什么**：匿名可调，一次请求向 Cloudflare API 扇出最多 `ceil(limit/25)+2` = 6 次带服务端 token 的调用；无速率限制，上游错误文本回显。
    - **问题**：约 300 次匿名 `?limit=100` 请求即可超过 Cloudflare API 限流（1200 次/5 分钟），后 History 页对所有用户报错。
    - **修法**：用 `caches.default` 按归一化 key 缓存，未命中最多取 1 页上游；错误统一文案。
    - **不修的后果**：History 是“一段脚本就能搞挂”的功能。

11. **菜单 idle 循环每帧渲染一个不可见的 WebGL 场景** — `js/main.js:492-503`、`js/game.js:529-533`、`css/style.css:501-523`
    - **这是什么**：`#bg3d` 在 `#screen-game` 内，而该屏非 active 时 `display:none`；idle 循环恰好只在它非 active（不可见）时调用 `bg.update()`，真正该看的时候（对局中 3D 版面）反而不更新。
    - **问题**（已实机）：主菜单停留时隐藏画布仍持续产生约 3.5k 次/秒 WebGL 绘制调用（10 分钟 ≈ 20 万次），纯耗电/发热；且场景在启动时按隐藏画布尺寸（`clientWidth||200`）测量，`js/backgrounds/StageBackground.js:40-46`，只有窗口 resize 才修正。
    - **修法**：删除 idle rAF 循环（2D 兜底路径本就由游戏循环驱动），并在屏幕激活时触发一次 resize。
    - **不修的后果**：玩家停留最久的菜单界面持续空转 GPU。

12. **Nomiss 的“回滚到进章状态”漏了连击与编辑度** — `js/gameCombat.js:421-441`、`js/chapterFlow.js:115-125`
    - **这是什么**：Nomiss 快照只回滚 score/baseScore/extend/lives/bombs/unstable，不回滚 `game.combo`/`comboTimer` 与 `player.edit`；`startChapter` 也不重置它们。
    - **问题**：带着 20 连击被弹后自动重开，重开后的击杀仍吃到上一轮 ×1.2 连击倍率（最多 3 秒），编辑度也继承失败尝试——与注释/说明书宣称的“该次尝试作废、回滚到进章时状态”不符。
    - **修法**：快照增加 `combo`、`comboTimer`、`player.edit` 三项并在重开时恢复。
    - **不修的后果**：模式契约不成立，分数略被抬高。

13. **可删的死代码与“仅测试用”导出** — `js/collision.js:132-172`、`js/patterns.js:213`、`js/sprites.js:71`、`js/sprites.js:198`、`js/config.js:68-69`
    - **这是什么**：`rebuildBulletLists`/`game.bullets` 兼容分支只有测试在走（运行时没有任何地方写 `game.bullets`）；`player._shotCount` 只写不读；`getSpritePathMap`、`PLACEHOLDER_SPRITE_KEYS`、已废弃的 `TOUCH_SENSITIVITY` 别名都只为单条断言存在。
    - **问题**：约 45 行（含一条测试）需要永久阅读维护，且旧子弹合并表暗示了一种并不存在的数据形状。
    - **修法**：删 `rebuildBulletLists` 与两处调用、`game.bullets` 分支（同步改 `test/cases-collision.js`），删无用导出/字段/别名。
    - **不修的后果**：后来者持续误判“合并子弹表”仍是活路径。

### Nice to have

14. **`/api/versions` 的 branch/env 过滤在固定小量抓取之后才执行** — `functions/api/versions.js:59-95`、`functions/api/versions.js:120-139`
    - **这是什么**：先只抓 `maxNeeded*2` 条原始部署，再在内存里过滤分支/环境。**问题**：目标在第 2 页之后的查询永远查不到（mock 验证：`?branch=feature-x&limit=5` 只请求 1 页，返回 `count:0`，实际存在）。**修法**：过滤后不足再翻页，或把过滤下推给 CF API。**不修的后果**：文档化查询参数会安静地给出错误结果（仓库内暂无调用方使用）。
15. **`eye`/`giantSeal` 生成的 CanvasTexture 在场景重建时不释放** — `js/bg3d/kit.js:1075`、`js/bg3d/kit.js:1271`、`js/bg3d/stage3d.js:649-680`
    - **这是什么**：这两个纹理没有登记进 `ownedTextures`，而 `_clear()` 出于共享缓存约定不释放材质 map。**问题**：s2/s3/patrol/a5 每次场景重建泄漏 1–2 张 256×256 纹理（每张约 0.3 MB GPU），一局 11 次切面会累积。**修法**：像 `plateCrop` 一样登记，或对非缓存纹理释放 `material.map`。**不修的后果**：跨局 GPU 内存缓慢增长。
16. **`scene.environmentIntensity` 跨场景泄漏** — `js/bg3d/scenes/a4.js:136`、`a5.js:303`、`a6.js:311`、`js/bg3d/stage3d.js:675-680`
    - **这是什么**：A4/A5/A6 设置 0.62/0.74/0.68，`_clear()` 唯独不重置这个值。**问题**：打完 A 线（0.68）回菜单再开新局，s1/EX 场景不设置它，IBL 亮度沿用 0.68，全程暗约 30%。**修法**：`_clear()` 里加一行 `this.scene.environmentIntensity = 1`。**不修的后果**：同一页面会话里光照随上一局结束位置漂移。
17. **菜单重复的 e2e 用固定 sleep 断言时序** — `test/e2e/menu.spec.js:413-419`
    - **这是什么**：150 ms（必须小于 350 ms 首延迟）后断言只走一格，再 450 ms。**问题**：CI 卡顿 ≥200 ms 就会让正确构建假失败，单 worker 全量套件要重跑 14–16 分钟。**修法**：用 Playwright `page.clock` 假时钟或范围断言。**不修的后果**：合并门禁偶发假红。
18. **pre-commit 的 amend 跳过分支从不生效** — `.githooks/pre-commit:9-18`
    - **这是什么**：用 `$GIT_REFLOG_ACTION = "commit (amend)"` 判断 amend 以跳过 VERSION+1。**问题**：临时仓库实测该变量在 pre-commit 中为空（普通提交与 amend 都为空），`git commit --amend` 会再 +1，与 AGENTS “amend 不自动 +1” 相反，叠加 PR 时制造 `js/version.js` 冲突。**修法**：改在 `prepare-commit-msg` 里跳过 `$2=commit` 且 `$3` 非空（amend SHA）的情况。**不修的后果**：构建号虚增。
19. **一条永真测试断言** — `test/cases-bg3d.js:78`
    - **这是什么**：`assert(kit.MATERIAL_KINDS === undefined || true);` 位于“后处理管线与 PBR 环境 API 存在”用例里。**问题**：`|| true` 短路，删掉/改名 `MATERIAL_KINDS` 测试依旧通过，用例名承诺的覆盖不存在。**修法**：删除该行或断言真实契约。**不修的后果**：后人相信一个并不存在的检查。
20. **排行榜写盘失败仍表现为“已保存”** — `js/ranking.js:94-104`、`js/scoreRanking.js:70-74`
    - **这是什么**：`commitRankingEntry` 忽略 `saveRanking()` 的布尔返回值，面板总是关闭。**问题**：存储满/隐私模式阻断写入时条目与昵称静默丢失（只有全局 4.5 秒 toast 提示），玩家以为成绩已入榜。**修法**：返回写盘结果，失败时在成绩排行面板内提示并保留面板。**不修的后果**：偶发的玩家最高分静默丢失。

---

## 修复优先级

1. #1 与 #21（移动端内存/GPU：2 GB 音频 + 每局 130–160 MB 阴影泄漏），以及同族 #22/#24/#26
2. #2–#4（回放与输入）+ #28–#31（章节内容错误），普通游玩会踩
3. #7–#8（门禁，决定后续回归会不会被静默放行）
4. #5–#6、#9–#12（体验/一致性）、#42–#45（热路径成本，高刷设备翻倍）
5. #13（清理）、#14–#20（低风险）

## Lean

**可减约 45 行、0 个依赖**（见 #13）：`rebuildBulletLists` + `game.bullets` 分支、`_shotCount`、`getSpritePathMap`、`PLACEHOLDER_SPRITE_KEYS`、`TOUCH_SENSITIVITY` 及对应仅测试用代码。仓库唯一依赖是 devDependency `@playwright/test`，无需移除。

## 未检查 / 边界

- ⚠️ 未跑 Playwright e2e（本机无 Chromium；e2e 结果来自代码审查，结论 #7/#17 未实测）。
- 未逐行审计 202 个章节脚本：只做了数据校验（id 唯一且 1–202 / EX 129–202、music/bg/stage 映射全部可解析、每种 stage 的 mid/boss 模式齐全）与 `_shared`/`archetypes`/`ex_shared` 通用层；各章逐帧弹幕逻辑未审。
- 未细读：`js/bg/atoms.js`（891 行）、大部分 `js/bg3d/scenes/*` 构建器、`js/backgrounds/*`、4595 行 CSS 全文、`docs/` 既有文档、`tools/bg-assets`、`tools/to-avif*`。
- 未验证 Cloudflare Dashboard 变量与线上 ruleset 实际配置；`/api/versions` 的线上缓存行为未实测。
- 运行验证只在 Android WebView 竖屏 + 本地 HTTP 环境做过；横屏实机、桌面浏览器、真实慢网络下的表现未测。
- 复现探针：临时复制页 `.audit-probe.html`（注入 `decodeAudioData` 计数）与 WebViewProbe 会话已在测试后删除/重置；仓库跟踪文件无改动。

## 第二轮运行验证（补充）

同一 WebViewProbe 会话中，用页面内原型钩子（`Game.prototype._bindUI` 记录实例）拿到 `Game` 后直接 `game.start(...)`，并用 `owDebug.set({invincible:true})` 防止测试期间意外 Game Over；同样未改任何仓库代码。结论：

- **#12 Nomiss 回滚不完整（已确认）**：`_nomissSnapshot` 的键只有 `[unstableFx, score, baseScore, extendCount, lives, bombs]`；被弹重开后 score 按文档回滚（1234→0），但 `combo=25`、`comboTimer=3`、`player.edit=60` 原样保留，重开后的击杀继续吃上一轮连击倍率，与“该次尝试作废”不符。
- **#6 冲突键位（已确认）**：按设置页同一条写入路径把 `{shot:'KeyZ', bomb:'KeyZ'}` 写进 `gunwei_keys` 并 `reloadKeys()` 后，一次 Z 按下同时 `shotHeld` 与 `bombPressed` 为真；350 ms 内 Bomb 4→3、射出 63 发子弹（55 普通 + Bomb 巨弹）——一次按键同时开火与消耗 Bomb。仓库内无按键冲突校验；暂停菜单改键也不会对当前局生效（`reloadKeys` 仅在下一次开局调用）。
- **#4 后半（已确认）**：`openScoreRanking` 打开后把真实焦点放到「取消」按钮（`document.activeElement.dataset.srAction==='cancel'`），派发 Space：全局 `preventDefault` 生效，随后面板关闭并**写入** `gunwei_ranking`（score 1234）与 `gunwei_ranking_name`——键盘用户选择“取消”却保存了成绩。

⚠️ 复现要点：本机为竖屏 WebView，需先 `#app.inert=false` 且隐藏 `#rotate-gate` 才能原生聚焦按钮；测试后已恢复 `app.inert` 并清理 `gunwei_keys`/`gunwei_ranking` 测试数据，WebView 已 reset、本地服务器已关闭。

## 第三轮：全 202 章节运行冒烟（WebViewProbe）

方法：页面内原型钩子拿到 `Game` 实例后，对 `chapters` 里全部 **202** 个章节逐一执行 `game.start({startChapter:id, mode:'story', singleChapter:true, difficulty:'normal', lives:8})`；用 `owDebug.set({invincible:true, timeScale:3, skipDialogue:true})` 保持不死并加速；每章等到面间过渡/对话结束、内容开始后再采样 24 帧，检查：起始章节映射是否正确、是否仍在运行、`_chapterScriptError`、敌机/敌弹 NaN 坐标、Letter 计时不变量、是否意外 `gameover`、Boss 章是否已挂 `bossRef`。

结果：**202/202 章完成采样，0 异常**；每章采样后状态全部为 `playing`；**70/70 个 Boss 章在采样点均已设置 `bossRef`**；各面章节数 `1:6 / 2:8 / 3:8 / patrol:2 / A4:15 / A5:17 / A6:20 / B4:15 / B5:17 / B6:20 / EX:74` 与章节数据一致；无章节下标错位、无 NaN 坐标、无脚本异常、无 throw。说明“章节入口/构造/第一波次”这一层在当前代码状态下是干净的。

**边界**：每章只覆盖约 1.6 秒真实时间（timeScale 3 下约 4.8 秒游戏时间）的启动窗口；章节中后段的软锁、Boss 弹幕后期异常、超长道中未清、Letter 超时路径都未覆盖（需要更强的自动通关/逐章长跑，本次未做）。测试写入的 `gunwei_letter_rate` 等本地键已清理，WebView 已 reset、本地服务器已关闭，仓库无代码改动。

## 第四轮：渲染 / WebGL 深审增补（render-deep）

⚠️ 以下为子代理只读深审、主代理逐条回源码核对后确认的增补发现（编号接续 #20）。它们同属 GPU/内存生命周期问题，会与 #1 的 2 GB 音频叠加；本机 WebView 日志中已实际出现 `THREE.WARNING: Multiple instances of Three.js being imported.` 与 renderer gone 记录，可解释部分渲染进程回收现象。数值为按纹理/RT 尺寸估算的量级，未做 GPU 显存实测。

21. **Must — 每次背景 mode 重建泄漏一张 1024² 阴影贴图（约 8 MB GPU）** — `js/bg3d/stage3d.js:649-655`、`js/bg3d/kit.js:587-616`
    - **这是什么**：`_clear()` 对旧灯光只调 `l.dispose?.()`；THREE 的 Light 没有 dispose，阴影 RT 由 `light.shadow.map` 持有。`atmosphere()` 每次重建都新建 hemi/amb/dir/rim 四盏灯（dir 默认 `castShadow=true`、`mapSize=1024`），而全仓库没有任何 `shadow.dispose`/`shadow.map.dispose` 调用（grep 确认）。
    - **问题**：一次完整流程约 16–20 次 `setMode()`（每面 mid→boss + 换面），累计泄漏约 **130–160 MB GPU**；移动端长局叠加 #1 后，渲染进程更早被系统回收或触发 2D 回退。
    - **修法**：`_clear()` 里加 `l.shadow?.dispose?.()`（r185 的 `LightShadow.dispose()` 会 dispose map），或改为常驻灯光 rig、重建场景时复用。
    - **不修的后果**：GPU 显存随每次切面单调增长，长局/多局后移动端崩溃或掉 3D。
22. **Should — PMREM 环境缓存释放的是 render target 的 texture（对 RT 是 no-op），每次淘汰泄漏约 1.5 MB** — `js/bg3d/kit.js:441-462`、`js/bg3d/kit.js:342-359`
    - **这是什么**：`pmrem.fromEquirectangular(equirect).texture` 只保留 texture；淘汰时 `old?.envMap?.dispose?.()` 释放的是 RT 的 texture（无 dispose handler），真正分配 GL 资源的是返回的 WebGLRenderTarget。
    - **问题**：`ENV_CACHE` 上限 3，第 4 种 mode 起开始淘汰；一局约十几次淘汰 ≈ **20–27 MB** 且不可回收，页面级 `disposeEnvironment` 也一样。
    - **修法**：缓存里同时保存 `rt`，淘汰/销毁时 `rec.rt?.dispose?.()`（`rec.envMap = rt.texture; rec.rt = rt`）。
    - **不修的后果**：IBL 切换越多泄漏越大，和 #21 叠加。
23. **Should — `loadThreeModule()` 的 15 s 超时竞速会加载出多份 Three 实例** — `js/backgrounds/threeLoader.js:49-65`
    - **这是什么**：`Promise.race([import(url), timeout-reject])` 超时只是让 race 失败，**无法取消 import**；循环转去下一个镜像（不同 URL = 新实例），先发晚到的 import 仍会求值，触发 `window.__THREE__` 重复检测——实机日志里已出现该 warning。
    - **问题**：慢网冷启动时可能同时驻留 2–3 份 Three 模块命名空间（JS 堆 + 各自 GPU），且晚到实例永远不会被 `setThree()` 使用；极端情况下实际已加载成功却仍报“Three 不可用”。
    - **修法**：入口先 `if (getThree()) return getThree();`，并用单个 `_loadPromise` 复用进行中的加载；超时预算交给 `main.js` 现有的 recovery UI，而不是放弃仍可能成功的 import。
    - **不修的后果**：慢网下内存翻倍与启动状态误报。
24. **Should — `clearKitTextureCache()` 没有任何运行时调用方，约 40–50 MB 共享 GPU 纹理整会话不释放** — `js/bg3d/kit.js:328-339`、`js/bg3d/stage3d.js:663-667`
    - **这是什么**：plate 纹理（s1/a4/a5/a6/ex 五模）、12 类 PBR 材质贴图、染色 matTex 都只增不减；`clearKitTextureCache()` 只有定义和一条“由它统一管理”的注释，grep 全仓库无调用。
    - **问题**：一局跨到 A 线/EX 后回到菜单，约 **40–50 MB GPU** 纹理仍被页面持有；再叠加 #21/#22 后移动端余量被吃满。
    - **修法**：在 `PlayfieldStage3D.dispose()`（真正放弃 3D 舞台/回退 2D 时）调用 `K.clearKitTextureCache()`；章节切换仍不释放（保持现有防黑纹理策略）。
    - **不修的后果**：GPU 缓存只涨不跌，长时间页面会话越发危险。
25. **Should — WebGL context 丢失后永久降级 2D，且代码里的恢复路径实际不可达** — `js/playfieldBg.js:83-84`、`js/playfieldBg.js:146-165`、`js/bg3d/stage3d.js:268-288`、`js/bg3d/stage3d.js:793-819`
    - **这是什么**：`onContextLost` 立即 `_fallback2d()` 并 `dispose()` 旧舞台，`dispose()` 移除了 `webglcontextlost/restored` 监听，因此 `_onRestored` 的“重建场景”分支永远等不到事件；非 context-lost 的回退（连续 draw/update 抛错）只隐藏画布，健康 WebGL context 仍活在 DOM 里。
    - **问题**：Android 切后台/显存压力触发 context lost 后，本次会话永久 2D，没有左侧印象场景那种“重试 3D”入口；另一种回退则白留一个 context 占资源。
    - **修法**：context lost 时先保留舞台等 `webglcontextrestored`（带 1–1.5 s 超时再回退）；确定回退时调用 `renderer.forceContextLoss()` 并移除画布。
    - **不修的后果**：一次上下文丢失就永久降级且不释放上下文。
26. **Should — 外围底材缓存用 Image 元素长期持有最多 11 张 1600×1000 解码位图（约 67 MB），实际只当布尔标志用** — `js/bg/backdrops.js:17-40`、`js/bg/backdrops.js:86-123`
    - **这是什么**：`cache` 里 `rec.img = img` 永不清除，而渲染实际走 CSS `background-image`；`rec.img` 只用于 `if (rec.img) reveal()` 的真值判断。
    - **问题**：完整流程访问 11 面后，11 张 1600×1000 解码图（≈6.4 MB/张）被 JS 引用钉住，浏览器无法回收其解码内存，纯属额外占用。
    - **修法**：onload 里记 `rec.loaded = true` 并 `rec.img = null`（失败标志保持不变），把判断改成 `rec.loaded`。
    - **不修的后果**：长局多占约 67 MB 位图内存，与音频/GPU 泄漏叠加。
27. **Nice — plate 素材晚到时 3D 场景不会补建，慢网首章缺少绘卷贴图** — `js/bg3d/kit.js:293-303`、`js/bg3d/stage3d.js:593-595`
    - **这是什么**：`plateTexture()` 在 AVIF 未加载时返回 null 且不缓存，场景 builder 静默跳过该贴图；`setMode()` 在 `sceneReady && next===mode` 时提前返回，素材到达后不会重建。
    - **问题**：`preloadPlayfieldBg()` 与菜单并行（`js/main.js:571-572`），慢网下玩家立刻开局的第 1 章会用缺失绘卷的裸 3D 构图，直到下一章 mode 切换才恢复。
    - **修法**：plate 预载完成后若当前 mode 构建时缺 plate，触发一次 `setMode(current, {transition:false})` 重建（与 2D 兜底“晚到素材重烘”行为对齐）。
    - **不修的后果**：慢网首章观感明显变差（仅视觉，不影响玩法）。

**第四轮阅读/边界**：子代理通读 `js/bg3d/stage3d.js`、`kit.js`（1397 行）、`cameraDirectors.js`、`playfieldBg.js`、`backgrounds/*`、`bg/{renderer,materials,particles,backdrops}.js`、`draw/*`；未逐行读全部 21 个 scene builder 与 `bg/atoms.js`（891 行，仅 grep + 抽样），上述显存数值为估算量级，未在 GPU 上实测，也未实机复现 context lost。

## 第七轮：热路径性能深审增补（hotperf-deep）

⚠️ 子代理用 Node + 真实模块 + `test/mockGame.js` 模拟高密度场景（A5 mid #43 峰值约 945 发敌弹、stage-3 boss 稳态 548 发、628 发基准场景），并用 no-op 插桩 `CanvasRenderingContext2D` 量 JS/绘制调用开销；主代理回源码核对。**注意：所有数值是 JS/Canvas 调用侧成本，不含光栅化；本机为 ARM 设备，非目标手机实测。** 增补发现（编号接续）：

42. **Should — 每颗 rice/talisman/laser 每帧重建模板字符串 cache key + `Map.get`** — `js/draw/bulletDraw.js:88,160,184`、`js/draw/drawUtils.js:109-114`
    - **这是什么**：`const key = \`rice|\${b.w}|\${b.h}|\${col}|\${col2}|\${grazeFx?1:0}\`` 每帧对每颗弹重新拼字符串并哈希；除 `grazeFx` 外参数对单颗弹是不变的，却每帧重算。
    - **问题**：628 发场景实测 **0.651 ms/帧纯 JS**（去掉弹幕 0.003 ms），945 发峰值外推 ~0.95 ms/帧；同时 ~35k–57k 新字符串/秒 的 GC 压力。实测“对象上缓存 entry”比“每帧 key+Map.get”快 25–40×。
    - **修法**：把 sprite entry 缓存在弹对象上（`b._spr` 存 grazeFx 两态，翻转时重算）；`softGlow` 同理。**不修**：密弹/高刷下持续吃主线程与 GC。
43. **Should — 一次清屏最多 315–480 个道具，每个都分配颜色对象 + `shadowBlur` + `font` + `fillText`** — `js/draw/itemDraw.js:3-43`
    - **这是什么**：`drawItem` 内每次调用新建 `colors` 对象，并对每个道具设置 `shadowBlur`、`font`、`fillText`（P/L/B 字样）。
    - **问题**：Bomb/Miss 全屏清弹在 945 发峰值掉 ~315 个道具，Miss 后道具 4–7 s 不被吸引：约 **1.89 万次文字光栅/秒 + 1.89 万次对象分配/秒 + ~5000 canvas 调用/帧**（480 上限时）。
    - **修法**：`colors` 提到模块常量；5 种道具（含 attract 光晕）预渲染成离屏 canvas，只 `drawImage`。**不修**：清屏瞬间明显掉帧。
44. **Should — 自机弹没有 sprite 缓存：每发每帧 `shadowBlur=14` + 新建线性渐变 + 两次 ellipse** — `js/draw/bulletDraw.js:452-471`
    - **这是什么**：主弹（默认按住射击：5 发/50ms = **100 发/秒**）绘制路径走 `shadowBlur` + `createLinearGradient` + 两 ellipse；同函数的 rice/talisman 已有离屏缓存，自机弹反而没有。
    - **问题**：实测 42 发主弹存活/帧 → 42 个渐变/帧、~2520 次带模糊的椭圆填充/秒，外加 save/translate/rotate/restore；Android WebView 上 shadowBlur 会强制逐次模糊光栅化。
    - **修法**：按自机两色预渲染一张 shot sprite（渐变+辉光烘焙），只 `drawImage` + 现有透明度。
45. **Should — 默认绘制上限是“无限制”，高刷手机把整套绘制每秒多跑 1.5–2.4 倍** — `js/config.js:84-89`、`js/game.js:519-527`
    - **这是什么**：默认 `fpsLimit: 0` 表示不限制绘制，仅当 `cap > 0` 才节流；逻辑固定 60 Hz。
    - **问题**：90/120/144 Hz 设备默认把全部 draw-path 成本（#42–#44 + 敌机/道具/背景）乘 1.5–2.4×，且 3D 版面背景也按 rAF 渲染；画面与 60 Hz 无信息量差异。
    - **修法**：`DEFAULT_SETTINGS.fpsLimit` 默认改 60（滑条仍可 24–240 或“无限制”手动放开）。
46. **Nice — 绘制期重复用 `Math.hypot` 计算擦弹距离，而碰撞同帧已算出精确 dist²** — `js/draw/drawUtils.js:55-67`、`js/collision.js:284-296`
    - **这是什么**：`isEnemyInGrazeRange` 对 rice/talisman 每帧重算 `Math.hypot`；talisman 还每帧重算常量 `hypot(w/2,h/2)`。碰撞侧已算过 dist²/hitSum² 但未保存。
    - **问题**：538 rice + 399 talisman 场景 → **858 次 hypot/帧 ≈ 5.15 万次/秒**（实测 1000 次 ~31 µs，约 27–43 µs/帧纯 JS）。
    - **修法**：`runCollisions` 顺手写 `b._dist2`、`Bullet.reset` 存 `b._grazeReach`；绘制侧改成比较平方值。
47. **Nice — 每颗弹都走 `save/translate/rotate/restore`，非旋转弹型其实不需要变换栈** — `js/draw/bulletDraw.js:412-417,487`
    - **这是什么**：628 发基准场景实测每帧 save/restore 各 737、translate 720、rotate 662（约 **17.4 万次/秒**），945 发峰值约 4300–4600 次/帧；dot/medium/large/option/bomb 本可绝对坐标 `drawImage`。
    - **修法**：非旋转类型直接 `ctx.drawImage(entry.canvas, b.x-pad, b.y-pad)`，只给 rice/talisman/laser 保留变换栈。
48. **Nice — 战斗期每帧 DOM 写入：Boss 标记 `style.left` + HUD 分数节点** — `js/gameDraw.js:54-56`、`js/hud.js:184-189`
    - **这是什么**：Boss 战每次绘制都写 `style.left`（隐藏时也每次 `classList.add`）；分数滚动期每帧改 `score/scoreDetails/scoreCompact` 文本与 title。
    - **问题**：默认不限帧下 Boss 战 60–120 次 style 失效/秒、滚动期约 240 次 DOM 变更/秒；与触屏 `getBoundingClientRect()`（`js/input.js:174`）同帧时可能触发强制布局。
    - **修法**：Boss 标记缓存 pct/hidden 仅变化时写；HUD 分数文本按 ~30 Hz 或仅在 compact 字符串变化时写 title。
49. **Nice — 每只敌机每帧新建径向渐变光环 + 圆形裁剪贴图 + shadowBlur 描边** — `js/draw/enemyDraw.js:32-52`、`js/sprites.js:144-176`
    - **这是什么**：敌机底层光环用 `createRadialGradient`；贴图经 `save/clip/drawImage/restore` + `shadowBlur` 光晕。
    - **问题**：15–28 只敌机时约 780 次渐变分配/秒 + 780 次 clip（Skia 较贵）；与 #42 同属绘制期无缓存分配。
    - **修法**：光环/圆形遮罩按 size/颜色预渲染成 sprite（弹幕已有 `softGlow` 模式可复用）。

**第七轮边界**：仅 JS/Canvas 调用计数，无真实光栅/GPU 计时，也不是目标手机实测；模拟场景为近似实战数量级，修复前建议先用 `?bgscale`/真机 Profile 复核。热路径未发现新的 Must 级正确性/数据丢失问题，均为主线程成本与高刷放大项。

## 第五轮：章节内容深审增补（stages-a + stages-b）

两个子代理分别通读 A 线（s1–s3/patrol/a4–a6）与 B 线（b4–b6/EX）全部章节脚本并做了只读 Node 全章模拟；主代理逐条回源码核对。增补发现（编号接续）：

28. **Should — 章节 15（3-1 激光与大玉）是 `kind:'mid'` 却挂 `bossRef`，超时=失败、击杀=提前结束，且无 midboss 掉落/擦弹加成** — `js/stages/s3_dazong.js:19-38`、`js/stages/s3_dazong.js:193`、`js/chapterEnd.js:54-77`、`js/gameCombat.js:101`、`js/gameCombat.js:530-536`
    - **这是什么**：该章用 `pushBossRef(g, {…'防火墙节点'…}, script, 'elite')` 生成精英并设置 `bossRef`，但章节元数据是 `kind:'mid', duration:26`；而 `evaluateChapterEnd` 对 `hasBossRef` 的限时章只有两种结局：超时 `durationBossFail`（失败）或击破 `bossDefeated`（成功）。
    - **问题**：撑过 26 秒不打精英 → 章节失败、无 Perfect/NMNB/Letter；正常输出把它打死 → 章节立刻结束，设计中的 26 秒大玉雨阶段被截断；又因为 `kind:'mid'`，`defaultKillDrop` 不给 midboss Bomb，整章擦弹按 `bossRef` 吃到 ×2 编辑度。同文件相邻章 `chapter_s3_6` 有注释明确“非 midboss：有 elite 但不挂 bossRef”，说明这里是漏改。
    - **修法**：照 `chapter_s3_6` 直接 `elite(...)+g.spawnEnemy` 不设 `bossRef`（到时成功）；若本意是击杀清章则把 `kind` 改成 `midboss`，让失败判定/Bomb 掉落/Boss-DPS 测试保持一致。
    - **不修的后果**：第 3 面固定流程出现“不杀是失败、杀了是提前通关”的矛盾，奖励与预期不符（无软锁）。
29. **Should — Nomiss 进度在 `winDialogue`/`routeCheck`/`routeSelect` 路径不保存，退出后回到已通关章节** — `js/chapterFlow.js:509-517`、`js/chapterFlow.js:540-576`、`js/chapterFlow.js:477-485`
    - **这是什么**：只有普通推进路径在启动下一章前 `saveNomissProgress(nextId)`；`nextChapterOrEnd`（winDialogue 后）、`afterStage3`（routeCheck 后）、`chooseRoute`（routeSelect 后）都直接 `chapterIndex++` + `startChapter`，没有落盘。
    - **问题**：Nomiss 通关 A4 终章 39（`winDialogue:'a4_win'`）后进入 40，此时持久化的下一章仍是 39；在 40 中途退到菜单再进 Nomiss，会重打已经通关的 39。第 22 章（`onClear:'routeCheck'`）与巡查 24 章（`onClear:'routeSelect'`）同理，可能回退到 22/24 重打。
    - **修法**：在 `startChapter` 开头（`game.mode==='nomiss' && !game.replaying`）统一 `saveNomissProgress(ch.id)`——当前章永远是正确续接点，也覆盖章中退出；或在这三条路径补保存。
    - **不修的后果**：进度回退，玩家被迫重打已清 Boss。
30. **Should — B5 第 97 章 filler 敌机初速朝场外，约 0.6 秒后飞出屏被判死** — `js/stages/b5/mid.js:161-170`
    - **这是什么**：偶数波补位机生成在 `x=-20 / 470`（依 side），速度写成 `filler.vx = -side * 3.0`，方向朝场外；主敌靠 `reverse` 计时器（1.2s，但首帧立即触发）把速度翻回场内，filler 没有 reverse。
    - **问题**：第 97 章 `wave=2,4,…,16` 的补充敌机约 0.62 秒、x≈512 时被判屏外死亡，只打出出生帧 2 发弹就消失——该章一半波次的“推退拉锯”补位等于不存在（无异常、无日志）。
    - **修法**：`filler.vx = side * 3.0;`（只改这一处；不要改主敌 `e.vx` 符号，否则主敌 reverse 首帧后会朝外 1.2s）。
    - **不修的后果**：章节内容缺失但难以察觉（难度/演出与设计不符）。
31. **Should — B5 第 97 章 ring 攻击把对象当“发数”传入，每帧生成 0 发弹** — `js/stages/b5/mid.js:153-155`、`js/patterns.js:124-131`
    - **这是什么**：`spawnRingAt(gm, en.x, en.y, { n: 8, speed: …, color: …, type: 'dot' })`——第 4 参应是数字 `n`；`scaleBulletCount` 内 `Math.round(对象)=NaN` → `ring(NaN)` 循环 0 次。
    - **问题**：第 97 章敌机每 0.7 秒的 ring 攻击完全不存在，且不抛错、无日志，全难度一致；由 `852127c` B5#97 重构引入。
    - **修法**：改为 `spawnRingAt(gm, en.x, en.y, 8, 1.6 + Math.random() * 0.4, 'dot', '#fdba74');`
    - **不修的后果**：该章弹幕密度低于设计，难度曲线出现空洞。
32. **Nice — 敌机向上飞出屏幕后永不剔除，成为不可见狙击源** — `js/entities.js:453-458`、`js/stages/b5/mid.js:148`
    - **这是什么**：`Enemy.update` 的屏外剔除只有 `y > H+60 || x < -80 || x > W+80`，没有上边界；第 97 章 `e.vy = Math.sin(wave*1.3)*0.6` 在 `wave=3,4,8,9,10` 为负，敌机升到 y<0 后仍存活并继续 `spawnAimed`。
    - **问题**：玩家会被屏幕上方看不见的敌机持续自机狙；同时 `livingEnemies` 恒真，`wavesClear` 无法提前收章（只能等 duration 到点）。其余章节是否触发同类需逐个看 vy/脚本。
    - **修法**：本章改 `e.vy = Math.abs(Math.sin(wave*1.3))*0.6`；或在 `Enemy.update` 增补 `this.y < -80` 剔除（注意别影响入场阶段与 Boss）。
    - **不修的后果**：不可见弹源影响可读性/公平性，章结束时机偏移。
33. **Nice — 章内计时器字段跨章/跨局泄漏：只重置 `rainT`/`laserT`** — `js/chapterFlow.js:84-85`、`js/stages/a4/mid.js:105`、`js/stages/a5/mid.js:149,232`、`js/stages/a6/mid.js:165,206,279`、`js/stages/b4/mid.js:167`、`js/stages/b5/mid.js:219,249`、`js/stages/b6/mid.js:131,218,275`
    - **这是什么**：各章用 `game.crossT / aimT / rainPhase / _a6Alt` 等挂在 Game 上的计时器，`startChapter` 只清 `rainT/laserT`，`Game.start` 也不清这些。
    - **问题**：如 B6 #114 结束留下 `aimT∈[0,0.6)`，经 #115–#118 后到 #119 首帧即越过 0.45 阈值，开章瞬间打出双侧自机狙激光（正常应 0.45s 后）；`crossT` 会让下章第一次横落提前最多 1.4s；重开同章同样受影响。
    - **修法**：`startChapter` 里统一重置 `game.crossT = game.aimT = game.rainPhase = game.wallT = game.gapTimer = game.aimTimer = 0; game._a6Alt = 0;`（或改成每章独立命名空间）。
    - **不修的后果**：跨章节奏漂移，回放/练习的章首几秒不可复现。
34. **Nice — 运行时死代码：`installWaveScript` 无运行时调用、3 个章节流簿记字段只写不读** — `js/stages/_shared.js:202-256`、`js/chapterFlow.js:78-83`、`js/chapterFlow.js:40`、`js/chapterFlow.js:206`、`js/game.js:398`
    - **这是什么**：`installWaveScript`（约 54 行多轨 runner）全仓只有定义与 `test/cases-stages.js` 5 条单测调用，`js/` 运行时零调用（104 个构建函数全走 `installMidWave`）；`_lastWaveCount`/`_waveStall` 初始化后零读写，`_lastEnemySpawnChapterTime` 仅 3 处写入、零读取。
    - **问题**：约 60 行 + 5 条测试永久维护成本；AGENTS.md 还把 `installWaveScript` 写成可用的道中 API，容易误导后续章节作者。
    - **修法**：删除 runner + 对应测试（同步改 AGENTS 该行）；删 3 个死字段与写入。若坚持保留 runner，在 AGENTS/文件头标注“预留未用”。
    - **不修的后果**：后人误用/误以为该路径仍活跃。

**章节深审的“干净”结论（可重复验证）**：两位子代理用真实章节数据在 Node 里模拟了全部 202 章的 `build → waveFn → 敌机脚本 → Bullet.update`（含 onSplit）：**A 线 76 章与 B/EX 126 章均 0 抛错、0 NaN 坐标/血量、0 缺 bossRef**；全 202 章 id 连续唯一、music/bg 映射全可解析、dialog/win/lose/ending 键两边自机都存在、无章节同时有 duration 与 letterTime；B 线/EX 的章节流端到端模拟到结局（77→91→92、109→128→结局 B、EX 129→202→EX 结局）均正常；Boss 限时理论 DPS 余量最低 4.28×（阈值 4.26×），不存在“必不可能击杀”的 Boss；stages 内无被禁的直接 `push`。

## 第六轮：持久化 / 回放 / UI 状态机深审增补（persist-deep）

子代理读完 `storage/replay*/ranking*/scoreRanking/settingsForm/history*/gameOverlay/main.js` 与 `ui.js` 相关流程，并用 Node 真实模块复现；主代理回源码复核。增补发现（编号接续）：

35. **Should — 中途改“单击发射”会被烘进录像头，回放开火语义整段错位** — `js/replay.js:223`、`js/input.js:140,394-420`、`js/game.js:238,729`、`js/gameOverlay.js:286-295`
    - **这是什么**：录像帧快照没有“本帧 shotToggleMode”字段，只有录像头一个全局 `shotToggleMode`（保存时取当前值）；而暂停→设置里改单击发射会经 `input.applySettings` 立即生效并继续录制。
    - **问题**：前 10 秒“按住发射”录完后，暂停开单击发射再继续并存盘：回放全程按“单击模式”解释，早期帧只有 `d:['KeyZ']` 而无 `l` 锁存 → `shotHeld()=false`，那一段完全不开火（反向情形则会在不该开火时开火）。弹幕/得分/敌机 DPS 全变，不是纯显示问题。
    - **修法**：帧 flags 增加 1 位（如 1024）“本帧是否单击模式”，`decodeReplayFrame`/`createReplayInput.set()` 按帧恢复；最小折中：录制中切换设置时提示“下局生效”，或保存时禁止中途改键模式。
    - **不修的后果**：录像与现场观感不一致，排障时误判。
36. **Should — “保存录像”没有“一次/进行中”防重，连按会写入多条重复录像** — `js/gameOverlay.js:316-327`、`js/game.js:721-760`
    - **这是什么**：按钮始终可点，`_saveReplay` 每次 `buildReplay` 都生成新 `replayId` 并整份写 IndexedDB + 索引；无 `game._replaySaved` 之类标记。
    - **问题**：暂停/结算界面双击或连按两次 → 列表出现两条相同录像，每条都占整份帧数据（长局 MB 级）；与 #40 的缓冲保留叠加更明显。
    - **修法**：保存成功后置 `game._replaySaved=true` 并在 action 分支早退/禁用按钮；失败可重试。
    - **不修的后果**：存储翻倍、列表重复，用户以为重复是 bug。
37. **Should — 打开录像失败是完全静默的** — `js/main.js:542-561`、`js/replayScreen.js:46-68`
    - **这是什么**：IndexedDB 记录缺失/被清/被禁用时，`onPlayReplay` 只 console.warn/error 然后 `ui.showReplayScreen()`；`showReplayScreen` 会重渲染列表并把 `#replay-status` 复位成“共 N 条录像”。
    - **问题**：玩家点一条坏录像 → 画面闪一下回到列表，没有任何错误提示，只能反复点；而同屏的导出/删除都会报错。
    - **修法**：失败回调里显式 `replay._setStatus('录像读取失败：本地录像存储不可用', true)`（必要时清理失效索引）。
    - **不修的后果**：坏索引无法自查，用户无法理解为什么播不了。
38. **Should — 结局对话期间退出会丢掉本可入榜的成绩** — `js/chapterFlow.js:603-646`、`js/gameOverlay.js:329-338`
    - **这是什么**：`showEnding` 先 `submitRanking`（暂存 `_rankingResult`）→ 再播结局对话；入榜真正落盘只发生在成绩排行面板点“保存”。结局对话里可按 Esc 暂停 → 主菜单，`menu` action 只存 hiscore，没有 `commitRankingEntry`。
    - **问题**：通关后结局对话中退出：hiscore 有、排行榜没有，成绩排行面板根本没弹过；下次 `start()` 丢弃 `_rankingResult`，这条 All Clear 成绩永久丢失。
    - **修法**：`menu` action 里若 `game._rankingResult?.qualifies` 先 `commitRankingEntry(..., loadName(...))` 再 stop；或把 submitRanking 预判挪到结局对话回调之后再执行。
    - **不修的后果**：玩家最高成绩静默丢失（与 #20 同类数据损失）。
39. **Nice — 练习结算“再试一次”丢掉本局配置的残机** — `js/gameOverlay.js:297-313`、`js/game.js:254`
    - **这是什么**：`keepLives` 只在 `overlayMode==='pause'` 时取值，结算重试传 `lives: undefined`；`start()` 于是回落到 `BALANCE.startLives`(4)，而练习开局可通过 `#practice-lives` 配置（`js/ui.js:94-102,828` 传入 start）。
    - **问题**：练习设 1 残，结束后点“再试一次” → HUD 变 4 残；而录像头仍记录原 `lives`，重试与回放不一致。
    - **修法**：`lives: game.mode === 'practice' ? game._startLives : keepLives`（`_startLives` 已存在正是为此）。
    - **不修的后果**：练习配置静默失效。
40. **Nice — `stop()` 不释放录制/回放缓冲，回菜单后仍占内存** — `js/game.js:464-474`
    - **这是什么**：`stop()` 只停输入/音乐/cancelAdvance/hideOverlay，`_recordFrames`、`_replayPlayer`、`replay` 要等下一次 `start()` 才重置。
    - **问题**：Node 实测 40 分钟对局约 14.4 万帧、保留约 **9 MB**（≈0.22 MB/分钟），加载大录像还有解码缓存副本；回菜单/排行榜/录像列表期间持续占用，也是 #36 重复保存昂贵的放大项。
    - **修法**：`stop()` 末尾（`_exitReplay/_restartReplay` 读完之后）清空 `_recordFrames=[]`、`_replayPlayer=null`、`replay=null`。
    - **不修的后果**：移动端空闲期内存压力与重复保存成本。
41. **Nice — History 刷新没有请求代际，旧响应会覆盖新响应** — `js/historyScreen.js:77-114`
    - **这是什么**：`load(force=true)`（刷新按钮固定传 force）允许并发请求，await 后无 token 校验，两个请求都写列表/状态。
    - **问题**：慢网下连续点两次刷新，若先发后到，旧结果覆盖新结果（列表/“共 N 次构建”/错误样式回退）。
    - **修法**：await 前 `const gen = ++this._loadGen;`，await 后 `if (gen !== this._loadGen || !this.isActive()) return;`。
    - **不修的后果**：偶发显示过期数据，用户重复刷新。

