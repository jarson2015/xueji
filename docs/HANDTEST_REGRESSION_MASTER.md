# 学迹 · 总手测回归清单

Demo：`parent@demo.com` / `demo1234`；登录码 `10293847`（小明）、`20384756`（小红）。  
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
- [x] 部署样例：`TRUST_PROXY` + Nginx `limit_req` + 生产不映射 API/DB 端口（`deploy-guard` unit；见 `SEC_DEPLOY_PR1_PLAN` / `SECURITY_SECRETS_CHECKLIST`）；生产密钥/`TRUST_PROXY=1` 实装仍人手
- [ ] SEC PR2：刷登录码 / 改学生密码后旧 JWT（码/密码/代登）失效；迁移 0043 清空明文 `login_code`
- [ ] SEC PR3：代登可打卡；不可提任务/推迟今日/写周主题与周末小会（403）
- [ ] SEC PR4：图片 URL 含 `uid=`；去 uid / 改 uid → 401；裸路径 401
- [ ] SEC P2：计划项不可挂未指派 taskId；提议/兑换 WS 提示仍正常
- [ ] SEC P2b：响应头含 CSP/nosniff；字体与登录正常；周报可开

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

## 家庭说说 BBS（UJ）— 见 UI_UX_U1U4_PLAN

- [x] 列表内嵌楼层 + 一层跟帖；帖底行内接话；抽屉为「专注回应」（工程）
- [ ] 真机：展开全部 / 收起；接话对象提示；删除 SoftPrompt

## 学生今日 UX（U2）— 见 UI_UX_U1U4_PLAN

- [x] Hero 预算 / 打卡最短路径 / 庆祝分龄 / 我的·更多降噪（工程）
- [ ] 真机：手机吸底完成；young/teen 打卡与庆祝观感

## 家长主路径 UX（U3）— 见 UI_UX_U1U4_PLAN

- [x] Monitor 关系优先 + SoftPrompt 可选说明 + More/Tasks/FamilyEdu 降噪（工程）
- [ ] 真机：多孩筛选下待办/通过；教育设置深链小贴士

## 登录与 TV UX（U4）— 见 UI_UX_U1U4_PLAN

- [x] 登录品牌 / 仪式屏 / 抽屉安全区 / 客厅导航状态（工程）
- [ ] 真机：手机登录键盘折叠；客厅导航开/关与仪式屏闸门

## 视觉地基（U1）— 见 UI_UX_U1U4_PLAN

- [x] token / SoftPrompt 层级 / 空·失败态 / 克制动效（工程）
- [ ] 真机：断网今日/看板失败态；系统「减少动态效果」

## 教育打磨（P-Edu-A）— 见 EDU_PEDU_A_PLAN

- [x] 家长说说情绪教练回应芯片（unit + e2e）；学生仍为原芯片
- [x] 周末小会分步计时 + 本周模式一句（unit + e2e；真机计时人手）
- [x] 淡出未采纳 ≥7 天二次软提醒（unit + e2e；不写库改 mode）
- [ ] 真机：周末小会计时观感
- [ ] 真机：二次淡出提醒观感

## 分龄情绪路线图 E1–E5 — 见 EDU_AGE_EMOTION_ROADMAP

（E1–E5 工程已完成；真机项仍待勾选。下一教育轨 E6 见下方。）

### E1 — 关系优先与防工具化

- [x] E1.1 Monitor 默认关系摘要；完成率/未完成折叠；无多孩完成率首屏对比
- [x] E1.2 淡出家庭共见契约；学生可见「少靠积分」一句；GET 不写库
- [x] E1.3 本周模式/词云「不是评分」声明；不进 Monitor 待办
- [x] E1.4 兴趣任务勾选预填 0 分且可改
- [x] E1.5 过载/高压洞察含减负或求助 CTA（无诊断标签）
- [ ] 真机：看板首屏关系优先观感
- [ ] 真机：保存淡出后学生今日条；兴趣 0 分；过载求助 SoftPrompt

### E2 — 分龄内容包

