import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<{ userId?: string | null }>();
    return request.userId ?? null;
  },
);

export function getUserId(userId: string | null | undefined): string {
  if (!userId) {
    throw new UnauthorizedException({ error: 'Unauthorized' });
  }

  return userId;
}
