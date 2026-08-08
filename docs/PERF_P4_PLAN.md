# 学迹 · PERF P4（列表 N+1 / 读路径副作用 / pending·计划收窄）

承接 P0–P3。不上 Redis/CDN。

| 项 | 做法 | 状态 |
|----|------|------|
| 家长 `listForParent` | 不拉 steps；`upgradeHint` 按孩 `batchStreaks`；编辑 `GET /tasks/:id` | 已做 |
| 学生 `myTasks` | 读路径去掉归档；`DayArchiveScheduler` 00:20；归档批量 `update` + 一次 rest 配置 | 已做 |
| Monitor pending | 窄 select 建映射；详情仅前 20 再 join | 已做 |
| `todayItemsForStudents` | QueryBuilder 按今日/未排期过滤，不拉全历史 items | 已做 |
| Today / 学生 Tasks soft | soft 不再扇出 order/goal/proposals；Tasks soft 只打 `/my/tasks` | 已做 |
| 手账评论预览 | `take` 上限；迁移 **0041** 索引 | 已做 |

## 部署

- 迁移 `1740000000041-PlanItemJournalIndexes`（或 `apply-perf-indexes.ts`）
- 护栏：`apps/api/src/common/perf-hotpath.spec.ts`

## 手测要点

1. 家长任务列表打开编辑 → 步骤仍在表单  
2. 关闭补卡家庭：次日凌晨后过期 daily 归档（或手动调 scheduler）  
3. Monitor lite 轮询 payload 更小（待确认积压时）  
4. Today 切后台再回 → Network 无多余 focus/goal/proposals  
