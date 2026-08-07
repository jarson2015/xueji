# 学迹 · 学生兑换 / 签收 SoftPrompt 验收 · P1

承接 HANDTEST「学生兑换 / 签收：SoftStay 或 SoftPrompt 可完成」与「近端兑换按钮可点」。

## 开发理由

1. 兑换确认三种文案（普通 / 互助卡 / 约定提醒）与 Stay 句散落在 `RewardsView`。  
2. 抽出文案单测；e2e 锁死愿望页入口、兑愿望 SoftPrompt、近端 `tap-btn`、签收条控件。  
3. 非目标：不强造可兑余额；不跑通家长审批全链路。

## 总览

| ID | 项 | 状态 |
|----|-----|------|
| **R.1** | 抽出兑换 SoftPrompt/Stay 文案 + unit | 完成 |
| **R.2** | e2e：愿望页兑换入口 / SoftPrompt / 近端按钮 | 完成 |
| **R.3** | HANDTEST 勾选 | 完成 |

## 人手（仍必做）

- [ ] 真兑换后 SoftStay「已提交…等待兑现」  
- [ ] 家长兑现后点「我收到了」出现 Stay  

## 验收（本轨自动化）

- [x] 文案 unit 通过  
- [x] e2e 通过  
- [x] HANDTEST 已勾  

