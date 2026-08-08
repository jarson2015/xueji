import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PactsService } from './pacts.service';
import { CreatePointPactDto, ParentWriteOffDto } from './dto';
import { ForbidProxyGuard, JwtAuthGuard, RolesGuard } from '../common/guards';
import { ForbidProxy } from '../common/forbid-proxy.decorator';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/current-user.decorator';

@Controller('pacts')
@UseGuards(JwtAuthGuard, RolesGuard, ForbidProxyGuard)
export class PactsController {
  constructor(private readonly pacts: PactsService) {}

  @Get('me')
  @Roles(UserRole.STUDENT)
  listMine(@CurrentUser() user: { id: number }) {
    return this.pacts.listForStudent(user.id);
  }

  @Get('siblings')
  @Roles(UserRole.STUDENT)
  siblings(@CurrentUser() user: { id: number }) {
    return this.pacts.listSiblings(user.id);
  }

  @Get()
  @Roles(UserRole.PARENT)
  listParent(@CurrentUser() user: { id: number }) {
    return this.pacts.listForParent(user.id);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  getOne(
    @CurrentUser() user: { id: number; role: string },
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (user.role === UserRole.PARENT) {
      return this.pacts.getOneForParent(user.id, id);
    }
    return this.pacts.getOneForStudent(user.id, id);
  }

  @Post()
  @Roles(UserRole.STUDENT)
  @ForbidProxy()
  create(
    @CurrentUser() user: { id: number },
    @Body() dto: CreatePointPactDto,
  ) {
    return this.pacts.create(user.id, dto);
  }

  @Post(':id/accept')
  @Roles(UserRole.STUDENT)
  @ForbidProxy()
  accept(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.pacts.accept(user.id, id);
  }

  @Post(':id/reject')
  @Roles(UserRole.STUDENT)
  @ForbidProxy()
  reject(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.pacts.reject(user.id, id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.STUDENT)
  @ForbidProxy()
  cancel(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.pacts.cancel(user.id, id);
  }

  @Post(':id/repay')
  @Roles(UserRole.STUDENT)
  @ForbidProxy()
  repay(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.pacts.repay(user.id, id);
  }

  @Post(':id/parent-cancel')
  @Roles(UserRole.PARENT)
  parentCancel(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.pacts.parentCancel(user.id, id);
  }

  @Post(':id/parent-approve')
  @Roles(UserRole.PARENT)
  parentApprove(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.pacts.parentApprove(user.id, id);
  }

  @Post(':id/parent-reject')
  @Roles(UserRole.PARENT)
  parentReject(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.pacts.parentReject(user.id, id);
  }

  @Post(':id/parent-repay')
  @Roles(UserRole.PARENT)
  parentRepay(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.pacts.parentForceRepay(user.id, id);
  }

  @Post(':id/parent-write-off')
  @Roles(UserRole.PARENT)
  parentWriteOff(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ParentWriteOffDto,
  ) {
    return this.pacts.parentWriteOff(user.id, id, dto.note);
  }
}
