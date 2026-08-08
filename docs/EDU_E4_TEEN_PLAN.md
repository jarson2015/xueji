# 学迹 · E4 开发计划（Teen 自主、隐私与边界）

承接 [`EDU_AGE_EMOTION_ROADMAP.md`](./EDU_AGE_EMOTION_ROADMAP.md) **E4**。  
原则：前端偏好优先、零迁移；不静默改 `rewardMode`；无自动报警/诊疗。

状态：**已完成**

---

## 总览

| ID | 项 | 状态 | 落地 |
|----|-----|------|------|
| **E4.1** | teen 反思默认不分享给家长 | ✅ | `teenPrivacy` + CheckinDrawer 勾选；未勾选不写 API、本地暂存 |
| **E4.2** | FamilyEdu teen 弱积分/周汇总引导 | ✅ | 少年档提示 + 预选 `weekly_digest`（仍需保存）；学生 Today 弱提示 |
| **E4.3** | 代登/私密引导加强 | ✅ | `buildProxyComposeHint` / 私密开启文案；JournalView 代登横幅 |
| **E4.4** | 危机转介静态入口 | ✅ | More + FamilyEdu SoftPrompt；与 Monitor 同源 `HELP_RESOURCES_*` |

## 核心模块

- [`apps/web/src/composables/teenPrivacy.ts`](../apps/web/src/composables/teenPrivacy.ts)
- HANDTEST：[`HANDTEST_REGRESSION_MASTER.md`](./HANDTEST_REGRESSION_MASTER.md) E4 节
