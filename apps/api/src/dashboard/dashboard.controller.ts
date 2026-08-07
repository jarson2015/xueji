import {
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/current-user.decorator';
import { MonitorRevisionService } from '../common/monitor-revision.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly monitorRev: MonitorRevisionService,
  ) {}

  @Get('dashboard/progress')
  @Roles(UserRole.PARENT)
  progress(@CurrentUser() user: { id: number }) {
    return this.dashboard.progress(user.id);
  }

  @Get('dashboard/summary')
  @Roles(UserRole.PARENT)
  summary(@CurrentUser() user: { id: number }) {
    return this.dashboard.summary(user.id);
  }

  @Get('dashboard/monitor')
  @Roles(UserRole.PARENT)
  async monitor(
    @CurrentUser() user: { id: number },
    @Res({ passthrough: true }) res: Response,
    @Headers('if-none-match') ifNoneMatch: string | undefined,
    @Query('lite') lite?: string,
    @Query('timing') timing?: string,
  ) {
    const isLite = lite === '1';
    const etag = this.monitorRev.etag(user.id, isLite);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, no-cache');
    if (ifNoneMatch && ifNoneMatch === etag) {
      throw new HttpException('Not Modified', HttpStatus.NOT_MODIFIED);
    }
    return this.dashboard.monitor(user.id, {
      lite: isLite,
      timing: timing === '1',
    });
  }

  @Get('my/today')
  @Roles(UserRole.STUDENT)
  today(@CurrentUser() user: { id: number }) {
    return this.dashboard.today(user.id);
  }

  @Get('my/today/lite')
  @Roles(UserRole.STUDENT)
  todayLite(@CurrentUser() user: { id: number }) {
    return this.dashboard.todayLite(user.id);
  }
}
