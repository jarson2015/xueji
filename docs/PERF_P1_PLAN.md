# 学迹 · 性能 P1（读路径收敛 + Cron）

| ID | 项 | 状态 |
|----|-----|------|
| **P1.1** | Monitor full 洞察合并 checkins 查询 | 本轮 |
| **P1.2** | Today 去掉读路径 `settleWeeklyDigest` | 本轮 |
| **P1.3** | Journal `familyMemberIds` 批查 | 本轮 |
| **P1.4** | auto-confirm Cron 空转退避加强 | 本轮 |

结算仍由 `weekly-digest-settle.scheduler` / 报告页显式触发。
