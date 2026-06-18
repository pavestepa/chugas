import { Injectable } from '@nestjs/common';

import { toCommentJson } from '../../common/mappers/api-json.mapper';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: { postId: string; authorId: string; text: string }) {
    const comment = await this.prisma.comment.create({ data: input });
    return toCommentJson(comment);
  }

  async listByPost(postId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
    });
    return comments.map(toCommentJson);
  }

  async delete(id: string, authorId: string) {
    const comment = await this.prisma.comment.deleteMany({
      where: { id, authorId },
    });
    return comment.count > 0;
  }
}
