# 学迹 · 教育打磨轨 P-Edu-A

承接科学教育分析中的 **P-Edu-A（高杠杆 / 中小工程）**。  
原则：**脚手架优先于新表；不静默改 `rewardMode`；说说不绩效化；周末小会是仪式不是 KPI。**

状态：**已完成**

---

## 总览

| ID | 项 | 状态 | 落点 |
|----|-----|------|------|
| **A1** | 家长说说「情绪教练」话术芯片 | 完成 | `journalSoftCopy` 分角色芯片；`JournalView` 回应区 |
| **A2** | 周末小会计时仪式 + 本周模式一句 | 完成 | `WeekendMeetingView` 分步计时；`weekend-pattern-hint` API |
| **A3** | 淡出建议未采纳 → 二次软提醒 | 完成 | Monitor：localStorage dismiss ≥7 天且仍有 hint 再出现 |

### 非目标

- AI 生成话术 / 自动改 rewardMode  
- 新建「生病」枚举或改积分公式  
- 说说点赞排行、待办化  

---

## A1 — 情绪教练话术

家长回应芯片偏「感受—好奇—陪伴」，避免绩效夸（「又完成了真棒」）。  
学生端保留原有温暖芯片。

- `JOURNAL_PARENT_COMMENT_PROMPTS` + `journalCommentPromptsForRole()`
- unit：`journalSoftCopy.spec.ts`；e2e：`pedu-a.spec.ts`

## A2 — 周末小会仪式

- 每步可选倒计时：骄傲 3′ / 改一件 3′ / 承诺 2′（可跳过、可重置）  
- 页顶「本周模式」一句：缓做/情绪/反思/说说（有则显示）
- API：`GET …/weekend-review` → `weekPatternHint`（`buildWeekendPatternHint`）

## A3 — 淡出二次提醒

- 「本次知道了」写入 `xueji_fade_dismiss_at`  
- 刷新后 7 天内不重复首条；≥7 天换「再提醒」文案再出现  
- 一键试用成功后 `clearFadeDismiss`；**不**在 GET 时写库改模式  

---

## 验收

- [x] 家长回应区可见情绪教练芯片；学生仍为原芯片  
- [x] 周末小会可启动分步计时；有数据时可见本周模式一句  
- [x] 淡出 dismiss 满 7 天可再出现二次文案  
- [x] unit + e2e 抽样；HANDTEST 勾选  

### 人手

- [ ] 真机开一场周末小会计时  
- [ ] 真机二次淡出提醒观感  
