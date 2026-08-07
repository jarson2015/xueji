# 学迹 · 主题周 / 作品集 / 近端愿望 · 回归清单

覆盖 [`EDU_THEME_PORTFOLIO_NEAR_P0_PLAN.md`](./EDU_THEME_PORTFOLIO_NEAR_P0_PLAN.md) ～ [`P5`](./EDU_THEME_PORTFOLIO_NEAR_P5_PLAN.md)。  
Demo：`parent@demo.com` / `demo1234`；登录码 `102938`（小明）、`203847`（小红）。  
API 改过后需重启 `apps/api`（约 3000）。

---

## 主题周

- [x] 学生今日 / Me：可定本周主题预设与小目标（今日抽屉入口 e2e；Me/保存人手）
- [x] 家长监控 / 周末小会：`ThemeWeekDrawer` 可改主题（监控入口 e2e；周末小会人手）
- [ ] 切换预设时默认标题刷新（非 custom）
- [x] 主题抽屉软建议文案可见（家长抽屉 e2e）；→ 任务页预填微习惯，**点发布才创建**（人手）
- [ ] 周末小会第 2 步：主题 chips 可填「改一件」
- [ ] 学生 Me「我想加一件小事」：主题 chips 可点填
- [x] 学生今日：主题卡下「我想加一件小事」抽屉可提交（入口 e2e / product；TV 不显示；提交人手）

## 成长作品集

- [x] `GET /growth/portfolio`：本周主题 + 主题史 + 照片/想法/里程碑（入口 e2e；字段人手抽查）  
- [x] 作品集 Tab「按主题周看」：全部 / 本周 / 历史过滤（filter unit + e2e；有数据切换人手）  
- [ ] 兑现近端愿望后时间轴出现里程碑（7 天同标题去重）  

## 近端愿望

- [x] 愿望最多 3 条近端；`nextWish` 优先近端（policy unit；第 4 条拒人手）
- [x] 家长愿望：近端模板 ≥ 6，分值 5–20（unit + 添加抽屉 e2e）
- [x] 学生愿望商店：「先兑这些」或商店结构可见（e2e；提议 chips 人手）
- [ ] 单孩周报 / Me 小结：可见 `nearWishStats` 文案

## 仪式与周末

- [ ] 周五–日：监控洞察「作品集收尾」；学生今日主题卡 CTA  
- [ ] 仪式屏：本周主题页；有历史时「走过的主题」页；今日节奏可带「靠近：愿望」  
- [ ] 周报：本周主题 + 作品集统计 + 近端统计  

## 自动化

- [x] `apps/web`：`themeWeek` / `nearWishTemplates` / `portfolioWeekFilter` unit + `e2e/theme|near-wish|portfolio`  
- [x] `apps/api`：`theme-week.spec` + `near-wish-policy.spec` 纳入 `test:unit`

---

## 仍不做（整条轨道）

主题自动绑任务 ID、静默建任务、作品集社交导出、Quest/Badge、改积分公式。  
