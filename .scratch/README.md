# .scratch — 调研产物（非运行时）

本目录是分析产物：不参与构建、不被 `js/` 引用、不影响运行时与测试。

外部来源获取、重跑方法、证据目录与降级说明见 [`docs/local-environment.md`](../docs/local-environment.md)（⚠️ 仅本机可复现）。

已入库文件（仓库内可直接查看）；调研事实卡与证据文档已归档到 [`docs/archive/evidence/`](../docs/archive/evidence/)（⚠️ 本机依赖）：

- 工具：`face-capture.mjs`、`face-difficulty.mjs`、`v3.py`、`thanm.c` / `thanm.h` / `reg.h` / `anmmap.c`
- 已提取数据：`th20-bullet-radii.json`、`th20-ecl-shots.json`
