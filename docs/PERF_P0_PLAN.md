# 学迹 · 性能 P0（索引 + 热路径批处理）

承接性能规划；原则：不改积分 / rewardMode 语义；不上 Redis。

| ID | 项 | 状态 |
|----|-----|------|
| **P0.1** | `checkins` / `task_assigns` 复合索引（迁移 0039） | 本轮 |
| **P0.2** | `myTasksForStudents` 不拉 `task.steps`；排除 day_archived；每孩 ≤80 | 本轮 |
| **P0.3** | `confirmBatch` 批取 + policy 复用 | 本轮 |
| **P0.4** | `apps/web/nginx.conf` 与 deploy 样例对齐 auth limit_req | 本轮 |

## 基线（阶段 0，demo 2 孩，sqlite 本地）

`bench-monitor.ts`（2026-08-08）：

| 路径 | p50 | 备注 |
|------|-----|------|
| full | 52.6 ms | serverPerf hints ~47ms total |
| lite | 15.9 ms | |
| etag304 | 2.2 ms | |

## 验收

- 复跑 bench：lite/full/etag304 不劣于上表
- 批量确认语义不变（makeup 跳过、单条失败明细）
