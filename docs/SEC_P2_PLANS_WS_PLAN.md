# 学迹 · SEC P2：计划项归属 + WS 瘦载荷

承接安全审计 P2（非 Redis、非改积分公式）。

## 已做

| 项 | 说明 |
|----|------|
| 计划 `taskId` | `addItem` 仅允许已指派给该学生的任务（`TaskAssign` + active） |
| `wish:proposed` / `task:proposed` | 只推 id/title/message，不推完整实体 |
| `redeem:requested` | 瘦 `redeem` + `wish.title`（兼容 Monitor patch） |
| WS `ping` | 固定 `{ ok: true }`，不回显 body |

## 护栏

- `plans/plans-ownership.spec.ts`
- `events/ws-payload.spec.ts`

## 手测

1. 学生计划项选未指派/他人任务 id → 400「只能选择已指派给你的任务」  
2. 指派任务可正常加入计划  
3. 孩子提议愿望/任务 → 家长仍有提示；Network/WS 载荷无整表字段  

续：[`SEC_P2B_HEADERS_NONROOT_PLAN.md`](./SEC_P2B_HEADERS_NONROOT_PLAN.md)（CSP / 非 root / 码 TTL / 周报投影）。
