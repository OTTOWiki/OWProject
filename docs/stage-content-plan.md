# 关卡内容系统 — 改进方案（波次脚本 runner + 敌机原型表）

> 日期: 2026-10-05
> 参考: `~/Touhou20` 的 `gameplay/`（EnemyController / 实体 opcode）、`ecl_vm/`（通用指令 VM）、`scripts/recovered/ecl/`（**真实关卡内容**）、`audit/ecl_opcode_coverage.md`。参考仓库**全程只读**。
> 方式: **未改动任何运行时代码**。本文是方案。
> 配套: [`.scratch/stages-factsheet.md`](../.scratch/stages-factsheet.md)（我方规模与 TH20 量的实测事实卡）。
> 可信度标注：**[已核]** 我读过两侧实现/数据；**[impl]** 子代理读过 TH20 实现但该模块未经原 CPU 差分；**[cpu]** TH20 侧有原 CPU 差分记录。

## 0. 一句话结论

**做「加厚公用壳 + 限定描述表」，明确不做「类 ECL 迷你 VM」。**

TH20 为此付出的 23,760 条指令里，**36% 是栈压/弹、11.2% 是 rank 难度变体**（我们用 5 个倍率就覆盖了）；而它**根本没有"波次"抽象**（`common.ecl` 的 `WorldWave01` 用的 opcode 1010–1013 在原版分发表里指向默认返回，且无任何已恢复路径引用 `common.ecl`）。⇒ **我们在"波次"这一层已经比 TH20 更抽象**；缺的不是控制流，而是**片段重复的经济性**。

---

## 1. 现状量化（实测，非估计）

### 1.1 规模

| 指标 | 数值 |
|---|---|
| `js/stages/` | **36 文件 / 6,977 行**（最大 `ex_mid_32_61.js` 933、`ex_mid_0_31.js` 881） |
| 章节构建函数 | **104 个**，函数体合计 92,288 字符（中位 851） |
| `kind` 分布 | `mid` 61 / `midboss` 10 / `boss` 2 |
| 工厂调用（`(` 计数） | `midChapter` 79、`letterChapter` 70、`installMidWave` **121**、`installWave` 5、`setBoss` 6 |

### 1.2 【核心问题】片段重复，而不是整块重复

| 样板片段 | 出现次数 |
|---|---|
| `e.script = (en, d…` | **100** |
| `timer(en, …` | **386** |
| `spawnEnemy(e)` | **102** |
| `mob(` | **80** |
| `spawnAimed(` | **168** |
| `spawnRingAt(` | **100** |
| `Math.random` | **194** |

> 注：把整函数归一化后去重会得到「104/104 唯一」——**那是个误导性的度量**：整函数当然各不相同（内容本就不同），重复的是**片段**。本方案的判据以片段计数为准。

### 1.3 控制流高度规整（数据化的真实空间）

| `if` 条件（149 个） | 数量 | 能否表化 |
|---|---|---|
| 定时器/计数器阈值（`if (game.rainT > 0.2)`） | **77** | ✅ 本质是「到点开火」 |
| 波次取模/相位（`wave % N === N`） | **12** | ✅ |
| 样式枚举（`style === 'wall'`） | **12** | ✅（`style` 本就是数据） |
| 游戏状态查询 | 16 | 🔶 部分 |
| 其它 | 32 | ❌ 需留 JS 逃生口 |

| `for..of`（53 个） | 数量 |
|---|---|
| **固定字面量数组**（绝大多数 `for (const side of [-1, 1])` 左右对称） | **50** |

`timer()` 共 196 次，key 只有 27 种（`ring` 50 / `aim` 29 / `s` 26 …），**形状规整**；间隔值 39 个不同数值——正是「结构进表、数值留数据」。

### 1.4 现有抽象已经做到哪一步

`js/stages/_shared.js`（183 行）已提供 `mob` / `elite` / `boss`、`timer`、`scaleN`、`faceDefaults` / `midChapter` / `letterChapter`、**`installMidWave`**、`pushBossRef`。

**`installMidWave`（`_shared.js:147-162`）的关键语义**（改动前必须理解，否则会踩）：
- `continuous` **先** tick，再 `onWave` 门控（避免辅压被 early-return 卡住）；
- **只传 `continuous`** 时**不推进 `waveCount`** —— 这是为了不误触发 `wrapWaveFn` → `wavesExhausted`（曾导致「打死精英提前清章」）；
- `onWave` 收到的 `interval` 实际会被 `timer` 侧乘 `e._fireMul`（难度开火间隔倍率，`_shared.js:40-46`）。

---

## 2. TH20 侧的对照结论（决定"不做什么"）

