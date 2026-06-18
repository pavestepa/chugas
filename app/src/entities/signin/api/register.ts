import { apiRequest } from '@/shared/api';

import type { RegisterCredentials } from '../model';

export async function register(credentials: RegisterCredentials): Promise<void> {
  await apiRequest('/auth/register', {
    method: 'POST',
    auth: false,
    body: credentials,
  });
}
