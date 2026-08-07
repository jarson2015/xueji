#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [ ! -f "$ROOT/.env" ]; then
  echo "缺少 .env，请先 cp .env.example .env 并编辑，再运行 ./install.sh"
  exit 1
fi

ln -sfn "$ROOT/.env" "$ROOT/api/.env"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> 未检测到 pm2，正在全局安装..."
  npm i -g pm2 --registry=https://registry.npmmirror.com
fi

# 确保上传目录存在
UPLOAD_DIR_RAW="$(grep -E '^UPLOAD_DIR=' "$ROOT/.env" | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' || true)"
if [ -n "$UPLOAD_DIR_RAW" ]; then
  case "$UPLOAD_DIR_RAW" in
    /*) mkdir -p "$UPLOAD_DIR_RAW" ;;
    *)  mkdir -p "$ROOT/${UPLOAD_DIR_RAW#./}" ;;
  esac
fi

pm2 startOrReload "$ROOT/ecosystem.config.cjs" --update-env
pm2 save
echo ""
echo "已启动。查看日志: pm2 logs xueji-api"
echo "健康检查: curl -s http://127.0.0.1:3000/api/health"
echo "开机自启（首次）: pm2 startup   # 按提示执行给出的命令，再 pm2 save"
