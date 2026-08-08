# 学迹 · SEC P2b：CSP / 非 root / 码短时 / 周报投影

承接安全审计剩余 P2（计划归属与 WS 瘦载荷见 [`SEC_P2_PLANS_WS_PLAN.md`](./SEC_P2_PLANS_WS_PLAN.md)）。

## 已做

| 项 | 说明 |
|----|------|
| Nginx 安全头 | `CSP`（允许本站 + Google Fonts + ws/wss）、`nosniff`、`X-Frame-Options DENY`、`Referrer-Policy`、`Permissions-Policy` |
| HSTS | **不在**明文 :80 上开；注释提示在外层 HTTPS 终结处开启 |
| API 非 root | `apps/api` 镜像 entrypoint：root 修 uploads 权限后 `su-exec node` |
| 登录码短时 | 家长页 `sessionStorage` 明文码 10 分钟 TTL，超时回 hint |
| 周报投影 | assigns/checkins QueryBuilder 窄 select；连击改 `streaksForStudents` |
| httpOnly JWT | **未做**（长期评估：会改 WS `auth.token` 与代登备份流） |

## 飞牛注意

- 预编译包 `study-web` 仍可用 `user: "0:0"`（NAS 挂载权限）；加固在 **nginx 响应头**。
- 重打飞牛包后替换 `nginx.conf`；API 源码镜像路径受益于非 root。

## 护栏

- `deploy-guard.spec.ts`（CSP + Dockerfile su-exec）
- `perf-hotpath.spec.ts`（weekly 窄投影 / batch streak）

## 手测

1. 打开站点 → Response Headers 含 `Content-Security-Policy`、`X-Content-Type-Options`  
2. 页面正常（字体、登录、WS 提示）  
3. 刷新登录码后约 10 分钟再开孩子页 → 明文码不再常驻（见 hint）  
4. 周报仍可打开且完成率/热力正常  