| TH20 | 我们的对应物 | 结论 |
|---|---|---|
| 类 C 脚本 → 字节码；**无波次抽象** | `installMidWave` 的 `continuous + onWave` | **我们已更抽象，不必学** |
| `ins_23(n)` 按帧等待串接时间线 | `timer(en, key, interval, d, fn)` | **同一模型**，ECL 只是另一种写法 |
| 异步子程序（opcode 15 + Scheduler）＝"一条主轨 + N 条独立轨" | `Enemy.script` 本身即每实体一条独立轨（赋值 `entities.js:283`，每帧调用 `entities.js:393`） | 我们缺的是**章节级的 N 条轨** |
| rank 难度变体：2,256 条压栈指令（11.2%） | `config.js` 5 个倍率 + `spawnScale.js` + `game.js` 唯一入口 | **移植 rank 是倒退**（"难度该在哪改"会从 1 处变 N 处） |
| 每子程序固定 `ins_40`（3.1%）+ 栈管道（36.0%） | — | 编译产物，不是内容 |
| `default.ecl`（55 个子程序）＝通用件库 | `_shared.js` | **结构同构，无需改造** |

**TH20 真正值得借的只有一点：`ins_23` 串接能表达"章内非均匀节奏"，而我们的 `continuous` 只能手搓计数器绕路**（如 `b6/mid.js` 的 `game.rainT`）。这正是本方案的落点。

---

## 3. 方案：`installWaveScript` + 敌机原型表

### 3.1 runner 的 API 契约

新增于 `js/stages/_shared.js`：

```js
/**
 * 波次脚本 runner：把「章内 N 条独立时间轴」表达成数据。
 * 契约与 installMidWave 一致：写 g.waveFn；不替代 continuous 的逃生口。
 *
 * 语义（必须与旧代码逐帧等价）：
 *  - 每次 tick 先推进 frame，再按轨顺序执行本帧到期的 step（同帧多 step 全部执行）
 *  - 每条轨独立计时；loop 为 true 时该轨回到第 0 步并重置游标
 *  - **step.fn 的调用次数与顺序必须与迁移前完全一致**（见 §5 的 Math.random 硬约束）
 *
 * @param {object} g
 * @param {{
 *   tracks: Array<{
 *     loop?: boolean,
 *     steps: Array<{ wait?: number, fn: (g: object) => void }>
 *   }>,
 *   continuous?: (g: object, dt: number) => void,
 *   interval?: number, maxWaves?: number, onWave?: (g: object, wave: number) => void
 * }} spec
 */
export function installWaveScript(g, spec) { /* ~150 行 */ }
```

**设计要点**：
1. **复用现有 `g.waveFn` 契约**——`js/chapterFlow.js:164` `ch.build(game)` 之后照旧 `wrapWaveFn(g, scaled)`（`:169-186`），runner **不碰** `wrapWaveFn`。
2. **`continuous` / `onWave` 保留**：把 `installMidWave` 的能力作为 runner 的一个退化形态（`tracks` 为空时行为等同），避免两套并存。
3. **保持 `_fireMul` 语义**：runner 内所有 `wait` 都要按 `e._fireMul ?? 1` 缩放（与 `_shared.js:43` 一致），否则难度开火间隔会漂。
4. **轨的粒度 = 一只怪一个 `e.script`**：这样每只怪的计时器仍保有**独立状态**（与旧代码一致）。**不要**把多只怪的 timer 合并进一条轨——那会改变相位。

### 3.2 敌机原型表

新增 `js/stages/archetypes.js`（~20 个描述符 / ~400 行）：

```js
export const ARCHETYPES = {
  aim:    { hp: 35, r: 14, vy: 1.1, color: '#fbbf24',
            fire: [{ wait: 0.45, pattern: 'spawnAimed', n: 2, parity: 'odd', type: 'dot', speed: 2.3 }] },
  ring:   { hp: 60, r: 14, vy: 1.0, color: '#fcd34d',
            fire: [{ wait: 0.6, pattern: 'spawnRingAt', n: 8, speed: 1.5, type: 'talisman' },
                   { wait: 1.8, pattern: 'spawnRingAt', n: 12, speed: 1.8, type: 'medium' }] },
  // …laser / cross / rain / spiral / wall / dual …
};

/** 原型 → e.script */
export function instantiate(archetypeId, overrides) { /* ~80 行 */ }
```

**每个原型 = 一只怪的完整开火表**，参数可被章节覆盖（`n`/`speed`/`spread`/`type`/`wait`）。
**逃生口**：原型表覆盖不到的特殊章，直接用 `tracks[].steps[].fn` 写 JS（`build(g)` 的 `raw` 逃逸口仍保留，见 `js/stages/stageContext.js:56-59`）。

### 3.3 迁移后的目标形态

