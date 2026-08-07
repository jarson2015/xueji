# 学迹 · 主题周 + 成长作品集 + 近端愿望（P1）

承接 [`EDU_THEME_PORTFOLIO_NEAR_P0_PLAN.md`](./EDU_THEME_PORTFOLIO_NEAR_P0_PLAN.md)。  
原则：**家长可写、家庭可见；软提示优先；不新建表；不自动绑任务。**

状态：**已落地**

---

## 总览

| ID | 项 | 状态 | 主要触点 |
|----|-----|------|----------|
| **P1.1** | 家长可设本周主题 | ✅ | `PUT /students/:id/weekly-goal`；`GET /students/weekly-goals`；周末小会；监控孩子卡 |
| **P1.2** | 主题/作品集进家庭触点 | ✅ | 周报、仪式屏、作品集入口 |
| **P1.3** | 近端愿望家庭闭环 | ✅ | 监控 `nearWishHint`；家长近端模板；学生提议文案 |

### 非目标

- 主题自动绑定任务 ID / 独立 Quest 表  
- 作品集导出分享  
- 改积分公式或 `rewardMode`

---

## P1.1 — 家长可设主题

- `PUT /students/:id/weekly-goal`（`assertBound` → `putWeeklyGoal`）
- `GET /students/weekly-goals` 批量（避免 N+1）
- 周末小会 / 监控：`ThemeWeekDrawer` 可写主题
- monitor children 附带 `weekTheme`

## P1.2 — 周报与仪式屏

- 周报：`weekTheme` + `portfolioStats` + 作品集深链  
- 仪式屏：有主题则轮播一页  
- 周末小会：链到作品集

## P1.3 — 近端家庭闭环

- 监控 full：`nextWish` + `nearWishHint`（可兑 / 还差 ≤5）  
- 家长愿望近端模板 chips  
- 学生提议默认体验/陪伴 + 近端提示文案

---

## 总验收清单

- [x] 家长可改孩子本周主题，学生今日同步可见  
- [x] 周报 / 仪式屏可见主题；作品集有入口  
- [x] 近端可兑或快到手时监控有软提示；家长有近端模板  
- [x] api `test:unit`、web `test:unit` + `build` 通过  
- [x] 本文档状态改为 **已落地**  

---

## 参考

- [`EDU_THEME_PORTFOLIO_NEAR_P0_PLAN.md`](./EDU_THEME_PORTFOLIO_NEAR_P0_PLAN.md)
