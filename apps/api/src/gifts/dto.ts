import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PointGiftReason } from '../common/enums';

const REASONS = [
  PointGiftReason.CHEER,
  PointGiftReason.WISH_HELP,
  PointGiftReason.THANKS,
  PointGiftReason.OTHER,
];

export class CreatePointGiftDto {
  @IsInt()
  @Min(1)
  toStudentId: number;

  @IsInt()
  @Min(1)
  @Max(500)
  amountPoints: number;

  @IsString()
  @IsIn(REASONS)
  reasonCode: PointGiftReason;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  note?: string;
}
