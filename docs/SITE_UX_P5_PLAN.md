# 全站布局收尾 · UX P5 开发计划

承接 P0–P4（今日 / 任务分栏 / 更多·学生 / 页内 IA / TV·仪式屏）之后的 **遗漏收口**。  
原则：**登录品牌单路径；宽屏主从补齐；公约与周末可扫读；「我的」不再瀑布**。

状态：**已落地**（2026-07-14）

---

## 总览

| ID | 项 | 状态 | 触点 |
|----|-----|------|------|
| **P5.1** | 登录：品牌 Hero + TV 学生单路径 | ✅ | `LoginView.vue` |
| **P5.2** | 学生管理：宽屏左娃右码 | ✅ | `StudentsView.vue` |
| **P5.3** | 公约：核心置顶、细则折叠 | ✅ | `CovenantView.vue` |
| **P5.4** | 周末小会：单步 Wizard | ✅ | `WeekendMeetingView.vue` |
| **P5.5** | 学生「我的」：计划优先折叠 | ✅ | `MeView.vue` |

---

## 总验收

- [x] TV 登录默认偏学生路径；品牌在卡外大字  
- [x] 平板/桌面学生管理具备左选右码  
- [x] 公约首屏核心 ≤3 卡；细则折叠  
- [x] 周末小会逐步填写  
- [x] 「我的」以学习计划为主；周小结折叠  
- [x] `npm run build`（apps/web）通过  

---

## 非目标（已迁至 P6）

- ~~Growth 表单下沉~~ → `SITE_UX_P6_PLAN.md`
- ~~Monitor 平板 60/40~~ → `SITE_UX_P6_PLAN.md`
- Chromecast SDK  

---

## 全站布局系列索引

| 阶段 | 文档 |
|------|------|
| P0 | `TODAY_UX_P0_PLAN.md` |
| P1 | `TASKS_UX_P1_PLAN.md` |
| P2 | `MORE_UX_P2_PLAN.md` |
| P3 | `INNER_UX_P3_PLAN.md` |
| P4 | `RITUAL_TV_P4_PLAN.md` |
| P5 | 本文 |
| P6 | `SITE_UX_P6_PLAN.md` |
| P7 | `SITE_UX_P7_PLAN.md` |
