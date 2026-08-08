import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CheckIn } from '../entities/checkin.entity';
import { TaskAssign } from '../entities/task-assign.entity';
import { User } from '../entities/user.entity';
import { PlanItem } from '../entities/plan-item.entity';
import { PointLedger } from '../entities/point-ledger.entity';
import {
  AssignStatus,
  ConfirmStatus,
  PointReason,
  TargetType,
  TaskSchedule,
} from '../common/enums';
import { calcPercent } from '../common/date-util';
import {
  calcMakeupPoints,
  currentPeriodKey,
  isExpiredOnceTask,
  isMakeupWithinWindow,
  resolveMakeupPeriodKey,
  shouldAwardPointsNow,
  shouldBlockNormalCheckinForExpiry,
  pickReflectionPrompt,
  buildGrowthHint,
} from '../task-lifecycle/lifecycle';
import { pickSharedDoneTargets } from '../task-lifecycle/shared-complete';
import { StudentsService } from '../students/students.service';
import { EventsGateway } from '../events/events.gateway';
import { ProgressExtrasService } from '../common/progress-extras.service';
import { TaskStreakService } from '../tasks/task-streak.service';
import { CheckinPolicyReader } from '../family/checkin-policy.reader';
import { AuditService } from '../family/audit.service';
import { PointsLedgerService } from '../points/points-ledger.service';
import { GrowthService } from '../growth/growth.service';
import { PushService } from '../push/push.service';
import { CreateCheckInDto, ConfirmCheckInDto, BatchConfirmCheckInDto } from './dto';
import { isValidMoodTag, buildRepairMessage } from '../common/mood-policy';
import { requireSafeUploadPath } from '../common/upload-url';
import { HABIT_RHYTHM_TARGET } from '../common/habit-rhythm';

const STREAK_BONUS_POINTS = 5;

@Injectable()
export class CheckinsService {
  constructor(
    @InjectRepository(CheckIn) private readonly checkins: Repository<CheckIn>,
    @InjectRepository(TaskAssign) private readonly assigns: Repository<TaskAssign>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(PlanItem) private readonly planItems: Repository<PlanItem>,
    @InjectRepository(PointLedger) private readonly ledgers: Repository<PointLedger>,
    private readonly students: StudentsService,
    private readonly events: EventsGateway,
    private readonly dataSource: DataSource,
    private readonly extras: ProgressExtrasService,
    private readonly streaks: TaskStreakService,
    private readonly checkinPolicy: CheckinPolicyReader,
    private readonly audit: AuditService,
    private readonly ledger: PointsLedgerService,
    @Optional()
    @Inject(forwardRef(() => GrowthService))
    private readonly growth?: GrowthService,
    @Optional() private readonly push?: PushService,
  ) {}