- [x] E2.1 ageContentPack 三档差异 unit 通过；general 基线不破
- [x] E2.2 young 小会短步数/短时长文案；庆祝偏共同调节
- [x] E2.3 general 淡出引导 + 非买物愿望提示
- [x] E2.4 teen 提议/换序显眼；Rewards 弱余额；不改积分公式
- [ ] 真机：young 小会 2 步；teen 今日提议条与弱余额

### E3 — 情绪功能分类

- [x] E3.1 四类映射函数 unit；UI 无情绪分/排行
- [x] E3.2 家长芯片按类建议；仍无绩效夸
- [x] E3.3 考试周/周末弱策略条可 dismiss
- [ ] 真机：看板情绪旁注 + 周末/考试条观感

### E4 — Teen 自主与隐私

- [x] E4.1 teen 反思默认仅自己或周末聚合；家长即时可见需同意
- [x] E4.2 teen 弱分/weekly_digest 引导；保存才生效
- [x] E4.3 代登发说说强提示；私密引导；代登不可读写私密
- [x] E4.4 危机转介静态入口可达；无自动报警
- [ ] 真机：teen 打卡分享勾选；FamilyEdu 预选周结算；More 求助入口

### E5 — 家长微课与自检

- [x] E5.1 分龄场景微课 5–10 则 + 深链
- [x] E5.2 月度关系自检可跳过、不打分不上榜
- [x] E5.3 本分区与路线图 ID 对齐并在落地后更新状态
- [ ] 真机：FamilyEdu 展开一则微课并点深链；自检跳过/保存后刷新仍在

### E6 — 验收加固 — 见 EDU_E6_HARDENING_PLAN

- [ ] E6.0 E1–E5 真机闸门（上表真机项勾选或记缺陷）
- [x] E6.1 学生可回看本机私密反思
- [ ] E6.2（可选）反思 visibility 入库且家长路径尊重 — **暂缓**
- [x] E6.3 混龄切换孩子后 pack/微课正确
- [x] E6.4 情绪旁注可深链到对应微课
- [x] E6.5 e2e 抽样：看板折叠 / teen 反思偏好 / FamilyEdu 小贴士
- [x] E6.6 本分区与计划文档状态已更新

## V1.5 成就奖金 — 见 V1_5_ACHIEVEMENT_BONUS_PLAN

- [x] V15.0 开关默认关；young 慎用提示
- [x] V15.1–2 创建并入账仅 allowance `bonus`；points 不变
- [x] V15.3 家长 SoftPrompt 登记；学生不可自助发放
- [x] V15.4 学生流水可见「成就奖金」标题
- [ ] V15.5 跑迁移后 smoke / 真机勾选

## PERF 响应速度 — 见 PERF_P0…P5_PLAN

- [ ] 学生打开带步骤任务 → 抽屉出现步骤（惰性 `GET /my/assigns/:id/steps`）
- [ ] Monitor 切后台再回 → 默认 lite 刷新（非全量）
- [ ] 多孩批量确认积分正确（组间并行）
- [ ] 家长任务编辑 → `GET /tasks/:id` 带出步骤
- [ ] Today soft 不扇出 order/goal/proposals
- [ ] 愿望/兑换列表有上限仍可用
- [ ] 周报纯读；仪式屏 lite
- [ ] PERF P6：看板首屏进度先出、洞察稍后补；学生计划列表可用
- [ ] 迁移 0039–0042 或 `apply-perf-indexes.ts`

- [x] 迁移 0039 checkins/assigns 索引（脏 sqlite 可用 `apply-perf-indexes.ts`）
- [x] Monitor lite/full/etag304 不劣于基线（`bench-monitor.ts`）
- [ ] 真机：批量确认 10+ 条；打开今日无意外积分入账；说说列表；教育页 keep-alive 软刷新

下一轨索引：[`NEXT_TRACK_INDEX.md`](./NEXT_TRACK_INDEX.md)

---

## 仍不做

主题自动绑任务、Quest/Badge、改积分公式、登录码 8 位无迁移、静默全站 SoftPrompt、第四 age_band、说说计分/Monitor 待办化、AI 情绪诊断排行。
