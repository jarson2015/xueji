import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AllowanceCategory, AllowanceKind } from '../common/enums';

export class CreateAllowanceEntryDto {
  /** Required for parent; ignored for student (self) */
  @IsOptional()
  @IsInt()
  studentId?: number;

  @IsEnum(AllowanceKind)
  kind: AllowanceKind;

  /** Absolute amount in cents (>0). Sign applied by kind. */
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  amountCents: number;

  @IsOptional()
  @IsEnum(AllowanceCategory)
  category?: AllowanceCategory;

  @IsString()
  @MaxLength(80)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^\/uploads\/[A-Za-z0-9._-]+(\?[^#]*)?$/)
  imageUrl?: string;
}

export class ReviewAllowanceEntryDto {
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class CreateAllowanceGoalDto {
  @IsString()
  @MaxLength(80)
  title: string;

  @IsInt()
  @Min(100)
  @Max(10_000_000)
  targetCents: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^\/uploads\/[A-Za-z0-9._-]+(\?[^#]*)?$/)
  coverUrl?: string;
}

export class UpdateAllowanceGoalDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(10_000_000)
  targetCents?: number;

  @IsOptional()
  @IsIn(['active', 'cancelled'])
  status?: 'active' | 'cancelled';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^\/uploads\/[A-Za-z0-9._-]+(\?[^#]*)?$/)
  coverUrl?: string;
}

export class SaveToGoalDto {
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  amountCents: number;
}
