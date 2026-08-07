# 学迹 · 飞牛 NAS（fnOS）Docker 部署指南

> **不想用 Docker？** 见 [`DEPLOY_FNOS_NATIVE.md`](./DEPLOY_FNOS_NATIVE.md)（Node + Nginx + pm2，直接连本机 MySQL）。

面向：已在飞牛上装好 **MySQL**，希望用 Docker 跑学迹（api + web），并通过 **飞牛账户 + 端口** 外网访问。

---

## 0. 架构说明（先看懂再动手）

```
手机/电脑浏览器
    │  飞牛远程 / 局域网
    ▼
[飞牛端口映射] ──► web 容器 :8080（Nginx）
                      ├─ /          → 前端静态页
                      ├─ /api/      → api:3000
                      ├─ /uploads/  → api 上传文件
                      └─ /socket.io/→ api 实时推送
                           │
                           ▼
                      api 容器（不对外暴露端口也可）
                           │
                           ▼
                   飞牛上已有的 MySQL
```

要点：

- **只映射一个 Web 端口**（默认 `8080`）即可，不必把 API `3000` 暴露到公网。
- `CORS_ORIGIN` 必须等于你浏览器地址栏里的「协议 + 主机 + 端口」（无路径、无末尾 `/`）。
- 生产默认 **不自动 seed**、**不显示演示账号**；首次用家长「注册」创建家庭。

仓库已提供：

| 文件 | 用途 |
|------|------|
| `docker-compose.fnos.yml` | **飞牛专用**：只跑 api + web，连外部 MySQL |
| `.env.fnos.example` | 飞牛环境变量模板 |
| `docker-compose.yml` | 本机全套（含自带 mysql），飞牛一般不用 |

---

## 1. 准备清单

| 项 | 要求 |
|----|------|
| 飞牛系统 | 已启用 **Docker**（容器） |
| MySQL | 已运行，能建库/建用户（飞牛「应用」或自建容器均可） |
| 磁盘 | 建议预留 ≥2GB（镜像构建）；上传图另占空间 |
| 代码 | 本仓库完整拷到 NAS（含 `apps/api`、`apps/web`） |
| 访问方式 | 局域网 IP，或飞牛远程访问已开通 |

可选：SSH 终端（飞牛「终端」或开启 SSH），比纯图形界面更好排错。

---

## 2. 在已有 MySQL 里建库与用户

用飞牛 MySQL 管理界面、phpMyAdmin、或命令行执行（密码请自改）：

```sql
CREATE DATABASE IF NOT EXISTS study_checkin
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'study'@'%' IDENTIFIED BY '你的强密码';
GRANT ALL PRIVILEGES ON study_checkin.* TO 'study'@'%';
FLUSH PRIVILEGES;
```

若 MySQL 只允许本机连接，需允许 Docker 网段访问（常见是允许 `%` 或 `172.%`）。

记下：

- 主机怎么从 **Docker 容器** 连到这台 MySQL（见下一节）
- 端口（一般 `3306`）
- 用户名 / 密码 / 库名

---

## 3. 确定 `DB_HOST`（最容易踩坑）

学迹 api 跑在 Docker 里，`localhost` **不是** NAS 宿主机，而是容器自己。

按你的 MySQL 部署方式选一种：

### A. MySQL 是飞牛「应用中心」装的（监听在 NAS 宿主机）

在 api 容器里访问宿主机，常见填法（**试通一个即可**）：

1. `172.17.0.1`（Docker 默认 bridge 网关，很多飞牛环境可用）
2. NAS 局域网 IP，如 `192.168.1.10`
3. `host.docker.internal`（若 Docker 已加 `extra_hosts` 支持）

**验证（SSH 进 NAS 后）：**

```bash
# 临时起一个容器测连通（把密码换成你的）
docker run --rm mysql:8.0 mysqladmin ping -h 172.17.0.1 -P 3306 -u study -p你的密码
```

`mysqld is alive` 即表示该 `DB_HOST` 可用。

### B. MySQL 也是 Docker 容器

