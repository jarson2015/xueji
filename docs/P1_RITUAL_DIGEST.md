# P1 · Ritual N+1 与周汇总读路径外移

状态：**已落地**

## Ritual 周末回顾

- 新增 `GET /students/weekend-reviews`：一次返回家长名下本周回顾
- 仪式屏 `RitualTvView` 与 monitor lite 并行拉取，不再按孩子 N 次请求

## weekly_digest 结算

| 触点 | 是否结算 |
|------|----------|
| `GET /dashboard/monitor`、`summary` | **否**（已移除） |
| 孩子 `today`（非 lite） | 是 |
| 周报 `reports` | 是 |
| Cron `周六/日/一 06:05` 上海 | 是（`WeeklyDigestSettleScheduler`） |

幂等：流水 `PENDING:` → `SETTLED:`。
