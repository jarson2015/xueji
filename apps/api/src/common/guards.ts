import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ROLES_KEY } from './roles.decorator';
import { FORBID_PROXY_KEY } from './forbid-proxy.decorator';
import { UserRole } from './enums';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('未登录或令牌无效');
    }
    return user;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const { user } = context.switchToHttp().getRequest();
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('无权限访问');
    }
    return true;
  }
}

/** Rejects parent-proxy sessions on handlers marked @ForbidProxy(). */
@Injectable()
export class ForbidProxyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const forbid = this.reflector.getAllAndOverride<boolean>(FORBID_PROXY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!forbid) return true;
    const { user } = context.switchToHttp().getRequest();
    if (user?.isProxy) {
      throw new ForbiddenException('代登会话不能执行此操作，请让孩子本人登录');
    }
    return true;
  }
}
