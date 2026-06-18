import {
  BadRequestException,
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
import { BlocksService } from './blocks.service';

@ApiTags('Blocks')
@Controller()
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post('users/:id/block')
  async block(@Param('id') id: string, @CurrentUser() userId: string | null) {
    const result = await this.blocksService.block(getUserId(userId), id);
    if ('error' in result && result.error === 'self_block') {
      throw new BadRequestException({ error: 'Cannot block yourself' });
    }
    return (result as { block: unknown }).block;
  }

  @Delete('users/:id/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblock(@Param('id') id: string, @CurrentUser() userId: string | null) {
    if (!(await this.blocksService.unblock(getUserId(userId), id))) {
      throw new NotFoundException({ error: 'Block not found' });
    }
  }

  @Get('blocks')
  blockedUsers(@CurrentUser() userId: string | null) {
    return this.blocksService.blockedUsers(getUserId(userId));
  }
}
