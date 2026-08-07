import { Injectable } from '@nestjs/common';
import { StudentsService } from '../students/students.service';
import { EventsGateway } from '../events/events.gateway';
import { PushService } from '../push/push.service';
import { FamilyPolicyReader } from './family-policy.reader';
import { NudgeStudentDto } from './dto';
import { formatDate } from '../common/date-util';

const DEFAULT_MSG = '加油，下一件很快就好';

/** Cooldown by age band — longer for younger kids / teens who need more autonomy */
function nudgeCooldownMs(ageBand: string): number {
  if (ageBand === 'young') return 60 * 60 * 1000;
  if (ageBand === 'teen') return 45 * 60 * 1000;
  return 30 * 60 * 1000;
}

@Injectable()
export class NudgeService {
  private readonly lastNudge = new Map<string, number>();
  private readonly dailyCount = new Map<string, number>();

  constructor(
    private readonly students: StudentsService,
    private readonly events: EventsGateway,
    private readonly push: PushService,
    private readonly policies: FamilyPolicyReader,
  ) {}

  async nudge(
    parentId: number,
    studentId: number,
    dto: NudgeStudentDto,
    parentName?: string,
  ) {
    await this.students.assertBound(parentId, studentId);
    const policy = await this.policies.loadOne(studentId);
    const ageBand = policy.edu.ageBand || 'general';
    const cooldownMs = nudgeCooldownMs(ageBand);
    const key = `${parentId}:${studentId}`;
    const now = Date.now();
    const prev = this.lastNudge.get(key) || 0;
    if (now - prev < cooldownMs) {
      const waitMin = Math.ceil((cooldownMs - (now - prev)) / 60000);
      return {
        ok: false,
        waitMin,
        message: `刚刚提醒过啦，约 ${waitMin} 分钟后再轻轻提醒一次吧`,
      };
    }
    const message = (dto.message || DEFAULT_MSG).trim().slice(0, 80);
    this.lastNudge.set(key, now);
    const dayKey = `${key}:${formatDate(new Date())}`;
    const todayCount = (this.dailyCount.get(dayKey) || 0) + 1;
    this.dailyCount.set(dayKey, todayCount);
    const fromName = parentName || '家长';
    const at = new Date().toISOString();
    const payload = {
      message,
      fromName,
      at,
    };
    this.events.emitToStudent(studentId, 'nudge:received', payload);
    const parentIds = await this.students.getParentIdsOfStudent(studentId);
    this.events.emitToParents(parentIds, 'nudge:sent', {
      studentId,
      message,
      fromName,
      at,
    });
    void this.push.sendToUser(studentId, {
      title: `${fromName}轻轻提醒`,
      body: message,
      url: '/student/today',
      tag: 'nudge',
    });
    const parentHint =
      todayCount >= 3
        ? `今天已经提醒 ${todayCount} 次了，试试等孩子自己开动？`
        : undefined;
    return { ok: true, ...payload, parentHint, todayNudgeCount: todayCount };
  }
}
