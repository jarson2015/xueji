# 学迹 · 飞牛 + 1Panel 部署（Docker，外部 MySQL）

适用：飞牛已装 **1Panel**，MySQL 已在 1Panel/Docker 中运行，且已用 `schema-blank.sql`（或迁移）导入空白库。

本方案只部署 **api + web** 两个容器，**不再新建 MySQL**。

---

## 0. 架构

```
浏览器
  ├─ 局域网 http://192.168.10.250:8080
  └─ 外网   https://fnos.net/...（经 1Panel 网站/反代 或 FN Connect）
        │
        ▼
  study-web 容器 :80（映射宿主机 8080）
        ├─ /           前端静态
        ├─ /api/       → study-api:3000
        ├─ /uploads/   → study-api
        └─ /socket.io/ → study-api（WebSocket）
                │
                ▼
          study-api 容器
                │
                ▼
     1Panel 已有的 MySQL 容器（同 Docker 网络或经网关访问）
```

你的环境参考：

| 项 | 值 |
|----|-----|
| 内网 IP | `192.168.10.250` |
| 外网入口 | `https://fnos.net/jarson2015` |
| 建议代码目录 | `/opt/1panel/apps/xueji` 或 `/vol1/1000/docker/xueji` |
| Web 端口 | `8080`（可改） |

---

## 1. 前置确认（MySQL）

在 1Panel → **数据库 / 容器** 中确认：

1. MySQL 容器在运行。  
2. 库 `study_checkin` 已存在，表已导入（约 19 张，含 `migrations`）。  
3. 记下：

| 项 | 示例（按你实际改） |
|----|-------------------|
| 容器名 | 如 `1Panel-mysql-xxxx` 或 `mysql` |
| 端口 | `3306`（容器内；若映射到宿主机也可能是 `3306`） |
| 用户 / 密码 / 库名 | `study` / 你的密码 / `study_checkin` |
| 所在 Docker 网络 | 在容器详情 → 网络 里看，常见 `1panel-network` |

**重要：** 学迹 api 也在 Docker 里时，`DB_HOST` **不能**填 `127.0.0.1`（那是容器自己）。应填：

- **优先**：MySQL **容器名**（学迹与 MySQL 加入同一网络时）  
- 或：宿主机局域网 IP `192.168.10.250`  
- 或：桥接网关 `172.17.0.1`（部分环境可用）

---

## 2. 上传项目代码

需要**完整源码**（含 Dockerfile），不是之前的「无 Docker 安装包」。

1. 在 1Panel **文件** 或飞牛文件管理中建目录，例如：  
   `/vol1/1000/docker/xueji`
2. 把本仓库整份上传进去，至少包含：

```text
xueji/
  apps/api/          # 含 Dockerfile
  apps/web/          # 含 Dockerfile、nginx.conf
  docker-compose.fnos.yml
  .env.fnos.example
```

3. 在该目录复制环境文件：

```bash
cd /vol1/1000/docker/xueji
cp .env.fnos.example .env
```

也可用 1Panel「终端」执行上述命令。

---

## 3. 编辑 `.env`（按你的环境）

用 1Panel 文件编辑器打开 `.env`，参考：

```env
# —— 连 1Panel 里的 MySQL ——
# 若学迹与 MySQL 同一 Docker 网络：填 MySQL 容器名（推荐）
DB_HOST=1Panel-mysql-改成你的容器名
DB_PORT=3306
DB_USER=study
DB_PASSWORD=你的MySQL密码
DB_NAME=study_checkin

MYSQL_USER=study
MYSQL_PASSWORD=你的MySQL密码
MYSQL_DATABASE=study_checkin
MYSQL_ROOT_PASSWORD=unused

# —— 安全 ——
JWT_SECRET=请换成至少24位随机唯一字符串
JWT_EXPIRES_IN=7d

# —— 访问地址（Origin，不含路径）——
# 内网网站端口 8080 + 外网 FN Connect 的 Origin
CORS_ORIGIN=http://192.168.10.250:8080,http://192.168.10.250,https://fnos.net

WEB_PORT=8080

# 上传目录挂到 NAS（便于备份）
UPLOAD_HOST_PATH=/vol1/1000/docker/xueji/uploads

RUN_SEED_ON_START=false
ENABLE_DEMO_HINTS=false
```

说明：

- 已手动导入 `schema-blank.sql` 时，compose 里 `DB_MIGRATIONS_RUN=true` 只会显示无待执行迁移，**正常**。  
- `CORS_ORIGIN` 里外网写 `https://fnos.net`（`/jarson2015` 是路径，不算 Origin）。  
- 若 1Panel 网站用 443 且域名不同，把实际地址栏的 Origin 也加进去。

---

## 4. 让学迹容器能访问 MySQL 网络

### 方式 A（推荐）：Compose 加入 1Panel 网络

1. 在 1Panel → 容器 → 点开 MySQL → 看 **网络名称**（如 `1panel-network`）。  
2. 在项目目录新建 `docker-compose.1panel.yml`（覆盖网络）：

```yaml
# 与 docker-compose.fnos.yml 一起用
services:
  api:
    networks:
      - default
      - panel
  web:
    networks:
      - default
      - panel

networks:
  panel:
    external: true
    name: 1panel-network   # 改成你 MySQL 实际所在网络名
```

3. 此时 `.env` 的 `DB_HOST` 填 **MySQL 容器名**。

