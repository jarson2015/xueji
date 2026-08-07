# P1 禁止补卡时「日终归档」开发计划

## 目标
当家庭关闭「补上进度」时：过了日历日/周期后，未完成项从「催促」中放下（归档），明天重新开始；不删历史、不惩罚叙事。

## 触发条件
- `makeupEnabled === false`
- 指派仍为可催促态（`active`），进度未满
- 周期已滚动：`daily`/`weekly` 的 `periodKey` 落后于当前周期
- **不做**一次性任务（沿用截止日期过期逻辑）

## 豁免（不归档）
| 情况 | 理由 |
|------|------|
| 该指派有 `confirmStatus=pending` 打卡 | 家长还在看，不能静默收走 |
| `daily` 且 `periodKey` 当天为休息日 | 休息日未完成 ≠ 失败 |
| 已是 `completed` / `shared_done` / `closed` / `day_archived` | 无需重复 |

## 实现项

| ID | 项 |
|----|-----|
| B1 | `AssignStatus.DAY_ARCHIVED` |
| B2 | 纯函数 `shouldDayArchive` / `pickDayArchiveTargets` + 单测 |
| B3 | `TasksService.archiveEndedPeriodsWhenNoMakeup(studentId)` |
| B4 | 在 `myTasks` / `today` 入口惰性执行（无独立 cron） |
| B5 | `normalizeAssign`：`day_archived` + 已滚动 → 新周期虚拟 active（明天重来） |
| B6 | 今日列表排除未滚动的归档态；仪表盘不因归档产生补卡类 nudge |
| B7 | 家长「补上进度」关闭时说明文案 |

## 非目标
- 真实 0:00 cron（可二期加；惰性足够）
- 删除 assign / 扣分
- 改变 makeup=true 时的行为
