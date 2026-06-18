import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";

import { AppController } from "./app.controller";
import { CommonModule } from "./common/common.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import configuration from "./config/configuration";
import { envValidationSchema } from "./config/env.validation";
import { AuthModule } from "./modules/auth/auth.module";
import { BlocksModule } from "./modules/blocks/blocks.module";
import { CleanupModule } from "./modules/cleanup/cleanup.module";
import { CommentsModule } from "./modules/comments/comments.module";
import { CommunitiesModule } from "./modules/communities/communities.module";
import { FollowsModule } from "./modules/follows/follows.module";
import { LikesModule } from "./modules/likes/likes.module";
import { LocationModule } from "./modules/location/location.module";
import { MapModule } from "./modules/map/map.module";
import { MessagesModule } from "./modules/messages/messages.module";
import { PostsModule } from "./modules/posts/posts.module";
import { UsersModule } from "./modules/users/users.module";
import { WsModule } from "./modules/ws/ws.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    CommonModule,
    AuthModule,
    UsersModule,
    BlocksModule,
    FollowsModule,
    PostsModule,
    CommentsModule,
    LikesModule,
    CommunitiesModule,
    MessagesModule,
    LocationModule,
    MapModule,
    WsModule,
    CleanupModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
