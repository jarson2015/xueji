import { IsString, MinLength } from 'class-validator';

export class SubscribePushDto {
  @IsString()
  @MinLength(8)
  endpoint: string;

  @IsString()
  @MinLength(8)
  p256dh: string;

  @IsString()
  @MinLength(8)
  auth: string;
}
