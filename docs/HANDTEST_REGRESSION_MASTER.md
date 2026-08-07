# 学迹 · 总手测回归清单

Demo：`parent@demo.com` / `demo1234`；登录码 `102938`（小明）、`203847`（小红）。  
API 改过后需重启 `apps/api`（约 3000）。前端 `apps/web` 约 5173。

专题清单仍可单独用：[`EDU_THEME_PORTFOLIO_NEAR_REGRESSION.md`](./EDU_THEME_PORTFOLIO_NEAR_REGRESSION.md)。

---

## 自动化（先跑）

- [x] `apps/web`：`npm run test:unit` + `npm run build`
- [x] `apps/web`：`npm run test:e2e`（需本机 API `3000` + demo；见 `docs/EDU_E2E_SMOKE_P0_PLAN.md`）
- [x] `apps/api`：`npm run test:unit`（本轮安全 P0 已跑）；可选 `npm run smoke`（安全验收 P1 已扩）

---

## 安全冒烟（S0–S1）

- [x] 登录码：正确码可进（e2e）；错误多次后限流提示（人手；配额已收紧为 8/IP+失败桶）
- [x] 邀请码：接受接口 IP≤10 / 用户≤8 限流（unit）；错误多次后人手见「太频繁」；入口 e2e
- [x] 注册 / 建生密码 &lt; 6 被拒（前端 e2e；API smoke）
- [x] `/uploads/` 无签名或过期签名 → 打不开图（e2e + smoke 401）；带响应签名的图可看（人手抽查）
- [x] 上传非图片（改扩展名）→ 魔数校验拒绝（API smoke）
- [x] 零花 / 打卡配图外链 URL → API 拒；本机 `/uploads/...` 可（smoke + `requireSafeUploadPath`）
- [x] 部署样例：`TRUST_PROXY` + Nginx `limit_req`（`deploy-guard` unit；见 `SECURITY_SECRETS_CHECKLIST`）；生产密钥/`TRUST_PROXY=1` 实装仍人手

---

## SoftPrompt / 交互（U0–U2）

- [x] 家长退出：SoftPrompt，无原生弹框（e2e）
- [x] SoftPrompt：Esc 关（e2e）；焦点陷阱 / Tab 环不跳出（人手）
- [x] SoftStay 与 SoftPrompt Esc 归属（unit：有 `.sp-mask` 时 Stay 不抢）；同屏 Esc 人手
- [x] 看板批量通过 / SoftStay：确认文案可读（文案 unit + 窄屏 SoftPrompt e2e；真通过 Stay 人手）
- [x] 学生兑换 / 签收：SoftStay 或 SoftPrompt 可完成（文案 unit + e2e；真兑换/签收 Stay 人手）
- [x] 手机看板有待确认时，洞察默认收起（`defaultSenseOpen` unit + 窄屏 e2e；真待办人手）
- [x] 家长 More：无重复「日常」三入口（e2e）
- [x] 近端兑换按钮可点（`tap-btn`；e2e）
- [x] 手机抽屉高度统一为 `--drawer-phone`（扫描 unit + 窄屏 e2e；真机观感人手）
- [x] 代登退出：正常回家长；无备份或备份坏 → 登出回登录，不假进家长页（解析 unit + e2e；真代登操作人手）

---

## 入口文案减阻

- [x] 教育设置：首屏为「常用」（预设/加分/年龄/作息）；反思·缓做·自动确认·公约在「进阶」折叠；无「策略包 / API」等 jargon（结构 e2e）
- [x] 学生 More：未开零花且未开约定时，相关段隐藏（不进死路）（判定 unit + e2e）
- [x] 零花/约定关功能空态：CTA 不去公约死路（零花→愿望；约定→今日）（unit + e2e）
- [x] 家长 More：客厅模式用白话开关，无 `?tv=` 口吻（文案 unit + e2e）
- [x] 看板正常连接不刷「实时已连接」；断线可见「离线刷新中」（可见性 unit + e2e）

---

## 登录入口

- [x] 学生码：键盘数字 / Backspace / Enter；可粘贴 6 位；满码自动进入（键盘满码 e2e；粘贴/⌫ 人手抽查）
- [x] 码区与 ⌫/清空有可读名称（`numKeyLabel` unit + e2e）
- [x] SoftPrompt 有说明时读屏可读（aria-describedby；退出弹层 e2e）
- [x] 轻轻提醒成功最多一条 toast（有 parentHint 时用它）（文案 unit；真提醒人手）

---

## SoftPrompt 教育链（抽样）

