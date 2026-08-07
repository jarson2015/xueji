import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto } from './dto';
import { NudgeStudentDto } from '../family/dto';
import { NudgeService } from '../family/nudge.service';
import { StudentPrefsService } from './student-prefs.service';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/current-user.decorator';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARENT)
export class StudentsController {
  constructor(
    private readonly students: StudentsService,
    private readonly nudges: NudgeService,
    private readonly prefs: StudentPrefsService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  list(@CurrentUser() user: { id: number }) {
    return this.students.list(user.id);
  }

  /** 本周周末回顾批量（避免仪式屏 N+1） */
  @Get('weekend-reviews')
  async weekendReviews(@CurrentUser() user: { id: number }) {
    const students = await this.students.list(user.id);
    const ids = students.map((s) => s.id);
    const reviews = await this.prefs.listWeekendReviews(ids);
    const nameById = new Map(students.map((s) => [s.id, s.name]));
    return reviews.map((r) => ({
      ...r,
      name: nameById.get(r.studentId) || '',
    }));
  }

  /** 本周主题批量（监控 / 仪式屏）；附带近几周主题史供仪式轮播 */
  @Get('weekly-goals')
  async weeklyGoals(@CurrentUser() user: { id: number }) {
    const students = await this.students.list(user.id);
    const ids = students.map((s) => s.id);
    const [goals, recentById] = await Promise.all([
      this.prefs.listWeeklyGoals(ids),
      this.prefs.listRecentThemesForStudents(ids, undefined, 2),
    ]);
    const nameById = new Map(students.map((s) => [s.id, s.name]));
    return goals.map((g) => ({
      ...g,
      name: nameById.get(g.studentId) || '',
      recentThemes: recentById.get(g.studentId) || [],
    }));
  }

  @Post()
  create(@CurrentUser() user: { id: number }, @Body() dto: CreateStudentDto) {
    return this.students.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.students.update(user.id, id, dto);
  }

  @Post(':id/login-code')
  refreshLoginCode(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.students.refreshLoginCode(user.id, id);
  }

  @Post(':id/enter-as')
  enterAs(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.auth.enterAsStudent(user.id, id);
  }

  @Post(':id/nudge')
  nudge(
    @CurrentUser() user: { id: number; name?: string },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: NudgeStudentDto,
  ) {
    return this.nudges.nudge(user.id, id, dto, user.name);
  }

  @Get(':id/weekly-goal')
  async weeklyGoal(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.students.assertBound(user.id, id);
    return this.prefs.getWeeklyGoal(id);
  }

  @Put(':id/weekly-goal')
  async putWeeklyGoal(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body()
    dto: { text?: string; themePreset?: string; themeTitle?: string },
  ) {
    await this.students.assertBound(user.id, id);
    return this.prefs.putWeeklyGoal(id, dto);
  }

  @Get(':id/weekend-review')
  async weekendReview(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.students.assertBound(user.id, id);
    return this.prefs.getWeekendReview(id);
  }

  @Put(':id/weekend-review')
  async putWeekendReview(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body()
    dto: {
      proudText?: string;
      changeText?: string;
      promiseText?: string;
      journalPostId?: number | null;
      journalPostSummary?: string | null;
    },
  ) {
    await this.students.assertBound(user.id, id);
    return this.prefs.putWeekendReview(id, dto);
  }
}
