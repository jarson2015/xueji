# 学迹 · SEC PR3：`@ForbidProxy` 对齐

## 目标

代登（家长进孩子会话）只能协助「低风险日常」，不能代做承诺/契约类写入。

## 策略

| 操作 | 代登 | 理由 |
|------|------|------|
| 打卡 `POST /checkins` | **允许** | 共享设备代登的主场景 |
| 今日顺序 `PUT /my/daily-focus` | **允许** | 协助排程，无积分 |
| 任务提议 `POST /tasks/propose` | **禁止** | 与愿望提议对齐 |
| 推迟今日 `POST /my/assigns/:id/defer-today` | **禁止** | 影响公平/待办 |
| 愿望提议/兑换/确认 | **禁止** | 已有 |
| 赠予 / 约定 / 零花写 | **禁止** | 已有 |
| 周目标 / 周末小会写 | **禁止** | 须孩子本人表达 |

## 已做

- `tasks.controller`：`ForbidProxyGuard` + propose / defer-today
- `student-me.controller`：weekly-goal / weekend-review
- 护栏：`forbid-proxy.spec.ts`

## 手测

1. 家长代登 → 可打卡、可改今日顺序  
2. 代登 → 提任务 / 推迟今日 / 写周主题 / 写周末小会 → 403「代登会话不能执行此操作」  
3. 孩子本人登录 → 上述操作正常  

## 下一 PR

SEC PR4：上传签名绑查看者 — 见 [`SEC_UPLOAD_PR4_PLAN.md`](./SEC_UPLOAD_PR4_PLAN.md)（已完成）。
