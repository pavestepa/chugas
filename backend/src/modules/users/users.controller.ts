import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  getUserId,
} from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UpdateMeDto, SearchUsersQueryDto } from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get('search')
  search(@Query() query: SearchUsersQueryDto) {
    return this.usersService.search(query.q);
  }

  @Public()
  @Get(':id')
  async findById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException({ error: 'User not found' });
    }
    return user;
  }

  @Patch('me')
  async updateMe(@CurrentUser() userId: string | null, @Body() body: UpdateMeDto) {
    try {
      return await this.usersService.updateMe(getUserId(userId), body);
    } catch {
      throw new NotFoundException({ error: 'User not found' });
    }
  }
}
