# 学迹 · 看板待处理含任务提议（P0）

承接家长推送闭环：提议不只 toast / 任务页，进看板行动区。  
原则：**主屏能看见；同意可商量分值；lite 也带提议列表。**

状态：**已落地**

---

## 方向理由

| 理由 | 说明 |
|------|------|
| 自主感闭环 | 孩子提议后家长主屏看不见 → 易烂尾 |
| 行动区统一 | 待确认已置顶；提议同属「等我」 |
| 同意硬编码 5 分 | 削弱商量感；用 SoftPrompt 芯片选分 |

---

## 总览

| ID | 项 | 状态 | 开发理由 |
|----|-----|------|----------|
| **G.1** | `GET /dashboard/monitor` 增加 `pendingProposals`（含 lite） | ✅ | 一屏读模型 |
| **G.2** | Monitor 行动区展示提议：同意 SoftPrompt 可调分 / 再商量 | ✅ | 主路径可处理 |
| **G.3** | TasksView 同意同步 SoftPrompt 可调分；推送深链看板 | ✅ | 口径一致 |

### 非目标

- 愿望兑换并入看板、改积分公式、主题绑任务  

---

## 改动摘要

- `dashboard.service.ts`：`pendingProposals`  
- `MonitorView.vue`：行动区「待处理」含提议  
- `TasksView.vue`：同意可选分  
- 提议 push url → `/parent/monitor`  

---

## 验收

- [x] 有待审提议时看板行动区可见  
- [x] 同意可选 0 / 5 / 10 分（默认 5）  
- [x] 再商量走 SoftPrompt 写说明  
- [x] TasksView 同意同逻辑  
- [x] web build；api 重启 3000（落地后跑）  
- [x] 本文档 **已落地**