```js
// 迁移前（a4/mid.js:15-30，~16 行）
export function chapter_a4_mid_1(g) {
  installMidWave(g, { interval: 0.7, maxWaves: 13,
    onWave: (game) => {
      const e = mob(40 + Math.random() * (LOGICAL_W - 80), -20, 35, '#fbbf24');
      e.vy = 1.1;
      e.script = (en, d, gm) => { timer(en, 's', 0.75, d, () => { spawnAimed(...); }); };
      game.spawnEnemy(e);
    } });
}

// 迁移后（~6 行）
export function chapter_a4_mid_1(g) {
  installWaveScript(g, {
    interval: 0.7, maxWaves: 13,
    onWave: (game) => spawnArch(game, 'aim', {
      x: rand(40, LOGICAL_W - 40), y: -20, hp: 35, vy: 1.1, color: '#fbbf24',
      fire: [{ wait: 0.75, n: 2, parity: 'odd', type: 'dot', speed: 2.3 }],
    }),
  });
}
```

---

## 4. 收益与成本

| 项 | 数值 |
|---|---|
| 预计行数变化 | **6,977 → 约 4,300–4,800 行（-30~38%）** |
| 新增一章的成本 | 从 ~28 行样板降到 **~6 行表行** |
| 新增代码 | runner ~150 行 + 原型表 ~400 行 |
| 迁移工作量 | ~121 处机械迁移，删 1,500–2,000 行 |
| 总工期估计 | **8–12 个工作日**（含逐章验证） |

---

## 5. 【红线】零观感变化的验证

### 5.1 唯一真实风险：`Math.random()` 的消费次数与顺序

我们不追求"输出看起来一样"，追求**逐帧状态完全一致**。基础已经具备，我核过：

- `js/game.js:219`：`this._rngNext = createRng(this._replaySeed)`；
- `js/game.js:575`：整帧逻辑包在 `withSeededRng(() => {…}, this._rngNext)` 内；
- 所以 stages 里 **194 处 `Math.random()` 全部消费同一条种子流**。

⇒ **如果为了"统一"把两次抽随机合并成一次（例如把 `x` 与 `vy` 的抽取合并），逐帧哈希会立刻失败——而那确实就是手感变了。** 这条要写进实现注释与 PR 说明。

### 5.2 主验证：黄金哈希 A/B（纯 node，可行）

基建已存在，我核过：
- `test/mockGame.js` 的 `createMockGame()` 提供**不启 Canvas / Audio / DOM** 的轻量 Game 替身（注释明文如此）；
- `test/cases-stages.js:202-226` 已有用极简假 `g` 直接驱动 `installMidWave` 的用例；
- `js/chapterFlow.js:164` `ch.build(game)` 之后由 `:169-186` 包装 `waveFn`（并把 `dt` 除以 `spawnMul`）。

**做法**：新增 `test/cases-stages-golden.js`
1. 逐章 `buildChapterList()` → 对每个有 `build` 的章，用 `createMockGame()` 建 `g`；
2. `withSeededRng` 注入**固定 seed** 的 `createRng`；
3. 跑 N 帧（建议 600 帧 = 10 秒），每帧对
   `{ enemies: [x,y,hp,type,dead,id], enemyBullets: [x,y,vx,vy,type], items, waveCount, wavesExhausted }`
   取规范化哈希，落 `test-results/golden-stages.json`；
4. 重构前后逐帧比对；**不等即失败**。
5. 覆盖范围：全部 21 个 mode 的章节（含 EX 62 个 pattern）。

**注意（否则基线不稳）**：
- `build()` 外还要驱动 `waveFn`（否则只测到一次初始刷怪）——用 `wrapWaveFn` 同等路径驱动；
- `Math.random` 在章内被 `timer` 回调调用，**必须让 mock 的 `dt` 步长与真实一致**（`LOGIC_FRAME_MS` 语义，`dt = 1/60`）；
- 若 mock 缺某个被章节读到的字段，补齐 mock 而**不要**改章节代码——否则基线就不代表生产。

### 5.3 辅验证：录像 A/B

重构前用真实游玩录一份 replay（含 seed + 输入快照），重构后回放，比对 `score` / 章完成结果 / `runStats` 输出。

### 5.4 不要当作证据的

`npm test` 通过、截图相似、e2e 冒烟（`test/e2e/game.spec.js`）**都不覆盖逐帧等价**，不能用来证明"手感没变"。

---

## 6. 迁移顺序（每批独立过哈希，可单独回退）

| 批 | 内容 | 为什么这个顺序 |
|---|---|---|
| **B0** | 只加 `installWaveScript` + 原型表骨架 + 单测，**不改任何章** | 零行为变化，可先合 |
| **B1** | 建**黄金哈希基线**，全部章节 before 快照 | 后续每一批都要比它 |
| **B2** | `ex_mid_0_31.js` / `ex_mid_32_61.js`：62 个 pattern、1,814 行、62 处调用 | **最均匀、收益最大、最易批量验证** |

