#!/bin/sh
set -e
cd /app

if [ "${DB_MIGRATIONS_RUN}" = "true" ]; then
  echo "Running database migrations..."
  node dist/run-migrations.js
fi

if [ "${RUN_SEED_ON_START}" = "true" ]; then
  echo "Seeding..."
  SEED_SKIP_IF_NONEMPTY=true node dist/seed.js || echo "Seed finished with warnings"
fi

exec node dist/main.js
