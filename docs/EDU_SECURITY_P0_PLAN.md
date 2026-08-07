# 学迹 · 安全 P0 开发计划

承接评审结论：密钥卫生、登录码暴力面、限流边界、图片 URL 深度防御。  
原则：**可代码落地的先做；人工密钥轮换写进清单不代替执行；不做登录码 8 位无迁移、不上 Redis。**

状态：**已落地（代码）· 人工密钥轮换见清单**

---

## 开发理由

| 理由 | 说明 |
|------|------|
| 孩子入口 | 6 位登录码是主入口；限流/IP 不可信则防护名存实亡 |
| 隐私承诺 | 打卡/零花图应仅本机 `/uploads/`；DTO 与 Service 不一致易漂移 |
| 部署真实 | 飞牛/Nginx 反代场景下盲信 `X-Forwarded-For` 可伪造绕过限流 |
| 验收 | 用单测锁住安全行为，减少 HANDTEST「已落地」再漂 |

---

## 总览

| ID | 项 | 类型 | 状态 |
|----|-----|------|------|
| **S-P0.1** | 图片 URL：`requireSafeUploadPath`；打卡 DTO `@Matches` + 零花 Service；单测 | 代码 | ✅ |
| **S-P0.2** | `TRUST_PROXY` + `clientIp`；限流桶淘汰；Nginx `limit_req` 示例 | 代码+部署样例 | ✅ |
| **S-P0.3** | 登录码：8/IP + 5/码 + 失败 6/IP /15min | 代码 | ✅ |
| **S-P0.4** | 注册前端密码 ≥6；密钥清单 / HANDTEST | 代码+文档 | ✅ |
| **S-P0.H** | 人工：轮换本机/release 真实密钥 | 人工 | 清单待勾 |

### 非目标

- 登录码改为 8 位（需迁移）
- Redis 全局限流
- 自动删除用户本机 `release/**/.env` 文件内容

---

## 验收

- [x] `requireSafeUploadPath` 拒外链；打卡/零花写入前均调用
- [x] 无 `TRUST_PROXY` 时限流 IP 不取自可伪造的 Forwarded 头
- [x] 登录码配额收紧；失败另计
- [x] `apps/api` `test:unit` 通过；注册前端拦 &lt;6
- [x] `SECURITY_SECRETS_CHECKLIST` / 本计划勾选更新
