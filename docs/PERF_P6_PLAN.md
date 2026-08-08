# 学迹 · PERF P6（Monitor 首屏 lite / summary 薄封装 / plans 收窄）

承接 P5 与安全审计「P5 之后」表。不上 Redis/CDN。

| 项 | 做法 | 状态 |
|----|------|------|
| Monitor 首屏 | `MonitorView` 挂载先 `lite`，再 schedule 全量补洞察 | 已做 |
| `/dashboard/summary` | 薄封装 `monitor(lite)` + `rewardMode`；UI 仍用 monitor | 已做 |
| `GET /plans` | 最多 30 个计划；items 仅未完成 / 无日期 / 近 14 天，每计划≤40 | 已做 |
| 周报 assigns | 已在 SEC P2b 窄投影 | 见 P2b |

## 手测

1. 家长看板：首屏较快出现孩子进度，片刻后洞察/公平提示补齐  
2. 60s 轮询仍走 lite；手动操作后仍全量  
3. 学生「我」页计划列表正常；很久以前的已完成项可不出现在列表（今日项不受影响）  

## 护栏

- `perf-hotpath.spec.ts`：`summary` 薄封装、`plans.list` 收窄  
