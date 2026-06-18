import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { LocationModule } from '../location/location.module';
import { MessagesModule } from '../messages/messages.module';
import { WsGateway } from './ws.gateway';

@Module({
  imports: [AuthModule, MessagesModule, LocationModule],
  providers: [WsGateway],
})
export class WsModule {}
