import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { ParentStudent } from '../entities/parent-student.entity';
import { UserRole } from '../common/enums';
import { assignUniqueLoginCode } from '../common/login-code';
import { CreateStudentDto, UpdateStudentDto } from './dto';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ParentStudent)
    private readonly links: Repository<ParentStudent>,
  ) {}

  private toStudentDto(student: User) {
    return {
      id: student.id,
      username: student.username,
      name: student.name,
      pointsBalance: student.pointsBalance,
      loginCode: student.loginCode,
      loginCodeExpiresAt: student.loginCodeExpiresAt,
      birthOrder: student.birthOrder ?? null,
      ageBand: student.ageBand || null,
      createdAt: student.createdAt,
    };
  }

  async list(parentId: number) {
    const rows = await this.links.find({
      where: { parentId },
      relations: ['student'],
      order: { id: 'ASC' },
    });
    return rows
      .map((r) => this.toStudentDto(r.student))
      .sort((a, b) => {
        const ao = a.birthOrder == null ? 9999 : a.birthOrder;
        const bo = b.birthOrder == null ? 9999 : b.birthOrder;
        if (ao !== bo) return ao - bo;
        return a.id - b.id;
      });
  }

  async create(parentId: number, dto: CreateStudentDto) {
    const exists = await this.users.findOne({ where: { username: dto.username } });
    if (exists) throw new BadRequestException('用户名已存在');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const codes = await assignUniqueLoginCode(this.users);
    let birthOrder = dto.birthOrder ?? null;
    if (birthOrder == null) {
      const siblings = await this.list(parentId);
      const max = siblings.reduce(
        (m, s) => Math.max(m, s.birthOrder ?? 0),
        0,
      );
      birthOrder = max + 1;
    }
    const student = await this.users.save(
      this.users.create({
        username: dto.username,
        passwordHash,
        name: dto.name,
        role: UserRole.STUDENT,
        pointsBalance: 0,
        loginCode: codes.loginCode,
        loginCodeExpiresAt: codes.loginCodeExpiresAt,
        birthOrder,
        ageBand: dto.ageBand || null,
      }),
    );
    await this.links.save(
      this.links.create({ parentId, studentId: student.id }),
    );
    return this.toStudentDto(student);
  }

  async update(parentId: number, studentId: number, dto: UpdateStudentDto) {
    await this.assertBound(parentId, studentId);
    const student = await this.users.findOne({ where: { id: studentId } });
    if (!student) throw new NotFoundException('学生不存在');
    if (dto.name) student.name = dto.name;
    if (dto.password) student.passwordHash = await bcrypt.hash(dto.password, 10);
    if (dto.birthOrder !== undefined) {
      student.birthOrder = dto.birthOrder;
    }
    if (dto.ageBand !== undefined) {
      student.ageBand = dto.ageBand || null;
    }
    await this.users.save(student);
    return this.toStudentDto(student);
  }

  async refreshLoginCode(parentId: number, studentId: number) {
    await this.assertBound(parentId, studentId);
    const student = await this.users.findOne({ where: { id: studentId } });
    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException('学生不存在');
    }
    const codes = await assignUniqueLoginCode(this.users);
    student.loginCode = codes.loginCode;
    student.loginCodeExpiresAt = codes.loginCodeExpiresAt;
    await this.users.save(student);
    return this.toStudentDto(student);
  }

  async assertBound(parentId: number, studentId: number) {
    const link = await this.links.findOne({ where: { parentId, studentId } });
    if (!link) throw new NotFoundException('未绑定该学生');
    return link;
  }

  async getParentIdsOfStudent(studentId: number): Promise<number[]> {
    const rows = await this.links.find({ where: { studentId } });
    return rows.map((r) => r.parentId);
  }

  async getStudentIdsOfParent(parentId: number): Promise<number[]> {
    const rows = await this.links.find({ where: { parentId } });
    return rows.map((r) => r.studentId);
  }

  /** One query: bound students as User entities (monitor/summary). */
  async listStudentUsersForParent(parentId: number): Promise<User[]> {
    const rows = await this.links.find({
      where: { parentId },
      relations: ['student'],
      order: { id: 'ASC' },
    });
    return rows.map((r) => r.student).filter(Boolean);
  }
}