### 方式 B：不改网络

`DB_HOST=192.168.10.250`，且 MySQL 已把 `3306` 映射到宿主机，并允许该用户从 Docker 网段连接（用户主机为 `%`）。

---

## 5. 在 1Panel 启动编排

### 方法 1：1Panel「编排 / Compose」（图形）

1. 打开 1Panel → **容器** → **编排**（或「Compose」）。  
2. **创建编排** / 导入：  
   - 工作目录：`/vol1/1000/docker/xueji`  
   - Compose 文件：优先选 `docker-compose.fnos.yml`  
   - 若用了网络覆盖，在「额外 compose」或合并文件里带上 `docker-compose.1panel.yml`  
3. 环境变量：指定使用目录下的 `.env`。  
4. 点击 **构建并启动**（首次较慢，需拉镜像、编译前后端）。

若界面只支持一个 compose 文件，可在终端用方法 2。

### 方法 2：1Panel 终端 / SSH（最稳）

```bash
cd /vol1/1000/docker/xueji
mkdir -p uploads

# 仅 fnos compose
docker compose -f docker-compose.fnos.yml --env-file .env up -d --build

# 若加了 1Panel 网络覆盖：
# docker compose -f docker-compose.fnos.yml -f docker-compose.1panel.yml --env-file .env up -d --build
```

查看状态：

```bash
docker compose -f docker-compose.fnos.yml ps
docker logs study-api --tail 100
docker logs study-web --tail 40
```

成功标志：

- 容器 `study-api`、`study-web` 为 running / healthy  
- api 日志有监听 / 迁移无报错  
- 浏览器打开：`http://192.168.10.250:8080` 出现登录页  
- `http://192.168.10.250:8080/api/health` 含 `"db":"up"`

---

## 6. 1Panel 网站 / 反向代理（可选但推荐）

若希望用 80/443 或统一域名访问，而不是直接 `:8080`：

### 6.1 反代到学迹 Web 容器

1. 1Panel → **网站** → **创建网站**（反向代理）。  
2. 主域名：按你需要填（内网可用 IP，或配合 FN Connect）。  
3. 代理地址：`http://127.0.0.1:8080`（宿主机已映射的 `WEB_PORT`）。  
4. 开启 **WebSocket**（若有开关，必须开，否则实时推送异常）。  
5. 如需 HTTPS：在网站里申请/上传证书。

### 6.2 改 CORS

若最终用 `https://你的域名` 打开，把该 Origin 写入 `.env` 的 `CORS_ORIGIN`，然后：

```bash
cd /vol1/1000/docker/xueji
docker compose -f docker-compose.fnos.yml --env-file .env up -d
# 或在 1Panel 编排里「重建 / 重启」api
```

仅重启 `study-api` 即可让 CORS 生效。

### 6.3 与 FN Connect

[FN Connect](https://fnos.net/jarson2015) 侧映射 **8080**（或你网站的 443）。  
`.env` 中保留 `https://fnos.net`。

---

## 7. 首次使用

空白库无演示账号：打开网站 → **注册家长** → 按引导添加孩子与任务。

---

## 8. 日常运维

| 操作 | 命令或位置 |
|------|------------|
| 看日志 | 1Panel 容器日志，或 `docker logs study-api -f` |
| 重启 | 编排里重启，或 `docker compose ... restart` |
| 更新代码 | 覆盖源码后 `up -d --build` |
| 备份 | MySQL 用 1Panel 备份；上传文件备份 `UPLOAD_HOST_PATH` 目录 |
| 停用 | `docker compose -f docker-compose.fnos.yml down`（加 `-v` 会删匿名卷，慎用） |

---

## 9. 常见问题

| 现象 | 处理 |
|------|------|
| api 起不来 / DB 连不上 | 检查 `DB_HOST`、网络是否与 MySQL 同一网、密码、用户是否允许 `%` |
| 页面开得开，接口 CORS 报错 | `CORS_ORIGIN` 与地址栏 Origin 完全一致（含 https、端口） |
| health 里 db 不是 up | MySQL 未通或库名不对 |
| 构建失败 / 内存不足 | 在电脑上 build 推镜像，或加大 1Panel 构建资源；也可换原生 Node 方案见 `DEPLOY_FNOS_NATIVE.md` |
| 实时不更新 | 1Panel 反代未开 WebSocket；或未映射 `/socket.io`（直连 8080 时 web 容器内 Nginx 已处理） |
| 端口冲突 | 改 `.env` 的 `WEB_PORT`，并同步 CORS |

测 MySQL 连通（把容器名、密码换成你的）：

```bash
docker run --rm --network 1panel-network mysql:8.0 \
  mysqladmin ping -h 你的MySQL容器名 -P 3306 -u study -p你的密码
```

---

## 10. 和「无 Docker 安装包」怎么选

| | 1Panel Docker（本文） | 无 Docker 安装包 |
|--|----------------------|------------------|
| 需要 | 完整源码 + 构建 | `xueji-fnos-native-*.zip` |
| MySQL | 1Panel 容器 | 本机/容器均可，`127.0.0.1` 更简单 |
| 反代 | web 容器自带 Nginx；外层可用 1Panel 网站 | 自己配 Nginx/网站 |
| 适合 | 已用 1Panel 管容器 | 不想构建镜像 |

相关：通用飞牛 Docker 说明见 [`DEPLOY_FNOS.md`](./DEPLOY_FNOS.md)。
