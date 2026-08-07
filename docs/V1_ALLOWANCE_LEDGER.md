# V1 · 零花钱账本 + 储蓄目标 + 公约开关

> 范围：**不做**成绩兑现金（留给 V1.5 成就奖金）。  
> 原则：与学迹积分**完全隔离**；默认关闭；引导延迟满足与分类消费。

---

## 1. 产品边界

| 做 | 不做（V1） |
|----|------------|
| 每学生一个零花钱账户（分，整数） | 积分兑人民币 |
| 收入/支出记账 + 分类 | 成绩/名次自动发钱 |
| 储蓄目标（想买的东西） | 银行卡/真实支付对接 |
| 公约开关 + 简单家庭约定 | 规则变更双确认流（V2） |
| 家长只读流水 / 可选大额确认 | 多币种、利息、投资 |

**金额单位：** 一律用「分」存库（`amountCents: int`），展示时 ÷100 为元，避免浮点误差。

---

## 2. 数据模型

### 2.1 扩展 `family_settings`（公约开关与约定）

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `allowance_ledger_enabled` | boolean | `false` | 公约开关：是否展示零花钱功能 |
| `allowance_weekly_cents` | int null | null | 建议每周零花钱（分）；仅展示/提醒，不自动入账 |
| `allowance_large_cents` | int | `5000`（¥50） | 单笔支出 ≥ 此值需家长确认 |
| `allowance_save_percent` | int | `0` | 建议先存比例 0–50；0=不启用提醒 |
| `allowance_note` | text null | null | 公约里展示的零花钱说明文案 |

> 多家长：与现有一致，读学生侧时取绑定家长设置的并集策略——`enabled` 任一为 true 即开；`large_cents` 取更严（更小）；`weekly` 取有值的第一条。

### 2.2 新表 `allowance_accounts`

每名学生一行账户。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | PK | |
| `student_id` | int unique | → users.id |
| `balance_cents` | int default 0 | 当前余额（分），≥0 |
| `created_at` / `updated_at` | datetime | |

**不变量：** `balance_cents` = 所有已生效流水 `delta_cents` 之和（以账本为准，账户表为缓存；入账事务内双写）。

### 2.3 新表 `allowance_entries`（流水）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | PK | |
| `student_id` | int | |
| `account_id` | int | → allowance_accounts |
| `delta_cents` | int | 收入为正，支出为负 |
| `kind` | varchar(24) | 见枚举 |
| `category` | varchar(24) null | 支出/部分收入分类 |
| `title` | varchar(80) | 简短说明 |
| `note` | varchar(200) null | |
| `image_url` | varchar(255) null | 可选凭证，仅 `/uploads/` |
| `status` | varchar(16) | `posted` \| `pending` \| `rejected` |
| `goal_id` | int null | 关联储蓄目标（存入目标时） |
| `created_by` | int | 操作者 user id（学生或家长） |
| `reviewed_by` | int null | 家长确认人 |
| `review_note` | varchar(200) null | 家长短评（拒时必填） |
| `created_at` | datetime | |
| `posted_at` | datetime null | 真正入账时间 |

**`kind` 枚举**

| 值 | 含义 | 谁可建 |
|----|------|--------|
| `pocket_money` | 定期零花钱入账 | 家长（或学生申请后家长确认） |
| `bonus` | 其他奖励（压岁钱、额外奖励；**预留**成就奖金） | 家长 |
| `gift_in` | 收到的礼金等 | 双方 |
| `spend` | 消费支出 | 学生（大额 pending） |
| `save` | 划入储蓄目标（余额减少，目标进度增加） | 学生 |
| `unsave` | 从目标退回可用余额 | 学生（可选） |
| `adjust` | 家长校正 | 家长 |

**`category` 枚举（支出为主）**

`snack` | `stationery` | `play` | `gift` | `transport` | `save` | `other`

**状态机**

```
学生记支出：
  |delta| < large  → posted（立即扣余额）
  |delta| ≥ large  → pending（不扣）→ 家长 approve → posted
                              ↘ reject → rejected（不扣）

家长直接入账收入 → 一律 posted
```

