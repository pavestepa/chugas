import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  getUserId,
} from '../../common/decorators/current-user.decorator';
import {
  MapPostsQueryDto,
  NearbyPostsQueryDto,
} from '../posts/dto/posts.dto';
import { PostsService } from '../posts/posts.service';

function viewportFromQuery(query: MapPostsQueryDto) {
  if (
    query.minLng !== undefined &&
    query.minLat !== undefined &&
    query.maxLng !== undefined &&
    query.maxLat !== undefined
  ) {
    return {
      bbox: {
        minLng: query.minLng,
        minLat: query.minLat,
        maxLng: query.maxLng,
        maxLat: query.maxLat,
      },
    };
  }

  if (query.lng !== undefined && query.lat !== undefined) {
    return {
      center: { lng: query.lng, lat: query.lat },
      ...(query.radiusMeters !== undefined
        ? { radiusMeters: query.radiusMeters }
        : {}),
    };
  }

  return null;
}

@ApiTags('Map')
@Controller('map')
export class MapController {
  constructor(private readonly postsService: PostsService) {}

  @Get('posts')
  async mapPosts(
    @Query() query: MapPostsQueryDto,
    @CurrentUser() userId: string | null,
  ) {
    const viewport = viewportFromQuery(query);
    if (!viewport) {
      throw new BadRequestException({ error: 'bbox or center+radius is required' });
    }

    const result = await this.postsService.mapPoints({
      userId: getUserId(userId),
      ...viewport,
      ...(query.type !== undefined ? { type: query.type } : {}),
      ...(query.communityId !== undefined ? { communityId: query.communityId } : {}),
      ...(query.followingId !== undefined ? { followingId: query.followingId } : {}),
      ...(query.limit !== undefined ? { limit: query.limit } : {}),
    });

    if ('error' in result) {
      throw new BadRequestException({ error: 'bbox or center+radius is required' });
    }

    return result.points;
  }

  @Get('posts/nearby')
  async nearbyPosts(
    @Query() query: NearbyPostsQueryDto,
    @CurrentUser() userId: string | null,
  ) {
    const result = await this.postsService.nearbyReadable({
      userId: getUserId(userId),
      location: { lng: query.lng, lat: query.lat },
      ...(query.type !== undefined ? { type: query.type } : {}),
      ...(query.communityId !== undefined ? { communityId: query.communityId } : {}),
      ...(query.followingId !== undefined ? { followingId: query.followingId } : {}),
      ...(query.limit !== undefined ? { limit: query.limit } : {}),
    });
    return result.posts;
  }
}
