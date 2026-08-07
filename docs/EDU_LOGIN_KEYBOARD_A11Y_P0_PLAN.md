# 学迹 · 登录码键盘 + 文案 / a11y 收口（P0）

承接入口漏斗摩擦与 SoftPrompt 读屏缺口。  
原则：**学生码可用键盘/粘贴；More 不说 query 参数；确认框读屏能听见说明。**

状态：**已落地**

---

## 方向理由

| 理由 | 说明 |
|------|------|
| 登录码 | 桌面/外接键盘只能点屏；无粘贴；满 6 位仍须再点「进入今日」 |
| 家长 More | 可见文案写 `?tv=1`，与减阻轨冲突 |
| SoftPrompt | 有标题 aria，说明段落未 `aria-describedby` |
| 看板提醒 | parentHint + success 双 toast 抢注意力 |

---

## 总览

| ID | 项 | 状态 | 开发理由 |
|----|-----|------|----------|
| **E.1** | 登录码：数字键 / Backspace / Enter / 粘贴；满码自动提交；码区 a11y | ✅ | 入口减阻 |
| **E.2** | More：客厅模式白话开关（去 `?tv=`） | ✅ | 减阻收尾 |
| **E.3** | SoftPrompt `aria-describedby`；nudge 合并 toast | ✅ | 读屏 + 少打断 |

### 非目标

- 登录码 8 位、SoftStay 抢焦点、改限流策略  

---

## 改动摘要

- `LoginView.vue`：键盘/粘贴/满码提交；码区与按键 aria
- `MoreView.vue`：客厅/完整导航按钮 → `setTvModeOptIn`
- `SoftPrompt.vue`：`aria-labelledby` + `aria-describedby`
- `SoftStay.vue`：关闭按钮 `aria-label`
- `MonitorView.vue`：nudge 单条 success toast

---

## 验收

- [x] 学生进入态可用键盘输入/删除/回车提交；可粘贴 6 位数字  
- [x] 满 6 位自动尝试进入（与点按钮同路径）  
- [x] 码区与 ⌫/清空有可读名称  
- [x] More 无 `?tv=` 口吻，可切换客厅/完整导航  
- [x] SoftPrompt 有 message 时读屏可读说明  
- [x] 轻轻提醒成功最多一条 toast  
- [x] web `test:unit` + `build`（落地后跑）  
- [x] 本文档 **已落地**
