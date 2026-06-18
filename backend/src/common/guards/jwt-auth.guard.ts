import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

function extractBearerToken(request: {
  headers?: { authorization?: string };
}): string | null {
  const authorization = request.headers?.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice(7);
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<{
      headers?: { authorization?: string };
      userId?: string | null;
    }>();
    const token = extractBearerToken(request);

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
        request.userId = payload.sub;
      } catch {
        request.userId = null;
      }
    } else {
      request.userId = null;
    }

    if (!isPublic && !request.userId) {
      throw new UnauthorizedException({ error: 'Unauthorized' });
    }

    return true;
  }
}
