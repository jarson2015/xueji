# 学迹 · 家长推送闭环（P0）

承接教育审计下一轨首选：家长离屏后仍能收到待确认 / 兑换 / 提议。  
原则：**家长可订阅；事件带角色深链；不默认跳学生今日。**

状态：**已落地**

---

## 方向理由

| 理由 | 说明 |
|------|------|
| 协作闭环 | 待确认打卡、愿望兑换、任务提议目前主要靠 WebSocket；家长离开页后断联 |
| 订阅不对称 | 学生有推送引导；家长 Layout / More 无入口 → 推送恒为 0 |
| 深链 | Push 默认 `url` 曾指向 `/student/today`，家长点开会进错壳 |

---

## 总览

| ID | 项 | 状态 | 开发理由 |
|----|-----|------|----------|
| **F.1** | 家长 Layout 提示条 + More「开启离屏提醒」 | ✅ | 能订上 |
| **F.2** | 待确认打卡 / 兑换申请 / 任务提议 → `sendToUser` + 家长深链 | ✅ | 离屏可行动 |
| **F.3** | Push 默认 url 与 SW 回退改为 `/`（调用方显式传角色路径） | ✅ | 防错壳 |

### 非目标

- Monitor 提议队列 UI（下一轨）、Redis、改积分公式、Chromecast  

---

## 改动摘要

- `ParentLayout` / `MoreView`：订阅入口  
- `checkins` / `wishes` / `tasks`：家长 push + `/parent/monitor|wishes|tasks`  
- `push.service` + `public/sw.js`：默认 url `/`  

---

## 验收

- [x] 家长 More 可开启通知（VAPID 已配置时）  
- [x] 孩子提交需确认打卡 / 兑换 / 提议后，已订阅家长可收到通知（代码路径已接）  
- [x] 点击通知进 `/parent/monitor`、`/parent/wishes` 或 `/parent/tasks`  
- [x] web `test:unit` + `build`；api 需重启 3000  
- [x] 本文档 **已落地**
