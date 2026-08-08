#!/bin/sh
set -e

UPLOAD_DIR="${UPLOAD_DIR:-uploads}"

# Named volumes are often root-owned; fix then drop privileges (SEC P2b).
if [ "$(id -u)" = "0" ]; then
  mkdir -p "$UPLOAD_DIR" data
  chown -R node:node "$UPLOAD_DIR" data 2>/dev/null || true
  exec su-exec node "$0" "$@"
fi

echo "Waiting for database..."
sleep 3

if [ "${DB_MIGRATIONS_RUN}" = "true" ] || [ "${DB_SYNCHRONIZE}" = "false" ]; then
  echo "Running database migrations..."
  node dist/run-migrations.js
fi

if [ "${RUN_SEED_ON_START}" = "true" ]; then
  echo "Seeding demo data if empty (RUN_SEED_ON_START=true)..."
  SEED_SKIP_IF_NONEMPTY=true node dist/seed.js || echo "Seed finished with warnings"
fi

exec node dist/main.js
