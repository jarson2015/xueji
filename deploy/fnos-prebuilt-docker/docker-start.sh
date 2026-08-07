#!/bin/sh
set -e
cd /app
echo "[study-api] node=$(node -v) DB_HOST=$DB_HOST"
if [ ! -f dist/main.js ]; then
  echo "[study-api] ERROR: dist/main.js missing"
  ls -la
  exit 1
fi
if [ ! -d node_modules/mysql2 ]; then
  echo "[study-api] installing deps..."
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends python3 make g++ ca-certificates
  rm -rf /var/lib/apt/lists/*
  npm install --omit=dev --registry=https://registry.npmmirror.com
fi
if [ "$DB_MIGRATIONS_RUN" = "true" ]; then
  node dist/run-migrations.js
fi
echo "[study-api] starting..."
exec node dist/main.js
