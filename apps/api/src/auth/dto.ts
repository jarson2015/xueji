import { IsString, Length, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(4)
  password: string;
}

export class LoginCodeDto {
  @IsString()
  @Length(6, 6)
  code: string;
}

export class RegisterParentDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(1)
  name: string;
}
