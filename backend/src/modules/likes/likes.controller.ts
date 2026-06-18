import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  getUserId,
} from '../../common/decorators/current-user.decorator';
import { LikesService } from './likes.service';

@ApiTags('Likes')
@Controller()
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post('posts/:id/like')
  like(@Param('id') id: string, @CurrentUser() userId: string | null) {
    return this.likesService.like(id, getUserId(userId));
  }

  @Delete('posts/:id/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlike(@Param('id') id: string, @CurrentUser() userId: string | null) {
    if (!(await this.likesService.unlike(id, getUserId(userId)))) {
      throw new NotFoundException({ error: 'Like not found' });
    }
  }
}
