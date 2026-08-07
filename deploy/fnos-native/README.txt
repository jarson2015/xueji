学迹 · 飞牛 NAS 安装包（无 Docker）
================================

前提（飞牛上已有）：
  1. MySQL（已建库，见下方 SQL）
  2. Node.js 20 LTS（node -v / npm -v）
  3. Nginx 或飞牛「网站/反向代理」（可选但强烈推荐）
  4. 建议：npm i -g pm2

────────────────────────────────
三步上线
────────────────────────────────

【1】解压到数据盘，例如：
  /vol1/1000/apps/xueji/

【2】编辑配置并安装：
  cd /vol1/1000/apps/xueji
  cp .env.example .env
  # 用记事本/飞牛编辑器改 .env：数据库密码、JWT_SECRET、CORS_ORIGIN、UPLOAD_DIR
  chmod +x install.sh start.sh stop.sh
  ./install.sh

【3】配置 Nginx（或飞牛反向代理）后访问：
  把 nginx.xueji.conf 里的路径改成你的解压目录，加入 Nginx 并重载
  浏览器打开：http://NAS_IP:8080

健康检查：
  curl -s http://127.0.0.1:3000/api/health

────────────────────────────────
MySQL：建库 + 手动导入空白表结构
────────────────────────────────

1) 建空库（若已建好可跳过）：

CREATE DATABASE IF NOT EXISTS study_checkin
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'study'@'localhost' IDENTIFIED BY '你的强密码';
GRANT ALL PRIVILEGES ON study_checkin.* TO 'study'@'localhost';
FLUSH PRIVILEGES;

2) 导入空白表结构（推荐，库已建好时按这个做）：
   详见同目录 IMPORT_DB.txt
   文件：schema-blank.sql
   phpMyAdmin：选中 study_checkin → 导入 → 选 schema-blank.sql
   或命令行：
   mysql -u study -p -h 127.0.0.1 study_checkin < schema-blank.sql

   导入后业务表为空；首次打开网站自行注册家长账号即可。

────────────────────────────────
常用命令
────────────────────────────────

./start.sh          # 启动（pm2）
./stop.sh           # 停止
pm2 logs xueji-api  # 看日志
pm2 restart xueji-api

更新：解压覆盖后重新 ./install.sh（会装依赖并跑迁移），再 ./start.sh

────────────────────────────────
目录说明
────────────────────────────────

api/          后端（已编译 dist + package.json，安装时在 NAS 上装依赖）
web/          前端静态文件（已编译，Nginx 直接指向 web/）
data/uploads  上传图片目录（install 会创建）
.env          你的配置（勿外传）
ecosystem.config.cjs  pm2 配置
nginx.xueji.conf      Nginx 示例

详细说明见仓库 docs/DEPLOY_FNOS_NATIVE.md
