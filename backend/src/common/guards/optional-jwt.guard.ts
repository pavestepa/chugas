import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

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
export class OptionalJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    return true;
  }
}
