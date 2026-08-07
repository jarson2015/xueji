import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { ParentStudent } from '../entities/parent-student.entity';
import { FamilySettings } from '../entities/family-settings.entity';
import { FamilyInvite } from '../entities/family-invite.entity';
import { Task } from '../entities/task.entity';
import { TaskAssign } from '../entities/task-assign.entity';
import { TaskStep } from '../entities/task-step.entity';
import { CheckIn } from '../entities/checkin.entity';
import { StudyPlan } from '../entities/study-plan.entity';
import { PlanItem } from '../entities/plan-item.entity';
import { PointLedger } from '../entities/point-ledger.entity';
import { WishItem } from '../entities/wish-item.entity';
import { WishRedeem } from '../entities/wish-redeem.entity';
import { PointPact } from '../entities/point-pact.entity';
import { PointGift } from '../entities/point-gift.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { CovenantProposal } from '../entities/covenant-proposal.entity';
import { AllowanceAccount } from '../entities/allowance-account.entity';
import { AllowanceEntry } from '../entities/allowance-entry.entity';
import { AllowanceGoal } from '../entities/allowance-goal.entity';
import { PushSubscription } from '../entities/push-subscription.entity';

/** All app entities — needed so User relations resolve under synchronize */
export const ALL_ENTITIES: Function[] = [
  User,
  ParentStudent,
  FamilySettings,
  FamilyInvite,
  Task,
  TaskAssign,
  TaskStep,
  CheckIn,
  StudyPlan,
  PlanItem,
  PointLedger,
  WishItem,
  WishRedeem,
  PointPact,
  PointGift,
  AuditLog,
  CovenantProposal,
  AllowanceAccount,
  AllowanceEntry,
  AllowanceGoal,
  PushSubscription,
];

/** Shared in-memory sqlite DataSource for integration specs */
export async function createSqliteMemory(
  entities: Function[] = ALL_ENTITIES,
): Promise<DataSource> {
  const ds = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    entities,
    synchronize: true,
  });
  await ds.initialize();
  return ds;
}

export function test(name: string, fn: () => void | Promise<void>) {
  return { name, fn };
}

export async function runTests(
  title: string,
  cases: { name: string; fn: () => void | Promise<void> }[],
) {
  console.log(title);
  for (const c of cases) {
    try {
      await c.fn();
      console.log(`  ✓ ${c.name}`);
    } catch (e) {
      console.error(`  ✗ ${c.name}`);
      throw e;
    }
  }
  console.log('all passed');
}