### 2.4 新表 `allowance_goals`（储蓄目标）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | PK | |
| `student_id` | int | |
| `title` | varchar(80) | 如「遥控车」 |
| `target_cents` | int | 目标金额 |
| `saved_cents` | int default 0 | 已存入该目标 |
| `status` | varchar(16) | `active` \| `achieved` \| `cancelled` |
| `cover_url` | varchar null | 可选 |
| `created_at` / `updated_at` | | |

**不变量：** `saved_cents ≤ target_cents`；`save` 流水累加 `saved_cents` 并减少账户 `balance_cents`。  
达成时：`status=achieved`，可提示「和爸妈一起兑现购买」（不自动扣款到外部）。

### 2.5 与现有实体关系

```
User(student)
  ├── 1:1 AllowanceAccount
  ├── 1:N AllowanceEntry
  ├── 1:N AllowanceGoal
  └── pointsBalance / Wish*   ← 互不读写

FamilySettings
  └── allowance_* 开关与约定 → 写入 /family/covenant 只读摘要
```

**禁止：** 任何 API 把 `pointsBalance` 转为 `balance_cents`。

---

## 3. API 设计

前缀建议：`/api/allowance/*`，JWT + Roles。

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/allowance/me` | student | 账户 + 最近流水 + 活跃目标；未开开关 → 403 或 `{ enabled:false }` |
| GET | `/allowance/students/:id` | parent | 指定孩子账本摘要 |
| POST | `/allowance/entries` | student/parent | 记账；body 含 kind/amount/category… |
| POST | `/allowance/entries/:id/review` | parent | `{ action, note? }` 大额确认 |
| GET | `/allowance/entries` | both | 分页流水；家长可 `?studentId=` |
| GET/POST | `/allowance/goals` | student | 列表 / 新建目标 |
| PATCH | `/allowance/goals/:id` | student | 改标题/目标额/取消 |
| POST | `/allowance/goals/:id/save` | student | `{ amountCents }` → 生成 save 流水 |
| GET/PUT | `/family/settings` | parent | 扩展 allowance_* 字段 |
| GET | `/family/covenant` | both | 增加零花钱开关与约定摘要 |

**错误文案（温和）：**  
「余额不够啦，先存一点再买」；「这笔稍大，等家长看一眼」；「家庭还没打开零花钱账本」。

---

## 4. 页面结构

### 4.1 信息架构

```
家长
  家庭（More / 侧栏）
    ├─ 休息与约定     ← 增加「零花钱约定」区块 + 开关
    ├─ 家庭公约       ← 只读展示开关状态与约定
    └─ 孩子零花钱     ← 新页 /parent/allowance（选孩子）

学生（仅开关开启时入口可见）
  更多
    └─ 我的零花钱     ← /student/allowance
  （可选）奖励页底链「零花钱账本」
