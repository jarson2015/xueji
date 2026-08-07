# 学迹 · Monitor 家庭动态列表拆分 · P1

承接孩子卡拆分；继续缩小 `MonitorView` 右栏理解区。

## 开发理由

1. 「家庭动态」列表（展开/收起/空态/时间格式）与看板数据编排缠在一起，改文案易动整页。  
2. 抽 `MonitorFamilyFeed`：展示与折叠内聚；父页仍算 `familyFeedAll`、筛孩子、重置 `expanded`。  
3. 非目标：不改时间线协议；不拆孩子筛选条；不改洞察条。

## 总览

| ID | 项 | 状态 |
|----|-----|------|
| **F.1** | 新建 `MonitorFamilyFeed.vue` | 已完成 |
| **F.2** | `MonitorView` 接入；迁入相关样式 | 已完成 |
| **F.3** | `build` + e2e 看板相关通过 | 已完成 |

## 验收

- [x] 全部/单孩筛选下动态列表、更多/收起、空态同前  
- [x] 脚注点「查看」仍会筛孩并展开理解区（父页保留 `focusChildFeed` + `v-model:expanded`）  
- [x] `npm run build` + e2e「家长看板有待处理」通过  