  async create(studentId: number, dto: CreateCheckInDto) {
    if (!dto.assignId && !dto.planItemId) {
      throw new BadRequestException('需要 assignId 或 planItemId');
    }

    const clientId = dto.clientId?.trim() || null;
    if (clientId) {
      const dup = await this.checkins.findOne({ where: { clientId } });
      if (dup && dup.studentId === studentId) {
        const policy = await this.checkinPolicy.forStudent(studentId);
        const user = await this.users.findOne({ where: { id: studentId } });
        const balance = user?.pointsBalance ?? 0;
        const streak = await this.extras.streak(studentId);
        const nextWish = await this.extras.nextWish(studentId, balance);
        return {
          id: dup.id,
          confirmStatus: dup.confirmStatus,
          pointsAwarded: 0,
          pointsBalance: balance,
          streak,
          nextWish,
          requireConfirm: dup.confirmStatus === ConfirmStatus.PENDING,
          isMakeup: dup.isMakeup,
          makeupPoints: null,
          rewardSkipped: false,
          rewardMode: policy.edu.rewardMode,
          ageBand: policy.edu.ageBand,
          intrinsicMode: policy.edu.intrinsicMode,
          reflectionPrompt: null,
          growthHint: '',
          isInterest: false,
          meaningNote: null,
          message: '这份打卡已经同步成功啦',
          duplicate: true,
        };
      }
    }

    const isMakeup = !!dto.isMakeup;
    const policy = await this.checkinPolicy.forStudent(studentId);
    const makeupCfg = isMakeup ? policy.makeup : null;
    if (isMakeup && makeupCfg && !makeupCfg.enabled) {
      throw new BadRequestException('家庭暂未开启「补上进度」');
    }
    const edu = policy.edu;

    return this.dataSource.transaction(async (manager) => {
      let assign: TaskAssign | null = null;
      let planItem: PlanItem | null = null;
      let taskId: number | null = null;
      let requireConfirm = false;
      let pointsReward = 5;
      let makeupPeriodKey: string | null = null;
      let effectivePoints = pointsReward;
      let pointReason = PointReason.CHECKIN;

      if (dto.assignId) {
        assign = await manager.findOne(TaskAssign, {
          where: { id: dto.assignId },
          relations: ['task'],
        });
        if (!assign || assign.studentId !== studentId) {
          throw new NotFoundException('任务指派不存在');
        }
        taskId = assign.taskId;
        requireConfirm = assign.task.requireConfirm;
        pointsReward = assign.task.pointsReward;
        effectivePoints = pointsReward;

        const expired = isExpiredOnceTask(
          assign.task.schedule,
          assign.task.deadline,
        );
        const currentKey = currentPeriodKey(assign.task.schedule);

        if (isMakeup) {
          makeupPeriodKey = resolveMakeupPeriodKey(
            assign.task.schedule,
            dto.makeupPeriodKey,
            expired,
            {
              storedPeriod: assign.periodKey,
              currentKey,
            },
          );
          if (!makeupPeriodKey) {
            throw new BadRequestException('没有可补的周期，或请指定补上进度的日期');
          }
          if (assign.task.schedule === 'once') {
            if (!expired) {
              throw new BadRequestException('任务尚未过期，请直接打卡');
            }
            if (
              assign.status === AssignStatus.COMPLETED &&
              assign.progressPercent >= 100
            ) {
              throw new BadRequestException('任务已经完成啦');
            }
          } else {
            if (makeupPeriodKey === currentKey) {
              throw new BadRequestException('当前周期请直接打卡，不用申请补上进度');
            }
            if (!isMakeupWithinWindow(makeupPeriodKey, makeupCfg!.windowDays)) {
              throw new BadRequestException(
                `只能补最近 ${makeupCfg!.windowDays} 天内的进度`,
              );
            }
          }
          const dup = await manager.findOne(CheckIn, {
            where: {
              assignId: assign.id,
              isMakeup: true,
              makeupPeriodKey,
              confirmStatus: In([ConfirmStatus.NONE, ConfirmStatus.APPROVED, ConfirmStatus.PENDING]),
            },
          });
          if (dup) {
            throw new BadRequestException('这一期已经申请过补上进度啦');
          }
          effectivePoints = calcMakeupPoints(
            pointsReward,
            makeupCfg!.discountPercent,
          );
          pointReason = PointReason.MAKEUP;
          // Makeup always needs parent look (gentle gate)
          requireConfirm = true;
        } else if (
          shouldBlockNormalCheckinForExpiry(
            assign.task.schedule,
            assign.task.deadline,
            false,
          )
        ) {
          throw new BadRequestException(
            '约定时间已过，可以申请「补上进度」拿部分积分',
          );
        }
      }

      if (dto.planItemId) {
        if (isMakeup) {
          throw new BadRequestException('计划项暂不支持补上进度');
        }
        planItem = await manager.findOne(PlanItem, {
          where: { id: dto.planItemId },
          relations: ['plan', 'task'],
        });
        if (!planItem || planItem.plan.studentId !== studentId) {
          throw new NotFoundException('计划项不存在');
        }
        if (planItem.done) {
          throw new BadRequestException('这件计划已经完成啦');
        }
      }

      const imageUrlStored = dto.imageUrl
        ? requireSafeUploadPath(dto.imageUrl, '图片地址无效，请先上传凭证')
        : null;
      if (dto.moodTag && !isValidMoodTag(dto.moodTag)) {
        throw new BadRequestException('情绪标签无效');
      }

      const value = dto.value ?? 1;
      const confirmStatus = requireConfirm
        ? ConfirmStatus.PENDING
        : ConfirmStatus.NONE;

      const focusPart = dto.focusReflection?.trim() || '';
      const reflectPart = dto.reflection?.trim() || '';
      const reflectionText =
        [focusPart, reflectPart].filter(Boolean).join(' · ') || null;
      const reflectionPromptStored =
        reflectionText && dto.reflectionPrompt?.trim()
          ? dto.reflectionPrompt.trim().slice(0, 120)
          : reflectionText
            ? focusPart && !reflectPart
              ? '专注完感觉怎样？'
              : pickReflectionPrompt(edu.ageBand || 'general', Date.now())
            : null;

      const checkin = await manager.save(
        manager.create(CheckIn, {
          studentId,
          taskId,
          assignId: assign?.id ?? null,
          planItemId: planItem?.id ?? null,
          value,
          note: dto.note ?? null,
          reflectionText,
          reflectionPrompt: reflectionPromptStored,
          moodTag: dto.moodTag && isValidMoodTag(dto.moodTag) ? dto.moodTag : null,
          imageUrl: imageUrlStored,
          confirmStatus,
          completedStepIds: dto.completedStepIds ?? null,
          isMakeup,
          makeupPeriodKey,
          clientId,
          usedFocus: !!dto.usedFocus,
        }),
      );

      let progressPayload: any = null;
      let pointsAwarded = 0;
      let rewardSkipped = false;

      if (assign && !requireConfirm) {
        const awardNow = shouldAwardPointsNow(edu.rewardMode);
        let pts = awardNow ? effectivePoints : 0;
        if (!awardNow && effectivePoints > 0) {
          rewardSkipped = true;
          if (edu.rewardMode === 'weekly_digest') {
            await this.ledger.recordPendingDigest(
              manager,
              studentId,
              effectivePoints,
              checkin.id,
              assign.task.title,
            );
          }
        }
        progressPayload = await this.applyProgress(
          manager,
          assign,
          value,
          pts,
          checkin.id,
          { isMakeup: false, pointReason },
        );
        pointsAwarded = progressPayload?.pointsAwarded || 0;
      }

      if (planItem && !requireConfirm) {
        if (!planItem.done) {
          planItem.done = true;
          await manager.save(planItem);
          if (!assign) {
            const awardNow = shouldAwardPointsNow(edu.rewardMode);
            if (awardNow) {
              await this.ledger.credit(manager, {
                studentId,
                amount: pointsReward,
                reason: PointReason.CHECKIN,
                refId: checkin.id,
                note: '完成计划',
              });
              pointsAwarded = pointsReward;
            } else {
              rewardSkipped = true;
              if (edu.rewardMode === 'weekly_digest' && pointsReward > 0) {
                await this.ledger.recordPendingDigest(
                  manager,
                  studentId,
                  pointsReward,
                  checkin.id,
                  '完成计划',
                );
              }
            }
          }
        }
      }

      const parentIds = await this.students.getParentIdsOfStudent(studentId);
      let student = await manager.findOne(User, { where: { id: studentId } });
      const taskTitle =
        assign?.task?.title ||
        (planItem
          ? planItem.customTitle || planItem.task?.title || '计划项'
          : '计划完成');
      const payload = {
        checkin: {
          id: checkin.id,
          studentId,
          studentName: student?.name,
          taskId,
          assignId: assign?.id ?? null,
          planItemId: checkin.planItemId,
          taskTitle,
          note: checkin.note
            ? String(checkin.note).slice(0, 120)
            : checkin.note,
          // WS 不推图片 URL；列表靠 soft/ETag 补全
          imageUrl: null,
          hasImage: !!checkin.imageUrl,
          confirmStatus: checkin.confirmStatus,
          isMakeup,
          createdAt: checkin.createdAt,
        },
        progress: progressPayload,
      };
      this.events.emitToParents(parentIds, 'checkin:created', payload);
      if (progressPayload) {
        this.events.emitToParents(parentIds, 'progress:changed', progressPayload);
      }
      if (requireConfirm && parentIds.length) {
        const who = student?.name || '孩子';
        const body = isMakeup
          ? `${who}补上了「${taskTitle}」，请看一眼`
          : `${who}完成了「${taskTitle}」，请看一眼`;
        for (const pid of parentIds) {
          void this.push?.sendToUser(pid, {
            title: '待确认',
            body: body.slice(0, 80),
            url: '/parent/monitor',
            tag: `checkin-${checkin.id}`,
          });
        }
      }

      const balance = student?.pointsBalance ?? 0;
      const streak = await this.extras.streak(studentId);
      const nextWish = await this.extras.nextWish(studentId, balance);

      let message = '已记录进度，继续加油';
      if (isMakeup) {
        message = `补上进度已提交，家长确认后约拿 ${effectivePoints} 分（原 ${pointsReward} 的 ${makeupCfg!.discountPercent}%）`;
      } else if (requireConfirm) {
        message = '你已经认真做完了，等家长看一眼就好';
      } else if (pointsAwarded > 0) {
        message = '这件事你做到了，这比分数更重要';
      } else if (rewardSkipped) {
        message =
          edu.rewardMode === 'weekly_digest'
            ? '完成啦！本周积分会在周报里一起结算'
            : '完成啦！这次先记一笔，积分有时会惊喜出现';
      }

      const reflectionPrompt =
        edu.reflectionEnabled && !isMakeup
          ? pickReflectionPrompt(edu.ageBand || 'general', checkin.id)
          : null;

      const growthHint = buildGrowthHint({
        ageBand: edu.ageBand || 'general',
        isMakeup,
        requireConfirm,
        rewardSkipped,
        streak,
        usedFocus: !!dto.usedFocus,
        isInterest: !!assign?.task?.isInterest,
      });

      if (assign?.task?.isInterest && !isMakeup) {
        message = requireConfirm
          ? '兴趣探索已交给家长看一眼'
          : '兴趣探索完成啦，好奇本身就很珍贵';
      }

      return {
        id: checkin.id,
        confirmStatus: checkin.confirmStatus,
        pointsAwarded: requireConfirm ? 0 : pointsAwarded,
        pointsBalance: balance,
        streak,
        nextWish,
        requireConfirm,
        isMakeup,
        makeupPoints: isMakeup ? effectivePoints : null,
        rewardSkipped,
        rewardMode: edu.rewardMode,
        ageBand: edu.ageBand,
        intrinsicMode: edu.intrinsicMode,
        reflectionPrompt,
        growthHint,
        isInterest: !!assign?.task?.isInterest,
        meaningNote: assign?.task?.meaningNote || null,
        message,
      };
    });
  }

