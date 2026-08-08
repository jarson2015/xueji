import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { StudentPrefsService } from './student-prefs.service';
import { ForbidProxyGuard, JwtAuthGuard, RolesGuard } from '../common/guards';
import { ForbidProxy } from '../common/forbid-proxy.decorator';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/current-user.decorator';

class WeeklyGoalBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  themePreset?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  themeTitle?: string;
}

class DailyFocusBodyDto {
  @IsArray()
  @IsString({ each: true })
  keys: string[];

  @IsInt()
  @Min(0)
  swaps: number;
}

class WeekendReviewBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  proudText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  changeText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  promiseText?: string;

  @IsOptional()
  @IsInt()
  journalPostId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  journalPostSummary?: string | null;
}

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, ForbidProxyGuard)
@Roles(UserRole.STUDENT)
export class StudentMeController {
  constructor(private readonly prefs: StudentPrefsService) {}

  @Get('my/weekly-goal')
  getWeeklyGoal(@CurrentUser() user: { id: number }) {
    return this.prefs.getWeeklyGoal(user.id);
  }

  /** 周主题/目标须孩子本人；代登不可代写 */
  @Put('my/weekly-goal')
  @ForbidProxy()
  putWeeklyGoal(
    @CurrentUser() user: { id: number },
    @Body() dto: WeeklyGoalBodyDto,
  ) {
    return this.prefs.putWeeklyGoal(user.id, dto);
  }

  @Get('my/daily-focus')
  getDailyFocus(@CurrentUser() user: { id: number }) {
    return this.prefs.getDailyFocus(user.id);
  }

  // 今日顺序：代登可协助排程（不涉及积分/契约）
  @Put('my/daily-focus')
  putDailyFocus(
    @CurrentUser() user: { id: number },
    @Body() dto: DailyFocusBodyDto,
  ) {
    return this.prefs.putDailyFocus(user.id, dto.keys, dto.swaps);
  }

  @Get('my/weekend-review')
  getWeekendReview(@CurrentUser() user: { id: number }) {
    return this.prefs.getWeekendReview(user.id);
  }

  /** 周末小会文案须孩子本人 */
  @Put('my/weekend-review')
  @ForbidProxy()
  putWeekendReview(
    @CurrentUser() user: { id: number },
    @Body() dto: WeekendReviewBodyDto,
  ) {
    return this.prefs.putWeekendReview(user.id, dto);
  }
}
