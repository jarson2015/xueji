import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import {
  CreatePlanDto,
  CreatePlanItemDto,
  UpdatePlanDto,
  UpdatePlanItemDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/current-user.decorator';

@Controller('plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  list(@CurrentUser() user: { id: number }) {
    return this.plans.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: { id: number }, @Body() dto: CreatePlanDto) {
    return this.plans.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.plans.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.plans.remove(user.id, id);
  }

  @Post(':id/items')
  addItem(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePlanItemDto,
  ) {
    return this.plans.addItem(user.id, id, dto);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdatePlanItemDto,
  ) {
    return this.plans.updateItem(user.id, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.plans.removeItem(user.id, id, itemId);
  }
}
