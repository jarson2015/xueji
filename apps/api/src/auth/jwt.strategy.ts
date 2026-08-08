import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums';
import { resolveJwtSecret } from '../common/jwt-secret';
import { studentSessionEpochOk } from '../common/session-epoch';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(config.get<string>('JWT_SECRET')),
    });
  }

  async validate(payload: {
    sub: number;
    role: string;
    proxy?: boolean;
    pe?: number;
  }) {
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) return null;
    // DB role wins; student tokens must match proxyEpoch (pe)
    if (user.role === UserRole.STUDENT) {
      if (!studentSessionEpochOk(payload.pe, user.proxyEpoch)) return null;
    } else if (payload.proxy) {
      // Non-student must never be proxy; belt-and-suspenders
      return null;
    }
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      pointsBalance: user.pointsBalance,
      isProxy: !!payload.proxy && user.role === UserRole.STUDENT,
    };
  }
}
