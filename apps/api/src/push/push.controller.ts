import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PushService } from './push.service';
import { SubscribePushDto } from './dto';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/current-user.decorator';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('vapid-public-key')
  vapidPublicKey() {
    return this.push.getPublicKey();
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  subscribe(
    @CurrentUser() user: { id: number },
    @Body() dto: SubscribePushDto,
    @Req() req: any,
  ) {
    const ua = req.headers?.['user-agent'];
    return this.push.subscribe(user.id, dto, ua);
  }

  @Delete('subscribe')
  @UseGuards(JwtAuthGuard)
  unsubscribe(
    @CurrentUser() user: { id: number },
    @Body() body: { endpoint?: string },
  ) {
    return this.push.unsubscribe(user.id, body?.endpoint);
  }
}
