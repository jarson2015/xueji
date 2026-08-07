import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser } from '../common/current-user.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('weekly')
  weekly(
    @CurrentUser() user: { id: number; role: string },
    @Query('studentId') studentId?: string,
  ) {
    return this.reports.weekly(
      user.id,
      user.role,
      studentId ? Number(studentId) : undefined,
    );
  }
}
