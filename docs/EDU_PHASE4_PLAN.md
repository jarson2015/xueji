# 学迹 · 教育优化阶段四（P4）开发计划

承接 [`EDU_PHASE3_PLAN.md`](./EDU_PHASE3_PLAN.md) 与全面教育审计**阶段四**项。  
原则：**闭环体验优先、防空头支票、弹性习惯而非羞辱性连续、首周少即是多**。

状态：**已落地**

---

## 总览

| ID | 项 | 状态 | 主要触点 |
|----|-----|------|----------|
| **P4.5** | 首周 onboarding：1–2 个微习惯 | ✅ | `ParentLayout`、`TasksView` |
| **P4.3** | 按 `ageBand` 调整 nudge 冷却 + 别催太勤提示 | ✅ | `nudge.service.ts`、`MonitorView` |
| **P4.1** | 专注番茄闭环：专注后微复盘 + `used_focus` 落库 | ✅ | `CheckinDrawer`、`TodayView`、`checkins` |
| **P4.2** | 愿望兑现确认（学生「收到了」） | ✅ | `wish_redeems.student_ack_at`、`RewardsView`、`WishesView` |
| **P4.4** | 弹性习惯窗口（7 天内 5 次） | ✅ | `habit-rhythm.ts`、`task-streak.service`、今日/周报文案 |

---

## 总验收清单

- [x] P4.5 首周微习惯引导  
- [x] P4.3 nudge 年龄化冷却  
- [x] P4.1 专注复盘闭环  
- [x] P4.2 愿望兑现确认  
- [x] P4.4 弹性习惯节奏  

---

## 迁移

| 迁移 | 内容 |
|------|------|
| `1740000000029` | `checkins.used_focus`；`wish_redeems.student_ack_at` |

---

## 参考

- [`EDU_PHASE1_PLAN.md`](./EDU_PHASE1_PLAN.md)  
- [`EDU_PHASE2_PLAN.md`](./EDU_PHASE2_PLAN.md)  
- [`EDU_PHASE3_PLAN.md`](./EDU_PHASE3_PLAN.md)  
