import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThan, Repository } from 'typeorm';
import { FamilyInvite } from '../entities/family-invite.entity';
import { ParentStudent } from '../entities/parent-student.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums';
import { AcceptInviteDto } from './dto';
import { randomInviteAlphabetCode } from '../common/upload-url';

@Injectable()
export class FamilyInviteService {
  constructor(
    @InjectRepository(FamilyInvite)
    private readonly invites: Repository<FamilyInvite>,
    @InjectRepository(ParentStudent)
    private readonly links: Repository<ParentStudent>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  private randomCode() {
    return randomInviteAlphabetCode(6);
  }

  async createInvite(fromParentId: number) {
    // Invalidate previous unused invites from this parent
    const open = await this.invites.find({
      where: { fromParentId, acceptedByParentId: IsNull() },
    });
    for (const row of open) {
      row.expiresAt = new Date(0);
      await this.invites.save(row);
    }

    let code = this.randomCode();
    for (let i = 0; i < 8; i++) {
      const clash = await this.invites.findOne({ where: { code } });
      if (!clash) break;
      code = this.randomCode();
    }
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const row = await this.invites.save(
      this.invites.create({
        fromParentId,
        code,
        expiresAt,
        acceptedByParentId: null,
        acceptedAt: null,
      }),
    );
    return {
      code: row.code,
      expiresAt: row.expiresAt,
      hint: '把邀请码发给另一位家长，对方注册/登录后在「学生管理」输入即可共享孩子',
    };
  }

  async acceptInvite(acceptingParentId: number, dto: AcceptInviteDto) {
    const code = String(dto.code || '')
      .trim()
      .toUpperCase();
    const invite = await this.invites.findOne({ where: { code } });
    if (!invite) {
      return { ok: false, message: '邀请码无效，请核对后重试' };
    }
    if (invite.acceptedByParentId) {
      return { ok: false, message: '邀请码已被使用，请让对方重新生成' };
    }
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      return { ok: false, message: '邀请码已过期，请让对方重新生成' };
    }
    if (invite.fromParentId === acceptingParentId) {
      return {
        ok: false,
        message:
          '这是你自己生成的邀请码。请退出后用另一位家长账号登录（或先注册），再输入此码加入家庭。',
      };
    }

    const acceptor = await this.users.findOne({
      where: { id: acceptingParentId },
    });
    if (!acceptor || acceptor.role !== UserRole.PARENT) {
      return { ok: false, message: '仅家长可接受邀请' };
    }

    const sourceLinks = await this.links.find({
      where: { parentId: invite.fromParentId },
    });
    if (!sourceLinks.length) {
      return {
        ok: false,
        message: '对方还没有绑定学生，请先让对方添加孩子后再邀请',
      };
    }

    let linked = 0;
    for (const src of sourceLinks) {
      const exists = await this.links.findOne({
        where: { parentId: acceptingParentId, studentId: src.studentId },
      });
      if (exists) continue;
      await this.links.save(
        this.links.create({
          parentId: acceptingParentId,
          studentId: src.studentId,
        }),
      );
      linked += 1;
    }

    invite.acceptedByParentId = acceptingParentId;
    invite.acceptedAt = new Date();
    await this.invites.save(invite);

    return {
      ok: true,
      linkedStudents: linked,
      message:
        linked > 0
          ? `已加入家庭，共享 ${linked} 名孩子`
          : '已加入家庭（孩子此前已绑定）',
    };
  }

  async listCoParents(parentId: number) {
    const myStudentIds = (
      await this.links.find({ where: { parentId } })
    ).map((l) => l.studentId);
    if (!myStudentIds.length) {
      return { coParents: [], pendingInvite: null as any };
    }
    const related = await this.links.find({
      where: { studentId: In(myStudentIds) },
    });
    const otherParentIds = [
      ...new Set(
        related.map((r) => r.parentId).filter((id) => id !== parentId),
      ),
    ];
    const coParents = otherParentIds.length
      ? await this.users.find({ where: { id: In(otherParentIds) } })
      : [];

    const pending = await this.invites.findOne({
      where: {
        fromParentId: parentId,
        acceptedByParentId: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { id: 'DESC' },
    });

    return {
      coParents: coParents.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
      })),
      pendingInvite: pending
        ? { code: pending.code, expiresAt: pending.expiresAt }
        : null,
    };
  }
}
