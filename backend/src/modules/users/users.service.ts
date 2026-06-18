import { Injectable } from '@nestjs/common';

import { toUserJson } from '../../common/mappers/api-json.mapper';
import { WsHubService } from '../../common/services/ws-hub.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wsHub: WsHubService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toUserJson(user) : null;
  }

  async updateMe(
    userId: string,
    input: {
      username?: string;
      avatarUrl?: string;
      bio?: string;
      accountType?: 'open' | 'closed';
    },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: input,
    });
    return toUserJson(user);
  }

  async search(query: string) {
    const users = await this.prisma.user.findMany({
      where: {
        username: { contains: query, mode: 'insensitive' },
      },
      orderBy: { username: 'asc' },
      take: 20,
    });
    return users.map(toUserJson);
  }

  notify(userId: string, payload: unknown) {
    this.wsHub.emitToUser(userId, 'notification:new', payload);
  }
}
