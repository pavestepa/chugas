import { ConflictException, Injectable } from '@nestjs/common';

import { toPostLikeJson } from '../../common/mappers/api-json.mapper';
import { isPrismaUniqueConstraintError } from '../../common/utils/prisma.util';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService) {}

  async like(postId: string, userId: string) {
    try {
      const like = await this.prisma.postLike.create({
        data: { postId, userId },
      });
      return toPostLikeJson(like);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException({ error: 'Already liked' });
      }
      throw error;
    }
  }

  async unlike(postId: string, userId: string) {
    const like = await this.prisma.postLike.deleteMany({
      where: { postId, userId },
    });
    return like.count > 0;
  }
}
