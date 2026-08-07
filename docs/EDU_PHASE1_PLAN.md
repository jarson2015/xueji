# 学迹 · 教育优化阶段一（P1）开发计划

承接全面教育审计中的**阶段一**项。原则：**不静默改历史家庭数据、文案与默认值优先、复用既有模式（愿望提议 / 淡出横幅 / 周报模块）**。

状态：**已落地（P1.1 – P1.5）**

---

## 总览

| ID | 项 | 状态 | 主要触点 |
|----|-----|------|----------|
| **P1.1** | 新家庭默认淡出 + 渐进日程引导 | ✅ | `family-settings`、`lifecycle`、`MonitorView`、`RestDaysView`、迁移 `0022` |
| **P1.2** | 学生任务提议 | ✅ | `task_proposals`、`tasks` 模块、`TasksView`、`MeView`、迁移 `0023` |
| **P1.3** | 周报情绪词云 + 家长鼓励金句 | ✅ | `report-insights.ts`、`reports.service`、`ReportsView` |
| **P1.4** | 家长过载提示 | ✅ | `edu-policy-math`、`dashboard.service`、`MonitorView` |
| **P1.5** | 本周小目标 & 先做这件迁后端 | ✅ | `student_weekly_goals`、`student_daily_focus`、`student-me.controller`、composables、迁移 `0024` |

### 执行顺序

1. 锁定本文档  
2. P1.1 → P1.2 → P1.3 → P1.4 → P1.5（逐项验收后勾选）  
3. 每完成一项更新「状态」列与文末验收清单  

### 非目标（阶段一不做）

- 改积分结算公式、强制全局 `rewardMode` 写库（GET 时静默切换）  
- 情绪签到新字段、任务难度阶梯、家庭周末仪式新页  
- 用星星替换后端积分字段  

---

## P1.1 — 新家庭默认淡出 + 渐进日程引导

### 落地摘要

- 新家庭 `rewardMode` 默认 `random`（实体 + `getOrCreate` + 迁移 `0022`）  
- `buildGradualRewardFadeHint` / `resolveRewardFadeHint`：`random` → 建议 `weekly_digest`  
- `rewardFadeScheduleNote` 约定页渐进说明  
- 约定页 `random` 满 14 天预选周汇总（保存才生效）  

### 验收

- [x] 新注册家长首次打开约定页，`rewardMode` 为 `random`（历史家庭不变）  
- [x] `always` 家庭仍见原淡出横幅；`random` 家庭满条件见「可试周汇总」横幅  
- [x] 一键应用仍走 PUT `/family/settings`，可改回  

---

## P1.2 — 学生任务提议

### 落地摘要

- 表 `task_proposals` + API：`POST /tasks/propose`、`GET /my/task-proposals`、`GET /task-proposals`、`approve` / `reject`  
- 学生 `MeView` 提交；家长 `TasksView` 审定  
- WS：`task:proposed`  

### 验收

- [x] 学生提交后家长收到通知，批准后出现正式任务并指派该生  
- [x] 拒绝需留言；学生可见状态  
- [x] 与愿望提议 UX 口径一致  

---

## P1.3 — 周报情绪词云 + 家长鼓励金句

### 落地摘要

- `buildEmotionWordCloud` / `buildParentEncouragementHighlight`  
- 周报字段 `emotionWordCloud`、`parentEncouragement`  
- `ReportsView` 两卡片  

### 验收

- [x] 有反思打卡时词云非空；无则隐藏区块  
- [x] 家长确认留言出现在周报；无则隐藏  
- [x] 不做评分、不排行孩子  

---

## P1.4 — 家长过载提示

### 落地摘要

- `buildParentOverloadHint`：今日 due>8、确认任务占比>40%、待确认≥5  
- 监控页软横幅，可「本次知道了」  

### 验收

- [x] 监控页顶部软横幅（非 TV）  
- [x] 仅建议，不阻断操作  
- [x] 单元测试边界值  

---

## P1.5 — 本周小目标 & 先做这件迁后端

### 落地摘要

- 表 `student_weekly_goals`、`student_daily_focus`  
- `GET/PUT /my/weekly-goal`、`GET/PUT /my/daily-focus`  
- composables 首次加载自动从 localStorage 迁库  

### 验收

- [x] 学生多端登录同一账号，小目标与先做这件一致  
- [x] localStorage 有值时首次打开自动上传  
- [x] 今日页 / 我的页行为与迁库前一致  

---

## 迁移

| 迁移 | 内容 |
|------|------|
| `1740000000022` | `reward_mode` DEFAULT `random` |
| `1740000000023` | `task_proposals` |
| `1740000000024` | `student_weekly_goals`、`student_daily_focus` |

---

## 总验收清单

- [x] P1.1 新家庭默认 random + 渐进淡出引导  
- [x] P1.2 学生任务提议全链路  
- [x] P1.3 周报词云 + 家长鼓励  
- [x] P1.4 家长过载横幅  
- [x] P1.5 目标与排序后端持久化  

---

## 参考文档

- [`EDU_MOTIVATION_PLAN.md`](./EDU_MOTIVATION_PLAN.md)  
- [`EDU_INTRINSIC_P0P1_PLAN.md`](./EDU_INTRINSIC_P0P1_PLAN.md)  
- [`EDU_MOTIVATION_P2_PLAN.md`](./EDU_MOTIVATION_P2_PLAN.md)  
