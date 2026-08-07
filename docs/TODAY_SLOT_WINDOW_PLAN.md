# 学生端今日清单 · 时段窗口减负（P0 / P1 / P2）

目标：降低「一打开看见全天任务」的焦虑，保留责任可见性与自主感。

状态：**已落地**（2026-07-11）

## P0 — 今日窗口减负 ✅

| # | 项 | 实现 |
|---|-----|------|
| P0.1 | 共享时段策略模块 | `composables/timeSlotPolicy.ts` + vitest |
| P0.2 | 仅展示当前时段其余待办 | `TodayView` → `buildSlotWindow` |
| P0.3 | 过窗收尾最多 1 条 | `windowKind: 'carry'` |
| P0.4 | 其它时段折叠 | 「后面还有 N 件 · 到点再看」 |
| P0.5 | 「这一段」叙事 | hero badge / 空态 / softNudge |

## P1 — 年龄与时钟 ✅

| # | 项 | 实现 |
|---|-----|------|
| P1.1 | ageBand 可见上限 | young 3 / general 5 / teen 8 |
| P1.2 | 低龄不可展开其它段 | `allowPeekOtherSlots` |
| P1.3 | anytime 限额弱化 | young 1 / 其它 2，标记「有空再做」 |
| P1.4 | 时钟 + 手动切换 | `resolveCurrentSlot` + `selectedSlot` |

## P2 — 任务列表与家长侧 ✅

| # | 项 | 实现 |
|---|-----|------|
| P2.1 | 学生任务列表时段 Tab + 减压卡片 | `student/TasksView.vue` |
| P2.2 | 家长密度提示 | `analyzeDailySlotDensity` + 发布表单说明 |

## 非目标（仍不做）

- 不改「下一件」主路径与缓做/休息日
- 不强制锁死未到点不能做
- 不新增后端字段
