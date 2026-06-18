import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  getUserId,
} from '../../common/decorators/current-user.decorator';
import { RateLimitService } from '../../common/services/rate-limit.service';
import {
  CreatePostDto,
  PostLocationQueryDto,
} from './dto/posts.dto';
import { PostsService } from './posts.service';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post()
  async create(
    @CurrentUser() userId: string | null,
    @Body() body: CreatePostDto,
  ) {
    const currentUserId = getUserId(userId);
    const limit = await this.rateLimitService.rateLimit({
      scope: 'post-create',
      identity: currentUserId,
      limit: 20,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      throw new HttpException(
        this.rateLimitService.rateLimitedResponse(limit.resetInSeconds),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = await this.postsService.create({
      authorId: currentUserId,
      type: body.type,
      text: body.text,
      ...(body.media !== undefined ? { media: body.media } : {}),
      ...(body.communityId !== undefined ? { communityId: body.communityId } : {}),
      location: body.location,
    });

    if ('error' in result && result.error === 'community_required') {
      throw new BadRequestException({
        error: 'communityId is required for community posts',
      });
    }

    if ('error' in result) {
      throw new ForbiddenException({
        error: 'Only community members can post here',
      });
    }

    return result;
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @Query() query: PostLocationQueryDto,
    @CurrentUser() userId: string | null,
  ) {
    const result = await this.postsService.findReadableById(
      id,
      getUserId(userId),
      query,
    );

    if ('error' in result) {
      if (result.error === 'not_found') {
        throw new NotFoundException({ error: 'Post not found' });
      }
      if (result.error === 'too_far') {
        throw new ForbiddenException({
          error: 'Post is outside readable radius',
          point: result.point,
        });
      }
      throw new ForbiddenException({ error: 'Forbidden' });
    }

    return result.post;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentUser() userId: string | null) {
    if (!(await this.postsService.delete(id, getUserId(userId)))) {
      throw new NotFoundException({ error: 'Post not found' });
    }
  }
}

@ApiTags('Posts')
@Controller()
export class FeedController {
  constructor(private readonly postsService: PostsService) {}

  @Get('feed')
  feed(@CurrentUser() userId: string | null) {
    return this.postsService.feed(getUserId(userId));
  }
}
