import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  getUserId,
} from '../../common/decorators/current-user.decorator';
import {
  CreateConversationDto,
  SendMessageDto,
} from './dto/messages.dto';
import { MessagesService } from './messages.service';

@ApiTags('Messages')
@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('conversations')
  async createConversation(
    @CurrentUser() userId: string | null,
    @Body() body: CreateConversationDto,
  ) {
    const currentUserId = getUserId(userId);
    const members = body.members.includes(currentUserId)
      ? body.members
      : [...body.members, currentUserId];

    const result = await this.messagesService.createConversation({
      type: body.type,
      members,
    });
    if ('error' in result) {
      throw new ForbiddenException({ error: 'Conversation contains blocked users' });
    }
    return result;
  }

  @Get('conversations')
  listConversations(@CurrentUser() userId: string | null) {
    return this.messagesService.listConversations(getUserId(userId));
  }

  @Get('conversations/:id/messages')
  async listMessages(
    @Param('id') id: string,
    @CurrentUser() userId: string | null,
  ) {
    const result = await this.messagesService.listMessages(id, getUserId(userId));
    if (result.error === 'not_found') {
      throw new NotFoundException({ error: 'Conversation not found' });
    }
    if (result.error === 'blocked') {
      throw new ForbiddenException({ error: 'Conversation is blocked' });
    }
    return result.messages;
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id') id: string,
    @CurrentUser() userId: string | null,
    @Body() body: SendMessageDto,
  ) {
    if (!(await this.messagesService.isMember(id, getUserId(userId)))) {
      throw new ForbiddenException({ error: 'Forbidden' });
    }

    const message = await this.messagesService.sendMessage({
      conversationId: id,
      senderId: getUserId(userId),
      text: body.text,
      ...(body.attachments !== undefined ? { attachments: body.attachments } : {}),
    });

    if (!message) {
      throw new NotFoundException({ error: 'Conversation not found' });
    }
    if ('error' in message) {
      throw new ForbiddenException({ error: 'Message blocked' });
    }
    return message;
  }
}
