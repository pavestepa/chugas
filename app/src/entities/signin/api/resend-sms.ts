import { apiRequest } from '@/shared/api';

export async function startEmailSession(identifier: string): Promise<{ sessionId: string }> {
  return apiRequest('/auth/email/start', {
    method: 'POST',
    auth: false,
    body: { identifier },
  });
}

export async function verifyEmailCode(sessionId: string, code: string): Promise<{ sessionId: string }> {
  return apiRequest('/auth/email/verify', {
    method: 'POST',
    auth: false,
    body: { sessionId, code },
  });
}

export async function resendSmsCode(identifier: string): Promise<void> {
  await startEmailSession(identifier);
}
