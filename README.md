# 学迹 — 家庭学习打卡 Web 应用

前后端分离的 K12 家庭学习任务协作与打卡系统：家长发布任务、查看实时进度；学生制定计划、打卡更新进度；支持积分愿望、凭证确认与任务拆解。

## 技术栈

- 前端：Vue 3 + Vite + Pinia + Vue Router + Element Plus + Socket.IO Client
- 后端：NestJS + TypeORM + JWT + Socket.IO
- 数据库：MySQL 8
- 交付：Docker Compose（api / web / mysql）

## 快速启动（Docker）

1. 复制环境变量模板并填入**强密钥**（生产必做）：

```bash
cp .env.compose.example .env
# 编辑 .env：MYSQL_*、JWT_SECRET、CORS_ORIGIN
```

2. 启动：

```bash
docker compose up -d --build
# 前端 http://localhost:8080  API http://localhost:3000/api/health
```

默认 **不会** 自动 seed 演示账号（`RUN_SEED_ON_START=false`），且 **关闭** 登录页演示提示（`ENABLE_DEMO_HINTS=false`）。

仅本地想要演示数据时：

```bash
docker compose -f docker-compose.yml -f docker-compose.demo.yml --env-file .env up -d --build
# 或在 .env 中设 RUN_SEED_ON_START=true 与 ENABLE_DEMO_HINTS=true
```

生产请在反代层终止 **HTTPS**；Compose 内 web 仅暴露 HTTP 80。

**飞牛 NAS（已有 MySQL，用 Docker 部署学迹）**：

- **Docker 项目管理（推荐）**：[`docs/DEPLOY_DOCKER_PROJECT.md`](./docs/DEPLOY_DOCKER_PROJECT.md) — 编排 `docker-compose.fnos.yml`，只跑 api+web，连已有 MySQL  
- 补充：[`docs/DEPLOY_FNOS.md`](./docs/DEPLOY_FNOS.md)、[`docs/DEPLOY_FNOS_1PANEL.md`](./docs/DEPLOY_FNOS_1PANEL.md)  
- **无 Docker**：[`docs/DEPLOY_FNOS_NATIVE.md`](./docs/DEPLOY_FNOS_NATIVE.md) / `scripts/pack-fnos-native.ps1` 安装包

## 本地开发（无 Docker 时可用 SQLite）

本机未安装 Docker 时，后端默认 `DB_TYPE=sqlite`，数据文件在 `apps/api/data/study.sqlite`。

```bash
cd apps/api
cp .env.example .env   # 已含 DB_TYPE=sqlite
npm install --registry=https://registry.npmmirror.com
npm run seed
npm run start:dev
```

```bash
cd apps/web
npm install --registry=https://registry.npmmirror.com
npm run dev
```

有 Docker 时将 `.env` 中 `DB_TYPE=mysql`，并 `docker compose up -d mysql`，或直接 `docker compose up -d --build`。

冒烟脚本（API 已启动）：

```bash
cd apps/api
npm run smoke
# 领域不变量单测
npm run test:unit
```

## 生产上线门禁（投入使用前）

### P0（未完成则不要公网暴露）

1. **密钥**：`.env` 中强 `JWT_SECRET`（≥24 字符，且非仓库演示串）；轮换 VAPID（`npx web-push generate-vapid-keys`）。
2. **数据**：`DB_SYNCHRONIZE=false` + `DB_MIGRATIONS_RUN=true`；**关闭** `RUN_SEED_ON_START`；配置 MySQL 备份；勿保留演示账号于生产库。
3. **演示面**：生产默认 `ENABLE_DEMO_HINTS=false`（`/api/auth/demo-hints` 不返回密码/登录码；登录页无演示区）。
4. **CORS**：必须设置 `CORS_ORIGIN` 为正式前端域名（生产未设置会拒绝启动）。
5. **网络**：HTTPS 终止（反代 / LB）；Web Push 依赖 HTTPS。
6. **验证**：`npm run test:unit` + `npm run smoke`；手测：登录码 → 打卡 → 确认 → 兑换 → 补上进度。
7. **首次体验**：新家庭走完家长 **4 步** / 学生 **2 步**引导；先只开「任务+打卡+愿望」，进阶能力在「家庭」里。

详见仓库根目录 `DEVELOPMENT_PLAN.md`。
## 演示账号

| 角色 | 账号 / 登录码 | 密码 |
|------|----------------|------|
| 家长 | parent@demo.com | demo1234 |
| 学生小明 | 登录码 **102938**（或账号 student1） | demo1234 |
| 学生小红 | 登录码 **203847**（或账号 student2） | demo1234 |

登录页可切换「家长登录 / 学生进入」：学生用 6 位数字码即可进入今日页。  
**开发环境**可展开「演示账号」并从接口拉取当前有效登录码；**生产默认关闭**演示区与 `/api/auth/demo-hints` 敏感返回。
## 核心用户故事验收

1. 家长在「学生管理」看到登录码 → 孩子用码进入 → 今日只突出「下一件」→ 点「我做完了」看到庆祝与愿望缺口。
2. 家长看板「今日摘要」显示完成数与未完成项；待确认可一键通过/再改改。
3. 学生「奖励」页看到目标愿望进度条；兑换后家长在愿望页点「兑现」。
4. 演示种子为小明开启零花钱账本（余额 ¥50、目标「课外书」）；积分与零花钱互不兑换。
5. 原账号密码登录、周期任务、跨端布局仍可用。

