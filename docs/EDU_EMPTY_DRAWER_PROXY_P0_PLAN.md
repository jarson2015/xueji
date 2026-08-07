# 学迹 · 关功能空态死路 + 抽屉残留 + 代登提示（P0）

承接 UX.R2 / C.1 / C.3 未收干净的尾巴。  
原则：**关功能空态不进死路；抽屉手机高度继续对齐；代登失败说得清。**

状态：**已落地**

---

## 方向理由

| 理由 | 说明 |
|------|------|
| 零花/约定关闭 | CTA「看看家庭公约」只到仍未开启文案，与「请家长在教育设置打开」矛盾 |
| 抽屉 | Growth / 主题周仍 `400px`/`auto`；约定发起桌面也强制 phone 高 |
| 代登 | 失败已 logout，布局再 logout 且无提示 → 静默踢回登录 |

---

## 总览

| ID | 项 | 状态 | 开发理由 |
|----|-----|------|----------|
| **D.1** | 零花/约定关功能空态 CTA 改有用出口；公约关闭文案对齐 | ✅ | 少死路 |
| **D.2** | Growth / ThemeWeek / Today 主题 / Pacts 抽屉对齐 | ✅ | C.1 收尾 |
| **D.3** | 代登失败：提示 + 去掉二次 logout | ✅ | 可感知失败 |

### 非目标

- 学生进家长教育设置、流水配图、改 `--drawer-phone` 数值  

---

## 改动摘要

- `AllowanceView`：关功能 →「去愿望商店」
- `PactsView`：关功能 →「回到今日」；发起抽屉按断点
- `CovenantView`：关闭态点明「教育设置」
- `GrowthView` / `ThemeWeekDrawer` / `TodayView` 主题抽屉：`--drawer-phone`
- `StudentLayout.exitProxy`：失败 warning，不再二次 logout

---

## 验收

- [x] 关零花/约定时空态不进公约死路，有替代出口  
- [x] 公约页关闭态文案点明「教育设置」  
- [x] Growth / 主题抽屉手机用 `--drawer-phone`  
- [x] 代登失败有 warning，且只 logout 一次  
- [x] web `test:unit` + `build`（落地后跑）  
- [x] 本文档 **已落地**
