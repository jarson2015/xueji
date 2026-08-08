import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FamilyService } from './family.service';
import { FamilyInviteService } from './family-invite.service';
import { AuditService } from './audit.service';
import { CovenantProposalService } from './covenant-proposal.service';
import {
  AcceptInviteDto,
  ProposeCovenantDto,
  UpdateFamilySettingsDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../common/enums';
import { CurrentUser } from '../common/current-user.decorator';
import { RateLimitService } from '../common/rate-limit.service';
import { clientIp } from '../common/client-ip';
import {
  INVITE_ACCEPT_IP_LIMIT,
  INVITE_ACCEPT_USER_LIMIT,
  INVITE_ACCEPT_WINDOW_MS,
  inviteAcceptIpKey,
  inviteAcceptUserKey,
} from '../common/invite-rate-policy';

@Controller('family')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FamilyController {
  constructor(
    private readonly family: FamilyService,
    private readonly invites: FamilyInviteService,
    private readonly audit: AuditService,
    private readonly proposals: CovenantProposalService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Get('settings')
  @Roles(UserRole.PARENT)
  get(@CurrentUser() user: { id: number }) {
    return this.family.getOrCreate(user.id);
  }

  @Put('settings')
  @Roles(UserRole.PARENT)
  update(
    @CurrentUser() user: { id: number },
    @Body() dto: UpdateFamilySettingsDto,
  ) {
    return this.family.update(user.id, dto);
  }

  /** Family covenant — parents edit via settings; students read-only */
  @Get('covenant')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  async covenant(@CurrentUser() user: { id: number; role: string }) {
    if (user.role === UserRole.STUDENT) {
      return this.family.covenantForStudent(user.id);
    }
    const s = await this.family.getOrCreate(user.id);
    return {
      weeklyRestDays: s.weeklyRestDays,
      extraRestDates: s.extraRestDates,
      restDaysEnabled: s.restDaysEnabled,
      restPauseAll: s.restPauseAll,
      restPauseCategories: s.restPauseCategories,
      makeupEnabled: s.makeupEnabled,
      makeupDiscountPercent: s.makeupDiscountPercent,
      makeupWindowDays: s.makeupWindowDays,
      rewardMode: s.rewardMode,
      intrinsicMode: !!s.intrinsicMode,
      ageBand: s.ageBand,
      reflectionEnabled: s.reflectionEnabled,
      goldenFingerNote: s.goldenFingerNote,
      covenantNote: s.covenantNote,
      nudgeHint: '家长可以轻轻提醒，但不会太频繁。',
      dailySkipLimit: s.dailySkipLimit,
      allowanceLedgerEnabled: s.allowanceLedgerEnabled,
      allowanceWeeklyCents: s.allowanceWeeklyCents,
      allowanceLargeCents: s.allowanceLargeCents,
      allowanceSavePercent: s.allowanceSavePercent,
      allowanceNote: s.allowanceNote,
      allowanceAchievementBonusEnabled: s.allowanceAchievementBonusEnabled,
      allowanceAchievementBonusMaxCents: s.allowanceAchievementBonusMaxCents,
      pointsPactEnabled: s.pointsPactEnabled,
      pointsPactMaxAmount: s.pointsPactMaxAmount,
      pointsPactMaxActive: s.pointsPactMaxActive,
      pointsPactMaxOverdueExtra: s.pointsPactMaxOverdueExtra,
      pointsPactNote: s.pointsPactNote,
      pointsPactParentApproveAbove: s.pointsPactParentApproveAbove,
      pointsGiftMaxAmount: s.pointsGiftMaxAmount,
      pointsGiftParentApproveAbove: s.pointsGiftParentApproveAbove,
      pointsGiftDailyMax: s.pointsGiftDailyMax,
      pointsGiftWeeklyOutMax: s.pointsGiftWeeklyOutMax,
      slotExtendedEnabled: s.slotExtendedEnabled,
      slotClockMap: s.slotClockMap,
      slotClockEffective: s.slotClockEffective,
      editable: true,
    };
  }

  @Get('covenant/proposals')
  @Roles(UserRole.PARENT, UserRole.STUDENT)
  listProposals(@CurrentUser() user: { id: number; role: string }) {
    if (user.role === UserRole.STUDENT) {
      return this.proposals.listForStudent(user.id);
    }
    return this.proposals.listForParent(user.id);
  }

  @Post('covenant/proposals')
  @Roles(UserRole.STUDENT)
  propose(
    @CurrentUser() user: { id: number },
    @Body() dto: ProposeCovenantDto,
  ) {
    return this.proposals.propose(user.id, dto.text);
  }

  @Post('covenant/proposals/:id/adopt')
  @Roles(UserRole.PARENT)
  adopt(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.proposals.adopt(user.id, id);
  }

  @Post('covenant/proposals/:id/dismiss')
  @Roles(UserRole.PARENT)
  dismiss(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.proposals.dismiss(user.id, id);
  }

  @Get('co-parents')
  @Roles(UserRole.PARENT)
  coParents(@CurrentUser() user: { id: number }) {
    return this.invites.listCoParents(user.id);
  }

  @Post('invites')
  @Roles(UserRole.PARENT)
  createInvite(@CurrentUser() user: { id: number }) {
    return this.invites.createInvite(user.id);
  }

  @Post('invites/accept')
  @Roles(UserRole.PARENT)
  acceptInvite(
    @Req() req: any,
    @CurrentUser() user: { id: number },
    @Body() dto: AcceptInviteDto,
  ) {
    const ip = clientIp(req);
    this.rateLimit.consume(
      inviteAcceptIpKey(ip),
      INVITE_ACCEPT_IP_LIMIT,
      INVITE_ACCEPT_WINDOW_MS,
    );
    this.rateLimit.consume(
      inviteAcceptUserKey(user.id),
      INVITE_ACCEPT_USER_LIMIT,
      INVITE_ACCEPT_WINDOW_MS,
    );
    return this.invites.acceptInvite(user.id, dto);
  }

  @Get('audit')
  @Roles(UserRole.PARENT)
  listAudit(@CurrentUser() user: { id: number }) {
    return this.audit.recentForParent(user.id);
  }
}
