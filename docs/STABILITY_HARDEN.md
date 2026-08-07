# 稳定性加固续（asyncGuard / 类型 / chunks / activated）

承接 P0–P2 验收后的可选加深项。  
状态：**已落地**

| 项 | 内容 |
|----|------|
| 次热路径 asyncGuard | 学生/家长 Pacts、Wishes、Allowance、Covenant；家长 Tasks load+save |
| Today 类型 | `TodayBoardState`；`today` 改为该类型 |
| Element chunks | 去掉「整包 element-plus」manualChunk；仅 locale / vue-vendor / socket |
| keep-alive 再进入 | Today / Rewards / Monitor / Tasks：`onActivated` 软/再拉（跳过首次与 mount 双刷） |
