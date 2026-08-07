# 学迹 · 主题周 + 成长作品集 + 近端愿望（P0）

承接动机衰减分析：用**章节感、过程可见、近端可兑**对抗「积分打卡变作业」。  
原则：**复用周目标 / Growth / Wish，少造表；文案与默认体验优先；不新建 Quest/Badge 系统。**

状态：**已落地**

---

## 总览

| ID | 项 | 状态 | 主要触点 |
|----|-----|------|----------|
| **P0.1** | 主题周 | 已落地 | `student_weekly_goals` 扩字段、预设、今日横幅、家长/学生设定 |
| **P0.2** | 成长作品集 | 已落地 | `GET growth/portfolio`、`GrowthView` 作品集 Tab、入口强化 |
| **P0.3** | 近端愿望 | 已落地 | `wish_items.is_near_term`、`nextWish` 优先、商店分区、近端定价模板 |

### 执行顺序

1. 锁定本文档  
2. P0.1 → P0.2 → P0.3（逐项勾选）  
3. api/web `test:unit` + web build；更新验收清单  

### 非目标（P0 不做）

- 独立 Theme / Quest / Badge 表与排行榜  
- 强制改积分公式或静默改 `rewardMode`  
- 作品集导出/分享到社交平台  
- 主题周自动绑任务 ID（家长手动布置即可）  

---

## P0.1 — 主题周

### 为何

对抗「日复一日打勾」：每周一个可说清的主题（章节感），周末小会可收尾。

### 数据

迁移 `1740000000031-ThemeWeekNearWish.ts`（与 P0.3 同迁）：

| 列 | 表 | 说明 |
|----|-----|------|
| `theme_preset` varchar(32) default `''` | `student_weekly_goals` | 预设码；空=未选主题 |
| `theme_title` varchar(40) default `''` | 同上 | 展示标题（自定义或预设文案） |

保留原 `text`：本周小目标补充句（可空）。

### 预设（前后端常量对齐）

| code | 标题 | 一句话 |
|------|------|--------|
| `on_time` | 准时开始 | 这周练习「说到做到点」 |
| `gratitude` | 感恩三连 | 每天发现一件值得谢谢的事 |
| `tidy` | 小整理 | 动完就归位，房间轻一点 |
| `kindness` | 温柔待人 | 多一句关心、少一句顶撞 |
| `focus` | 专心一小段 | 先完成最重要的一件 |
| `custom` | 自己定 | 用 theme_title + text |

### API

- 扩展现有 `GET/PUT /my/weekly-goal`；家长只读 `GET /students/:id/weekly-goal`  
- 响应增加：`themePreset`、`themeTitle`、`weekKey`、`text`。  
- PUT body 可写上述字段；`themePreset` 非 custom 时服务端可填默认 `themeTitle`。

### UI

| 端 | 行为 |
|----|------|
| 学生今日 | 有主题时卡片：「本周主题 · {title}」+ text；链到设定抽屉 |
| 学生设定 | 预设 chips + 自定义标题 + 原小目标输入 |
| 家长 | P0：学生端可自设；周末小会页只读展示本周主题 |
| 周末小会 | 顶部展示本周主题（只读），收尾时可见 |

### 验收

- [x] 学生可选预设主题，今日可见横幅  
- [x] 换周后 `weekKey` 自然隔离（沿用 iso 周）  
- [x] 无主题时不占版面（或极轻空态 CTA「定一个本周主题」）  

---

## P0.2 — 成长作品集

### 为何

把打卡从「换分」变成「留下我做过的证据」（ClassDojo Portfolio 思路）。

### 数据

**不新建表。** 聚合：

- `growth_milestones`  
- 相册打卡（已有 `growth/album`：有图 + 已确认）  
- 近 14 天带 `reflectionText` 或 `moodTag` 的打卡（作品集「想法」）  

### API

`GET /growth/portfolio?studentId=`（家长必传/校验绑定；学生用自己）

```ts
{
  weekTheme?: { themeTitle, themePreset, text, weekKey } | null,
  milestones: [...],      // 近 30 条
  photos: [...],          // 近 30 张展平（或按月）
  reflections: [...],     // { id, title, text, moodTag, at }
  stats: { photoCount, milestoneCount, reflectionCount }
}
```

复用 `GrowthService` 查询，禁止 N+1。

### UI

| 端 | 行为 |
|----|------|
| `GrowthView` | 第三 Tab「作品集」：本周主题条 + 统计 + 照片墙 + 里程碑摘要 + 反思摘录 |
| 学生 Me / 更多 | 「我的成长」文案改为偏作品集；可深链 `?tab=portfolio` |
| 家长 | 同页可切换孩子 |

### 验收

- [x] 有照片或里程碑时作品集非空  
- [x] 无数据空态引导「打卡带一张照片」  
- [x] 不复制第二套成长页  

---

## P0.3 — 近端愿望

### 为何

远程大奖导致积分像空气；近端可兑（体验/陪伴/小特权）维持自主与即时反馈。

### 数据

同迁移 `0031`：

| 列 | 表 | 说明 |
|----|-----|------|
| `is_near_term` tinyint/bool default 0 | `wish_items` | 近端愿望标记 |

约束（服务层）：同一学生 `active && !proposed && isNearTerm` **最多 3 条**（避免钉满）；`nextWish` **优先**近端中 `costPoints` 最低且未达则可指向「还差多少」的那条，若已全部可兑则取最近端可兑。

### API / 逻辑

- 创建/更新 wish DTO 增加 `isNearTerm?: boolean`  
- `ProgressExtrasService.nextWish`：先筛近端，再回落原逻辑  
- list wishes 返回字段带上 `isNearTerm`  

### UI

| 端 | 行为 |
|----|------|
| 家长 `WishesView` | 开关「近端可兑」；近端定价 chips（如 5/10/15/20）；列表角标 |
| 学生 `RewardsView` | 分区「先兑这些」置顶近端；其余「慢慢攒」 |
| 学生今日 / 庆祝 | `nextWish` 若来自近端，文案「快到手的小愿望」 |

### 验收

- [x] 钉近端后今日/庆祝进度指向近端  
- [x] 超过 3 条近端时友好报错  
- [x] 金手指也可标近端（可选，默认允许）  

---

## 迁移与部署

| 迁移 | 内容 |
|------|------|
| `1740000000031-ThemeWeekNearWish.ts` | `student_weekly_goals.theme_*`；`wish_items.is_near_term` |

生产需跑迁移后再发版。  
本地 SQLite 若历史迁移与 sync 漂移，可直接对两表补列（见迁移 SQL），或依赖 `DB_SYNCHRONIZE=true` 后重启 API。

---

## 总验收清单

- [x] P0.1 主题周  
- [x] P0.2 成长作品集  
- [x] P0.3 近端愿望  
- [x] api `test:unit` 通过  
- [x] web `test:unit` + `build` 通过  
- [x] 本文档状态改为 **已落地**  

---

## 参考

- 动机衰减分析（对话）：外在激励衰减 → 章节 / 过程可见 / 近端奖  
- 已有：[`EDU_INTRINSIC_P2_PLAN.md`](./EDU_INTRINSIC_P2_PLAN.md)、Growth、Wishes、周目标  
