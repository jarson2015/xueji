# 学迹 · SEC PR2：学生会话吊销（`proxy_epoch` / JWT `pe`）

## 目标

刷新登录码或修改学生密码后，旧的码登录 / 密码登录 / 代登 JWT 立即失效。

## 已做

| 项 | 说明 |
|----|------|
| 签发 | 学生 JWT 一律带 `pe = proxyEpoch`（code / password / proxy） |
| 校验 | `JwtStrategy` + WS：DB role=student 时 `pe` 必须匹配 |
| 刷码 | 已有 bump；继续作废全部学生会话 |
| 改密 | `StudentsService.update` 改密码时 bump |
| 明文回退 | 删除 `loginCode` 明文查库；迁移 **0043** 清空残留明文列 |
| 护栏 | `session-epoch.spec.ts` |

无新列：复用 `users.proxy_epoch`。

## 部署

- 跑迁移 `1740000000043-ClearLegacyLoginCodePlaintext`
- 已登录学生若 token 无 `pe` 且 `proxy_epoch>0` 会 401 → 重新用码/密码登录即可
- 家长刷码后：孩子端与代登需重新进入

## 下一 PR

SEC PR3：`@ForbidProxy` 对齐 — 见 [`SEC_FORBID_PROXY_PR3_PLAN.md`](./SEC_FORBID_PROXY_PR3_PLAN.md)（已完成）。
