# 学迹 · E1 开发计划（关系优先与防工具化）

承接 [`EDU_AGE_EMOTION_ROADMAP.md`](./EDU_AGE_EMOTION_ROADMAP.md) **E1**。  
原则：脚手架 / 文案 / IA；不静默改 `rewardMode`；零迁移。

状态：**已完成**

---

## 总览

| ID | 项 | 状态 | 触点 |
|----|-----|------|------|
| **E1.1** | Monitor 关系摘要优先；完成数字默认折叠 | 完成 | `MonitorView.vue`（`statsOpen`） |
| **E1.2** | 淡出家庭共见契约 | 完成 | `FamilyEduView.vue` + `TodayView` + `eduRelationCopy.ts` |
| **E1.3** | 模式句/词云「用来聊聊，不是评分」 | 完成 | `WeekendMeetingView`、`ReportsView` |
| **E1.4** | 兴趣任务勾选预填 0 分 | 完成 | `TasksView` watch；`ParentTaskFormFields` |
| **E1.5** | 过载洞察减负/求助 CTA | 完成 | Monitor insight + SoftPrompt |

共享文案：`apps/web/src/composables/eduRelationCopy.ts`（unit：`eduRelationCopy.spec.ts`）

---

## 验收

- [x] web `eduRelationCopy` unit
- [x] web `npm run build`
- [ ] 人手：看板首屏、淡出保存后学生条、兴趣 0 分、过载求助（见 HANDTEST）

---

## 非目标

改积分公式、重做 Monitor、AI 诊断、RestDays 充当奖励设置主页。
