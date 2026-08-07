# 学迹 · 家长推送深链验收 · P1

承接 `EDU_PARENT_PUSH_P0`：代码已发深链，本轨把「点通知不进错壳」做成可回归断言 + 人手步骤。

## 开发理由

1. 真机通知权限 / VAPID / 多端点击无法全自动，但**深链字符串**与 **More 订阅入口**可锁死，防回退到 `/student/today`。  
2. HANDTEST「提议→任务页」与现网不符：提议待处理在看板，代码已是 `/parent/monitor`，需对齐文档。  
3. 非目标：不改推送触发条件；不接 Redis；不要求 CI 真发 Web Push。

## 总览

| ID | 项 | 状态 |
|----|-----|------|
| **D.1** | API：源码断言家长事件深链 + 默认 `/` | 已完成 |
| **D.2** | e2e：More 可见「离屏提醒 / 开启通知」 | 已完成 |
| **D.3** | HANDTEST / SW 回退口径对齐；计划勾选 | 已完成 |

## 人手（仍必做）

- [ ] 允许通知后点 More「开启通知」成功  
- [ ] 打卡待确认通知 → 进 `/parent/monitor`  
- [ ] 兑换通知 → 进 `/parent/wishes`  
- [ ] 提议通知 → 进 `/parent/monitor`（待处理区）  

## 验收（本轨自动化）

- [x] `apps/api`：`push-deeplink.spec` 纳入 `test:unit`  
- [x] `apps/web`：e2e More 离屏入口通过  
- [x] HANDTEST「家长离屏推送」自动项已勾、人手项保留（见计划人手清单）  
