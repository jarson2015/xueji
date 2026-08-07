/**
 * TasksService — assignee sync + hard delete preserves checkin history.
 */
import assert from 'assert';
import { User } from '../entities/user.entity';
import { ParentStudent } from '../entities/parent-student.entity';
import { Task } from '../entities/task.entity';
import { TaskAssign } from '../entities/task-assign.entity';
import { TaskStep } from '../entities/task-step.entity';
import { CheckIn } from '../entities/checkin.entity';
import {
  AssignStatus,
  ConfirmStatus,
  TargetType,
  TaskSchedule,
  UserRole,
} from '../common/enums';
import { TasksService } from './tasks.service';
import { createSqliteMemory, runTests, test } from '../test/sqlite-memory';

async function main() {
  const ds = await createSqliteMemory();
  const users = ds.getRepository(User);
  const links = ds.getRepository(ParentStudent);
  const tasks = ds.getRepository(Task);
  const assigns = ds.getRepository(TaskAssign);
  const steps = ds.getRepository(TaskStep);
  const checkins = ds.getRepository(CheckIn);

  const parent = await users.save(
    users.create({
      username: 'p_task_edit',
      passwordHash: 'x',
      name: 'Parent',
      role: UserRole.PARENT,
    }),
  );
  const s1 = await users.save(
    users.create({
      username: 's1_task_edit',
      passwordHash: 'x',
      name: 'KidA',
      role: UserRole.STUDENT,
    }),
  );
  const s2 = await users.save(
    users.create({
      username: 's2_task_edit',
      passwordHash: 'x',
      name: 'KidB',
      role: UserRole.STUDENT,
    }),
  );
  await links.save([
    links.create({ parentId: parent.id, studentId: s1.id }),
    links.create({ parentId: parent.id, studentId: s2.id }),
  ]);

  const emitted: Array<{ studentId: number; event: string; data: any }> = [];
  const events = {
    emitToStudent(studentId: number, event: string, data: any) {
      emitted.push({ studentId, event, data });
    },
    emitToParents() {},
  };

  const students = {
    getStudentIdsOfParent: async (parentId: number) => {
      const rows = await links.find({ where: { parentId } });
      return rows.map((r) => r.studentId);
    },
  };

  const streaks = {
    attachStreaks: async (_sid: number, rows: any[]) => rows,
  };

  const checkinPolicy = {
    forStudent: async () => ({
      makeup: { enabled: true },
      edu: {},
      rest: {},
    }),
    forStudents: async () => new Map(),
  };

  const proposals = {
    find: async () => [],
    findOne: async () => null,
    save: async (row: any) => row,
    create: (row: any) => row,
  };

  const service = new TasksService(
    tasks,
    assigns,
    steps,
    checkins,
    users,
    proposals as any,
    students as any,
    streaks as any,
    events as any,
    checkinPolicy as any,
  );

  await runTests('tasks.service integration', [
    test('update studentIds adds and revokes assigns with WS', async () => {
      emitted.length = 0;
      const created = await service.create(parent.id, {
        title: '阅读',
        schedule: TaskSchedule.DAILY,
        targetType: TargetType.ONCE,
        targetValue: 1,
        studentIds: [s1.id, s2.id],
      });
      assert.strictEqual(created.assigns?.length, 2);
      assert.ok(emitted.some((e) => e.event === 'task:assigned' && e.studentId === s1.id));
      assert.ok(emitted.some((e) => e.event === 'task:assigned' && e.studentId === s2.id));

      emitted.length = 0;
      const updated = await service.update(parent.id, created.id, {
        title: '阅读30分钟',
        studentIds: [s1.id],
      });
      assert.strictEqual(updated.assigns?.length, 1);
      assert.strictEqual(updated.assigns[0].studentId, s1.id);
      assert.strictEqual(updated.title, '阅读30分钟');
      assert.ok(
        emitted.some(
          (e) =>
            e.event === 'task:removed' &&
            e.studentId === s2.id &&
            e.data?.taskId === created.id,
        ),
      );
      assert.ok(
        emitted.some(
          (e) =>
            e.event === 'task:updated' &&
            e.studentId === s1.id &&
            e.data?.taskId === created.id,
        ),
      );

      const s2Assigns = await assigns.find({
        where: { taskId: created.id, studentId: s2.id },
      });
      assert.strictEqual(s2Assigns.length, 0);
    }),

    test('assign endpoint full-sync revokes unchecked students', async () => {
      emitted.length = 0;
      const created = await service.create(parent.id, {
        title: '家务',
        schedule: TaskSchedule.DAILY,
        targetType: TargetType.ONCE,
        targetValue: 1,
        studentIds: [s1.id],
      });
      await service.assign(parent.id, created.id, { studentIds: [s1.id, s2.id] });
      let rows = await assigns.find({ where: { taskId: created.id } });
      assert.strictEqual(rows.length, 2);

      emitted.length = 0;
      await service.assign(parent.id, created.id, { studentIds: [s2.id] });
      rows = await assigns.find({ where: { taskId: created.id } });
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].studentId, s2.id);
      assert.ok(
        emitted.some((e) => e.event === 'task:removed' && e.studentId === s1.id),
      );
    }),

    test('remove hard-deletes task and nulls checkin FKs', async () => {
      emitted.length = 0;
      const created = await service.create(parent.id, {
        title: '待删',
        schedule: TaskSchedule.ONCE,
        targetType: TargetType.ONCE,
        targetValue: 1,
        steps: [{ title: '一步', sortOrder: 0 }],
        studentIds: [s1.id],
      });
      const assign = await assigns.findOneByOrFail({
        taskId: created.id,
        studentId: s1.id,
      });
      const checkin = await checkins.save(
        checkins.create({
          studentId: s1.id,
          taskId: created.id,
          assignId: assign.id,
          value: 1,
          confirmStatus: ConfirmStatus.NONE,
          note: 'keep me',
        }),
      );

      const result = await service.remove(parent.id, created.id);
      assert.deepStrictEqual(result, { id: created.id, deleted: true });

      assert.strictEqual(await tasks.findOneBy({ id: created.id }), null);
      assert.strictEqual(
        (await assigns.find({ where: { taskId: created.id } })).length,
        0,
      );
      assert.strictEqual(
        (await steps.find({ where: { taskId: created.id } })).length,
        0,
      );

      const kept = await checkins.findOneByOrFail({ id: checkin.id });
      assert.strictEqual(kept.taskId, null);
      assert.strictEqual(kept.assignId, null);
      assert.strictEqual(kept.note, 'keep me');
      assert.ok(
        emitted.some(
          (e) =>
            e.event === 'task:removed' &&
            e.studentId === s1.id &&
            e.data?.taskId === created.id,
        ),
      );
    }),

    test('schedule change resets incomplete assign progress', async () => {
      const created = await service.create(parent.id, {
        title: '周期',
        schedule: TaskSchedule.DAILY,
        targetType: TargetType.COUNT,
        targetValue: 3,
        studentIds: [s1.id],
      });
      const assign = await assigns.findOneByOrFail({
        taskId: created.id,
        studentId: s1.id,
      });
      assign.progressValue = 2;
      assign.progressPercent = 66;
      assign.periodKey = '2026-07-10';
      assign.status = AssignStatus.ACTIVE;
      await assigns.save(assign);

      await service.update(parent.id, created.id, {
        schedule: TaskSchedule.WEEKLY,
        studentIds: [s1.id],
      });
      const after = await assigns.findOneByOrFail({ id: assign.id });
      assert.strictEqual(after.progressValue, 0);
      assert.strictEqual(after.progressPercent, 0);
      assert.strictEqual(after.periodKey, null);
      assert.strictEqual(after.status, AssignStatus.ACTIVE);
    }),

    test('create stores sourceTemplateId for eq filter', async () => {
      const created = await service.create(parent.id, {
        title: '说出今天的心情',
        schedule: TaskSchedule.DAILY,
        targetType: TargetType.ONCE,
        targetValue: 1,
        sourceTemplateId: 'eq-mood',
        studentIds: [s1.id],
      });
      assert.strictEqual(created.sourceTemplateId, 'eq-mood');
    }),

    test('co-parent can update task assigned to shared student', async () => {
      const co = await users.save(
        users.create({
          username: 'p_coparent_edit',
          passwordHash: 'x',
          name: 'CoParent',
          role: UserRole.PARENT,
        }),
      );
      await links.save(links.create({ parentId: co.id, studentId: s1.id }));

      const created = await service.create(parent.id, {
        title: '共养可改',
        schedule: TaskSchedule.DAILY,
        targetType: TargetType.ONCE,
        targetValue: 1,
        studentIds: [s1.id],
      });

      const updated = await service.update(co.id, created.id, {
        title: '共养已改',
        studentIds: [s1.id],
      });
      assert.strictEqual(updated.title, '共养已改');
      assert.strictEqual(updated.creatorId, parent.id);
    }),
  ]);

  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
