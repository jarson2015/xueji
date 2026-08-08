# 学迹 · E3 开发计划（情绪功能分类）

承接 [`EDU_AGE_EMOTION_ROADMAP.md`](./EDU_AGE_EMOTION_ROADMAP.md) **E3**。  
原则：家长侧脚手架；不对学生打分/排行；零迁移；文案用「可能」。

状态：**已完成**

---

## 总览

| ID | 项 | 状态 | 触点 |
|----|-----|------|------|
| **E3.1** | 四类映射纯函数 + unit | 完成 | `emotionFunctionHint.ts`；Monitor / 小会旁注 |
| **E3.2** | 家长芯片按类 ≤3 | 完成 | `journalSoftCopy`；Monitor 确认 SoftPrompt |
| **E3.3** | 考试周/周末弱策略条 | 完成 | Monitor 条幅 + localStorage dismiss |

四类：耗竭 / 能力威胁 / 关系威胁 / 意义缺失。

---

## 验收

- [x] `emotionFunctionHint` unit（8）
- [x] journalSoftCopy 情绪芯片抽样
- [x] web `npm run build`
- [ ] 真机：看板旁注与周末/考试条（HANDTEST）
