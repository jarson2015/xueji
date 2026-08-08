import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsGateway } from './events.gateway';
import { MonitorRevisionService } from '../common/monitor-revision.service';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule,
    TypeOrmModule.forFeature([User]),
  ],
  providers: [EventsGateway, MonitorRevisionService],
  exports: [EventsGateway, MonitorRevisionService],
})
export class EventsModule {}
