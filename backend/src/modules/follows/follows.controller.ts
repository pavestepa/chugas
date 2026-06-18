import {
  BadRequestException,
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
  Post,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  getUserId,
} from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimitService } from '../../common/services/rate-limit.service';
import { FollowsService } from './follows.service';

@ApiTags('Follows')
@Controller()
export class FollowsController {
  constructor(
    private readonly followsService: FollowsService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post('users/:id/follow')
  async follow(
    @Param('id') id: string,
    @CurrentUser() userId: string | null,
    @Res({ passthrough: true }) res: { status: (code: number) => void },
  ) {
    const currentUserId = getUserId(userId);
    const limit = await this.rateLimitService.rateLimit({
      scope: 'follow',
      identity: currentUserId,
      limit: 60,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      throw new HttpException(
        this.rateLimitService.rateLimitedResponse(limit.resetInSeconds),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const result = await this.followsService.follow(currentUserId, id);
    if ('error' in result) {
      if (result.error === 'self_follow') {
        throw new BadRequestException({ error: 'Cannot follow yourself' });
      }
      if (result.error === 'not_found') {
        throw new NotFoundException({ error: 'User not found' });
      }
      if (result.error === 'blocked') {
        throw new ForbiddenException({ error: 'Follow is blocked' });
      }
      if (result.error === 'already_following') {
        throw new ConflictException({ error: 'Already following user' });
      }
      throw new ConflictException({
        error: 'Follow request already exists',
        request: result.request,
      });
    }

    if ('request' in result) {
      res.status(HttpStatus.CREATED);
      return result.request;
    }

    return result.follow;
  }

  @Delete('users/:id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(@Param('id') id: string, @CurrentUser() userId: string | null) {
    const currentUserId = getUserId(userId);

    if (await this.followsService.unfollow(currentUserId, id)) {
      return;
    }

    if (await this.followsService.cancelRequest(currentUserId, id)) {
      return;
    }

    throw new NotFoundException({ error: 'Follow or follow request not found' });
  }

  @Get('follow-requests')
  incomingRequests(@CurrentUser() userId: string | null) {
    return this.followsService.incomingRequests(getUserId(userId));
  }

  @Get('follow-requests/sent')
  outgoingRequests(@CurrentUser() userId: string | null) {
    return this.followsService.outgoingRequests(getUserId(userId));
  }

  @Post('follow-requests/:id/accept')
  async acceptRequest(
    @Param('id') id: string,
    @CurrentUser() userId: string | null,
  ) {
    const result = await this.followsService.acceptRequest(id, getUserId(userId));
    if (result && 'error' in result) {
      throw new ForbiddenException({ error: 'Follow request is blocked' });
    }
    if (!result) {
      throw new NotFoundException({ error: 'Follow request not found' });
    }
    return result;
  }

  @Post('follow-requests/:id/reject')
  async rejectRequest(
    @Param('id') id: string,
    @CurrentUser() userId: string | null,
  ) {
    const request = await this.followsService.rejectRequest(id, getUserId(userId));
    if (!request) {
      throw new NotFoundException({ error: 'Follow request not found' });
    }
    return request;
  }

  @Public()
  @Get('users/:id/followers')
  followers(@Param('id') id: string) {
    return this.followsService.followers(id);
  }

  @Public()
  @Get('users/:id/following')
  following(@Param('id') id: string) {
    return this.followsService.following(id);
  }
}