## 主要 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 家长注册 |
| POST | /api/auth/login | 账号密码登录 |
| POST | /api/auth/login-code | 学生 6 位登录码 |
| GET | /api/auth/demo-hints | 演示账号当前登录码（登录页同步） |
| GET | /api/auth/me | 当前用户 |
| GET/POST | /api/students | 学生管理（家长） |
| POST | /api/students/:id/login-code | 刷新登录码 |
| CRUD | /api/tasks | 任务（家长） |
| POST | /api/tasks/:id/assign | 指派 |
| GET | /api/my/tasks | 我的任务（学生） |
| GET | /api/my/today | 今日待办（含 streak/nextWish） |
| POST | /api/checkins | 完成记录（返回积分庆祝字段） |
| POST | /api/checkins/:id/confirm | 确认（可带 note） |
| CRUD | /api/plans | 学习计划 |
| GET | /api/dashboard/progress | 家长进度详情 |
| GET | /api/dashboard/summary | 家长今日摘要 |
| GET/PUT | /api/family/settings | 家庭休息日 / 补上进度 / 积分策略 / 分龄 / 零花钱约定 |
| GET | /api/family/covenant | 家庭公约（家长可编辑来源；学生只读） |
| GET | /api/family/audit | 重要操作审计（家长） |
| GET | /api/family/co-parents | 共家长与待用邀请码 |
| POST | /api/family/invites | 生成共家长邀请码 |
| POST | /api/family/invites/accept | 接受邀请并共享孩子 |
| POST | /api/students/:id/nudge | 家长轻轻提醒（限频） |
| GET/POST | /api/wishes | 愿望 |
| POST | /api/wishes/:id/redeem | 学生兑换（提交即扣分） |
| GET | /api/redeems | 家长兑换列表（待兑现优先） |
| GET | /api/my/redeems | 学生我的兑换 |
| POST | /api/redeems/:id/review | 家长兑现/先缓缓 |
| GET | /api/points | 积分（含 rulesHint/nextWish） |
| GET | /api/allowance/me | 学生零花钱摘要（未开开关返回 enabled:false） |
| GET | /api/allowance/students/:id | 家长查看孩子零花钱 |
| POST | /api/allowance/entries | 记账（大额支出可 pending） |
| POST | /api/allowance/entries/:id/review | 家长确认大额 |
| GET/POST | /api/allowance/goals | 学生储蓄目标 |
| POST | /api/allowance/goals/:id/save | 存入目标 |
| GET | /api/reports/weekly | 周报（含日历/积分/高光/愿望） |
| GET | /api/students/:id/waivable-chores | 可免家务列表（兑现金手指时） |
| POST | /api/uploads | 上传凭证图 |
| GET | /api/push/vapid-public-key | Web Push 公钥（未配置则 disabled） |
| POST | /api/push/subscribe | 学生订阅推送 |
| DELETE | /api/push/subscribe | 取消订阅 |
| WS | /ws | 实时事件（JWT） |

Web Push 仅用于家长「轻轻提醒」（nudge）；需 HTTPS 或 localhost，iOS 限制较多。番茄钟为今日页纯前端计时，不写后端。家长发布/指派任务时学生端会收到站内「新任务」消息条：点击跳转关联任务；60 秒未点则软刷新一次列表（避免频繁全量拉取）。

## 目录结构

```
P007/
  apps/api/     NestJS 后端
  apps/web/     Vue 前端
  docker-compose.yml
  README.md
```

## 分阶段实现对照

- 阶段 0：脚手架、JWT、Docker、种子账号
- 阶段 1：学生管理、任务 CRUD/周期/指派
- 阶段 2：打卡、今日视图、看板、Socket.IO
- 阶段 3：学习计划、积分、愿望兑换
- 阶段 4：图片凭证、家长确认、任务步骤、周报
- 阶段 5：种子数据、响应式、文档

## V2 / 后续未做清单

微信系统通知、勋章、原生 App；Push 目前仅覆盖家长「轻轻提醒」。

本迭代已完成：家庭休息日、家长温和提醒（站内 + Web Push nudge）、去对抗文案与品牌跨端美化、双家长邀请码共享孩子、生产 MySQL 迁移开关、加厚周报、学生「下一件」番茄钟（纯前端）、打卡确认点赞短评、金手指愿望（积分兑换免一次家务）、任务时效/过期、补上进度（折扣积分）、每日未完成温和提示、**首次全流程引导**、**信息架构收敛**、**家庭公约**、**共家长重要操作通知**、**奖励褪除/分龄/反思题**、**情商与生活任务模板**、**领域单测与健康检查扩展**、**零花钱账本（与积分隔离，默认关；演示小明已开）**。

安全加固：防重复打卡刷积分、生产 JWT 强密钥校验、登录限流、上传图片白名单、`imageUrl` 仅允许本站 `/uploads/`。

## 许可证

家庭自用与学习演示均可；正式对外服务请自行完成合规与运维加固。
