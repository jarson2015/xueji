# 学迹 · 家庭手账 P0

承接产品定案：家庭表达与学生自愿私密日记分离；一键分享二层确认直接发帖。

## 产品定案

| 项 | 定案 |
|----|------|
| 名称 | 家庭手账（副题：我们的成长记录） |
| 家庭帖 | 发帖 + 心情 + 一级评论；`family` / `parents`；不计分；非待办 |
| 私密日记 | 独立实体；默认关；学生自愿开启；无评论；家长无入口 |
| 代登 | JWT `proxy`；私密读写/开关/分享一律 403 |
| 分享 | 服务端建家庭帖；二层 SoftPrompt；不经剪贴板 |

## 总览

| ID | 项 | 状态 |
|----|-----|------|
| **J0.1** | 计划文档 + HANDTEST | 完成 |
| **J0.2** | enter-as JWT proxy + strategy | 完成 |
| **J0.3** | Migration 0032 + entities | 完成 |
| **J0.4** | JournalModule API | 完成 |
| **J0.5** | JournalView + More + 双层分享 SoftPrompt | 完成 |
| **J0.6** | unit / e2e + HANDTEST 勾选 | 完成 |

## 非目标（P1/P2）

配图、二级跟帖、未读角标、周末小会引用、Push、作品集深链。

**后续改进：** 见 [EDU_FAMILY_JOURNAL_IMPROVE_PLAN.md](./EDU_FAMILY_JOURNAL_IMPROVE_PLAN.md)（P0.5 信任热修 → P1 养成 → P2 弱连接）。

## 人手

- [ ] 真发帖评论与私密日记；代登确认看不到私密  
- [ ] 真二层分享到家庭手账  

## 验收（自动化）

- [x] 文案 / 权限 unit  
- [x] e2e More 入口 + 手账页  
- [x] HANDTEST 已勾  

生产部署：新迁移需 `DB_MIGRATIONS_RUN=true` 跑一次（飞牛预编译包惯例）。
