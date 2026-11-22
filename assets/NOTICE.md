# 素材与授权说明（assets）

## 代码

项目代码（`js/`、`css/`、`test/`、`tools/`、`functions/` 等）以 **GPL-3.0-or-later** 授权，全文见仓库根目录 `LICENSE`。

本目录下的素材**不随代码 GPL 授权**，按以下说明分别处理。

## BGM（`assets/bgm/*.ogg`）

- 来源：**东方 Project 原作游戏音乐**（原作 BGM）。
- 著作权归 **上海爱丽丝幻乐团（上海アリス幻樂団 / Team Shanghai Alice）** 及原作曲者。
- 本项目将其作为**东方 Project 二次创作游戏**使用；本说明仅为如实标注来源，**不代表已获得上海爱丽丝幻乐团对原作音乐素材的单独授权**。

> 依据官方《東方Projectの二次創作ガイドライン》（2024-05-31 更新，https://touhou-project.news/guideline/ ）：
> 禁止事项中包含「スクリーンショット、プレイ動画以外のゲーム素材を使用、公開する行為」（使用 / 公开截图与游玩视频以外的游戏素材）。
> 原作 BGM 属于「截图、游玩视频以外的游戏素材」。若对外发布本游戏，**建议**将 BGM 替换为同人编曲、已获授权的音源，或就原作音乐使用方式单独联系上海爱丽丝幻乐团；不要将本目录内的原作音乐文件再用于其他项目。

## 立绘 / 背景 / 其余图像

