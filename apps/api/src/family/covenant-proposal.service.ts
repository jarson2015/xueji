import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CovenantProposal } from '../entities/covenant-proposal.entity';
import { FamilySettings } from '../entities/family-settings.entity';
import { User } from '../entities/user.entity';
import { StudentsService } from '../students/students.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class CovenantProposalService {
  constructor(
    @InjectRepository(CovenantProposal)
    private readonly proposals: Repository<CovenantProposal>,
    @InjectRepository(FamilySettings)
    private readonly settings: Repository<FamilySettings>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly students: StudentsService,
    private readonly events: EventsGateway,
  ) {}

  async propose(studentId: number, text: string) {
    const proposedText = (text || '').trim();
    if (!proposedText) {
      throw new BadRequestException('请写一条约定');
    }
    if (proposedText.length > 300) {
      throw new BadRequestException('约定太长了，请控制在 300 字内');
    }
    const pendingCount = await this.proposals.count({
      where: { studentId, status: 'pending' },
    });
    if (pendingCount >= 3) {
      throw new BadRequestException('已有几条待家长看的提议，先等等家长回应吧');
    }
    const row = await this.proposals.save(
      this.proposals.create({
        studentId,
        proposedText,
        status: 'pending',
      }),
    );
    const student = await this.users.findOne({ where: { id: studentId } });
    const parentIds = await this.students.getParentIdsOfStudent(studentId);
    this.events.emitToParents(parentIds, 'covenant:proposed', {
      id: row.id,
      studentId,
      studentName: student?.name,
      proposedText: row.proposedText,
    });
    return { id: row.id, status: row.status, proposedText: row.proposedText };
  }

  async listForStudent(studentId: number) {
    const items = await this.proposals.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return {
      items: items.map((p) => ({
        id: p.id,
        proposedText: p.proposedText,
        status: p.status,
        createdAt: p.createdAt,
        resolvedAt: p.resolvedAt,
      })),
    };
  }

  async listForParent(parentId: number) {
    const studentIds = await this.students.getStudentIdsOfParent(parentId);
    if (!studentIds.length) return { items: [] };
    const items = await this.proposals.find({
      where: { studentId: In(studentIds) },
      relations: ['student'],
      order: { createdAt: 'DESC' },
      take: 40,
    });
    return {
      items: items.map((p) => ({
        id: p.id,
        studentId: p.studentId,
        studentName: p.student?.name,
        proposedText: p.proposedText,
        status: p.status,
        createdAt: p.createdAt,
        resolvedAt: p.resolvedAt,
      })),
      pendingCount: items.filter((p) => p.status === 'pending').length,
    };
  }

  async adopt(parentId: number, proposalId: number) {
    const row = await this.proposals.findOne({
      where: { id: proposalId },
      relations: ['student'],
    });
    if (!row) throw new NotFoundException('提议不存在');
    await this.students.assertBound(parentId, row.studentId);
    if (row.status !== 'pending') {
      throw new BadRequestException('这条提议已经处理过了');
    }

    const settings = await this.settings.findOne({ where: { parentId } });
    if (!settings) {
      throw new BadRequestException('请先打开家庭设置');
    }
    const who = row.student?.name || '孩子';
    const line = `· ${row.proposedText}（${who}提议）`;
    const prev = (settings.covenantNote || '').trim();
    settings.covenantNote = prev ? `${prev}\n${line}` : line;
    await this.settings.save(settings);

    row.status = 'adopted';
    row.resolvedByParentId = parentId;
    row.resolvedAt = new Date();
    await this.proposals.save(row);

    return {
      id: row.id,
      status: row.status,
      covenantNote: settings.covenantNote,
    };
  }

  async dismiss(parentId: number, proposalId: number) {
    const row = await this.proposals.findOne({ where: { id: proposalId } });
    if (!row) throw new NotFoundException('提议不存在');
    await this.students.assertBound(parentId, row.studentId);
    if (row.status !== 'pending') {
      throw new BadRequestException('这条提议已经处理过了');
    }
    row.status = 'dismissed';
    row.resolvedByParentId = parentId;
    row.resolvedAt = new Date();
    await this.proposals.save(row);
    return { id: row.id, status: row.status };
  }
}
