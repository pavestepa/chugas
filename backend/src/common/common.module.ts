import { Global, Module } from '@nestjs/common';

import { CascadeService } from './services/cascade.service';
import { MailService } from './services/mail.service';
import { RateLimitService } from './services/rate-limit.service';
import { WsHubService } from './services/ws-hub.service';

@Global()
@Module({
  providers: [RateLimitService, MailService, WsHubService, CascadeService],
  exports: [RateLimitService, MailService, WsHubService, CascadeService],
})
export class CommonModule {}
