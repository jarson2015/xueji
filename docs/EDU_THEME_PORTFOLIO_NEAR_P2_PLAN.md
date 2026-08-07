# 学迹 · 主题周 + 成长作品集 + 近端愿望（P2）

承接 [`EDU_THEME_PORTFOLIO_NEAR_P1_PLAN.md`](./EDU_THEME_PORTFOLIO_NEAR_P1_PLAN.md)。  
原则：**软建议不自动建任务；作品集看见时间线；近端兑现留下证据。不新建表。**

状态：**已落地**

---

## 总览

| ID | 项 | 状态 | 主要触点 |
|----|-----|------|----------|
| **P2.1** | 主题软建议任务 | ✅ | `THEME_TASK_SUGGESTIONS`；`ThemeWeekDrawer` / `TasksView` chips |
| **P2.2** | 作品集主题周史 | ✅ | `listRecentWeeklyGoals`；`portfolio.themeHistory` |
| **P2.3** | 近端兑现 → 成长里程碑 | ✅ | 兑现近端愿望时 `GrowthService.recordNearWishRedeemed` |

### 非目标

- 主题自动创建/绑定任务 ID  
- 作品集导出分享、Quest/Badge  
- 改积分公式  

---

## 总验收

- [x] 选主题后可见软建议；点芯片可填任务标题  
- [x] 作品集可见近几周主题史  
- [x] 兑现近端愿望后成长时间轴出现记录  
- [x] api/web `test:unit` + web `build`  
- [x] 本文档 **已落地**  

---

## 参考

- [`EDU_THEME_PORTFOLIO_NEAR_P1_PLAN.md`](./EDU_THEME_PORTFOLIO_NEAR_P1_PLAN.md)
