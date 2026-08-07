#!/usr/bin/env node
/** Run pending TypeORM migrations then exit (used by Docker entrypoint / native install). */
require('reflect-metadata');
const path = require('path');
const { config: loadEnv } = require('dotenv');
const { DataSource } = require('typeorm');
const { entities } = require('./entities');

// Prefer api/.env; also try parent (fnOS 安装包根目录 .env 经软链到 api/.env)
loadEnv();
loadEnv({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const dbType = process.env.DB_TYPE || 'mysql';
  const migrations = [path.join(__dirname, 'migrations', '*{.ts,.js}')];
  const ds =
    dbType === 'sqlite'
      ? new DataSource({
          type: 'sqlite',
          database: process.env.DB_SQLITE_PATH || 'data/study.sqlite',
          entities,
          migrations,
          synchronize: false,
        })
      : new DataSource({
          type: 'mysql',
          host: process.env.DB_HOST || 'localhost',
          port: Number(process.env.DB_PORT || 3306),
          username: process.env.DB_USER || 'study',
          password: process.env.DB_PASSWORD || 'study123',
          database: process.env.DB_NAME || 'study_checkin',
          entities,
          migrations,
          synchronize: false,
          timezone: '+08:00',
        });
  await ds.initialize();
  const ran = await ds.runMigrations();
  console.log(
    ran.length
      ? `Migrations applied: ${ran.map((m) => m.name).join(', ')}`
      : 'No pending migrations',
  );
  await ds.destroy();
}

main().catch((e) => {
  console.error('Migration failed', e);
  process.exit(1);
});
