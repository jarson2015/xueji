import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreatePlanItemDto {
  @IsOptional()
  @IsInt()
  taskId?: number;

  @IsOptional()
  @IsString()
  customTitle?: string;

  @IsOptional()
  @IsDateString()
  plannedDate?: string;
}

export class UpdatePlanItemDto {
  @IsOptional()
  @IsString()
  customTitle?: string;

  @IsOptional()
  @IsDateString()
  plannedDate?: string | null;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}
