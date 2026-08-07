import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { StudentPrefsService } from './student-prefs.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
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
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class StudentMeController {
  constructor(private readonly prefs: StudentPrefsService) {}

  @Get('my/weekly-goal')
  getWeeklyGoal(@CurrentUser() user: { id: number }) {
    return this.prefs.getWeeklyGoal(user.id);
  }

  @Put('my/weekly-goal')
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

  @Put('my/weekend-review')
  putWeekendReview(
    @CurrentUser() user: { id: number },
    @Body() dto: WeekendReviewBodyDto,
  ) {
    return this.prefs.putWeekendReview(user.id, dto);
  }
}
