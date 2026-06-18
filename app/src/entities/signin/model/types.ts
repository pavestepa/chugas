import type { User } from '@/entities/user';

export type SignInCredentials = {
  identifier: string;
  password: string;
};

export type RegisterCredentials = {
  email: string;
  username: string;
  password: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user?: User;
};

export type EmailAuthSession = {
  sessionId: string;
};

export type AuthSessionStatus = 'pending' | 'email_verified' | 'completed';
export type AuthSessionMode = 'register' | 'password_setup' | 'password_reset';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';
