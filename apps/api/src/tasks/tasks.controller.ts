import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AssignTaskDto, CreateTaskDto, UpdateTaskDto, ProposeTaskDto, ApproveTaskProposalDto, RejectTaskProposalDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('tasks')
  @Roles(UserRole.PARENT)
  list(@CurrentUser() user: { id: number }) {
    return this.tasks.listForParent(user.id);
  }

  @Get('task-templates')
  @Roles(UserRole.PARENT)
  templates() {
    return this.tasks.listTemplates();
  }

  @Get('task-proposals')
  @Roles(UserRole.PARENT)
  listProposals(@CurrentUser() user: { id: number }) {
    return this.tasks.listProposalsForParent(user.id);
  }

  @Post('task-proposals/:id/approve')
  @Roles(UserRole.PARENT)
  approveProposal(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveTaskProposalDto,
  ) {
    return this.tasks.approveProposal(user.id, id, dto);
  }

  @Post('task-proposals/:id/reject')
  @Roles(UserRole.PARENT)
  rejectProposal(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectTaskProposalDto,
  ) {
    return this.tasks.rejectProposal(user.id, id, dto);
  }

  @Post('tasks/propose')
  @Roles(UserRole.STUDENT)
  propose(@CurrentUser() user: { id: number }, @Body() dto: ProposeTaskDto) {
    return this.tasks.propose(user.id, dto);
  }

  @Get('my/task-proposals')
  @Roles(UserRole.STUDENT)
  myProposals(@CurrentUser() user: { id: number }) {
    return this.tasks.listMyProposals(user.id);
  }

  @Post('tasks')
  @Roles(UserRole.PARENT)
  create(@CurrentUser() user: { id: number }, @Body() dto: CreateTaskDto) {
    return this.tasks.create(user.id, dto);
  }

  @Patch('tasks/:id')
  @Roles(UserRole.PARENT)
  update(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(user.id, id, dto);
  }

  @Delete('tasks/:id')
  @Roles(UserRole.PARENT)
  remove(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tasks.remove(user.id, id);
  }

  @Post('tasks/:id/assign')
  @Roles(UserRole.PARENT)
  assign(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTaskDto,
  ) {
    return this.tasks.assign(user.id, id, dto);
  }

  @Get('my/tasks')
  @Roles(UserRole.STUDENT)
  myTasks(@CurrentUser() user: { id: number }) {
    return this.tasks.myTasks(user.id);
  }

  @Get('my/archived-tasks')
  @Roles(UserRole.STUDENT)
  myArchived(@CurrentUser() user: { id: number }) {
    return this.tasks.listArchivedForStudent(user.id);
  }

  @Get('archived-assigns')
  @Roles(UserRole.PARENT)
  archivedForParent(
    @CurrentUser() user: { id: number },
    @Query('studentId') studentId?: string,
  ) {
    const sid = studentId ? Number(studentId) : undefined;
    return this.tasks.listArchivedForParent(
      user.id,
      sid && Number.isFinite(sid) ? sid : undefined,
    );
  }

  @Post('my/assigns/:id/defer-today')
  @Roles(UserRole.STUDENT)
  deferToday(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tasks.deferToday(user.id, id);
  }
}
