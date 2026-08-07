# 学迹 · SoftPrompt 交互验收 · P1

承接 HANDTEST U0–U2；把 Esc / 无原生弹框 / aria 说明做成可回归。

## 开发理由

1. SoftPrompt 已统一替代原生 `confirm`，但 Esc、焦点环、读屏说明易在改版时 silently 丢。  
2. SoftStay 与 SoftPrompt 的 Esc 归属靠 `.sp-mask` 探测，抽出可单测，防双开抢键。  
3. 非目标：不全站 Tab 环人手；不改 SoftPrompt 视觉；不静默全站替换剩余原生框。

## 总览

| ID | 项 | 状态 |
|----|-----|------|
| **U.1** | 抽出 SoftStay Esc 归属 helper + unit | 已完成 |
| **U.2** | e2e：家长退出 SoftPrompt；Esc 关；有 message 时 aria-describedby | 已完成 |
| **U.3** | HANDTEST 勾自动项 | 已完成 |

## 人手（仍必做）

- [ ] SoftPrompt Tab 环不跳出（多模板 + 输入场景）  
- [ ] SoftStay 可见时 Esc 可关（与 SoftPrompt 同屏）  
- [ ] 看板批量通过 / 学生兑换签收 SoftStay 文案  

## 验收（本轨自动化）

- [x] SoftStay Esc helper unit 通过  
- [x] e2e 家长退出 SoftPrompt + Esc + aria 通过  
- [x] HANDTEST 对应自动项已勾  
