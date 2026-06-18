import { Module } from '@nestjs/common';

import { BlocksModule } from '../blocks/blocks.module';
import { FollowsModule } from '../follows/follows.module';
import { FeedController, PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [FollowsModule, BlocksModule],
  controllers: [PostsController, FeedController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
