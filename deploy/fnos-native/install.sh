#!/usr/bin/env bash
# 学迹 · 飞牛一键安装（在解压目录执行）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "==> 学迹安装目录: $ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "错误: 未找到 node。请先在飞牛安装 Node.js 20 LTS。"
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "错误: 未找到 npm。"
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
echo "    Node $(node -v) / npm $(npm -v)"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "警告: 建议使用 Node 20 LTS（当前 major=$NODE_MAJOR）"
fi

if [ ! -f "$ROOT/.env" ]; then
  if [ -f "$ROOT/.env.example" ]; then
    cp "$ROOT/.env.example" "$ROOT/.env"
    echo "==> 已生成 .env，请先编辑数据库密码 / JWT_SECRET / CORS_ORIGIN / UPLOAD_DIR 后再启动"
  else
    echo "错误: 缺少 .env.example"
    exit 1
  fi
fi

# 把根目录 .env 链到 api（Nest 从 api 工作目录读）
ln -sfn "$ROOT/.env" "$ROOT/api/.env"

# 解析 UPLOAD_DIR；相对路径相对安装根目录
UPLOAD_DIR_RAW="$(grep -E '^UPLOAD_DIR=' "$ROOT/.env" | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
if [ -z "$UPLOAD_DIR_RAW" ]; then
  UPLOAD_DIR_RAW="./data/uploads"
fi
case "$UPLOAD_DIR_RAW" in
  /*) UPLOAD_ABS="$UPLOAD_DIR_RAW" ;;
  *)  UPLOAD_ABS="$ROOT/${UPLOAD_DIR_RAW#./}" ;;
esac
mkdir -p "$UPLOAD_ABS"
# 写回绝对路径，避免 pm2 工作目录导致相对路径错乱
if grep -qE '^UPLOAD_DIR=' "$ROOT/.env"; then
  # 用临时文件避免 sed -i 在部分系统差异
  awk -v p="$UPLOAD_ABS" 'BEGIN{done=0} /^UPLOAD_DIR=/{print "UPLOAD_DIR=" p; done=1; next} {print} END{if(!done) print "UPLOAD_DIR=" p}' "$ROOT/.env" > "$ROOT/.env.tmp"
  mv "$ROOT/.env.tmp" "$ROOT/.env"
fi
echo "==> 上传目录: $UPLOAD_ABS"

echo "==> 安装 API 生产依赖（国内镜像）..."
cd "$ROOT/api"
npm install --omit=dev --registry=https://registry.npmmirror.com

echo "==> 执行数据库迁移..."
node dist/run-migrations.js

echo ""
echo "安装完成。"
echo "下一步："
echo "  1) 确认已编辑 .env（JWT / 数据库 / CORS_ORIGIN）"
echo "  2) 配置 Nginx：参考 nginx.xueji.conf（root 指向 $ROOT/web）"
echo "  3) ./start.sh"
echo "  4) curl -s http://127.0.0.1:3000/api/health"
