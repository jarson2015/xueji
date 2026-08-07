import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ToBoolean } from '../common/to-boolean';

export class UpdateFamilySettingsDto {
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weeklyRestDays?: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true })
  extraRestDates?: string[];

  /** Master switch — default off; when off, weekly/extra dates are ignored */
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  restDaysEnabled?: boolean;

  /** Pause every task on rest day (including once) */
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  restPauseAll?: boolean;

  /** Categories to pause when not pause-all: study | chore | routine */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^(study|chore|routine)$/, { each: true })
  restPauseCategories?: string[];

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  makeupEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(100)
  makeupDiscountPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  makeupWindowDays?: number;

  /** always | random | weekly_digest */
  @IsOptional()
  @IsString()
  @Matches(/^(always|random|weekly_digest)$/)
  rewardMode?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  intrinsicMode?: boolean;

  /** young | general | teen */
  @IsOptional()
  @IsString()
  @Matches(/^(young|general|teen)$/)
  ageBand?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  reflectionEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  goldenFingerNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  covenantNote?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  allowanceLedgerEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10000000)
  allowanceWeeklyCents?: number | null;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(10000000)
  allowanceLargeCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  allowanceSavePercent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  allowanceNote?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  pointsPactEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  pointsPactMaxAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  pointsPactMaxActive?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  pointsPactMaxOverdueExtra?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pointsPactNote?: string;

  /** 0 = 关闭家长闸；否则单笔达到该值需家长先同意 */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  pointsPactParentApproveAbove?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  pointsGiftMaxAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  pointsGiftParentApproveAbove?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  pointsGiftDailyMax?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  pointsGiftWeeklyOutMax?: number;

  /** 0 = 关闭今日缓做；默认 1 */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  dailySkipLimit?: number;

  /** 每晚自动通过待确认（不含补上进度）；默认关 */
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  autoConfirmPendingEnabled?: boolean;

  /** HH:mm，上海时区；默认 23:30 */
  @IsOptional()
  @IsString()
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/, {
    message: '自动确认时间须为 HH:mm',
  })
  autoConfirmPendingTime?: string;

  /** 时段扩展档（上学前/早餐后/午餐后） */
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  slotExtendedEnabled?: boolean;

  /**
   * 时钟映射覆盖：{ after_school: { startHour, endHour }, ... }
   * 传 null / {} 可清回默认
   */
  @IsOptional()
  slotClockMap?: Record<string, { startHour: number; endHour: number }> | null;
}

export class NudgeStudentDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  message?: string;
}

export class AcceptInviteDto {
  @Transform(({ value }) =>
    String(value || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ''),
  )
  @IsString()
  @Length(6, 8)
  code: string;
}

export class ProposeCovenantDto {
  @IsString()
  @MaxLength(300)
  text: string;
}