- [x] 学生管理：刷新登录码 / 重置密码有确认（文案 unit + SoftPrompt e2e；真刷新/改密人手）
- [x] 约定借出 / 还回 / 心意；愿望兑换（约定文案 unit + SoftPrompt e2e；兑换见兑换轨；真操作人手）
- [x] 家长兑现愿望（互助卡家务芯片若开）（文案 unit + SoftPrompt e2e；真兑现人手）
- [x] 休息日「拿到今日」；单条删任务（文案 unit + SoftPrompt e2e；真拿到今日/真删除人手）
- [x] 看板「待处理」可见任务提议；同意可选分值；再商量可写说明（待处理区 e2e；同意/再商量人手）
- [x] 学生今日：非 TV 可见「我想加一件小事」；抽屉可提交；Me 仍可提（入口 e2e；提交人手）
- [x] 周五–日看板可见周末小会横幅（开小会 / 作品集）（判定 unit + 冻结日期 e2e；真跳转人手）

---

## 家长离屏推送

- [x] 家长 More「开启通知」或顶栏提示可订阅（入口 e2e；真允许权限人手）
- [x] 学生提交需确认打卡 → 深链 `/parent/monitor`（源码断言；真机点开人手）
- [x] 学生兑换愿望 → 深链 `/parent/wishes`（源码断言；真机点开人手）
- [x] 学生提议小事 → 深链 `/parent/monitor` 待处理（源码断言；真机点开人手；非任务清单页）

---

## 零花封面（本轨）

- [x] 学生零花 → 新目标：可不选封面创建（抽屉入口 e2e；未开账本见空态）
- [x] 可选「选照片」控件可见；预览/去掉（入口 e2e；真上传人手）
- [x] 封面外链拒收（API smoke）；签名缩略图加载（人手）
- [x] 家长零花 → 折叠「入账与目标」含「储蓄目标（只读）」（e2e；有封面缩略图人手）

---

## 离线打卡队列

- [x] 断网打卡后顶栏立即出现「N 条打卡待同步」（e2e 注入队列验顶栏；真断网人手抽查）
- [x] 恢复网络后可同步；多次失败丢弃时有提示（丢弃逻辑 unit；联网同步人手抽查）

---

## 主题周 / 作品集 / 近端（抽样）

详见专题回归文档；最少：

- [x] 学生可定本周主题；家长可改（入口 e2e；保存同步人手）
- [x] 愿望近端区可见（家长模板/学生商店入口 e2e；兑现里程碑人手）
- [x] 作品集按主题周过滤（unit + e2e；有史切换人手）

---

## 家庭手账（P0）

- [x] More：家长/学生可见「家庭手账」入口（e2e）
- [x] 发家庭帖 + 心情 + 一级评论（人手；入口 e2e）
- [x] 私密日记默认关；学生 SoftPrompt 自愿开启；代登/家长不可读（unit + UI）
- [x] 私密一键分享：二层 SoftPrompt 后直接发到家庭手账；原文仍私密（文案 unit；真分享人手）

## 家庭手账（P0.5）— 见 EDU_FAMILY_JOURNAL_IMPROVE_PLAN

- [x] 加载更多与可见性补足
- [x] 重复分享拦截 + force；分享可选仅家长
- [x] 删日记 SoftPrompt；评论自删；删帖 audit

## 家庭手账（P1）— J1.1～J1.6 + 分龄命名

- [x] 关闭私密 SoftPrompt；关后只读保留（e2e `journal-p1-regression` + 既有 Soft）
- [x] 发帖/回应话术芯片
- [x] 15 分钟内可编辑帖/日记（e2e：可编辑 vs 超时）
- [x] More 轻未读角标（activity-hint + mark-seen；e2e 角标）
- [x] 分龄命名：给家人看 / 家庭说说；悄悄话 / 私密日记
- [x] 家庭帖配图（最多 3 张）
- [x] 一级回应下可「接话」（一层）

## 家庭手账（P2）— 弱连接触达

- [x] 周末小会可引用家庭帖并保存 `journalPostId`（人手；UI e2e）
- [x] `?postId=` 深链打开帖详情（e2e）
- [x] 作品集「去家庭说说」弱链（e2e）
- [x] 今日/看板软发现提示（unit + e2e）
- [ ] 真机：有 Push 订阅时评论通知落到手账（人手；步骤见 EDU_FAMILY_JOURNAL_P3_PLAN）

## 家庭手账（P3）— 打磨

- [x] 新回应 Push 可关（notify-prefs；e2e + API）
- [x] 周末引用 `journal_post_summary`；删帖后摘要仍在（API + e2e）
- [x] 限流「太频繁」友好文案（unit）
- [ ] 真机：开关 Push 偏好后有/无通知（人手；步骤见 EDU_FAMILY_JOURNAL_P3_PLAN）

## 教育打磨（P-Edu-A）— 见 EDU_PEDU_A_PLAN

- [x] 家长说说情绪教练回应芯片（unit + e2e）；学生仍为原芯片
- [x] 周末小会分步计时 + 本周模式一句（unit + e2e；真机计时人手）
- [x] 淡出未采纳 ≥7 天二次软提醒（unit + e2e；不写库改 mode）
- [ ] 真机：周末小会计时观感
- [ ] 真机：二次淡出提醒观感

---

## 仍不做

主题自动绑任务、Quest/Badge、改积分公式、登录码 8 位无迁移、静默全站 SoftPrompt。
