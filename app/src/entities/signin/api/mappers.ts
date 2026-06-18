import { mapUser, type BackendUserDto } from '@/entities/user/api/mappers';

import type { AuthSession } from '../model';
import { SESSION_ACCESS_TTL_MS } from '../model/constants';

export type AuthTokensResponseDto = {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  user?: BackendUserDto;
};

export function mapAuthSession(json: AuthTokensResponseDto): AuthSession {
  return {
    accessToken: json.accessToken,
    refreshToken: json.refreshToken,
    expiresAt: json.expiresAt ?? Date.now() + SESSION_ACCESS_TTL_MS,
    user: json.user ? mapUser(json.user) : undefined,
  };
}
