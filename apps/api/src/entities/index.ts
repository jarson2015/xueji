import { User } from './user.entity';
import { ParentStudent } from './parent-student.entity';
import { Task } from './task.entity';
import { TaskAssign } from './task-assign.entity';
import { TaskStep } from './task-step.entity';
import { CheckIn } from './checkin.entity';
import { StudyPlan } from './study-plan.entity';
import { PlanItem } from './plan-item.entity';
import { PointLedger } from './point-ledger.entity';
import { WishItem } from './wish-item.entity';
import { WishRedeem } from './wish-redeem.entity';
import { FamilySettings } from './family-settings.entity';
import { FamilyInvite } from './family-invite.entity';
import { PushSubscription } from './push-subscription.entity';
import { AuditLog } from './audit-log.entity';
import { AllowanceAccount } from './allowance-account.entity';
import { AllowanceEntry } from './allowance-entry.entity';
import { AllowanceGoal } from './allowance-goal.entity';
import { PointPact } from './point-pact.entity';
import { PointGift } from './point-gift.entity';
import { CovenantProposal } from './covenant-proposal.entity';
import { TaskProposal } from './task-proposal.entity';
import { StudentWeeklyGoal, StudentDailyFocus } from './student-prefs.entity';
import { StudentWeeklyReview } from './student-weekly-review.entity';
import { GrowthMilestone } from './growth-milestone.entity';
import {
  JournalComment,
  JournalPost,
  JournalReaderState,
  JournalStudentPrefs,
  JournalUserPrefs,
  PrivateDiaryEntry,
} from './journal.entity';

export const entities = [
  User,
  ParentStudent,
  Task,
  TaskAssign,
  TaskStep,
  CheckIn,
  StudyPlan,
  PlanItem,
  PointLedger,
  WishItem,
  WishRedeem,
  FamilySettings,
  FamilyInvite,
  PushSubscription,
  AuditLog,
  AllowanceAccount,
  AllowanceEntry,
  AllowanceGoal,
  PointPact,
  PointGift,
  CovenantProposal,
  TaskProposal,
  StudentWeeklyGoal,
  StudentDailyFocus,
  StudentWeeklyReview,
  GrowthMilestone,
  JournalPost,
  JournalComment,
  PrivateDiaryEntry,
  JournalStudentPrefs,
  JournalReaderState,
  JournalUserPrefs,
];

