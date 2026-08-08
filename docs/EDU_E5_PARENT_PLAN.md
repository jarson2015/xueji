# 学迹 · E5 开发计划（家长微课与关系自检）

承接 [`EDU_AGE_EMOTION_ROADMAP.md`](./EDU_AGE_EMOTION_ROADMAP.md) **E5**。  
原则：改教养心智；零迁移；不强制考试；自检不算分不上榜。

状态：**已完成**

---

## 总览

| ID | 项 | 状态 | 落地 |
|----|-----|------|------|
| **E5.1** | 分龄场景微课 5–10 则 + 深链 | ✅ | `parentMicroLessons.ts`（8 则）+ FamilyEdu「教育小贴士」 |
| **E5.2** | 月度自愿关系自检 | ✅ | `relationSelfCheck.ts` localStorage；可跳过；无分数 |
| **E5.3** | HANDTEST / 路线图对齐 | ✅ | 本文件 + HANDTEST E5 节 |

## 入口

- 家长「家庭教育设置」：教育小贴士 / 本月关系自检 / 减负与求助（`#help`）
- 家长「更多」：教育小贴士与自检深链
