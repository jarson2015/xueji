import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { TaskAssign } from '../entities/task-assign.entity';
import { TaskStep } from '../entities/task-step.entity';
import { CheckIn } from '../entities/checkin.entity';
import { AssignStatus, ConfirmStatus, TaskCategory, TargetType, TaskSchedule, TimeSlot } from '../common/enums';
import {
  currentPeriodKey,
  isPeriodRolled,
  resolveMakeupEligibility,
} from '../task-lifecycle/lifecycle';
import {
  pickDayArchiveTargets,
  type DayArchiveCandidate,
} from '../task-lifecycle/day-archive';
import {
  resolveRotateDutyStudentId,
  sortStudentsForRotate,
} from '../task-lifecycle/rotate-fairness';
import { StudentsService } from '../students/students.service';
import { CheckinPolicyReader } from '../family/checkin-policy.reader';
import { FamilyService } from '../family/family.service';
import { AssignTaskDto, CreateTaskDto, UpdateTaskDto, ProposeTaskDto, ApproveTaskProposalDto, RejectTaskProposalDto } from './dto';
import { TASK_TEMPLATES } from './templates';
import { TaskStreakService } from './task-streak.service';
import {
  normalizeDifficultyLevel,
  suggestDifficultyUpgrade,
  difficultyLabel,
} from './task-difficulty';
import {
  formatImplementationIntention,
  normalizeIntentionFields,
} from './implementation-intention';
import { EventsGateway } from '../events/events.gateway';
import { formatDate } from '../common/date-util';
import { User } from '../entities/user.entity';
import { TaskProposal } from '../entities/task-proposal.entity';
import { PushService } from '../push/push.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task) private readonly tasks: Repository<Task>,
    @InjectRepository(TaskAssign) private readonly assigns: Repository<TaskAssign>,
    @InjectRepository(TaskStep) private readonly steps: Repository<TaskStep>,
    @InjectRepository(CheckIn) private readonly checkins: Repository<CheckIn>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(TaskProposal) private readonly proposals: Repository<TaskProposal>,
    private readonly students: StudentsService,
    private readonly streaks: TaskStreakService,
    private readonly events: EventsGateway,
    private readonly checkinPolicy: CheckinPolicyReader,
    @Optional()
    @Inject(forwardRef(() => FamilyService))
    private readonly family?: FamilyService,
    @Optional() private readonly push?: PushService,
  ) {}

  async listForParent(parentId: number) {
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    // Own tasks + tasks assigned to shared students (co-parent visibility)
    const own = await this.tasks.find({
      where: { creatorId: parentId },
      relations: ['steps', 'assigns', 'assigns.student'],
      order: { id: 'DESC' },
    });
    if (!studentIds.length) return this.withUpgradeHints(own);
    const assigned = await this.assigns.find({
      where: { studentId: In(studentIds) },
      relations: ['task', 'task.steps', 'task.assigns', 'task.assigns.student'],
    });
    const byId = new Map<number, Task>();
    for (const t of own) byId.set(t.id, t);
    for (const a of assigned) {
      if (a.task && !byId.has(a.task.id)) {
        byId.set(a.task.id, a.task);
      }
    }
    const list = [...byId.values()].sort((a, b) => b.id - a.id);
    return this.withUpgradeHints(list);
  }

  /**
   * 看板洞察用：只统计 active / requireConfirm，不拉 steps、不算 upgrade streak。
   */
  async taskActivityStatsForParent(parentId: number): Promise<{
    activeTaskCount: number;
    confirmTaskCount: number;
  }> {
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    const own = await this.tasks.find({
      where: { creatorId: parentId },
      select: ['id', 'active', 'requireConfirm'],
    });
    const byId = new Map(own.map((t) => [t.id, t]));
    if (studentIds.length) {
      const assigned = await this.assigns.find({
        where: { studentId: In(studentIds) },
        select: ['taskId'],
      });
      const missing = [
        ...new Set(
          assigned.map((a) => a.taskId).filter((id) => id && !byId.has(id)),
        ),
      ];
      if (missing.length) {
        const extra = await this.tasks.find({
          where: { id: In(missing) },
          select: ['id', 'active', 'requireConfirm'],
        });
        for (const t of extra) byId.set(t.id, t);
      }
    }
    const active = [...byId.values()].filter((t) => t.active);
    return {
      activeTaskCount: active.length,
      confirmTaskCount: active.filter((t) => t.requireConfirm).length,
    };
  }

  private async withUpgradeHints(list: Task[]) {
    return Promise.all(
      list.map(async (task) => {
        const sid = task.assigns?.[0]?.studentId;
        let upgradeHint: string | null = null;
        if (sid && task.schedule === TaskSchedule.DAILY) {
          const streak = await this.streaks.streakForTask(
            sid,
            task.id,
            task.category,
          );
          const hint = suggestDifficultyUpgrade(streak, task.difficultyLevel);
          upgradeHint = hint.suggest ? hint.message : null;
        }
        return {
          ...task,
          difficultyLabel: difficultyLabel(task.difficultyLevel),
          upgradeHint,
        };
      }),
    );
  }

  async create(parentId: number, dto: CreateTaskDto) {
    const joint = !!dto.jointComplete;
    const shared = joint ? false : (dto.sharedComplete ?? false);
    const intent = normalizeIntentionFields(dto.intentionCue, dto.intentionWhen);
    const task = await this.tasks.save(
      this.tasks.create({
        title: dto.title,
        description: dto.description ?? null,
        creatorId: parentId,
        schedule: dto.schedule,
        targetType: dto.targetType,
        targetValue: dto.targetValue,
        category: dto.category ?? TaskCategory.STUDY,
        timeSlot: dto.timeSlot ?? TimeSlot.ANYTIME,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        requireConfirm: dto.requireConfirm ?? false,
        sharedComplete: shared,
        rotateEnabled: shared && !!(dto.rotateEnabled ?? false),
        jointComplete: joint,
        pointsReward: dto.pointsReward ?? 10,
        isInterest: !!dto.isInterest,
        meaningNote: dto.meaningNote?.trim() || null,
        difficultyLevel: normalizeDifficultyLevel(dto.difficultyLevel),
        intentionCue: intent.intentionCue,
        intentionWhen: intent.intentionWhen,
        isMicroHabit: !!dto.isMicroHabit,
        active: true,
        sourceTemplateId: dto.sourceTemplateId?.trim() || null,
      }),
    );
    if (dto.steps?.length) {
      await this.steps.save(
        dto.steps.map((s, i) =>
          this.steps.create({
            taskId: task.id,
            title: s.title,
            sortOrder: s.sortOrder ?? i,
          }),
        ),
      );
    }
    if (dto.studentIds?.length) {
      await this.assign(parentId, task.id, { studentIds: dto.studentIds });
    }
    return this.findOneForParent(parentId, task.id);
  }

  async update(parentId: number, taskId: number, dto: UpdateTaskDto) {
    const task = await this.findEntity(parentId, taskId);
    const scheduleChanged =
      dto.schedule !== undefined && dto.schedule !== task.schedule;
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.schedule !== undefined) task.schedule = dto.schedule;
    if (dto.targetType !== undefined) task.targetType = dto.targetType;
    if (dto.targetValue !== undefined) task.targetValue = dto.targetValue;
    if (dto.deadline !== undefined) {
      task.deadline = dto.deadline ? new Date(dto.deadline) : null;
    }
    if (dto.requireConfirm !== undefined) task.requireConfirm = dto.requireConfirm;
    if (dto.jointComplete !== undefined) {
      task.jointComplete = !!dto.jointComplete;
      if (task.jointComplete) {
        task.sharedComplete = false;
        task.rotateEnabled = false;
      }
    }
    if (dto.sharedComplete !== undefined) {
      task.sharedComplete = dto.sharedComplete;
      if (task.sharedComplete) task.jointComplete = false;
    }
    if (dto.rotateEnabled !== undefined) {
      task.rotateEnabled = dto.rotateEnabled;
    }
    if (!task.sharedComplete) task.rotateEnabled = false;
    if (dto.intentionCue !== undefined || dto.intentionWhen !== undefined) {
      const intent = normalizeIntentionFields(
        dto.intentionCue ?? task.intentionCue,
        dto.intentionWhen ?? task.intentionWhen,
      );
      task.intentionCue = intent.intentionCue;
      task.intentionWhen = intent.intentionWhen;
    }
    if (dto.isMicroHabit !== undefined) task.isMicroHabit = !!dto.isMicroHabit;
    if (dto.pointsReward !== undefined) task.pointsReward = dto.pointsReward;
    if (dto.isInterest !== undefined) task.isInterest = !!dto.isInterest;
    if (dto.meaningNote !== undefined) {
      task.meaningNote = dto.meaningNote ? String(dto.meaningNote).trim() : null;
    }
    if (dto.difficultyLevel !== undefined) {
      task.difficultyLevel = normalizeDifficultyLevel(dto.difficultyLevel);
    }
    if (dto.category !== undefined) task.category = dto.category;
    if (dto.timeSlot !== undefined) task.timeSlot = dto.timeSlot;
    if (dto.active !== undefined) task.active = dto.active;
    if (dto.sourceTemplateId !== undefined) {
      task.sourceTemplateId = dto.sourceTemplateId
        ? String(dto.sourceTemplateId).trim()
        : null;
    }
    await this.tasks.save(task);
    if (dto.steps) {
      await this.steps.delete({ taskId });
      if (dto.steps.length) {
        await this.steps.save(
          dto.steps.map((s, i) =>
            this.steps.create({
              taskId,
              title: s.title,
              sortOrder: s.sortOrder ?? i,
            }),
          ),
        );
      }
    }
    const beforeAssignees = await this.assigns.find({ where: { taskId } });
    const beforeSet = new Set(beforeAssignees.map((a) => a.studentId));
    if (dto.studentIds !== undefined) {
      await this.syncAssignees(parentId, task, dto.studentIds);
    }
    if (scheduleChanged) {
      await this.resetIncompleteAssigns(taskId);
    }
    const remaining = await this.assigns.find({ where: { taskId } });
    const at = new Date().toISOString();
    for (const a of remaining) {
      if (!beforeSet.has(a.studentId)) continue;
      this.events.emitToStudent(a.studentId, 'task:updated', {
        taskId,
        title: task.title,
        message: `家长更新了任务：${task.title}`,
        at,
      });
    }
    return this.findOneForParent(parentId, taskId);
  }

  async remove(parentId: number, taskId: number) {
    const task = await this.findEntity(parentId, taskId);
    const assignRows = await this.assigns.find({ where: { taskId } });
    const at = new Date().toISOString();
    for (const a of assignRows) {
      this.events.emitToStudent(a.studentId, 'task:removed', {
        taskId,
        title: task.title,
        message: `家长删除了任务：${task.title}`,
        at,
      });
    }
    // Preserve checkin history; production MySQL often has no FK CASCADE
    await this.checkins
      .createQueryBuilder()
      .update(CheckIn)
      .set({ taskId: null, assignId: null })
      .where('task_id = :taskId', { taskId })
      .execute();
    if (assignRows.length) {
      await this.checkins
        .createQueryBuilder()
        .update(CheckIn)
        .set({ taskId: null, assignId: null })
        .where('assign_id IN (:...ids)', {
          ids: assignRows.map((a) => a.id),
        })
        .execute();
    }
    await this.steps.delete({ taskId });
    await this.assigns.delete({ taskId });
    await this.tasks.delete({ id: taskId });
    return { id: taskId, deleted: true };
  }

  async assign(parentId: number, taskId: number, dto: AssignTaskDto) {
    const task = await this.findEntity(parentId, taskId);
    await this.syncAssignees(parentId, task, dto.studentIds);
    return this.findOneForParent(parentId, taskId);
  }

  /**
   * Full-set assignee sync: add missing, revoke unchecked (delete assign + WS).
   */
  private async syncAssignees(
    parentId: number,
    task: Task,
    desiredIds: number[],
  ) {
    const bound = await this.students.getStudentIdsOfParent(parentId);
    const uniqueDesired = [...new Set(desiredIds)];
    for (const sid of uniqueDesired) {
      if (!bound.includes(sid)) {
        throw new ForbiddenException(`学生 ${sid} 未绑定`);
      }
    }
    const existing = await this.assigns.find({ where: { taskId: task.id } });
    const existingByStudent = new Map(
      existing.map((a) => [a.studentId, a] as const),
    );
    const desiredSet = new Set(uniqueDesired);
    const at = new Date().toISOString();
    const periodKey = currentPeriodKey(task.schedule);

    for (const a of existing) {
      if (desiredSet.has(a.studentId)) continue;
      await this.checkins
        .createQueryBuilder()
        .update(CheckIn)
        .set({ assignId: null })
        .where('assign_id = :id', { id: a.id })
        .execute();
      await this.assigns.remove(a);
      this.events.emitToStudent(a.studentId, 'task:removed', {
        taskId: task.id,
        title: task.title,
        message: `家长取消了任务：${task.title}`,
        at,
      });
    }

    for (const studentId of uniqueDesired) {
      if (existingByStudent.has(studentId)) continue;
      const saved = await this.assigns.save(
        this.assigns.create({
          taskId: task.id,
          studentId,
          progressValue: 0,
          progressPercent: 0,
          status: AssignStatus.ACTIVE,
          periodKey,
        }),
      );
      this.events.emitToStudent(studentId, 'task:assigned', {
        taskId: task.id,
        assignId: saved.id,
        title: task.title,
        message: `家长布置了新任务：${task.title}`,
        at,
      });
    }
  }

  private async resetIncompleteAssigns(taskId: number) {
    const rows = await this.assigns.find({ where: { taskId } });
    for (const a of rows) {
      if (a.status === AssignStatus.COMPLETED) continue;
      a.periodKey = null;
      a.progressValue = 0;
      a.progressPercent = 0;
      a.status = AssignStatus.ACTIVE;
      await this.assigns.save(a);
    }
  }

  async myTasks(studentId: number, makeupEnabled?: boolean) {
    const enabled =
      makeupEnabled ??
      (await this.checkinPolicy.forStudent(studentId)).makeup.enabled;
    if (!enabled) {
      await this.archiveEndedPeriodsWhenNoMakeup(studentId);
    }
    const rows = await this.assigns.find({
      where: { studentId },
      relations: ['task', 'task.steps'],
      order: { id: 'DESC' },
    });
    const rotateDuty = await this.buildRotateDutyMap(rows);
    const normalized = rows
      .filter((r) => r.task?.active)
      .map((r) =>
        this.applyMakeupGate(
          this.normalizeAssign(r, rotateDuty.get(r.taskId)),
          enabled,
        ),
      );
    return this.streaks.attachStreaks(studentId, await this.attachJointPeers(studentId, normalized));
  }

  async listArchivedForStudent(studentId: number) {
    const rows = await this.assigns.find({
      where: {
        studentId,
        status: In([
          AssignStatus.DAY_ARCHIVED,
          AssignStatus.SHARED_DONE,
          AssignStatus.CLOSED,
        ]),
      },
      relations: ['task'],
      order: { updatedAt: 'DESC' },
      take: 60,
    });
    return rows
      .filter((r) => r.task)
      .map((r) => ({
        assignId: r.id,
        taskId: r.taskId,
        title: r.task!.title,
        category: r.task!.category,
        schedule: r.task!.schedule,
        status: r.status,
        periodKey: r.periodKey,
        progressPercent: r.progressPercent,
        archivedAt: r.updatedAt,
      }));
  }

  async listArchivedForParent(parentId: number, studentId?: number) {
    const ids = await this.students.getStudentIdsOfParent(parentId);
    if (!ids.length) return [];
    const target = studentId ?? ids[0];
    if (studentId) await this.students.assertBound(parentId, studentId);
    const rows = await this.listArchivedForStudent(target);
    const nameById = new Map<number, string>();
    if (ids.length > 1) {
      const users = await this.users.find({ where: { id: In(ids) } });
      for (const u of users) nameById.set(u.id, u.name);
    }
    return rows.map((r) => ({
      ...r,
      studentId: target,
      studentName: nameById.get(target),
    }));
  }

  /** 兄妹协作：返回已完成的家人名（非排行） */
  private async attachJointPeers(studentId: number, tasks: any[]) {
    const jointTaskIds = [
      ...new Set(tasks.filter((t) => t.jointComplete).map((t) => t.taskId)),
    ];
    if (!jointTaskIds.length) return tasks;
    const allAssigns = await this.assigns.find({
      where: { taskId: In(jointTaskIds) },
      relations: ['student'],
    });
    return tasks.map((t) => {
      if (!t.jointComplete) return t;
      const peersDone = allAssigns
        .filter(
          (a) =>
            a.taskId === t.taskId &&
            a.studentId !== studentId &&
            a.progressPercent >= 100,
        )
        .map((a) => a.student?.name || '家人');
      return { ...t, jointPeersDone: peersDone };
    });
  }

  /**
   * 禁止补卡时：周期已过的未完成指派温和归档（停止催促），明天虚拟重开。
   * 惰性触发于 myTasks；豁免休息日当天、待家长确认。
   */
  async archiveEndedPeriodsWhenNoMakeup(studentId: number, now = new Date()) {
    const rows = await this.assigns.find({
      where: { studentId, status: AssignStatus.ACTIVE },
      relations: ['task'],
    });
    if (!rows.length) return { archived: 0 };

    const assignIds = rows.map((r) => r.id);
    const pending = await this.checkins.find({
      where: {
        assignId: In(assignIds),
        confirmStatus: ConfirmStatus.PENDING,
      },
      select: ['assignId'],
    });
    const pendingSet = new Set(
      pending.map((c) => c.assignId).filter((id): id is number => id != null),
    );

    const candidates: DayArchiveCandidate[] = [];
    for (const r of rows) {
      if (!r.task?.active) continue;
      let periodWasRestDay = false;
      if (
        r.task.schedule === 'daily' &&
        r.periodKey &&
        this.family
      ) {
        periodWasRestDay = await this.family.isRestDayKeyForStudent(
          studentId,
          r.periodKey,
        );
      }
      candidates.push({
        id: r.id,
        schedule: r.task.schedule,
        status: r.status,
        progressPercent: r.progressPercent,
        periodKey: r.periodKey,
        periodWasRestDay,
        hasPendingConfirm: pendingSet.has(r.id),
      });
    }

    const targets = pickDayArchiveTargets(candidates, {
      makeupEnabled: false,
      now,
    });
    if (!targets.length) return { archived: 0 };

    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const t of targets) {
      const row = byId.get(t.id);
      if (!row) continue;
      row.status = AssignStatus.DAY_ARCHIVED;
      await this.assigns.save(row);
    }
    return { archived: targets.length };
  }

  /** Batch load active assigns for many students (dashboard monitor/summary). */
  async myTasksForStudents(studentIds: number[]) {
    if (!studentIds.length) return new Map<number, any[]>();
    const policies = await this.checkinPolicy.forStudents(studentIds);
    // 读路径不做 archiveEndedPeriods（副作用留给学生 myTasks）；
    // 看板不展示 habitStreak，跳过 attachStreaks。
    const rows = await this.assigns.find({
      where: { studentId: In(studentIds) },
      relations: ['task', 'task.steps'],
      order: { id: 'DESC' },
    });
    const byStudent = new Map<number, TaskAssign[]>();
    for (const r of rows) {
      if (!r.task?.active) continue;
      const list = byStudent.get(r.studentId) || [];
      list.push(r);
      byStudent.set(r.studentId, list);
    }
    const result = new Map<number, any[]>();
    const allRows = rows.filter((r) => r.task?.active);
    const rotateDuty = await this.buildRotateDutyMap(allRows);
    for (const sid of studentIds) {
      const assigns = byStudent.get(sid) || [];
      const makeupEnabled = policies.get(sid)?.makeup.enabled ?? true;
      result.set(
        sid,
        assigns.map((r) =>
          this.applyMakeupGate(
            this.normalizeAssign(r, rotateDuty.get(r.taskId)),
            makeupEnabled,
          ),
        ),
      );
    }
    return result;
  }

  /** When family disables makeup, never advertise canMakeup in lists/UI */
  private applyMakeupGate<T extends { canMakeup?: boolean; makeupPeriodKey?: string | null }>(
    row: T,
    makeupEnabled: boolean,
  ): T {
    if (makeupEnabled) return row;
    return { ...row, canMakeup: false, makeupPeriodKey: null };
  }

  /** taskId → today's rotate duty (shared+rotate only) */
  private async buildRotateDutyMap(
    rows: TaskAssign[],
  ): Promise<
    Map<number, { dutyStudentId: number; dutyName: string }>
  > {
    const out = new Map<number, { dutyStudentId: number; dutyName: string }>();
    const rotateTaskIds = [
      ...new Set(
        rows
          .filter((r) => r.task?.sharedComplete && r.task?.rotateEnabled)
          .map((r) => r.taskId),
      ),
    ];
    if (!rotateTaskIds.length) return out;

    const allAssigns = await this.assigns.find({
      where: { taskId: In(rotateTaskIds) },
    });
    const studentIds = [...new Set(allAssigns.map((a) => a.studentId))];
    const users = studentIds.length
      ? await this.users.find({ where: { id: In(studentIds) } })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const byTask = new Map<number, number[]>();
    for (const a of allAssigns) {
      const list = byTask.get(a.taskId) || [];
      list.push(a.studentId);
      byTask.set(a.taskId, list);
    }
    const scheduleByTask = new Map<number, string>();
    for (const r of rows) {
      if (r.task) scheduleByTask.set(r.taskId, r.task.schedule);
    }
    // fill missing schedules
    const missing = rotateTaskIds.filter((id) => !scheduleByTask.has(id));
    if (missing.length) {
      const tasks = await this.tasks.find({ where: { id: In(missing) } });
      for (const t of tasks) scheduleByTask.set(t.id, t.schedule);
    }

    for (const taskId of rotateTaskIds) {
      const sids = byTask.get(taskId) || [];
      const sorted = sortStudentsForRotate(
        sids.map((id) => ({
          id,
          birthOrder: userById.get(id)?.birthOrder ?? null,
        })),
      );
      const periodKey = currentPeriodKey(
        (scheduleByTask.get(taskId) as any) || 'daily',
      );
      const dutyId = resolveRotateDutyStudentId(
        sorted.map((s) => s.id),
        periodKey,
      );
      if (dutyId == null) continue;
      out.set(taskId, {
        dutyStudentId: dutyId,
        dutyName: userById.get(dutyId)?.name || '',
      });
    }
    return out;
  }

  normalizeAssign(
    r: TaskAssign,
    rotate?: { dutyStudentId: number; dutyName: string } | null,
  ) {
    const periodKey = currentPeriodKey(r.task.schedule);
    let progressValue = r.progressValue;
    let progressPercent = r.progressPercent;
    let status = r.status;
    const storedPeriod = r.periodKey;
    const rolled = isPeriodRolled(r.task.schedule, storedPeriod);
    if (rolled) {
      progressValue = 0;
      progressPercent = 0;
      status = AssignStatus.ACTIVE;
    }
    const sharedDone = !rolled && status === AssignStatus.SHARED_DONE;
    const dayArchived = !rolled && status === AssignStatus.DAY_ARCHIVED;
    const done =
      !rolled &&
      (progressPercent >= 100 || status === AssignStatus.COMPLETED);
    const resolved = resolveMakeupEligibility({
      schedule: r.task.schedule,
      storedPeriod,
      progressPercent: r.progressPercent,
      status: r.status,
      deadline: r.task.deadline,
      done,
    });
    if (resolved.isExpired) status = AssignStatus.CLOSED;

    const rotateEnabled =
      !!r.task.sharedComplete && !!r.task.rotateEnabled;
    const rotateDutyStudentId = rotateEnabled
      ? rotate?.dutyStudentId ?? null
      : null;
    const rotateDutyName = rotateEnabled ? rotate?.dutyName || null : null;
    const isRotateDuty =
      rotateEnabled &&
      rotateDutyStudentId != null &&
      rotateDutyStudentId === r.studentId;
    const rotateSkipToday =
      rotateEnabled &&
      !done &&
      !sharedDone &&
      !dayArchived &&
      !resolved.isExpired &&
      rotateDutyStudentId != null &&
      !isRotateDuty;

    return {
      assignId: r.id,
      taskId: r.taskId,
      title: r.task.title,
      description: r.task.description,
      schedule: r.task.schedule,
      targetType: r.task.targetType,
      targetValue: r.task.targetValue,
      category: r.task.category || TaskCategory.STUDY,
      timeSlot: r.task.timeSlot || TimeSlot.ANYTIME,
      deadline: r.task.deadline,
      requireConfirm: r.task.requireConfirm,
      sharedComplete: !!r.task.sharedComplete,
      jointComplete: !!r.task.jointComplete,
      rotateEnabled,
      rotateDutyStudentId,
      rotateDutyName,
      isRotateDuty,
      rotateSkipToday,
      pointsReward: r.task.pointsReward,
      isInterest: !!r.task.isInterest,
      meaningNote: r.task.meaningNote || null,
      difficultyLevel: r.task.difficultyLevel || 'practice',
      difficultyLabel: difficultyLabel(r.task.difficultyLevel),
      intentionCue: r.task.intentionCue || null,
      intentionWhen: r.task.intentionWhen || null,
      intentionText: formatImplementationIntention(
        r.task.intentionCue,
        r.task.intentionWhen,
      ),
      isMicroHabit: !!r.task.isMicroHabit,
      sourceTemplateId: r.task.sourceTemplateId || null,
      progressValue,
      progressPercent,
      status,
      periodKey: storedPeriod,
      currentPeriodKey: periodKey,
      isExpired: resolved.isExpired,
      sharedDone,
      dayArchived,
      canMakeup: resolved.canMakeup,
      makeupPeriodKey: resolved.makeupPeriodKey,
      skipDate: r.skipDate || null,
      deferredToday: r.skipDate === formatDate(),
      steps: (r.task.steps || []).sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }

  /** Student defers one assign for today (counts toward dailySkipLimit). */
  async deferToday(studentId: number, assignId: number) {
    const assign = await this.assigns.findOne({
      where: { id: assignId, studentId },
      relations: ['task'],
    });
    if (!assign?.task?.active) throw new NotFoundException('任务不存在');
    if (assign.progressPercent >= 100) {
      throw new BadRequestException('已经完成的任务不用缓做');
    }
    const today = formatDate();
    if (assign.skipDate === today) {
      return { ...this.normalizeAssign(assign), deferredToday: true };
    }
    let limit = 1;
    if (this.family) {
      const cov = await this.family.covenantForStudent(studentId);
      limit = cov.dailySkipLimit ?? 1;
    }
    if (limit <= 0) {
      throw new BadRequestException('家庭暂未开启「今日缓做」');
    }
    const used = await this.assigns.count({
      where: { studentId, skipDate: today },
    });
    if (used >= limit) {
      throw new BadRequestException(
        `今天已经缓做 ${used} 件啦，明天再安排（每日最多 ${limit} 件）`,
      );
    }
    assign.skipDate = today;
    await this.assigns.save(assign);
    this.events.emitToParents(
      await this.students.getParentIdsOfStudent(studentId),
      'progress:changed',
      {
        assignId: assign.id,
        studentId,
        deferredToday: true,
        title: assign.task.title,
      },
    );
    return { ...this.normalizeAssign(assign), deferredToday: true };
  }

  listTemplates() {
    return TASK_TEMPLATES;
  }

  async listProposalsForParent(parentId: number) {
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    if (!studentIds.length) return [];
    return this.proposals.find({
      where: { studentId: In(studentIds), status: 'pending' },
      relations: ['student'],
      order: { id: 'DESC' },
    });
  }

  async listMyProposals(studentId: number) {
    return this.proposals.find({
      where: { studentId },
      order: { id: 'DESC' },
      take: 20,
    });
  }

  async propose(studentId: number, dto: ProposeTaskDto) {
    const title = dto.title.trim();
    if (!title) throw new BadRequestException('请写任务标题');
    const pending = await this.proposals.count({
      where: { studentId, status: 'pending' },
    });
    if (pending >= 5) {
      throw new BadRequestException('待审定的提议已经够多了，先等家长看看');
    }
    const parents = await this.students.getParentIdsOfStudent(studentId);
    if (!parents.length) throw new BadRequestException('还没有绑定家长');
    const row = await this.proposals.save(
      this.proposals.create({
        studentId,
        title,
        description: dto.description?.trim() || null,
        category: dto.category ?? TaskCategory.STUDY,
        suggestedMinutes: dto.suggestedMinutes ?? null,
        status: 'pending',
      }),
    );
    const student = await this.users.findOne({ where: { id: studentId } });
    const message = `${student?.name || '孩子'}想加一件小事，请看看是否合适`;
    this.events.emitToParents(parents, 'task:proposed', {
      proposal: row,
      studentName: student?.name || '孩子',
      message,
    });
    for (const pid of parents) {
      void this.push?.sendToUser(pid, {
        title: '任务提议',
        body: message.slice(0, 80),
        url: '/parent/monitor',
        tag: `proposal-${row.id}`,
      });
    }
    return row;
  }

  async approveProposal(
    parentId: number,
    proposalId: number,
    dto: ApproveTaskProposalDto,
  ) {
    const row = await this.proposals.findOne({
      where: { id: proposalId },
      relations: ['student'],
    });
    if (!row) throw new NotFoundException('提议不存在');
    await this.students.assertBound(parentId, row.studentId);
    if (row.status !== 'pending') {
      throw new BadRequestException('该提议已处理');
    }
    const minutes = row.suggestedMinutes;
    const targetType = minutes ? TargetType.DURATION : TargetType.ONCE;
    const targetValue = minutes || 1;
    const task = await this.create(parentId, {
      title: row.title,
      description: row.description || undefined,
      schedule: dto.schedule ?? TaskSchedule.DAILY,
      targetType,
      targetValue,
      category: row.category,
      timeSlot: TimeSlot.ANYTIME,
      requireConfirm: dto.requireConfirm ?? false,
      pointsReward: dto.pointsReward ?? 5,
      isInterest: row.category === TaskCategory.STUDY,
      meaningNote:
        row.category === TaskCategory.STUDY
          ? '这是你自己提的，好奇和投入比分数更重要'
          : undefined,
      studentIds: [row.studentId],
    });
    row.status = 'approved';
    row.parentId = parentId;
    row.approvedTaskId = task.id;
    row.resolvedAt = new Date();
    await this.proposals.save(row);
    this.events.emitToStudent(row.studentId, 'task:proposal-approved', {
      proposalId: row.id,
      taskId: task.id,
      title: row.title,
      message: `家长同意了「${row.title}」，已经加到你的任务里`,
    });
    return { proposal: row, task };
  }

  async rejectProposal(
    parentId: number,
    proposalId: number,
    dto: RejectTaskProposalDto,
  ) {
    const note = dto.note.trim();
    if (!note) throw new BadRequestException('请写一句说明，帮孩子理解');
    const row = await this.proposals.findOne({ where: { id: proposalId } });
    if (!row) throw new NotFoundException('提议不存在');
    await this.students.assertBound(parentId, row.studentId);
    if (row.status !== 'pending') {
      throw new BadRequestException('该提议已处理');
    }
    row.status = 'rejected';
    row.parentId = parentId;
    row.rejectNote = note;
    row.resolvedAt = new Date();
    await this.proposals.save(row);
    this.events.emitToStudent(row.studentId, 'task:proposal-rejected', {
      proposalId: row.id,
      title: row.title,
      note,
      message: `关于「${row.title}」：${note}`,
    });
    return row;
  }

  private async canManageTask(parentId: number, task: Task): Promise<boolean> {
    if (task.creatorId === parentId) return true;
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    if (!studentIds.length) return false;
    const hit = await this.assigns.findOne({
      where: { taskId: task.id, studentId: In(studentIds) },
    });
    return !!hit;
  }

  private async findEntity(parentId: number, taskId: number) {
    const task = await this.tasks.findOne({ where: { id: taskId } });
    if (!task || !(await this.canManageTask(parentId, task))) {
      throw new NotFoundException('任务不存在');
    }
    return task;
  }

  async findOneForParent(parentId: number, taskId: number) {
    const task = await this.tasks.findOne({
      where: { id: taskId },
      relations: ['steps', 'assigns', 'assigns.student'],
    });
    if (!task || !(await this.canManageTask(parentId, task))) {
      throw new NotFoundException('任务不存在');
    }
    return task;
  }

  async getAssign(assignId: number) {
    return this.assigns.findOne({
      where: { id: assignId },
      relations: ['task', 'task.steps', 'student'],
    });
  }

  async getAssignsByIds(ids: number[]) {
    if (!ids.length) return [];
    return this.assigns.find({
      where: { id: In(ids) },
      relations: ['task', 'task.steps'],
    });
  }
}