> 状态（2026-11-08）：B0/B1 已完成；B2 进行中，EX 0–31 已迁移 42 个 aim/ring/fan/split 函数到 `archetypes.js`，其余 49 个 pattern 待迁移。黄金哈希已覆盖 spawn 帧号、敌机 script 开火与 600 帧最终状态。
| **B3** | `a4..b6/mid.js`（约 60 处），此时原型表已稳定 | 中等体量，逐文件提交 |
| **B4** | `s1/s2/s3`（`s1_alice.js` 的 `installWave` 试点） | 接通 `stageContext` |
| **B5** | 文档同步：`AGENTS.md` 的「新章节」配方、`docs/refactor-queue.md` | 文档与代码一致 |

**明确不动**：
- **Boss / Letter 的 `pushBossRef` + `timer` 内联脚本**（`ex_shared.js`、各 `letters.js`）——它们本质是 per-frame 状态机，`timer` 已经是正确抽象；
- **`continuous` 逃生口**——`docs/refactor-queue.md` 的 T06 修过「wave 早 return 卡住次级系统」，迁移时若把 `continuous` 塞进 `onWave` 门控就会**复发**；
- **两处 `Math.random()` 的合并**（见 §5.1）。

---

## 7. 明确不抄

| 项 | 证据 | 理由 |
|---|---|---|
| 类 ECL 迷你 VM（类型栈 / 跳转 / 插值器 / 异步调度） | `ecl_vm/vm.cpp:179-320`（75 通用 + 224 实体 opcode） | 我们的痛点是**片段重复**，它一个也不解决；引入全新 bug 面 + 调试器需求 |
| rank 掩码难度变体 | 2,256 条压栈指令（`ecl_json/*.json` 实测） | 已有倍率方案；移植会让难度入口从 1 处变 N 处 |
| ETEX 裸 word 指令表 | `enemy_shot.cpp:31`（11 个裸 word） | 我们 `Bullet` 有具名字段（`entities.js:20-70`），**明确更好** |
| x86 对象布局 / 函数指针直调 | `enemy.hpp:48-50`、`enemy_update.cpp:60-62` | JS 无意义且有害 |
| 原版「retire 后写已释放内存」 | `gameplay/ENEMY_ITERATOR_HAZARD.md` | 恢复工程都**故意不复现**，不要 bug-for-bug |
| ECL 二进制容器 / 可回编译约束 | SCPT/ECLH、`ecl_raw` 双形态 | 我们不需要"能回编译" |
| SSE 逐位精确 | `vm.cpp:18-21` | 我们的手感由自己的数字决定 |
| `common.ecl` / `WorldWave01` / opcode 1010-1013 | `audit/ecl_opcode_coverage.md:41-48`（指向默认返回） | 死代码，且我们已有更好的波次抽象 |

---

## 8. 存疑与未验证

1. **收益估计基于片段计数外推**，不是实测重构结果；B2 完成后应按真实 delta 重估总工期。
2. **原型表的 20 个描述符是我按现有 `timer` key 分布（27 种）归纳的**，具体划分需要在 B2 里对着真实 code 收敛——可能多于或少于 20。
3. **`spawnAimed` / `spawnRingAt` 的次数口径**：按 `name(` 计 169/101，按标识符计 260/120（含 `spawnAimedLaser` 前缀）。本文用「带 `(` 的调用」口径，结论不受影响。
4. **TH20 侧结论只到"存了什么数据/代码怎么写"**，不到"原版某关实际跑起来逐帧如何"——`README.md:11` 明确整局 1:1 验收仍在进行，`ecl_opcode_coverage.md:47-51` 明确静态覆盖不等于语义或整局一致。
5. **`common.ecl` 是否真死**：能证明（a）1010–1013 在原版分发表指向默认返回、（b）已恢复 C++ 全仓无引用；**未恢复的加载路径无法排除**。
6. 未评估本方案与 `docs/refactor-queue.md` 已完成项（T14 / E03 / E07）的**正交性**——迁移前应先确认没有半途的 `installWave` 试点会被覆盖。

---

## 9. 建议

**先做 B0 + B1**（约 1–2 个工作日）：runner 与黄金哈希基线都是**纯增量、零行为变化**，可以先合并；拿到基线之后再决定 B2 是否值得继续。
如果 B2 在 EX 62 个 pattern 上跑通且哈希全绿，再投 B3；**任何一批哈希红了就停下来定位，不要连批推进**——121 处迁移一旦连批，定位范围会是全库。
