# 学迹 · 手机抽屉统一 + SoftStay Esc + 代登退出（P0）

承接零花轨已定的 `--drawer-phone` 标准，并收 SoftStay / 代登两处小缺口。  
原则：**同一断点同一抽屉高度；键盘可关短驻留；代登失败不假成功。**

状态：**已落地**

---

## 方向理由

| 理由 | 说明 |
|------|------|
| 抽屉高度 | 学生零花已用 token，家长收入 / 打卡 / 约定等仍写死 `%`，短屏裁切不一致 |
| SoftStay | SoftPrompt 有 Esc；短驻留只有点「知道了」 |
| 代登退出 | backup 坏掉时仍 `return true`，布局以为回到家长，会话可能仍是学生 |

---

## 总览

| ID | 项 | 状态 | 开发理由 |
|----|-----|------|----------|
| **C.1** | 残留手机抽屉 → `var(--drawer-phone)` | ✅ | 热路径触感一致 |
| **C.2** | SoftStay：Escape 关闭 | ✅ | 键盘可达 |
| **C.3** | `exitParentProxy` 还原失败 → logout + false | ✅ | 防假成功 |

### 非目标

- 改 `--drawer-phone` 数值、完整 SoftStay 焦点陷阱、扩 SoftPrompt  

---

## 改动摘要

- 抽屉：`parent/AllowanceView`、`student/RewardsView`、`student/PactsView`、`CheckinDrawer`、`ParentTaskEditDrawer`
- `SoftStay.vue`：Esc；有 `.sp-mask` 时让位 SoftPrompt
- `stores/auth.ts`：`exitParentProxy` 仅还原成功返回 true
- `HANDTEST_REGRESSION_MASTER.md`：补手测项

---

## 验收

- [x] 家长零花收入、学生愿望/约定发起、打卡、任务编辑抽屉手机高度一致  
- [x] SoftStay 可见时按 Esc 可关  
- [x] 损坏的代登备份退出走失败路径（logout / 不假跳家长页）  
- [x] web `test:unit` + `build`（落地后跑）  
- [x] 本文档 **已落地**
