import { IsString, Length, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(4)
  password: string;
}

export class LoginCodeDto {
  @IsString()
  @Length(6, 8)
  @Matches(/^\d{6,8}$/, { message: '登录码须为 6～8 位数字' })
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
