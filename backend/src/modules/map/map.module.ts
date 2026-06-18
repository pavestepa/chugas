import { Module } from '@nestjs/common';

import { PostsModule } from '../posts/posts.module';
import { MapController } from './map.controller';

@Module({
  imports: [PostsModule],
  controllers: [MapController],
})
export class MapModule {}
