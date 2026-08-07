# 学迹 · 洞察可行动化 + 公平护栏（打磨轨 P0）

**方向切换理由（相对主题周轨道）**  
主题周 / 作品集 / 近端愿望（P0–P5）已把「看见成长」做完。继续堆叙事模块收益递减；监控里已有教练、公平、赠予、淡出等**信号**，缺的是家长能一步点到的**行动**，以及多孩场景下防攀比的**护栏**。本轨续写既有文档（`SITE_UX_AUDIT` P2.4、`EDU_MOTIVATION` 兄妹余额可 P3），不另起炉灶。

状态：**已落地**

---

## 产品目标

| 目标 | 说明 |
|------|------|
| 洞察 → 行动 | 教练/公平提示带 CTA，避免「看完就忘」 |
| 多孩护栏 | 学生端兄妹选人弱化裸余额，减少手足攀比 |
| 发现率 | 桌面侧栏补成长 / 周末小会等复盘入口 |
| 沟通语气 | 敏感操作优先 SoftPrompt，少冷冰冰弹窗 |

---

## 总览

| ID | 项 | 状态 | 开发理由 | 主要触点 |
|----|-----|------|----------|----------|
| **P0.1** | 教练洞察按 `kind` 补 CTA | 已落地 | API 已有 suggestion，前端无按钮；教练价值浪费 | `MonitorView` |
| **P0.2** | 公平提示深链任务轮值意图 | 已落地 | 结构干预比说教有效 | `tasks?focus=rotate` |
| **P0.3** | 学生约定/赠予：兄妹选人隐藏裸余额 | 已落地 | 防「看谁分多」破坏心意语义 | `student/PactsView` |
| **P0.4** | 桌面侧栏补成长 + 周末小会 | 已落地 | Audit P2.4；复盘发现率 | `ParentLayout` |
| **P0.5** | 提议婉拒 / 约定还回·结束 SoftPrompt | 已落地 | 沟通优先，与监控确认语气一致 | `TasksView`、`PactsView` |

### 非目标

- 主题自动绑任务、Quest/Badge、改积分公式  
- 赠予排行榜 / 可撤销赠予 / 助力共付  
- 成就奖金、成绩兑现金  
- 合并「今日动态」双流（Monitor 大重构，另开）  

---

## 总验收

- [x] P0.1–P0.5 行为符合上表  
- [x] web `test:unit` + `build`  
- [x] 本文档 **已落地**  

---

## 参考

- [`SITE_UX_AUDIT_PLAN.md`](./SITE_UX_AUDIT_PLAN.md) §P2.4  
- [`EDU_MOTIVATION_P1P2_PLAN.md`](./EDU_MOTIVATION_P1P2_PLAN.md)  
- [`EDU_THEME_PORTFOLIO_NEAR_REGRESSION.md`](./EDU_THEME_PORTFOLIO_NEAR_REGRESSION.md)  
