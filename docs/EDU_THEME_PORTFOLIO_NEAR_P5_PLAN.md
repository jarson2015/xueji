# 学迹 · 主题周 + 成长作品集 + 近端愿望（P5）

承接 [`EDU_THEME_PORTFOLIO_NEAR_P4_PLAN.md`](./EDU_THEME_PORTFOLIO_NEAR_P4_PLAN.md)。  
原则：**仪式屏看见主题章节；近端愿望更好填；整条轨道可回归验收。不新建表。**

状态：**已落地**

---

## 总览

| ID | 项 | 状态 | 主要触点 |
|----|-----|------|----------|
| **P5.1** | 仪式 TV：本周主题 + 走过的主题 | 已落地 | `weekly-goals.recentThemes`；`RitualTvView` |
| **P5.2** | 近端愿望模板加强 | 已落地 | 家长 8 条模板；学生提议 5 chips |
| **P5.3** | 轨道回归清单 | 已落地 | [`EDU_THEME_PORTFOLIO_NEAR_REGRESSION.md`](./EDU_THEME_PORTFOLIO_NEAR_REGRESSION.md) |

### 非目标

- 主题自动绑任务 / 静默建任务  
- 作品集导出、Quest/Badge  
- 改积分公式  

---

## 验收

- [x] 仪式屏有本周主题页，且有历史主题页（有数据时）  
- [x] 家长近端模板 ≥ 6；学生提议有体验/陪伴快捷 chips  
- [x] 回归清单覆盖 P0–P5 主路径  
- [x] api/web `test:unit` + web `build`  
- [x] 本文档 **已落地**  

---

## 说明

- `GET /students/weekly-goals` 增加 `recentThemes`（每人最多 2 条，排除本周）  
- 仪式屏改用完整 monitor（含 `nextWish`），今日节奏可显示「靠近：…」  
- 本阶段为该轨道收尾；后续新需求另开计划  
