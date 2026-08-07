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
import { WishesService } from './wishes.service';
import {
  ApproveWishDto,
  CreateWishDto,
  ProposeWishDto,
  ReviewRedeemDto,
  UpdateWishDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class WishesController {
  constructor(private readonly wishes: WishesService) {}

  @Get('wishes')
  list(@CurrentUser() user: { id: number; role: string }) {
    if (user.role === UserRole.PARENT) return this.wishes.listForParent(user.id);
    return this.wishes.listForStudent(user.id);
  }

  @Get('wishes/my-proposals')
  @Roles(UserRole.STUDENT)
  myProposals(@CurrentUser() user: { id: number }) {
    return this.wishes.listMyProposals(user.id);
  }

  @Post('wishes')
  @Roles(UserRole.PARENT)
  create(@CurrentUser() user: { id: number }, @Body() dto: CreateWishDto) {
    return this.wishes.create(user.id, dto);
  }

  @Post('wishes/propose')
  @Roles(UserRole.STUDENT)
  propose(@CurrentUser() user: { id: number }, @Body() dto: ProposeWishDto) {
    return this.wishes.propose(user.id, dto);
  }

  @Post('wishes/:id/approve')
  @Roles(UserRole.PARENT)
  approve(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveWishDto,
  ) {
    return this.wishes.approveProposal(user.id, id, dto);
  }

  @Patch('wishes/:id')
  @Roles(UserRole.PARENT)
  update(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWishDto,
  ) {
    return this.wishes.update(user.id, id, dto);
  }

  @Delete('wishes/:id')
  @Roles(UserRole.PARENT)
  remove(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.wishes.remove(user.id, id);
  }

  @Post('wishes/:id/redeem')
  @Roles(UserRole.STUDENT)
  redeem(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.wishes.redeem(user.id, id);
  }

  @Get('redeems')
  @Roles(UserRole.PARENT)
  redeems(@CurrentUser() user: { id: number }) {
    return this.wishes.listRedeems(user.id);
  }

  @Get('students/:id/waivable-chores')
  @Roles(UserRole.PARENT)
  waivableChores(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.wishes.listWaivableChores(user.id, id);
  }

  @Get('my/redeems')
  @Roles(UserRole.STUDENT)
  myRedeems(@CurrentUser() user: { id: number }) {
    return this.wishes.listRedeemsForStudent(user.id);
  }

  @Post('redeems/:id/review')
  @Roles(UserRole.PARENT)
  review(
    @CurrentUser() user: { id: number; name?: string },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewRedeemDto,
  ) {
    return this.wishes.review(user.id, id, dto, user.name);
  }

  @Post('my/redeems/:id/ack')
  @Roles(UserRole.STUDENT)
  ackRedeem(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.wishes.ackRedeem(user.id, id);
  }

  @Get('points')
  @Roles(UserRole.STUDENT)
  points(@CurrentUser() user: { id: number }) {
    return this.wishes.points(user.id);
  }
}
