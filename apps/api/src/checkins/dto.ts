import {
  IsArray,
  ArrayMinSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCheckInDto {
  @IsOptional()
  @IsInt()
  assignId?: number;

  @IsOptional()
  @IsInt()
  planItemId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  value?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  /** Optional short reflection answer (stored separately for weekly review) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reflection?: string;

  /** Prompt shown with the reflection field */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reflectionPrompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(/^\/uploads\/[A-Za-z0-9._-]+(\?[^#]*)?$/)
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  completedStepIds?: number[];

  /** Late / makeup checkin after expiry or missed period */
  @IsOptional()
  @IsBoolean()
  isMakeup?: boolean;

  /** Target period for daily/weekly makeup, e.g. d:2026-07-09 */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  makeupPeriodKey?: string;

  /** Student finished a focus/pomodoro session before this checkin */
  @IsOptional()
  @IsBoolean()
  usedFocus?: boolean;

  /** 专注结束后的微复盘（可选） */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  focusReflection?: string;

  /** 打卡前情绪：happy | ok | tired | hard */
  @IsOptional()
  @IsIn(['happy', 'ok', 'tired', 'hard'])
  moodTag?: string;

  /** 离线同步幂等 ID */
  @IsOptional()
  @IsString()
  @MaxLength(36)
  clientId?: string;
}

export class ConfirmCheckInDto {
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  /** Parent like / praise on approve */
  @IsOptional()
  @IsBoolean()
  liked?: boolean;
}

export class BatchConfirmCheckInDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  ids: number[];

  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @IsOptional()
  @IsBoolean()
  liked?: boolean;

  /** Default true: makeup rows are not batch-processed */
  @IsOptional()
  @IsBoolean()
  skipMakeup?: boolean;
}
