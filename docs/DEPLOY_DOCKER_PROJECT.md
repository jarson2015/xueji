# 学迹 · Docker 项目管理部署（外部已有 MySQL）

> 适用：飞牛 / 1Panel / Portainer 等 **Docker 项目管理（Compose 编排）**。  
> MySQL **已单独用 Docker 部署**，且库表 **已导入成功**。本项目只启动 **api + web**，不再创建 MySQL。

相关文件：

| 文件 | 作用 |
|------|------|
| `docker-compose.fnos.yml` | 学迹编排（仅 api、web） |
| `docker-compose.1panel.yml` | 可选：把学迹加入 MySQL 所在 Docker 网络 |
| `.env.fnos.example` | 环境变量模板 → 复制为 `.env` |

---

## 一、部署架构（先看懂）

```
浏览器
  http://192.168.10.250:8080
  （外网再映射 8080，或经反向代理）
        │
        ▼
┌─────────────────────────────┐
│  Docker 项目「xueji」         │
│  study-web :80 ← 宿主机 8080 │
│    /api /uploads /socket.io   │
│         ↓                    │
│  study-api :3000（不对外）    │
└────────────┬────────────────┘
             │ DB_HOST
             ▼
┌─────────────────────────────┐
│  你已有的 MySQL 容器          │
│  库 study_checkin（已导入）   │
└─────────────────────────────┘
```

要点：

1. **只映射一个端口** `WEB_PORT`（默认 8080）到 `study-web`。  
2. `DB_HOST` **不能**填 `127.0.0.1`（在容器里那是容器自己）。  
3. 空白库无演示账号 → 打开网站后 **注册家长**。

---

## 二、准备清单

| 项 | 说明 |
|----|------|
| 完整源码 | 含 `apps/api`、`apps/web`、Dockerfile（**不是** `xueji-fnos-native-*.zip`） |
| MySQL 容器 | 运行中；库已导入 |
| 记下 MySQL | 容器名、网络名、端口、用户、密码、库名 |
| 磁盘 | 构建镜像建议 ≥2GB 空闲 |
| 本机访问 | 如 `192.168.10.250`；外网 `https://fnos.net/...` |

---

## 三、上传代码到 NAS

1. 建目录，例如：`/vol1/1000/docker/xueji`  
2. 把整个项目拷进去（可用飞牛文件共享 / 1Panel 文件）。  
3. 确认存在：

```text
/vol1/1000/docker/xueji/
  apps/api/Dockerfile
  apps/web/Dockerfile
  docker-compose.fnos.yml
  docker-compose.1panel.yml
  .env.fnos.example
```

4. 建上传目录（可选但推荐）：

```bash
mkdir -p /vol1/1000/docker/xueji/uploads
```

---

## 四、写 `.env`（必做）

在项目根目录：

```bash
cd /vol1/1000/docker/xueji
cp .env.fnos.example .env
```

用编辑器改 `.env`。下面按「MySQL 也是 Docker」给一份可直接改的范例：

```env
# ========== 数据库（已有 MySQL 容器）==========
# 推荐：学迹与 MySQL 同一 Docker 网络后，填 MySQL「容器名」
# 备选：填 NAS 局域网 IP（MySQL 3306 已映射到宿主机时）
DB_HOST=你的MySQL容器名
DB_PORT=3306
DB_USER=study
DB_PASSWORD=你的MySQL密码
DB_NAME=study_checkin

MYSQL_USER=study
MYSQL_PASSWORD=你的MySQL密码
MYSQL_DATABASE=study_checkin
MYSQL_ROOT_PASSWORD=unused

# ========== 安全 ==========
JWT_SECRET=请换成至少24位随机唯一字符串
JWT_EXPIRES_IN=7d

# ========== 访问 Origin（不含路径、无末尾 /）==========
# 内网 + FN Connect（https://fnos.net/jarson2015 → Origin 是 https://fnos.net）
CORS_ORIGIN=http://192.168.10.250:8080,http://192.168.10.250,https://fnos.net

WEB_PORT=8080
UPLOAD_HOST_PATH=/vol1/1000/docker/xueji/uploads

RUN_SEED_ON_START=false
ENABLE_DEMO_HINTS=false
```

### 如何选 `DB_HOST`

| 情况 | `DB_HOST` 填什么 |
|------|------------------|
| 学迹加入了 MySQL 同一网络（推荐） | MySQL **容器名**（Docker 里看到的名字） |
| MySQL 已把 3306 映射到 NAS | `192.168.10.250`（你的 NAS IP） |
| 仅 bridge、访问宿主机 | 试 `172.17.0.1` |

在 Docker 管理界面打开 MySQL 容器 → **详情**，抄下「容器名」「网络」。

---

## 五、（推荐）让学迹连上 MySQL 网络

编辑 `docker-compose.1panel.yml`，把网络名改成 MySQL 实际网络：

```yaml
networks:
  panel:
    external: true
    name: 1panel-network   # ← 改成你的，如 bridge / 自定义网名
```

