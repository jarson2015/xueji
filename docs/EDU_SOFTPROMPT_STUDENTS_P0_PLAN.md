# 学迹 · SoftPrompt 学生管理敏感操作（P0）

承接 [`EDU_INSIGHT_FAIRNESS_POLISH_P2_PLAN.md`](./EDU_INSIGHT_FAIRNESS_POLISH_P2_PLAN.md) 非目标中「年龄段/刷新码/重置密码可后续」。  
原则：**敏感操作同一商量语气；中文芯片替代英文枚举；不扩全站 SoftPrompt。**

状态：**已落地**

---

## 方向理由

| 理由 | 说明 |
|------|------|
| 连贯性 | 排行已 SoftPrompt；同页其余敏感操作仍用冷弹窗，语气割裂 |
| 教育落地 | 年龄段驱动今日条数与庆祝调性；手填英文枚举与添加表单中文不一致 |
| 安全 | 刷新码立刻作废、重置密码属家庭入口安全；勿默认弱密 |

---

## 总览

| ID | 项 | 状态 | 开发理由 |
|----|-----|------|----------|
| **SP.1** | 年龄段 SoftPrompt（低龄/通用/少年/家庭默认） | 已落地 | 去掉英文枚举门槛 |
| **SP.2** | 刷新登录码 SoftPrompt 确认 | 已落地 | 说明旧码失效再确认 |
| **SP.3** | 重置密码 SoftPrompt（无默认弱密） | 已落地 | 敏感写操作护栏 |
| **SP.4** | 本页去掉 `ElMessageBox` | 已落地 | 收口半成品 |

### 非目标

- 全站其余 ElMessageBox  
- 改年龄段后端字段或默认策略  
- 强制填排行  

---

## 验收

- [x] 三操作均走 SoftPrompt  
- [x] 年龄段可选中文芯片，无需手填英文  
- [x] 重置密码无预填 `demo1234`  
- [x] StudentsView 无 `ElMessageBox` import  
- [x] web `test:unit` + `build`  
- [x] 本文档 **已落地**  
