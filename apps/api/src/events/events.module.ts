import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { EventsGateway } from './events.gateway';
import { MonitorRevisionService } from '../common/monitor-revision.service';

@Module({
  imports: [JwtModule.register({}), ConfigModule],
  providers: [EventsGateway, MonitorRevisionService],
  exports: [EventsGateway, MonitorRevisionService],
})
export class EventsModule {}
