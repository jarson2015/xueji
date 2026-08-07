# 学迹 · 主题周 + 成长作品集 + 近端愿望（P4）

承接 [`EDU_THEME_PORTFOLIO_NEAR_P3_PLAN.md`](./EDU_THEME_PORTFOLIO_NEAR_P3_PLAN.md)。  
原则：**作品集可按主题周回看；周报看见近端愿望；主题建议仍只预填任务、家长点发布才创建。**

状态：**已落地**

---

## 总览

| ID | 项 | 状态 | 主要触点 |
|----|-----|------|----------|
| **P4.1** | 作品集按主题周过滤 | 已落地 | `rangeForIsoWeekKey`；`GrowthView` chips |
| **P4.2** | 近端愿望统计进周报 | 已落地 | `ProgressExtras.nearWishStats`；Reports/Me |
| **P4.3** | 主题建议预填微习惯任务 | 已落地 | `ThemeWeekDrawer` + `TasksView`（不自动创建） |

### 非目标

- 主题自动绑任务 ID / 静默建任务  
- 作品集社交导出、Quest/Badge  
- 改积分公式  

---

## 验收

- [x] 作品集可选本周/历史主题周，列表按日期过滤  
- [x] 单孩周报可见近端愿望统计文案  
- [x] 点主题建议打开发布页且标题/微习惯已预填，需点发布  
- [x] api/web `test:unit` + web `build`  
- [x] 本文档 **已落地**  
