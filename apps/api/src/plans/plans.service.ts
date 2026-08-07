import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StudyPlan } from '../entities/study-plan.entity';
import { PlanItem } from '../entities/plan-item.entity';
import {
  CreatePlanDto,
  CreatePlanItemDto,
  UpdatePlanDto,
  UpdatePlanItemDto,
} from './dto';
import { todayStr } from '../common/date-util';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(StudyPlan) private readonly plans: Repository<StudyPlan>,
    @InjectRepository(PlanItem) private readonly items: Repository<PlanItem>,
  ) {}

  list(studentId: number) {
    return this.plans.find({
      where: { studentId },
      relations: ['items', 'items.task'],
      order: { id: 'DESC' },
    });
  }

  async create(studentId: number, dto: CreatePlanDto) {
    const plan = await this.plans.save(
      this.plans.create({
        studentId,
        title: dto.title,
        startDate: dto.startDate ?? null,
        endDate: dto.endDate ?? null,
        note: dto.note ?? null,
      }),
    );
    return this.findOne(studentId, plan.id);
  }

  async update(studentId: number, planId: number, dto: UpdatePlanDto) {
    const plan = await this.getOwned(studentId, planId);
    if (dto.title !== undefined) plan.title = dto.title;
    if (dto.startDate !== undefined) plan.startDate = dto.startDate;
    if (dto.endDate !== undefined) plan.endDate = dto.endDate;
    if (dto.note !== undefined) plan.note = dto.note;
    await this.plans.save(plan);
    return this.findOne(studentId, planId);
  }

  async remove(studentId: number, planId: number) {
    const plan = await this.getOwned(studentId, planId);
    await this.plans.remove(plan);
    return { id: planId };
  }

  async addItem(studentId: number, planId: number, dto: CreatePlanItemDto) {
    await this.getOwned(studentId, planId);
    const item = await this.items.save(
      this.items.create({
        planId,
        taskId: dto.taskId ?? null,
        customTitle: dto.customTitle ?? null,
        plannedDate: dto.plannedDate ?? todayStr(),
        done: false,
      }),
    );
    return item;
  }

  async updateItem(
    studentId: number,
    planId: number,
    itemId: number,
    dto: UpdatePlanItemDto,
  ) {
    await this.getOwned(studentId, planId);
    const item = await this.items.findOne({ where: { id: itemId, planId } });
    if (!item) throw new NotFoundException('计划项不存在');
    if (dto.customTitle !== undefined) item.customTitle = dto.customTitle;
    if (dto.plannedDate !== undefined) item.plannedDate = dto.plannedDate;
    if (dto.done !== undefined) item.done = dto.done;
    return this.items.save(item);
  }

  async removeItem(studentId: number, planId: number, itemId: number) {
    await this.getOwned(studentId, planId);
    const item = await this.items.findOne({ where: { id: itemId, planId } });
    if (!item) throw new NotFoundException('计划项不存在');
    await this.items.remove(item);
    return { id: itemId };
  }

  async todayItems(studentId: number) {
    const map = await this.todayItemsForStudents([studentId]);
    return map.get(studentId) || [];
  }

  /** Batch today plan items for many students (dashboard summary). */
  async todayItemsForStudents(studentIds: number[]) {
    const result = new Map<number, any[]>();
    for (const sid of studentIds) result.set(sid, []);
    if (!studentIds.length) return result;
    const today = todayStr();
    const plans = await this.plans.find({
      where: { studentId: In(studentIds) },
      relations: ['items', 'items.task'],
    });
    for (const p of plans) {
      const list = result.get(p.studentId) || [];
      for (const it of p.items || []) {
        if (it.plannedDate === today || (!it.plannedDate && !it.done)) {
          list.push({
            type: 'plan',
            planId: p.id,
            planTitle: p.title,
            planItemId: it.id,
            title: it.customTitle || it.task?.title || '计划项',
            done: it.done,
            taskId: it.taskId,
          });
        }
      }
      result.set(p.studentId, list);
    }
    return result;
  }

  private async getOwned(studentId: number, planId: number) {
    const plan = await this.plans.findOne({ where: { id: planId, studentId } });
    if (!plan) throw new NotFoundException('计划不存在');
    return plan;
  }

  private async findOne(studentId: number, planId: number) {
    const plan = await this.plans.findOne({
      where: { id: planId, studentId },
      relations: ['items', 'items.task'],
    });
    if (!plan) throw new NotFoundException('计划不存在');
    return plan;
  }
}