1. 在飞牛 Docker 里看 MySQL 容器名 / 所在网络。
2. 把学迹 compose 接到**同一网络**，`DB_HOST` 填 MySQL **容器名**。  
   或在 `docker-compose.fnos.yml` 的 `api` 下增加：

```yaml
networks:
  - default
  - 你的mysql网络名
```

（具体网络名以飞牛 Docker 界面为准。）

---

## 4. 把代码放到飞牛

任选一种：

### 方式 1：共享文件夹 + 上传

1. 飞牛文件管理：建目录，例如 `/vol1/1000/docker/xueji`（路径以你盘符为准）。
2. 用电脑把整个 `P007` 项目拷进去（不要漏 `apps/`、`docker-compose*.yml`）。
3. 记下该路径，后面终端 `cd` 用。

### 方式 2：Git（若 NAS 已装 git）

```bash
cd /vol1/1000/docker   # 改成你的路径
git clone <你的仓库地址> xueji
cd xueji
```

---

## 5. 写 `.env`

在项目根目录：

```bash
cd /vol1/1000/docker/xueji
cp .env.fnos.example .env
# 用飞牛「文本编辑」或 nano/vim 改 .env
```

**必改项：**

```env
DB_HOST=172.17.0.1          # 按第 3 节测通的值
DB_PASSWORD=你的强密码
MYSQL_PASSWORD=你的强密码     # 与上保持一致
JWT_SECRET=一长串随机字符至少24位
CORS_ORIGIN=http://192.168.1.10:8080   # 先按局域网填，远程开通后再改
WEB_PORT=8080
RUN_SEED_ON_START=false
ENABLE_DEMO_HINTS=false
```

`CORS_ORIGIN` 规则：

- 局域网打开：`http://NAS的IP:8080`
- 飞牛远程用域名+端口：`http://你的远程域名:端口` 或 `https://...`
- 两种都要能开：用逗号拼在一起，例如  
  `http://192.168.1.10:8080,https://xxxx.fnos.net:12345`

改完 CORS 后需 **重启 api 容器** 才生效。

---

## 6. 在飞牛上启动容器

### 推荐：SSH / 终端执行 Compose

```bash
cd /vol1/1000/docker/xueji

docker compose -f docker-compose.fnos.yml --env-file .env up -d --build
```

首次构建可能要 5–15 分钟（拉 Node 镜像、编译前后端）。

查看状态：

```bash
docker compose -f docker-compose.fnos.yml ps
docker logs study-api --tail 80
docker logs study-web --tail 40
```

成功标志：

- `study-api`、`study-web` 为 running / healthy  
- api 日志有 `API listening` / 迁移完成  
- 浏览器打开 `http://NAS_IP:8080` 能出登录页  
- `http://NAS_IP:8080/api/health` 返回 `"db":"up"`

### 图形界面（Docker）

若飞牛提供「Compose 项目 / 堆栈」：

1. 新建项目，路径选到 `xueji` 目录。  
2. 指定 compose 文件为：`docker-compose.fnos.yml`。  
3. 环境变量文件选 `.env`。  
4. 构建并启动。  

若界面只支持单文件，选 `docker-compose.fnos.yml` 即可（更稳也可用 SSH 命令行）。

---

## 7. 飞牛「账户 + 端口」外网访问

不同飞牛版本菜单位置略有差异，一般流程：

1. 打开飞牛控制台 → **远程访问 / 飞牛账户 / 外网访问**（名称以你系统为准）。  
2. 登录飞牛账户，确保远程通道已开启。  
3. **端口转发 / 应用端口**：  
   - 内网主机：本机 NAS  
   - 内网端口：`8080`（或你在 `.env` 里设的 `WEB_PORT`）  
   - 外网端口：自定义一个，如 `18080`  
4. 记下远程访问地址，例如：  
   `http://xxxx.xxx:18080` 或飞牛提供的域名链接。  
5. 把该地址的 **Origin** 写进 `.env` 的 `CORS_ORIGIN`（可与局域网 Origin 并存）。  
6. 重启 api：

