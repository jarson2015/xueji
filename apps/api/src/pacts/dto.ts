import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePointPactDto {
  /** 借出方学生 id（对方） */
  @IsInt()
  @Min(1)
  lenderId: number;

  @IsInt()
  @Min(1)
  @Max(500)
  amountPoints: number;

  /** 约定还回日 YYYY-MM-DD */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dueDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  note?: string;
}

export class ParentWriteOffDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
