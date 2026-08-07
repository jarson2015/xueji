# P3 轮值 + 公平提示 开发计划

状态：**已落地**

目标：共享家务从「谁快谁做」升级为可选**轮值**；家长端对**完成偏斜**（尤其大孩包办）给温和提醒。不惩罚、不竞赛榜。

## 产品规则

| 能力 | 规则 |
|------|------|
| **轮值** | 仅当「共享完成」开启时可开；按指派学生序 + 周期 `periodKey` 定今日主责；非主责不进今日催促，可自愿做；主责做完仍归档他人 |
| **出生序** | 学生可选填「家里排行」1=大孩；未填则用账号创建时间先后近似 |
| **公平提示** | 近 14 天共享任务有效完成次数；≥2 孩且总次数够、某人占比过高 → 家长摘要一条软提示 |

## 实现项

| ID | 项 | 说明 |
|----|-----|------|
| B1 | 迁移 `0017` | `tasks.rotate_enabled`；`users.birth_order` |
| B2 | 纯函数 | `resolveRotateDutyStudentId`；`buildFairnessHint` + 单测 |
| B3 | `normalizeAssign` / `myTasks` | 下发 `rotateEnabled` / `isRotateDuty` / `rotateDutyName` / `rotateSkipToday` |
| B4 | 今日列表 | 排除 `rotateSkipToday`（非主责未完成） |
| B5 | 家长摘要 | `fairnessHint` 进 `/dashboard/summary` |
| F1 | 发布表单 | 共享完成下增加「按天轮值」开关 |
| F2 | 学生管理 | 排行（出生序）可编辑 |
| F3 | 家长监控 / 学生今日 | 公平提示条；「今天轮到你 / 轮到 XX」文案 |

## 非目标

- 强制非主责不能打卡
- 排行榜 / 积分惩罚
- 自动改 birth_order 的复杂家庭树

## 轮值算法摘要

```
sortedIds = 指派学生按 birthOrder↑、id↑
dutyIndex = hash(periodKey) % sortedIds.length
```

每日/每周随 `periodKey` 自然换人；一次性用当前日 key。
