import { Module } from '@nestjs/common';

import { FollowsModule } from '../follows/follows.module';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';

@Module({
  imports: [FollowsModule],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
