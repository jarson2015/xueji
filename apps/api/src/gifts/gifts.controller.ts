import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GiftsService } from './gifts.service';
import { CreatePointGiftDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/current-user.decorator';

@Controller('gifts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GiftsController {
  constructor(private readonly gifts: GiftsService) {}

  @Get('me')
  @Roles(UserRole.STUDENT)
  listMine(@CurrentUser() user: { id: number }) {
    return this.gifts.listForStudent(user.id);
  }

  @Get('siblings')
  @Roles(UserRole.STUDENT)
  siblings(@CurrentUser() user: { id: number }) {
    return this.gifts.listSiblings(user.id);
  }

  @Get()
  @Roles(UserRole.PARENT)
  listParent(@CurrentUser() user: { id: number }) {
    return this.gifts.listForParent(user.id);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  getOne(
    @CurrentUser() user: { id: number; role: string },
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (user.role === UserRole.PARENT) {
      return this.gifts.getOneForParent(user.id, id);
    }
    return this.gifts.getOneForStudent(user.id, id);
  }

  @Post()
  @Roles(UserRole.STUDENT)
  create(
    @CurrentUser() user: { id: number },
    @Body() dto: CreatePointGiftDto,
  ) {
    return this.gifts.create(user.id, dto);
  }

  @Post(':id/accept')
  @Roles(UserRole.STUDENT)
  accept(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.gifts.accept(user.id, id);
  }

  @Post(':id/reject')
  @Roles(UserRole.STUDENT)
  reject(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.gifts.reject(user.id, id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.STUDENT)
  cancel(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.gifts.cancel(user.id, id);
  }

  @Post(':id/parent-approve')
  @Roles(UserRole.PARENT)
  parentApprove(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.gifts.parentApprove(user.id, id);
  }

  @Post(':id/parent-reject')
  @Roles(UserRole.PARENT)
  parentReject(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.gifts.parentReject(user.id, id);
  }

  @Post(':id/parent-cancel')
  @Roles(UserRole.PARENT)
  parentCancel(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.gifts.parentCancel(user.id, id);
  }
}
