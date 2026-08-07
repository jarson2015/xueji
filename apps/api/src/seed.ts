import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { entities } from './entities';
import { User } from './entities/user.entity';
import { ParentStudent } from './entities/parent-student.entity';
import { Task } from './entities/task.entity';
import { TaskAssign } from './entities/task-assign.entity';
import { TaskStep } from './entities/task-step.entity';
import { StudyPlan } from './entities/study-plan.entity';
import { PlanItem } from './entities/plan-item.entity';
import { WishItem } from './entities/wish-item.entity';
import { CheckIn } from './entities/checkin.entity';
import { FamilySettings } from './entities/family-settings.entity';
import { AllowanceAccount } from './entities/allowance-account.entity';
import { AllowanceEntry } from './entities/allowance-entry.entity';
import { AllowanceGoal } from './entities/allowance-goal.entity';
import {
  AssignStatus,
  ConfirmStatus,
  TargetType,
  TaskCategory,
  TaskSchedule,
  TimeSlot,
  WishType,
  UserRole,
  AllowanceKind,
  AllowanceEntryStatus,
  AllowanceGoalStatus,
} from './common/enums';
import { formatDate, getPeriodKey } from './common/date-util';

config();

function buildDataSource() {
  const dbType = process.env.DB_TYPE || 'mysql';
  const syncEnv = process.env.DB_SYNCHRONIZE;
  const synchronize =
    syncEnv !== undefined && syncEnv !== ''
      ? syncEnv === 'true'
      : true;
  if (dbType === 'sqlite') {
    const path = process.env.DB_SQLITE_PATH || 'data/study.sqlite';
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return new DataSource({
      type: 'sqlite',
      database: path,
      entities,
      synchronize,
    });
  }
  return new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USER || 'study',
    password: process.env.DB_PASSWORD || 'study123',
    database: process.env.DB_NAME || 'study_checkin',
    entities,
    synchronize,
  });
}

async function clearAll(ds: DataSource) {
  const tables = [
    'allowance_entries',
    'allowance_goals',
    'allowance_accounts',
    'audit_logs',
    'wish_redeems',
    'wish_items',
    'point_ledgers',
    'checkins',
    'plan_items',
    'study_plans',
    'task_steps',
    'task_assigns',
    'tasks',
    'family_invites',
    'push_subscriptions',
    'family_settings',
    'parent_students',
    'users',
  ];
  for (const t of tables) {
    try {
      await ds.query(`DELETE FROM ${t}`);
    } catch {
      // table may not exist yet
    }
  }
}

