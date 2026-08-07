import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { GrowthService } from './growth.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/current-user.decorator';
import { StudentsService } from '../students/students.service';

class AddMilestoneDto {
  @IsInt()
  studentId: number;

  @IsString()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

@Controller('growth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GrowthController {
  constructor(
    private readonly growth: GrowthService,
    private readonly students: StudentsService,
  ) {}

  @Get('milestones')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  list(
    @CurrentUser() user: { id: number; role: string },
    @Query('studentId') studentId?: string,
  ) {
    if (user.role === UserRole.STUDENT) {
      return this.growth.listForStudent(user.id);
    }
    const sid = studentId ? Number(studentId) : undefined;
    return this.growth.listForParent(user.id, sid);
  }

  @Post('milestones')
  @Roles(UserRole.PARENT)
  add(@CurrentUser() user: { id: number }, @Body() dto: AddMilestoneDto) {
    return this.growth.addManual(user.id, dto.studentId, dto.title, dto.note);
  }

  @Get('album')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  async album(
    @CurrentUser() user: { id: number; role: string },
    @Query('studentId') studentId?: string,
  ) {
    if (user.role === UserRole.STUDENT) {
      return this.growth.album(user.id);
    }
    const ids = await this.students.getStudentIdsOfParent(user.id);
    const sid = studentId ? Number(studentId) : ids[0];
    if (!sid) return [];
    await this.students.assertBound(user.id, sid);
    return this.growth.album(sid);
  }

  @Get('portfolio')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  async portfolio(
    @CurrentUser() user: { id: number; role: string },
    @Query('studentId') studentId?: string,
  ) {
    if (user.role === UserRole.STUDENT) {
      return this.growth.portfolio(user.id);
    }
    const ids = await this.students.getStudentIdsOfParent(user.id);
    const sid = studentId ? Number(studentId) : ids[0];
    if (!sid) {
      return {
        weekTheme: null,
        milestones: [],
        photos: [],
        reflections: [],
        stats: { photoCount: 0, milestoneCount: 0, reflectionCount: 0 },
      };
    }
    await this.students.assertBound(user.id, sid);
    return this.growth.portfolio(sid);
  }
}
