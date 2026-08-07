# 学迹 · 教育优化阶段三（P3）开发计划

承接 [`EDU_PHASE2_PLAN.md`](./EDU_PHASE2_PLAN.md) 与全面教育审计**阶段三**项。  
原则：**差异化深度、教练叙事优先于打分、协作叙事优先于竞争、展示层内驱力开关不改账本公式**。

状态：**已落地**

---

## 总览

| ID | 项 | 状态 | 主要触点 |
|----|-----|------|----------|
| **P3.1** | 执行意图 + 微习惯 | ✅ | `intention_*`、`is_micro_habit`、任务表单、今日页 |
| **P3.2** | 兄妹协作任务 | ✅ | `joint_complete`、今日协作提示 |
| **P3.3** | 家长教练型洞察 | ✅ | `parent-coach-insights.ts`、监控/周报 |
| **P3.4** | 离线打卡队列 | ✅ | `offlineCheckinQueue.ts`、`checkins.client_id` |
| **P3.5** | 纯内驱力模式 | ✅ | `intrinsic_mode`、`RestDaysView`、学生端弱化积分 |

---

## 总验收清单

- [x] P3.1 执行意图 + 微习惯  
- [x] P3.2 兄妹协作  
- [x] P3.3 教练洞察  
- [x] P3.4 离线打卡  
- [x] P3.5 纯内驱力模式  

---

## 迁移

| 迁移 | 内容 |
|------|------|
| `1740000000028` | `intrinsic_mode`；`intention_*`/`is_micro_habit`/`joint_complete`；`checkins.client_id` |

---

## 参考

- [`EDU_PHASE1_PLAN.md`](./EDU_PHASE1_PLAN.md)  
- [`EDU_PHASE2_PLAN.md`](./EDU_PHASE2_PLAN.md)  