  private async applyProgress(
    manager: any,
    assign: TaskAssign,
    value: number,
    pointsReward: number,
    checkinId: number,
    opts?: {
      isMakeup?: boolean;
      makeupPeriodKey?: string | null;
      pointReason?: PointReason;
      skipStreak?: boolean;
    },
  ) {
    let awarded = 0;
    const isMakeup = !!opts?.isMakeup;
    const pointReason = opts?.pointReason || PointReason.CHECKIN;
    const periodKey =
      isMakeup && opts?.makeupPeriodKey
        ? opts.makeupPeriodKey
        : currentPeriodKey(assign.task.schedule);

    if (!isMakeup) {
      if (assign.task.schedule !== 'once' && assign.periodKey !== periodKey) {
        assign.progressValue = 0;
        assign.progressPercent = 0;
        assign.status = AssignStatus.ACTIVE;
        assign.periodKey = periodKey;
      } else if (!assign.periodKey) {
        assign.periodKey = periodKey;
      }
    } else {
      // Makeup completes the missed period without resetting current period display
      assign.periodKey = periodKey;
    }

    // Already completed this period: record checkin but do not re-award
    if (
      assign.status === AssignStatus.COMPLETED &&
      (assign.task.schedule === 'once' || assign.periodKey === periodKey) &&
      !isMakeup
    ) {
      await manager.save(assign);
      return {
        assignId: assign.id,
        taskId: assign.taskId,
        studentId: assign.studentId,
        progressValue: assign.progressValue,
        progressPercent: assign.progressPercent,
        status: assign.status,
        pointsAwarded: 0,
      };
    }

    let add = value;
    if (assign.task.targetType === TargetType.ONCE || isMakeup) {
      add = assign.task.targetValue || 1;
      assign.progressValue = add;
    } else {
      assign.progressValue = Number(assign.progressValue) + add;
    }
    assign.progressPercent = calcPercent(
      assign.progressValue,
      assign.task.targetValue,
    );
    if (assign.progressPercent >= 100) {
      const wasIncomplete = assign.status !== AssignStatus.COMPLETED;
      assign.status = AssignStatus.COMPLETED;
      assign.progressPercent = 100;
      if (wasIncomplete || isMakeup) {
        const note = isMakeup
          ? `补上进度: ${assign.task.title}`
          : `完成任务: ${assign.task.title}`;
        await this.ledger.credit(manager, {
          studentId: assign.studentId,
          amount: pointsReward,
          reason: pointReason,
          refId: checkinId,
          note,
        });
        awarded = pointsReward;

        if (
          !isMakeup &&
          !opts?.skipStreak &&
          assign.task.schedule === TaskSchedule.DAILY
        ) {
          const rhythm = await this.streaks.rhythmForTask(
            assign.studentId,
            assign.taskId,
            manager,
          );
          if (rhythm.doneDays >= HABIT_RHYTHM_TARGET) {
            const streakNote = `本周节奏${rhythm.doneDays}/${rhythm.windowDays}: ${assign.task.title}`;
            const existed = await manager.findOne(PointLedger, {
              where: {
                studentId: assign.studentId,
                reason: PointReason.STREAK,
                note: streakNote,
              },
            });
            if (!existed) {
              await this.ledger.credit(manager, {
                studentId: assign.studentId,
                amount: STREAK_BONUS_POINTS,
                reason: PointReason.STREAK,
                refId: checkinId,
                note: streakNote,
              });
              awarded += STREAK_BONUS_POINTS;
            }
          }
        }
      }
    }
    await manager.save(assign);

    let sharedArchived: number[] = [];
    if (
      !isMakeup &&
      assign.task.sharedComplete &&
      assign.progressPercent >= 100 &&
      assign.status === AssignStatus.COMPLETED
    ) {
      sharedArchived = await this.archiveSharedSiblings(
        manager,
        assign,
        periodKey,
      );
    }

    return {
      assignId: assign.id,
      taskId: assign.taskId,
      studentId: assign.studentId,
      progressValue: assign.progressValue,
      progressPercent: assign.progressPercent,
      status: assign.status,
      pointsAwarded: awarded,
      sharedArchivedStudentIds: sharedArchived,
    };
  }

