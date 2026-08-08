import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { resolveJwtSecret } from '../common/jwt-secret';
import { resolveCorsOrigin } from '../common/cors-origin';
import { MonitorRevisionService } from '../common/monitor-revision.service';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums';
import { studentSessionEpochOk } from '../common/session-epoch';

@WebSocketGateway({
  cors: {
    origin: (() => {
      try {
        return resolveCorsOrigin();
      } catch {
        // Gateway decorators evaluate at import time; main() still enforces CORS.
        return process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) || false;
      }
    })(),
  },
  namespace: '/ws',
})
@Injectable()
export class EventsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly monitorRev: MonitorRevisionService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth?.token as string) || '';
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.jwt.verifyAsync<{
        sub: number;
        role?: string;
        proxy?: boolean;
        pe?: number;
      }>(token, {
        secret: resolveJwtSecret(this.config.get<string>('JWT_SECRET')),
      });
      const user = await this.users.findOne({ where: { id: payload.sub } });
      if (!user) {
        client.disconnect();
        return;
      }
      // Students: pe must match proxyEpoch (code / password / proxy)
      if (user.role === UserRole.STUDENT) {
        if (!studentSessionEpochOk(payload.pe, user.proxyEpoch)) {
          client.disconnect();
          return;
        }
      } else if (payload.proxy) {
        client.disconnect();
        return;
      }
      // Room membership follows DB role, not forged JWT role claim
      client.data.user = {
        sub: user.id,
        role: user.role,
        proxy: !!payload.proxy && user.role === UserRole.STUDENT,
      };
      if (user.role === UserRole.PARENT) {
        client.join(`parent:${user.id}`);
      }
      if (user.role === UserRole.STUDENT) {
        client.join(`student:${user.id}`);
      }
    } catch (e) {
      this.logger.warn(`WS auth failed: ${e}`);
      client.disconnect();
    }
  }

  emitToParents(parentIds: number[], event: string, data: any) {
    this.monitorRev.bump(parentIds);
    for (const id of parentIds) {
      this.server?.to(`parent:${id}`).emit(event, data);
    }
  }

  emitToStudent(studentId: number, event: string, data: any) {
    this.server?.to(`student:${studentId}`).emit(event, data);
  }

  /** Ignore client body — avoid WS echo amplification. */
  @SubscribeMessage('ping')
  ping() {
    return { event: 'pong', data: { ok: true } };
  }
}
