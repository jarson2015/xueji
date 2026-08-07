import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { EventsGateway } from '../events/events.gateway';
import { StudentsService } from '../students/students.service';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly logs: Repository<AuditLog>,
    private readonly events: EventsGateway,
    private readonly students: StudentsService,
  ) {}

  async record(input: {
    actorId: number;
    actorName?: string;
    action: string;
    targetType?: string;
    targetId?: number;
    studentId?: number;
    detail?: Record<string, unknown>;
  }) {
    try {
      await this.logs.save(
        this.logs.create({
          actorId: input.actorId,
          actorName: input.actorName || null,
          action: input.action,
          targetType: input.targetType || null,
          targetId: input.targetId ?? null,
          studentId: input.studentId ?? null,
          detail: input.detail || null,
        }),
      );
    } catch {
      // never block business flow
    }
  }

  /** Notify other co-parents (exclude actor) about important actions */
  async notifyCoParents(opts: {
    actorId: number;
    actorName?: string;
    studentId: number;
    action: string;
    message: string;
    detail?: Record<string, unknown>;
  }) {
    const parentIds = await this.students.getParentIdsOfStudent(opts.studentId);
    const others = parentIds.filter((id) => id !== opts.actorId);
    if (!others.length) return;
    this.events.emitToParents(others, 'family:co-parent', {
      action: opts.action,
      message: opts.message,
      fromName: opts.actorName || '另一位家长',
      studentId: opts.studentId,
      detail: opts.detail || {},
      at: new Date().toISOString(),
    });
    await this.record({
      actorId: opts.actorId,
      actorName: opts.actorName,
      action: opts.action,
      studentId: opts.studentId,
      detail: { ...opts.detail, notifiedParentIds: others },
    });
  }

  async recentForParent(parentId: number, take = 30) {
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    if (!studentIds.length) {
      return this.logs.find({
        where: { actorId: parentId },
        order: { createdAt: 'DESC' },
        take,
      });
    }
    return this.logs
      .createQueryBuilder('a')
      .where('a.actor_id = :parentId OR a.student_id IN (:...studentIds)', {
        parentId,
        studentIds,
      })
      .orderBy('a.created_at', 'DESC')
      .take(take)
      .getMany();
  }
}
