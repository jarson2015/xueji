import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveJwtSecret } from '../common/jwt-secret';
import { resolveCorsOrigin } from '../common/cors-origin';
import { MonitorRevisionService } from '../common/monitor-revision.service';

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
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth?.token as string) || '';
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.jwt.verifyAsync(token, {
        secret: resolveJwtSecret(this.config.get<string>('JWT_SECRET')),
      });
      client.data.user = payload;
      if (payload.role === 'parent') {
        client.join(`parent:${payload.sub}`);
      }
      if (payload.role === 'student') {
        client.join(`student:${payload.sub}`);
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

  @SubscribeMessage('ping')
  ping(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
    return { event: 'pong', data: body };
  }
}
