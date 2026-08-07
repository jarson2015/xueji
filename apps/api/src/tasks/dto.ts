import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TargetType,
  TaskCategory,
  TaskSchedule,
  TimeSlot,
} from '../common/enums';

export class TaskStepDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TaskSchedule)
  schedule: TaskSchedule;

  @IsEnum(TargetType)
  targetType: TargetType;

  @IsInt()
  @Min(1)
  targetValue: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsBoolean()
  requireConfirm?: boolean;

  /** 共享完成：一人做完，其余人今天不再催 */
  @IsOptional()
  @IsBoolean()
  sharedComplete?: boolean;

  /** 轮值：共享完成下按周期轮流主责 */
  @IsOptional()
  @IsBoolean()
  rotateEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  pointsReward?: number;

  /** 兴趣探索任务（好奇/投入导向） */
  @IsOptional()
  @IsBoolean()
  isInterest?: boolean;

  /** 给学生看的意义句 */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  meaningNote?: string;

  @IsOptional()
  @IsIn(['intro', 'practice', 'challenge'])
  difficultyLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  intentionCue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  intentionWhen?: string;

  @IsOptional()
  @IsBoolean()
  isMicroHabit?: boolean;

  /** 兄妹协作；与 sharedComplete 互斥 */
  @IsOptional()
  @IsBoolean()
  jointComplete?: boolean;

  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @IsOptional()
  @IsEnum(TimeSlot)
  timeSlot?: TimeSlot;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskStepDto)
  steps?: TaskStepDto[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  studentIds?: number[];

  /** Catalog template id, e.g. eq-mood */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceTemplateId?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskSchedule)
  schedule?: TaskSchedule;

  @IsOptional()
  @IsEnum(TargetType)
  targetType?: TargetType;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetValue?: number;

  @IsOptional()
  @IsDateString()
  deadline?: string | null;

  @IsOptional()
  @IsBoolean()
  requireConfirm?: boolean;

  @IsOptional()
  @IsBoolean()
  sharedComplete?: boolean;

  @IsOptional()
  @IsBoolean()
  rotateEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  pointsReward?: number;

  @IsOptional()
  @IsBoolean()
  isInterest?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  meaningNote?: string | null;

  @IsOptional()
  @IsIn(['intro', 'practice', 'challenge'])
  difficultyLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  intentionCue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  intentionWhen?: string;

  @IsOptional()
  @IsBoolean()
  isMicroHabit?: boolean;

  /** 兄妹协作；与 sharedComplete 互斥 */
  @IsOptional()
  @IsBoolean()
  jointComplete?: boolean;

  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @IsOptional()
  @IsEnum(TimeSlot)
  timeSlot?: TimeSlot;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskStepDto)
  steps?: TaskStepDto[];

  /** Full desired assignee set; omitted = leave assigns unchanged */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  studentIds?: number[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceTemplateId?: string | null;
}

export class AssignTaskDto {
  @IsArray()
  @IsInt({ each: true })
  studentIds: number[];
}

/** 学生提议一件小事 */
export class ProposeTaskDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @IsOptional()
  @IsInt()
  @Min(5)
  suggestedMinutes?: number;
}

export class ApproveTaskProposalDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  pointsReward?: number;

  @IsOptional()
  @IsBoolean()
  requireConfirm?: boolean;

  @IsOptional()
  @IsEnum(TaskSchedule)
  schedule?: TaskSchedule;
}

export class RejectTaskProposalDto {
  @IsString()
  @MaxLength(200)
  note: string;
}
