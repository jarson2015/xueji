#!/usr/bin/env bash
set -euo pipefail

if command -v pm2 >/dev/null 2>&1; then
  pm2 stop xueji-api 2>/dev/null || true
  pm2 delete xueji-api 2>/dev/null || true
  pm2 save 2>/dev/null || true
  echo "已停止 xueji-api"
else
  echo "未安装 pm2，若用 node 前台运行请手动 Ctrl+C"
fi
