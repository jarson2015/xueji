# 学迹 · SEC PR1：部署硬化（端口 / TRUST_PROXY / 网关限流）

## 目标

防止直连 API 绕过 Nginx `limit_req`；反代后限流看到真实客户端 IP。

## 已做

| 项 | 说明 |
|----|------|
| 根 `docker-compose.yml` | 去掉宿主机 `3000`/`3306`；`TRUST_PROXY` 默认 1；`expose` 仅容器网 |
| `docker-compose.demo.yml` | 本地调试才映射 3000/3306 |
| `docker-compose.fnos.yml` + `deploy/fnos-prebuilt-docker/` | API 不映射 3000；挂整份 `nginx.conf`（含 `limit_req_zone`） |
| `.env.example` / `.env.fnos.example` / `.env.compose.example` | 补齐 `TRUST_PROXY=1` |
| 打包脚本 | `pack-fnos-docker.ps1` 打入 `nginx.conf` |
| 护栏 | `deploy-guard.spec.ts` |

## 升级注意

- 生产 `.env` 补 `TRUST_PROXY=1`
- 覆盖 `nginx.conf` + compose；删除误建成目录的 `nginx-web.conf`
- 验证：`NAS:8080/api/health` 通；`NAS:3000` 应不可达

## 下一 PR

SEC PR2：学生会话吊销 — 见 [`SEC_SESSION_PR2_PLAN.md`](./SEC_SESSION_PR2_PLAN.md)（已完成）。
