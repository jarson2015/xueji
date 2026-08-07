import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { entities } from './entities';

loadEnv();

const dbType = process.env.DB_TYPE || 'mysql';

export default new DataSource(
  dbType === 'sqlite'
    ? {
        type: 'sqlite',
        database: process.env.DB_SQLITE_PATH || 'data/study.sqlite',
        entities,
        migrations: ['src/migrations/*.ts'],
        synchronize: false,
      }
    : {
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        username: process.env.DB_USER || 'study',
        password: process.env.DB_PASSWORD || 'study123',
        database: process.env.DB_NAME || 'study_checkin',
        entities,
        migrations: ['src/migrations/*.ts'],
        synchronize: false,
        timezone: '+08:00',
      },
);
