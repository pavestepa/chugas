import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  getUserId,
} from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { isPrismaUniqueConstraintError } from '../../common/utils/prisma.util';
import { RateLimitService } from '../../common/services/rate-limit.service';
import { CommunityPostsQueryDto } from '../posts/dto/posts.dto';
import { PostsService } from '../posts/posts.service';
import {
  BanUserDto,
  CreateCommunityDto,
  UpdateCommunityDto,
} from './dto/communities.dto';
import { CommunitiesService } from './communities.service';

@ApiTags('Communities')
@Controller('communities')
export class CommunitiesController {
  constructor(
    private readonly communitiesService: CommunitiesService,
    private readonly postsService: PostsService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post()
  create(@CurrentUser() userId: string | null, @Body() body: CreateCommunityDto) {
    return this.communitiesService.create({
      nickname: body.nickname,
      title: body.title,
      ownerId: getUserId(userId),
      access: body.access,
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.bio !== undefined ? { bio: body.bio } : {}),
      ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
    });
  }

  @Public()
  @Get(':id')
  async findById(@Param('id') id: string) {
    const community = await this.communitiesService.findById(id);
    if (!community) {
      throw new NotFoundException({ error: 'Community not found' });
    }
    return community;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() userId: string | null,
    @Body() body: UpdateCommunityDto,
  ) {
    const result = await this.communitiesService.update(id, getUserId(userId), {
      ...(body.nickname !== undefined ? { nickname: body.nickname } : {}),
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.bio !== undefined ? { bio: body.bio } : {}),
      ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
      ...(body.access !== undefined ? { access: body.access } : {}),
    });

    if (result.error === 'forbidden') {
      throw new ForbiddenException({ error: 'Forbidden' });
    }
    if (result.error === 'owner_required') {
      throw new ForbiddenException({
        error: 'Only owner can change community nickname or access',
      });
    }
    if (result.error === 'not_found') {
      throw new NotFoundException({ error: 'Community not found' });
    }

