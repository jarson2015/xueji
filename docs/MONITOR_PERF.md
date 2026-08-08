# Monitor 性能 · 全量 vs lite

## 水位演进（demo 2 孩，`bench-monitor.ts`）

| 阶段 | 全量 p50 | lite p50 | 说明 |
|------|----------|----------|------|
| 基线 | 196 ms | 139 ms | 洞察在读路径 |
| 第一轮 | 190 ms | 70 ms | lite 跳过洞察尾 |
| 第二轮 | 54 ms | 16 ms | 跳过 attachStreaks / 轻量任务统计 |
| **第三轮** | **50 ms** | **15 ms** | ETag 304 + 学生一次查出 |
| **PERF 基线（P0 前）** | **52.6 ms** | **15.9 ms** | 2026-08-08 本地 sqlite demo |
| **PERF P0–P2 复跑** | **51.7 ms** | **16.7 ms** | 不劣于基线；etag304 p50 ≈ 2.7 ms；索引 0039 + 批处理已落地 |

无变更轮询（`If-None-Match`）**etag304 p50 ≈ 2.2 ms**（跳过全部 DB）。

相关计划：[`PERF_P0_PLAN.md`](./PERF_P0_PLAN.md) … [`PERF_P6_PLAN.md`](./PERF_P6_PLAN.md)（首屏 lite → 补全量）。

## 第三轮改动

| 改动 | 说明 |
|------|------|
| `MonitorRevisionService` | 家庭 WS `emitToParents` 时 bump revision |
| `GET /dashboard/monitor` | 返回 `ETag`；匹配则原生 **304** |
| 前端 | `getWithMeta` + 轮询带 `If-None-Match`；304 保留本地态 |
| `listStudentUsersForParent` | monitor 入口一次查出学生，少一轮查询 |

## 服务端分段样例（`?timing=1`）

| 段 | 全量 | lite |
|----|------|------|
| core | ~45 ms | ~9 ms |
| hints | ~7 ms | — |
| total | ~52 ms | ~9 ms |
| **304** | | **~2 ms** |

## 复跑

```bash
cd apps/api
npx ts-node -r tsconfig-paths/register src/bench-monitor.ts
```
