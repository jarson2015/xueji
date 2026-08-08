import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from '../entities/push-subscription.entity';
import { SubscribePushDto } from './dto';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subs: Repository<PushSubscription>,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject =
      this.config.get<string>('VAPID_SUBJECT') || 'mailto:study@localhost';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.enabled = true;
      this.logger.log('Web Push VAPID configured');
    } else {
      this.logger.warn('VAPID keys missing — Web Push disabled');
    }
  }

  getPublicKey() {
    return {
      enabled: this.enabled,
      publicKey: this.config.get<string>('VAPID_PUBLIC_KEY') || null,
    };
  }

  async subscribe(userId: number, dto: SubscribePushDto, ua?: string) {
    let row = await this.subs.findOne({ where: { endpoint: dto.endpoint } });
    if (row) {
      row.userId = userId;
      row.p256dh = dto.p256dh;
      row.auth = dto.auth;
      row.userAgent = ua || row.userAgent;
    } else {
      row = this.subs.create({
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.p256dh,
        auth: dto.auth,
        userAgent: ua || null,
      });
    }
    await this.subs.save(row);
    return { ok: true };
  }

  async unsubscribe(userId: number, endpoint?: string) {
    if (endpoint) {
      await this.subs.delete({ userId, endpoint });
    } else {
      await this.subs.delete({ userId });
    }
    return { ok: true };
  }

  async sendToUser(
    userId: number,
    payload: { title: string; body: string; url?: string; tag?: string },
  ) {
    if (!this.enabled) return { sent: 0, skipped: true };
    const rows = await this.subs.find({ where: { userId } });
    if (!rows.length) return { sent: 0, skipped: false };
    let sent = 0;
    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      tag: payload.tag || 'study-nudge',
    });
    const results = await Promise.allSettled(
      rows.map(async (row) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: row.endpoint,
              keys: { p256dh: row.p256dh, auth: row.auth },
            },
            body,
          );
          return { ok: true as const };
        } catch (e: any) {
          const status = e?.statusCode;
          this.logger.warn(`Push failed user=${userId} status=${status}`);
          if (status === 404 || status === 410) {
            await this.subs.delete({ id: row.id });
          }
          return { ok: false as const };
        }
      }),
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.ok) sent += 1;
    }
    return { sent, skipped: false };
  }
}