  /** 共享完成：归档同任务其他未完成指派，并通知学生 */
  private async archiveSharedSiblings(
    manager: any,
    completer: TaskAssign,
    periodKey: string,
  ): Promise<number[]> {
    const siblings: TaskAssign[] = await manager.find(TaskAssign, {
      where: { taskId: completer.taskId },
    });
    const targets = pickSharedDoneTargets(
      siblings.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        status: s.status,
        progressPercent: s.progressPercent,
        periodKey: s.periodKey,
      })),
      completer.id,
      periodKey,
    );
    const archivedIds: number[] = [];
    for (const t of targets) {
      const row = siblings.find((s) => s.id === t.id);
      if (!row) continue;
      row.status = AssignStatus.SHARED_DONE;
      row.periodKey = periodKey;
      await manager.save(row);
      archivedIds.push(row.studentId);
      this.events.emitToStudent(row.studentId, 'task:updated', {
        taskId: completer.taskId,
        assignId: row.id,
        status: AssignStatus.SHARED_DONE,
        sharedDone: true,
        message: '这件已有家人完成，你今天可以先歇一歇',
      });
    }
    return archivedIds;
  }

  /**
   * Settle pending weekly_digest points for a student (idempotent).
   * Called from weekly report / student today / weekend cron.
   */
  async settleWeeklyDigest(studentId: number): Promise<{
    settled: number;
    points: number;
  }> {
    return this.ledger.settleWeeklyDigest(studentId);
  }

  /** 家长名下所有孩子周汇总结算（幂等） */
  async settleWeeklyDigestForParent(parentId: number): Promise<{
    students: number;
    settled: number;
    points: number;
  }> {
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    let settled = 0;
    let points = 0;
    for (const sid of studentIds) {
      const r = await this.ledger.settleWeeklyDigest(sid);
      settled += r.settled;
      points += r.points;
    }
    return { students: studentIds.length, settled, points };
  }

  async confirm(
    parentId: number,
    checkinId: number,
    dto: ConfirmCheckInDto,
    actorName?: string,
    opts?: {
      /** Batch path already verified parent↔student binding */
      skipBoundCheck?: boolean;
      /** Preloaded policy from CheckinPolicyReader.forStudents */
      policy?: Awaited<ReturnType<CheckinPolicyReader['forStudent']>>;
    },
  ) {
    if (dto.action === 'reject' && !dto.note?.trim()) {
      throw new BadRequestException('请写一句给孩子，沟通更顺畅');
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const checkin = await manager.findOne(CheckIn, {
        where: { id: checkinId },
        relations: ['task'],
      });
      if (!checkin) throw new NotFoundException('打卡不存在');
      if (!opts?.skipBoundCheck) {
        await this.students.assertBound(parentId, checkin.studentId);
      }
      if (checkin.confirmStatus !== ConfirmStatus.PENDING) {
        throw new BadRequestException('该打卡无需确认或已处理');
      }

      const parentComment = dto.note?.trim() || null;

      if (dto.action === 'reject') {
        checkin.confirmStatus = ConfirmStatus.REJECTED;
        checkin.parentLiked = false;
        checkin.parentComment = parentComment;
        if (parentComment) {
          const tip = `[家长说] ${parentComment}`;
          checkin.note = checkin.note ? `${checkin.note}\n${tip}` : tip;
        }
        await manager.save(checkin);
        return {
          checkin,
          progressPayload: null as any,
          pointsAwarded: 0,
          liked: false,
        };
      }

      checkin.confirmStatus = ConfirmStatus.APPROVED;
      checkin.parentLiked = dto.liked !== false;
      checkin.parentComment = parentComment;
      await manager.save(checkin);

      let progressPayload: any = null;
      if (checkin.assignId) {
        const assign = await manager.findOne(TaskAssign, {
          where: { id: checkin.assignId },
          relations: ['task'],
        });
        if (assign) {
          let pts = assign.task.pointsReward;
          let reason = PointReason.CHECKIN;
          let rewardSkipped = false;
          const policy =
            opts?.policy ||
            (await this.checkinPolicy.forStudent(checkin.studentId));
          if (checkin.isMakeup) {
            pts = calcMakeupPoints(
              assign.task.pointsReward,
              policy.makeup.discountPercent,
            );
            reason = PointReason.MAKEUP;
          } else {
            const edu = policy.edu;
            if (!shouldAwardPointsNow(edu.rewardMode)) {
              // Still complete progress; defer or skip points per family strategy
              if (edu.rewardMode === 'weekly_digest' && pts > 0) {
                await this.ledger.recordPendingDigest(
                  manager,
                  checkin.studentId,
                  pts,
                  checkin.id,
                  assign.task.title,
                );
              }
              rewardSkipped = pts > 0;
              pts = 0;
            }
          }
          progressPayload = await this.applyProgress(
            manager,
            assign,
            checkin.value,
            pts,
            checkin.id,
            {
              isMakeup: !!checkin.isMakeup,
              makeupPeriodKey: checkin.makeupPeriodKey,
              pointReason: reason,
              skipStreak: !!checkin.isMakeup,
            },
          );
          if (rewardSkipped && progressPayload) {
            progressPayload.rewardSkipped = true;
          }
        }
      }
      if (checkin.planItemId) {
        const item = await manager.findOne(PlanItem, {
          where: { id: checkin.planItemId },
        });
        if (item) {
          item.done = true;
          await manager.save(item);
        }
      }

      return {
        checkin,
        progressPayload,
        pointsAwarded: progressPayload?.pointsAwarded || 0,
        liked: checkin.parentLiked,
        rewardSkipped: !!progressPayload?.rewardSkipped,
      };
    });

    const parentIds = await this.students.getParentIdsOfStudent(
      result.checkin.studentId,
    );
    const taskTitle =
      result.checkin.task?.title ||
      (result.checkin.planItemId ? '计划完成' : '完成记录');
    if (result.progressPayload) {
      this.events.emitToParents(parentIds, 'progress:changed', result.progressPayload);
    }

    this.events.emitToParents(parentIds, 'checkin:reviewed', {
      checkinId: result.checkin.id,
      studentId: result.checkin.studentId,
      assignId: result.checkin.assignId,
      planItemId: result.checkin.planItemId,
      taskTitle,
      action: dto.action,
      confirmStatus: result.checkin.confirmStatus,
      isMakeup: !!result.checkin.isMakeup,
      at: result.checkin.createdAt,
      progress: result.progressPayload,
    });

    const liked = result.liked && dto.action === 'approve';
    const comment = result.checkin.parentComment;
    const skipped = !!result.rewardSkipped;
    let message =
      dto.action === 'approve'
        ? result.checkin.isMakeup
          ? liked
            ? '补上进度已通过并点赞，部分积分已到账'
            : '补上进度已通过，部分积分已到账'
          : skipped
            ? liked
              ? '家长为你点赞啦，积分会在本周报告里一起结算'
              : '家长已通过，积分会在本周报告里一起结算'
            : liked
              ? '家长为你点赞啦，积分已到账'
              : '家长已通过，积分已到账'
        : buildRepairMessage(comment);
    if (dto.action === 'reject' && comment) {
      message = `家长想和你再商量：「${comment}」`;
    } else if (dto.action === 'approve' && comment) {
      message = `${message}：「${comment}」`;
    }

    this.events.emitToStudent(result.checkin.studentId, 'checkin:confirmed', {
      checkinId: result.checkin.id,
      action: dto.action,
      liked,
      parentComment: comment,
      pointsAwarded: result.pointsAwarded,
      taskTitle,
      message,
      assignId: result.checkin.assignId,
      isMakeup: !!result.checkin.isMakeup,
    });

    // Co-parent sync for reject / makeup approve
    if (dto.action === 'reject' || result.checkin.isMakeup) {
      void this.audit.notifyCoParents({
        actorId: parentId,
        actorName,
        studentId: result.checkin.studentId,
        action: dto.action === 'reject' ? 'checkin_reject' : 'makeup_approve',
        message:
          dto.action === 'reject'
            ? `${actorName || '家长'}请孩子再改改「${taskTitle}」`
            : `${actorName || '家长'}通过了「${taskTitle}」的补上进度`,
        detail: { checkinId: result.checkin.id, note: comment },
      });
    } else {
      void this.audit.record({
        actorId: parentId,
        actorName,
        action: 'checkin_approve',
        targetType: 'checkin',
        targetId: result.checkin.id,
        studentId: result.checkin.studentId,
        detail: { liked, note: comment },
      });
    }

    if (
      dto.action === 'approve' &&
      result.checkin.taskId &&
      this.growth
    ) {
      const habitStreak = await this.streaks.streakForTask(
        result.checkin.studentId,
        result.checkin.taskId,
      );
      const rhythm = await this.streaks.rhythmForTask(
        result.checkin.studentId,
        result.checkin.taskId,
      );
      void this.growth.maybeAutoMilestone({
        studentId: result.checkin.studentId,
        taskId: result.checkin.taskId,
        taskTitle: taskTitle || '任务',
        habitStreak,
        habitRhythmDone: rhythm.doneDays,
        checkinId: result.checkin.id,
      });
    }

    return result.checkin;
  }

  /**
   * 夜间自动确认：该家长名下所有 PENDING 且非补上进度的打卡。
   * 复用 confirmBatch（默认跳过 makeup）。
   */
  async autoConfirmPendingForParent(parentId: number): Promise<{
    approved: number;
    failed: number;
  }> {
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    if (!studentIds.length) return { approved: 0, failed: 0 };
    const rows = await this.checkins.find({
      where: {
        studentId: In(studentIds),
        confirmStatus: ConfirmStatus.PENDING,
        isMakeup: false,
      },
      select: ['id'],
    });
    if (!rows.length) return { approved: 0, failed: 0 };
    const result = await this.confirmBatch(
      parentId,
      {
        ids: rows.map((r) => r.id),
        action: 'approve',
        liked: true,
        note: '夜间自动确认',
        skipMakeup: true,
      },
      '系统',
    );
    return { approved: result.okCount, failed: result.failCount };
  }

  async confirmBatch(
    parentId: number,
    dto: BatchConfirmCheckInDto,
    actorName?: string,
  ) {
    const skipMakeup = dto.skipMakeup !== false;
    const ok: number[] = [];
    const failed: Array<{ id: number; message: string }> = [];
    const ids = Array.isArray(dto.ids) ? dto.ids.slice(0, 40) : [];
    if (!ids.length) {
      return { ok, failed, okCount: 0, failCount: 0 };
    }

    // One load + one binding set + batch policy (not N× find/assertBound/forStudent)
    const uniqueIds = [...new Set(ids)];
    const rows = await this.checkins.find({
      where: { id: In(uniqueIds) },
      relations: ['task'],
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const boundSids = new Set(
      await this.students.getStudentIdsOfParent(parentId),
    );
    const studentIds = [
      ...new Set(
        rows
          .filter((r) => boundSids.has(r.studentId))
          .map((r) => r.studentId),
      ),
    ];
    const bundles = studentIds.length
      ? await this.checkinPolicy.forStudents(studentIds)
      : new Map();

    // Group by student: parallel across kids, serial within (points/progress race-safe)
    const byStudent = new Map<number, number[]>();
    for (const id of ids) {
      const row = byId.get(id);
      if (!row) {
        failed.push({ id, message: '打卡不存在' });
        continue;
      }
      if (!boundSids.has(row.studentId)) {
        failed.push({ id, message: '未绑定该学生' });
        continue;
      }
      if (skipMakeup && row.isMakeup) {
        failed.push({ id, message: '补上进度请单条确认' });
        continue;
      }
      const list = byStudent.get(row.studentId) || [];
      list.push(id);
      byStudent.set(row.studentId, list);
    }

    const groups = [...byStudent.entries()];
    const CONCURRENCY = 4;
    if (groups.length) {
      const groupResults: Array<{
        ok: number[];
        failed: Array<{ id: number; message: string }>;
      }> = new Array(groups.length);

      let nextGroup = 0;
      const workers = Array.from(
        { length: Math.min(CONCURRENCY, groups.length) },
        async () => {
          while (true) {
            const gi = nextGroup++;
            if (gi >= groups.length) return;
            const [, idList] = groups[gi];
            const localOk: number[] = [];
            const localFail: Array<{ id: number; message: string }> = [];
            for (const id of idList) {
              try {
                const row = byId.get(id)!;
                const bundle = bundles.get(row.studentId);
                const policy = bundle
                  ? {
                      edu: bundle.edu,
                      makeup: bundle.makeup,
                      rest: bundle.rest,
                      slots: bundle.slots,
                    }
                  : undefined;
                await this.confirm(
                  parentId,
                  id,
                  {
                    action: dto.action,
                    note: dto.note,
                    liked: dto.liked,
                  },
                  actorName,
                  { skipBoundCheck: true, policy },
                );
                localOk.push(id);
              } catch (e) {
                let message = '失败';
                if (e instanceof HttpException) {
                  const r = e.getResponse();
                  if (typeof r === 'string') message = r;
                  else if (r && typeof r === 'object' && 'message' in r) {
                    const m = (r as { message: string | string[] }).message;
                    message = Array.isArray(m) ? m.join('; ') : String(m);
                  } else message = e.message;
                } else if (e instanceof Error) {
                  message = e.message;
                }
                localFail.push({ id, message });
              }
            }
            groupResults[gi] = { ok: localOk, failed: localFail };
          }
        },
      );
      await Promise.all(workers);
      for (const gr of groupResults) {
        if (!gr) continue;
        ok.push(...gr.ok);
        failed.push(...gr.failed);
      }
    }

    return {
      ok,
      failed,
      okCount: ok.length,
      failCount: failed.length,
    };
  }

  async listForParent(parentId: number, studentId?: number) {
    const ids = await this.students.getStudentIdsOfParent(parentId);
    if (studentId && !ids.includes(studentId)) {
      throw new ForbiddenException();
    }
    const targetIds = studentId ? [studentId] : ids;
    if (!targetIds.length) return [];
    return this.checkins.find({
      where: { studentId: In(targetIds) },
      relations: ['student', 'task'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async listForStudent(studentId: number) {
    return this.checkins.find({
      where: { studentId },
      relations: ['task'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
