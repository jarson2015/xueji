import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { WishType, WishKind } from '../common/enums';
import { ToBoolean } from '../common/to-boolean';

export class CreateWishDto {
  @IsInt()
  studentId: number;

  @IsString()
  @MaxLength(80)
  title: string;

  @IsInt()
  @Min(1)
  costPoints: number;

  @IsOptional()
  @IsEnum(WishType)
  type?: WishType;

  @IsOptional()
  @IsEnum(WishKind)
  kind?: WishKind;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isNearTerm?: boolean;
}
export class ProposeWishDto {
  @IsString()
  @MaxLength(80)
  title: string;

  @IsOptional()
  @IsEnum(WishType)
  type?: WishType;

  @IsOptional()
  @IsEnum(WishKind)
  kind?: WishKind;

  /** Optional suggested cost; parent still decides final points */
  @IsOptional()
  @IsInt()
  @Min(1)
  suggestedCostPoints?: number;
}

export class UpdateWishDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  costPoints?: number;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsEnum(WishType)
  type?: WishType;

  @IsOptional()
  @IsEnum(WishKind)
  kind?: WishKind;

  /** Parent clears proposed when shelving */
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  proposed?: boolean;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isNearTerm?: boolean;
}

/** Parent approves student proposal: set cost and list in shop */
export class ApproveWishDto {
  @IsInt()
  @Min(1)
  costPoints: number;

  @IsOptional()
  @IsEnum(WishType)
  type?: WishType;

  @IsOptional()
  @IsEnum(WishKind)
  kind?: WishKind;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isNearTerm?: boolean;
}

export class ReviewRedeemDto {
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  /** Optional chore assign to waive for golden_finger; auto-picks if omitted */
  @IsOptional()
  @IsInt()
  targetAssignId?: number;

  /** Required when rejecting — communication first */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
