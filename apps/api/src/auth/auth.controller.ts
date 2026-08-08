import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginCodeDto, LoginDto, RegisterParentDto } from './dto';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/guards';
import { RateLimitService } from '../common/rate-limit.service';
import { clientIp } from '../common/client-ip';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post('register')
  register(@Req() req: any, @Body() dto: RegisterParentDto) {
    const ip = clientIp(req);
    this.rateLimit.consume(`register:${ip}`, 10, 15 * 60 * 1000);
    return this.auth.registerParent(dto);
  }

  @Post('login')
  login(@Req() req: any, @Body() dto: LoginDto) {
    const ip = clientIp(req);
    this.rateLimit.consume(`login:${ip}`, 20, 15 * 60 * 1000);
    this.rateLimit.consume(`login-user:${dto.username}`, 10, 15 * 60 * 1000);
    return this.auth.login(dto);
  }

  @Post('login-code')
  async loginCode(@Req() req: any, @Body() dto: LoginCodeDto) {
    const ip = clientIp(req);
    // Tighten vs digit space: attempts / IP + per-code + failures / IP
    this.rateLimit.consume(`login-code:${ip}`, 8, 15 * 60 * 1000);
    const codeKey = String(dto.code || '')
      .trim()
      .replace(/\D/g, '')
      .slice(0, 8);
    if (codeKey) {
      this.rateLimit.consume(`login-code-val:${codeKey}`, 5, 15 * 60 * 1000);
    }
    try {
      return await this.auth.loginByCode(dto);
    } catch (e) {
      this.rateLimit.consume(`login-code-fail:${ip}`, 6, 15 * 60 * 1000);
      throw e;
    }
  }

  @Get('demo-hints')
  demoHints() {
    return this.auth.demoHints();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { id: number; isProxy?: boolean }) {
    return this.auth.me(user.id, !!user.isProxy);
  }
}