```bash
cd /vol1/1000/docker/xueji
docker compose -f docker-compose.fnos.yml --env-file .env up -d
# 或
docker restart study-api
```

7. 用手机流量（非家里 Wi‑Fi）打开远程地址，确认能登录、打卡。

**安全建议：**

- 不要映射 MySQL `3306` 到公网。  
- 不要映射 API `3000`（本 fnos 配置默认已不暴露）。  
- 仅映射 Web 端口；有条件时在飞牛或上级路由加 HTTPS。  
- `JWT_SECRET`、数据库密码用强随机值。

---

## 8. 首次使用（无演示账号）

1. 打开前端 → **注册** → 创建家长账号。  
2. 按引导：添加孩子 → 复制登录码 → 发布任务。  
3. 学生端用 6 位登录码进入。  

若你**明确只要演示数据**（仅内网调试）：

```env
RUN_SEED_ON_START=true
ENABLE_DEMO_HINTS=true
```

然后重建/重启 api，空库会写入演示家长/学生（公网环境不建议）。

---

## 9. 日常运维

### 更新代码

```bash
cd /vol1/1000/docker/xueji
# git pull 或重新上传文件
docker compose -f docker-compose.fnos.yml --env-file .env up -d --build
```

### 备份

| 内容 | 建议 |
|------|------|
| MySQL | 飞牛 MySQL 自带备份，或 `mysqldump study_checkin` |
| 上传图 | 若设置了 `UPLOAD_HOST_PATH`，备份该共享目录；否则备份 Docker volume `api_uploads` |

### 看日志

```bash
docker logs -f study-api
docker logs -f study-web
```

### 健康检查

浏览器或 curl：

```text
http://NAS_IP:8080/api/health
```

期望：`ok: true`，`db: "up"`。

---

## 10. 常见问题

| 现象 | 处理 |
|------|------|
| api 起不来，日志报 CORS_ORIGIN | `.env` 未设或为空；生产必须设置 |
| api 报 JWT_SECRET weak | 密钥太短或仍是仓库演示串；换 ≥24 位随机串 |
| `db: down` / 连不上库 | 重测 `DB_HOST`；检查 MySQL 是否允许 Docker 网段；用户权限是否为 `'study'@'%'` |
| 页面能开但登录跨域失败 | `CORS_ORIGIN` 与地址栏不完全一致（多写了路径、http/https 或端口不对） |
| 远程能开页、接口 502 | web 起了但 api 挂了；看 `docker logs study-api` |
| Socket / 实时不更新 | 确认远程通道支持 WebSocket；只走 web 反代 `/socket.io/` |
| 构建失败、拉不动镜像 | NAS 配镜像加速；或本机 build 后 `docker save` 导入 |
| 飞牛内存不足 | 构建时临时加大内存；或在 PC 构建镜像再导入 NAS |

---

## 11. 推荐检查表（部署当天勾选）

- [ ] MySQL 已建库 `study_checkin` 与用户  
- [ ] `DB_HOST` 容器内 ping/mysqladmin 测通  
- [ ] `.env` 已设强 `JWT_SECRET`、正确 `CORS_ORIGIN`  
- [ ] `docker-compose.fnos.yml` 启动成功，health `db: up`  
- [ ] 局域网能打开登录页并注册  
- [ ] 飞牛端口映射只开 Web 端口  
- [ ] 外网 Origin 已写入 `CORS_ORIGIN` 并重启 api  
- [ ] 手机流量下完成：注册/登录码/打卡  
- [ ] MySQL 与 uploads 备份策略已定  

---

## 12. 一条命令备忘

```bash
cd /你的路径/xueji
cp .env.fnos.example .env   # 首次
# 编辑 .env 后：
docker compose -f docker-compose.fnos.yml --env-file .env up -d --build
```

按本文做到第 8 节，即可在飞牛上稳定自用；外网仅依赖飞牛账户端口映射 + 正确的 `CORS_ORIGIN`。
