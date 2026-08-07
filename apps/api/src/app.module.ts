import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { entities } from './entities';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { TasksModule } from './tasks/tasks.module';
import { CheckinsModule } from './checkins/checkins.module';
import { PlansModule } from './plans/plans.module';
import { WishesModule } from './wishes/wishes.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { EventsModule } from './events/events.module';
import { UploadsModule } from './uploads/uploads.module';
import { FamilyModule } from './family/family.module';
import { PushModule } from './push/push.module';
import { AllowanceModule } from './allowance/allowance.module';
import { PactsModule } from './pacts/pacts.module';
import { GiftsModule } from './gifts/gifts.module';
import { GrowthModule } from './growth/growth.module';
import { JournalModule } from './journal/journal.module';
import { HealthController } from './health.controller';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): any => {
        const dbType = config.get<string>('DB_TYPE', 'mysql');
        const nodeEnv = config.get<string>('NODE_ENV', 'development');
        const syncEnv = config.get<string>('DB_SYNCHRONIZE');
        // Default: sqlite/dev sync on; production MySQL sync off (use migrations).
        const synchronize =
          syncEnv !== undefined && syncEnv !== ''
            ? syncEnv === 'true'
            : dbType === 'sqlite' || nodeEnv !== 'production';
        const migrationsRun =
          config.get<string>('DB_MIGRATIONS_RUN') === 'true' ||
          (!synchronize && dbType === 'mysql');

        if (dbType === 'sqlite') {
          const { mkdirSync, existsSync } = require('fs');
          const { dirname } = require('path');
          const path = config.get<string>('DB_SQLITE_PATH', 'data/study.sqlite');
          const dir = dirname(path);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          return {
            type: 'sqlite',
            database: path,
            entities,
            synchronize,
            migrations: [__dirname + '/migrations/*{.ts,.js}'],
            migrationsRun: config.get<string>('DB_MIGRATIONS_RUN') === 'true',
          };
        }
        return {
          type: 'mysql',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: Number(config.get('DB_PORT', 3306)),
          username: config.get<string>('DB_USER', 'study'),
          password: config.get<string>('DB_PASSWORD', 'study123'),
          database: config.get<string>('DB_NAME', 'study_checkin'),
          entities,
          synchronize,
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsRun,
          timezone: '+08:00',
        };
      },
    }),
    AuthModule,
    StudentsModule,
    TasksModule,
    CheckinsModule,
    PlansModule,
    WishesModule,
    DashboardModule,
    ReportsModule,
    EventsModule,
    UploadsModule,
    FamilyModule,
    PushModule,
    AllowanceModule,
    PactsModule,
    GiftsModule,
    GrowthModule,
    JournalModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
