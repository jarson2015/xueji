# 稳定性 / 效率 · P1 计划

依据：全面检查结论中的 P1 项；承接 `STABILITY_P0_PLAN.md`。  
原则：**热路径减负 + 可维护拆分；拆组件以「抽屉/表单边界」为主，不做无意义大搬家。**

状态：**已落地（P1.1–P1.6）**

---

## 范围

| ID | 项 | 落地位置 | 验收 |
|----|-----|----------|------|
| **P1.1** | `/my/today` 无依赖查询 `Promise.all` | `dashboard.service.ts` `today` | 全量今日接口内部并行；行为与字段不变 |
| **P1.2** | `/my/today/lite` + 前端 soft 走 lite | Controller + Service；`TodayView` / 学生 `TasksView` soft | soft 不触发周汇总结算、不查鼓励；列表/积分/时段仍刷新；首屏与提交后仍走全量 |
| **P1.3** | schedule / category / slot 标签统一 | `composables/taskLabels.ts`；Today / 学生 Tasks / 家长 Tasks | 去掉三处本地 map 重复 |
| **P1.4** | 热路径类型 | `types/today.ts`；TodayView / Monitor 关键字段 | 减少热路径裸 `any`（渐进，不追求清零） |
| **P1.5** | 拆学生打卡抽屉 | `components/CheckinDrawer.vue` ← `TodayView` | TodayView 模板不再内嵌打卡表单大块 |
| **P1.6** | 拆家长任务编辑抽屉 | `components/ParentTaskEditDrawer.vue` ← `TasksView` | 发布/编辑表单独立组件 |

## 非目标（本轮不做）

- Element Plus 按需、`keep-alive`（P2）
- 批量确认后端 API、番茄持久化节流（P2）
- 家长 Tasks 模板区/指派对话框再拆、Allowance/Pacts 双端抽取
- `any` 全仓库清零

## 执行顺序

1. 本文档锁定  
2. P1.1 并行化  
3. P1.2 lite 接口 + 前端 soft  
4. P1.3 标签  
5. P1.4 类型  
6. P1.5 / P1.6 组件拆分  

## lite 约定

- **全量** `/my/today`：含周汇总结算副作用、`latestEncouragement`、完整 hints  
- **lite** `/my/today/lite`：任务/计划/积分/streak/休息/时段/跳过与 makeup 列表等列表关键；`digestSettlement: null`；`latestEncouragement` 省略（前端 soft 不覆盖旧值）  