```

手机底栏**不新增 Tab**（保持今日/奖励/更多），避免认知过载。

### 4.2 页面清单

| 路由 | 文件（建议） | 职责 |
|------|----------------|------|
| `/parent/rest-days` | 扩展 `RestDaysView.vue` | 开关、周零花钱、大额阈值、储蓄建议%、说明文案 |
| `/parent/covenant` | 扩展 `CovenantView.vue` | 只读：是否开启、约定摘要 |
| `/parent/allowance` | **新建** `parent/AllowanceView.vue` | 选学生 → 余额、待确认大额、流水、只读目标 |
| `/parent/more` | 扩展 `MoreView.vue` | 入口「孩子零花钱」（开关开时高亮） |
| `/student/allowance` | **新建** `student/AllowanceView.vue` | 余额英雄区、记一笔、目标、流水 |
| `/student/more` | 扩展 `MoreView.vue` | 入口（`enabled` 时显示） |
| `/student/rewards` | 可选一行链出 | 「积分愿望」与「零花钱」并列说明隔离 |

### 4.3 学生页线框（单页多区块）

```
┌─────────────────────────────────┐
│ 我的零花钱          余额 ¥xx.xx │
│ 本周已花 ¥x · 还可以存一存      │
├─────────────────────────────────┤
│ [记一笔支出]  [存入目标]  [收入?] │  ← 收入：学生仅「收到礼金」类；
│                                    零花钱入账以家长为主
├─────────────────────────────────┤
│ 储蓄目标                         │
│ 遥控车 ████░░  ¥80 / ¥200       │
│ [存一点]                         │
├─────────────────────────────────┤
│ 最近流水                         │
│ -¥12 零食  今天                  │
│ +¥50 零花钱  周一 · 妈妈         │
│ ⏳ -¥60 玩具  等家长看看         │
└─────────────────────────────────┘
```

**记一笔：** 底部抽屉（复用现有 drawer 模式）— 金额、分类芯片、说明、可选照片。  
**大额：** 提交后状态「等家长看看」，不立刻扣余额。

### 4.4 家长页线框

```
┌─────────────────────────────────┐
│ 孩子零花钱     [小明 ▼]         │
│ 余额 ¥xx  · 待确认 1 笔         │
├─────────────────────────────────┤
│ 待确认                           │
│ 小明 · 玩具 -¥60                │
│ [同意入账] [先缓缓+短评]         │
├─────────────────────────────────┤
│ 快捷：发本周零花钱（按约定金额） │
├─────────────────────────────────┤
│ 流水 / 目标（只读）              │
└─────────────────────────────────┘
```

「先缓缓」强制短评模板（与愿望一致）：沟通优先。

### 4.5 公约展示文案示例

- 开启中：每周建议零花钱 ¥xx；超过 ¥yy 的支出会一起确认；建议先存 zz%。  
- 关闭：家庭暂未开启零花钱账本（学迹积分愿望仍可用）。

---

## 5. 后端模块落点

```
apps/api/src/allowance/
  allowance.module.ts
  allowance.service.ts      # 账户、入账事务、大额审核、目标存入
  allowance.controller.ts
  dto.ts
entities/
  allowance-account.entity.ts
  allowance-entry.entity.ts
  allowance-goal.entity.ts
migrations/
  1740000000007-AllowanceLedger.ts
```

`FamilyService.toDto` / `covenantForStudent` 扩展 allowance 字段。  
`AuditService`：大额拒绝、家长发零花钱 → 可选记审计 + 共家长通知。

---

## 6. 前端组件复用

| 已有 | 用于 |
|------|------|
| `SoftPrompt.vue` | 家长拒大额、确认发零花钱 |
| `EmptyState.vue` | 无流水 / 无目标 |
| `friendlyError` | 余额不足等 |
| 公约页模式 | 只读规则 |
| `/uploads` | 支出凭证图 |

新建可选：`MoneyAmount.vue`（分↔元展示）、`CategoryChips.vue`。

---

## 7. 种子与演示

- `allowance_ledger_enabled=false`（默认关，演示可在 seed 为小明打开）。  
- 小明账户：余额 5000 分；一笔零花钱收入；一个目标「课外书」target 3000。  
- README：说明与积分隔离、单位为元展示。

---

## 8. 验收清单（V1）

1. 开关关闭：学生「更多」无入口；直链 API 返回未开启。  
2. 开关开启：学生可记账；余额正确；流水可查。  
3. 支出 ≥ 阈值：pending → 家长同意后扣款；拒绝不扣且有短评。  
4. 存入目标：余额减少、`saved_cents` 增加；达目标状态变更。  
5. 公约页能看到开关与约定摘要。  
6. 任意路径无法用积分增加 `balance_cents`。

---

## 9. 后续（非 V1，仅挂接预留）

- **V1.5 成就奖金：** `kind=bonus` + 来源表 `achievement_claims`；入账只写 allowance，不碰 points。  
- **V2：** 规则变更双确认、冷静期、周消费温和回顾。

---

## 10. 建议实现顺序

1. Migration + 三实体 + FamilySettings 字段  
2. `AllowanceService` 入账事务与审核  
3. 学生 `AllowanceView`  
4. 家长 `AllowanceView` + RestDays/Covenant/More 入口  
5. Seed + smoke 用例（开开关 → 记账 → 大额审核 → 存目标）