- 来源：**AI 生成**、以及 **公有领域 / CC0 博物馆开放素材**（逐项见下；后者为原创作品的自由授权复制，不是东方原作素材）。
- 性质：东方 Project **同人创作素材**。
- 官方二次创作指南未对 AI 生成素材作特别禁止；仍须遵守一般条件：标明是东方 Project 二次创作、不损害原作形象、不冒充官方内容、不侵犯他人权利、不做指南禁止的其他行为。
- 立绘 / 背景不随代码 GPL 授权；如需复用请自行确认合规性。
- `bg/battle-print.avif`：2026-09-20 经本地 CPA Images API、`gpt-image-2` 生成的战斗外围印刷底材，原图 1536×1024；不是从东方原作提取的游戏素材。运行时使用 AVIF 压缩版本。
- `ui/pause-vine.avif`：2026-09-20 经 CPA Images API、`gpt-image-2` 生成藤蔓，提取透明轮廓并着淡青色后压缩；用于暂停与确认菜单装饰。
- `bg/difficulty-cathedral.avif`：经本地 CPA Images API、`gpt-image-2` 独立生成的暗哥特教堂彩窗底材，原图1536×1024，供难度选择页使用；不含原作提取素材。
- `ui/loading-bg.avif`：以项目内既有 AI 生成素材 `bg/difficulty-cathedral.avif` 为底，压暗、加暗角与颗粒后导出的 1440×900 开屏背景；不是从东方原作提取的游戏素材，也不包含 `参考/loading.png` 的像素。
- `ui/loading.avif`：项目内既有的 128×128 暗色纹理，仅作加载界面黑带与氛围层的材质叠加；不是从东方原作提取的运行时素材。
- `ui/petals-scroll.avif`：落花纹理。由 [FreeGameSprites — Cherry Blossom Petals](https://freegamesprites.com/en/assets/cherry-blossom-petals)（页面标注 CC0 1.0 / [Creative Commons Zero](https://creativecommons.org/publicdomain/zero/1.0/)）的 256×256 透明水彩素材裁出三片独立花瓣，重排为 512×1024 无缝纵铺纹理；源图与处理脚本不进入运行时，不是从东方原作提取的素材。
- `ui/player-placeholder.svg`：按用户要求以代码绘制的临时空白人形轮廓，不使用原作角色图像；此SVG随代码以GPL-3.0-or-later授权，选择页用CSS分别着淡青／淡紫。

- `bg/menu-washi.avif`：主菜单满幅纸墨底材。以 **《Chrysanthemums by a Stream》**（尾形光琳／乾山传，约 1715–30，克利夫兰艺术博物馆 1958.206.2，**CC0**，https://clevelandart.org/art/1958.206.2 ）为源，裁切取景后做暖金／和纸色阶映射、左侧和纸淡化与局部虚化（保证奶油色描边菜单文字可读）、纤维颗粒与暗角，导出 1600×1000 AVIF；不是从东方原作提取的素材。
- `bg/settings-ink.avif`：设置页暗色底材。以 **《God of Thunder (Raijin)》**（俵屋宗达工作室，17 世纪中，克利夫兰艺术博物馆 2004.86，**CC0**，https://clevelandart.org/art/2004.86 ）为源，做金→靛紫色彩矩阵、中心压暗、暗角与颗粒，导出 1600×1000 AVIF；与 `bg/difficulty-cathedral.avif` 同属暗色幻想底材族，不是从东方原作提取的素材。
- `ui/tendency-plate.avif`：版面内 A/B 倾向条的暗漆板底衬。以 **《Rough Waves》**（尾形光琳，约 1704–9，大都会艺术博物馆 44918，**Public Domain**，https://www.metmuseum.org/art/collection/search/44918 ）浪纹裁片为源，做深青绿双色调、叠加暗漆底与上下金线、四边羽化 alpha，导出 728×92 AVIF；源图与处理脚本不进入运行时（仅存于本地忽略目录），不是从东方原作提取的素材。
- `ui/scene-wipe-mask.avif`：本项目原创程序绘制的 256×256 周期基础 alpha 遮罩，不复制或逐点描摹原作纹理；白色 RGB 与上缘渐变 alpha 仅用于控制场景过渡透明度，图像下部为 alpha 255 实心区，左右边界在周期接缝处连续。该素材不是可见过渡背景，过渡期间实际可见图像始终来自下一场景背景。AVIF 使用 `Color` 与 `Alpha` 两路；透明外部为 alpha 0，渐变边缘保留 0–255 中间 alpha。


### 关卡背景素材（P6 绘卷 3D 舞台，2026-11-22）

- `bg/scene/*.avif`（11 张，900×1200）：版面 3D 舞台的 Billboard 绘卷贴图；`bg/backdrop/*.avif`（11 张，1600×1000）：战斗外围舞台底材；`bg/mat/*.avif`（8 张）：3D 场景材质（gold/ink/washi/wave/mist/cloud/grass/plum）。
- 全部由下列**公有领域 / CC0** 博物馆开放获取藏品经裁切、取景、双色调/主色映射、压暗、暗角与颗粒处理；不是从东方原作提取的游戏素材，也不含 AI 生成图。
- 处理可复现：`tools/bg-assets/fetch-sources.sh`（API 检索 + 下载 + 许可证核验）与 `tools/bg-assets/build-assets.sh`（ImageMagick/avifenc 全量命令）；源图与许可证证据仅在本地 `.scratch/bg-assets/`，不随仓库分发。
- 来源清单（`tools/bg-assets/sources.json` 为机器可读权威）：
  - **Chrysanthemums by a Stream** / Ogata Kōrin (Japanese, 1658–1716), with Kenzan (attr.) / c. 1715–30 or after / Cleveland Museum of Art 1958.206.2 / CC0 1.0 (Cleveland Museum of Art Open Access; API share_license_status = "CC0") / https://clevelandart.org/art/1958.206.2 / 用于 s3、a4、a5
  - **Moon and Autumn Grasses** / Tawaraya Sōtatsu / mid- to late 17th century / The Metropolitan Museum of Art 1975.268.60, .61 / Public Domain (The Metropolitan Museum of Art Open Access; API isPublicDomain = true) / https://www.metmuseum.org/art/collection/search/48923 / 用于 s1、mat/gold、mat/grass
  - **Splashed-Ink Landscape** / Bokushō Shūshō / early 16th century / The Metropolitan Museum of Art 2015.300.55 / Public Domain (The Metropolitan Museum of Art Open Access; API isPublicDomain = true) / https://www.metmuseum.org/art/collection/search/53228 / 用于 b6、mat/ink
  - **White Plum Blossoms and Moon** / Itō Jakuchū / 1755 / The Metropolitan Museum of Art 2015.300.213 / Public Domain (The Metropolitan Museum of Art Open Access; API isPublicDomain = true) / https://www.metmuseum.org/art/collection/search/53408 / 用于 a6、mat/plum
  - **God of Thunder (Raijin)** / Tawaraya Sōtatsu workshop / mid-17th century / Cleveland Museum of Art 2004.86 / CC0 1.0 (Cleveland Museum of Art Open Access; API share_license_status = "CC0") / https://clevelandart.org/art/2004.86 / 用于 s2、patrol、ex
  - **Rough Waves** / Ogata Kōrin / ca. 1704–9 / The Metropolitan Museum of Art 26.117 / Public Domain (The Metropolitan Museum of Art Open Access; API isPublicDomain = true) / https://www.metmuseum.org/art/collection/search/44918 / 用于 a5、b4、ex、mat/wave
  - **Sudden Shower over Shin-Ōhashi Bridge and Atake (Ōhashi Atake no yūdachi), from One Hundred Famous Views of Edo** / Utagawa Hiroshige / 1857 / The Metropolitan Museum of Art JP2522 / Public Domain (The Metropolitan Museum of Art Open Access; API isPublicDomain = true) / https://www.metmuseum.org/art/collection/search/55433 / 用于 b5
  - **Fireworks at Ryōgoku Bridge, from One Hundred Famous Views of Edo** / Utagawa Hiroshige / 1858 / The Metropolitan Museum of Art JP642 / Public Domain (The Metropolitan Museum of Art Open Access; API isPublicDomain = true) / https://www.metmuseum.org/art/collection/search/37093 / 用于 a6
  - **The Torii Gate of Gion Shrine** / Unknown (Japanese, early 17th century) / early 17th century / The Metropolitan Museum of Art 60.164 / Public Domain (The Metropolitan Museum of Art Open Access; API isPublicDomain = true) / https://www.metmuseum.org/art/collection/search/45095 / 用于 s1、s3、mat/cloud
  - **Hell Scroll, Fire-Shaped Hell (火象地獄)** / Takeda Nobuo / Kaneko Kazuzō / Nissha Printing (reproduction publication) / 12th century original; modern reproduction / Wikimedia Commons (PD/CC0 reproduction of a Japanese National Treasure scroll) / CC0 1.0 (Wikimedia Commons extmetadata LicenseShortName = "CC0", License = "cc0") / https://commons.wikimedia.org/wiki/File:Hell_Scroll_%E7%81%AB%E8%B1%A1%E5%9C%B0%E7%8D%84.jpg / 用于 patrol、b4
- 逐文件映射与处理参数见各 stage 的 `usedIn` 字段；scene 与 backdrop 为同一 master 的竖/横取景，boss 观感差异由运行时调色而非另存素材。
- 授权合规：以上均为博物馆明确标注的 CC0 / Public Domain（Met Open Access、CMA Open Access、Wikimedia Commons PD 复刻）；素材随仓库分发不等于 GPL 授权，复用时请自行核对原始来源与许可。
## 通用二次创作条件（本项目遵守）

- 明确标注本作是 **基于东方 Project 的二次创作 / fan work**。
- 浏览器游戏按官方指南仅以 **免费游玩（free-to-play）** 提供；本项目当前无广告、无内购。
- 因二次创作产生的纠纷由创作者自行负责，上海爱丽丝幻乐团不承担责任。