async function run() {
  const ds = buildDataSource();
  await ds.initialize();

  const users = ds.getRepository(User);
  const skipIfNonempty = process.env.SEED_SKIP_IF_NONEMPTY === 'true';
  const existing = await users.count();
  if (existing > 0 && skipIfNonempty) {
    console.log('Seed skipped: database already has users.');
    await ds.destroy();
    return;
  }

  const links = ds.getRepository(ParentStudent);
  const tasks = ds.getRepository(Task);
  const assigns = ds.getRepository(TaskAssign);
  const steps = ds.getRepository(TaskStep);
  const plans = ds.getRepository(StudyPlan);
  const items = ds.getRepository(PlanItem);
  const wishes = ds.getRepository(WishItem);
  const checkins = ds.getRepository(CheckIn);

  await clearAll(ds);

  const hash = await bcrypt.hash('demo1234', 10);
  const parent = await users.save(
    users.create({
      username: 'parent@demo.com',
      passwordHash: hash,
      name: '演示家长',
      role: UserRole.PARENT,
      pointsBalance: 0,
    }),
  );
  const codeExpiry = new Date();
  codeExpiry.setDate(codeExpiry.getDate() + 30);
  const s1 = await users.save(
    users.create({
      username: 'student1',
      passwordHash: hash,
      name: '小明',
      role: UserRole.STUDENT,
      pointsBalance: 40,
      loginCode: '102938',
      loginCodeExpiresAt: codeExpiry,
    }),
  );
  const s2 = await users.save(
    users.create({
      username: 'student2',
      passwordHash: hash,
      name: '小红',
      role: UserRole.STUDENT,
      pointsBalance: 10,
      loginCode: '203847',
      loginCodeExpiresAt: codeExpiry,
    }),
  );
  await links.save([
    links.create({ parentId: parent.id, studentId: s1.id }),
    links.create({ parentId: parent.id, studentId: s2.id }),
  ]);

  const daily = await tasks.save(
    tasks.create({
      title: '每日英语阅读 20 分钟',
      description: '朗读或默读均可，完成后打卡',
      creatorId: parent.id,
      schedule: TaskSchedule.DAILY,
      targetType: TargetType.DURATION,
      targetValue: 20,
      category: TaskCategory.STUDY,
      timeSlot: TimeSlot.AFTER_SCHOOL,
      requireConfirm: false,
      pointsReward: 10,
      active: true,
      deadline: null,
    }),
  );
  const chore = await tasks.save(
    tasks.create({
      title: '饭后收拾碗筷',
      description: '把碗筷送到厨房或帮忙清洗',
      creatorId: parent.id,
      schedule: TaskSchedule.DAILY,
      targetType: TargetType.ONCE,
      targetValue: 1,
      category: TaskCategory.CHORE,
      timeSlot: TimeSlot.AFTER_DINNER,
      requireConfirm: false,
      pointsReward: 8,
      active: true,
      deadline: null,
    }),
  );
  const once = await tasks.save(
    tasks.create({
      title: '期末数学复习',
      description: '按步骤完成复习',
      creatorId: parent.id,
      schedule: TaskSchedule.ONCE,
      targetType: TargetType.COUNT,
      targetValue: 5,
      category: TaskCategory.STUDY,
      timeSlot: TimeSlot.ANYTIME,
      requireConfirm: true,
      pointsReward: 30,
      active: true,
      deadline: null,
    }),
  );
  // Demo expired once-task for makeup flow (小明)
  const expiredOnce = await tasks.save(
    tasks.create({
      title: '英语听写订正',
      description: '已过期示例，可申请补卡',
      creatorId: parent.id,
      schedule: TaskSchedule.ONCE,
      targetType: TargetType.ONCE,
      targetValue: 1,
      category: TaskCategory.STUDY,
      timeSlot: TimeSlot.AFTER_SCHOOL,
      requireConfirm: false,
      pointsReward: 15,
      active: true,
      deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    }),
  );
  await steps.save([
    steps.create({ taskId: once.id, title: '整理错题本', sortOrder: 0 }),
    steps.create({ taskId: once.id, title: '复习公式', sortOrder: 1 }),
    steps.create({ taskId: once.id, title: '做一套模拟卷', sortOrder: 2 }),
    steps.create({ taskId: once.id, title: '订正模拟卷', sortOrder: 3 }),
    steps.create({ taskId: once.id, title: '家长抽查口述', sortOrder: 4 }),
  ]);

  const periodKey = getPeriodKey(TaskSchedule.DAILY);
  for (const sid of [s1.id, s2.id]) {
    await assigns.save(
      assigns.create({
        taskId: daily.id,
        studentId: sid,
        progressValue: 0,
        progressPercent: 0,
        status: AssignStatus.ACTIVE,
        periodKey,
      }),
    );
    await assigns.save(
      assigns.create({
        taskId: chore.id,
        studentId: sid,
        progressValue: 0,
        progressPercent: 0,
        status: AssignStatus.ACTIVE,
        periodKey,
      }),
    );
  }
  await assigns.save(
    assigns.create({
      taskId: once.id,
      studentId: s1.id,
      progressValue: 2,
      progressPercent: 40,
      status: AssignStatus.ACTIVE,
      periodKey: 'once',
    }),
  );
  await assigns.save(
    assigns.create({
      taskId: expiredOnce.id,
      studentId: s1.id,
      progressValue: 0,
      progressPercent: 0,
      status: AssignStatus.ACTIVE,
      periodKey: 'once',
    }),
  );

  const plan = await plans.save(
    plans.create({
      studentId: s1.id,
      title: '本周自学计划',
      startDate: formatDate(),
      endDate: null,
      note: '自己加的周末卷子',
    }),
  );
  await items.save(
    items.create({
      planId: plan.id,
      taskId: null,
      customTitle: '周末数学卷子',
      plannedDate: formatDate(),
      done: false,
    }),
  );

  await wishes.save([
    wishes.create({
      parentId: parent.id,
      studentId: s1.id,
      title: '周末多玩 30 分钟',
      costPoints: 50,
      type: WishType.NORMAL,
      active: true,
    }),
    wishes.create({
      parentId: parent.id,
      studentId: s1.id,
      title: '一份冰淇淋',
      costPoints: 30,
      type: WishType.NORMAL,
      active: true,
    }),
    wishes.create({
      parentId: parent.id,
      studentId: s1.id,
      title: '金手指（免做一次家务）',
      costPoints: 25,
      type: WishType.GOLDEN_FINGER,
      active: true,
    }),
  ]);

  // Demo: enable allowance ledger for 小明
  const settings = ds.getRepository(FamilySettings);
  await settings.save(
    settings.create({
      parentId: parent.id,
      weeklyRestDays: [0],
      extraRestDates: [],
      makeupEnabled: true,
      makeupDiscountPercent: 60,
      makeupWindowDays: 7,
      rewardMode: 'always',
      ageBand: 'general',
      reflectionEnabled: true,
      allowanceLedgerEnabled: true,
      allowanceWeeklyCents: 5000,
      allowanceLargeCents: 5000,
      allowanceSavePercent: 20,
      allowanceNote:
        '零花钱和学迹积分是两套：积分换愿望，零花钱练真实用钱。',
    }),
  );
  const accounts = ds.getRepository(AllowanceAccount);
  const entries = ds.getRepository(AllowanceEntry);
  const goals = ds.getRepository(AllowanceGoal);
  const account = await accounts.save(
    accounts.create({ studentId: s1.id, balanceCents: 5000 }),
  );
  await entries.save(
    entries.create({
      studentId: s1.id,
      accountId: account.id,
      deltaCents: 5000,
      kind: AllowanceKind.POCKET_MONEY,
      category: null,
      title: '本周零花钱',
      note: null,
      imageUrl: null,
      status: AllowanceEntryStatus.POSTED,
      goalId: null,
      createdBy: parent.id,
      reviewedBy: null,
      reviewNote: null,
      postedAt: new Date(),
    }),
  );
  await goals.save(
    goals.create({
      studentId: s1.id,
      title: '课外书',
      targetCents: 3000,
      savedCents: 0,
      status: AllowanceGoalStatus.ACTIVE,
      coverUrl: null,
    }),
  );

  const dailyAssign = await assigns.findOne({
    where: { taskId: daily.id, studentId: s1.id },
  });
  await checkins.save(
    checkins.create({
      studentId: s1.id,
      taskId: daily.id,
      assignId: dailyAssign?.id ?? null,
      planItemId: null,
      value: 20,
      note: '读了《小王子》两章',
      imageUrl: null,
      confirmStatus: ConfirmStatus.NONE,
      completedStepIds: null,
    }),
  );

  console.log('Seed done.');
  console.log('Parent: parent@demo.com / demo1234');
  console.log('Students: student1, student2 / demo1234');
  console.log('Student login codes: 小明 102938 / 小红 203847');
  console.log('Allowance: 小明 enabled, balance ¥50, goal 课外书 ¥30');
  await ds.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
