# 学迹 · 飞牛 NAS 无 Docker 部署（原生 Node）

适用：飞牛上已有 **MySQL**，不想用 Docker，直接用 **Node.js + Nginx（或 Caddy）+ 进程守护** 跑学迹。

### 推荐：上传预构建安装包

在开发机打包（已含前后端 `dist`、安装脚本、Nginx 示例）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pack-fnos-native.ps1
```

产物：`release/xueji-fnos-native-*.zip`。上传飞牛解压后：

1. 编辑 `.env`（数据库 / JWT / CORS / 上传目录）  
2. `./install.sh`  
3. 按 `nginx.xueji.conf` 配反代，再 `./start.sh`  

包内 `README.txt` 有完整三步说明。以下章节为「从源码部署」细节，可作对照。

---

## 0. 架构

```
浏览器 ──► Nginx :8080（或 80）
              ├─ /           → 前端静态文件 apps/web/dist
              ├─ /api/       → 反代 127.0.0.1:3000
              ├─ /uploads/   → 反代或直接 alias 到上传目录
              └─ /socket.io/ → 反代 WebSocket → 3000
                    │
                    ▼
              Node API（pm2 / systemd）:3000
                    │
                    ▼
              飞牛已有 MySQL :3306
```

与 Docker 方案的区别：进程直接跑在 NAS 系统里，`DB_HOST` 一般填 `127.0.0.1`。

---

## 1. 飞牛上要准备什么

| 组件 | 说明 |
|------|------|
| **Node.js 20 LTS** | 飞牛「应用中心」若有 Node 可装；或用 [fnm](https://github.com/Schniz/fnm) / 官方二进制 / 包管理器 |
| **MySQL** | 你已部署 |
| **Nginx 或 Caddy** | 反代 + 静态站；飞牛若有「网站」/「反向代理」应用也可用 |
| **pm2（推荐）** | 保活 API：`npm i -g pm2` |
| **构建机（可选）** | 若 NAS 编译慢/内存小，可在 Windows/Mac 上 `npm run build` 后只上传产物 |

检查 Node：

```bash
node -v   # 建议 v20.x
npm -v
```

---

## 2. MySQL 建库（同 Docker 方案）

```sql
CREATE DATABASE IF NOT EXISTS study_checkin
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'study'@'localhost' IDENTIFIED BY '你的强密码';
-- 若 API 与 MySQL 同机，localhost 即可；否则再加 'study'@'%'
GRANT ALL PRIVILEGES ON study_checkin.* TO 'study'@'localhost';
FLUSH PRIVILEGES;
```

---

## 3. 放置代码

例如：

```text
/vol1/1000/apps/xueji/
  apps/api/
  apps/web/
  ...
```

用文件共享拷贝整个项目，或 `git clone`。

---

## 4. 配置并启动 API

```bash
cd /vol1/1000/apps/xueji/apps/api
cp .env.example .env
```

编辑 `apps/api/.env`（无 Docker 关键示例）：

```env
PORT=3000
NODE_ENV=production
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=study
DB_PASSWORD=你的强密码
DB_NAME=study_checkin
DB_SYNCHRONIZE=false
DB_MIGRATIONS_RUN=false
JWT_SECRET=请换成至少24位随机唯一字符串
JWT_EXPIRES_IN=7d
TZ=Asia/Shanghai
UPLOAD_DIR=/vol1/1000/apps/xueji/data/uploads
CORS_ORIGIN=http://192.168.1.10:8080
ENABLE_DEMO_HINTS=false
```

说明：

- `CORS_ORIGIN` = 浏览器打开前端的 Origin（含端口）；飞牛远程地址也要写上，逗号分隔。
- `UPLOAD_DIR` 建议放到数据盘固定目录，并 `mkdir -p`。
- 生产不要用仓库里的弱 JWT。

安装与构建：

```bash
cd /vol1/1000/apps/xueji/apps/api
mkdir -p /vol1/1000/apps/xueji/data/uploads
npm install --registry=https://registry.npmmirror.com
npm run build
npm run migration:run
```

用 pm2 常驻：

```bash
npm i -g pm2
cd /vol1/1000/apps/xueji/apps/api
pm2 start dist/main.js --name xueji-api
pm2 save
pm2 startup   # 按提示做开机自启
```

验证：

```bash
curl -s http://127.0.0.1:3000/api/health
# 期望 db: "up"
```

---

## 5. 构建前端

在 NAS 上：

```bash
cd /vol1/1000/apps/xueji/apps/web
npm install --registry=https://registry.npmmirror.com
npm run build
# 产物在 apps/web/dist/
```

若 NAS 内存不足，在电脑上构建后，把整个 `dist/` 上传到 NAS 同一路径即可。

前端请求的是相对路径 `/api`、`/uploads`、`/socket.io`，**只要 Nginx 反代正确，不必改前端代码**。

---

## 6. Nginx 反代（推荐）

新建站点配置（路径以飞牛 Nginx 为准，常见可放到 conf.d）：

```nginx
server {
  listen 8080;
  server_name _;

  root /vol1/1000/apps/xueji/apps/web/dist;
  index index.html;

  # 前端路由
  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /uploads/ {
    proxy_pass http://127.0.0.1:3000/uploads/;
    proxy_set_header Host $host;
  }

  location /socket.io/ {
    proxy_pass http://127.0.0.1:3000/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
  }
}
```

重载 Nginx 后访问：`http://NAS_IP:8080`。

