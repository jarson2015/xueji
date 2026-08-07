# 稳定性 / 效率 · P2 计划

依据：全面检查结论中的 P2 项；承接 `STABILITY_P0_PLAN.md` / `STABILITY_P1_PLAN.md`。  
原则：**首屏体积与热路径 IO 减负；批量确认一次请求；不改业务语义。**

状态：**已落地（P2.1–P2.4）**

---

## 范围

| ID | 项 | 落地位置 | 验收 |
|----|-----|----------|------|
| **P2.1** | Element Plus 按需自动导入 | `vite.config.ts` + `main.ts` + `App.vue` ConfigProvider | 去掉全量 `element-plus/dist/index.css` 与 `.use(ElementPlus)`；页面组件/消息仍可用；中文 locale 保留 |
| **P2.2** | 热路由 `keep-alive` | 学生/家长 Layout；Today / Rewards / Monitor / Tasks 组件 `name` | 底栏切换不整页硬刷；`include` 白名单；退出登录随 Layout 卸载 |
| **P2.3** | 批量确认 API | `POST /checkins/confirm-batch`；`MonitorView` 批量通过 | 一次请求处理多条；返回 ok/failed；跳过 makeup（与现前端一致） |
| **P2.4** | 番茄钟持久化节流 | `FocusTimer.vue` | UI 刷新 ≤500ms；`localStorage` 写入约 1.5s 节流；暂停/结束/停止强制写 |

## 非目标（本轮不做）

- CDN / OSS、再拆 Allowance/Pacts
- ETag、Redis、微服务
- Element Plus 图标全量 tree-shake 专项（若已按组件用则顺带受益）

## 执行顺序

1. 本文档锁定  
2. P2.1 Element 按需  
3. P2.2 keep-alive  
4. P2.3 批量确认  
5. P2.4 番茄节流  

## keep-alive 白名单

| 组件 name | 路由 |
|-----------|------|
| `StudentTodayView` | `/student/today` |
| `StudentRewardsView` | `/student/rewards` |
| `ParentMonitorView` | `/parent/monitor` |
| `ParentTasksView` | `/parent/tasks` |
