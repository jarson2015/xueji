# 稳定性 / 效率 · P0 计划

依据：学生端 & 家长端全面检查结论。  
原则：**低成本、热路径优先；不引入新服务端接口；不拆巨型 SFC（属 P1）。**

状态：**已落地（P0.1–P0.4）**

---

## 范围

| ID | 项 | 落地位置 | 验收 |
|----|-----|----------|------|
| **P0.1** | `localStorage` user 反序列化防护 | `stores/auth.ts` | 损坏 JSON 不白屏；清 token/user，等同未登录 |
| **P0.2** | `load` 竞态序号（后发先至丢弃） | 工具 `asyncGuard.ts`；接入学生 `TodayView` / `TasksView` / `MeView` / `RewardsView`；家长 `MonitorView` | 连续 soft refresh 只应用最后一次结果 |
| **P0.3** | 写操作防重入 | 学生打卡 `submit` / `deferNext`；家长看板 `confirm` / `batchApprove` / `sendNudge` / `applyFadeSuggest` | 进行中再次触发直接 return |
| **P0.4** | Monitor 合并刷新 | `MonitorView`：`coalescedLoad` + `Promise.all(summary, progress)` + 可见时 60s 兜底轮询 | socket/tick/轮询短时间合并为一次；隐藏页不轮询 |

## 非目标（本轮不做）

- `/my/today` lite 拆分、Element Plus 按需、`keep-alive`
- 批量确认后端 API、番茄钟持久化节流
- 巨型页面拆分、`any` 类型全面收敛

## 执行顺序

1. 本文档锁定  
2. P0.1 auth  
3. P0.2 工具 + 学生今日等 load  
4. P0.3 写操作守卫  
5. P0.4 Monitor 合并刷新  

---

## 工具约定

- `createLoadGate()`：`const t = gate.next()` → await 后仅当 `t.isCurrent()` 写状态  
- `createCoalescedAsync(run, { waitMs })`：`schedule()` 防抖合并；首屏可用 `runNow()`  
