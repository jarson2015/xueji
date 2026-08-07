# 看板 Monitor 行动区拆分 · P0

## 开发理由

1. **问题**：`MonitorView.vue` 约 2600+ 行，待处理（打卡确认 + 提议）在手机/TV 各写一份，改文案易漏。
2. **目标**：抽出 `MonitorPendingPanel`（phone/tv）与 `MonitorWeekendBanner`；行为与文案不变；父页仍管 SoftPrompt / 数据。
3. **非目标**：不拆孩子卡/洞察/动态；不改 API；不做大重构状态机。

## 范围

| 文件 | 说明 |
|------|------|
| `components/MonitorPendingPanel.vue` | 待处理 UI + 相关样式 |
| `components/MonitorWeekendBanner.vue` | 周末小会横幅 |
| `MonitorView.vue` | 引用组件，保留逻辑 |

## 验收

- [x] 手机顶栏「待处理」与 TV 内嵌区行为同前
- [x] `npm run test:unit` + `build` 通过
