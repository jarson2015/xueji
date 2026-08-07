# 学迹 · 教育优化阶段五（P5）开发计划

承接 [`EDU_PHASE4_PLAN.md`](./EDU_PHASE4_PLAN.md) 与全面教育审计**阶段五**项。  
原则：**降低登录摩擦、展示层正名、客厅仪式屏、归档可查不羞辱**。

状态：**已落地**

---

## 总览

| ID | 项 | 状态 | 主要触点 |
|----|-----|------|----------|
| **P5.3** | 「金手指」全面改名为「家庭互助卡」 | ✅ | `wishNarrative.ts`、愿望/奖励页、API 文案 |
| **P5.1** | QR 登录码 + `/login?code=` 深链 | ✅ | `LoginCodeQr.vue`、`StudentsView`、`LoginView` |
| **P5.2** | 家长代登（帮孩子进入） | ✅ | `POST /students/:id/enter-as`、`auth` 代登备份 |
| **P5.4** | 独立 TV 仪式屏 | ✅ | `/ritual`、`RitualTvView.vue` |
| **P5.5** | 任务归档专用页 | ✅ | `GET /my/archived-tasks`、`ArchiveView.vue` |

---

## 总验收清单

- [x] P5.3 家庭互助卡叙事  
- [x] P5.1 QR 登录  
- [x] P5.2 家长代登  
- [x] P5.4 TV 仪式屏  
- [x] P5.5 任务归档页  

---

## 迁移

本阶段无新迁移（保留 `golden_finger` 枚举值，仅改展示文案）。

---

## 参考

- [`EDU_PHASE4_PLAN.md`](./EDU_PHASE4_PLAN.md)  
- [`DAY_ARCHIVE_PLAN.md`](./DAY_ARCHIVE_PLAN.md)  
