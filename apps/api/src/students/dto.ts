import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateStudentDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  /** 家里排行：1=大孩 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  birthOrder?: number;

  /** young | general | teen；不传则用家庭默认 */
  @IsOptional()
  @IsString()
  @Matches(/^(young|general|teen)$/)
  ageBand?: string;
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  birthOrder?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^(young|general|teen)$/)
  ageBand?: string | null;
}
