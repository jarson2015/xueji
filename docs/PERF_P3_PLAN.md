# 学迹 · PERF P3（列表再减负 / 批确认并行 / 索引）

承接 P0–P2。不上 Redis/CDN。

| 项 | 做法 | 状态 |
|----|------|------|
| 学生 `myTasks` | 不拉 `task.steps`；排除 `day_archived`；`take 100`；步骤走 `GET /my/assigns/:id/steps` | 已做 |
| Monitor 软刷新 | 可见性 / keep-alive / 轮询默认 lite；`requestLoad(false)` 清掉 pending lite | 已做 |
| coach assigns | 仅 `skipDate >= 近7日` + 窄 select | 已做 |
| 迁移 **0040** | `wish_redeems(student,status,created)`、`task_assigns(student,status)` | 已做 |
| `confirmBatch` | 按学生分组：组间并发≤4，组内串行（积分竞态安全） | 已做 |

## 部署

- 迁移 `1740000000040-WishRedeemAssignStatusIndexes`
- 脏 sqlite：`npx ts-node -r tsconfig-paths/register src/apply-perf-indexes.ts`
- 护栏：`apps/api/src/common/perf-hotpath.spec.ts`

## 手测要点

1. 学生 Today 打开带步骤任务 → 抽屉出现步骤勾选  
2. Monitor 切后台再回前台 → 走 lite（Network 可见 `lite=1` 或响应更小）  
3. 多孩批量确认仍正确加减分  
