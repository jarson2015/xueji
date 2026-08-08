#!/bin/sh
set -e
cd /app
echo "[study-api] node=$(node -v) DB_HOST=$DB_HOST"
if [ ! -f dist/main.js ]; then
  echo "[study-api] ERROR: dist/main.js missing"
  ls -la
  exit 1
fi

ensure_build_tools() {
  if ! command -v g++ >/dev/null 2>&1 || ! command -v python3 >/dev/null 2>&1; then
    echo "[study-api] installing build tools..."
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends python3 make g++ ca-certificates
    rm -rf /var/lib/apt/lists/*
  fi
}

# 按 package-lock 哈希判断是否需要重装；避免仅因 mysql2 已存在而跳过新依赖
LOCK_HASH_FILE=node_modules/.xueji-lock-hash
NEED_INSTALL=0
if [ ! -d node_modules/mysql2 ]; then
  NEED_INSTALL=1
elif [ ! -f package-lock.json ]; then
  NEED_INSTALL=1
elif [ ! -f "$LOCK_HASH_FILE" ]; then
  NEED_INSTALL=1
else
  CURRENT_HASH=$(sha256sum package-lock.json | awk '{print $1}')
  STORED_HASH=$(cat "$LOCK_HASH_FILE" 2>/dev/null || true)
  if [ "$CURRENT_HASH" != "$STORED_HASH" ]; then
    NEED_INSTALL=1
  fi
fi

# 原生模块绑定缺失时也强制重装（常见于半截 node_modules / 跨平台拷贝）
if [ -d node_modules/bcrypt ] && [ ! -f node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node ]; then
  echo "[study-api] bcrypt native binding missing, will reinstall"
  NEED_INSTALL=1
fi
if [ ! -d node_modules/@nestjs/schedule ]; then
  echo "[study-api] @nestjs/schedule missing, will reinstall"
  NEED_INSTALL=1
fi

if [ "$NEED_INSTALL" = "1" ]; then
  echo "[study-api] installing deps..."
  ensure_build_tools
  rm -rf node_modules
  npm install --omit=dev --registry=https://registry.npmmirror.com
  sha256sum package-lock.json | awk '{print $1}' > "$LOCK_HASH_FILE"
fi

# 仍缺 bcrypt 绑定时原地 rebuild（不整包重装）
if [ ! -f node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node ]; then
  echo "[study-api] rebuilding bcrypt..."
  ensure_build_tools
  npm rebuild bcrypt --build-from-source
fi

if [ "$DB_MIGRATIONS_RUN" = "true" ]; then
  node dist/run-migrations.js
fi
echo "[study-api] starting..."
exec node dist/main.js
