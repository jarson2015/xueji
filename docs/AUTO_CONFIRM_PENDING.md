# 夜间自动确认待打卡 · 开发说明

状态：**已落地**

## 行为

- 家庭教育设置开关 **默认关**
- 可自定义时间 `HH:mm`（上海时区），默认 `23:30`
- **只**自动通过 `PENDING` 且 **非补上进度** 的打卡
- 每分钟扫描；当日幂等（`auto_confirm_pending_last_run_date`）

## 开销优化

- 无启用家庭：`count` 为 0 后 **5 分钟内跳过**后续 tick
- 有启用：按 `autoConfirmPendingTime === 当前 HH:mm` 等值过滤，绝大多数分钟 0 行
- 打开开关时 `bumpEnabledCache()` 解除退避

## 触点

| 层 | 文件 |
|----|------|
| 迁移 | `migrations/1740000000030-AutoConfirmPending.ts` |
| 调度 | `checkins/auto-confirm-pending.scheduler.ts` |
| 批处理 | `CheckinsService.autoConfirmPendingForParent` |
| UI | `FamilyEduView.vue` |

## 注意

API 进程需常开；多实例下靠「先写当日标记」降低双跑，非强分布式锁。