### 用飞牛「网站 / 反向代理」图形界面时

1. 静态根目录指向 `apps/web/dist`。  
2. 增加反向代理规则：  
   - `/api` → `http://127.0.0.1:3000`  
   - `/uploads` → `http://127.0.0.1:3000`  
   - `/socket.io` → `http://127.0.0.1:3000`（勾选 WebSocket）  
3. 站点监听端口与 `CORS_ORIGIN`、飞牛端口映射一致。

---

## 7. 飞牛账户 + 端口外网访问

1. 飞牛远程访问里，把 **Web 端口（如 8080）** 映射出去。  
2. **不要** 映射 MySQL 3306；API 3000 也不必映射（只走 Nginx）。  
3. 把远程 Origin 写入 `apps/api/.env` 的 `CORS_ORIGIN`。  
4. `pm2 restart xueji-api`。  
5. 用手机流量打开远程地址，注册家长账号试用。

---

## 8. 更新版本

```bash
cd /vol1/1000/apps/xueji
# 更新代码后：
cd apps/api && npm install && npm run build && npm run migration:run
pm2 restart xueji-api

cd ../web && npm install && npm run build
# Nginx 已指向 dist，一般无需重启；若有缓存可重载 nginx
```

---

## 9. 备份

| 内容 | 位置 |
|------|------|
| 数据库 | MySQL 备份 / `mysqldump study_checkin` |
| 上传图 | `UPLOAD_DIR`（如 `/vol1/1000/apps/xueji/data/uploads`） |
| 配置 | `apps/api/.env`（勿提交到公开仓库） |

---

## 10. 常见问题

| 现象 | 处理 |
|------|------|
| `bcrypt` 安装失败 | 需系统编译工具；或换预编译环境 / 在 x86 机器构建后拷 `node_modules`（注意 CPU 架构一致：飞牛多为 x86_64 或 arm64） |
| 内存不够 build | 在电脑上 build，只上传 `dist/` 与 api 的 `dist/` |
| CORS 报错 | Origin 必须与地址栏完全一致（协议/域名/端口） |
| 实时不更新 | Nginx 未开 WebSocket 升级头 |
| 开机 API 没起来 | 执行过 `pm2 startup` + `pm2 save` |
| 权限 | `UPLOAD_DIR` 对运行 pm2 的用户可写 |

---

## 11. 和 Docker 方案怎么选

| | 无 Docker（本文） | Docker（`DEPLOY_FNOS.md`） |
|--|------------------|---------------------------|
| 依赖 | 自己装 Node、Nginx、pm2 | 只需 Docker |
| 连 MySQL | `127.0.0.1` 简单 | 要配 `DB_HOST`（容器访问宿主机） |
| 隔离/回滚 | 一般 | 更好 |
| 飞牛资源 | 通常更省一层虚拟化 | 镜像占空间 |

**可以、也推荐在飞牛上无 Docker 部署**；家庭自用足够。按本文第 4→6→7 节做完即可上线。

相关：Docker 方案见 [`DEPLOY_FNOS.md`](./DEPLOY_FNOS.md)。
