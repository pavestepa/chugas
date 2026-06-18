import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { CascadeService } from '../../common/services/cascade.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cascadeService: CascadeService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredPosts() {
    const now = new Date();
    const expiredPosts = await this.prisma.post.findMany({
      where: { expiresAt: { lte: now } },
      select: { id: true },
    });

    if (expiredPosts.length === 0) {
      return;
    }

    await Promise.all(
      expiredPosts.map((post) => this.cascadeService.deletePost(post.id)),
    );
    this.logger.log(`Cleaned up ${String(expiredPosts.length)} expired posts`);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredMessages() {
    const now = new Date();
    const result = await this.prisma.message.deleteMany({
      where: { expiresAt: { lte: now } },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${String(result.count)} expired messages`);
    }
  }
}
