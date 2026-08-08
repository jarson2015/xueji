# 学迹 · 合理化改进落地计划

依据产品分析四维度建议，分 5 阶段交付。

## 阶段 1 · 首次体验与信息架构（UI/UX）✅

| ID | 建议 | 状态 |
|----|------|------|
| 1.1 | 家长 3 步向导 | ✅ `OnboardingWizard` + `useParentOnboarding` |
| 1.2 | 学生 2 步向导 | ✅ 布局内向导；打卡成功自动完成 |
| 1.3 | 信息架构收敛 | ✅ 家长日常/家庭分组；学生今日+奖励+更多 |
| 1.4 | 空状态与失败文案 | ✅ `EmptyState` + `friendlyError` |
| 1.5 | 儿童向确认交互 | ✅ `SoftPrompt` 卡片确认 |

## 阶段 2 · 家庭和谐与沟通 ✅

| ID | 建议 | 状态 |
|----|------|------|
| 2.1 | 沟通优先 | ✅ 再改改/先缓缓强制短评 + 模板 |
| 2.2 | 家庭公约页 | ✅ `/family/covenant` + 家长/学生视图 |
| 2.3 | 双家长协同 | ✅ WS `family:co-parent` + 审计 |
| 2.4 | 弱化监控感 | ✅ 周报「各自节奏」默认折叠 |
| 2.5 | 家庭感谢仪式 | ✅ 公约页「本周感谢」 |

## 阶段 3 · 教育心理与习惯/情商 ✅

| ID | 建议 | 状态 |
|----|------|------|
| 3.1 | 奖励褪除策略 | ✅ always / random / weekly_digest |
| 3.2 | 情商与生活模板包 | ✅ templates.ts 扩展 |
| 3.3 | 打卡后反思题 | ✅ 可选反思写入备注 |
| 3.4 | 补卡教育叙事 | ✅ 统一「补上进度」文案 |
| 3.5 | 分龄模式 | ✅ ageBand + kid-mode 样式 |

## 阶段 4 · 工程稳健与生产门禁 ✅

| ID | 建议 | 状态 |
|----|------|------|
| 4.1 | 领域逻辑收敛 | ✅ `task-lifecycle/lifecycle.ts` |
| 4.2 | 不变量单测 | ✅ `npm run test:unit` |
| 4.3 | E2E/冒烟 | ✅ 既有 smoke + 单测（引导为前端状态） |
| 4.4 | 前端性能 | ✅ 路由懒加载 + manualChunks |
| 4.5 | 可观测性 | ✅ health 含 DB；audit_logs |
| 4.6 | 生产门禁文档 | ✅ README 上线清单 |

## 阶段 5 · 打磨与收尾 ✅

| ID | 建议 | 状态 |
|----|------|------|
| 5.1 | 儿童交互统一 | ✅ SoftPrompt / 大按钮 / kid-mode |
| 5.2 | 全链路自检 | ✅ unit 通过；上线前再跑 smoke |
| 5.3 | 计划勾选闭环 | ✅ 本文件全部完成 |

---

**进度：** 合理化改进五阶段已完成。

## 下一步候选

- ~~**E6 验收加固**~~：工程完成（真机待勾）— [`docs/EDU_E6_HARDENING_PLAN.md`](./docs/EDU_E6_HARDENING_PLAN.md)。
- ~~**V1.5 成就奖金**~~：工程完成（需跑迁移）— [`docs/V1_5_ACHIEVEMENT_BONUS_PLAN.md`](./docs/V1_5_ACHIEVEMENT_BONUS_PLAN.md)。
- 总索引：[`docs/NEXT_TRACK_INDEX.md`](./docs/NEXT_TRACK_INDEX.md)。
- ~~**V1 零花钱账本**~~：已落地（开关默认关；演示小明已开）。
- ~~**投入使用 polish**~~：周汇总可见、反思对齐 API、EmptyState/friendlyError、teen 分龄、引导挂钩数据、情商模板分组、nudge 可编辑、先缓缓和解提示、消费可选反思。
- ~~**P0 上线门禁**~~：生产关 seed/demo-hints、CORS 强制、Compose 密钥必填、登录去预填、引导发码步修正。
- ~~**分龄情绪 E1–E5**~~：已完成 — 见 [`docs/EDU_AGE_EMOTION_ROADMAP.md`](./docs/EDU_AGE_EMOTION_ROADMAP.md)。

---

## 投入使用 polish（本轮）✅

| ID | 项 | 状态 |
|----|----|------|
| P1 | 周汇总结算 UI（Reports/Me） | ✅ |
| P2 | 反思题对齐 API + 分龄题库 | ✅ |
| P3 | EmptyState / friendlyError 统一 | ✅ 关键页 |
| P4 | 清理 audit-probe；teen 安静庆祝 | ✅ |
| P5 | 引导 4 步 + 按真实数据跳步 | ✅ |
| P6 | 情商生活模板 Tab + 奖励阶段提示 | ✅ |
| P7 | 零花钱消费反思 / nudge 可编辑 / 先缓缓和解 | ✅ |
