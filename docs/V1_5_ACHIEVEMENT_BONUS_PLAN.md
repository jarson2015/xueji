# 学迹 · V1.5 成就奖金计划

承接 [`V1_ALLOWANCE_LEDGER.md`](./V1_ALLOWANCE_LEDGER.md) §9。  
状态：**工程已完成**（需跑迁移后验收）

---

## 总览

| ID | 项 | 状态 |
|----|-----|------|
| **V15.0** | 开关与文案护栏 | ✅ FamilyEdu 零花细则 |
| **V15.1** | `achievement_claims` + settings 字段 | ✅ 迁移 `1740000000037` |
| **V15.2** | API create / post / cancel / list | ✅ `/allowance/achievements*` |
| **V15.3** | 家长 UI SoftPrompt | ✅ AllowanceView |
| **V15.4** | 学生流水可见 bonus 标题 | ✅ 入账标题「成就奖金 · …」 |
| **V15.5** | 文档 / HANDTEST | ✅ |

## 迁移

```bash
cd apps/api && npm run migration:run
```

（或项目既有迁移命令。）开关默认关；开启成就奖金后家长可在零花钱页登记。