后面启动时用 **两个** compose 文件（见第六节）。  
若你暂时只用 `DB_HOST=192.168.10.250`，可跳过本文件。

---

## 六、用「Docker 项目管理」创建并启动

不同面板名称略有差异（飞牛 Docker / 1Panel 编排 / Portainer Stacks），逻辑相同：

### 6.1 新建项目

1. 打开 **Docker → 项目管理 / 编排 / Compose**。  
2. **创建项目**（或「新建编排」）。  
3. 填写：

| 项 | 建议值 |
|----|--------|
| 项目名称 | `xueji` |
| 路径 / 工作目录 | `/vol1/1000/docker/xueji` |
| Compose 文件 | `docker-compose.fnos.yml` |
| 环境变量文件 | `.env`（同目录） |

若界面 **只能认** `docker-compose.yml`：

```bash
cd /vol1/1000/docker/xueji
cp docker-compose.fnos.yml docker-compose.yml
```

注意：不要用仓库里带 MySQL 的那份全量 `docker-compose.yml` 覆盖错了；飞牛部署应使用 **fnos 这份**（无 mysql 服务）。复制后以 fnos 内容为准。

### 6.2 若要用网络覆盖文件

界面若支持「多个 compose」：再勾选 `docker-compose.1panel.yml`。  

不支持则用终端（见 6.4）。

### 6.3 构建并启动

点击 **构建 / 启动 / Deploy**。  
首次会拉镜像、编译前后端，可能 **5～15 分钟**，请耐心等待。

### 6.4 终端等价命令（图形失败时用）

```bash
cd /vol1/1000/docker/xueji

# 仅学迹（DB_HOST 用局域网 IP 时）
docker compose -f docker-compose.fnos.yml --env-file .env up -d --build

# 学迹 + 加入 MySQL 网络（DB_HOST 用容器名时）
docker compose -f docker-compose.fnos.yml -f docker-compose.1panel.yml --env-file .env up -d --build
```

---

## 七、验证是否成功

```bash
docker ps | grep study
docker logs study-api --tail 80
docker logs study-web --tail 40
```

浏览器检查：

| 地址 | 期望 |
|------|------|
| `http://192.168.10.250:8080` | 出现登录/注册页 |
| `http://192.168.10.250:8080/api/health` | JSON 里 `"db":"up"` |

容器状态：`study-api`、`study-web` 为 running（最好 healthy）。

已导入空白库 → 页面上 **注册家长账号** 开始用。

---

## 八、外网访问

1. 飞牛远程 / 路由器：映射 **8080**（或你在 `.env` 改的 `WEB_PORT`）。  
2. 不要映射 MySQL 3306 到公网。  
3. 若用反向代理到 `http://127.0.0.1:8080`，请开启 **WebSocket**。  
4. 外网 Origin 已写入 `CORS_ORIGIN` 后，改 `.env` 需 **重启 api**：

```bash
docker restart study-api
# 或在项目管理里重启项目
```

---

## 九、日常操作

| 操作 | 做法 |
|------|------|
| 看日志 | 项目管理 → 容器日志，或 `docker logs study-api -f` |
| 改 `.env` 后 | 项目管理「重新部署」，或 `docker compose ... up -d` |
| 更新代码 | 覆盖源码 → 再 **构建并启动**（`--build`） |
| 停止 | 项目管理停止，或 `docker compose -f docker-compose.fnos.yml down` |
| 备份 | 备份 MySQL（1Panel/mysqldump）+ `uploads` 目录 |

---

## 十、常见问题

| 现象 | 处理 |
|------|------|
| api 反复重启 / 连不上库 | 检查 `DB_HOST`、密码；是否与 MySQL 同一网络；用户是否允许 `%` |
| 页面有、接口 CORS 报错 | `CORS_ORIGIN` 必须与地址栏 Origin 完全一致 |
| health 里 db 不是 up | 库名/账号错，或网络不通 |
| 构建失败、内存不够 | 关闭其它容器再构建；或换机器 build 后导入镜像 |
| 项目管理找不到 compose | 确认工作目录正确；或复制为 `docker-compose.yml` |
| 实时不刷新 | 反代未开 WebSocket；直连 `:8080` 一般正常 |

测连通（网络名、容器名、密码换成你的）：

```bash
docker run --rm --network 你的MySQL网络名 mysql:8.0 \
  mysqladmin ping -h 你的MySQL容器名 -P 3306 -u study -p你的密码
```

---

## 十一、不要做的事

- 不要用「无 Docker 安装包 zip」当本方案源码。  
- 不要再启动一份会新建 MySQL 的全量 `docker-compose.yml`（除非你故意要第二套库）。  
- 不要把 `DB_HOST=127.0.0.1` 用在 api 容器里连宿主机/旁路 MySQL（除非用 host 网络模式，本方案不推荐）。

更细的飞牛说明还可参考 [`DEPLOY_FNOS.md`](./DEPLOY_FNOS.md)。
