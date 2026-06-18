import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  getUserId,
} from '../../common/decorators/current-user.decorator';
import { RateLimitService } from '../../common/services/rate-limit.service';
import { UpdateLocationDto } from './dto/location.dto';
import { LocationService } from './location.service';

@ApiTags('Geolocation')
@Controller('location')
export class LocationController {
  constructor(
    private readonly locationService: LocationService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post('update')
  async update(
    @CurrentUser() userId: string | null,
    @Body() body: UpdateLocationDto,
  ) {
    const currentUserId = getUserId(userId);
    const limit = await this.rateLimitService.rateLimit({
      scope: 'location-update',
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

    return this.locationService.update(currentUserId, body.lat, body.lng);
  }

  @Get('following')
  getFollowingLocations(@CurrentUser() userId: string | null) {
    return this.locationService.getFollowingLocations(getUserId(userId));
  }
}
