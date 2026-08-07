# 学迹 · 教育优化阶段二（P2）开发计划

承接 [`EDU_PHASE1_PLAN.md`](./EDU_PHASE1_PLAN.md) 与全面教育审计**阶段二**项。  
原则：**小步迁移、复用打卡/周报/周目标链路、修复式沟通优先于惩罚叙事**。

状态：**已落地**

---

## 总览

| ID | 项 | 状态 | 主要触点 |
|----|-----|------|----------|
| **P2.1** | 打卡前情绪签到 + 修复式拒绝 | ✅ | `checkins.mood_tag`、`CheckinDrawer`、`MonitorView`、`TodayView` |
| **P2.2** | 任务难度阶梯 + 升级建议 | ✅ | `tasks.difficulty_level`、`task-difficulty.ts`、任务表单、今日页 |
| **P2.3** | 家庭周末小会引导 | ✅ | `student_weekly_reviews`、`WeekendMeetingView`、路由 |
| **P2.4** | 教育策略包（一键预设） | ✅ | `eduPresets.ts`、`RestDaysView` |
| **P2.5** | 成长时间轴 + 打卡相册 | ✅ | `growth_milestones`、`GrowthView`、相册 API |

### 非目标（阶段二不做）

- 改积分结算公式、强制全局 rewardMode 写库  
- 离线打卡、原生 App、AI 教练  
- 用星星替换后端积分字段  

---

## 总验收清单

- [x] P2.1 情绪签到 + 修复式拒绝  
- [x] P2.2 难度阶梯 + 升级建议  
- [x] P2.3 周末小会  
- [x] P2.4 策略包  
- [x] P2.5 成长时间轴 + 相册  

---

## 迁移

| 迁移 | 内容 |
|------|------|
| `1740000000025` | `checkins.mood_tag`；`tasks.difficulty_level` |
| `1740000000026` | `student_weekly_reviews` |
| `1740000000027` | `growth_milestones` |

---

## 参考

- [`EDU_PHASE1_PLAN.md`](./EDU_PHASE1_PLAN.md)  
- [`EDU_MOTIVATION_PLAN.md`](./EDU_MOTIVATION_PLAN.md)  