    return result.community;
  }

  @Post(':id/join')
  async join(@Param('id') id: string, @CurrentUser() userId: string | null) {
    const currentUserId = getUserId(userId);
    const limit = await this.rateLimitService.rateLimit({
      scope: 'community-request',
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

    try {
      const result = await this.communitiesService.join(id, currentUserId);
      if (result.error === 'not_found') {
        throw new NotFoundException({ error: 'Community not found' });
      }
      if (result.error === 'already_member') {
        throw new ConflictException({ error: 'Already a member' });
      }
      return result;
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException({ error: 'Already a member' });
      }
      throw error;
    }
  }

  @Post(':id/leave')
  async leave(@Param('id') id: string, @CurrentUser() userId: string | null) {
    const result = await this.communitiesService.leave(id, getUserId(userId));
    if (result.error === 'owner_cannot_leave') {
      throw new BadRequestException({ error: 'Owner cannot leave community' });
    }
    if (result.error === 'not_found') {
      throw new NotFoundException({ error: 'Membership not found' });
    }
    return { success: true };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCommunity(
    @Param('id') id: string,
    @CurrentUser() userId: string | null,
  ) {
    const result = await this.communitiesService.deleteCommunity(
      id,
      getUserId(userId),
    );
    if (result.error === 'forbidden') {
      throw new ForbiddenException({ error: 'Only owner can delete community' });
    }
    if (result.error === 'not_found') {
      throw new NotFoundException({ error: 'Community not found' });
    }
  }

  @Get(':id/posts')
  communityPosts(
    @Param('id') id: string,
    @Query() query: CommunityPostsQueryDto,
    @CurrentUser() userId: string | null,
  ) {
    return this.postsService.communityPosts(id, getUserId(userId), query);
  }

  @Delete(':id/posts/:postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePost(
    @Param('id') id: string,
    @Param('postId') postId: string,
    @CurrentUser() userId: string | null,
  ) {
    const result = await this.communitiesService.deletePost(
      id,
      postId,
      getUserId(userId),
    );
    if (result.error === 'forbidden') {
      throw new ForbiddenException({ error: 'Forbidden' });
    }
    if (result.error === 'not_found') {
      throw new NotFoundException({ error: 'Post not found' });
    }
  }

  @Post(':id/bans/:userId')
  async banUser(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() userId: string | null,
    @Body() body: BanUserDto,
  ) {
    const result = await this.communitiesService.banUser(
      id,
      targetUserId,
      getUserId(userId),
      body.reason,
    );
    if (result.error === 'forbidden') {
      throw new ForbiddenException({ error: 'Forbidden' });
    }
    if (result.error === 'cannot_ban_owner') {
      throw new BadRequestException({ error: 'Community owner cannot be banned' });
    }
    if (result.error === 'cannot_ban_moderator') {
      throw new BadRequestException({ error: 'Only owner can ban moderators' });
    }
    return result.ban;
  }

  @Delete(':id/bans/:userId')
  async unbanUser(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() userId: string | null,
  ) {
    const result = await this.communitiesService.unbanUser(
      id,
      targetUserId,
      getUserId(userId),
    );
    if (result.error === 'forbidden') {
      throw new ForbiddenException({ error: 'Forbidden' });
    }
    if (result.error === 'not_found') {
      throw new NotFoundException({ error: 'Ban not found' });
    }
    return { success: true };
  }

  @Get(':id/bans')
  async bans(@Param('id') id: string, @CurrentUser() userId: string | null) {
    const result = await this.communitiesService.bans(id, getUserId(userId));
    if (result.error === 'forbidden') {
      throw new ForbiddenException({ error: 'Forbidden' });
    }
    return result.bans;
  }

  @Get(':id/map-posts')
  communityMapPoints(
    @Param('id') id: string,
    @CurrentUser() userId: string | null,
  ) {
    return this.postsService.communityMapPoints(id, getUserId(userId));
  }

  @Get(':id/requests')
  async requests(@Param('id') id: string, @CurrentUser() userId: string | null) {
    const result = await this.communitiesService.requests(id, getUserId(userId));
    if (result.error === 'forbidden') {
      throw new ForbiddenException({ error: 'Forbidden' });
    }
    return result.requests;
  }

  @Post(':id/requests/:requestId/accept')
  async acceptRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @CurrentUser() userId: string | null,
  ) {
    const result = await this.communitiesService.acceptRequest(
      id,
      requestId,
      getUserId(userId),
    );
    if (result.error === 'forbidden') {
      throw new ForbiddenException({ error: 'Forbidden' });
    }
    if (result.error === 'not_found') {
      throw new NotFoundException({ error: 'Community request not found' });
    }
    return result;
  }

  @Post(':id/requests/:requestId/reject')
  async rejectRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @CurrentUser() userId: string | null,
  ) {
    const result = await this.communitiesService.rejectRequest(
      id,
      requestId,
      getUserId(userId),
    );
    if (result.error === 'forbidden') {
      throw new ForbiddenException({ error: 'Forbidden' });
    }
    if (result.error === 'not_found') {
      throw new NotFoundException({ error: 'Community request not found' });
    }
    return result.request;
  }

  @Post(':id/moderators/:userId')
  async addModerator(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() userId: string | null,
  ) {
    const result = await this.communitiesService.addModerator(
      id,
      targetUserId,
      getUserId(userId),
    );
    if (result.error === 'forbidden') {
      throw new ForbiddenException({ error: 'Forbidden' });
    }
    if (result.error === 'not_found') {
      throw new NotFoundException({ error: 'Community member not found' });
    }
    return result;
  }

  @Delete(':id/moderators/:userId')
  async removeModerator(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() userId: string | null,
  ) {
    const result = await this.communitiesService.removeModerator(
      id,
      targetUserId,
      getUserId(userId),
    );
    if (result.error === 'forbidden') {
      throw new ForbiddenException({ error: 'Forbidden' });
    }
    if (result.error === 'not_found') {
      throw new NotFoundException({ error: 'Community moderator not found' });
    }
    return result;
  }
}
