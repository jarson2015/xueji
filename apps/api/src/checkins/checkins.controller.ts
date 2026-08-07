import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CheckinsService } from './checkins.service';
import {
  BatchConfirmCheckInDto,
  ConfirmCheckInDto,
  CreateCheckInDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CheckinsController {
  constructor(private readonly checkins: CheckinsService) {}

  @Post('checkins')
  @Roles(UserRole.STUDENT)
  create(@CurrentUser() user: { id: number }, @Body() dto: CreateCheckInDto) {
    return this.checkins.create(user.id, dto);
  }

  @Get('checkins')
  list(
    @CurrentUser() user: { id: number; role: string },
    @Query('studentId') studentId?: string,
  ) {
    if (user.role === UserRole.PARENT) {
      return this.checkins.listForParent(
        user.id,
        studentId ? Number(studentId) : undefined,
      );
    }
    return this.checkins.listForStudent(user.id);
  }

  @Post('checkins/confirm-batch')
  @Roles(UserRole.PARENT)
  confirmBatch(
    @CurrentUser() user: { id: number; name?: string },
    @Body() dto: BatchConfirmCheckInDto,
  ) {
    return this.checkins.confirmBatch(user.id, dto, user.name);
  }

  @Post('checkins/:id/confirm')
  @Roles(UserRole.PARENT)
  confirm(
    @CurrentUser() user: { id: number; name?: string },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmCheckInDto,
  ) {
    return this.checkins.confirm(user.id, id, dto, user.name);
  }
}
