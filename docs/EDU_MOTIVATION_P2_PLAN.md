# 教育向动机优化 · P2 可执行开发计划

承接 [`EDU_MOTIVATION_PLAN.md`](./EDU_MOTIVATION_PLAN.md) 中 **P2 表**。  
原则：默认值与软提示优先；不静默改库；不新建「生病」枚举表。

状态：**已落地**（核对后补齐学生端 makeup 文案/默认回落）

---

## 范围（来自主表）

| ID | 主表项 | 可执行拆解 | 主要触点 |
|----|--------|------------|----------|
| **P2.1** | 愿望默认 kind=陪伴/体验；金手指二次确认 | ① 实体/迁移 `kind` 默认 `experience` ② 家长创建表单默认体验 ③ 家长创建/改为金手指二次确认 ④ 学生兑换金手指二次确认（文案：先缓缓，非买免做） | `wish-item.entity`、迁移 `0019`、`WishesView`、`RewardsView` |
| **P2.2** | 兑换超时未兑现 → 家长软 nudge | ① summary 统计 pending >3 天 ② 监控横幅 + 跳转愿望 | `dashboard.service`、`MonitorView` |
| **P2.3** | makeup 低折扣默认 / 生病标签 | ① 新家庭默认折扣 **50%**（实体+策略+前端） ② 约定页说明偏「生病/特殊收尾」 ③ 学生今日补进度回落与文案对齐（**不**新建枚举） | `family-settings`、`family-policy.reader`、`RestDaysView`、`TodayView` |
| **P2.4** | 新手期满后半自动切换 `rewardMode`（可撤销） | ① 约定页：仍 `always` 且满淡出条件 → **预选**建议模式 ② 保存才生效 ③ 可一键改回 | `RestDaysView`（不在 GET 时写库） |

### 非目标
- GET `/family/settings` 时强制改写 `rewardMode`
- 新建生病/特殊收尾枚举列
- 学生端隐藏兄妹余额（可进 P3）

---

## 迁移

| 迁移 | 内容 |
|------|------|
| `1740000000019` | `wish_items.kind` DEFAULT → `experience`；`family_settings.makeup_discount_percent` DEFAULT → 50（仅 default，不改历史行） |

---

## 验收清单

- [x] 新建愿望默认偏体验；金手指创建/兑换有二次确认；学生端不写「买免做」口吻
- [x] 监控：pending 兑换超 3 天出现软提示并可去兑现
- [x] 新家庭 / 未设置时补进度按 50%；家长与学生文案含特殊收尾语义
- [x] 约定页淡出条件满足时预选模式，保存生效，可改回 always

---

## 与 P1 文档关系

P1 漏项核对见 [`EDU_MOTIVATION_P1P2_PLAN.md`](./EDU_MOTIVATION_P1P2_PLAN.md)。本文件仅锁定 **P2** 执行范围，避免与 P1 混排漏项。
