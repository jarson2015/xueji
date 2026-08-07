# 学迹 · 部署 TRUST_PROXY / 密钥样例验收 · P1

承接 HANDTEST「部署：TRUST_PROXY + Nginx limit_req + 密钥清单」。

## 开发理由

1. 生产密钥与反代开关只能人手；但**仓库样例**（nginx `limit_req`、`.env.example` 的 `TRUST_PROXY`、`main.ts` 条件 trust）可自动锁死，防样例回退。  
2. `clientIp` 已单测；补「不读可伪造 Forwarded」断言，与 TRUST_PROXY 叙事一致。  
3. 非目标：不轮换本机真实密钥；不自动改生产 `.env`。

## 总览

| ID | 项 | 状态 |
|----|-----|------|
| **D.1** | deploy-guard unit：nginx / env.example / main.ts | 已完成 |
| **D.2** | clientIp：忽略伪造 Forwarded（helper 不读头） | 已完成 |
| **D.3** | 更新 SECURITY_SECRETS + HANDTEST 自动/人手分列 | 已完成 |

## 人手（仍必做）

见 `docs/SECURITY_SECRETS_CHECKLIST.md`「本机 / 生产」全部未勾项。

## 验收（本轨自动化）

- [x] deploy-guard + client-ip 扩展 unit 通过  
- [x] 清单注明样例已自动锁、生产仍人手  
