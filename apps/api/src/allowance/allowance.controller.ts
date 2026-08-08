import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AllowanceService } from './allowance.service';
import {
  CreateAchievementClaimDto,
  CreateAllowanceEntryDto,
  CreateAllowanceGoalDto,
  ReviewAllowanceEntryDto,
  SaveToGoalDto,
  UpdateAllowanceGoalDto,
} from './dto';
import { ForbidProxyGuard, JwtAuthGuard, RolesGuard } from '../common/guards';
import { ForbidProxy } from '../common/forbid-proxy.decorator';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/current-user.decorator';

@Controller('allowance')
@UseGuards(JwtAuthGuard, RolesGuard, ForbidProxyGuard)
export class AllowanceController {
  constructor(private readonly allowance: AllowanceService) {}

  @Get('me')
  @Roles(UserRole.STUDENT)
  me(@CurrentUser() user: { id: number }) {
    return this.allowance.summaryForStudent(user.id);
  }

  @Get('students/:id')
  @Roles(UserRole.PARENT)
  forStudent(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.allowance.summaryForParent(user.id, id);
  }

  @Get('entries')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  entries(
    @CurrentUser() user: { id: number; role: string },
    @Query('studentId') studentId?: string,
  ) {
    const sid = studentId ? Number(studentId) : undefined;
    return this.allowance.listEntries(
      user,
      Number.isFinite(sid) ? sid : undefined,
    );
  }

  @Post('entries')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  @ForbidProxy()
  createEntry(
    @CurrentUser() user: { id: number; role: string; name?: string },
    @Body() dto: CreateAllowanceEntryDto,
  ) {
    return this.allowance.createEntry(user, dto);
  }

  @Post('entries/:id/review')
  @Roles(UserRole.PARENT)
  review(
    @CurrentUser() user: { id: number; name?: string },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewAllowanceEntryDto,
  ) {
    return this.allowance.reviewEntry(user.id, id, dto, user.name);
  }

  @Get('achievements')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  listAchievements(
    @CurrentUser() user: { id: number; role: string },
    @Query('studentId') studentId?: string,
  ) {
    const sid = studentId ? Number(studentId) : undefined;
    return this.allowance.listAchievements(
      user,
      Number.isFinite(sid) ? sid : undefined,
    );
  }

  @Post('achievements')
  @Roles(UserRole.PARENT)
  createAchievement(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateAchievementClaimDto,
  ) {
    return this.allowance.createAchievement(user.id, dto);
  }

  @Post('achievements/:id/post')
  @Roles(UserRole.PARENT)
  postAchievement(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.allowance.postAchievement(user.id, id);
  }

  @Post('achievements/:id/cancel')
  @Roles(UserRole.PARENT)
  cancelAchievement(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.allowance.cancelAchievement(user.id, id);
  }

  @Get('goals')
  @Roles(UserRole.STUDENT)
  goals(@CurrentUser() user: { id: number }) {
    return this.allowance.listGoals(user.id);
  }

  @Post('goals')
  @Roles(UserRole.STUDENT)
  @ForbidProxy()
  createGoal(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateAllowanceGoalDto,
  ) {
    return this.allowance.createGoal(user.id, dto);
  }

  @Patch('goals/:id')
  @Roles(UserRole.STUDENT)
  @ForbidProxy()
  updateGoal(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAllowanceGoalDto,
  ) {
    return this.allowance.updateGoal(user.id, id, dto);
  }

  @Post('goals/:id/save')
  @Roles(UserRole.STUDENT)
  @ForbidProxy()
  saveToGoal(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveToGoalDto,
  ) {
    return this.allowance.saveToGoal(user.id, id, dto);
  }
}
