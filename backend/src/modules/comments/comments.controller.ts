import {
  Body,
  Controller,
  Delete,
  Get,
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
import { Public } from '../../common/decorators/public.decorator';
import { CreateCommentDto } from './dto/comments.dto';
import { CommentsService } from './comments.service';

@ApiTags('Comments')
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:id/comments')
  create(
    @Param('id') id: string,
    @CurrentUser() userId: string | null,
    @Body() body: CreateCommentDto,
  ) {
    return this.commentsService.create({
      postId: id,
      authorId: getUserId(userId),
      text: body.text,
    });
  }

  @Public()
  @Get('posts/:id/comments')
  listByPost(@Param('id') id: string) {
    return this.commentsService.listByPost(id);
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentUser() userId: string | null) {
    if (!(await this.commentsService.delete(id, getUserId(userId)))) {
      throw new NotFoundException({ error: 'Comment not found' });
    }
  }
}
