# 学迹 · 安全验收闭环 P1

承接 [`EDU_SECURITY_P0_PLAN.md`](./EDU_SECURITY_P0_PLAN.md)。  
原则：**能自动化的进 smoke/e2e；限流暴打、密钥轮换、真机推送仍人手。**

状态：**已落地**

---

## 开发理由

1. **问题**：S-P0 代码已合，HANDTEST 安全项大半未勾 → 「已落地」与「可回归」脱节。  
2. **目标**：用 API `smoke` + Playwright 锁住：弱密注册、无签名读图、打卡/零花外链、假图片魔数。  
3. **非目标**：e2e 打满登录码限流（太慢易伤 demo）；不自动轮换本机密钥。

---

## 总览

| ID | 项 | 状态 |
|----|-----|------|
| **V1.1** | `smoke.ts`：弱密注册拒；裸 `/uploads`→401；零花外链 cover 拒；假 png 上传拒 | ✅ |
| **V1.2** | Playwright：注册密码 &lt;6 前端提示；请求无签名 uploads→401 | ✅ |
| **V1.3** | HANDTEST / 本计划勾选；e2e 仍依赖本机 API | ✅ |

---

## 验收

- [x] `npm run smoke`（API 已起）通过  
- [x] `apps/web` `npm run test:e2e` 通过（6 条）  
- [x] HANDTEST 对应安全项可勾（自动化部分）

## 仍人手

- 错误登录码 / 邀请码打到限流提示  
- 带签名的真实图片可加载  
- `TRUST_PROXY` + Nginx + 密钥轮换清单  
