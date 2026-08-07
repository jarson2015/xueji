# 学迹 · 家庭说说 P3 打磨轨

承接 [EDU_FAMILY_JOURNAL_IMPROVE_PLAN.md](./EDU_FAMILY_JOURNAL_IMPROVE_PLAN.md) P2。  
原则：**按收件人可关 Push；引用弱连接可留摘要；限流文案可读；不加积分/待办。**

状态：**已落地**

---

## 总览

| ID | 项 | 状态 | 落点 |
|----|-----|------|------|
| **J3.1** | 说说「新回应」Push 可关（默认开） | 完成 | `journal_user_prefs`、发评前读偏好、手账页开关 |
| **J3.2** | 周末小会引用摘要固化 | 完成 | `journal_post_summary`；删帖后仍可读一句 |
| **J3.3** | 限流 / 失败文案 | 完成 | `friendlyError` 识别「太频繁」/429 |
| **J3.4** | 回归 e2e + HANDTEST | 完成 | 引用保存、Push 偏好、限流文案 unit |

迁移：**`1740000000036`**（sqlite 开发环境 `synchronize` 亦会建表/加列）

### 非目标

- Redis 分布式限流  
- 家庭级一键关全部 Push（保留浏览器订阅粒度）  
- 强 FK 引用、删帖级联清小会  

---

## 验收

- [x] 关 Push 偏好后，评论不再 `sendToUser`（代码路径；真机订阅人手）  
- [x] 保存引用时写入摘要；删帖后小会仍显示摘要 +「原帖已删」  
- [x] 429 /「太频繁」经 `friendlyError` 可读  
- [x] e2e / unit；HANDTEST 勾自动化项  

### 人手（跨期）

- [ ] 真机有订阅时开/关 Push 偏好后收通知（步骤见下）  
- [x] API：周末引用保存与删帖后摘要仍在  
- [x] API：代登不可读私密；分享副本可用  

---

## 真机 Push 手测步骤（J3.1 / P2 通知落地）

**前置**

1. 本机 API + Web 已起；`.env` 已配 `VAPID_*`（demo 默认有）。  
2. 用 **Chrome/Edge 桌面**（localhost 可推送；部分浏览器需 HTTPS）。  
3. 准备两个角色：学生码 `102938`（小明）、家长 `parent@demo.com` / `demo1234`。  
4. 建议两个浏览器配置文件，或一个正常窗口 + 一个无痕：学生 A、家长 B。

**A. 开订阅（学生侧收通知）**

1. 学生登录 → 若顶栏出现「开启通知…」点 **开启**，允许浏览器权限。  
2. 或：地址栏锁图标 → 网站设置 → 通知 = 允许；刷新后再进学生端（已授权时会自动订阅）。  
3. 确认：DevTools → Application → Service Workers 已激活。

**B. 偏好开：应收到通知**

1. 学生打开 `/student/journal`，确认「新回应提醒」开关为 **开**。  
2. 学生发一条家庭说说（或已有自己的帖）。  
3. **切到家长**，打开该帖，写一条回应（不要用学生自己回）。  
4. 学生端可切到其它页或最小化；应收到系统通知，标题类似「说说有新回应」。  
5. 点通知：应打开手账，并尽量带 `?postId=` 落到该帖。

**C. 偏好关：不应再推说说**

1. 学生回到手账，关掉「新回应提醒」，看到「已关闭新回应提醒」。  
2. 家长再对该帖回一条。  
3. **不应**再出现说说类离屏通知（打卡/愿望等其它推送不受此开关影响）。  
4. 再打开开关，家长再回一条，应恢复收到。

**D. 失败排查**

| 现象 | 排查 |
|------|------|
| 从未弹出权限 | 是否非安全源；试 Chrome localhost |
| 开了权限仍无通知 | API 是否调用 `sendToUser`；库表 `push_subscriptions` 是否有该用户 |
| 关开关仍收到 | 硬刷新后再测；确认 PATCH `/journal/notify-prefs` 返回 `commentPushEnabled: false` |
| 点通知进错页 | 载荷 `url` 应为 `/student/journal?postId=…` 或家长对应路径 |

测完后在 [HANDTEST_REGRESSION_MASTER.md](./HANDTEST_REGRESSION_MASTER.md) 勾对应两项真机 Push。
