# 学迹 · Monitor 孩子筛选条拆分 · P1

承接家庭动态拆分；收尾看板行动区里最后一块纯展示 UI。

## 开发理由

1. 多孩「全部 / 孩子名 + 待确认角标」筛选条模板与样式仍嵌在 `MonitorView`，与筛选联动逻辑无关。  
2. 抽 `MonitorChildFilter`：展示内聚；父页仍持有 `childFilterId`、联动待办/动态/孩子卡。  
3. 非目标：不改筛选语义；不抽 `showMultiChildFilter` 以外的编排。

## 总览

| ID | 项 | 状态 |
|----|-----|------|
| **S.1** | 新建 `MonitorChildFilter.vue` | 已完成 |
| **S.2** | `MonitorView` 接入；迁入样式 | 已完成 |
| **S.3** | `build` + e2e 看板通过 | 已完成 |

## 验收

- [x] ≥2 孩时筛选条可见；TV 不显示（父页 `showMultiChildFilter`）  
- [x] 切换孩子后看板/待处理/动态仍联动（`v-model` → `childFilterId`）  
- [x] `npm run build` + e2e「家长看板有待处理」通过  
