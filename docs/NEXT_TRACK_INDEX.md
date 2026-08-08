# 学迹 · 下一轨总索引（E6 / V1.5 / UI）

E1–E5 分龄情绪深化已完成。后续分两条轨，**可并行、建议有先后**；另开 UI/UX 抛光轨。

| 轨 | 文档 | 性质 | 状态 |
|----|------|------|------|
| **E6** | [`EDU_E6_HARDENING_PLAN.md`](./EDU_E6_HARDENING_PLAN.md) | 教育：真机验收 + 隐私/混龄/深链/e2e 加固 | 工程完成（真机待勾） |
| **V1.5** | [`V1_5_ACHIEVEMENT_BONUS_PLAN.md`](./V1_5_ACHIEVEMENT_BONUS_PLAN.md) | 产品：成就奖金进零花钱（与积分隔离） | 工程完成（需迁移） |
| **UI** | [`UI_UX_U1U4_PLAN.md`](./UI_UX_U1U4_PLAN.md) | 体验：U1–U4 + UJ | **本轨完成** |
| **PERF** | [`PERF_P0_PLAN.md`](./PERF_P0_PLAN.md) … [`PERF_P6_PLAN.md`](./PERF_P6_PLAN.md) | 响应速度 / 服务器开销（索引·批处理·前端拆 chunk·首屏 lite） | 工程完成（需迁移 0039–0042） |
| **SEC** | [`SEC_DEPLOY_PR1_PLAN.md`](./SEC_DEPLOY_PR1_PLAN.md) … [`SEC_UPLOAD_PR4_PLAN.md`](./SEC_UPLOAD_PR4_PLAN.md) · [`SEC_P2_PLANS_WS_PLAN.md`](./SEC_P2_PLANS_WS_PLAN.md) · [`SEC_P2B_HEADERS_NONROOT_PLAN.md`](./SEC_P2B_HEADERS_NONROOT_PLAN.md) | 部署/会话/代登/上传 + 计划/WS + CSP/非 root | **PR1–PR4 + P2/P2b 完成**（httpOnly 长期评估） |

## 建议顺序

1. **部署含 SEC PR1 + PERF 的新包**（保留 `.env` / uploads；补 `TRUST_PROXY=1`；用包内 `nginx.conf`）  
2. **E6.0** 真机闸门（勾选 HANDTEST E1–E5「真机」或记缺陷）  
3. 若尚未跑过：**迁移 0037–0043**（`.env` 临时 `DB_MIGRATIONS_RUN=true`，成功后改回 `false`）  
## 仍不做（跨轨）

第四 age_band、说说计分/Monitor 待办化、AI 情绪诊断排行、改积分公式、静默改 `rewardMode`、自动报警、成绩与积分互通。

## 上游

- 教育总图：[`EDU_AGE_EMOTION_ROADMAP.md`](./EDU_AGE_EMOTION_ROADMAP.md)  
- 合理化五阶段：[`DEVELOPMENT_PLAN.md`](../DEVELOPMENT_PLAN.md)  
- 零花钱 V1：[`V1_ALLOWANCE_LEDGER.md`](./V1_ALLOWANCE_LEDGER.md)  
- 手测：[`HANDTEST_REGRESSION_MASTER.md`](./HANDTEST_REGRESSION_MASTER.md)
