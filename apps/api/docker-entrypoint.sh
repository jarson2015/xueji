#!/bin/sh
set -e

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
