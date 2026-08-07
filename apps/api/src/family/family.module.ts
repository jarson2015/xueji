import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilySettings } from '../entities/family-settings.entity';
import { ParentStudent } from '../entities/parent-student.entity';
import { FamilyInvite } from '../entities/family-invite.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { CovenantProposal } from '../entities/covenant-proposal.entity';
import { FamilyService } from './family.service';
import { FamilyInviteService } from './family-invite.service';
import { FamilyController } from './family.controller';
import { NudgeService } from './nudge.service';
import { AuditService } from './audit.service';
import { CovenantProposalService } from './covenant-proposal.service';
import { FamilyPolicyReader } from './family-policy.reader';
import { CheckinPolicyReader } from './checkin-policy.reader';
import { PactPolicyReader } from './pact-policy.reader';
import { StudentsModule } from '../students/students.module';
import { EventsModule } from '../events/events.module';
import { PushModule } from '../push/push.module';
import { CheckinsModule } from '../checkins/checkins.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FamilySettings,
      ParentStudent,
      FamilyInvite,
      User,
      AuditLog,
      CovenantProposal,
    ]),
    forwardRef(() => StudentsModule),
    forwardRef(() => CheckinsModule),
    EventsModule,
    PushModule,
  ],
  providers: [
    FamilyPolicyReader,
    CheckinPolicyReader,
    PactPolicyReader,
    FamilyService,
    FamilyInviteService,
    NudgeService,
    AuditService,
    CovenantProposalService,
  ],
  controllers: [FamilyController],
  exports: [
    FamilyService,
    FamilyInviteService,
    NudgeService,
    AuditService,
    CovenantProposalService,
    FamilyPolicyReader,
    CheckinPolicyReader,
    PactPolicyReader,
  ],
})
export class FamilyModule {}
