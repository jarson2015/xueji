# 学迹 · 密钥与制品卫生清单（S0.5 / S1）

生产或 NAS 部署前请人工核对（**不要把真实密钥提交进仓库**）。

## 仓库样例（自动）

- [x] `deploy/fnos-native/nginx.xueji.conf` 含 `limit_req` 于 login / login-code（`deploy-guard` unit）
- [x] `deploy/fnos-native/.env.example` 含 `TRUST_PROXY=1`（unit）
- [x] `deploy/fnos-prebuilt-docker/.env.example` 含 `TRUST_PROXY=1`（unit）
- [x] 生产 compose **不**映射宿主机 API `3000` / MySQL `3306`（unit；本地见 `docker-compose.demo.yml`）
- [x] 飞牛预编译挂整份 `nginx.conf`（含 `limit_req_zone`）（unit）
- [x] `apps/api`：`main.ts` 条件 trust proxy；`clientIp` 不读 `X-Forwarded-For`（unit）

## 本机 / 生产（人手）

- [ ] `apps/api/.env`、`deploy/**/.env`、本机 `release/**/.env` 中的 `JWT_SECRET`、`DB_PASSWORD`、VAPID 私钥均为**本机独有强随机值**，且与仓库示例串不同  
- [ ] 若曾把含真实密钥的 `release/` 包外发：视为泄露，**轮换** JWT、数据库密码、VAPID（`npx web-push generate-vapid-keys`）  
- [ ] 生产 `NODE_ENV=production`，`ENABLE_DEMO_HINTS=false`，勿 seed 演示家庭到生产库  
- [ ] `CORS_ORIGIN` 仅指向真实前端源  
- [ ] 反代后已实际设 `TRUST_PROXY=1`（见 `deploy/fnos-native/.env.example` / 预编译 `.env.example`）；未设时进程**不**盲信 `X-Forwarded-For`  
- [ ] Nginx **已 reload** 并套用 `limit_req`（飞牛预编译用包内 `nginx.conf`；原生见 `deploy/fnos-native/nginx.xueji.conf`）  
- [ ] 宿主机 **不可**直连 `:3000` 绕过网关（仅 `:8080` 或你的 `WEB_PORT`）  
- [ ] **多实例 / 多副本**：进程内 `RateLimitService` **不共享**；登录码 / 登录 / 注册限流已在 Nginx 样例按 IP 再限一层（`limit_req`）；跨副本共享仍可选 Redis（未内置）  
- [ ] 上传图需签名 URL（含 `exp`/`uid`/`sig`）；裸 `/uploads/文件名` 应 401；内容须为真实图片魔数  

当前源码能力摘要（S-P0）：登录码 TTL 14 天 + crypto；尝试 8/IP + 5/码 + 失败 6/IP /15min；上传 HMAC + 魔数；`requireSafeUploadPath` 打卡/零花双保险；邀请接受有限流；注册/建生密码 ≥6；限流桶过期淘汰。
