# P0「共享完成」开发计划

## 目标
任务可标记「全家只需一人做」：某人有效完成后，其余未完成指派温和归档（不再催），不删历史。

## 范围

| ID | 项 | 说明 |
|----|-----|------|
| A1 | `tasks.shared_complete` 布尔，默认 false | 迁移 + 实体 + Create/Update DTO |
| A2 | `AssignStatus.SHARED_DONE` | 归档态，区别于 `closed`(过期) / `completed` |
| A3 | 打卡 `applyProgress` 达 100% 且非补卡时归档兄弟姐妹 | 需确认任务在家长通过后触发 |
| A4 | `normalizeAssign` / 今日列表排除 `shared_done` | 学生端不催；可选软提示 |
| A5 | 发布/编辑表单开关 + 家务类推荐文案 | 默认关 |
| A6 | 家长列表展示「共享完成」标记 | |
| A7 | 单测：归档逻辑 | |

## 非目标
- 轮值、竞赛排行
- 日终清零 / 更多时段
- 真删除 assign

## 规则摘要
- 默认「各自完成」
- 仅 `sharedComplete=true` 且进度首次达 100%（非 makeup）时归档他人 `active` 且未完成指派
- 文案：已由家人完成，今天不用再做
- WS：通知被归档学生刷新
