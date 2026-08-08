# 学迹 · E2 开发计划（分龄内容包）

承接 [`EDU_AGE_EMOTION_ROADMAP.md`](./EDU_AGE_EMOTION_ROADMAP.md) **E2**。  
原则：同路由 + 表驱动 pack；不增第四 age_band；零迁移；不改积分公式。

状态：**已完成**

---

## 总览

| ID | 项 | 状态 | 触点 |
|----|-----|------|------|
| **E2.1** | `ageContentPack` 纯函数 + unit | 完成 | `ageContentPack.ts` / `.spec.ts` |
| **E2.2** | young 短小会 + 共同调节确认 | 完成 | `WeekendMeetingView`（2 步）；Monitor approve 模板；打卡心情子集 |
| **E2.3** | general 淡出 + 非买物愿望提示 | 完成 | `FamilyEduView`、`WishesView`、`RewardsView` lead |
| **E2.4** | teen 提议/先做这件显眼 + 余额降权 | 完成 | `TodayView`、`RewardsView` |

今日可见条数与 `timeSlotPolicy.maxVisibleInCurrentSlot` 对齐。

---

## 验收

- [x] `ageContentPack` unit（7）
- [x] web `npm run build`
- [ ] 人手：young 小会 2 步；teen 提议条；愿望非买物提示（HANDTEST）
