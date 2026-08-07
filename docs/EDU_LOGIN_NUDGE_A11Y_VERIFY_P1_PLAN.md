# 学迹 · 登录码 a11y + 轻轻提醒 toast 验收 · P1

承接 HANDTEST：
- 「码区与 ⌫/清空有可读名称」
- 「轻轻提醒成功最多一条 toast（有 parentHint 时用它）」

## 开发理由

1. 码区 `aria-label` 与提醒成功文案已落地，但未单测/e2e 锁死。  
2. 抽出 `numKeyLabel` 与 `buildNudgeSuccessToast`；e2e 断言码区可读名；unit 断言 toast 单条口径。  
3. 非目标：不改登录码位数、不真连发多条 nudge 压测冷却。

## 总览

| ID | 项 | 状态 |
|----|-----|------|
| **L.1** | 抽出码键 label + 提醒 toast 文案 + unit | 完成 |
| **L.2** | e2e：学生进入码区 / ⌫ / 清空可读名称 | 完成 |
| **L.3** | HANDTEST 两项勾选 | 完成 |

## 人手（仍必做）

- [ ] 读屏实际朗读码区与删除键  
- [ ] 真轻轻提醒见一条 toast；当日多次后见 parentHint  

## 验收（本轨自动化）

- [x] unit 通过  
- [x] e2e 通过  
- [x] HANDTEST 已勾  
