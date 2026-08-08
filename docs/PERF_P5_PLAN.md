# 学迹 · PERF P5（愿望/周报/洞察收窄 / 索引）

承接 P0–P4。不上 Redis/CDN。

| 项 | 做法 | 状态 |
|----|------|------|
| 家长愿望/兑换 | wishes `take:100`；redeems pending≤50 + 历史≤50 | 已做 |
| 周报 GET | 去掉读路径 `settleWeeklyDigest`；assigns 排除归档；checkins `take:400`；ledger 窄 select；`portfolioStats` 替代完整 portfolio；habit 按孩 `attachStreaks` | 已做 |
| `dashboard/progress` | 复用 `myTasksForStudents` | 已做 |
| Monitor insight | `loadInsightCheckins` 窄 select | 已做 |
| RitualTv | `/dashboard/monitor?lite=1` | 已做 |
| Push / WS | push `Promise.allSettled`；`checkin:created` 不推 `imageUrl` | 已做 |
| 迁移 **0042** | ledger / wish_items / gifts 复合索引 | 已做 |

## 部署

- 迁移 `1740000000042-LedgerWishGiftIndexes`（或 `apply-perf-indexes.ts`）
- `weekly_digest` 结算依赖 `WeeklyDigestSettleScheduler`（周六/日/一 06:05）

## 手测要点

1. 愿望页：待兑与近期历史正常  
2. 周报打开无写库延迟；作品集页仍完整  
3. 仪式屏用 lite；今日节奏页仍有  
4. 打卡后 Monitor soft 能补到图片  
