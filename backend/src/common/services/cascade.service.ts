import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CascadeService {
  constructor(private readonly prisma: PrismaService) {}

  async deletePost(postId: string): Promise<boolean> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return false;
    }

    await this.prisma.$transaction([
      this.prisma.comment.deleteMany({ where: { postId } }),
      this.prisma.postLike.deleteMany({ where: { postId } }),
      this.prisma.post.delete({ where: { id: postId } }),
    ]);

    return true;
  }

  async deleteCommunityPosts(communityId: string): Promise<void> {
    const posts = await this.prisma.post.findMany({
      where: { communityId },
      select: { id: true },
    });
    const postIds = posts.map((post) => post.id);

    if (postIds.length === 0) {
      await this.prisma.post.deleteMany({ where: { communityId } });
      return;
    }

    await this.prisma.$transaction([
      this.prisma.comment.deleteMany({ where: { postId: { in: postIds } } }),
      this.prisma.postLike.deleteMany({ where: { postId: { in: postIds } } }),
      this.prisma.post.deleteMany({ where: { communityId } }),
    ]);
  }
}
